import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Intermediazione {
  id: string;
  tenant_id: string | null;
  intermediario_id: string;
  produttore_id: string | null;
  destinatario_id: string | null;
  trasportatore_id: string | null;
  fir_id: string | null;
  fir_form_id: string | null;
  cer: string | null;
  descrizione_rifiuto: string | null;
  quantita_stimata_kg: number | null;
  quantita_effettiva_kg: number | null;
  tipo_provvigione: string;
  valore_provvigione: number;
  importo_provvigione: number | null;
  contratto_ref: string | null;
  condizioni_economiche: string | null;
  stato: string;
  fatturata: boolean;
  fattura_id: string | null;
  note: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  intermediario?: { ragione_sociale: string };
  produttore?: { name: string };
  destinatario?: { name: string };
  trasportatore?: { name: string };
}

export function useIntermediazioni() {
  return useQuery({
    queryKey: ["intermediazioni"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("intermediazioni" as any)
        .select(`
          *,
          intermediario:intermediari(ragione_sociale),
          produttore:organizations!intermediazioni_produttore_id_fkey(name),
          destinatario:organizations!intermediazioni_destinatario_id_fkey(name),
          trasportatore:organizations!intermediazioni_trasportatore_id_fkey(name)
        `)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as Intermediazione[];
    },
  });
}

export function useCreateIntermediazione() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: Partial<Intermediazione>) => {
      // Calculate provvigione if possible
      const importo = calcProvvigione(values);
      const { data, error } = await supabase
        .from("intermediazioni" as any)
        .insert({ ...values, importo_provvigione: importo } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["intermediazioni"] });
      toast.success("Intermediazione creata");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdateIntermediazione() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...values }: Partial<Intermediazione> & { id: string }) => {
      const importo = calcProvvigione(values);
      const { error } = await supabase
        .from("intermediazioni" as any)
        .update({ ...values, importo_provvigione: importo } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["intermediazioni"] });
      toast.success("Intermediazione aggiornata");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteIntermediazione() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("intermediazioni" as any)
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["intermediazioni"] });
      toast.success("Intermediazione eliminata");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useMovimentiIntermediario(intermediarioId?: string) {
  return useQuery({
    queryKey: ["movimenti_intermediario", intermediarioId],
    enabled: !!intermediarioId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("movimenti_intermediario" as any)
        .select("*")
        .eq("intermediario_id", intermediarioId!)
        .order("data_movimento", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });
}

function calcProvvigione(values: Partial<Intermediazione>): number | null {
  const qty = values.quantita_effettiva_kg || values.quantita_stimata_kg;
  if (!qty || !values.valore_provvigione) return null;
  switch (values.tipo_provvigione) {
    case "percentuale": return (qty * values.valore_provvigione) / 100;
    case "euro_ton": return (qty / 1000) * values.valore_provvigione;
    case "forfait": return values.valore_provvigione;
    default: return null;
  }
}
