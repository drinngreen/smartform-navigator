import { mnInitialFIRData, useMNFIRStore } from "@/stores/mnFirStore";

/** Start an independent office draft without inheriting another FIR's state. */
export function initializeMNFIRCreation(initialFormato?: "cartaceo", forceRentriDigital = false) {
  useMNFIRStore.setState({
    data: {
      ...mnInitialFIRData,
      dataEmissione: new Date().toISOString().split("T")[0],
      formatoFir: forceRentriDigital ? "digitale" : initialFormato ?? "digitale",
    },
    editingFirId: null,
    workflowStatus: "bozza",
    lastUpdatedBy: null,
    lastUpdatedAt: null,
    pendingFromAgent: false,
  });
}