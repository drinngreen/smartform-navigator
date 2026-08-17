CREATE OR REPLACE FUNCTION public.bootstrap_admin_role()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_email text;
BEGIN
  v_email := lower((auth.jwt() ->> 'email'));

  IF v_email IN (
    'globalreco@zolisoftware.cloud',
    'globalreco@zolisoftware.space',
    'multyproget@zolidragon.cloud',
    'nijol@zolidragon.cloud',
    'admin@zoli.live',
    'direzioneglobalreco@zoli.live',
    'formulariglobalreco@zoli.live',
    'amministrazioneglobalreco@zoli.live',
    'amministrazioneglobal@zoli.live',
    'segreteriaglobalreco@zoli.live',
    'multyniyol@zoli.live',
    'superadmin@zoli.live',
    'superadminglobal@zoli.live'
  ) THEN
    -- Idempotente: nessuna cancellazione, evita contese di lock a ogni login
    IF NOT EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    ) THEN
      INSERT INTO public.user_roles (user_id, role)
      VALUES (auth.uid(), 'admin')
      ON CONFLICT (user_id, role) DO NOTHING;
    END IF;
  END IF;
END;
$function$;