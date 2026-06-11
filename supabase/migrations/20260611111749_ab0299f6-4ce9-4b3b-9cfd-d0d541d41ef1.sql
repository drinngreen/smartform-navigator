CREATE OR REPLACE FUNCTION public.is_multy_niyol_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(auth.uid(), 'admin'::public.app_role)
    AND lower(coalesce(auth.jwt() ->> 'email', '')) IN (
      'multyniyol@zoli.live',
      'multyproget@zolidragon.cloud',
      'nijol@zolidragon.cloud',
      'superadmin@zoli.live'
    );
$$;

CREATE OR REPLACE FUNCTION public.is_allowed_multy_niyol_tenant(_tenant_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT _tenant_id IN (
    '77ec9a3d-602e-438f-97bf-1c69abd8f691'::uuid,
    '819c783e-78dd-4080-8265-802e75b0d813'::uuid
  );
$$;

DROP POLICY IF EXISTS "Dev MultyNiyol admins manage anagrafica_privati" ON public.anagrafica_privati;
CREATE POLICY "Dev MultyNiyol admins manage anagrafica_privati"
ON public.anagrafica_privati
FOR ALL
TO authenticated
USING (public.is_multy_niyol_admin() AND public.is_allowed_multy_niyol_tenant(tenant_id))
WITH CHECK (public.is_multy_niyol_admin() AND public.is_allowed_multy_niyol_tenant(tenant_id));

DROP POLICY IF EXISTS "Dev MultyNiyol admins manage privati_conferimenti" ON public.privati_conferimenti;
CREATE POLICY "Dev MultyNiyol admins manage privati_conferimenti"
ON public.privati_conferimenti
FOR ALL
TO authenticated
USING (public.is_multy_niyol_admin() AND public.is_allowed_multy_niyol_tenant(tenant_id))
WITH CHECK (public.is_multy_niyol_admin() AND public.is_allowed_multy_niyol_tenant(tenant_id));

DROP POLICY IF EXISTS "Dev MultyNiyol admins manage ricevute_privati" ON public.ricevute_privati;
CREATE POLICY "Dev MultyNiyol admins manage ricevute_privati"
ON public.ricevute_privati
FOR ALL
TO authenticated
USING (public.is_multy_niyol_admin() AND public.is_allowed_multy_niyol_tenant(tenant_id))
WITH CHECK (public.is_multy_niyol_admin() AND public.is_allowed_multy_niyol_tenant(tenant_id));

DROP POLICY IF EXISTS "Dev MultyNiyol admins manage documenti_privati" ON public.documenti_privati;
CREATE POLICY "Dev MultyNiyol admins manage documenti_privati"
ON public.documenti_privati
FOR ALL
TO authenticated
USING (public.is_multy_niyol_admin() AND public.is_allowed_multy_niyol_tenant(tenant_id))
WITH CHECK (public.is_multy_niyol_admin() AND public.is_allowed_multy_niyol_tenant(tenant_id));

DROP POLICY IF EXISTS "Dev MultyNiyol admins manage movimenti_impianto" ON public.movimenti_impianto;
CREATE POLICY "Dev MultyNiyol admins manage movimenti_impianto"
ON public.movimenti_impianto
FOR ALL
TO authenticated
USING (public.is_multy_niyol_admin() AND public.is_allowed_multy_niyol_tenant(tenant_id))
WITH CHECK (public.is_multy_niyol_admin() AND public.is_allowed_multy_niyol_tenant(tenant_id));

DROP POLICY IF EXISTS "Dev MultyNiyol admins manage magazzino_giacenze" ON public.magazzino_giacenze;
CREATE POLICY "Dev MultyNiyol admins manage magazzino_giacenze"
ON public.magazzino_giacenze
FOR ALL
TO authenticated
USING (public.is_multy_niyol_admin() AND public.is_allowed_multy_niyol_tenant(tenant_id))
WITH CHECK (public.is_multy_niyol_admin() AND public.is_allowed_multy_niyol_tenant(tenant_id));

DROP POLICY IF EXISTS "Dev MultyNiyol admins manage cernite" ON public.cernite;
CREATE POLICY "Dev MultyNiyol admins manage cernite"
ON public.cernite
FOR ALL
TO authenticated
USING (public.is_multy_niyol_admin() AND public.is_allowed_multy_niyol_tenant(tenant_id))
WITH CHECK (public.is_multy_niyol_admin() AND public.is_allowed_multy_niyol_tenant(tenant_id));

DROP POLICY IF EXISTS "Dev MultyNiyol admins manage cernita_output" ON public.cernita_output;
CREATE POLICY "Dev MultyNiyol admins manage cernita_output"
ON public.cernita_output
FOR ALL
TO authenticated
USING (
  public.is_multy_niyol_admin()
  AND EXISTS (
    SELECT 1
    FROM public.cernite c
    WHERE c.id = cernita_output.cernita_id
      AND public.is_allowed_multy_niyol_tenant(c.tenant_id)
  )
)
WITH CHECK (
  public.is_multy_niyol_admin()
  AND EXISTS (
    SELECT 1
    FROM public.cernite c
    WHERE c.id = cernita_output.cernita_id
      AND public.is_allowed_multy_niyol_tenant(c.tenant_id)
  )
);

DROP POLICY IF EXISTS "Dev MultyNiyol admins manage rubrica_contatti" ON public.rubrica_contatti;
CREATE POLICY "Dev MultyNiyol admins manage rubrica_contatti"
ON public.rubrica_contatti
FOR ALL
TO authenticated
USING (public.is_multy_niyol_admin() AND public.is_allowed_multy_niyol_tenant(tenant_id))
WITH CHECK (public.is_multy_niyol_admin() AND public.is_allowed_multy_niyol_tenant(tenant_id));

DROP POLICY IF EXISTS "Dev MultyNiyol admins manage comunicazioni_log" ON public.comunicazioni_log;
CREATE POLICY "Dev MultyNiyol admins manage comunicazioni_log"
ON public.comunicazioni_log
FOR ALL
TO authenticated
USING (public.is_multy_niyol_admin() AND public.is_allowed_multy_niyol_tenant(tenant_id))
WITH CHECK (public.is_multy_niyol_admin() AND public.is_allowed_multy_niyol_tenant(tenant_id));

DROP POLICY IF EXISTS "Dev MultyNiyol admins manage impianti" ON public.impianti;
CREATE POLICY "Dev MultyNiyol admins manage impianti"
ON public.impianti
FOR ALL
TO authenticated
USING (public.is_multy_niyol_admin() AND public.is_allowed_multy_niyol_tenant(tenant_id))
WITH CHECK (public.is_multy_niyol_admin() AND public.is_allowed_multy_niyol_tenant(tenant_id));

DROP POLICY IF EXISTS "Dev MultyNiyol admins manage fir_forms" ON public.fir_forms;
CREATE POLICY "Dev MultyNiyol admins manage fir_forms"
ON public.fir_forms
FOR ALL
TO authenticated
USING (public.is_multy_niyol_admin() AND public.is_allowed_multy_niyol_tenant(tenant_id))
WITH CHECK (public.is_multy_niyol_admin() AND public.is_allowed_multy_niyol_tenant(tenant_id));