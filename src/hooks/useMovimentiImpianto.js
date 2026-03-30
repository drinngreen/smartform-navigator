import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
export function useMovimentiImpianto(impiantoId, ruolo) {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const { data: movimenti, isLoading } = useQuery({
        queryKey: ["movimenti-impianto", impiantoId, ruolo],
        queryFn: async () => {
            let query = supabase
                .from("movimenti_impianto")
                .select("*")
                .order("data_movimento", { ascending: false });
            if (impiantoId)
                query = query.eq("impianto_id", impiantoId);
            if (ruolo)
                query = query.eq("ruolo_impianto", ruolo);
            const { data, error } = await query;
            if (error)
                throw error;
            return data;
        },
        enabled: !!user,
    });
    const createMovimento = useMutation({
        mutationFn: async (mov) => {
            const { data, error } = await supabase
                .from("movimenti_impianto")
                .insert({ ...mov, created_by: user.id })
                .select()
                .single();
            if (error)
                throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["movimenti-impianto"] });
            toast.success("Movimento registrato");
        },
        onError: (e) => toast.error("Errore: " + e.message),
    });
    const deleteMovimento = useMutation({
        mutationFn: async (id) => {
            const { error } = await supabase.from("movimenti_impianto").delete().eq("id", id);
            if (error)
                throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["movimenti-impianto"] });
            toast.success("Movimento eliminato");
        },
        onError: (e) => toast.error("Errore: " + e.message),
    });
    const stats = {
        totale: movimenti?.length ?? 0,
        carichi: movimenti?.filter((m) => m.tipo_movimento === "CARICO").length ?? 0,
        scarichi: movimenti?.filter((m) => m.tipo_movimento === "SCARICO").length ?? 0,
        kgTotali: movimenti?.reduce((sum, m) => sum + Number(m.quantita_kg), 0) ?? 0,
    };
    return { movimenti, isLoading, createMovimento, deleteMovimento, stats };
}
