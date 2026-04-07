import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";
export function useIntermediari() {
    return useQuery({
        queryKey: ["intermediari"],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("intermediari")
                .select("*")
                .order("ragione_sociale");
            if (error)
                throw error;
            return (data || []);
        },
    });
}
export function useCreateIntermediario() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (values) => {
            const { data, error } = await supabase
                .from("intermediari")
                .insert(values)
                .select()
                .single();
            if (error)
                throw error;
            return data;
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["intermediari"] });
            toast.success("Intermediario creato");
        },
        onError: (e) => toast.error(e.message),
    });
}
export function useUpdateIntermediario() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, ...values }) => {
            const { error } = await supabase
                .from("intermediari")
                .update(values)
                .eq("id", id);
            if (error)
                throw error;
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["intermediari"] });
            toast.success("Intermediario aggiornato");
        },
        onError: (e) => toast.error(e.message),
    });
}
export function useDeleteIntermediario() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (id) => {
            const { error } = await supabase
                .from("intermediari")
                .delete()
                .eq("id", id);
            if (error)
                throw error;
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["intermediari"] });
            toast.success("Intermediario eliminato");
        },
        onError: (e) => toast.error(e.message),
    });
}
