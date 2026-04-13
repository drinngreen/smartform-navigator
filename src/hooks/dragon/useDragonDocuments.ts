import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { useMNContextStore } from "@/stores/mnContextStore";
import { toast } from "sonner";
import type { DragonDocument } from "@/types/dragon";

export function useDragonDocuments() {
  const companyId = useMNContextStore((s) => s.activeContext.tenantId);
  const qc = useQueryClient();

  const { data: documents = [], isLoading } = useQuery({
    queryKey: ["dragon-documents", companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dragon_documents")
        .select("*")
        .eq("company_id", companyId)
        .order("document_date", { ascending: false });
      if (error) throw error;
      return data as DragonDocument[];
    },
  });

  const create = useMutation({
    mutationFn: async (doc: Partial<DragonDocument>) => {
      const { data, error } = await supabase
        .from("dragon_documents")
        .insert({ ...doc, company_id: companyId })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["dragon-documents"] }); toast.success("Documento creato"); },
    onError: (e) => toast.error(e.message),
  });

  return { documents, isLoading, create };
}
