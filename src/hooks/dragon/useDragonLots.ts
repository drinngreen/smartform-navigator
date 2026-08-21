import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { useMNContextStore } from "@/stores/mnContextStore";
import { toast } from "sonner";

export interface DragonLotMovement {
  id: string;
  lot_id: string;
  item_id: string;
  quantity: number;
  sign: "PLUS" | "MINUS";
  note: string | null;
  created_at: string;
  transform_batch_id: string | null;
  stock_movement_id: string | null;
}

export interface DragonLot {
  id: string;
  company_id: string;
  item_id: string;
  lot_code: string;
  production_date: string | null;
  warehouse_scope: string | null;
  status: string | null;
  notes: string | null;
  parent_lot_id: string | null;
  origin: string | null;
  created_at: string;
  item?: { id: string; codice_cer: string; descrizione: string } | null;
  movements?: DragonLotMovement[];
  balance: number;
}

export function useDragonLots() {
  const companyId = useMNContextStore((s) => s.activeContext.tenantId);
  const qc = useQueryClient();

  const { data: lots = [], isLoading, refetch } = useQuery({
    queryKey: ["dragon-lots", companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dragon_lots")
        .select("*, item:dragon_items(id, codice_cer, descrizione), movements:dragon_lot_movements(*)")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return ((data as any[]) ?? []).map((l) => ({
        ...l,
        balance: (l.movements ?? []).reduce(
          (acc: number, m: DragonLotMovement) => acc + (m.sign === "PLUS" ? Number(m.quantity) : -Number(m.quantity)),
          0,
        ),
      })) as DragonLot[];
    },
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["dragon-lots"] });
    qc.invalidateQueries({ queryKey: ["dragon-stock"] });
  };

  const splitLot = useMutation({
    mutationFn: async (p: { lotId: string; quantity: number; newLotCode: string; notes?: string }) => {
      const { data, error } = await (supabase.rpc as any)("dragon_split_lot_atomic", {
        p_lot_id: p.lotId,
        p_quantity: p.quantity,
        p_new_lot_code: p.newLotCode,
        p_notes: p.notes ?? null,
      });
      if (error) throw error;
      return data as string;
    },
    onSuccess: () => {
      refresh();
      toast.success("Lotto diviso");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const mergeLots = useMutation({
    mutationFn: async (p: { lotIds: string[]; targetLotCode: string; notes?: string }) => {
      const { data, error } = await (supabase.rpc as any)("dragon_merge_lots_atomic", {
        p_source_lot_ids: p.lotIds,
        p_target_lot_code: p.targetLotCode,
        p_notes: p.notes ?? null,
      });
      if (error) throw error;
      return data as string;
    },
    onSuccess: () => {
      refresh();
      toast.success("Lotti accorpati");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return { lots, isLoading, refetch, splitLot, mergeLots };
}
