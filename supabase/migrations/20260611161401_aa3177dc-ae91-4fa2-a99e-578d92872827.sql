DROP POLICY IF EXISTS "registro_generale_update_admins" ON public.registro_generale;
CREATE POLICY "registro_generale_update_admins"
ON public.registro_generale
FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  AND (
    tenant_id = public.get_user_tenant(auth.uid())
    OR public.is_multy_niyol_admin()
  )
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  AND (
    tenant_id = public.get_user_tenant(auth.uid())
    OR public.is_multy_niyol_admin()
  )
);