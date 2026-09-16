import { describe, it, expect } from "vitest";
import { resolveWorkflowStatus, isFalseSubmitted, hasRentriEmission } from "@/lib/firWorkflowStatus";

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
