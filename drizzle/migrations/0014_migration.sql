CREATE OR REPLACE FUNCTION public.is_staff_member()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(auth.uid(), 'admin'::app_role)
      OR EXISTS (SELECT 1 FROM public.profiles p
                 WHERE p.user_id = auth.uid() AND p.tenant_id IS NOT NULL
                   AND coalesce(p.is_social_only,false) = false AND p.deactivated_at IS NULL);
$$;
REVOKE EXECUTE ON FUNCTION public.is_staff_member() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.is_staff_member() TO authenticated;

-- online_status
DROP POLICY IF EXISTS "Authenticated users can view online statuses" ON public.online_status;
CREATE POLICY "Staff can view online statuses" ON public.online_status FOR SELECT TO authenticated USING (public.is_staff_member());

-- read-only tables
DROP POLICY IF EXISTS "sibill_docs_cache_read" ON public.sibill_documents_cache;
CREATE POLICY "sibill_docs_cache_read" ON public.sibill_documents_cache FOR SELECT TO authenticated USING (public.is_staff_member());
DROP POLICY IF EXISTS "sibill_scan_state_read" ON public.sibill_scan_state;
CREATE POLICY "sibill_scan_state_read" ON public.sibill_scan_state FOR SELECT TO authenticated USING (public.is_staff_member());
DROP POLICY IF EXISTS "rentri_operazioni_select_auth" ON public.rentri_operazioni;
CREATE POLICY "rentri_operazioni_select_auth" ON public.rentri_operazioni FOR SELECT TO authenticated USING (public.is_staff_member());
DROP POLICY IF EXISTS "rentri_invii_reali_select_auth" ON public.rentri_invii_reali;
CREATE POLICY "rentri_invii_reali_select_auth" ON public.rentri_invii_reali FOR SELECT TO authenticated USING (public.is_staff_member());
DROP POLICY IF EXISTS "applicazioni leggibili agli autenticati" ON public.giacenze_applicazioni;
CREATE POLICY "applicazioni leggibili agli autenticati" ON public.giacenze_applicazioni FOR SELECT TO authenticated USING (public.is_staff_member());
DROP POLICY IF EXISTS "All authenticated can read fir_form_templates" ON public.fir_form_templates;
CREATE POLICY "All authenticated can read fir_form_templates" ON public.fir_form_templates FOR SELECT TO authenticated USING (public.is_staff_member());
DROP POLICY IF EXISTS "dragon_causes_select" ON public.dragon_causes;
CREATE POLICY "dragon_causes_select" ON public.dragon_causes FOR SELECT TO authenticated USING (public.is_staff_member());

-- audit logs
DROP POLICY IF EXISTS "audit log inseribile dal sistema" ON public.giacenze_audit_log;
CREATE POLICY "audit log inseribile dal sistema" ON public.giacenze_audit_log FOR INSERT TO authenticated WITH CHECK (public.is_staff_member());
DROP POLICY IF EXISTS "audit log leggibile agli autenticati" ON public.giacenze_audit_log;
CREATE POLICY "audit log leggibile agli autenticati" ON public.giacenze_audit_log FOR SELECT TO authenticated USING (public.is_staff_member());
DROP POLICY IF EXISTS "dragon_audit_insert" ON public.dragon_audit_logs;
CREATE POLICY "dragon_audit_insert" ON public.dragon_audit_logs FOR INSERT TO authenticated WITH CHECK (public.is_staff_member());
DROP POLICY IF EXISTS "Authenticated can insert notifications" ON public.notifications;
CREATE POLICY "Authenticated can insert notifications" ON public.notifications FOR INSERT TO authenticated WITH CHECK (public.is_staff_member() OR user_id = auth.uid());

-- autorizzazioni
DROP POLICY IF EXISTS "Autenticati aggiornano autorizzazioni" ON public.autorizzazioni_aziendali;
CREATE POLICY "Autenticati aggiornano autorizzazioni" ON public.autorizzazioni_aziendali FOR UPDATE TO authenticated USING (public.is_staff_member()) WITH CHECK (public.is_staff_member());
DROP POLICY IF EXISTS "Autenticati eliminano autorizzazioni" ON public.autorizzazioni_aziendali;
CREATE POLICY "Autenticati eliminano autorizzazioni" ON public.autorizzazioni_aziendali FOR DELETE TO authenticated USING (public.is_staff_member());
DROP POLICY IF EXISTS "Autenticati inseriscono autorizzazioni" ON public.autorizzazioni_aziendali;
CREATE POLICY "Autenticati inseriscono autorizzazioni" ON public.autorizzazioni_aziendali FOR INSERT TO authenticated WITH CHECK (public.is_staff_member());
DROP POLICY IF EXISTS "Autenticati leggono autorizzazioni" ON public.autorizzazioni_aziendali;
CREATE POLICY "Autenticati leggono autorizzazioni" ON public.autorizzazioni_aziendali FOR SELECT TO authenticated USING (public.is_staff_member());

-- appuntamenti: tenant policies already exist, remove the open duplicates
DROP POLICY IF EXISTS "appuntamenti insert auth" ON public.appuntamenti_personale;
DROP POLICY IF EXISTS "appuntamenti read auth" ON public.appuntamenti_personale;
DROP POLICY IF EXISTS "appuntamenti update auth" ON public.appuntamenti_personale;

-- firma sessioni
DROP POLICY IF EXISTS "Utenti autenticati leggono le sessioni di firma" ON public.rentri_firma_sessioni;
CREATE POLICY "Utenti autenticati leggono le sessioni di firma" ON public.rentri_firma_sessioni FOR SELECT TO authenticated USING (public.is_staff_member());
DROP POLICY IF EXISTS "Utenti autenticati registrano le sessioni di firma" ON public.rentri_firma_sessioni;
CREATE POLICY "Utenti autenticati registrano le sessioni di firma" ON public.rentri_firma_sessioni FOR INSERT TO authenticated WITH CHECK (public.is_staff_member());

-- storage
DROP POLICY IF EXISTS "Autenticati aggiornano file autorizzazioni" ON storage.objects;
CREATE POLICY "Autenticati aggiornano file autorizzazioni" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'autorizzazioni' AND public.is_staff_member());
DROP POLICY IF EXISTS "Autenticati caricano autorizzazioni" ON storage.objects;
CREATE POLICY "Autenticati caricano autorizzazioni" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'autorizzazioni' AND public.is_staff_member());
DROP POLICY IF EXISTS "Autenticati eliminano file autorizzazioni" ON storage.objects;
CREATE POLICY "Autenticati eliminano file autorizzazioni" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'autorizzazioni' AND public.is_staff_member());
DROP POLICY IF EXISTS "Autenticati leggono file autorizzazioni" ON storage.objects;
CREATE POLICY "Autenticati leggono file autorizzazioni" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'autorizzazioni' AND public.is_staff_member());
DROP POLICY IF EXISTS "Authenticated users upload social media" ON storage.objects;
CREATE POLICY "Authenticated users upload social media" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'social-media' AND (storage.foldername(name))[1] = (select auth.uid()::text));