
-- FIX: consume_fir_number più robusto (senza LIMIT in UPDATE)
CREATE OR REPLACE FUNCTION public.consume_fir_number(p_fir_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_updated INTEGER;
  v_numero_fir TEXT;
  v_pool_id UUID;
BEGIN
  -- Primo tentativo: consumo standard via reserved_by_fir_id
  UPDATE public.fir_number_pool
  SET status = 'consumed',
      consumed_at = now()
  WHERE reserved_by_fir_id = p_fir_id
    AND status = 'reserved';
  
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  
  -- Se non trovato (numero mai riservato correttamente), cerca via fir_number nella bozza
  IF v_updated = 0 THEN
    SELECT ff.numero_fir INTO v_numero_fir
    FROM public.fir_forms ff
    WHERE ff.id = p_fir_id;
    
    IF v_numero_fir IS NOT NULL THEN
      -- Trova il pool entry corrispondente (uno solo)
      SELECT fp.id INTO v_pool_id
      FROM public.fir_number_pool fp
      WHERE fp.fir_number = v_numero_fir
        AND fp.status IN ('available', 'reserved')
      ORDER BY fp.created_at ASC
      LIMIT 1;
      
      IF v_pool_id IS NOT NULL THEN
        UPDATE public.fir_number_pool
        SET status = 'consumed',
            consumed_at = now(),
            reserved_by_fir_id = p_fir_id
        WHERE id = v_pool_id;
      END IF;
    END IF;
  END IF;
END;
$function$;

-- BACKFIX: Riserva tutti i numeri FIR che sono in bozze attive ma ancora 'available' nel pool
UPDATE public.fir_number_pool fp
SET status = 'reserved',
    reserved_by_fir_id = ff.id
FROM public.fir_forms ff
WHERE ff.numero_fir = fp.fir_number
  AND ff.status = 'bozza'
  AND coalesce(ff.deleted_by_user, false) = false
  AND fp.status = 'available'
  AND fp.user_id = ff.user_id;
