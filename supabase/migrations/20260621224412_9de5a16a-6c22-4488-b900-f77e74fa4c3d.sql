CREATE OR REPLACE FUNCTION public.create_manual_fir_draft_for_tenant(p_user_id uuid, p_tenant_id uuid, p_numero_fir text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_numero_fir text;
  v_compact text;
  v_existing_draft uuid;
  v_existing_user uuid;
  v_new_draft_id uuid;
BEGIN
  IF p_user_id IS NULL OR p_tenant_id IS NULL OR p_numero_fir IS NULL OR btrim(p_numero_fir) = '' THEN
    RAISE EXCEPTION 'Numero FIR obbligatorio per la creazione manuale'
      USING ERRCODE = '23514';
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
  v_compact := upper(regexp_replace(v_numero_fir, '[^A-Z0-9]', '', 'g'));

  -- Se il numero è un RENTRI compatto valido, lo formatta; altrimenti conserva esattamente il manuale.
  IF NOT public.is_valid_fir_number(v_numero_fir) AND v_compact ~ '^[A-Z]{5}[0-9]{6}[A-Z]{2}$' THEN
    v_numero_fir := substring(v_compact from 1 for 5) || ' ' || substring(v_compact from 6 for 6) || ' ' || substring(v_compact from 12 for 2);
  END IF;

  SELECT ff.id, ff.user_id INTO v_existing_draft, v_existing_user
  FROM public.fir_forms ff
  WHERE ff.tenant_id = p_tenant_id
    AND upper(regexp_replace(btrim(coalesce(ff.numero_fir, '')), '\s+', ' ', 'g')) = v_numero_fir
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

  INSERT INTO public.fir_forms (user_id, tenant_id, status, numero_fir, form_data, allegati, deleted_by_user)
  VALUES (p_user_id, p_tenant_id, 'bozza', v_numero_fir, jsonb_build_object('numero_fir', v_numero_fir, 'numero_formulario', v_numero_fir), '[]'::jsonb, false)
  RETURNING id INTO v_new_draft_id;

  -- Collega il serbatoio solo se quel numero esiste già nel pool; i numeri manuali fuori pool restano comunque formulari compilabili.
  UPDATE public.fir_number_pool fp
  SET status = CASE WHEN fp.status = 'available' THEN 'reserved' ELSE fp.status END,
      user_id = p_user_id,
      assigned_at = COALESCE(fp.assigned_at, now()),
      assigned_by = auth.uid(),
      reserved_by_fir_id = COALESCE(fp.reserved_by_fir_id, v_new_draft_id)
  WHERE fp.fir_number = v_numero_fir
    AND fp.suspended = false
    AND (fp.user_id = p_user_id OR fp.user_id = '00000000-0000-0000-0000-000000000000'::uuid)
    AND fp.status IN ('available', 'reserved')
    AND (fp.reserved_by_fir_id IS NULL OR fp.reserved_by_fir_id = v_new_draft_id);

  RETURN v_new_draft_id;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.create_manual_fir_draft_for_tenant(uuid, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_manual_fir_draft_for_tenant(uuid, uuid, text) TO service_role;

CREATE OR REPLACE FUNCTION public.ensure_fir_draft_by_number_for_tenant(p_user_id uuid, p_tenant_id uuid, p_numero_fir text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN public.create_manual_fir_draft_for_tenant(p_user_id, p_tenant_id, p_numero_fir);
END;
$function$;

GRANT EXECUTE ON FUNCTION public.ensure_fir_draft_by_number_for_tenant(uuid, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ensure_fir_draft_by_number_for_tenant(uuid, uuid, text) TO service_role;