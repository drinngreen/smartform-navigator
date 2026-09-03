
CREATE OR REPLACE FUNCTION public.normalize_cer(p_value text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path TO 'public'
AS $$
  SELECT CASE
    WHEN p_value IS NULL OR btrim(p_value) = '' THEN p_value
    WHEN upper(regexp_replace(p_value, '[^0-9A-Za-z]', '', 'g')) ~ '^[0-9]{6}' THEN
      substr(upper(regexp_replace(p_value, '[^0-9A-Za-z]', '', 'g')), 1, 6)
      || CASE WHEN length(upper(regexp_replace(p_value, '[^0-9A-Za-z]', '', 'g'))) > 6
              THEN '-' || substr(upper(regexp_replace(p_value, '[^0-9A-Za-z]', '', 'g')), 7)
              ELSE '' END
    ELSE upper(btrim(p_value))
  END;
$$;

CREATE OR REPLACE FUNCTION public.trg_normalize_cer_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  v_col text := TG_ARGV[0];
  v_val text;
BEGIN
  EXECUTE format('SELECT ($1).%I::text', v_col) INTO v_val USING NEW;
  IF v_val IS NOT NULL AND v_val <> public.normalize_cer(v_val) THEN
    NEW := jsonb_populate_record(NEW, to_jsonb(NEW) || jsonb_build_object(v_col, public.normalize_cer(v_val)));
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_norm_cer_magazzino ON public.magazzino_giacenze;
CREATE TRIGGER trg_norm_cer_magazzino BEFORE INSERT OR UPDATE ON public.magazzino_giacenze
FOR EACH ROW EXECUTE FUNCTION public.trg_normalize_cer_column('cer');

DROP TRIGGER IF EXISTS trg_norm_cer_movimenti ON public.movimenti_impianto;
CREATE TRIGGER trg_norm_cer_movimenti BEFORE INSERT OR UPDATE ON public.movimenti_impianto
FOR EACH ROW EXECUTE FUNCTION public.trg_normalize_cer_column('cer');

DROP TRIGGER IF EXISTS trg_norm_cer_privati ON public.privati_conferimenti;
CREATE TRIGGER trg_norm_cer_privati BEFORE INSERT OR UPDATE ON public.privati_conferimenti
FOR EACH ROW EXECUTE FUNCTION public.trg_normalize_cer_column('cer');

DROP TRIGGER IF EXISTS trg_norm_cer_registro ON public.registro_generale;
CREATE TRIGGER trg_norm_cer_registro BEFORE INSERT OR UPDATE ON public.registro_generale
FOR EACH ROW EXECUTE FUNCTION public.trg_normalize_cer_column('cer');

DROP TRIGGER IF EXISTS trg_norm_cer_dragon_items ON public.dragon_items;
CREATE TRIGGER trg_norm_cer_dragon_items BEFORE INSERT OR UPDATE ON public.dragon_items
FOR EACH ROW EXECUTE FUNCTION public.trg_normalize_cer_column('codice_cer');

CREATE OR REPLACE FUNCTION public.magazzino_sync_to_dragon()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_delta numeric;
  v_item uuid;
  v_cause uuid;
BEGIN
  IF coalesce(current_setting('dragon.sync_from_dragon', true), '') = 'on' THEN RETURN NEW; END IF;
  IF NEW.tenant_id IS NULL THEN RETURN NEW; END IF;

  v_delta := NEW.quantita_kg - coalesce(OLD.quantita_kg, 0);
  IF v_delta IS NULL OR abs(v_delta) < 0.001 THEN RETURN NEW; END IF;

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
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.dragon_sync_stock_to_magazzino()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_cer text;
  v_desc text;
  v_delta numeric;
  v_rows int;
  v_is_test boolean;
BEGIN
  IF NEW.test_session IS NOT NULL THEN RETURN NEW; END IF;
  IF coalesce(current_setting('dragon.sync_from_magazzino', true), '') = 'on' THEN RETURN NEW; END IF;
  IF NEW.warehouse_scope IS NOT NULL AND NEW.warehouse_scope <> 'WASTE' THEN RETURN NEW; END IF;

  v_delta := CASE NEW.sign WHEN 'PLUS' THEN NEW.quantity WHEN 'MINUS' THEN -NEW.quantity ELSE 0 END;
  IF v_delta = 0 THEN RETURN NEW; END IF;

  SELECT public.normalize_cer(codice_cer), descrizione, test_session IS NOT NULL
    INTO v_cer, v_desc, v_is_test
    FROM public.dragon_items WHERE id = NEW.item_id;
  IF v_cer IS NULL THEN RETURN NEW; END IF;
  IF v_is_test THEN RETURN NEW; END IF;

  IF NEW.source_register_movement_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.dragon_register_movements rm
     WHERE rm.id = NEW.source_register_movement_id AND rm.test_session IS NOT NULL
  ) THEN RETURN NEW; END IF;

  PERFORM set_config('dragon.sync_from_dragon', 'on', true);

  UPDATE public.magazzino_giacenze
     SET quantita_kg = quantita_kg + v_delta,
         ultimo_carico_at  = CASE WHEN v_delta > 0 THEN now() ELSE ultimo_carico_at END,
         ultimo_scarico_at = CASE WHEN v_delta < 0 THEN now() ELSE ultimo_scarico_at END
   WHERE tenant_id = NEW.company_id AND public.normalize_cer(cer) = v_cer;
  GET DIAGNOSTICS v_rows = ROW_COUNT;

  IF v_rows = 0 THEN
    INSERT INTO public.magazzino_giacenze (tenant_id, cer, descrizione_cer, quantita_kg)
    VALUES (NEW.company_id, v_cer, v_desc, v_delta);
  END IF;

  PERFORM set_config('dragon.sync_from_dragon', 'off', true);
  RETURN NEW;
END;
$$;
