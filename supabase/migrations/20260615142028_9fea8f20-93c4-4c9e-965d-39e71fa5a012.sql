DROP TRIGGER IF EXISTS on_profile_created_assign_fir_numbers ON public.profiles;
DROP TRIGGER IF EXISTS trg_ensure_fir_draft_on_pool_change ON public.fir_number_pool;

CREATE OR REPLACE FUNCTION public.create_manual_fir_draft_for_tenant(
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
  IF NOT public.is_valid_fir_number(v_numero_fir) THEN
    v_compact := upper(regexp_replace(btrim(p_numero_fir), '[^A-Z0-9]', '', 'g'));
    IF v_compact ~ '^[A-Z]{5}[0-9]{6}[A-Z]{2}$' THEN
      v_numero_fir := substring(v_compact from 1 for 5) || ' ' || substring(v_compact from 6 for 6) || ' ' || substring(v_compact from 12 for 2);
    END IF;
  END IF;

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

  INSERT INTO public.fir_forms (user_id, tenant_id, status, numero_fir, form_data, allegati, deleted_by_user)
  VALUES (p_user_id, p_tenant_id, 'bozza', v_numero_fir, '{}'::jsonb, '[]'::jsonb, false)
  RETURNING id INTO v_new_draft_id;

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
$$;

GRANT EXECUTE ON FUNCTION public.create_manual_fir_draft_for_tenant(uuid, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_manual_fir_draft_for_tenant(uuid, uuid, text) TO service_role;

CREATE OR REPLACE FUNCTION public.ensure_fir_draft_by_number_for_tenant(p_user_id uuid, p_tenant_id uuid, p_numero_fir text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN public.create_manual_fir_draft_for_tenant(p_user_id, p_tenant_id, p_numero_fir);
END;
$$;

GRANT EXECUTE ON FUNCTION public.ensure_fir_draft_by_number_for_tenant(uuid, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ensure_fir_draft_by_number_for_tenant(uuid, uuid, text) TO service_role;

CREATE OR REPLACE FUNCTION public.ensure_user_has_fir_draft(p_user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_existing_draft uuid;
BEGIN
  SELECT ff.id INTO v_existing_draft
  FROM public.fir_forms ff
  WHERE ff.user_id = p_user_id
    AND ff.status = 'bozza'
    AND COALESCE(ff.deleted_by_user, false) = false
  ORDER BY ff.updated_at DESC NULLS LAST, ff.created_at DESC
  LIMIT 1;
  RETURN v_existing_draft;
END;
$$;

CREATE OR REPLACE FUNCTION public.ensure_user_has_fir_draft_for_tenant(p_user_id uuid, p_tenant_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_existing_draft uuid;
BEGIN
  IF p_user_id IS NULL OR p_tenant_id IS NULL THEN RETURN NULL; END IF;

  SELECT ff.id INTO v_existing_draft
  FROM public.fir_forms ff
  WHERE ff.user_id = p_user_id
    AND ff.tenant_id = p_tenant_id
    AND ff.status = 'bozza'
    AND COALESCE(ff.deleted_by_user, false) = false
  ORDER BY ff.updated_at DESC NULLS LAST, ff.created_at DESC
  LIMIT 1;
  RETURN v_existing_draft;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_extra_fir_draft(p_user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.auto_assign_after_consume(p_user_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN '|0';
END;
$$;

CREATE OR REPLACE FUNCTION public.auto_distribute_fir_numbers()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN 0;
END;
$$;

CREATE OR REPLACE FUNCTION public.auto_distribute_baseline_fir(p_societa text DEFAULT 'multy'::text)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN 0;
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_fir_numbers_for_user(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN;
END;
$$;

CREATE OR REPLACE FUNCTION public.trigger_assign_fir_numbers()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.ensure_fir_draft_on_pool_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN NEW;
END;
$$;