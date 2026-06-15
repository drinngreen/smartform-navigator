CREATE OR REPLACE FUNCTION public.ensure_fir_draft_by_number_for_tenant(
  p_user_id uuid,
  p_tenant_id uuid,
  p_numero_fir text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_zero uuid := '00000000-0000-0000-0000-000000000000'::uuid;
  v_numero_fir text;
  v_societa text;
  v_existing_draft uuid;
  v_existing_user uuid;
  v_pool_id uuid;
  v_new_draft_id uuid;
BEGIN
  IF p_user_id IS NULL OR p_tenant_id IS NULL OR p_numero_fir IS NULL THEN
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

  v_numero_fir := upper(regexp_replace(btrim(p_numero_fir), '\s+', ' ', 'g'));

  IF NOT public.is_valid_fir_number(v_numero_fir) THEN
    RAISE EXCEPTION 'Formato numero FIR non valido: %', v_numero_fir
      USING ERRCODE = '23514';
  END IF;

  SELECT ff.id, ff.user_id INTO v_existing_draft, v_existing_user
  FROM public.fir_forms ff
  WHERE ff.tenant_id = p_tenant_id
    AND ff.numero_fir = v_numero_fir
    AND COALESCE(ff.deleted_by_user, false) = false
  ORDER BY ff.updated_at DESC NULLS LAST, ff.created_at DESC
  LIMIT 1;

  IF v_existing_draft IS NOT NULL THEN
    IF public.is_multy_niyol_admin() OR v_existing_user = p_user_id THEN
      RETURN v_existing_draft;
    END IF;
    RAISE EXCEPTION 'Numero FIR già assegnato ad altro utente: %', v_numero_fir
      USING ERRCODE = '23505';
  END IF;

  v_societa := public.map_tenant_to_societa(p_tenant_id);

  SELECT fp.id INTO v_pool_id
  FROM public.fir_number_pool fp
  WHERE fp.fir_number = v_numero_fir
    AND fp.societa_id = v_societa
    AND fp.status = 'available'
    AND fp.suspended = false
    AND (fp.user_id = p_user_id OR fp.user_id = v_zero)
  ORDER BY (CASE WHEN fp.user_id = p_user_id THEN 0 ELSE 1 END), fp.created_at ASC, fp.id ASC
  LIMIT 1
  FOR UPDATE SKIP LOCKED;

  IF v_pool_id IS NULL THEN
    RAISE EXCEPTION 'Numero FIR non disponibile nel serbatoio: %', v_numero_fir
      USING ERRCODE = '23514';
  END IF;

  INSERT INTO public.fir_forms (user_id, tenant_id, status, numero_fir, form_data, allegati, deleted_by_user)
  VALUES (p_user_id, p_tenant_id, 'bozza', v_numero_fir, '{}'::jsonb, '[]'::jsonb, false)
  RETURNING id INTO v_new_draft_id;

  UPDATE public.fir_number_pool
  SET status = 'reserved',
      user_id = p_user_id,
      assigned_at = COALESCE(assigned_at, now()),
      assigned_by = auth.uid(),
      reserved_by_fir_id = v_new_draft_id
  WHERE id = v_pool_id;

  RETURN v_new_draft_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.ensure_fir_draft_by_number_for_tenant(uuid, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ensure_fir_draft_by_number_for_tenant(uuid, uuid, text) TO service_role;