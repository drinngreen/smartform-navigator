import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";

export type Membership = Tables<"memberships">;

export function useMemberships(organizationId?: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: memberships, isLoading } = useQuery({
    queryKey: ["memberships", organizationId ?? "all", user?.id],
    queryFn: async () => {
      let query = supabase.from("memberships").select("*");
      if (organizationId) {
        query = query.eq("organization_id", organizationId);
      }
      const { data, error } = await query.order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: myOrgIds } = useQuery({
    queryKey: ["my-org-ids", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("memberships")
        .select("organization_id")
        .eq("user_id", user!.id);
      if (error) throw error;
      return data.map((m) => m.organization_id);
    },
    enabled: !!user,
  });

  const addMember = useMutation({
    mutationFn: async (membership: TablesInsert<"memberships">) => {
      const { data, error } = await supabase
        .from("memberships")
        .insert(membership)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["memberships"] });
      toast.success("Membro aggiunto");
    },
    onError: (e) => toast.error("Errore: " + e.message),
  });

  return { memberships, isLoading, myOrgIds, addMember };
}
