import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/hooks/useAuth";
export function useFIRNumberPool() {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const { data: availableNumbers, isLoading, refetch } = useQuery({
        queryKey: ["fir-number-pool", "available", user?.id],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("fir_number_pool")
                .select("*")
                .eq("user_id", user.id)
                .eq("status", "available")
                .eq("is_demo", false)
                .order("fir_number", { ascending: true });
            if (error)
                throw error;
            return data;
        },
        enabled: !!user,
    });
    const { data: allNumbers } = useQuery({
        queryKey: ["fir-number-pool", "all", user?.id],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("fir_number_pool")
                .select("*")
                .eq("user_id", user.id)
                .eq("is_demo", false)
                .order("fir_number", { ascending: true });
            if (error)
                throw error;
            return data;
        },
        enabled: !!user,
    });
    const reserveNumber = useMutation({
        mutationFn: async ({ firNumber, firId }) => {
            const { data, error } = await supabase.rpc("reserve_fir_number", {
                p_fir_number: firNumber,
                p_fir_id: firId,
            });
            if (error)
                throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["fir-number-pool"] });
        },
    });
    const releaseNumber = useMutation({
        mutationFn: async (firId) => {
            const { error } = await supabase.rpc("release_fir_number", {
                p_fir_id: firId,
            });
            if (error)
                throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["fir-number-pool"] });
        },
    });
    const consumeNumber = useMutation({
        mutationFn: async (firId) => {
            const { error } = await supabase.rpc("consume_fir_number", {
                p_fir_id: firId,
            });
            if (error)
                throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["fir-number-pool"] });
        },
    });
    const stats = {
        total: allNumbers?.length ?? 0,
        available: allNumbers?.filter((n) => n.status === "available").length ?? 0,
        reserved: allNumbers?.filter((n) => n.status === "reserved").length ?? 0,
        consumed: allNumbers?.filter((n) => n.status === "consumed").length ?? 0,
    };
    return {
        availableNumbers,
        allNumbers,
        isLoading,
        refetch,
        reserveNumber,
        releaseNumber,
        consumeNumber,
        stats,
    };
}
