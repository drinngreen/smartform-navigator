import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
export function useOrganizations() {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const { data: organizations, isLoading } = useQuery({
        queryKey: ["organizations", user?.id],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("organizations")
                .select("*")
                .order("name");
            if (error)
                throw error;
            return data;
        },
        enabled: !!user,
    });
    const createOrg = useMutation({
        mutationFn: async (org) => {
            const { data, error } = await supabase
                .from("organizations")
                .insert({ ...org, created_by: user.id })
                .select()
                .single();
            if (error)
                throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["organizations"] });
            toast.success("Organizzazione creata");
        },
        onError: (e) => toast.error("Errore: " + e.message),
    });
    const updateOrg = useMutation({
        mutationFn: async ({ id, ...updates }) => {
            const { data, error } = await supabase
                .from("organizations")
                .update({ ...updates, updated_by: user.id })
                .eq("id", id)
                .select()
                .single();
            if (error)
                throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["organizations"] });
            toast.success("Organizzazione aggiornata");
        },
        onError: (e) => toast.error("Errore: " + e.message),
    });
    return { organizations, isLoading, createOrg, updateOrg };
}
