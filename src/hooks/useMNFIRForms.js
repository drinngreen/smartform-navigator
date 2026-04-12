import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { useFIRNumberPool } from "@/hooks/useFIRNumberPool";
/**
 * FIR forms hook scoped to the current user — identical to useFIRForms
 * but uses the MN store. The data isolation comes from fir_forms.tenant_id
 * being set on insert (via the user's profile tenant_id).
 */
export function useMNFIRForms() {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const { releaseNumber, consumeNumber } = useFIRNumberPool();
    const { data: myForms, isLoading: isLoadingMyForms } = useQuery({
        queryKey: ["mn-fir-forms", "my", user?.id],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("fir_forms")
                .select("*")
                .eq("user_id", user.id)
                .eq("deleted_by_user", false)
                .order("created_at", { ascending: false });
            if (error)
                throw error;
            return data;
        },
        enabled: !!user,
    });
    const createFIR = useMutation({
        mutationFn: async (formData) => {
            const { data, error } = await supabase
                .from("fir_forms")
                .insert({ user_id: user.id, ...formData })
                .select()
                .single();
            if (error)
                throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["mn-fir-forms"] });
            toast.success("FIR creato con successo");
        },
        onError: (error) => toast.error("Errore nella creazione del FIR: " + error.message),
    });
    const submitFIR = useMutation({
        mutationFn: async (id) => {
            const { data, error } = await supabase
                .from("fir_forms")
                .update({ status: "inviato", submitted_at: new Date().toISOString() })
                .eq("id", id)
                .select()
                .single();
            if (error)
                throw error;
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
        mutationFn: async (id) => {
            const { data: firData } = await supabase.from("fir_forms").select("status").eq("id", id).single();
            if (firData?.status === "bozza")
                await releaseNumber.mutateAsync(id);
            const { error } = await supabase.from("fir_forms").update({ deleted_by_user: true }).eq("id", id);
            if (error)
                throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["mn-fir-forms"] });
            toast.success("FIR rimosso dalla cronologia");
        },
        onError: (error) => toast.error("Errore nella rimozione: " + error.message),
    });
    const closeFIR = useMutation({
        mutationFn: async (id) => {
            const { data, error } = await supabase
                .from("fir_forms")
                .update({ status: "completato", completed_at: new Date().toISOString() })
                .eq("id", id)
                .select()
                .maybeSingle();
            if (error)
                throw error;
            if (!data)
                throw new Error("Aggiornamento FIR fallito");
            try {
                await consumeNumber.mutateAsync(id);
            }
            catch { /* already consumed */ }
            if (user?.id) {
                try {
                    const { data: result, error: assignErr } = await supabase.rpc("auto_assign_after_consume", { p_user_id: user.id });
                    if (!assignErr && result) {
                        const [newNumber, remainingStr] = result.split("|");
                        const remaining = parseInt(remainingStr, 10);
                        if (newNumber)
                            toast.info(`📋 Nuovo formulario assegnato: ${newNumber}`);
                        if (remaining <= 10)
                            toast.warning(`⚠️ Solo ${remaining} formulari rimasti!`, { duration: 10000 });
                        if (remaining === 0) {
                            toast.error("🚨 SERBATOIO ESAURITO!", { duration: 15000 });
                            try {
                                const profileRes = await supabase.from("profiles").select("tenant_id, mn_context").eq("user_id", user.id).single();
                                const tenantId = profileRes.data?.tenant_id;
                                const mnCtx = profileRes.data?.mn_context;
                                const societaId = mnCtx === "niyol" ? "niyol" : mnCtx === "multyproget" ? "multy" : "global";
                                if (tenantId)
                                    await supabase.rpc("notify_fir_pool_empty", { p_tenant_id: tenantId, p_societa_id: societaId });
                            }
                            catch { /* silent */ }
                        }
                    }
                }
                catch (e) {
                    console.warn("Auto-assign failed:", e);
                }
            }
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
        mutationFn: async ({ id, ...formData }) => {
            const { data, error } = await supabase
                .from("fir_forms")
                .update(formData)
                .eq("id", id)
                .select()
                .maybeSingle();
            if (error)
                throw error;
            return data;
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["mn-fir-forms"] }),
    });
    return { myForms, isLoadingMyForms, createFIR, submitFIR, deleteFIR, closeFIR, silentSaveFIR };
}
