import { describe, it, expect, vi, beforeEach } from "vitest";

const listaMock = vi.fn();

vi.mock("@/lib/rentriVpsApi", () => ({
  listaFirInArrivoDestinatario: (...args: unknown[]) => listaMock(...args),
  accettaFirInArrivoDestinatario: vi.fn(),
  ricercaFir: vi.fn(),
  firmaRicezione: vi.fn(),
  isRentriOfflineResponse: () => false,
}));

vi.mock("@/lib/supabaseClient", () => ({ supabase: { from: vi.fn() } }));

import { listIncomingXFir } from "@/services/impiantoFirService";

const CF_IMPIANTO = "12347770013";

const rispostaRentri = {
  success: true,
  status: 200,
  data: [
    {
      numero_fir: "BPJMG 000465 BP",
      data_emissione: "2026-07-30T08:04:09Z",
      codice_eer: "170904",
      quantita: 1000,
      unita_misura: "kg",
      stato: "FirmaTrasportatoreIniziale",
      produttore: { denominazione: "VARACALLI IMPIANTI SRL", codice_fiscale: "12596410014" },
      destinatari: [{ denominazione: "MULTY PROGET SRL", codice_fiscale: CF_IMPIANTO }],
      trasportatori: [{ denominazione: "NIYOL ETICONS LOGISTICA SRL SB", codice_fiscale: "09879800010" }],
    },
    {
      numero_fir: "ZRZXR 000766 HH",
      codice_eer: "170904",
      quantita: 10000,
      unita_misura: "kg",
      stato: "Accettato",
      accettazione: { tipo_accettazione: "A", quantita_accettata: 9000, data_ora_arrivo: "2026-08-04T14:00:00Z" },
      produttore: { denominazione: "MULTY PROGET S.R.L.", codice_fiscale: CF_IMPIANTO },
      destinatari: [{ denominazione: "MULTY PROGET SRL", codice_fiscale: CF_IMPIANTO }],
      trasportatori: [{ denominazione: "NIYOL ETICONS LOGISTICA SRL SB", codice_fiscale: "09879800010" }],
    },
    {
      numero_fir: "MCNRX 000542 WD",
      codice_eer: "150101",
      quantita: 1000,
      stato: "Accettato",
      produttore: { denominazione: "SATA S.P.A.", codice_fiscale: "03773170018" },
      destinatari: [{ denominazione: "Gaziano Salvatore", codice_fiscale: "GZNSVT76H16L219T" }],
      trasportatori: [{ denominazione: "NIYOL ETICONS LOGISTICA SRL SB", codice_fiscale: "09879800010" }],
    },
  ],
};

describe("FIR in arrivo all'impianto", () => {
  beforeEach(() => {
    listaMock.mockReset();
    listaMock.mockResolvedValue(rispostaRentri);
  });

  it("mostra solo i formulari in cui l'impianto è destinatario", async () => {
    const items = await listIncomingXFir("multy", CF_IMPIANTO, "OP2501XMQ021914-TO0001");
    expect(items.map((i) => i.numero_fir)).toEqual(["BPJMG 000465 BP", "ZRZXR 000766 HH"]);
  });

  it("riconosce i formulari firmati alla partenza come da accettare", async () => {
    const items = await listIncomingXFir("multy", CF_IMPIANTO);
    const daAccettare = items.find((i) => i.numero_fir === "BPJMG 000465 BP");
    expect(daAccettare?.stato_interno).toBe("attesa_firma_ricezione");
    expect(daAccettare?.firma_destinatario_at).toBeNull();
  });

  it("riconosce come chiusi i formulari già accettati sul RENTRI", async () => {
    const items = await listIncomingXFir("multy", CF_IMPIANTO);
    const chiuso = items.find((i) => i.numero_fir === "ZRZXR 000766 HH");
    expect(chiuso?.stato_interno).toBe("firmato_destinatario");
    expect(chiuso?.firma_destinatario_at).toBe("2026-08-04T14:00:00Z");
  });

  it("legge produttore, trasportatore e destinatario dagli elenchi ufficiali RENTRI", async () => {
    const items = await listIncomingXFir("multy", CF_IMPIANTO);
    expect(items[0].produttore).toBe("VARACALLI IMPIANTI SRL");
    expect(items[0].trasportatore).toBe("NIYOL ETICONS LOGISTICA SRL SB");
    expect(items[0].destinatario).toBe("MULTY PROGET SRL");
  });
});
