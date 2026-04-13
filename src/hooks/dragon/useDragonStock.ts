import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { useMNContextStore } from "@/stores/mnContextStore";
import type { DragonStockMovement, DragonStockBalance, DragonWarehouseScope } from "@/types/dragon";

export function useDragonStock(scope?: DragonWarehouseScope) {
  const companyId = useMNContextStore((s) => s.activeContext.tenantId);

  const { data: stockMovements = [], isLoading: loadingMovements } = useQuery({
    queryKey: ["dragon-stock", companyId, scope],
    queryFn: async () => {
      let query = supabase
        .from("dragon_stock_movements")
        .select(`*, item:dragon_items(*), cause:dragon_causes(*)`)
        .eq("company_id", companyId)
        .order("movement_date", { ascending: false })
        .order("created_at", { ascending: false });

      if (scope) query = query.eq("warehouse_scope", scope);

      const { data, error } = await query.limit(500);
      if (error) throw error;
      return data as DragonStockMovement[];
    },
  });

  // Calculate balances from movements
  const balances: DragonStockBalance[] = (() => {
    const map = new Map<string, { item: any; waste: number; mps: number }>();
    for (const m of stockMovements) {
      const key = m.item_id;
      if (!map.has(key)) map.set(key, { item: m.item, waste: 0, mps: 0 });
      const entry = map.get(key)!;
      const delta = m.sign === "PLUS" ? m.quantity : -m.quantity;
      if (m.warehouse_scope === "WASTE") entry.waste += delta;
      else entry.mps += delta;
    }
    const result: DragonStockBalance[] = [];
    for (const [item_id, { item, waste, mps }] of map) {
      if (waste !== 0) result.push({ item_id, item, warehouse_scope: "WASTE", balance: waste });
      if (mps !== 0) result.push({ item_id, item, warehouse_scope: "MPS", balance: mps });
    }
    return result.sort((a, b) => (a.item?.codice_cer || "").localeCompare(b.item?.codice_cer || ""));
  })();

  return { stockMovements, balances, isLoading: loadingMovements };
}
