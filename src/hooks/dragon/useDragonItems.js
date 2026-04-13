import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { useMNContextStore } from "@/stores/mnContextStore";
import { toast } from "sonner";
export function useDragonItems() {
    const companyId = useMNContextStore((s) => s.activeContext.tenantId);
    const qc = useQueryClient();
    const { data: items = [], isLoading } = useQuery({
        queryKey: ["dragon-items", companyId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("dragon_items")
                .select("*")
                .eq("company_id", companyId)
                .order("codice_cer");
            if (error)
                throw error;
            return data;
        },
    });
    const create = useMutation({
        mutationFn: async (item) => {
            const { data, error } = await supabase
                .from("dragon_items")
                .insert({
                company_id: companyId,
                codice_cer: item.codice_cer,
                descrizione: item.descrizione,
                pericoloso: item.pericoloso ?? false,
                classi_hp: item.classi_hp ?? [],
                stato_fisico_default: item.stato_fisico_default ?? null,
                unita_misura_default: item.unita_misura_default ?? 'kg',
                item_type: item.item_type ?? 'WASTE_CER',
                attivo: item.attivo ?? true,
                metadata: (item.metadata ?? {}),
            })
                .select()
                .single();
            if (error)
                throw error;
            return data;
        },
        onSuccess: () => { qc.invalidateQueries({ queryKey: ["dragon-items"] }); toast.success("Articolo creato"); },
        onError: (e) => toast.error(e.message),
    });
    const update = useMutation({
        mutationFn: async ({ id, ...updates }) => {
            const payload = { ...updates };
            delete payload.company_id;
            delete payload.created_at;
            delete payload.updated_at;
            const { data, error } = await supabase
                .from("dragon_items")
                .update(payload)
                .eq("id", id)
                .select()
                .single();
            if (error)
                throw error;
            return data;
        },
        onSuccess: () => { qc.invalidateQueries({ queryKey: ["dragon-items"] }); toast.success("Articolo aggiornato"); },
        onError: (e) => toast.error(e.message),
    });
    return { items, isLoading, create, update };
}
