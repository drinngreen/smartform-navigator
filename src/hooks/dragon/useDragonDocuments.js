import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { useMNContextStore } from "@/stores/mnContextStore";
import { toast } from "sonner";
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
            if (error)
                throw error;
            return data;
        },
    });
    const create = useMutation({
        mutationFn: async (doc) => {
            const { data, error } = await supabase
                .from("dragon_documents")
                .insert({
                company_id: companyId,
                document_type: doc.document_type ?? 'ALTRO',
                number: doc.number ?? null,
                document_date: doc.document_date ?? null,
                counterparty_id: doc.counterparty_id ?? null,
                notes: doc.notes ?? null,
                status: doc.status ?? 'attivo',
                metadata: (doc.metadata ?? {}),
            })
                .select()
                .single();
            if (error)
                throw error;
            return data;
        },
        onSuccess: () => { qc.invalidateQueries({ queryKey: ["dragon-documents"] }); toast.success("Documento creato"); },
        onError: (e) => toast.error(e.message),
    });
    return { documents, isLoading, create };
}
