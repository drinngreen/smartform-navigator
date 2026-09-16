import { describe, it, expect } from "vitest";
import { costruisciRacconto, type OperazioneGrezza } from "./firStatoRacconto";

const FIR = "ZRZXR 000772 TM";

const ops: OperazioneGrezza[] = [
  { tipo_operazione: "FIR_EMISSIONE", http_status: 400, success: false, created_at: "2026-09-16T13:30:36Z", payload_inviato: { numero_fir: FIR } },
  { tipo_operazione: "FIR_EMISSIONE", http_status: 400, success: false, created_at: "2026-09-16T13:37:30Z", payload_inviato: { numero_fir: FIR } },
  { tipo_operazione: "FIR_EMISSIONE", http_status: 202, success: true, created_at: "2026-09-16T13:44:33Z", payload_inviato: { numero_fir: FIR } },
  { tipo_operazione: "LOTTO", http_status: 200, success: true, created_at: "2026-09-16T13:44:35Z", identificativo_rentri: FIR },
];

describe("costruisciRacconto", () => {
  it("dichiara il FIR vidimato e in viaggio, non chiuso", () => {
    const r = costruisciRacconto(FIR, ops);
    expect(r.rifiuti).toBe(2);
    expect(r.titolo).toContain("in viaggio");
    expect(r.cosaFareOra).toContain("impianto di destinazione");
    expect(r.passi.find((p) => p.titolo.startsWith("4."))?.stato).toBe("da_fare");
    expect(r.passi.find((p) => p.titolo.startsWith("5."))?.stato).toBe("da_fare");
  });

  it("segnala la bozza quando ci sono solo rifiuti", () => {
    const r = costruisciRacconto(FIR, ops.slice(0, 2));
    expect(r.titolo).toContain("bozza");
    expect(r.passi[1].stato).toBe("errore");
  });

  it("chiude il racconto dopo la firma del destinatario", () => {
    const r = costruisciRacconto(FIR, [
      ...ops,
      { tipo_operazione: "FIRMA_RICEZIONE", http_status: 200, success: true, created_at: "2026-09-16T16:00:00Z", identificativo_rentri: FIR },
    ]);
    expect(r.titolo).toBe("Formulario chiuso");
    expect(r.passi.find((p) => p.titolo.startsWith("5."))?.stato).toBe("fatto");
  });
});
