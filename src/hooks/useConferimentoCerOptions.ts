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

export function useConferimentoCerOptions() {
  const { data: cerMovimentati } = useQuery({
    queryKey: ["dev-cer-movimentati", MULTY_TENANT_ID],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("movimenti_impianto")
        .select("cer, descrizione_rifiuto")
        .eq("tenant_id", MULTY_TENANT_ID);
      if (error) throw error;
      return data as { cer: string; descrizione_rifiuto: string | null }[];
    },
  });

  const preferiti = useMemo(() => {
    const isTechnicalDesc = (description: string) =>
      /rettifica di allineamento|allineamento ufficiale|import registro|storno/i.test(description) ||
      /^cer\s*[\d\s*.]+$/i.test(description);
    const normalize = (code: string) => code.replace(/\D/g, "");
    const catalogo = new Map(CER_CATALOG.map((entry) => [normalize(entry.codice), entry]));
    const options = new Map<string, ConferimentoCerOption>();

    for (const movement of cerMovimentati ?? []) {
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
      return CER_DATA.map(({ codice, descrizione, pericoloso }) => ({ codice, descrizione, pericoloso }));
    }
    return [...options.values()].sort((a, b) => a.codice.localeCompare(b.codice));
  }, [cerMovimentati]);

  const tutti = useMemo(() => {
    const codiciPreferiti = new Set(preferiti.map((entry) => entry.codice));
    return [...preferiti, ...CER_CATALOG.filter((entry) => !codiciPreferiti.has(entry.codice))];
  }, [preferiti]);

  return { preferiti, tutti };
}