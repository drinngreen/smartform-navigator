-- Alert function for FIR pool depletion (tenant admins + super admin)
CREATE OR REPLACE FUNCTION public.notify_fir_pool_empty(
  p_tenant_id uuid,
  p_societa_id text,
  p_triggered_by uuid DEFAULT auth.uid()
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer := 0;
  v_title text;
  v_body text;
  v_superadmin_id uuid;
BEGIN
  v_title := 'Pool FIR esaurito - ' || upper(coalesce(p_societa_id, 'tenant'));
  v_body := 'Nessun numero FIR reale disponibile. Richiedere subito nuova vidimazione RENTRI.';

  -- Tenant admins by role mapping
  INSERT INTO public.notifications (user_id, type, title, body, reference_id, reference_type)
  SELECT DISTINCT p.user_id,
         'fir_pool_empty',
         v_title,
         v_body,
         coalesce(p_societa_id, 'unknown'),
         'fir_pool'
  FROM public.profiles p
  JOIN public.user_roles ur ON ur.user_id = p.user_id
  WHERE p.tenant_id = p_tenant_id
    AND ur.role = 'admin'
    AND p.user_id IS NOT NULL
    AND NOT EXISTS (
      SELECT 1
      FROM public.notifications n
      WHERE n.user_id = p.user_id
        AND n.type = 'fir_pool_empty'
        AND n.reference_id = coalesce(p_societa_id, 'unknown')
        AND n.created_at > now() - interval '30 minutes'
    );

  GET DIAGNOSTICS v_count = ROW_COUNT;

  -- Super admin visibility (fixed account)
  SELECT au.id INTO v_superadmin_id
  FROM auth.users au
  WHERE lower(au.email) = 'superadmin@zoli.live'
  LIMIT 1;

  IF v_superadmin_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, type, title, body, reference_id, reference_type)
    SELECT v_superadmin_id,
           'fir_pool_empty',
           v_title,
           v_body || ' (visibilità super admin)',
           coalesce(p_societa_id, 'unknown'),
           'fir_pool'
    WHERE NOT EXISTS (
      SELECT 1
      FROM public.notifications n
      WHERE n.user_id = v_superadmin_id
        AND n.type = 'fir_pool_empty'
        AND n.reference_id = coalesce(p_societa_id, 'unknown')
        AND n.created_at > now() - interval '30 minutes'
    );

    IF FOUND THEN
      v_count := v_count + 1;
    END IF;
  END IF;

  RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.notify_fir_pool_empty(uuid, text, uuid) TO authenticated;