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
      'dc2a6046-d9a8-4549-8e45-82367d695ac6'::uuid
    )
    OR public.is_superadmin()
  )
$$;