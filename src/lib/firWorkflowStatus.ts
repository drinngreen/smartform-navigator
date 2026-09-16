/**
 * Stato reale del formulario nell'interfaccia.
 *
 * Regola non negoziabile: un formulario può risultare "inviato" SOLO se il
 * RENTRI ha davvero restituito l'identificativo ufficiale. Senza quello non
 * esiste nessun formulario ufficiale: resta una bozza, modificabile e
 * reinviabile. Prima di questa regola alcuni formulari mostravano "inviato"
 * pur non essendo mai partiti, bloccando le correzioni (es. indirizzo).
 */
export type FirWorkflowStatus = "bozza" | "inviato" | "chiuso";

export function hasRentriEmission(formData: unknown): boolean {
  const fd = (formData ?? {}) as Record<string, any>;
  const id = fd.rentri_fir_id;
  return typeof id === "string" ? id.trim().length > 0 : Boolean(id);
}

export function resolveWorkflowStatus(
  status: string | null | undefined,
  formData: unknown,
): FirWorkflowStatus {
  const s = String(status ?? "").toLowerCase();
  if (s === "completato" || s === "completed" || s === "chiuso") return "chiuso";
  if (s === "inviato" || s === "submitted") {
    return hasRentriEmission(formData) ? "inviato" : "bozza";
  }
  return "bozza";
}

/** true quando il DB dice "inviato" ma il RENTRI non ha mai confermato nulla. */
export function isFalseSubmitted(
  status: string | null | undefined,
  formData: unknown,
): boolean {
  const s = String(status ?? "").toLowerCase();
  return (s === "inviato" || s === "submitted") && !hasRentriEmission(formData);
}
