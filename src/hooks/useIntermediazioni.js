import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";
export function useIntermediazioni() {
    return useQuery({
        queryKey: ["intermediazioni"],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("intermediazioni")
                .select(`
          *,
          intermediario:intermediari(ragione_sociale),
          produttore:organizations!intermediazioni_produttore_id_fkey(name),
          destinatario:organizations!intermediazioni_destinatario_id_fkey(name),
          trasportatore:organizations!intermediazioni_trasportatore_id_fkey(name)
        `)
                .order("created_at", { ascending: false });
            if (error)
                throw error;
            return (data || []);
        },
    });
}
export function useCreateIntermediazione() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (values) => {
            // Calculate provvigione if possible
            const importo = calcProvvigione(values);
            const { data, error } = await supabase
                .from("intermediazioni")
                .insert({ ...values, importo_provvigione: importo })
                .select()
                .single();
            if (error)
                throw error;
            return data;
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["intermediazioni"] });
            toast.success("Intermediazione creata");
        },
        onError: (e) => toast.error(e.message),
    });
}
export function useUpdateIntermediazione() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, ...values }) => {
            const importo = calcProvvigione(values);
            const { error } = await supabase
                .from("intermediazioni")
                .update({ ...values, importo_provvigione: importo })
                .eq("id", id);
            if (error)
                throw error;
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["intermediazioni"] });
            toast.success("Intermediazione aggiornata");
        },
        onError: (e) => toast.error(e.message),
    });
}
export function useDeleteIntermediazione() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (id) => {
            const { error } = await supabase
                .from("intermediazioni")
                .delete()
                .eq("id", id);
            if (error)
                throw error;
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["intermediazioni"] });
            toast.success("Intermediazione eliminata");
        },
        onError: (e) => toast.error(e.message),
    });
}
export function useMovimentiIntermediario(intermediarioId) {
    return useQuery({
        queryKey: ["movimenti_intermediario", intermediarioId],
        enabled: !!intermediarioId,
        queryFn: async () => {
            const { data, error } = await supabase
                .from("movimenti_intermediario")
                .select("*")
                .eq("intermediario_id", intermediarioId)
                .order("data_movimento", { ascending: false });
            if (error)
                throw error;
            return data || [];
        },
    });
}
function calcProvvigione(values) {
    const qty = values.quantita_effettiva_kg || values.quantita_stimata_kg;
    if (!qty || !values.valore_provvigione)
        return null;
    switch (values.tipo_provvigione) {
        case "percentuale": return (qty * values.valore_provvigione) / 100;
        case "euro_ton": return (qty / 1000) * values.valore_provvigione;
        case "forfait": return values.valore_provvigione;
        default: return null;
    }
}
