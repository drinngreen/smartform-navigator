CREATE OR REPLACE FUNCTION public.dragon_assert_cernita_integrity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_batch public.dragon_transform_batches%ROWTYPE;
  v_missing_outputs integer;
BEGIN
  SELECT * INTO v_batch
    FROM public.dragon_transform_batches
   WHERE id = NEW.id;

  IF NOT FOUND OR v_batch.status NOT IN ('PENDENTE', 'CONFERMATA') THEN
    RETURN NEW;
  END IF;

  IF v_batch.source_register_movement_id IS NULL OR NOT EXISTS (
    SELECT 1
      FROM public.dragon_register_movements rm
      JOIN public.dragon_stock_movements sm
        ON sm.source_register_movement_id = rm.id
       AND sm.source_transform_batch_id = v_batch.id
       AND sm.company_id = v_batch.company_id
       AND sm.item_id = v_batch.source_item_id
       AND sm.sign = 'MINUS'
       AND sm.warehouse_scope = 'WASTE'
       AND sm.quantity = v_batch.input_quantity
     WHERE rm.id = v_batch.source_register_movement_id
       AND rm.source_transform_batch_id = v_batch.id
       AND rm.company_id = v_batch.company_id
       AND rm.sign = 'MINUS'
       AND rm.quantity = v_batch.input_quantity
  ) THEN
    RAISE EXCEPTION 'Cernita non registrata: manca lo scarico di giacenza completo';
  END IF;

  IF v_batch.status = 'CONFERMATA' THEN
    SELECT count(*) INTO v_missing_outputs
      FROM public.dragon_transform_batch_outputs o
     WHERE o.batch_id = v_batch.id
       AND (
         o.generated_stock_movement_id IS NULL
         OR NOT EXISTS (
           SELECT 1
             FROM public.dragon_stock_movements sm
            WHERE sm.id = o.generated_stock_movement_id
              AND sm.source_transform_batch_id = v_batch.id
              AND sm.company_id = v_batch.company_id
              AND sm.item_id = o.output_item_id
              AND sm.sign = 'PLUS'
              AND sm.quantity = o.output_quantity
         )
       );

    IF NOT EXISTS (SELECT 1 FROM public.dragon_transform_batch_outputs o WHERE o.batch_id = v_batch.id)
       OR v_missing_outputs > 0 THEN
      RAISE EXCEPTION 'Cernita non registrata: output e giacenze non sono completi';
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public.dragon_assert_cernita_integrity() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.dragon_assert_cernita_integrity() TO service_role;