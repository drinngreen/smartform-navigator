-- notifications: no anonymous inserts
DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;
CREATE POLICY "Authenticated can insert notifications"
ON public.notifications FOR INSERT TO authenticated
WITH CHECK (true);
REVOKE INSERT ON public.notifications FROM anon;

-- appuntamenti_personale: scope to tenant
ALTER TABLE public.appuntamenti_personale
  ADD COLUMN IF NOT EXISTS tenant_id uuid;

UPDATE public.appuntamenti_personale SET tenant_id = COALESCE(tenant_id, (SELECT id FROM public.tenants WHERE is_default = true LIMIT 1));

DROP POLICY IF EXISTS "Authenticated can view appuntamenti" ON public.appuntamenti_personale;
DROP POLICY IF EXISTS "Authenticated can insert appuntamenti" ON public.appuntamenti_personale;
DROP POLICY IF EXISTS "Authenticated can update appuntamenti" ON public.appuntamenti_personale;

CREATE POLICY "Tenant users can view appuntamenti"
ON public.appuntamenti_personale FOR SELECT TO authenticated
USING (public.can_access_tenant(tenant_id));
CREATE POLICY "Tenant users can insert appuntamenti"
ON public.appuntamenti_personale FOR INSERT TO authenticated
WITH CHECK (public.can_access_tenant(tenant_id));
CREATE POLICY "Tenant users can update appuntamenti"
ON public.appuntamenti_personale FOR UPDATE TO authenticated
USING (public.can_access_tenant(tenant_id))
WITH CHECK (public.can_access_tenant(tenant_id));