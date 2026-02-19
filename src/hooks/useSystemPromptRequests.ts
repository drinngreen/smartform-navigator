import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/hooks/useAuth";

export interface SystemPromptRequest {
  id: string;
  tenant_id: string | null;
  tenant_label: string;
  user_id: string;
  category: string;
  title: string;
  content: string;
  status: string;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
}

export const PROMPT_CATEGORIES = [
  { value: "search", label: "🔍 Capacità di Ricerca", desc: "Migliorare come l'agente cerca e trova dati" },
  { value: "new_module", label: "📦 Nuovo Modulo", desc: "Integrare un modulo completamente nuovo" },
  { value: "field_addition", label: "➕ Campi Aggiuntivi", desc: "Aggiungere campi a moduli esistenti" },
  { value: "new_feature", label: "⚡ Nuova Funzionalità", desc: "Funzionalità nuove da implementare" },
  { value: "knowledge", label: "🧠 Nuove Conoscenze", desc: "Informazioni che l'agente deve sapere" },
  { value: "action", label: "🎯 Azioni e Procedure", desc: "Come l'agente deve svolgere azioni" },
  { value: "integration", label: "🔗 Integrazioni Esterne", desc: "Servizi esterni, API, documentazione" },
];

export function useSystemPromptRequests(tenantLabel?: string) {
  const { user } = useAuth();
  const [requests, setRequests] = useState<SystemPromptRequest[]>([]);
  const [loading, setLoading] = useState(false);

  const loadRequests = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    let query = supabase
      .from("system_prompt_requests")
      .select("*")
      .order("created_at", { ascending: false });

    if (tenantLabel) {
      query = query.eq("tenant_label", tenantLabel);
    }

    const { data } = await query;
    if (data) setRequests(data as unknown as SystemPromptRequest[]);
    setLoading(false);
  }, [user, tenantLabel]);

  const createRequest = useCallback(async (req: {
    tenant_id: string | null;
    tenant_label: string;
    category: string;
    title: string;
    content: string;
  }) => {
    if (!user) return;
    const { error } = await supabase
      .from("system_prompt_requests")
      .insert({ ...req, user_id: user.id } as any);
    if (error) { console.error(error); return false; }
    await loadRequests();
    return true;
  }, [user, loadRequests]);

  const deleteRequest = useCallback(async (id: string) => {
    await supabase.from("system_prompt_requests").delete().eq("id", id);
    await loadRequests();
  }, [loadRequests]);

  const updateStatus = useCallback(async (id: string, status: string, admin_notes?: string) => {
    const update: any = { status };
    if (admin_notes !== undefined) update.admin_notes = admin_notes;
    await supabase.from("system_prompt_requests").update(update).eq("id", id);
    await loadRequests();
  }, [loadRequests]);

  useEffect(() => { loadRequests(); }, [loadRequests]);

  return { requests, loading, createRequest, deleteRequest, updateStatus, reload: loadRequests };
}
