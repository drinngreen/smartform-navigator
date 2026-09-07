GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
GRANT EXECUTE ON FUNCTION public.get_user_org_ids(uuid) TO authenticated, anon;