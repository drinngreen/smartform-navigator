CREATE OR REPLACE FUNCTION public.dragon_sync_stock_to_magazzino()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_cer text;
  v_desc text;
  v_delta numeric;
  v_rows int;
  v_is_test boolean;
BEGIN
  -- Movimenti di test: mai riversati nel magazzino operativo.
  IF NEW.test_session IS NOT NULL THEN RETURN NEW; END IF;
  IF coalesce(current_setting('dragon.sync_from_magazzino', true), '') = 'on' THEN RETURN NEW; END IF;

  -- Solo rifiuti: le MPS non alimentano le giacenze rifiuti.
  IF NEW.warehouse_scope IS NOT NULL AND NEW.warehouse_scope <> 'WASTE' THEN RETURN NEW; END IF;

  v_delta := CASE NEW.sign WHEN 'PLUS' THEN NEW.quantity WHEN 'MINUS' THEN -NEW.quantity ELSE 0 END;
  IF v_delta = 0 THEN RETURN NEW; END IF;

  SELECT upper(codice_cer), descrizione, test_session IS NOT NULL
    INTO v_cer, v_desc, v_is_test
    FROM public.dragon_items WHERE id = NEW.item_id;
  IF v_cer IS NULL THEN RETURN NEW; END IF;
  -- Articolo creato dal motore di test (taggato prima del movimento): scarta.
  IF v_is_test THEN RETURN NEW; END IF;

  -- Movimento generato da una riga di registro di test.
  IF NEW.source_register_movement_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.dragon_register_movements rm
     WHERE rm.id = NEW.source_register_movement_id AND rm.test_session IS NOT NULL
  ) THEN RETURN NEW; END IF;

  PERFORM set_config('dragon.sync_from_dragon', 'on', true);

  UPDATE public.magazzino_giacenze
     SET quantita_kg = quantita_kg + v_delta,
         ultimo_carico_at  = CASE WHEN v_delta > 0 THEN now() ELSE ultimo_carico_at END,
         ultimo_scarico_at = CASE WHEN v_delta < 0 THEN now() ELSE ultimo_scarico_at END
   WHERE tenant_id = NEW.company_id AND upper(cer) = v_cer;
  GET DIAGNOSTICS v_rows = ROW_COUNT;

  IF v_rows = 0 THEN
    INSERT INTO public.magazzino_giacenze (tenant_id, cer, descrizione_cer, quantita_kg)
    VALUES (NEW.company_id, v_cer, v_desc, v_delta);
  END IF;

  PERFORM set_config('dragon.sync_from_dragon', 'off', true);
  RETURN NEW;
END;
$function$;