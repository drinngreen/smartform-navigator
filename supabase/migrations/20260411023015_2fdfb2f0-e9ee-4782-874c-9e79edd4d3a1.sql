-- Function to auto-distribute baseline FIR drafts to all Multyproget transporters
CREATE OR REPLACE FUNCTION public.auto_distribute_baseline_fir(p_societa text DEFAULT 'multy')
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_tenant_id uuid;
  v_user record;
  v_count int := 0;
  v_draft_id uuid;
BEGIN
  -- Resolve tenant from societa
  IF p_societa = 'multy' THEN
    v_tenant_id := '77ec9a3d-602e-438f-97bf-1c69abd8f691'::uuid;
  ELSIF p_societa = 'niyol' THEN
    v_tenant_id := '819c783e-78dd-4080-8265-802e75b0d813'::uuid;
  ELSE
    v_tenant_id := '167d07ad-9184-484e-85a6-da5ceafa42a3'::uuid;
  END IF;

  -- Loop through all users who have pool numbers for this societa
  FOR v_user IN
    SELECT DISTINCT fnp.user_id
    FROM public.fir_number_pool fnp
    WHERE fnp.societa_id = p_societa
      AND fnp.user_id != '00000000-0000-0000-0000-000000000000'::uuid
      AND fnp.status = 'available'
      AND fnp.suspended = false
    UNION
    SELECT DISTINCT p.user_id
    FROM public.profiles p
    WHERE p.tenant_id = v_tenant_id
      AND p.mn_context = 'multyproget'
      AND p.role = 'user'
  LOOP
    -- Check if user already has an active draft
    IF NOT EXISTS (
      SELECT 1 FROM public.fir_forms ff
      WHERE ff.user_id = v_user.user_id
        AND ff.status = 'bozza'
        AND coalesce(ff.deleted_by_user, false) = false
        AND ff.tenant_id = v_tenant_id
    ) THEN
      -- Call ensure_user_has_fir_draft to create baseline
      v_draft_id := public.ensure_user_has_fir_draft(v_user.user_id);
      IF v_draft_id IS NOT NULL THEN
        v_count := v_count + 1;
      END IF;
    END IF;
  END LOOP;

  RETURN v_count;
END;
$$;