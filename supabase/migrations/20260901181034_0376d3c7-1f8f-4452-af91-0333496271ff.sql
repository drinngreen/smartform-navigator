-- 1) Correzione una tantum della cernita del 31/08 non propagata al magazzino operativo
UPDATE public.magazzino_giacenze SET quantita_kg = quantita_kg - 1840, ultimo_scarico_at = now()
 WHERE tenant_id = '77ec9a3d-602e-438f-97bf-1c69abd8f691' AND upper(cer) = '150106';
UPDATE public.magazzino_giacenze SET quantita_kg = quantita_kg + 1840, ultimo_carico_at = now()
 WHERE tenant_id = '77ec9a3d-602e-438f-97bf-1c69abd8f691' AND upper(cer) = '150101';

-- 2) Dragon -> magazzino operativo
CREATE OR REPLACE FUNCTION public.dragon_sync_stock_to_magazzino()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cer text;
  v_desc text;
  v_delta numeric;
  v_rows int;
BEGIN
  IF NEW.test_session IS NOT NULL THEN RETURN NEW; END IF;
  IF coalesce(current_setting('dragon.sync_from_magazzino', true), '') = 'on' THEN RETURN NEW; END IF;

  v_delta := CASE NEW.sign WHEN 'PLUS' THEN NEW.quantity WHEN 'MINUS' THEN -NEW.quantity ELSE 0 END;
  IF v_delta = 0 THEN RETURN NEW; END IF;

  SELECT upper(codice_cer), descrizione INTO v_cer, v_desc FROM public.dragon_items WHERE id = NEW.item_id;
  IF v_cer IS NULL THEN RETURN NEW; END IF;

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
$$;

DROP TRIGGER IF EXISTS trg_dragon_sync_stock_to_magazzino ON public.dragon_stock_movements;
CREATE TRIGGER trg_dragon_sync_stock_to_magazzino
AFTER INSERT ON public.dragon_stock_movements
FOR EACH ROW EXECUTE FUNCTION public.dragon_sync_stock_to_magazzino();

-- 3) Magazzino operativo -> Dragon (rettifica tracciata)
CREATE OR REPLACE FUNCTION public.magazzino_sync_to_dragon()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
   WHERE company_id = NEW.tenant_id AND upper(codice_cer) = upper(NEW.cer) AND attivo LIMIT 1;

  IF v_item IS NULL THEN
    INSERT INTO public.dragon_items (company_id, codice_cer, descrizione)
    VALUES (NEW.tenant_id, upper(NEW.cer), coalesce(NEW.descrizione_cer, upper(NEW.cer)))
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

DROP TRIGGER IF EXISTS trg_magazzino_sync_to_dragon ON public.magazzino_giacenze;
CREATE TRIGGER trg_magazzino_sync_to_dragon
AFTER INSERT OR UPDATE OF quantita_kg ON public.magazzino_giacenze
FOR EACH ROW EXECUTE FUNCTION public.magazzino_sync_to_dragon();