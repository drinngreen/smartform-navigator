import { describe, it, expect } from "vitest";
import { MN_CONTEXTS, useMNContextStore } from "@/stores/mnContextStore";

describe("Niyol riattivato e separato", () => {
  it("mantiene il proprio tenant selezionando Niyol", () => {
    const niyol = MN_CONTEXTS.find(c => c.id === "niyol");
    expect(niyol?.tenantId).toBe("819c783e-78dd-4080-8265-802e75b0d813");
    if (!niyol) throw new Error("Contesto Niyol assente");
    useMNContextStore.getState().setActiveContext(niyol);
    expect(useMNContextStore.getState().activeContext.tenantId).toBe("819c783e-78dd-4080-8265-802e75b0d813");
    expect(niyol.tenantId).not.toBe(MN_CONTEXTS.find(c => c.id === "dev-multyproget")?.tenantId);
  });
});