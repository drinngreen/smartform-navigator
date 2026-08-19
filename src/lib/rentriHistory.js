import { supabase } from "@/lib/supabaseClient";
import { sanitizeRentriMessage } from "@/lib/rentriErrorMessages";
/** Rimuove query string con potenziali dati personali dal path salvato. */
export function normalizeHistoryPath(path) {
    if (!path)
        return null;
    const [base] = String(path).split("?");
    return base.slice(0, 300);
}
/**
 * Registra in cronologia SOLO metadati non sensibili.
 * Silenziosa in caso di errore RLS: non deve mai bloccare il flusso operativo.
 */
export async function logRentriOperation(input) {
    try {
        const { data: auth } = await supabase.auth.getUser();
        const userId = auth?.user?.id;
        if (!userId)
            return; // le policy consentono l'inserimento solo a nome proprio
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
    }
    catch {
        // cronologia best-effort
    }
}
export async function fetchRentriHistory(filters = {}) {
    let query = supabase
        .from("rentri_operation_history")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(filters.limit ?? 50);
    if (filters.cliente && filters.cliente !== "all")
        query = query.eq("cliente", filters.cliente);
    if (filters.esito === "success")
        query = query.eq("success", true);
    if (filters.esito === "error")
        query = query.eq("success", false);
    if (filters.from)
        query = query.gte("created_at", filters.from);
    if (filters.to)
        query = query.lte("created_at", filters.to);
    const { data, error } = await query;
    if (error)
        throw new Error(sanitizeRentriMessage(error.message));
    return (data ?? []);
}
