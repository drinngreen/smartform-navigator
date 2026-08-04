CREATE POLICY "Multy Niyol read anagrafica aziende"
ON public.anagrafica_aziende_mp
FOR SELECT
TO authenticated
USING (public.is_multy_niyol_admin());