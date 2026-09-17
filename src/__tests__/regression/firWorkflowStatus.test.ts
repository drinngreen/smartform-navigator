import { describe, it, expect } from "vitest";
import { resolveWorkflowStatus, isFalseSubmitted, hasRentriEmission } from "@/lib/firWorkflowStatus";
import { isConfirmedFirEvidence } from "@/lib/rentriHistory";
import { classifyRentriDeparture, isRentriDepartureConfirmed } from "@/lib/rentriFirStatus";

describe("Stato formulario: 'inviato' solo con emissione RENTRI reale", () => {
  it("resta bozza se il RENTRI non ha mai restituito l'identificativo", () => {
    expect(resolveWorkflowStatus("inviato", { rentri_fir_id: null })).toBe("bozza");
    expect(resolveWorkflowStatus("inviato", {})).toBe("bozza");
    expect(resolveWorkflowStatus("inviato", { rentri_fir_id: "  " })).toBe("bozza");
    expect(isFalseSubmitted("inviato", {})).toBe(true);
  });

  it("è inviato quando esiste l'identificativo RENTRI", () => {
    expect(resolveWorkflowStatus("inviato", { rentri_fir_id: "ABC123" })).toBe("inviato");
    expect(isFalseSubmitted("inviato", { rentri_fir_id: "ABC123" })).toBe(false);
    expect(hasRentriEmission({ rentri_fir_id: "ABC123" })).toBe(true);
  });

  it("chiuso e bozza restano invariati", () => {
    expect(resolveWorkflowStatus("completato", {})).toBe("chiuso");
    expect(resolveWorkflowStatus("bozza", {})).toBe("bozza");
  });
});

describe("Verità ufficiale della partenza RENTRI", () => {
  it("non confonde un FIR presente ma ancora in inserimento con un FIR partito", () => {
    const response = [{ numero_fir: "ZRZXR 000773 YL", stato: "InserimentoTrasportoIniziale", versione: 7 }];
    expect(classifyRentriDeparture(response, "ZRZXR000773YL")).toBe("draft");
    expect(isRentriDepartureConfirmed(response, "ZRZXR 000773 YL")).toBe(false);
  });

  it("riconosce la partenza solo con stato non provvisorio e data emissione", () => {
    const response = [{ numero_fir: "ZRZXR 000773 YL", stato: "Emesso", data_emissione: "2026-09-17T08:49:17Z" }];
    expect(classifyRentriDeparture(response, "ZRZXR000773YL")).toBe("departed");
  });

  it("riconosce come chiuso un FIR accettato dal destinatario", () => {
    const response = [{ numero_fir: "ZRZXR 000773 YL", stato: "Accettato", data_emissione: "2026-09-17T08:49:17Z", accettazione: {} }];
    expect(classifyRentriDeparture(response, "ZRZXR000773YL")).toBe("closed");
  });
});

describe("Conferma asincrona emissione FIR", () => {
  it("riconosce il LOTTO confermato restituito dopo una risposta 202", () => {
    expect(isConfirmedFirEvidence({
      success: true,
      tipo_operazione: "LOTTO",
      esito_finale: "CONFERMATO",
      identificativo_rentri: "ZRZXR 000772 TM",
    })).toBe(true);
  });

  it("non considera confermata una richiesta FIR ancora in verifica", () => {
    expect(isConfirmedFirEvidence({
      success: true,
      tipo_operazione: "FIR_EMISSIONE",
      esito_finale: "IN_VERIFICA",
      identificativo_rentri: null,
    })).toBe(false);
  });
});
