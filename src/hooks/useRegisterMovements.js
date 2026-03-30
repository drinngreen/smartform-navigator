import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
export function useRegisterMovements(organizationId) {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const { data: movements, isLoading } = useQuery({
        queryKey: ["register-movements", organizationId, user?.id],
        queryFn: async () => {
            let query = supabase
                .from("register_movements")
                .select("*, organization:organizations!register_movements_organization_id_fkey(id,name)")
                .order("data_movimento", { ascending: false });
            if (organizationId) {
                query = query.eq("organization_id", organizationId);
            }
            const { data, error } = await query;
            if (error)
                throw error;
            return data;
        },
        enabled: !!user,
    });
    const createMovement = useMutation({
        mutationFn: async (movement) => {
            const { data, error } = await supabase
                .from("register_movements")
                .insert({ ...movement, created_by: user.id })
                .select()
                .single();
            if (error)
                throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["register-movements"] });
            toast.success("Movimento registrato");
        },
        onError: (e) => toast.error("Errore: " + e.message),
    });
    const updateMovement = useMutation({
        mutationFn: async ({ id, ...updates }) => {
            const { data, error } = await supabase
                .from("register_movements")
                .update({ ...updates, updated_by: user.id })
                .eq("id", id)
                .select()
                .single();
            if (error)
                throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["register-movements"] });
            toast.success("Movimento aggiornato");
        },
        onError: (e) => toast.error("Errore: " + e.message),
    });
    return { movements, isLoading, createMovement, updateMovement };
}
