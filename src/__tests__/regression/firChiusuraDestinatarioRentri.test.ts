import { describe, it, expect } from "vitest";
import { interpretaChiusura } from "@/lib/firChiusuraDestinatarioRentri";

describe("lettura della chiusura del destinatario dal RENTRI", () => {
  it("riconosce che il destinatario non ha ancora firmato", () => {
    const esito = interpretaChiusura({ numero_fir: "ZRZXR000772TM", stato: "IN_VIAGGIO" });
    expect(esito.chiusa).toBe(false);
    expect(esito.esito).toBeNull();
  });

  it("legge peso, esito e data dell'accettazione totale", () => {
    const esito = interpretaChiusura({
      dati_arrivo: {
        data_ora_arrivo: "2026-09-17T09:30:00Z",
        accettazione: {
          esito_conferimento: "ACCETTATO_TOTALMENTE",
          quantita_ricevuta: { valore: 1240, unita_misura: "kg" },
        },
      },
    });
    expect(esito).toMatchObject({ chiusa: true, esito: "accettato", pesoKg: 1240, dataOraArrivo: "2026-09-17T09:30:00Z" });
  });

  it("legge il respingimento con la motivazione", () => {
    const esito = interpretaChiusura([
      {
        accettazione: {
          esito_conferimento: "RESPINTO",
          motivazione: "Carico non conforme",
          quantita_ricevuta: { valore: 0 },
          data_ora_arrivo: "2026-09-17T10:00:00Z",
        },
      },
    ]);
    expect(esito.esito).toBe("respinto");
    expect(esito.motivazione).toBe("Carico non conforme");
  });
});
