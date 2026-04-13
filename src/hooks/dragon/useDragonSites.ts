import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { useMNContextStore } from "@/stores/mnContextStore";
import { toast } from "sonner";
import type { DragonProductionSite } from "@/types/dragon";

export function useDragonSites() {
  const companyId = useMNContextStore((s) => s.activeContext.tenantId);
  const qc = useQueryClient();

  const { data: sites = [], isLoading } = useQuery({
    queryKey: ["dragon-sites", companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dragon_production_sites")
        .select("*")
        .eq("company_id", companyId)
        .order("site_code");
      if (error) throw error;
      return data as DragonProductionSite[];
    },
  });

  const create = useMutation({
    mutationFn: async (site: Omit<Partial<DragonProductionSite>, 'id' | 'created_at' | 'updated_at' | 'company_id'>) => {
      const { data, error } = await supabase
        .from("dragon_production_sites")
        .insert({
          company_id: companyId,
          site_code: site.site_code!,
          name: site.name!,
          address: site.address ?? null,
          municipality: site.municipality ?? null,
          province: site.province ?? null,
          notes: site.notes ?? null,
          activity_type: site.activity_type ?? 'ND',
          active: site.active ?? true,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["dragon-sites"] }); toast.success("Cantiere creato"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const update = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<DragonProductionSite> & { id: string }) => {
      const payload: Record<string, any> = { ...updates };
      delete payload.company_id;
      delete payload.created_at;
      delete payload.updated_at;
      const { data, error } = await supabase
        .from("dragon_production_sites")
        .update(payload as any)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["dragon-sites"] }); toast.success("Cantiere aggiornato"); },
    onError: (e: Error) => toast.error(e.message),
  });

  return { sites, isLoading, create, update };
}
