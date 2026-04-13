import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
export function useDragonAudit(entityType, entityId) {
    const { data: logs = [], isLoading } = useQuery({
        queryKey: ["dragon-audit", entityType, entityId],
        queryFn: async () => {
            let query = supabase
                .from("dragon_audit_logs")
                .select("*")
                .order("performed_at", { ascending: false })
                .limit(200);
            if (entityType)
                query = query.eq("entity_type", entityType);
            if (entityId)
                query = query.eq("entity_id", entityId);
            const { data, error } = await query;
            if (error)
                throw error;
            return data;
        },
    });
    return { logs, isLoading };
}
