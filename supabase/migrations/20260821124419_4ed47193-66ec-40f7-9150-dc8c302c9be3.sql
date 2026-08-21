CREATE OR REPLACE FUNCTION public.dragon_test_cleanup(p_company_id uuid, p_session text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_batches uuid[];
  v_deleted jsonb := '{}'::jsonb;
  v_n integer;
BEGIN
  IF auth.uid() IS NULL OR NOT public.can_access_tenant(p_company_id) THEN
    RAISE EXCEPTION 'Accesso non autorizzato';
  END IF;
  IF p_session IS NULL OR p_session NOT LIKE 'TEST-%' THEN
    RAISE EXCEPTION 'Sessione di test non valida';
  END IF;

  SELECT COALESCE(array_agg(id), '{}') INTO v_batches
    FROM public.dragon_transform_batches WHERE company_id = p_company_id AND test_session = p_session;

  DELETE FROM public.dragon_lot_movements
   WHERE company_id = p_company_id
     AND (transform_batch_id = ANY(v_batches)
       OR lot_id IN (SELECT id FROM public.dragon_lots WHERE company_id = p_company_id AND test_session = p_session)
       OR stock_movement_id IN (SELECT id FROM public.dragon_stock_movements WHERE company_id = p_company_id AND test_session = p_session));

  DELETE FROM public.dragon_transform_batch_outputs WHERE batch_id = ANY(v_batches);

  DELETE FROM public.dragon_movement_allocations
   WHERE in_movement_id IN (SELECT id FROM public.dragon_register_movements WHERE company_id = p_company_id AND test_session = p_session)
      OR out_movement_id IN (SELECT id FROM public.dragon_register_movements WHERE company_id = p_company_id AND test_session = p_session);

  DELETE FROM public.dragon_stock_movements WHERE company_id = p_company_id AND test_session = p_session;
  GET DIAGNOSTICS v_n = ROW_COUNT; v_deleted := v_deleted || jsonb_build_object('stock_movements', v_n);

  UPDATE public.dragon_transform_batches SET source_register_movement_id = NULL WHERE id = ANY(v_batches);

  DELETE FROM public.dragon_register_movements WHERE company_id = p_company_id AND test_session = p_session;
  GET DIAGNOSTICS v_n = ROW_COUNT; v_deleted := v_deleted || jsonb_build_object('register_movements', v_n);

  DELETE FROM public.dragon_transform_batches WHERE id = ANY(v_batches);
  GET DIAGNOSTICS v_n = ROW_COUNT; v_deleted := v_deleted || jsonb_build_object('batches', v_n);

  DELETE FROM public.dragon_lots WHERE company_id = p_company_id AND test_session = p_session;
  GET DIAGNOSTICS v_n = ROW_COUNT; v_deleted := v_deleted || jsonb_build_object('lots', v_n);

  DELETE FROM public.dragon_documents WHERE company_id = p_company_id AND test_session = p_session;

  DELETE FROM public.dragon_items WHERE company_id = p_company_id AND test_session = p_session;
  GET DIAGNOSTICS v_n = ROW_COUNT; v_deleted := v_deleted || jsonb_build_object('items', v_n);

  DELETE FROM public.dragon_audit_logs WHERE entity_id = ANY(v_batches);

  DELETE FROM public.fir_forms
   WHERE tenant_id = p_company_id AND numero_fir LIKE 'ZTEST%' AND note = p_session;
  GET DIAGNOSTICS v_n = ROW_COUNT; v_deleted := v_deleted || jsonb_build_object('fir_forms', v_n);

  RETURN v_deleted;
END;
$$;

CREATE OR REPLACE FUNCTION public.dragon_test_run(p_company_id uuid, p_scenario text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_session text;
  v_steps jsonb := '[]'::jsonb;
  v_before jsonb;
  v_after jsonb;
  v_started timestamptz := clock_timestamp();
  v_reg uuid;
  v_padre uuid; v_f1 uuid; v_f2 uuid;
  v_batch uuid;
  v_bal numeric;
  v_calo numeric;
  v_cause_in uuid; v_cause_out uuid;
  v_register uuid;
  v_ok boolean;
  v_msg text;
  v_fir uuid;
  v_num text;
  v_pool_before bigint; v_pool_after bigint;
  v_cleanup jsonb;
  v_diff jsonb;
BEGIN
  IF auth.uid() IS NULL OR p_company_id IS NULL OR NOT public.can_access_tenant(p_company_id) THEN
    RAISE EXCEPTION 'Accesso non autorizzato';
  END IF;
  IF p_scenario NOT IN ('cernite','giacenze','fir') THEN
    RAISE EXCEPTION 'Scenario non supportato: %', p_scenario;
  END IF;

  v_session := 'TEST-' || to_char(now(), 'YYYYMMDD-HH24MISS') || '-' || substr(md5(random()::text), 1, 4);
  v_before := public.dragon_test_balance_snapshot(p_company_id);

  SELECT id INTO v_cause_in FROM public.dragon_causes WHERE code = 'CARICO_PRODUZIONE_UL';
  SELECT id INTO v_cause_out FROM public.dragon_causes WHERE code = 'SCARICO_DA_DDT';
  SELECT id INTO v_register FROM public.dragon_registers WHERE company_id = p_company_id AND active ORDER BY created_at LIMIT 1;
  IF v_register IS NULL THEN RAISE EXCEPTION 'Nessun registro Dragon attivo'; END IF;

  IF p_scenario IN ('cernite','giacenze') THEN
    INSERT INTO public.dragon_items (company_id, codice_cer, descrizione, item_type, test_session)
    VALUES (p_company_id, 'ZT9901', 'TEST metalli misti', 'WASTE_CER', v_session) RETURNING id INTO v_padre;
    INSERT INTO public.dragon_items (company_id, codice_cer, descrizione, item_type, test_session)
    VALUES (p_company_id, 'ZT9902', 'TEST ferro selezionato', 'WASTE_CER', v_session) RETURNING id INTO v_f1;
    INSERT INTO public.dragon_items (company_id, codice_cer, descrizione, item_type, test_session)
    VALUES (p_company_id, 'ZT9903', 'TEST piombo MPS', 'MPS', v_session) RETURNING id INTO v_f2;
    v_steps := v_steps || jsonb_build_object('name','Creazione articoli di test','ok',true,'expected','3 articoli','actual','3 articoli');

    INSERT INTO public.dragon_register_movements
      (company_id, register_id, movement_date, recording_date, item_id, cer_code, description_snapshot,
       movement_type, cause_id, quantity, sign, status, created_by, test_session, note)
    VALUES (p_company_id, v_register, CURRENT_DATE, CURRENT_DATE, v_padre, 'ZT9901', 'TEST metalli misti',
            'CARICO', v_cause_in, 1000, 'PLUS', 'CONSOLIDATO', auth.uid(), v_session, 'Movimento di test ' || v_session)
    RETURNING id INTO v_reg;
    UPDATE public.dragon_stock_movements SET test_session = v_session WHERE source_register_movement_id = v_reg;

    v_bal := public.dragon_get_stock_balance(p_company_id, v_padre, 'WASTE');
    v_steps := v_steps || jsonb_build_object('name','Carico 1000 kg a magazzino','ok', v_bal = 1000,
      'expected','1000 kg','actual', v_bal || ' kg');
  END IF;

  IF p_scenario = 'cernite' THEN
    v_batch := public.dragon_create_cernita_atomic(
      p_company_id, v_padre, 1000,
      jsonb_build_array(
        jsonb_build_object('item_id', v_f1, 'quantity', 600, 'lot_code', 'LOTTO-' || v_session || '-A'),
        jsonb_build_object('item_id', v_f2, 'quantity', 300, 'lot_code', 'LOTTO-' || v_session || '-B')
      ), NULL, CURRENT_DATE, 'Cernita di test ' || v_session, false);
    PERFORM public.dragon_test_tag_batch(p_company_id, v_batch, v_session);
    v_steps := v_steps || jsonb_build_object('name','Esecuzione cernita 1000 kg -> 600 + 300','ok', v_batch IS NOT NULL,
      'expected','lavorazione creata','actual', COALESCE(v_batch::text,'nessuna'));

    v_bal := public.dragon_get_stock_balance(p_company_id, v_padre, 'WASTE');
    v_steps := v_steps || jsonb_build_object('name','Giacenza CER padre dopo cernita','ok', v_bal = 0, 'expected','0 kg','actual', v_bal || ' kg');
    v_bal := public.dragon_get_stock_balance(p_company_id, v_f1, 'WASTE');
    v_steps := v_steps || jsonb_build_object('name','Giacenza CER figlio rifiuto','ok', v_bal = 600, 'expected','600 kg','actual', v_bal || ' kg');
    v_bal := public.dragon_get_stock_balance(p_company_id, v_f2, 'MPS');
    v_steps := v_steps || jsonb_build_object('name','Giacenza MPS ottenuta','ok', v_bal = 300, 'expected','300 kg','actual', v_bal || ' kg');

    SELECT calo_peso_kg INTO v_calo FROM public.dragon_transform_batches WHERE id = v_batch;
    v_steps := v_steps || jsonb_build_object('name','Calo peso registrato','ok', v_calo = 100, 'expected','100 kg','actual', v_calo || ' kg');

    SELECT count(*) = 2 INTO v_ok FROM public.dragon_lots WHERE company_id = p_company_id AND test_session = v_session;
    v_steps := v_steps || jsonb_build_object('name','Lotti generati','ok', v_ok, 'expected','2 lotti','actual', (SELECT count(*)::text FROM public.dragon_lots WHERE company_id = p_company_id AND test_session = v_session) || ' lotti');

    PERFORM public.dragon_cancel_cernita_atomic(v_batch, 'Annullamento test ' || v_session);
    PERFORM public.dragon_test_tag_batch(p_company_id, v_batch, v_session);
    v_bal := public.dragon_get_stock_balance(p_company_id, v_padre, 'WASTE');
    v_steps := v_steps || jsonb_build_object('name','Ripristino giacenza dopo annullamento','ok', v_bal = 1000, 'expected','1000 kg','actual', v_bal || ' kg');
    v_bal := public.dragon_get_stock_balance(p_company_id, v_f1, 'WASTE');
    v_steps := v_steps || jsonb_build_object('name','Storno CER figlio','ok', v_bal = 0, 'expected','0 kg','actual', v_bal || ' kg');
  END IF;

  IF p_scenario = 'giacenze' THEN
    INSERT INTO public.dragon_register_movements
      (company_id, register_id, movement_date, recording_date, item_id, cer_code, description_snapshot,
       movement_type, cause_id, quantity, sign, status, created_by, test_session, note)
    VALUES (p_company_id, v_register, CURRENT_DATE, CURRENT_DATE, v_padre, 'ZT9901', 'TEST metalli misti',
            'SCARICO', v_cause_out, 400, 'MINUS', 'CONSOLIDATO', auth.uid(), v_session, 'Scarico di test ' || v_session)
    RETURNING id INTO v_reg;
    UPDATE public.dragon_stock_movements SET test_session = v_session WHERE source_register_movement_id = v_reg;
    v_bal := public.dragon_get_stock_balance(p_company_id, v_padre, 'WASTE');
    v_steps := v_steps || jsonb_build_object('name','Scarico 400 kg','ok', v_bal = 600, 'expected','600 kg','actual', v_bal || ' kg');

    v_ok := false; v_msg := 'nessun blocco';
    BEGIN
      PERFORM public.dragon_create_cernita_atomic(p_company_id, v_padre, 5000,
        jsonb_build_array(jsonb_build_object('item_id', v_f1, 'quantity', 100)), NULL, CURRENT_DATE, 'test overflow', false);
    EXCEPTION WHEN OTHERS THEN
      v_ok := true; v_msg := SQLERRM;
    END;
    v_steps := v_steps || jsonb_build_object('name','Blocco lavorazione oltre giacenza','ok', v_ok,
      'expected','operazione rifiutata','actual', v_msg);

    SELECT COALESCE(SUM(CASE WHEN sign='PLUS' THEN quantity ELSE -quantity END),0) INTO v_bal
      FROM public.dragon_stock_movements WHERE company_id = p_company_id AND item_id = v_padre;
    v_steps := v_steps || jsonb_build_object('name','Coerenza registro / magazzino','ok', v_bal = 600, 'expected','600 kg','actual', v_bal || ' kg');
  END IF;

  IF p_scenario = 'fir' THEN
    SELECT count(*) INTO v_pool_before FROM public.fir_number_pool WHERE status <> 'available';
    v_num := 'ZTEST' || to_char(now(),'HH24MISS') || substr(md5(random()::text),1,3);
    INSERT INTO public.fir_forms (user_id, tenant_id, status, numero_fir, note)
    VALUES (auth.uid(), p_company_id, 'bozza', v_num, v_session)
    RETURNING id INTO v_fir;
    v_steps := v_steps || jsonb_build_object('name','Creazione bozza FIR di test','ok', v_fir IS NOT NULL,
      'expected','bozza creata','actual', COALESCE(v_fir::text,'nessuna'));

    v_ok := false; v_msg := 'nessun blocco';
    BEGIN
      INSERT INTO public.fir_forms (user_id, tenant_id, status, numero_fir, note)
      VALUES (auth.uid(), p_company_id, 'bozza', v_num, v_session);
    EXCEPTION WHEN OTHERS THEN
      v_ok := true; v_msg := SQLERRM;
    END;
    v_steps := v_steps || jsonb_build_object('name','Blocco numero FIR duplicato','ok', v_ok,
      'expected','duplicato rifiutato','actual', v_msg);

    SELECT count(*) INTO v_pool_after FROM public.fir_number_pool WHERE status <> 'available';
    v_steps := v_steps || jsonb_build_object('name','Nessun numero FIR reale consumato','ok', v_pool_before = v_pool_after,
      'expected', v_pool_before::text, 'actual', v_pool_after::text);
  END IF;

  v_cleanup := public.dragon_test_cleanup(p_company_id, v_session);
  v_steps := v_steps || jsonb_build_object('name','Pulizia dati di test','ok', true, 'expected','dati rimossi','actual', v_cleanup::text);

  v_after := public.dragon_test_balance_snapshot(p_company_id);
  SELECT COALESCE(jsonb_object_agg(key, jsonb_build_object('prima', v_before->key, 'dopo', v_after->key)), '{}'::jsonb)
    INTO v_diff
    FROM (SELECT key FROM jsonb_each(v_before) UNION SELECT key FROM jsonb_each(v_after)) k
   WHERE COALESCE(v_before->>key, '0')::numeric IS DISTINCT FROM COALESCE(v_after->>key, '0')::numeric;

  v_steps := v_steps || jsonb_build_object('name','Sistema integro dopo il test','ok', v_diff = '{}'::jsonb,
    'expected','nessuna differenza di giacenza','actual', CASE WHEN v_diff = '{}'::jsonb THEN 'nessuna differenza' ELSE v_diff::text END);

  RETURN jsonb_build_object(
    'session', v_session,
    'scenario', p_scenario,
    'steps', v_steps,
    'duration_ms', round(EXTRACT(EPOCH FROM (clock_timestamp() - v_started)) * 1000),
    'passed', NOT EXISTS (SELECT 1 FROM jsonb_array_elements(v_steps) s WHERE (s->>'ok')::boolean IS NOT TRUE),
    'integrity_ok', v_diff = '{}'::jsonb
  );
EXCEPTION WHEN OTHERS THEN
  BEGIN
    PERFORM public.dragon_test_cleanup(p_company_id, v_session);
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  RETURN jsonb_build_object(
    'session', v_session,
    'scenario', p_scenario,
    'steps', v_steps || jsonb_build_object('name','Errore durante il test','ok', false, 'expected','esecuzione completata','actual', SQLERRM),
    'passed', false,
    'integrity_ok', false
  );
END;
$$;

REVOKE ALL ON FUNCTION public.dragon_test_run(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.dragon_test_cleanup(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.dragon_test_run(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.dragon_test_cleanup(uuid, text) TO authenticated;