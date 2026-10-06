import { describe, it, expect } from "vitest";
import { valutaFirPerGiacenze } from "@/lib/rentriFirGiacenze";
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
