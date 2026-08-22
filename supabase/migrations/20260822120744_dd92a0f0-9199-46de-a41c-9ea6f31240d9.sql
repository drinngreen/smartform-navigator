CREATE OR REPLACE FUNCTION public.can_read_mp_registry()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT auth.uid() IS NOT NULL AND (
    public.get_user_tenant(auth.uid()) IN (
      '77ec9a3d-602e-438f-97bf-1c69abd8f691'::uuid,
      '819c783e-78dd-4080-8265-802e75b0d813'::uuid,
      '167d07ad-9184-484e-85a6-da5ceafa42a3'::uuid,
      'dc2a6046-d9a8-4549-8e45-82367d695ac6'::uuid
    )
    OR public.has_role(auth.uid(), 'admin'::app_role)
  )
$$;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.anagrafica_aziende_mp TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cliente_unita_locali TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cliente_cantieri TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cliente_targhe TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cliente_conducenti TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cliente_autorizzazioni TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cliente_partner_default TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cliente_documenti TO authenticated;

GRANT ALL ON public.anagrafica_aziende_mp TO service_role;
GRANT ALL ON public.cliente_unita_locali TO service_role;
GRANT ALL ON public.cliente_cantieri TO service_role;
GRANT ALL ON public.cliente_targhe TO service_role;
GRANT ALL ON public.cliente_conducenti TO service_role;
GRANT ALL ON public.cliente_autorizzazioni TO service_role;
GRANT ALL ON public.cliente_partner_default TO service_role;
GRANT ALL ON public.cliente_documenti TO service_role;

DROP POLICY IF EXISTS "registry read anagrafica_aziende_mp" ON public.anagrafica_aziende_mp;
CREATE POLICY "registry read anagrafica_aziende_mp" ON public.anagrafica_aziende_mp
  FOR SELECT TO authenticated USING (public.can_read_mp_registry());

DROP POLICY IF EXISTS "registry read cliente_unita_locali" ON public.cliente_unita_locali;
CREATE POLICY "registry read cliente_unita_locali" ON public.cliente_unita_locali
  FOR SELECT TO authenticated USING (public.can_read_mp_registry());

DROP POLICY IF EXISTS "registry read cliente_cantieri" ON public.cliente_cantieri;
CREATE POLICY "registry read cliente_cantieri" ON public.cliente_cantieri
  FOR SELECT TO authenticated USING (public.can_read_mp_registry());

DROP POLICY IF EXISTS "registry read cliente_targhe" ON public.cliente_targhe;
CREATE POLICY "registry read cliente_targhe" ON public.cliente_targhe
  FOR SELECT TO authenticated USING (public.can_read_mp_registry());

DROP POLICY IF EXISTS "registry read cliente_conducenti" ON public.cliente_conducenti;
CREATE POLICY "registry read cliente_conducenti" ON public.cliente_conducenti
  FOR SELECT TO authenticated USING (public.can_read_mp_registry());

DROP POLICY IF EXISTS "registry read cliente_autorizzazioni" ON public.cliente_autorizzazioni;
CREATE POLICY "registry read cliente_autorizzazioni" ON public.cliente_autorizzazioni
  FOR SELECT TO authenticated USING (public.can_read_mp_registry());

DROP POLICY IF EXISTS "registry read cliente_partner_default" ON public.cliente_partner_default;
CREATE POLICY "registry read cliente_partner_default" ON public.cliente_partner_default
  FOR SELECT TO authenticated USING (public.can_read_mp_registry());

DROP POLICY IF EXISTS "registry read cliente_documenti" ON public.cliente_documenti;
CREATE POLICY "registry read cliente_documenti" ON public.cliente_documenti
  FOR SELECT TO authenticated USING (public.can_read_mp_registry());