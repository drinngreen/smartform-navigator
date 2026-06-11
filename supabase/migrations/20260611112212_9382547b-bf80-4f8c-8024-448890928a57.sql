CREATE OR REPLACE FUNCTION public.ensure_user_has_fir_draft_for_tenant(p_user_id uuid, p_tenant_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_zero uuid := '00000000-0000-0000-0000-000000000000'::uuid;
  v_societa text;
  v_existing_draft uuid;
  v_existing_num text;
  v_fir_number text;
  v_pool_id uuid;
  v_new_draft_id uuid;
BEGIN
  IF p_user_id IS NULL OR p_tenant_id IS NULL THEN
    RETURN NULL;
  END IF;

  IF public.is_multy_niyol_admin() THEN
    IF NOT public.is_allowed_multy_niyol_tenant(p_tenant_id) THEN
      RAISE EXCEPTION 'Tenant non autorizzato';
    END IF;
  ELSE
    IF auth.uid() IS DISTINCT FROM p_user_id OR p_tenant_id IS DISTINCT FROM public.get_user_tenant(auth.uid()) THEN
      RAISE EXCEPTION 'Non autorizzato';
    END IF;
  END IF;

  v_societa := public.map_tenant_to_societa(p_tenant_id);

  SELECT ff.id, ff.numero_fir INTO v_existing_draft, v_existing_num
  FROM public.fir_forms ff
  WHERE ff.user_id = p_user_id
    AND ff.tenant_id = p_tenant_id
    AND ff.status = 'bozza'
    AND COALESCE(ff.deleted_by_user, false) = false
  ORDER BY ff.updated_at DESC NULLS LAST, ff.created_at DESC
  LIMIT 1;

  IF v_existing_draft IS NOT NULL AND public.is_valid_fir_number(v_existing_num) THEN
    RETURN v_existing_draft;
  END IF;

  SELECT f.id, f.fir_number INTO v_pool_id, v_fir_number
  FROM public.fir_number_pool f
  WHERE f.user_id = p_user_id
    AND f.status = 'available'
    AND f.societa_id = v_societa
    AND f.suspended = false
    AND public.is_valid_fir_number(f.fir_number)
    AND NOT EXISTS (
      SELECT 1
      FROM public.fir_forms ff
      WHERE ff.numero_fir = f.fir_number
        AND COALESCE(ff.deleted_by_user, false) = false
    )
  ORDER BY f.assigned_at DESC NULLS LAST, f.created_at DESC
  LIMIT 1
  FOR UPDATE SKIP LOCKED;

  IF v_pool_id IS NULL THEN
    SELECT f.id, f.fir_number INTO v_pool_id, v_fir_number
    FROM public.fir_number_pool f
    WHERE f.status = 'available'
      AND f.societa_id = v_societa
      AND f.user_id = v_zero
      AND f.suspended = false
      AND public.is_valid_fir_number(f.fir_number)
      AND NOT EXISTS (
        SELECT 1
        FROM public.fir_forms ff
        WHERE ff.numero_fir = f.fir_number
          AND COALESCE(ff.deleted_by_user, false) = false
      )
    ORDER BY f.created_at ASC, f.id ASC
    LIMIT 1
    FOR UPDATE SKIP LOCKED;

    IF v_pool_id IS NOT NULL THEN
      UPDATE public.fir_number_pool
      SET user_id = p_user_id,
          assigned_at = now(),
          assigned_by = auth.uid()
      WHERE id = v_pool_id;
    END IF;
  END IF;

  IF v_pool_id IS NULL THEN
    PERFORM public.notify_fir_pool_empty(p_tenant_id, v_societa, p_user_id);
    RETURN NULL;
  END IF;

  IF v_existing_draft IS NOT NULL THEN
    UPDATE public.fir_forms
    SET numero_fir = v_fir_number,
        tenant_id = p_tenant_id,
        updated_at = now()
    WHERE id = v_existing_draft
    RETURNING id INTO v_new_draft_id;
  ELSE
    INSERT INTO public.fir_forms (user_id, tenant_id, status, numero_fir, form_data, allegati, deleted_by_user)
    VALUES (p_user_id, p_tenant_id, 'bozza', v_fir_number, '{}'::jsonb, '[]'::jsonb, false)
    RETURNING id INTO v_new_draft_id;
  END IF;

  UPDATE public.fir_number_pool
  SET status = 'reserved',
      reserved_by_fir_id = v_new_draft_id
  WHERE id = v_pool_id;

  RETURN v_new_draft_id;
END;
$$;