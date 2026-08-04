CREATE POLICY "Multy Niyol authenticated read anagrafica aziende"
ON public.anagrafica_aziende_mp
FOR SELECT
TO authenticated
USING (
  public.is_allowed_multy_niyol_tenant(public.get_user_tenant(auth.uid()))
);