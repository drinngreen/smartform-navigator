
-- Need to reference pgcrypto from extensions schema
CREATE OR REPLACE FUNCTION public.verify_impianto_password(p_email text, p_password text)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.impianti_accounts
    WHERE email = lower(p_email)
      AND password_hash = extensions.crypt(p_password, password_hash)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.update_impianto_password(p_account_id uuid, p_new_password text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
BEGIN
  UPDATE public.impianti_accounts
  SET password_hash = extensions.crypt(p_new_password, extensions.gen_salt('bf')),
      updated_at = now()
  WHERE id = p_account_id;
END;
$$;
