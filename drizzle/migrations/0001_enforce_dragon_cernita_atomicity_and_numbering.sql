CREATE UNIQUE INDEX IF NOT EXISTS uq_dragon_register_movement_number
ON public.dragon_register_movements (company_id, register_id, movement_number)
WHERE movement_number IS NOT NULL AND deleted_at IS NULL;

CREATE OR REPLACE FUNCTION public.dragon_next_movement_number(p_company_id uuid, p_register_id uuid)
RETURNS integer
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_next integer;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended(p_company_id::text || ':' || p_register_id::text || ':movement-number', 0));
  SELECT COALESCE(MAX(movement_number), 0) + 1
    INTO v_next
    FROM public.dragon_register_movements
   WHERE company_id = p_company_id
     AND register_id = p_register_id
     AND deleted_at IS NULL;
  RETURN v_next;
END;
$function$;

REVOKE ALL ON FUNCTION public.dragon_next_movement_number(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.dragon_next_movement_number(uuid, uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.dragon_assert_cernita_integrity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_missing_outputs integer;
BEGIN
  IF NEW.status NOT IN ('PENDENTE', 'CONFERMATA') THEN
    RETURN NEW;
  END IF;

  IF NEW.source_register_movement_id IS NULL OR NOT EXISTS (
    SELECT 1
      FROM public.dragon_register_movements rm
      JOIN public.dragon_stock_movements sm
        ON sm.source_register_movement_id = rm.id
       AND sm.source_transform_batch_id = NEW.id
       AND sm.company_id = NEW.company_id
       AND sm.item_id = NEW.source_item_id
       AND sm.sign = 'MINUS'
       AND sm.warehouse_scope = 'WASTE'
       AND sm.quantity = NEW.input_quantity
     WHERE rm.id = NEW.source_register_movement_id
       AND rm.source_transform_batch_id = NEW.id
       AND rm.company_id = NEW.company_id
       AND rm.sign = 'MINUS'
       AND rm.quantity = NEW.input_quantity
  ) THEN
    RAISE EXCEPTION 'Cernita non registrata: manca lo scarico di giacenza completo';
  END IF;

  IF NEW.status = 'CONFERMATA' THEN
    SELECT count(*) INTO v_missing_outputs
      FROM public.dragon_transform_batch_outputs o
     WHERE o.batch_id = NEW.id
       AND (
         o.generated_stock_movement_id IS NULL
         OR NOT EXISTS (
           SELECT 1
             FROM public.dragon_stock_movements sm
            WHERE sm.id = o.generated_stock_movement_id
              AND sm.source_transform_batch_id = NEW.id
              AND sm.company_id = NEW.company_id
              AND sm.item_id = o.output_item_id
              AND sm.sign = 'PLUS'
              AND sm.quantity = o.output_quantity
         )
       );

    IF NOT EXISTS (SELECT 1 FROM public.dragon_transform_batch_outputs o WHERE o.batch_id = NEW.id)
       OR v_missing_outputs > 0 THEN
      RAISE EXCEPTION 'Cernita non registrata: output e giacenze non sono completi';
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public.dragon_assert_cernita_integrity() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.dragon_assert_cernita_integrity() TO service_role;

CREATE CONSTRAINT TRIGGER trg_dragon_assert_cernita_integrity
AFTER INSERT OR UPDATE OF status, source_register_movement_id ON public.dragon_transform_batches
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION public.dragon_assert_cernita_integrity();