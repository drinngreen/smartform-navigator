
-- app_reset_flags: solo autenticati
DROP POLICY IF EXISTS "app_reset_flags readable by all" ON public.app_reset_flags;
CREATE POLICY "app_reset_flags readable by authenticated" ON public.app_reset_flags
FOR SELECT TO authenticated USING (true);
REVOKE ALL ON public.app_reset_flags FROM anon;

-- appuntamenti_personale: solo autenticati
DROP POLICY IF EXISTS "Anyone can read appuntamenti" ON public.appuntamenti_personale;
DROP POLICY IF EXISTS "Anyone can insert appuntamenti" ON public.appuntamenti_personale;
DROP POLICY IF EXISTS "Anyone can update appuntamenti" ON public.appuntamenti_personale;
CREATE POLICY "appuntamenti read auth" ON public.appuntamenti_personale FOR SELECT TO authenticated USING (true);
CREATE POLICY "appuntamenti insert auth" ON public.appuntamenti_personale FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "appuntamenti update auth" ON public.appuntamenti_personale FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
REVOKE ALL ON public.appuntamenti_personale FROM anon;

-- helper condizione tenant
CREATE OR REPLACE FUNCTION public.can_access_tenant(_tenant uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT auth.uid() IS NOT NULL AND (
    _tenant IS NULL
    OR _tenant = public.get_user_tenant(auth.uid())
    OR public.is_multy_niyol_admin()
    OR public.has_role(auth.uid(), 'admin'::app_role)
  )
$$;
REVOKE EXECUTE ON FUNCTION public.can_access_tenant(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.can_access_tenant(uuid) TO authenticated, service_role;

-- cliente_* : scoping tenant
DROP POLICY IF EXISTS "auth read cliente_autorizzazioni" ON public.cliente_autorizzazioni;
CREATE POLICY "tenant read cliente_autorizzazioni" ON public.cliente_autorizzazioni FOR SELECT TO authenticated USING (public.can_access_tenant(tenant_id));

DROP POLICY IF EXISTS "auth read cliente_cantieri" ON public.cliente_cantieri;
CREATE POLICY "tenant read cliente_cantieri" ON public.cliente_cantieri FOR SELECT TO authenticated USING (public.can_access_tenant(tenant_id));

DROP POLICY IF EXISTS "auth read cliente_targhe" ON public.cliente_targhe;
CREATE POLICY "tenant read cliente_targhe" ON public.cliente_targhe FOR SELECT TO authenticated USING (public.can_access_tenant(tenant_id));

DROP POLICY IF EXISTS "auth manage cliente_conducenti" ON public.cliente_conducenti;
CREATE POLICY "tenant manage cliente_conducenti" ON public.cliente_conducenti FOR ALL TO authenticated USING (public.can_access_tenant(tenant_id)) WITH CHECK (public.can_access_tenant(tenant_id));

DROP POLICY IF EXISTS "auth manage cliente_partner_default" ON public.cliente_partner_default;
CREATE POLICY "tenant manage cliente_partner_default" ON public.cliente_partner_default FOR ALL TO authenticated USING (public.can_access_tenant(tenant_id)) WITH CHECK (public.can_access_tenant(tenant_id));

-- registro_generale
DROP POLICY IF EXISTS "registro_generale_select_all" ON public.registro_generale;
CREATE POLICY "registro_generale_select_tenant" ON public.registro_generale FOR SELECT TO authenticated USING (public.can_access_tenant(tenant_id));
DROP POLICY IF EXISTS "registro_generale_insert_all" ON public.registro_generale;
CREATE POLICY "registro_generale_insert_tenant" ON public.registro_generale FOR INSERT TO authenticated WITH CHECK (public.can_access_tenant(tenant_id));

-- fatture_sibill_sync
DROP POLICY IF EXISTS "Authenticated can read sibill sync" ON public.fatture_sibill_sync;
DROP POLICY IF EXISTS "Authenticated can insert sibill sync" ON public.fatture_sibill_sync;
DROP POLICY IF EXISTS "Authenticated can update sibill sync" ON public.fatture_sibill_sync;
DROP POLICY IF EXISTS "Authenticated can delete sibill sync" ON public.fatture_sibill_sync;
CREATE POLICY "tenant manage sibill sync" ON public.fatture_sibill_sync FOR ALL TO authenticated USING (public.can_access_tenant(tenant_id)) WITH CHECK (public.can_access_tenant(tenant_id));

-- sibill_counterparts
DROP POLICY IF EXISTS "Authenticated can read sibill counterparts" ON public.sibill_counterparts;
DROP POLICY IF EXISTS "Authenticated can insert sibill counterparts" ON public.sibill_counterparts;
DROP POLICY IF EXISTS "Authenticated can update sibill counterparts" ON public.sibill_counterparts;
DROP POLICY IF EXISTS "Authenticated can delete sibill counterparts" ON public.sibill_counterparts;
CREATE POLICY "tenant manage sibill counterparts" ON public.sibill_counterparts FOR ALL TO authenticated USING (public.can_access_tenant(tenant_id)) WITH CHECK (public.can_access_tenant(tenant_id));

-- dragon_warehouses: almeno solo autenticati (già) + niente anon
REVOKE ALL ON public.dragon_warehouses FROM anon;

-- profiles: nega esplicitamente anon
DROP POLICY IF EXISTS "Deny anonymous access to profiles" ON public.profiles;
CREATE POLICY "Deny anonymous access to profiles" ON public.profiles FOR ALL TO anon USING (false) WITH CHECK (false);
REVOKE ALL ON public.profiles FROM anon;
