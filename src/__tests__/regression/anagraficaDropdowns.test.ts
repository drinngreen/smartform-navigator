import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Regressione: le tendine dei formulari devono SEMPRE leggere l'anagrafica
 * completa importata da Prometeo e tutti i dati collegati.
 * Se qualcuno rimuove una di queste query, le tendine tornano vuote/incomplete.
 */
const src = readFileSync(
  resolve(__dirname, "../../components/fir/PresetAziendaSelector.tsx"),
  "utf8",
);

const TABELLE_OBBLIGATORIE = [
  "anagrafica_aziende_mp",
  "cliente_autorizzazioni",
  "cliente_cantieri",
  "cliente_targhe",
  "cliente_conducenti",
  "cliente_partner_default",
];

describe("tendine formulari - fonti dati anagrafica", () => {
  it("legge tutte le tabelle collegate", () => {
    for (const t of TABELLE_OBBLIGATORIE) {
      expect(src, `manca la lettura di ${t}`).toContain(`.from("${t}")`);
    }
  });

  it("carica l'anagrafica completa con paginazione (non solo i primi 1000)", () => {
    expect(src).toMatch(/\.range\(page \* 1000, page \* 1000 \+ 999\)/);
  });

  it("non limita i dati collegati a poche righe", () => {
    const limits = [...src.matchAll(/\.limit\((\d+)\)/g)].map((m) => Number(m[1]));
    expect(limits.length).toBeGreaterThan(0);
    expect(Math.max(...limits)).toBeGreaterThanOrEqual(1000);
  });

  it("risolve i duplicati di anagrafica per CF/P.IVA", () => {
    expect(src).toContain("resolveClienteIds");
  });

  it("risolve i duplicati anche per ragione sociale (cantieri divisi su più righe)", () => {
    expect(src).toContain("ragione_sociale.eq.");
  });

  it("permette di cambiare azienda e reagisce alla gomma della sezione", () => {
    expect(src).toContain("clearSelection");
    expect(src).toMatch(/prevCfRef/);
    expect(src).toContain("Cambia");
  });
});

