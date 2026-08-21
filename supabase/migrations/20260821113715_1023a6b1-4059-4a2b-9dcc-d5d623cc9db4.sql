CREATE OR REPLACE FUNCTION public.dragon_complete_cernita_atomic(p_batch_id uuid, p_outputs jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_batch public.dragon_transform_batches%ROWTYPE;
  v_output jsonb;
  v_item public.dragon_items%ROWTYPE;
  v_carico public.dragon_causes%ROWTYPE;
  v_register_id uuid;
  v_reg_id uuid;
  v_stock_id uuid;
  v_lot_id uuid;
  v_lot_code text;
  v_qty numeric;
  v_total numeric := 0;
BEGIN
  SELECT * INTO v_batch FROM public.dragon_transform_batches WHERE id = p_batch_id FOR UPDATE;
  IF NOT FOUND OR auth.uid() IS NULL OR NOT public.can_access_tenant(v_batch.company_id) THEN
    RAISE EXCEPTION 'Cernita non accessibile';
  END IF;
  IF v_batch.status <> 'PENDENTE' THEN
    RAISE EXCEPTION 'Solo una cernita pendente può essere completata';
  END IF;
  IF jsonb_typeof(p_outputs) <> 'array' OR jsonb_array_length(p_outputs) = 0 THEN
    RAISE EXCEPTION 'Inserire almeno un output';
  END IF;

  SELECT * INTO v_carico FROM public.dragon_causes WHERE code = 'CARICO_DA_LAVORAZIONE' AND active;
  SELECT id INTO v_register_id FROM public.dragon_registers
   WHERE company_id = v_batch.company_id AND active ORDER BY created_at LIMIT 1;
  IF v_carico.id IS NULL OR v_register_id IS NULL THEN
    RAISE EXCEPTION 'Configurazione Dragon incompleta per completare la cernita';
  END IF;

  FOR v_output IN SELECT value FROM jsonb_array_elements(p_outputs) LOOP
    v_qty := NULLIF(v_output->>'quantity', '')::numeric;
    IF v_qty IS NULL OR v_qty <= 0 THEN
      RAISE EXCEPTION 'Ogni output deve avere quantità positiva';
    END IF;
    SELECT * INTO v_item FROM public.dragon_items
     WHERE id = (v_output->>'item_id')::uuid AND company_id = v_batch.company_id AND attivo;
    IF NOT FOUND OR v_item.id = v_batch.source_item_id THEN
      RAISE EXCEPTION 'Articolo output non valido';
    END IF;
    v_total := v_total + v_qty;
  END LOOP;
  IF v_total > v_batch.input_quantity THEN
    RAISE EXCEPTION 'Gli output superano la quantità lavorata';
  END IF;

  FOR v_output IN SELECT value FROM jsonb_array_elements(p_outputs) LOOP
    v_qty := (v_output->>'quantity')::numeric;
    SELECT * INTO v_item FROM public.dragon_items
     WHERE id = (v_output->>'item_id')::uuid AND company_id = v_batch.company_id AND attivo;
    v_reg_id := NULL;
    v_stock_id := NULL;
    v_lot_id := NULL;

    IF v_item.item_type = 'WASTE_CER' THEN
      INSERT INTO public.dragon_register_movements
        (company_id, register_id, movement_date, recording_date, item_id, cer_code, description_snapshot,
         movement_type, cause_id, quantity, unit_of_measure, sign, source_context, weight_status, status,
         source_transform_batch_id, created_by)
      VALUES
        (v_batch.company_id, v_register_id, CURRENT_DATE, CURRENT_DATE, v_item.id, v_item.codice_cer,
         v_item.descrizione, 'CARICO', v_carico.id, v_qty, v_item.unita_misura_default, 'PLUS', 'UL',
         'DEFINITIVO', 'CONSOLIDATO', v_batch.id, auth.uid())
      RETURNING id INTO v_reg_id;

      SELECT id INTO v_stock_id FROM public.dragon_stock_movements
       WHERE source_register_movement_id = v_reg_id ORDER BY created_at DESC LIMIT 1;
      IF v_stock_id IS NULL THEN
        RAISE EXCEPTION 'Movimento fisico non generato per il CER %', v_item.codice_cer;
      END IF;
    ELSE
      INSERT INTO public.dragon_stock_movements
        (company_id, item_id, movement_date, cause_id, quantity, sign, warehouse_scope,
         source_transform_batch_id, created_by)
      VALUES
        (v_batch.company_id, v_item.id, CURRENT_DATE, v_carico.id, v_qty, 'PLUS', 'MPS', v_batch.id, auth.uid())
      RETURNING id INTO v_stock_id;
    END IF;

    v_lot_code := NULLIF(btrim(v_output->>'lot_code'), '');
    IF v_lot_code IS NOT NULL THEN
      INSERT INTO public.dragon_lots
        (company_id, item_id, lot_code, production_date, warehouse_scope, created_by)
      VALUES
        (v_batch.company_id, v_item.id, v_lot_code, CURRENT_DATE,
         CASE WHEN v_item.item_type = 'WASTE_CER' THEN 'WASTE'::public.dragon_warehouse_scope ELSE 'MPS'::public.dragon_warehouse_scope END,
         auth.uid())
      ON CONFLICT (company_id, lot_code) DO UPDATE SET updated_at = now()
      RETURNING id INTO v_lot_id;

      IF NOT EXISTS (SELECT 1 FROM public.dragon_lots WHERE id = v_lot_id AND item_id = v_item.id) THEN
        RAISE EXCEPTION 'Il lotto % appartiene a un articolo diverso', v_lot_code;
      END IF;

      INSERT INTO public.dragon_lot_movements
        (company_id, lot_id, item_id, transform_batch_id, stock_movement_id, quantity, sign, note, created_by)
      VALUES
        (v_batch.company_id, v_lot_id, v_item.id, v_batch.id, v_stock_id, v_qty, 'PLUS', 'Completamento cernita', auth.uid());
    END IF;

    INSERT INTO public.dragon_transform_batch_outputs
      (batch_id, output_item_id, output_quantity, warehouse_scope, generated_register_movement_id,
       generated_stock_movement_id, lot_id)
    VALUES
      (v_batch.id, v_item.id, v_qty,
       CASE WHEN v_item.item_type = 'WASTE_CER' THEN 'WASTE'::public.dragon_warehouse_scope ELSE 'MPS'::public.dragon_warehouse_scope END,
       v_reg_id, v_stock_id, v_lot_id);
  END LOOP;

  UPDATE public.dragon_transform_batches SET status = 'CONFERMATA', updated_at = now() WHERE id = v_batch.id;
  INSERT INTO public.dragon_audit_logs
    (entity_type, entity_id, action_type, before_state, after_state, performed_by, reason)
  VALUES
    ('transform_batch', v_batch.id, 'CONFIRM', jsonb_build_object('status', 'PENDENTE'),
     jsonb_build_object('status', 'CONFERMATA', 'outputs', p_outputs), auth.uid(), 'Cernita differita completata');
  RETURN v_batch.id;
END;
$$;

REVOKE ALL ON FUNCTION public.dragon_complete_cernita_atomic(uuid, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.dragon_complete_cernita_atomic(uuid, jsonb) TO authenticated, service_role;