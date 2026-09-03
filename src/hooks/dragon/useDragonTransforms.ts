import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { useMNContextStore } from "@/stores/mnContextStore";
import { toast } from "sonner";
import type { DragonTransformModel, DragonTransformBatch } from "@/types/dragon";

export function useDragonTransformModels() {
  const companyId = useMNContextStore((s) => s.activeContext.tenantId);
  const qc = useQueryClient();

  const { data: models = [], isLoading } = useQuery({
    queryKey: ["dragon-transform-models", companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dragon_transform_models")
        .select(`*, input_item:dragon_items!dragon_transform_models_input_item_id_fkey(*), outputs:dragon_transform_model_outputs(*, output_item:dragon_items!dragon_transform_model_outputs_output_item_id_fkey(*))`)
        .eq("company_id", companyId)
        .order("code");
      if (error) throw error;
      return data as DragonTransformModel[];
    },
  });

  const createModel = useMutation({
    mutationFn: async (model: { code: string; name: string; input_item_id: string; description?: string }) => {
      const { data, error } = await supabase
        .from("dragon_transform_models")
        .insert({
          company_id: companyId,
          code: model.code,
          name: model.name,
          input_item_id: model.input_item_id,
          description: model.description ?? null,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["dragon-transform-models"] }); toast.success("Modello creato"); },
    onError: (e: Error) => toast.error(e.message),
  });

  return { models, isLoading, createModel };
}

export function useDragonTransformBatches() {
  const companyId = useMNContextStore((s) => s.activeContext.tenantId);
  const qc = useQueryClient();

  const { data: batches = [], isLoading } = useQuery({
    queryKey: ["dragon-transform-batches", companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dragon_transform_batches")
        .select(`*, model:dragon_transform_models(*), source_item:dragon_items!dragon_transform_batches_source_item_id_fkey(*), outputs:dragon_transform_batch_outputs(*, output_item:dragon_items!dragon_transform_batch_outputs_output_item_id_fkey(*))`)
        .eq("company_id", companyId)
        .order("execution_date", { ascending: false });
      if (error) throw error;
      return data as DragonTransformBatch[];
    },
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["dragon-transform-batches"] });
    qc.invalidateQueries({ queryKey: ["dragon-register"] });
    qc.invalidateQueries({ queryKey: ["dragon-stock"] });
    qc.invalidateQueries({ queryKey: ["dragon-audit"] });
    qc.invalidateQueries({ queryKey: ["dev-giacenze"] });
    qc.invalidateQueries({ queryKey: ["dev-giacenze-baseline"] });
    qc.invalidateQueries({ queryKey: ["dev-mag-giacenze"] });
    qc.invalidateQueries({ queryKey: ["dev-mag-movimenti"] });
    qc.invalidateQueries({ queryKey: ["dev-registro-movimenti"] });
    qc.invalidateQueries({ queryKey: ["dev-registro-generale"] });
  };

  const executeCernita = useMutation({
    mutationFn: async (batch: { source_item_id: string; input_quantity: number; outputs: Array<{ item_id: string; quantity: number; lot_code?: string }>; model_id?: string | null; execution_date?: string; notes?: string; deferred?: boolean }) => {
      const { data, error } = await (supabase.rpc as any)("dragon_create_cernita_atomic", {
        p_company_id: companyId,
        p_source_item_id: batch.source_item_id,
        p_input_quantity: batch.input_quantity,
        p_outputs: batch.outputs,
        p_model_id: batch.model_id ?? null,
        p_execution_date: batch.execution_date ?? new Date().toISOString().split("T")[0],
        p_notes: batch.notes ?? null,
        p_deferred: batch.deferred ?? false,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: refresh,
    onError: (e: Error) => toast.error(e.message),
  });

  const completeCernita = useMutation({
    mutationFn: async ({ batchId, outputs }: { batchId: string; outputs: Array<{ item_id: string; quantity: number; lot_code?: string }> }) => {
      const { data, error } = await (supabase.rpc as any)("dragon_complete_cernita_atomic", { p_batch_id: batchId, p_outputs: outputs });
      if (error) throw error;
      return data;
    },
    onSuccess: refresh,
    onError: (e: Error) => toast.error(e.message),
  });

  const cancelCernita = useMutation({
    mutationFn: async (batchId: string) => {
      const { data, error } = await (supabase.rpc as any)("dragon_cancel_cernita_atomic", { p_batch_id: batchId, p_reason: "Annullamento operatore" });
      if (error) throw error;
      return data;
    },
    onSuccess: refresh,
    onError: (e: Error) => toast.error(e.message),
  });

  return { batches, isLoading, executeCernita, completeCernita, cancelCernita };
}
