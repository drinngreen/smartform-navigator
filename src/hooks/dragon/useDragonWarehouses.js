import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { useMNContextStore } from "@/stores/mnContextStore";
import { toast } from "sonner";
export function useDragonWarehouses() {
    const companyId = useMNContextStore((s) => s.activeContext.tenantId);
    const qc = useQueryClient();
    const { data: warehouses = [], isLoading } = useQuery({
        queryKey: ["dragon-warehouses", companyId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("dragon_warehouses")
                .select("*")
                .eq("company_id", companyId)
                .order("code");
            if (error)
                throw error;
            return data;
        },
    });
    const create = useMutation({
        mutationFn: async (wh) => {
            const { data, error } = await supabase
                .from("dragon_warehouses")
                .insert({
                company_id: companyId,
                code: wh.code,
                description: wh.description ?? "",
                has_cer: wh.has_cer ?? false,
                has_mps: wh.has_mps ?? false,
                limit_mps_eow: wh.limit_mps_eow ?? null,
                active: wh.active ?? true,
            })
                .select()
                .single();
            if (error)
                throw error;
            return data;
        },
        onSuccess: () => { qc.invalidateQueries({ queryKey: ["dragon-warehouses"] }); toast.success("Magazzino creato"); },
        onError: (e) => toast.error(e.message),
    });
    const update = useMutation({
        mutationFn: async ({ id, ...updates }) => {
            const payload = { ...updates };
            delete payload.company_id;
            delete payload.created_at;
            delete payload.updated_at;
            const { data, error } = await supabase
                .from("dragon_warehouses")
                .update(payload)
                .eq("id", id)
                .select()
                .single();
            if (error)
                throw error;
            return data;
        },
        onSuccess: () => { qc.invalidateQueries({ queryKey: ["dragon-warehouses"] }); toast.success("Magazzino aggiornato"); },
        onError: (e) => toast.error(e.message),
    });
    return { warehouses, isLoading, create, update };
}
