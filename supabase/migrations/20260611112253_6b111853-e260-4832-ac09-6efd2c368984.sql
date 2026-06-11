REVOKE EXECUTE ON FUNCTION public.is_multy_niyol_admin() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_allowed_multy_niyol_tenant(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.ensure_user_has_fir_draft_for_tenant(uuid, uuid) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.is_multy_niyol_admin() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_allowed_multy_niyol_tenant(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.ensure_user_has_fir_draft_for_tenant(uuid, uuid) TO authenticated, service_role;