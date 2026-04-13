import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { useMNContextStore } from "@/stores/mnContextStore";
import { useAuth } from "@/hooks/useAuth";
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
  const { user } = useAuth();
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

  const createBatch = useMutation({
    mutationFn: async (batch: { model_id: string; source_item_id: string; input_quantity: number; execution_date?: string; notes?: string; source_register_movement_id?: string }) => {
      const { data, error } = await supabase
        .from("dragon_transform_batches")
        .insert({
          company_id: companyId,
          created_by: user?.id,
          model_id: batch.model_id,
          source_item_id: batch.source_item_id,
          input_quantity: batch.input_quantity,
          execution_date: batch.execution_date ?? new Date().toISOString().split('T')[0],
          notes: batch.notes ?? null,
          source_register_movement_id: batch.source_register_movement_id ?? null,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["dragon-transform-batches"] }); toast.success("Batch creato"); },
    onError: (e: Error) => toast.error(e.message),
  });

  return { batches, isLoading, createBatch };
}
