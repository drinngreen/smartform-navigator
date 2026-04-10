CREATE OR REPLACE FUNCTION public.auto_distribute_fir_numbers()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid;
  v_fir_id uuid;
  v_count integer := 0;
  v_tenant_id uuid;
  v_societa text;
  v_zero uuid := '00000000-0000-0000-0000-000000000000'::uuid;
BEGIN
  FOR v_tenant_id IN
    SELECT t.id
    FROM public.tenants t
    WHERE t.id IN (
      '167d07ad-9184-484e-85a6-da5ceafa42a3'::uuid,
      '77ec9a3d-602e-438f-97bf-1c69abd8f691'::uuid,
      '819c783e-78dd-4080-8265-802e75b0d813'::uuid
    )
  LOOP
    v_societa := public.map_tenant_to_societa(v_tenant_id);

    WITH ranked AS (
      SELECT f.id,
             row_number() OVER (
               PARTITION BY f.user_id
               ORDER BY f.assigned_at DESC NULLS LAST, f.created_at DESC, f.id
             ) AS rn
      FROM public.fir_number_pool f
      WHERE f.societa_id = v_societa
        AND f.status = 'available'
        AND f.user_id <> v_zero
    )
    UPDATE public.fir_number_pool f
    SET user_id = v_zero,
        assigned_at = NULL
    FROM ranked r
    WHERE f.id = r.id
      AND r.rn > 1;

    FOR v_user_id IN
      SELECT p.user_id
      FROM public.profiles p
      WHERE p.tenant_id = v_tenant_id
        AND coalesce(p.is_social_only, false) = false
        AND NOT EXISTS (
          SELECT 1
          FROM public.fir_number_pool f
          WHERE f.user_id = p.user_id
            AND f.status = 'available'
            AND f.societa_id = v_societa
            AND f.suspended = false
        )
    LOOP
      SELECT f.id
      INTO v_fir_id
      FROM public.fir_number_pool f
      WHERE f.status = 'available'
        AND f.societa_id = v_societa
        AND f.user_id = v_zero
        AND f.suspended = false
      ORDER BY f.created_at ASC, f.id ASC
      LIMIT 1
      FOR UPDATE SKIP LOCKED;

      IF v_fir_id IS NOT NULL THEN
        UPDATE public.fir_number_pool
        SET user_id = v_user_id,
            assigned_at = now()
        WHERE id = v_fir_id;

        v_count := v_count + 1;
      END IF;
    END LOOP;
  END LOOP;

  RETURN v_count;
END;
$function$;