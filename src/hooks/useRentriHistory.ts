import { useCallback, useEffect, useState } from "react";
import {
  fetchRentriHistory,
  type RentriHistoryFilters,
  type RentriHistoryRow,
} from "@/lib/rentriHistory";
import { sanitizeRentriMessage } from "@/lib/rentriErrorMessages";

export function useRentriHistory(filters: RentriHistoryFilters) {
  const [rows, setRows] = useState<RentriHistoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { cliente, esito, from, to, limit } = filters;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setRows(await fetchRentriHistory({ cliente, esito, from, to, limit }));
    } catch (err) {
      setError(sanitizeRentriMessage(err instanceof Error ? err.message : err));
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [cliente, esito, from, to, limit]);

  useEffect(() => { void load(); }, [load]);

  return { rows, loading, error, reload: load };
}
