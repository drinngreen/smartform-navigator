import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { useMNContextStore } from "@/stores/mnContextStore";
import { toast } from "sonner";

export interface DragonWarehouse {
  id: string;
  company_id: string;
  code: string;
  description: string;
  has_cer: boolean;
  has_mps: boolean;
  limit_mps_eow: number | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

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
      if (error) throw error;
      return data as DragonWarehouse[];
    },
  });

  const create = useMutation({
    mutationFn: async (wh: Omit<Partial<DragonWarehouse>, "id" | "created_at" | "updated_at" | "company_id">) => {
      const { data, error } = await supabase
        .from("dragon_warehouses")
        .insert({
          company_id: companyId,
          code: wh.code!,
          description: wh.description ?? "",
          has_cer: wh.has_cer ?? false,
          has_mps: wh.has_mps ?? false,
          limit_mps_eow: wh.limit_mps_eow ?? null,
          active: wh.active ?? true,
        } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["dragon-warehouses"] }); toast.success("Magazzino creato"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const update = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<DragonWarehouse> & { id: string }) => {
      const payload: Record<string, any> = { ...updates };
      delete payload.company_id;
      delete payload.created_at;
      delete payload.updated_at;
      const { data, error } = await supabase
        .from("dragon_warehouses")
        .update(payload as any)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["dragon-warehouses"] }); toast.success("Magazzino aggiornato"); },
    onError: (e: Error) => toast.error(e.message),
  });

  return { warehouses, isLoading, create, update };
}
