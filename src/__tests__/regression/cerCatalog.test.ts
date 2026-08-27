import { describe, expect, it } from "vitest";
import { CER_CATALOG } from "@/data/cerCatalog";
import { getCerDescrizionePerStampa } from "@/data/cerDescrizioni";

const normalize = (code: string) => code.replace(/\D/g, "");

/**
 * Regressioni storiche coperte:
 * - descrizioni CER sparite / sostituite da placeholder "CER 080112"
 * - codici duplicati che rompono le tendine (cernite, conferimenti, giacenze)
 * - flag pericoloso non allineato all'asterisco
 */
describe("catalogo CER", () => {
  it("non contiene codici duplicati (normalizzati)", () => {
    const seen = new Map<string, string>();
    const duplicates: string[] = [];
    for (const entry of CER_CATALOG) {
      const key = normalize(entry.codice);
      if (seen.has(key)) duplicates.push(entry.codice);
      seen.set(key, entry.codice);
    }
    expect(duplicates).toEqual([]);
  });

  it("ha sempre una descrizione reale (mai placeholder tecnici)", () => {
    const bad = CER_CATALOG.filter(
      (entry) =>
        !entry.descrizione ||
        entry.descrizione.trim().length < 4 ||
        /^cer\s*[\d\s*.]+$/i.test(entry.descrizione.trim()) ||
        /rettifica di allineamento|allineamento ufficiale|import registro/i.test(entry.descrizione),
    );
    expect(bad.map((entry) => entry.codice)).toEqual([]);
  });

  it("marca pericoloso ogni codice con asterisco", () => {
    const wrong = CER_CATALOG.filter((entry) => entry.codice.includes("*") && !entry.pericoloso);
    expect(wrong.map((entry) => entry.codice)).toEqual([]);
  });

  it("ha i codici usati quotidianamente dal cliente", () => {
    const required = ["150101", "160214", "200140", "170405", "080112"];
    const present = new Set(CER_CATALOG.map((entry) => normalize(entry.codice)));
    for (const code of required) expect(present.has(code), `manca CER ${code}`).toBe(true);
  });

  it("il codice normalizzato è sempre di 6 cifre", () => {
    const wrong = CER_CATALOG.filter((entry) => normalize(entry.codice).length !== 6);
    expect(wrong.map((entry) => entry.codice)).toEqual([]);
  });

  it("la stampa giacenze usa sempre la descrizione CER estesa ufficiale", () => {
    const descrizione = getCerDescrizionePerStampa("20 01 40", "Rettifica di allineamento ufficiale");
    expect(descrizione).toContain("Metallo");
    expect(descrizione).toContain("Frazioni oggetto di raccolta differenziata");
    expect(descrizione).toContain("Rifiuti urbani");
    expect(descrizione).not.toMatch(/rettifica/i);
  });
});
