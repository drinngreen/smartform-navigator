import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { useMNContextStore } from "@/stores/mnContextStore";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import type { DragonRegisterMovement, DragonMovementStatus } from "@/types/dragon";

interface Filters {
  dateFrom?: string;
  dateTo?: string;
  cerCode?: string;
  causeId?: string;
  status?: DragonMovementStatus;
  movementType?: 'CARICO' | 'SCARICO';
  registerId?: string;
  search?: string;
}

export function useDragonRegister(filters?: Filters) {
  const companyId = useMNContextStore((s) => s.activeContext.tenantId);
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: movements = [], isLoading } = useQuery({
    queryKey: ["dragon-register", companyId, filters],
    queryFn: async () => {
      let query = supabase
        .from("dragon_register_movements")
        .select(`
          *,
          item:dragon_items(*),
          cause:dragon_causes(*),
          source_site:dragon_production_sites(*),
          linked_document:dragon_documents(*),
          register:dragon_registers(*)
        `)
        .eq("company_id", companyId)
        .is("deleted_at", null)
        .order("movement_date", { ascending: false })
        .order("movement_number", { ascending: false });

      if (filters?.dateFrom) query = query.gte("movement_date", filters.dateFrom);
      if (filters?.dateTo) query = query.lte("movement_date", filters.dateTo);
      if (filters?.cerCode) query = query.ilike("cer_code", `%${filters.cerCode}%`);
      if (filters?.causeId) query = query.eq("cause_id", filters.causeId);
      if (filters?.status) query = query.eq("status", filters.status);
      if (filters?.movementType) query = query.eq("movement_type", filters.movementType as any);
      if (filters?.registerId) query = query.eq("register_id", filters.registerId);

      const { data, error } = await query.limit(500);
      if (error) throw error;
      return data as DragonRegisterMovement[];
    },
  });

  const createMovement = useMutation({
    mutationFn: async (movement: Record<string, any>) => {
      const { data, error } = await supabase
        .from("dragon_register_movements")
        .insert({
          company_id: companyId,
          created_by: user?.id,
          ...movement,
        } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["dragon-register"] });
      qc.invalidateQueries({ queryKey: ["dragon-stock"] });
      toast.success("Movimento registrato");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const consolidate = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from("dragon_register_movements")
        .update({ status: "CONSOLIDATO" as any, updated_by: user?.id } as any)
        .eq("id", id)
        .eq("status", "BOZZA" as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["dragon-register"] });
      qc.invalidateQueries({ queryKey: ["dragon-stock"] });
      toast.success("Movimento consolidato");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return { movements, isLoading, createMovement, consolidate };
}
