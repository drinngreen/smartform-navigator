
-- 1) Ricalcolo giacenza: mai più eccezioni per riga mancante / CER scritto diversamente
CREATE OR REPLACE FUNCTION public.recalculate_magazzino_giacenza(p_tenant_id uuid, p_impianto_id uuid, p_cer text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_baseline numeric := 0;
  v_snapshot timestamptz;
  v_delta numeric := 0;
  v_cer text;
  v_id uuid;
BEGIN
  IF p_tenant_id IS NULL OR p_impianto_id IS NULL OR p_cer IS NULL OR btrim(p_cer) = '' THEN
    RETURN;
  END IF;

  v_cer := public.normalize_cer(p_cer);
  PERFORM pg_advisory_xact_lock(public.inventory_lock_key(p_tenant_id, p_impianto_id, v_cer));

  SELECT id, saldo_iniziale_kg, saldo_snapshot_at
    INTO v_id, v_baseline, v_snapshot
  FROM public.magazzino_giacenze
  WHERE tenant_id = p_tenant_id AND impianto_id = p_impianto_id
    AND public.normalize_cer(cer) = v_cer
  ORDER BY (cer = v_cer) DESC, created_at NULLS LAST
  LIMIT 1
  FOR UPDATE;

  IF v_id IS NULL THEN
    INSERT INTO public.magazzino_giacenze (
      tenant_id, impianto_id, cer, quantita_kg, saldo_iniziale_kg, saldo_snapshot_at, stato, updated_at
    ) VALUES (
      p_tenant_id, p_impianto_id, v_cer, 0, 0, NULL, 'stoccato', now()
    )
    ON CONFLICT (tenant_id, impianto_id, cer) DO UPDATE SET updated_at = now()
    RETURNING id, saldo_iniziale_kg, saldo_snapshot_at INTO v_id, v_baseline, v_snapshot;
  END IF;

  SELECT COALESCE(SUM(
    CASE
      WHEN tipo_movimento = 'CARICO' THEN quantita_kg
      WHEN tipo_movimento = 'SCARICO' THEN -quantita_kg
      ELSE 0
    END
  ), 0)
  INTO v_delta
  FROM public.movimenti_impianto
  WHERE tenant_id = p_tenant_id
    AND impianto_id = p_impianto_id
    AND public.normalize_cer(cer) = v_cer
    AND (v_snapshot IS NULL OR created_at > v_snapshot);

  UPDATE public.magazzino_giacenze
  SET quantita_kg = COALESCE(v_baseline, 0) + v_delta,
      ultimo_carico_at = CASE WHEN v_delta > 0 THEN now() ELSE ultimo_carico_at END,
      ultimo_scarico_at = CASE WHEN v_delta < 0 THEN now() ELSE ultimo_scarico_at END,
      updated_at = now()
  WHERE id = v_id;
END;
$function$;

-- 2) Sync Dragon -> magazzino: una sola riga bersaglio e nessun blocco in caso di errore
CREATE OR REPLACE FUNCTION public.dragon_sync_stock_to_magazzino()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_cer text;
  v_desc text;
  v_delta numeric;
  v_is_test boolean;
  v_id uuid;
BEGIN
  IF NEW.test_session IS NOT NULL THEN RETURN NEW; END IF;
  IF coalesce(current_setting('dragon.sync_from_magazzino', true), '') = 'on' THEN RETURN NEW; END IF;
  IF NEW.warehouse_scope IS NOT NULL AND NEW.warehouse_scope <> 'WASTE' THEN RETURN NEW; END IF;

  v_delta := CASE NEW.sign WHEN 'PLUS' THEN NEW.quantity WHEN 'MINUS' THEN -NEW.quantity ELSE 0 END;
  IF v_delta = 0 THEN RETURN NEW; END IF;

  SELECT public.normalize_cer(codice_cer), descrizione, test_session IS NOT NULL
    INTO v_cer, v_desc, v_is_test
    FROM public.dragon_items WHERE id = NEW.item_id;
  IF v_cer IS NULL OR v_is_test THEN RETURN NEW; END IF;

  IF NEW.source_register_movement_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.dragon_register_movements rm
     WHERE rm.id = NEW.source_register_movement_id AND rm.test_session IS NOT NULL
  ) THEN RETURN NEW; END IF;

  BEGIN
    PERFORM set_config('dragon.sync_from_dragon', 'on', true);

    SELECT id INTO v_id
      FROM public.magazzino_giacenze
     WHERE tenant_id = NEW.company_id AND public.normalize_cer(cer) = v_cer
     ORDER BY (cer = v_cer) DESC, updated_at DESC NULLS LAST
     LIMIT 1;

    IF v_id IS NULL THEN
      INSERT INTO public.magazzino_giacenze (tenant_id, cer, descrizione_cer, quantita_kg)
      VALUES (NEW.company_id, v_cer, v_desc, v_delta);
    ELSE
      UPDATE public.magazzino_giacenze
         SET quantita_kg = quantita_kg + v_delta,
             ultimo_carico_at  = CASE WHEN v_delta > 0 THEN now() ELSE ultimo_carico_at END,
             ultimo_scarico_at = CASE WHEN v_delta < 0 THEN now() ELSE ultimo_scarico_at END
       WHERE id = v_id;
    END IF;

    PERFORM set_config('dragon.sync_from_dragon', 'off', true);
  EXCEPTION WHEN OTHERS THEN
    PERFORM set_config('dragon.sync_from_dragon', 'off', true);
    INSERT INTO public._stress_log (nota) VALUES ('sync dragon->magazzino fallito CER ' || coalesce(v_cer,'?') || ': ' || SQLERRM);
  END;

  RETURN NEW;
END;
$function$;

-- 3) Sync magazzino -> Dragon: non deve mai bloccare l'aggiornamento della giacenza
CREATE OR REPLACE FUNCTION public.magazzino_sync_to_dragon()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_delta numeric;
  v_item uuid;
  v_cause uuid;
BEGIN
  IF coalesce(current_setting('dragon.sync_from_dragon', true), '') = 'on' THEN RETURN NEW; END IF;
  IF NEW.tenant_id IS NULL THEN RETURN NEW; END IF;

  v_delta := NEW.quantita_kg - coalesce(OLD.quantita_kg, 0);
  IF v_delta IS NULL OR abs(v_delta) < 0.001 THEN RETURN NEW; END IF;

  BEGIN
    SELECT id INTO v_item FROM public.dragon_items
     WHERE company_id = NEW.tenant_id
       AND public.normalize_cer(codice_cer) = public.normalize_cer(NEW.cer)
       AND attivo
     LIMIT 1;

    IF v_item IS NULL THEN
      INSERT INTO public.dragon_items (company_id, codice_cer, descrizione)
      VALUES (NEW.tenant_id, public.normalize_cer(NEW.cer), coalesce(NEW.descrizione_cer, public.normalize_cer(NEW.cer)))
      RETURNING id INTO v_item;
    END IF;

    SELECT id INTO v_cause FROM public.dragon_causes
     WHERE code = CASE WHEN v_delta > 0 THEN 'RETTIFICA_GIACENZA_POSITIVA' ELSE 'RETTIFICA_GIACENZA_NEGATIVA' END;
    IF v_cause IS NULL THEN RETURN NEW; END IF;

    PERFORM set_config('dragon.sync_from_magazzino', 'on', true);
    INSERT INTO public.dragon_stock_movements
      (company_id, item_id, cause_id, quantity, sign, warehouse_scope, note)
    VALUES
      (NEW.tenant_id, v_item, v_cause, abs(v_delta),
       CASE WHEN v_delta > 0 THEN 'PLUS'::dragon_sign ELSE 'MINUS'::dragon_sign END,
       'WASTE', 'Allineamento automatico da giacenze operative');
    PERFORM set_config('dragon.sync_from_magazzino', 'off', true);
  EXCEPTION WHEN OTHERS THEN
    PERFORM set_config('dragon.sync_from_magazzino', 'off', true);
    INSERT INTO public._stress_log (nota) VALUES ('sync magazzino->dragon fallito CER ' || coalesce(NEW.cer,'?') || ': ' || SQLERRM);
  END;

  RETURN NEW;
END;
$function$;

-- 4) Configurazione Dragon auto-riparante
CREATE OR REPLACE FUNCTION public.dragon_ensure_config(p_company_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_register_id uuid;
BEGIN
  INSERT INTO public.dragon_causes (code, name, scope, direction, stock_sign, generates_stock_movement)
  VALUES ('SCARICO_PER_LAVORAZIONE', 'Scarico per lavorazione', 'BOTH', 'TRANSFORM', 'MINUS', true)
  ON CONFLICT (code) DO UPDATE SET active = true;

  INSERT INTO public.dragon_causes (code, name, scope, direction, stock_sign, generates_stock_movement)
  VALUES ('CARICO_DA_LAVORAZIONE', 'Carico da lavorazione', 'BOTH', 'TRANSFORM', 'PLUS', true)
  ON CONFLICT (code) DO UPDATE SET active = true;

  SELECT id INTO v_register_id FROM public.dragon_registers
   WHERE company_id = p_company_id AND active ORDER BY created_at LIMIT 1;

  IF v_register_id IS NULL THEN
    INSERT INTO public.dragon_registers (company_id, register_code, description, subject_type, active)
    VALUES (p_company_id, 'REG-AUTO', 'Registro creato automaticamente', 'PRODUTTORE', true)
    RETURNING id INTO v_register_id;
  END IF;

  RETURN v_register_id;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.dragon_ensure_config(uuid) TO authenticated, service_role;

-- 5) Cernita: nessun blocco per configurazione mancante e disponibilità con tolleranza
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
        SELECT id INTO v_stock_id FROM public.dragon_stock_movements
         WHERE source_register_movement_id = v_reg_id ORDER BY created_at DESC LIMIT 1;
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
