import { supabase } from "@/lib/supabaseClient";
import { sanitizeRentriMessage } from "@/lib/rentriErrorMessages";

export interface RentriHistoryRow {
  id: string;
  user_id: string | null;
  tenant_id: string | null;
  cliente: string;
  tipo_operazione: string;
  rentri_method: string | null;
  rentri_path: string | null;
  mode: string;
  http_status: number | null;
  success: boolean;
  error_code: string | null;
  error_message: string | null;
  payload_inviato?: unknown;
  risposta?: unknown;
  identificativo_rentri?: string | null;
  transazione_id?: string | null;
  esito_finale?: string | null;
  created_at: string;
}

export interface RentriHistoryInput {
  cliente: string;
  tipo_operazione: string;
  rentri_method?: string | null;
  rentri_path?: string | null;
  mode: "dry_run" | "real";
  http_status?: number | null;
  success: boolean;
  error_code?: string | null;
  error_message?: string | null;
  tenant_id?: string | null;
}

/** Rimuove query string con potenziali dati personali dal path salvato. */
export function normalizeHistoryPath(path?: string | null): string | null {
  if (!path) return null;
  const [base] = String(path).split("?");
  return base.slice(0, 300);
}

/**
 * Registra in cronologia SOLO metadati non sensibili.
 * Silenziosa in caso di errore RLS: non deve mai bloccare il flusso operativo.
 */
export async function logRentriOperation(input: RentriHistoryInput): Promise<void> {
  try {
    const { data: auth } = await supabase.auth.getUser();
    const userId = auth?.user?.id;
    if (!userId) return; // le policy consentono l'inserimento solo a nome proprio

    await supabase.from("rentri_operation_history").insert({
      user_id: userId,
      tenant_id: input.tenant_id ?? null,
      cliente: input.cliente,
      tipo_operazione: input.tipo_operazione,
      rentri_method: input.rentri_method ?? null,
      rentri_path: normalizeHistoryPath(input.rentri_path),
      mode: input.mode,
      http_status: input.http_status ?? null,
      success: input.success,
      error_code: input.error_code ?? null,
      error_message: input.error_message ? sanitizeRentriMessage(input.error_message) : null,
    });
  } catch {
    // cronologia best-effort
  }
}

export interface RentriHistoryFilters {
  cliente?: string;
  esito?: "all" | "success" | "error";
  from?: string;
  to?: string;
  limit?: number;
}

export interface ConfirmedFirEmission {
  id: string;
  identificativo_rentri: string;
  created_at: string;
  esito_finale: string | null;
}

export function isConfirmedFirEvidence(row: {
  success?: boolean | null;
  tipo_operazione?: string | null;
  esito_finale?: string | null;
  identificativo_rentri?: string | null;
}): boolean {
  if (!row.success || !String(row.identificativo_rentri ?? "").trim()) return false;
  const tipo = String(row.tipo_operazione ?? "").toUpperCase();
  const esito = String(row.esito_finale ?? "").toUpperCase();
  return (tipo === "FIR_EMISSIONE" && esito === "CONFERMATO") || tipo === "LOTTO";
}

/**
 * Cerca una conferma ufficiale già registrata dal bridge, senza interrogare o
 * modificare RENTRI. Serve a riallineare la sola visualizzazione quando la
 * risposta asincrona è arrivata dopo che la scheda locale aveva mostrato bozza.
 */
export async function findConfirmedFirEmission(numeroFir: string): Promise<ConfirmedFirEmission | null> {
  const numero = String(numeroFir ?? "").trim().replace(/\s+/g, " ").toUpperCase();
  if (!numero) return null;
  const { data, error } = await supabase
    .from("rentri_operazioni")
    .select("id, tipo_operazione, success, identificativo_rentri, created_at, esito_finale")
    .eq("success", true)
    .eq("identificativo_rentri", numero)
    .in("tipo_operazione", ["FIR_EMISSIONE", "LOTTO"])
    .order("created_at", { ascending: false })
    .limit(10);
  if (error) return null;
  const conferma = (data ?? []).find(isConfirmedFirEvidence);
  if (!conferma?.identificativo_rentri) return null;
  return {
    id: conferma.id,
    identificativo_rentri: conferma.identificativo_rentri,
    created_at: conferma.created_at,
    esito_finale: conferma.esito_finale,
  };
}

export async function fetchRentriHistory(filters: RentriHistoryFilters = {}): Promise<RentriHistoryRow[]> {
  let query = supabase
    .from("rentri_operazioni")
    .select("id, cliente, tipo_operazione, rentri_method, rentri_path, http_status, success, error_code, error_message, payload_inviato, risposta, identificativo_rentri, transazione_id, esito_finale, created_at")
    // Questa vista è il registro degli INVII, non la diagnostica tecnica.
    // Esclude ricerche, polling transazioni e download PDF, che possono essere
    // numerosi ma non rappresentano nuovi tentativi dell'operatore.
    .in("tipo_operazione", ["FIR_EMISSIONE", "FIRMA_RICEZIONE", "REGISTRO"])
    .order("created_at", { ascending: false })
    .limit(filters.limit ?? 1000);

  if (filters.cliente && filters.cliente !== "all") query = query.eq("cliente", filters.cliente);
  if (filters.esito === "success") query = query.eq("success", true);
  if (filters.esito === "error") query = query.eq("success", false);
  if (filters.from) query = query.gte("created_at", filters.from);
  if (filters.to) query = query.lte("created_at", filters.to);

  const { data, error } = await query;
  if (error) throw new Error(sanitizeRentriMessage(error.message));

  // Il log tecnico conserva correttamente l'HTTP 202 originale. Per gli invii
  // di registro, però, l'esito finale viene certificato separatamente dopo la
  // rilettura del registro RENTRI. Uniamo le due prove tramite transazione_id,
  // senza modificare né riscrivere lo storico originale.
  const transactionIds = Array.from(new Set(
    (data ?? [])
      .filter((row) => row.tipo_operazione === "REGISTRO" && row.transazione_id)
      .map((row) => String(row.transazione_id)),
  ));
  const conferme = new Map<string, string>();
  if (transactionIds.length > 0) {
    const { data: invii } = await supabase
      .from("rentri_invii_registri")
      .select("transazione_id, stato")
      .in("transazione_id", transactionIds);
    for (const invio of invii ?? []) {
      if (invio.transazione_id) conferme.set(String(invio.transazione_id), String(invio.stato));
    }
  }

  return (data ?? []).map((row) => ({
    ...row,
    esito_finale:
      row.tipo_operazione === "REGISTRO" && row.transazione_id && conferme.get(String(row.transazione_id)) === "CONFERMATO"
        ? "CONFERMATO"
        : row.esito_finale,
    user_id: null,
    tenant_id: null,
    mode: "real",
  })) as RentriHistoryRow[];
}
