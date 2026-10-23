import { afterEach, describe, expect, it } from "vitest";
import { useMNFIRStore } from "@/stores/mnFirStore";
import { initializeMNFIRCreation } from "./initializeMNFIRCreation";

const original = useMNFIRStore.getState();
afterEach(() => useMNFIRStore.setState(original));

describe("new office paper FIR", () => {
  it("starts as an editable paper draft even after a closed digital FIR", () => {
    useMNFIRStore.setState({ editingFirId: "old-fir", workflowStatus: "chiuso" });
    initializeMNFIRCreation("cartaceo");
    const state = useMNFIRStore.getState();
    expect(state.data.formatoFir).toBe("cartaceo");
    expect(state.workflowStatus).toBe("bozza");
    expect(state.editingFirId).toBeNull();
    expect(state.data.selectedFirNumber).toBe("");
  });

  it("does not inherit pending AI edits or the previous number", () => {
    useMNFIRStore.setState({ pendingFromAgent: true, data: { ...original.data, selectedFirNumber: "OLD NUMBER" } });
    initializeMNFIRCreation("cartaceo");
    expect(useMNFIRStore.getState().data.selectedFirNumber).toBe("");
    expect(useMNFIRStore.getState().pendingFromAgent).toBe(false);
    expect(useMNFIRStore.getState().lastUpdatedAt).toBeNull();
  });

  it("keeps driver-only forms digital", () => {
    initializeMNFIRCreation("cartaceo", true);
    expect(useMNFIRStore.getState().data.formatoFir).toBe("digitale");
  });
});