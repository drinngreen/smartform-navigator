import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/hooks/useAuth";

export function useRubricaContatti(overrideTenantId?: string) {
  const { profile } = useAuth();
  const tenantId = overrideTenantId || profile?.tenant_id;
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["rubrica_contatti", tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      // La rubrica contiene l'intera anagrafica: serve la paginazione
      // altrimenti si fermerebbe ai primi 1000 contatti.
      const all: any[] = [];
      for (let page = 0; page < 50; page++) {
        const { data, error } = await supabase
          .from("rubrica_contatti")
          .select("*")
          .eq("tenant_id", tenantId!)
          .order("categoria")
          .order("ragione_sociale", { nullsFirst: false })
          .order("nome")
          .range(page * 1000, page * 1000 + 999);
        if (error) throw error;
        all.push(...(data || []));
        if (!data || data.length < 1000) break;
      }
      return all;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("rubrica_contatti").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["rubrica_contatti"] }),
  });

  return { ...query, tenantId, deleteContatto: deleteMutation.mutateAsync };
}

export function useComunicazioniLog(canale?: string) {
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;

  return useQuery({
    queryKey: ["comunicazioni_log", tenantId, canale],
    enabled: !!tenantId,
    queryFn: async () => {
      let q = supabase
        .from("comunicazioni_log")
        .select("*")
        .eq("tenant_id", tenantId!)
        .order("created_at", { ascending: false })
        .limit(200);
      if (canale) q = q.eq("canale", canale);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });
}
