CREATE OR REPLACE FUNCTION public.fir_forms_lock_numero_fir()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE'
     AND coalesce(current_setting('app.allow_fir_renumber', true), '') <> 'on'
     AND OLD.numero_fir IS NOT NULL
     AND btrim(OLD.numero_fir) <> ''
     AND public.is_valid_fir_number(OLD.numero_fir)
     AND NEW.numero_fir IS DISTINCT FROM OLD.numero_fir THEN
    RAISE EXCEPTION 'Numero FIR immutabile: % non può diventare %', OLD.numero_fir, NEW.numero_fir
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_set_fir_number(p_form_id uuid, p_numero_fir text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_zero uuid := '00000000-0000-0000-0000-000000000000'::uuid;
  v_old text;
  v_new text;
  v_user uuid;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Operazione riservata agli amministratori';
  END IF;

  v_new := upper(regexp_replace(btrim(coalesce(p_numero_fir, '')), '\s+', ' ', 'g'));
  IF v_new = '' THEN
    RAISE EXCEPTION 'Numero FIR non valido';
  END IF;

  SELECT numero_fir, user_id INTO v_old, v_user FROM public.fir_forms WHERE id = p_form_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Bozza non trovata';
  END IF;

  -- archivia altre bozze (anche di dipendenti) che occupano il numero
  UPDATE public.fir_forms
     SET deleted_by_user = true, updated_at = now()
   WHERE id <> p_form_id
     AND upper(regexp_replace(btrim(coalesce(numero_fir, '')), '\s+', ' ', 'g')) = v_new
     AND coalesce(deleted_by_user, false) = false;

  PERFORM set_config('app.allow_fir_renumber', 'on', true);
  UPDATE public.fir_forms SET numero_fir = v_new, updated_at = now() WHERE id = p_form_id;
  PERFORM set_config('app.allow_fir_renumber', 'off', true);

  -- libera il vecchio numero
  IF v_old IS NOT NULL AND btrim(v_old) <> '' AND v_old <> v_new THEN
    UPDATE public.fir_number_pool
       SET status = 'available', user_id = v_zero, assigned_at = NULL
     WHERE fir_number = v_old;
  END IF;

  -- riserva il nuovo numero alla bozza
  UPDATE public.fir_number_pool
     SET status = 'reserved', user_id = coalesce(v_user, v_zero), assigned_at = now()
   WHERE fir_number = v_new;

  RETURN v_new;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_set_fir_number(uuid, text) TO authenticated;