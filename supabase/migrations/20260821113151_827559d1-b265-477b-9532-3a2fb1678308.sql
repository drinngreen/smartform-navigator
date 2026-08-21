CREATE OR REPLACE FUNCTION public.dragon_cancel_cernita_atomic(p_batch_id uuid, p_reason text DEFAULT 'Annullamento cernita')
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_batch public.dragon_transform_batches%ROWTYPE;
  v_source public.dragon_items%ROWTYPE;
  v_output record;
  v_item public.dragon_items%ROWTYPE;
  v_scarico public.dragon_causes%ROWTYPE;
  v_carico public.dragon_causes%ROWTYPE;
  v_register_id uuid;
  v_reg_id uuid;
  v_stock_id uuid;
BEGIN
  SELECT * INTO v_batch FROM public.dragon_transform_batches WHERE id = p_batch_id FOR UPDATE;
  IF NOT FOUND OR auth.uid() IS NULL OR NOT public.can_access_tenant(v_batch.company_id) THEN
    RAISE EXCEPTION 'Cernita non accessibile';
  END IF;
  IF v_batch.status NOT IN ('CONFERMATA', 'PENDENTE') THEN
    RAISE EXCEPTION 'Cernita già annullata';
  END IF;

  SELECT * INTO v_source FROM public.dragon_items WHERE id = v_batch.source_item_id;
  SELECT * INTO v_scarico FROM public.dragon_causes WHERE code = 'SCARICO_PER_LAVORAZIONE' AND active;
  SELECT * INTO v_carico FROM public.dragon_causes WHERE code = 'CARICO_DA_LAVORAZIONE' AND active;
  SELECT id INTO v_register_id FROM public.dragon_registers
   WHERE company_id = v_batch.company_id AND active ORDER BY created_at LIMIT 1;

  IF v_source.id IS NULL OR v_scarico.id IS NULL OR v_carico.id IS NULL OR v_register_id IS NULL THEN
    RAISE EXCEPTION 'Configurazione Dragon incompleta per annullare la cernita';
  END IF;

  INSERT INTO public.dragon_register_movements
    (company_id, register_id, movement_date, recording_date, item_id, cer_code, description_snapshot,
     movement_type, cause_id, quantity, unit_of_measure, sign, source_context, weight_status, status,
     source_transform_batch_id, annotations, created_by)
  VALUES
    (v_batch.company_id, v_register_id, CURRENT_DATE, CURRENT_DATE, v_source.id, v_source.codice_cer,
     'ANNULLAMENTO CERNITA: ' || v_source.descrizione, 'CARICO', v_carico.id, v_batch.input_quantity,
     v_source.unita_misura_default, 'PLUS', 'UL', 'DEFINITIVO', 'CONSOLIDATO', v_batch.id, p_reason, auth.uid());

  FOR v_output IN
    SELECT * FROM public.dragon_transform_batch_outputs WHERE batch_id = v_batch.id
  LOOP
    SELECT * INTO v_item FROM public.dragon_items WHERE id = v_output.output_item_id;
    v_reg_id := NULL;
    v_stock_id := NULL;

    IF v_item.item_type = 'WASTE_CER' THEN
      INSERT INTO public.dragon_register_movements
        (company_id, register_id, movement_date, recording_date, item_id, cer_code, description_snapshot,
         movement_type, cause_id, quantity, unit_of_measure, sign, source_context, weight_status, status,
         source_transform_batch_id, annotations, created_by)
      VALUES
        (v_batch.company_id, v_register_id, CURRENT_DATE, CURRENT_DATE, v_item.id, v_item.codice_cer,
         'ANNULLAMENTO CERNITA: ' || v_item.descrizione, 'SCARICO', v_scarico.id, v_output.output_quantity,
         v_item.unita_misura_default, 'MINUS', 'UL', 'DEFINITIVO', 'CONSOLIDATO', v_batch.id, p_reason, auth.uid())
      RETURNING id INTO v_reg_id;

      SELECT id INTO v_stock_id
        FROM public.dragon_stock_movements
       WHERE source_register_movement_id = v_reg_id
       ORDER BY created_at DESC
       LIMIT 1;

      IF v_stock_id IS NULL THEN
        RAISE EXCEPTION 'Movimento fisico non generato durante lo storno del CER %', v_item.codice_cer;
      END IF;
    ELSE
      INSERT INTO public.dragon_stock_movements
        (company_id, item_id, movement_date, cause_id, quantity, sign, warehouse_scope,
         source_transform_batch_id, note, created_by)
      VALUES
        (v_batch.company_id, v_item.id, CURRENT_DATE, v_scarico.id, v_output.output_quantity,
         'MINUS', 'MPS', v_batch.id, p_reason, auth.uid())
      RETURNING id INTO v_stock_id;
    END IF;

    IF v_output.lot_id IS NOT NULL THEN
      INSERT INTO public.dragon_lot_movements
        (company_id, lot_id, item_id, transform_batch_id, stock_movement_id, quantity, sign, note, created_by)
      VALUES
        (v_batch.company_id, v_output.lot_id, v_item.id, v_batch.id, v_stock_id,
         v_output.output_quantity, 'MINUS', p_reason, auth.uid());
    END IF;
  END LOOP;

  UPDATE public.dragon_transform_batches SET status = 'ANNULLATA', updated_at = now() WHERE id = v_batch.id;
  INSERT INTO public.dragon_audit_logs
    (entity_type, entity_id, action_type, before_state, after_state, performed_by, reason)
  VALUES
    ('transform_batch', v_batch.id, 'CANCEL', jsonb_build_object('status', v_batch.status),
     jsonb_build_object('status', 'ANNULLATA'), auth.uid(), p_reason);
  RETURN v_batch.id;
END;
$$;

REVOKE ALL ON FUNCTION public.dragon_cancel_cernita_atomic(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.dragon_cancel_cernita_atomic(uuid, text) TO authenticated, service_role;