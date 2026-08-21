import { describe, expect, it } from "vitest";
import { COMPANY_PRESETS, MULTY_TENANT_ID_CONST, NIYOL_TENANT_ID_CONST } from "@/lib/firFinalSync";

const MULTY = "77ec9a3d-602e-438f-97bf-1c69abd8f691";
const NIYOL = "819c783e-78dd-4080-8265-802e75b0d813";

/**
 * Regola non negoziabile: i due tenant operativi non devono mai essere
 * scambiati o sostituiti dall'id consolidato "Multy Niyol".
 */
describe("isolamento multi-tenant", () => {
  it("mantiene gli UUID dei tenant operativi", () => {
    expect(MULTY_TENANT_ID_CONST).toBe(MULTY);
    expect(NIYOL_TENANT_ID_CONST).toBe(NIYOL);
    expect(MULTY_TENANT_ID_CONST).not.toBe(NIYOL_TENANT_ID_CONST);
  });

  it("i preset aziendali sono coerenti e non vuoti", () => {
    const presets = Object.values(COMPANY_PRESETS as Record<string, Record<string, unknown>>);
    expect(presets.length).toBeGreaterThan(0);
    for (const preset of presets) {
      expect(Object.keys(preset).length).toBeGreaterThan(0);
    }
  });
});
