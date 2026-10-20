import { describe, it, expect } from "vitest";
import { valutaFirPerGiacenze, registraFirInGiacenze } from "@/lib/rentriFirGiacenze";
const base = { numero_fir: "ZRZXR 000853 XF", codice_eer: "160216", unita_misura: "kg", num_iscr_sito: "OP2501XMQ021914-TO0001",
  produttore: { codice_fiscale: "12347770013", denominazione: "MULTY" }, destinatari: [{ codice_fiscale: "X", denominazione: "D" }] };
describe("FIR RENTRI → giacenze: mai entro il 21/09", () => {
  it("idoneo dopo il 21/09 se accettato, con kg accettati", () => {
    const r = valutaFirPerGiacenze({ ...base, data_emissione: "2026-09-23T10:00:00Z", accettazione: { quantita_accettata: 10140, data_ora_arrivo: "2026-09-23T17:50:00Z" } })!;
    expect(r.idoneo).toBe(true); expect(r.segno).toBe("SCARICO"); expect(r.kg_accettati).toBe(10140);
  });
  it("rifiuta emesso il 21/09 anche se arrivato dopo", () => {
    expect(valutaFirPerGiacenze({ ...base, data_emissione: "2026-09-21T10:00:00Z", accettazione: { quantita_accettata: 1, data_ora_arrivo: "2026-09-22T10:00:00Z" } })!.idoneo).toBe(false);
  });
  it("rifiuta non accettato", () => {
    expect(valutaFirPerGiacenze({ ...base, data_emissione: "2026-10-01T10:00:00Z", accettazione: null })!.idoneo).toBe(false);
  });
  it("ignora FIR dove Multy non è né produttore né destinatario", () => {
    expect(valutaFirPerGiacenze({ ...base, produttore: { codice_fiscale: "Y" }, data_emissione: "2026-10-01" })).toBeNull();
  });
});

describe("Cantiere diverso dall'impianto: le giacenze NON si cambiano", () => {
  const det = (luogo: unknown) => ({
    numero_fir: "ZRZXR 000974 BL", num_iscr_sito: "OP2501XMQ021914-TO0001",
    dati_partenza: {
      data_emissione: "2026-10-15T08:00:00Z", rifiuto: { codice_eer: "170407" },
      produttore: { codice_fiscale: "12347770013", denominazione: "MULTY", luogo_produzione: luogo,
        indirizzo: { indirizzo: "VIA RIVAROSSA", civico: "18/20", citta: { comune_id: "001195", nome_comune: "PISCINA" } } },
      destinatario: { codice_fiscale: "00470790015", denominazione: "METALFER SRL" },
    },
    dati_accettazione: { data_ora_arrivo: "2026-10-15T12:05:00Z", quantita_accettata: { valore: 1000, unita_misura: "kg" } },
  });
  it("Rondissone (ZRZXR 000974 BL) = cantiere diverso: solo registro, niente giacenze", () => {
    const r = valutaFirPerGiacenze(det({ indirizzo: "via capri", citta: { comune_id: "001221", nome_comune: "RONDISSONE" } }))!;
    expect(r.cantiere_diverso).toBe(true);
    expect(r.cantiere_verificato).toBe(true);
    expect(r.kg_accettati).toBe(1000);
  });
  it("senza luogo di produzione nel dettaglio = impianto: incide sulle giacenze", () => {
    const r = valutaFirPerGiacenze(det(undefined))!;
    expect(r.cantiere_diverso).toBe(false);
    expect(r.cantiere_verificato).toBe(true);
  });
  it("scarico letto solo dall'elenco (senza dettaglio) = cantiere non verificato", () => {
    const r = valutaFirPerGiacenze({ ...base, data_emissione: "2026-10-01T10:00:00Z", accettazione: { quantita_accettata: 5, data_ora_arrivo: "2026-10-01T12:00:00Z" } })!;
    expect(r.cantiere_verificato).toBe(false);
  });
  it("registraFirInGiacenze rifiuta uno scarico con cantiere non verificato", async () => {
    const r = valutaFirPerGiacenze({ ...base, data_emissione: "2026-10-01T10:00:00Z", accettazione: { quantita_accettata: 5, data_ora_arrivo: "2026-10-01T12:00:00Z" } })!;
    await expect(registraFirInGiacenze(r)).rejects.toThrow(/Cantiere non verificato/);
  });
});
