import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { revertFirFromRegistryAndInventory } from "@/lib/firFinalSync";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { FIRDataStore } from "@/stores/firStore";
import { FIRFormData, mapStoreToDatabaseFields } from "@/hooks/useFIRForms";
import { useFIRNumberPool } from "@/hooks/useFIRNumberPool";

/**
 * FIR forms hook scoped to the current user — identical to useFIRForms
 * but uses the MN store. The data isolation comes from fir_forms.tenant_id
 * being set on insert (via the user's profile tenant_id).
 */
export function useMNFIRForms(overrideTenantId?: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { releaseNumber, consumeNumber } = useFIRNumberPool();

  const { data: myForms, isLoading: isLoadingMyForms } = useQuery({
    queryKey: ["mn-fir-forms", "my", user?.id, overrideTenantId],
    queryFn: async () => {
      let query = supabase
        .from("fir_forms")
        .select("*")
        .eq("user_id", user!.id)
        .eq("deleted_by_user", false)
      if (overrideTenantId) query = query.eq("tenant_id", overrideTenantId);
      const { data, error } = await query.order("created_at", { ascending: false });
      if (error) throw error;
      return data as FIRFormData[];
    },
    enabled: !!user,
  });

  const createFIR = useMutation({
    mutationFn: async (formData: Partial<FIRFormData>) => {
      const { data, error } = await supabase
        .from("fir_forms")
        .insert({ user_id: user!.id, ...formData, tenant_id: overrideTenantId ?? formData.tenant_id })
        .select()
        .single();
      if (error) throw error;
      if (!data) throw new Error("Salvataggio FIR fallito: nessun record trovato o permessi insufficienti");
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mn-fir-forms"] });
      toast.success("FIR creato con successo");
    },
    onError: (error) => toast.error("Errore nella creazione del FIR: " + error.message),
  });

  const submitFIR = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from("fir_forms")
        .update({ status: "inviato", submitted_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      await consumeNumber.mutateAsync(id);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mn-fir-forms"] });
      toast.success("FIR inviato con successo!");
    },
    onError: (error) => toast.error("Errore nell'invio: " + error.message),
  });

  const deleteFIR = useMutation({
    mutationFn: async (id: string) => {
      const { data: firData } = await supabase.from("fir_forms").select("status").eq("id", id).single();
      await revertFirFromRegistryAndInventory(id);
      if (firData?.status === "bozza") await releaseNumber.mutateAsync(id);
      const { error } = await supabase.from("fir_forms").update({ deleted_by_user: true }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mn-fir-forms"] });
      toast.success("FIR rimosso dalla cronologia");
    },
    onError: (error) => toast.error("Errore nella rimozione: " + error.message),
  });

  const closeFIR = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from("fir_forms")
        .update({ status: "completato", completed_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new Error("Aggiornamento FIR fallito");
      try { await consumeNumber.mutateAsync(id); } catch { /* already consumed */ }

      // [DISABLED] Auto-assegnazione FIR dopo chiusura rimossa: creazione solo manuale.

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mn-fir-forms"] });
      queryClient.invalidateQueries({ queryKey: ["fir-number-pool"] });
      toast.success("FIR chiuso definitivamente");
    },
    onError: (error) => toast.error("Errore nella chiusura: " + error.message),
  });

  const silentSaveFIR = useMutation({
    mutationFn: async ({ id, ...formData }: Partial<FIRFormData> & { id: string }) => {
      const { data, error } = await supabase
        .from("fir_forms")
        .update(formData)
        .eq("id", id)
        .select()
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["mn-fir-forms"] }),
  });

  return { myForms, isLoadingMyForms, createFIR, submitFIR, deleteFIR, closeFIR, silentSaveFIR };
}
