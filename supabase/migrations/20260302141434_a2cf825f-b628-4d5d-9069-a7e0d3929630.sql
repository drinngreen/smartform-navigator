-- FIR pool mapping helper (tenant -> societa_id)
CREATE OR REPLACE FUNCTION public.map_tenant_to_societa(p_tenant_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN p_tenant_id = '167d07ad-9184-484e-85a6-da5ceafa42a3'::uuid THEN 'global'
    WHEN p_tenant_id = '77ec9a3d-a6d4-4235-8e68-1a6f345de57a'::uuid THEN 'multy'
    WHEN p_tenant_id = '819c783e-4ecf-4774-85b7-7e7a1c5848fa'::uuid THEN 'niyol'
    ELSE 'global'
  END;
$$;

-- Assign one real FIR to users missing one, per tenant pool.
CREATE OR REPLACE FUNCTION public.auto_distribute_fir_numbers()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
      '77ec9a3d-a6d4-4235-8e68-1a6f345de57a'::uuid,
      '819c783e-4ecf-4774-85b7-7e7a1c5848fa'::uuid
    )
  LOOP
    v_societa := public.map_tenant_to_societa(v_tenant_id);

    -- Reclaim extras: keep max 1 available FIR per user in same pool.
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
$$;

-- Trigger path: on profile creation assign one real FIR (no fake generation).
CREATE OR REPLACE FUNCTION public.generate_fir_numbers_for_user(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id uuid;
  v_societa text;
  v_fir_id uuid;
  v_zero uuid := '00000000-0000-0000-0000-000000000000'::uuid;
BEGIN
  SELECT p.tenant_id
  INTO v_tenant_id
  FROM public.profiles p
  WHERE p.user_id = p_user_id;

  IF v_tenant_id IS NULL THEN
    RETURN;
  END IF;

  v_societa := public.map_tenant_to_societa(v_tenant_id);

  IF EXISTS (
    SELECT 1
    FROM public.fir_number_pool f
    WHERE f.user_id = p_user_id
      AND f.status = 'available'
      AND f.societa_id = v_societa
      AND f.suspended = false
  ) THEN
    RETURN;
  END IF;

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
    SET user_id = p_user_id,
        assigned_at = now()
    WHERE id = v_fir_id;
  ELSE
    PERFORM public.notify_fir_pool_empty(v_tenant_id, v_societa, p_user_id);
  END IF;
END;
$$;

-- Post-consume auto-assign: NEVER steal FIR assigned to another user.
CREATE OR REPLACE FUNCTION public.auto_assign_after_consume(p_user_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_fir_id uuid;
  v_fir_number text := '';
  v_remaining integer := 0;
  v_societa text;
  v_tenant_id uuid;
  v_zero uuid := '00000000-0000-0000-0000-000000000000'::uuid;
BEGIN
  SELECT p.tenant_id
  INTO v_tenant_id
  FROM public.profiles p
  WHERE p.user_id = p_user_id;

  IF v_tenant_id IS NULL THEN
    RETURN '|' || v_remaining::text;
  END IF;

  v_societa := public.map_tenant_to_societa(v_tenant_id);

  -- If user already has at least one available FIR, don't assign another one.
  IF EXISTS (
    SELECT 1
    FROM public.fir_number_pool f
    WHERE f.user_id = p_user_id
      AND f.status = 'available'
      AND f.societa_id = v_societa
      AND f.suspended = false
  ) THEN
    SELECT count(*)
    INTO v_remaining
    FROM public.fir_number_pool f
    WHERE f.status = 'available'
      AND f.societa_id = v_societa
      AND f.user_id = v_zero
      AND f.suspended = false;

    RETURN '|' || v_remaining::text;
  END IF;

  -- Assign ONLY from unassigned stock (zero user), never from another user.
  SELECT f.id, f.fir_number
  INTO v_fir_id, v_fir_number
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
    SET user_id = p_user_id,
        assigned_at = now()
    WHERE id = v_fir_id;
  END IF;

  SELECT count(*)
  INTO v_remaining
  FROM public.fir_number_pool f
  WHERE f.status = 'available'
    AND f.societa_id = v_societa
    AND f.user_id = v_zero
    AND f.suspended = false;

  IF v_remaining = 0 THEN
    PERFORM public.notify_fir_pool_empty(v_tenant_id, v_societa, p_user_id);
  END IF;

  RETURN coalesce(v_fir_number, '') || '|' || v_remaining::text;
END;
$$;

-- Backfill now: guarantee at least 1 available FIR for each operational user.
SELECT public.auto_distribute_fir_numbers();