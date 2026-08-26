import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { CER_DATA } from "@/components/multynijol/dev/DevCERPreferitiModule";
import { CER_CATALOG } from "@/data/cerCatalog";

const MULTY_TENANT_ID = "77ec9a3d-602e-438f-97bf-1c69abd8f691";

export interface ConferimentoCerOption {
  codice: string;
  descrizione: string;
  pericoloso: boolean;
}

interface UseConferimentoCerOptionsArgs {
  /** Limita la tendina ai soli CER ammessi per i privati (capitolo 20 + varianti già usate) */
  soloPrivati?: boolean;
}

const normalize = (code: string) => code.replace(/\D/g, "");

export function useConferimentoCerOptions({ soloPrivati = false }: UseConferimentoCerOptionsArgs = {}) {
  const { data: cerMovimentati } = useQuery({
    queryKey: ["dev-cer-movimentati", MULTY_TENANT_ID],
    enabled: !soloPrivati,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("movimenti_impianto")
        .select("cer, descrizione_rifiuto")
        .eq("tenant_id", MULTY_TENANT_ID);
      if (error) throw error;
      return data as { cer: string; descrizione_rifiuto: string | null }[];
    },
  });

  const { data: cerPrivati } = useQuery({
    queryKey: ["dev-cer-privati"],
    enabled: soloPrivati,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("privati_conferimenti" as any)
        .select("cer")
        .range(0, 9999);
      if (error) throw error;
      return (data as any[]).map((r) => ({ cer: r.cer as string, descrizione_rifiuto: null }));
    },
  });

  const preferiti = useMemo(() => {
    const isTechnicalDesc = (description: string) =>
      /rettifica di allineamento|allineamento ufficiale|import registro|storno/i.test(description) ||
      /^cer\s*[\d\s*.]+$/i.test(description);
    const catalogo = new Map(CER_CATALOG.map((entry) => [normalize(entry.codice), entry]));
    const options = new Map<string, ConferimentoCerOption>();
    const source = soloPrivati ? cerPrivati : cerMovimentati;

    for (const movement of source ?? []) {
      if (!movement.cer) continue;
      const codice = movement.cer.trim();
      const catalogEntry = catalogo.get(normalize(codice));
      const movementDescription = movement.descrizione_rifiuto?.trim();
      const descrizione =
        catalogEntry?.descrizione ??
        (movementDescription && !isTechnicalDesc(movementDescription) ? movementDescription : "");
      options.set(codice, {
        codice,
        descrizione,
        pericoloso: catalogEntry?.pericoloso ?? false,
      });
    }

    if (options.size === 0) {
      const fallback = CER_DATA.map(({ codice, descrizione, pericoloso }) => ({ codice, descrizione, pericoloso }));
      return soloPrivati ? fallback.filter((c) => normalize(c.codice).startsWith("20")) : fallback;
    }
    return [...options.values()].sort((a, b) => a.codice.localeCompare(b.codice));
  }, [cerMovimentati, cerPrivati, soloPrivati]);

  const tutti = useMemo(() => {
    const codiciPreferiti = new Set(preferiti.map((entry) => entry.codice));
    const catalogo = soloPrivati
      ? CER_CATALOG.filter((entry) => normalize(entry.codice).startsWith("20"))
      : CER_CATALOG;
    return [...preferiti, ...catalogo.filter((entry) => !codiciPreferiti.has(entry.codice))];
  }, [preferiti, soloPrivati]);

  return { preferiti, tutti };
}
