import { useCallback, useEffect, useState } from "react";
import { fetchRentriHistory, } from "@/lib/rentriHistory";
import { sanitizeRentriMessage } from "@/lib/rentriErrorMessages";
export function useRentriHistory(filters) {
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const { cliente, esito, from, to, limit } = filters;
    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            setRows(await fetchRentriHistory({ cliente, esito, from, to, limit }));
        }
        catch (err) {
            setError(sanitizeRentriMessage(err instanceof Error ? err.message : err));
            setRows([]);
        }
        finally {
            setLoading(false);
        }
    }, [cliente, esito, from, to, limit]);
    useEffect(() => { void load(); }, [load]);
    return { rows, loading, error, reload: load };
}
