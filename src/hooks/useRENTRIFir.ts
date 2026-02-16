import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

export type FIR = Tables<"fir">;
export type FIRInsert = TablesInsert<"fir">;
export type FIRUpdate = TablesUpdate<"fir">;
export type FIREvent = Tables<"fir_events">;

export function useRENTRIFir(organizationId?: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: firList, isLoading } = useQuery({
    queryKey: ["rentri-fir", organizationId, user?.id],
    queryFn: async () => {
      let query = supabase
        .from("fir")
        .select("*, produttore:organizations!fir_produttore_id_fkey(id,name), trasportatore:organizations!fir_trasportatore_id_fkey(id,name), destinatario:organizations!fir_destinatario_id_fkey(id,name)")
        .order("created_at", { ascending: false });

      if (organizationId) {
        query = query.eq("organization_id", organizationId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const useFIRDetail = (firId: string | null) =>
    useQuery({
      queryKey: ["rentri-fir-detail", firId],
      queryFn: async () => {
        const [firRes, eventsRes] = await Promise.all([
          supabase
            .from("fir")
            .select("*, produttore:organizations!fir_produttore_id_fkey(*), trasportatore:organizations!fir_trasportatore_id_fkey(*), destinatario:organizations!fir_destinatario_id_fkey(*), intermediario:organizations!fir_intermediario_id_fkey(*)")
            .eq("id", firId!)
            .maybeSingle(),
          supabase
            .from("fir_events")
            .select("*")
            .eq("fir_id", firId!)
            .order("created_at", { ascending: true }),
        ]);

        if (firRes.error) throw firRes.error;
        return { fir: firRes.data, events: eventsRes.data ?? [] };
      },
      enabled: !!firId,
    });

  const saveDraft = useMutation({
    mutationFn: async (payload: { id?: string; data: Partial<FIRInsert> }) => {
      const { data, error } = await supabase.functions.invoke("fir-manage", {
        body: { action: "save_draft", ...payload },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rentri-fir"] });
      toast.success("Bozza FIR salvata");
    },
    onError: (e) => toast.error("Errore salvataggio: " + e.message),
  });

  const sendFIR = useMutation({
    mutationFn: async (firId: string) => {
      const { data, error } = await supabase.functions.invoke("fir-manage", {
        body: { action: "send", fir_id: firId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rentri-fir"] });
      toast.success("FIR inviato a RENTRI!");
    },
    onError: (e) => toast.error("Errore invio: " + e.message),
  });

  const markArrived = useMutation({
    mutationFn: async (firId: string) => {
      const { data, error } = await supabase.functions.invoke("fir-manage", {
        body: { action: "arrived", fir_id: firId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rentri-fir"] });
      toast.success("FIR marcato come consegnato");
    },
    onError: (e) => toast.error("Errore: " + e.message),
  });

  const generatePDF = useMutation({
    mutationFn: async (firId: string) => {
      const { data, error } = await supabase.functions.invoke("fir-manage", {
        body: { action: "pdf", fir_id: firId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onError: (e) => toast.error("Errore PDF: " + e.message),
  });

  const stats = {
    totale: firList?.length ?? 0,
    bozze: firList?.filter((f) => f.stato === "DRAFT").length ?? 0,
    attivi: firList?.filter((f) => f.stato === "ACTIVE" || f.stato === "IN_TRANSIT").length ?? 0,
    chiusi: firList?.filter((f) => f.stato === "CLOSED" || f.stato === "SENT_TO_RENTRI_DATA").length ?? 0,
    inAttesa: firList?.filter((f) => f.stato === "DELIVERED_PENDING_ACCEPTANCE").length ?? 0,
  };

  return {
    firList,
    isLoading,
    useFIRDetail,
    saveDraft,
    sendFIR,
    markArrived,
    generatePDF,
    stats,
  };
}
