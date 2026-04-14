import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { useMNContextStore } from "@/stores/mnContextStore";
import type { DragonRegister } from "@/types/dragon";

export function useDragonRegisters() {
  const companyId = useMNContextStore((s) => s.activeContext.tenantId);

  const { data: registers = [], isLoading } = useQuery({
    queryKey: ["dragon-registers", companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dragon_registers")
        .select("*")
        .eq("company_id", companyId)
        .eq("active", true)
        .order("register_code");
      if (error) throw error;
      return data as DragonRegister[];
    },
  });

  return { registers, isLoading };
}
