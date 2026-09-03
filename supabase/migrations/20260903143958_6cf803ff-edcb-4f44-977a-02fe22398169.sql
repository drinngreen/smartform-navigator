CREATE OR REPLACE FUNCTION public.dragon_reconcile_item_to_magazzino(
  p_company_id uuid,
  p_item_id uuid
)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_cer text;
  v_desc text;
  v_balance numeric := 0;
  v_target_id uuid;
BEGIN
  SELECT public.normalize_cer(codice_cer), descrizione
    INTO v_cer, v_desc
    FROM public.dragon_items
   WHERE id = p_item_id
     AND company_id = p_company_id
     AND item_type = 'WASTE_CER'
     AND test_session IS NULL;

  IF v_cer IS NULL THEN
    RETURN NULL;
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(p_company_id::text || ':' || v_cer, 0));

  SELECT COALESCE(SUM(
    CASE sign WHEN 'PLUS' THEN quantity WHEN 'MINUS' THEN -quantity ELSE 0 END
  ), 0)
    INTO v_balance
    FROM public.dragon_stock_movements
   WHERE company_id = p_company_id
     AND item_id = p_item_id
     AND warehouse_scope = 'WASTE'
     AND test_session IS NULL;

  SELECT id
    INTO v_target_id
    FROM public.magazzino_giacenze
   WHERE tenant_id = p_company_id
     AND public.normalize_cer(cer) = v_cer
   ORDER BY (cer = v_cer) DESC, updated_at DESC NULLS LAST, id
   LIMIT 1
   FOR UPDATE;

  PERFORM set_config('dragon.sync_from_dragon', 'on', true);

  IF v_target_id IS NULL THEN
    INSERT INTO public.magazzino_giacenze
      (tenant_id, cer, descrizione_cer, quantita_kg, stato, updated_at)
    VALUES
      (p_company_id, v_cer, v_desc, v_balance, 'stoccato', now());
  ELSE
    UPDATE public.magazzino_giacenze
       SET cer = v_cer,
           descrizione_cer = COALESCE(NULLIF(descrizione_cer, ''), v_desc),
           quantita_kg = v_balance,
           ultimo_carico_at = CASE WHEN v_balance > quantita_kg THEN now() ELSE ultimo_carico_at END,
           ultimo_scarico_at = CASE WHEN v_balance < quantita_kg THEN now() ELSE ultimo_scarico_at END,
           updated_at = now()
     WHERE id = v_target_id;
  END IF;

  PERFORM set_config('dragon.sync_from_dragon', 'off', true);
  RETURN v_balance;
EXCEPTION WHEN OTHERS THEN
  PERFORM set_config('dragon.sync_from_dragon', 'off', true);
  RAISE;
END;
$function$;

REVOKE ALL ON FUNCTION public.dragon_reconcile_item_to_magazzino(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.dragon_reconcile_item_to_magazzino(uuid, uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.dragon_strict_stock_reconciliation_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.test_session IS NULL
     AND NEW.warehouse_scope = 'WASTE'
     AND COALESCE(current_setting('dragon.sync_from_magazzino', true), '') <> 'on' THEN
    PERFORM public.dragon_reconcile_item_to_magazzino(NEW.company_id, NEW.item_id);
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_dragon_sync_stock_to_magazzino ON public.dragon_stock_movements;
DROP TRIGGER IF EXISTS trg_dragon_strict_stock_reconciliation ON public.dragon_stock_movements;
CREATE TRIGGER trg_dragon_strict_stock_reconciliation
AFTER INSERT ON public.dragon_stock_movements
FOR EACH ROW
EXECUTE FUNCTION public.dragon_strict_stock_reconciliation_trigger();

UPDATE public.dragon_stock_movements sm
   SET source_transform_batch_id = rm.source_transform_batch_id
  FROM public.dragon_register_movements rm
 WHERE sm.source_register_movement_id = rm.id
   AND rm.source_transform_batch_id IS NOT NULL
   AND sm.source_transform_batch_id IS NULL;

DO $function$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT DISTINCT sm.company_id, sm.item_id
      FROM public.dragon_stock_movements sm
     WHERE sm.source_transform_batch_id IS NOT NULL
       AND sm.warehouse_scope = 'WASTE'
       AND sm.test_session IS NULL
  LOOP
    PERFORM public.dragon_reconcile_item_to_magazzino(r.company_id, r.item_id);
  END LOOP;
END;
$function$;