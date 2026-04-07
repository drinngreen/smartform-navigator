// Hook per gestione email Global Reco (inbox + outbox)
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
const GLOBAL_RECO_TENANT_ID = "167d07ad-9184-484e-85a6-da5ceafa42a3";
/** Verifica se l'utente appartiene al tenant Global Reco */
export function useIsGlobalReco() {
    const { profile } = useAuth();
    return profile?.tenant_id === GLOBAL_RECO_TENANT_ID;
}
/** Lista email ricevute (inbox) */
export function useGlobalInbox() {
    return useQuery({
        queryKey: ["global-inbox"],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("emails_global_inbox")
                .select("*")
                .order("received_at", { ascending: false })
                .limit(200);
            if (error)
                throw error;
            return data;
        },
    });
}
/** Lista email inviate (outbox) */
export function useGlobalOutbox(category) {
    return useQuery({
        queryKey: ["global-outbox", category],
        queryFn: async () => {
            let q = supabase
                .from("emails_global_outbox")
                .select("*")
                .order("sent_at", { ascending: false })
                .limit(200);
            if (category)
                q = q.eq("category", category);
            const { data, error } = await q;
            if (error)
                throw error;
            return data;
        },
    });
}
/** Segna email come letta/non letta */
export function useToggleRead() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, is_read }) => {
            const { error } = await supabase
                .from("emails_global_inbox")
                .update({ is_read })
                .eq("id", id);
            if (error)
                throw error;
        },
        onSuccess: () => qc.invalidateQueries({ queryKey: ["global-inbox"] }),
    });
}
/** Invio email via SendGrid (edge function) */
export function useSendGlobalEmail() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (payload) => {
            const { data, error } = await supabase.functions.invoke("send-global-email", {
                body: payload,
            });
            if (error)
                throw error;
            if (data && !data.ok)
                throw new Error(data.error || "Errore invio email");
            return data;
        },
        onSuccess: () => {
            toast.success("Email inviata con successo");
            qc.invalidateQueries({ queryKey: ["global-outbox"] });
        },
        onError: (err) => toast.error("Errore invio: " + err.message),
    });
}
/** Sincronizza inbox (chiama webhook manualmente — utile per test) */
export function useSyncInbox() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async () => {
            const { data, error } = await supabase.functions.invoke("sync-global-inbox", {
                body: { emails: [] },
            });
            if (error)
                throw error;
            return data;
        },
        onSuccess: (data) => {
            toast.info(`Sincronizzazione completata: ${data?.imported ?? 0} nuove email`);
            qc.invalidateQueries({ queryKey: ["global-inbox"] });
        },
        onError: (err) => toast.error("Errore sync: " + err.message),
    });
}
