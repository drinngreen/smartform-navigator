import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Intermediario {
  id: string;
  tenant_id: string | null;
  ragione_sociale: string;
  nome: string | null;
  cognome: string | null;
  codice_fiscale: string | null;
  partita_iva: string | null;
  indirizzo: string | null;
  cap: string | null;
  comune: string | null;
  provincia: string | null;
  nazione: string | null;
  pec: string | null;
  email: string | null;
  telefono: string | null;
  numero_iscrizione_albo: string | null;
  data_iscrizione_albo: string | null;
  data_scadenza_albo: string | null;
  cer_autorizzati: string[];
  categoria_albo: string | null;
  note: string | null;
  attivo: boolean;
  created_at: string;
  updated_at: string;
}

export function useIntermediari() {
  return useQuery({
    queryKey: ["intermediari"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("intermediari" as any)
        .select("*")
        .order("ragione_sociale");
      if (error) throw error;
      return (data || []) as unknown as Intermediario[];
    },
  });
}

export function useCreateIntermediario() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: Partial<Intermediario>) => {
      const { data, error } = await supabase
        .from("intermediari" as any)
        .insert(values as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["intermediari"] });
      toast.success("Intermediario creato");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdateIntermediario() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...values }: Partial<Intermediario> & { id: string }) => {
      const { error } = await supabase
        .from("intermediari" as any)
        .update(values as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["intermediari"] });
      toast.success("Intermediario aggiornato");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteIntermediario() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("intermediari" as any)
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["intermediari"] });
      toast.success("Intermediario eliminato");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
