CREATE OR REPLACE FUNCTION public.dragon_create_cernita_atomic(p_company_id uuid, p_source_item_id uuid, p_input_quantity numeric, p_outputs jsonb DEFAULT '[]'::jsonb, p_model_id uuid DEFAULT NULL::uuid, p_execution_date date DEFAULT CURRENT_DATE, p_notes text DEFAULT NULL::text, p_deferred boolean DEFAULT false)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_batch_id uuid;
  v_register_id uuid;
  v_scarico public.dragon_causes%ROWTYPE;
  v_carico public.dragon_causes%ROWTYPE;
  v_source public.dragon_items%ROWTYPE;
  v_output jsonb;
  v_item public.dragon_items%ROWTYPE;
  v_qty numeric;
  v_total numeric := 0;
  v_reg_id uuid;
  v_stock_id uuid;
  v_lot_id uuid;
  v_lot_code text;
  v_balance numeric;
  v_mag numeric;
BEGIN
  IF auth.uid() IS NULL OR NOT public.can_access_tenant(p_company_id) THEN
    RAISE EXCEPTION 'Accesso non autorizzato all azienda';
  END IF;
  IF p_input_quantity IS NULL OR p_input_quantity <= 0 THEN
    RAISE EXCEPTION 'La quantità in ingresso deve essere maggiore di zero';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(p_company_id::text || ':' || p_source_item_id::text, 0));
  SELECT * INTO v_source FROM public.dragon_items
   WHERE id = p_source_item_id AND company_id = p_company_id AND attivo;
  IF NOT FOUND OR v_source.item_type <> 'WASTE_CER' THEN
    RAISE EXCEPTION 'CER padre non valido o non attivo';
  END IF;

  v_balance := COALESCE(public.dragon_get_stock_balance(p_company_id, p_source_item_id, 'WASTE'), 0);
  SELECT COALESCE(SUM(quantita_kg), 0) INTO v_mag
    FROM public.magazzino_giacenze
   WHERE tenant_id = p_company_id
     AND public.normalize_cer(cer) = public.normalize_cer(v_source.codice_cer);
  IF GREATEST(v_balance, v_mag) + 0.001 < p_input_quantity THEN
    RAISE EXCEPTION 'Giacenza insufficiente per il CER %: disponibili % kg', v_source.codice_cer, GREATEST(v_balance, v_mag);
  END IF;

  IF p_model_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.dragon_transform_models WHERE id = p_model_id AND company_id = p_company_id AND active
  ) THEN
    p_model_id := NULL;
  END IF;

  v_register_id := public.dragon_ensure_config(p_company_id);
  SELECT * INTO v_scarico FROM public.dragon_causes WHERE code = 'SCARICO_PER_LAVORAZIONE' AND active;
  SELECT * INTO v_carico FROM public.dragon_causes WHERE code = 'CARICO_DA_LAVORAZIONE' AND active;
  IF v_scarico.id IS NULL OR v_carico.id IS NULL THEN
    RAISE EXCEPTION 'Causali di lavorazione non configurate';
  END IF;

  IF NOT p_deferred AND (jsonb_typeof(p_outputs) <> 'array' OR jsonb_array_length(p_outputs) = 0) THEN
    RAISE EXCEPTION 'Inserire almeno un output per la lavorazione immediata';
  END IF;
  FOR v_output IN SELECT value FROM jsonb_array_elements(COALESCE(p_outputs, '[]'::jsonb)) LOOP
    v_qty := NULLIF(v_output->>'quantity', '')::numeric;
    IF v_qty IS NULL OR v_qty <= 0 THEN RAISE EXCEPTION 'Ogni output deve avere quantità positiva'; END IF;
    IF (v_output->>'item_id')::uuid = p_source_item_id THEN RAISE EXCEPTION 'Il CER padre non può essere anche un output'; END IF;
    SELECT * INTO v_item FROM public.dragon_items
     WHERE id = (v_output->>'item_id')::uuid AND company_id = p_company_id AND attivo;
    IF NOT FOUND THEN RAISE EXCEPTION 'Articolo output non valido'; END IF;
    v_total := v_total + v_qty;
  END LOOP;
  IF v_total > p_input_quantity + 0.001 THEN
    RAISE EXCEPTION 'Gli output (% kg) superano la quantità lavorata (% kg)', v_total, p_input_quantity;
  END IF;

  INSERT INTO public.dragon_transform_batches
    (company_id, model_id, execution_date, source_item_id, input_quantity, notes, status, created_by)
  VALUES
    (p_company_id, p_model_id, COALESCE(p_execution_date, CURRENT_DATE), p_source_item_id, p_input_quantity,
     p_notes, CASE WHEN p_deferred THEN 'PENDENTE'::public.dragon_batch_status ELSE 'CONFERMATA'::public.dragon_batch_status END, auth.uid())
  RETURNING id INTO v_batch_id;

  INSERT INTO public.dragon_register_movements
    (company_id, register_id, movement_date, recording_date, item_id, cer_code, description_snapshot,
     movement_type, cause_id, quantity, unit_of_measure, sign, source_context, weight_status, status,
     source_transform_batch_id, created_by, note)
  VALUES
    (p_company_id, v_register_id, COALESCE(p_execution_date, CURRENT_DATE), CURRENT_DATE, v_source.id,
     v_source.codice_cer, v_source.descrizione, 'SCARICO', v_scarico.id, p_input_quantity,
     v_source.unita_misura_default, 'MINUS', 'UL', 'DEFINITIVO', 'CONSOLIDATO', v_batch_id, auth.uid(), p_notes)
  RETURNING id INTO v_reg_id;

  INSERT INTO public.dragon_stock_movements
    (company_id, item_id, movement_date, cause_id, quantity, sign, warehouse_scope,
     source_register_movement_id, source_transform_batch_id, created_by, note)
  VALUES
    (p_company_id, v_source.id, COALESCE(p_execution_date, CURRENT_DATE), v_scarico.id, p_input_quantity,
     'MINUS', 'WASTE', v_reg_id, v_batch_id, auth.uid(), p_notes)
  RETURNING id INTO v_stock_id;

  UPDATE public.dragon_transform_batches SET source_register_movement_id = v_reg_id WHERE id = v_batch_id;

  IF NOT p_deferred THEN
    FOR v_output IN SELECT value FROM jsonb_array_elements(p_outputs) LOOP
      v_qty := (v_output->>'quantity')::numeric;
      SELECT * INTO v_item FROM public.dragon_items WHERE id = (v_output->>'item_id')::uuid;
      v_reg_id := NULL; v_stock_id := NULL; v_lot_id := NULL;

      IF v_item.item_type = 'WASTE_CER' THEN
        INSERT INTO public.dragon_register_movements
          (company_id, register_id, movement_date, recording_date, item_id, cer_code, description_snapshot,
           movement_type, cause_id, quantity, unit_of_measure, sign, source_context, weight_status, status,
           source_transform_batch_id, created_by)
        VALUES
          (p_company_id, v_register_id, COALESCE(p_execution_date, CURRENT_DATE), CURRENT_DATE, v_item.id,
           v_item.codice_cer, v_item.descrizione, 'CARICO', v_carico.id, v_qty, v_item.unita_misura_default,
           'PLUS', 'UL', 'DEFINITIVO', 'CONSOLIDATO', v_batch_id, auth.uid())
        RETURNING id INTO v_reg_id;

        INSERT INTO public.dragon_stock_movements
          (company_id, item_id, movement_date, cause_id, quantity, sign, warehouse_scope,
           source_register_movement_id, source_transform_batch_id, created_by)
        VALUES
          (p_company_id, v_item.id, COALESCE(p_execution_date, CURRENT_DATE), v_carico.id, v_qty,
           'PLUS', 'WASTE', v_reg_id, v_batch_id, auth.uid())
        RETURNING id INTO v_stock_id;
      ELSE
        INSERT INTO public.dragon_stock_movements
          (company_id, item_id, movement_date, cause_id, quantity, sign, warehouse_scope,
           source_transform_batch_id, created_by)
        VALUES
          (p_company_id, v_item.id, COALESCE(p_execution_date, CURRENT_DATE), v_carico.id, v_qty, 'PLUS',
           'MPS', v_batch_id, auth.uid()) RETURNING id INTO v_stock_id;
      END IF;

      v_lot_code := NULLIF(btrim(v_output->>'lot_code'), '');
      IF v_lot_code IS NOT NULL THEN
        INSERT INTO public.dragon_lots
          (company_id, item_id, lot_code, production_date, warehouse_scope, notes, created_by)
        VALUES
          (p_company_id, v_item.id, v_lot_code, COALESCE(p_execution_date, CURRENT_DATE),
           CASE WHEN v_item.item_type = 'WASTE_CER' THEN 'WASTE'::public.dragon_warehouse_scope ELSE 'MPS'::public.dragon_warehouse_scope END,
           p_notes, auth.uid())
        ON CONFLICT (company_id, lot_code) DO UPDATE SET updated_at = now()
        RETURNING id INTO v_lot_id;
        IF NOT EXISTS (SELECT 1 FROM public.dragon_lots WHERE id = v_lot_id AND item_id = v_item.id) THEN
          RAISE EXCEPTION 'Il lotto % appartiene a un articolo diverso', v_lot_code;
        END IF;
        INSERT INTO public.dragon_lot_movements
          (company_id, lot_id, item_id, transform_batch_id, stock_movement_id, quantity, sign, note, created_by)
        VALUES (p_company_id, v_lot_id, v_item.id, v_batch_id, v_stock_id, v_qty, 'PLUS', 'Produzione da cernita', auth.uid());
      END IF;

      INSERT INTO public.dragon_transform_batch_outputs
        (batch_id, output_item_id, output_quantity, warehouse_scope, generated_register_movement_id,
         generated_stock_movement_id, lot_id)
      VALUES
        (v_batch_id, v_item.id, v_qty,
         CASE WHEN v_item.item_type = 'WASTE_CER' THEN 'WASTE'::public.dragon_warehouse_scope ELSE 'MPS'::public.dragon_warehouse_scope END,
         v_reg_id, v_stock_id, v_lot_id);
    END LOOP;
  END IF;

  INSERT INTO public.dragon_audit_logs
    (entity_type, entity_id, action_type, after_state, performed_by, reason)
  VALUES ('transform_batch', v_batch_id, CASE WHEN p_deferred THEN 'CREATE'::public.dragon_audit_action ELSE 'CONFIRM'::public.dragon_audit_action END,
          jsonb_build_object('source_item_id', p_source_item_id, 'input_quantity', p_input_quantity, 'outputs', p_outputs,
                             'status', CASE WHEN p_deferred THEN 'PENDENTE' ELSE 'CONFERMATA' END),
          auth.uid(), CASE WHEN p_deferred THEN 'Cernita differita aperta' ELSE 'Cernita atomica confermata' END);
  RETURN v_batch_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.dragon_complete_cernita_atomic(p_batch_id uuid, p_outputs jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
        (v_batch.company_id, v_register_id, v_batch.execution_date, CURRENT_DATE, v_item.id, v_item.codice_cer,
         v_item.descrizione, 'CARICO', v_carico.id, v_qty, v_item.unita_misura_default, 'PLUS', 'UL',
         'DEFINITIVO', 'CONSOLIDATO', v_batch.id, auth.uid())
      RETURNING id INTO v_reg_id;

      INSERT INTO public.dragon_stock_movements
        (company_id, item_id, movement_date, cause_id, quantity, sign, warehouse_scope,
         source_register_movement_id, source_transform_batch_id, created_by)
      VALUES
        (v_batch.company_id, v_item.id, v_batch.execution_date, v_carico.id, v_qty, 'PLUS', 'WASTE',
         v_reg_id, v_batch.id, auth.uid())
      RETURNING id INTO v_stock_id;
    ELSE
      INSERT INTO public.dragon_stock_movements
        (company_id, item_id, movement_date, cause_id, quantity, sign, warehouse_scope,
         source_transform_batch_id, created_by)
      VALUES
        (v_batch.company_id, v_item.id, v_batch.execution_date, v_carico.id, v_qty, 'PLUS', 'MPS',
         v_batch.id, auth.uid())
      RETURNING id INTO v_stock_id;
    END IF;

    v_lot_code := NULLIF(btrim(v_output->>'lot_code'), '');
    IF v_lot_code IS NOT NULL THEN
      INSERT INTO public.dragon_lots
        (company_id, item_id, lot_code, production_date, warehouse_scope, created_by)
      VALUES
        (v_batch.company_id, v_item.id, v_lot_code, v_batch.execution_date,
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
$function$;

CREATE OR REPLACE FUNCTION public.dragon_cancel_cernita_atomic(p_batch_id uuid, p_reason text DEFAULT 'Annullamento cernita')
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
  IF v_batch.status NOT IN ('CONFERMATA','PENDENTE') THEN
    RAISE EXCEPTION 'Cernita già annullata';
  END IF;
  SELECT * INTO v_source FROM public.dragon_items WHERE id = v_batch.source_item_id;
  SELECT * INTO v_scarico FROM public.dragon_causes WHERE code = 'SCARICO_PER_LAVORAZIONE' AND active;
  SELECT * INTO v_carico FROM public.dragon_causes WHERE code = 'CARICO_DA_LAVORAZIONE' AND active;
  SELECT id INTO v_register_id FROM public.dragon_registers WHERE company_id = v_batch.company_id AND active ORDER BY created_at LIMIT 1;

  INSERT INTO public.dragon_register_movements
    (company_id, register_id, movement_date, recording_date, item_id, cer_code, description_snapshot,
     movement_type, cause_id, quantity, unit_of_measure, sign, source_context, weight_status, status,
     source_transform_batch_id, annotations, created_by)
  VALUES
    (v_batch.company_id, v_register_id, CURRENT_DATE, CURRENT_DATE, v_source.id, v_source.codice_cer,
     'ANNULLAMENTO CERNITA: ' || v_source.descrizione, 'CARICO', v_carico.id, v_batch.input_quantity,
     v_source.unita_misura_default, 'PLUS', 'UL', 'DEFINITIVO', 'CONSOLIDATO', v_batch.id, p_reason, auth.uid())
  RETURNING id INTO v_reg_id;

  INSERT INTO public.dragon_stock_movements
    (company_id, item_id, movement_date, cause_id, quantity, sign, warehouse_scope,
     source_register_movement_id, source_transform_batch_id, note, created_by)
  VALUES
    (v_batch.company_id, v_source.id, CURRENT_DATE, v_carico.id, v_batch.input_quantity, 'PLUS', 'WASTE',
     v_reg_id, v_batch.id, p_reason, auth.uid());

  FOR v_output IN SELECT * FROM public.dragon_transform_batch_outputs WHERE batch_id = v_batch.id LOOP
    SELECT * INTO v_item FROM public.dragon_items WHERE id = v_output.output_item_id;
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

      INSERT INTO public.dragon_stock_movements
        (company_id, item_id, movement_date, cause_id, quantity, sign, warehouse_scope,
         source_register_movement_id, source_transform_batch_id, note, created_by)
      VALUES
        (v_batch.company_id, v_item.id, CURRENT_DATE, v_scarico.id, v_output.output_quantity, 'MINUS', 'WASTE',
         v_reg_id, v_batch.id, p_reason, auth.uid())
      RETURNING id INTO v_stock_id;
    ELSE
      INSERT INTO public.dragon_stock_movements
        (company_id, item_id, movement_date, cause_id, quantity, sign, warehouse_scope,
         source_transform_batch_id, note, created_by)
      VALUES
        (v_batch.company_id, v_item.id, CURRENT_DATE, v_scarico.id, v_output.output_quantity, 'MINUS', 'MPS',
         v_batch.id, p_reason, auth.uid())
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
$function$;

REVOKE ALL ON FUNCTION public.dragon_create_cernita_atomic(uuid,uuid,numeric,jsonb,uuid,date,text,boolean) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.dragon_complete_cernita_atomic(uuid,jsonb) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.dragon_cancel_cernita_atomic(uuid,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.dragon_create_cernita_atomic(uuid,uuid,numeric,jsonb,uuid,date,text,boolean) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.dragon_complete_cernita_atomic(uuid,jsonb) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.dragon_cancel_cernita_atomic(uuid,text) TO authenticated, service_role;