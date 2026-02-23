
-- Update auto_distribute to work per-tenant (global, multy, niyol)
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
BEGIN
  -- Map each tenant to its societa_id in fir_number_pool
  FOR v_tenant_id, v_societa IN
    SELECT t.id, 
      CASE 
        WHEN t.id = '167d07ad-9184-484e-85a6-da5ceafa42a3' THEN 'global'
        WHEN t.id = '77ec9a3d-a6d4-4235-8e68-1a6f345de57a' THEN 'multyproget'
        WHEN t.id = '819c783e-4ecf-4774-85b7-7e7a1c5848fa' THEN 'niyol'
      END
    FROM tenants t
    WHERE t.id IN (
      '167d07ad-9184-484e-85a6-da5ceafa42a3',
      '77ec9a3d-a6d4-4235-8e68-1a6f345de57a',
      '819c783e-4ecf-4774-85b7-7e7a1c5848fa'
    )
  LOOP
    FOR v_user_id IN
      SELECT p.user_id FROM profiles p
      WHERE p.tenant_id = v_tenant_id
      AND NOT EXISTS (
        SELECT 1 FROM fir_number_pool f 
        WHERE f.user_id = p.user_id AND f.status = 'available' AND f.societa_id = v_societa
      )
    LOOP
      SELECT id INTO v_fir_id FROM fir_number_pool
      WHERE status = 'available' AND societa_id = v_societa 
        AND user_id = '00000000-0000-0000-0000-000000000000'
        AND suspended = false
      LIMIT 1 FOR UPDATE SKIP LOCKED;

      IF v_fir_id IS NOT NULL THEN
        UPDATE fir_number_pool SET user_id = v_user_id, assigned_at = now() WHERE id = v_fir_id;
        v_count := v_count + 1;
      END IF;
    END LOOP;
  END LOOP;

  RETURN v_count;
END;
$function$;

-- Update auto_assign_after_consume to be tenant-aware
CREATE OR REPLACE FUNCTION public.auto_assign_after_consume(p_user_id uuid)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_fir_id uuid;
  v_fir_number text;
  v_remaining integer;
  v_societa text;
  v_tenant_id uuid;
BEGIN
  -- Determine which tenant/societa this user belongs to
  SELECT tenant_id INTO v_tenant_id FROM profiles WHERE user_id = p_user_id;
  
  v_societa := CASE 
    WHEN v_tenant_id = '167d07ad-9184-484e-85a6-da5ceafa42a3' THEN 'global'
    WHEN v_tenant_id = '77ec9a3d-a6d4-4235-8e68-1a6f345de57a' THEN 'multyproget'
    WHEN v_tenant_id = '819c783e-4ecf-4774-85b7-7e7a1c5848fa' THEN 'niyol'
    ELSE 'global'
  END;

  -- Pick one available number from the correct pool
  SELECT id, fir_number INTO v_fir_id, v_fir_number
  FROM fir_number_pool
  WHERE status = 'available' 
    AND societa_id = v_societa
    AND user_id != p_user_id
    AND suspended = false
  LIMIT 1
  FOR UPDATE SKIP LOCKED;

  IF v_fir_id IS NOT NULL THEN
    UPDATE fir_number_pool
    SET user_id = p_user_id, assigned_at = now()
    WHERE id = v_fir_id;
  END IF;

  -- Count remaining available numbers for this tenant's pool
  SELECT count(*) INTO v_remaining
  FROM fir_number_pool
  WHERE status = 'available' AND societa_id = v_societa AND suspended = false;

  RETURN COALESCE(v_fir_number, '') || '|' || v_remaining::text;
END;
$function$;
