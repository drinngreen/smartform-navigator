import { mnInitialFIRData, useMNFIRStore } from "@/stores/mnFirStore";
import { dataOggiLocale } from "@/lib/firFieldValues";

/** Start an independent office draft without inheriting another FIR's state. */
export function initializeMNFIRCreation(initialFormato?: "cartaceo", forceRentriDigital = false) {
  useMNFIRStore.setState({
    data: {
      ...mnInitialFIRData,
      dataEmissione: dataOggiLocale(),
      formatoFir: forceRentriDigital ? "digitale" : initialFormato ?? "digitale",
    },
    editingFirId: null,
    workflowStatus: "bozza",
    lastUpdatedBy: null,
    lastUpdatedAt: null,
    pendingFromAgent: false,
  });
}