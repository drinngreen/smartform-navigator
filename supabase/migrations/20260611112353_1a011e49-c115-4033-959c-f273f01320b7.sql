REVOKE EXECUTE ON FUNCTION public.is_multy_niyol_admin() FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_allowed_multy_niyol_tenant(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.ensure_user_has_fir_draft_for_tenant(uuid, uuid) FROM anon;

GRANT EXECUTE ON FUNCTION public.is_multy_niyol_admin() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_allowed_multy_niyol_tenant(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.ensure_user_has_fir_draft_for_tenant(uuid, uuid) TO authenticated, service_role;