import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { listIncomingXFir } from "@/services/impiantoFirService";
import { getTenantConfig } from "@/lib/rentriBlockCodes";
import type { FirSummary } from "@/types/impiantoFir";

/**
 * Semaforo arancione: FIR in arrivo NUOVI di oggi letti dal RENTRI.
 * Sola lettura: nessuna scrittura, nessun invio, nessun effetto su giacenze.
 * Le voci chiuse con la X restano nascoste (localStorage) finché non ne arrivano di nuove.
 */
const DISMISS_KEY_PREFIX = "fir-arrivo-oggi-dismissed:";

function oggiISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function isDiOggi(item: FirSummary): boolean {
  const data = String(item.data_ricezione || "").slice(0, 10);
  return data === oggiISO();
}

function leggiDismissed(key: string): string[] {
  try {
    const raw = JSON.parse(localStorage.getItem(key) || "null");
    if (!raw || raw.giorno !== oggiISO()) return [];
    return Array.isArray(raw.ids) ? raw.ids.map(String) : [];
  } catch {
    return [];
  }
}

function salvaDismissed(key: string, ids: string[]) {
  try {
    localStorage.setItem(key, JSON.stringify({ giorno: oggiISO(), ids }));
  } catch {
    /* storage non disponibile: il semaforo resta acceso, nessun danno */
  }
}

export function useFirInArrivoOggi(cliente: "multy" | "niyol" | null) {
  const storageKey = `${DISMISS_KEY_PREFIX}${cliente ?? "none"}`;
  const [dismissed, setDismissed] = useState<string[]>(() => leggiDismissed(storageKey));

  useEffect(() => {
    setDismissed(leggiDismissed(storageKey));
  }, [storageKey]);

  const { data: items = [], refetch } = useQuery({
    queryKey: ["fir-in-arrivo-oggi", cliente],
    enabled: Boolean(cliente),
    refetchInterval: 60_000,
    queryFn: async (): Promise<FirSummary[]> => {
      if (!cliente) return [];
      const cfg = getTenantConfig(cliente);
      if (!cfg?.issuer) return [];
      try {
        const list = await listIncomingXFir(cliente, cfg.issuer, cfg.unitId);
        return list.filter(isDiOggi);
      } catch {
        return [];
      }
    },
  });

  const visibili = useMemo(
    () => items.filter((item) => !dismissed.includes(item.id)),
    [items, dismissed],
  );

  const dismiss = useCallback(
    (id: string) => {
      setDismissed((prev) => {
        if (prev.includes(id)) return prev;
        const next = [...prev, id];
        salvaDismissed(storageKey, next);
        return next;
      });
    },
    [storageKey],
  );

  const dismissAll = useCallback(() => {
    setDismissed(() => {
      const next = items.map((item) => item.id);
      salvaDismissed(storageKey, next);
      return next;
    });
  }, [items, storageKey]);

  return { items: visibili, count: visibili.length, dismiss, dismissAll, refetch };
}
