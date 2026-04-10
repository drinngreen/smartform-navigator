
-- New RPC: create an EXTRA FIR draft for a user (beyond the automatic baseline)
CREATE OR REPLACE FUNCTION public.create_extra_fir_draft(p_user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_zero uuid := '00000000-0000-0000-0000-000000000000'::uuid;
  v_tenant_id uuid;
  v_societa text;
  v_pool_id uuid;
  v_fir_number text;
  v_new_draft_id uuid;
BEGIN
  IF p_user_id IS NULL THEN RETURN NULL; END IF;

  SELECT p.tenant_id INTO v_tenant_id
  FROM public.profiles p WHERE p.user_id = p_user_id;
  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Utente senza tenant_id';
  END IF;

  v_societa := public.map_tenant_to_societa(v_tenant_id);

  -- First try user's own available numbers
  SELECT f.id, f.fir_number INTO v_pool_id, v_fir_number
  FROM public.fir_number_pool f
  WHERE f.user_id = p_user_id
    AND f.status = 'available'
    AND f.societa_id = v_societa
    AND f.suspended = false
    AND public.is_valid_fir_number(f.fir_number)
    AND NOT EXISTS (
      SELECT 1 FROM public.fir_forms ff
      WHERE ff.numero_fir = f.fir_number
        AND coalesce(ff.deleted_by_user, false) = false
    )
  ORDER BY f.assigned_at DESC NULLS LAST, f.created_at DESC
  LIMIT 1
  FOR UPDATE SKIP LOCKED;

  -- Fallback to shared pool
  IF v_pool_id IS NULL THEN
    SELECT f.id, f.fir_number INTO v_pool_id, v_fir_number
    FROM public.fir_number_pool f
    WHERE f.status = 'available'
      AND f.societa_id = v_societa
      AND f.user_id = v_zero
      AND f.suspended = false
      AND public.is_valid_fir_number(f.fir_number)
      AND NOT EXISTS (
        SELECT 1 FROM public.fir_forms ff
        WHERE ff.numero_fir = f.fir_number
          AND coalesce(ff.deleted_by_user, false) = false
      )
    ORDER BY f.created_at ASC, f.id ASC
    LIMIT 1
    FOR UPDATE SKIP LOCKED;

    IF v_pool_id IS NOT NULL THEN
      UPDATE public.fir_number_pool
      SET user_id = p_user_id, assigned_at = now()
      WHERE id = v_pool_id;
    END IF;
  END IF;

  IF v_pool_id IS NULL THEN
    RAISE EXCEPTION 'Nessun numero FIR disponibile nel serbatoio';
  END IF;

  -- Create new draft
  INSERT INTO public.fir_forms (user_id, tenant_id, status, numero_fir, form_data, allegati, deleted_by_user)
  VALUES (p_user_id, v_tenant_id, 'bozza', v_fir_number, '{}'::jsonb, '[]'::jsonb, false)
  RETURNING id INTO v_new_draft_id;

  -- Reserve the pool number
  UPDATE public.fir_number_pool
  SET status = 'reserved',
      reserved_by_fir_id = v_new_draft_id
  WHERE id = v_pool_id;

  RETURN v_new_draft_id;
END;
$$;
