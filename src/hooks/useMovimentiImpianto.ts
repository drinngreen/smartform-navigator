import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export interface MovimentoImpianto {
  id: string;
  impianto_id: string;
  tenant_id: string | null;
  cer: string;
  descrizione_rifiuto: string | null;
  quantita_kg: number;
  data_movimento: string;
  tipo_movimento: "CARICO" | "SCARICO";
  ruolo_impianto: "PRODUTTORE" | "DESTINATARIO" | "TRATTAMENTO_INTERNO";
  origine: string | null;
  fir_id: string | null;
  numero_fir: string | null;
  produttore_denominazione: string | null;
  trasportatore_denominazione: string | null;
  destinatario_denominazione: string | null;
  quantita_presunta: number | null;
  esito_accettazione: "accettato" | "parziale" | "respinto" | null;
  note: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export function useMovimentiImpianto(impiantoId?: string, ruolo?: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: movimenti, isLoading } = useQuery({
    queryKey: ["movimenti-impianto", impiantoId, ruolo],
    queryFn: async () => {
      let query = supabase
        .from("movimenti_impianto" as any)
        .select("*")
        .order("data_movimento", { ascending: false });

      if (impiantoId) query = query.eq("impianto_id", impiantoId);
      if (ruolo) query = query.eq("ruolo_impianto", ruolo);

      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as MovimentoImpianto[];
    },
    enabled: !!user,
  });

  const createMovimento = useMutation({
    mutationFn: async (mov: Partial<MovimentoImpianto> & { impianto_id: string; cer: string; quantita_kg: number; tipo_movimento: string; ruolo_impianto: string }) => {
      const { data, error } = await supabase
        .from("movimenti_impianto" as any)
        .insert({ ...mov, created_by: user!.id } as any)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as MovimentoImpianto;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["movimenti-impianto"] });
      toast.success("Movimento registrato");
    },
    onError: (e) => toast.error("Errore: " + e.message),
  });

  const deleteMovimento = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("movimenti_impianto" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["movimenti-impianto"] });
      toast.success("Movimento eliminato");
    },
    onError: (e) => toast.error("Errore: " + e.message),
  });

  const stats = {
    totale: movimenti?.length ?? 0,
    carichi: movimenti?.filter((m) => m.tipo_movimento === "CARICO").length ?? 0,
    scarichi: movimenti?.filter((m) => m.tipo_movimento === "SCARICO").length ?? 0,
    kgTotali: movimenti?.reduce((sum, m) => sum + Number(m.quantita_kg), 0) ?? 0,
  };

  return { movimenti, isLoading, createMovimento, deleteMovimento, stats };
}
