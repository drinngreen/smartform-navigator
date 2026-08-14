-- 1. rentri_invii_registri: restrict SELECT
DROP POLICY IF EXISTS "Authenticated can read register submissions" ON public.rentri_invii_registri;
CREATE POLICY "Owner tenant or admin can read register submissions"
ON public.rentri_invii_registri FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.can_access_tenant(tenant_id) OR public.has_role(auth.uid(), 'admin'::app_role));

-- 2. dragon_warehouses: tenant isolation
DROP POLICY IF EXISTS "Authenticated users can read dragon_warehouses" ON public.dragon_warehouses;
DROP POLICY IF EXISTS "Authenticated users can insert dragon_warehouses" ON public.dragon_warehouses;
DROP POLICY IF EXISTS "Authenticated users can update dragon_warehouses" ON public.dragon_warehouses;
CREATE POLICY "Tenant users can read dragon_warehouses"
ON public.dragon_warehouses FOR SELECT TO authenticated
USING (public.can_access_tenant(company_id));
CREATE POLICY "Tenant users can insert dragon_warehouses"
ON public.dragon_warehouses FOR INSERT TO authenticated
WITH CHECK (public.can_access_tenant(company_id));
CREATE POLICY "Tenant users can update dragon_warehouses"
ON public.dragon_warehouses FOR UPDATE TO authenticated
USING (public.can_access_tenant(company_id))
WITH CHECK (public.can_access_tenant(company_id));

-- 3. app_reset_flags: no direct table read, dedicated function instead
DROP POLICY IF EXISTS "app_reset_flags readable by authenticated" ON public.app_reset_flags;
REVOKE SELECT ON public.app_reset_flags FROM anon, authenticated;
GRANT ALL ON public.app_reset_flags TO service_role;

CREATE OR REPLACE FUNCTION public.get_app_reset_token(p_scope text)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT reset_token FROM public.app_reset_flags WHERE scope = p_scope LIMIT 1;
$$;
REVOKE ALL ON FUNCTION public.get_app_reset_token(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_app_reset_token(text) TO authenticated, service_role;

-- 4. social_invites: lookup only by exact code through a function
DROP POLICY IF EXISTS "Anyone can read invite by code" ON public.social_invites;

CREATE OR REPLACE FUNCTION public.lookup_social_invite(p_code text)
RETURNS TABLE(id uuid, invite_code text, guest_name text, guest_cf text, invited_by uuid, expires_at timestamptz)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT si.id, si.invite_code, si.guest_name, si.guest_cf, si.invited_by, si.expires_at
  FROM public.social_invites si
  WHERE si.invite_code = p_code
    AND si.used_by IS NULL
    AND si.expires_at > now()
  LIMIT 1;
$$;
GRANT EXECUTE ON FUNCTION public.lookup_social_invite(text) TO anon, authenticated, service_role;

-- 5. code-backup storage objects: admin read only
DROP POLICY IF EXISTS "Public read access for code-backup" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can read code-backup" ON storage.objects;
CREATE POLICY "Admins can read code-backup" ON storage.objects
FOR SELECT TO authenticated
USING (bucket_id = 'code-backup' AND (public.has_role(auth.uid(),'admin'::app_role) OR public.is_multy_niyol_admin()));

-- 6. internal SQL helper functions must not be callable from the client
REVOKE ALL ON FUNCTION public.exec_sql_readonly(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.exec_sql_write(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.exec_sql_readonly(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.exec_sql_write(text) TO service_role;