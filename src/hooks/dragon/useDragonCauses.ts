import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import type { DragonCause } from "@/types/dragon";

export function useDragonCauses() {
  const { data: causes = [], isLoading } = useQuery({
    queryKey: ["dragon-causes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dragon_causes")
        .select("*")
        .eq("active", true)
        .order("code");
      if (error) throw error;
      return data as DragonCause[];
    },
    staleTime: 5 * 60 * 1000,
  });

  return { causes, isLoading };
}
