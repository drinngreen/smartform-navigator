CREATE OR REPLACE FUNCTION public.map_tenant_to_societa(p_tenant_id uuid)
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $$
  SELECT CASE
    WHEN p_tenant_id = '167d07ad-9184-484e-85a6-da5ceafa42a3'::uuid THEN 'global'
    WHEN p_tenant_id = '77ec9a3d-602e-438f-97bf-1c69abd8f691'::uuid THEN 'multy'
    WHEN p_tenant_id = '819c783e-78dd-4080-8265-802e75b0d813'::uuid THEN 'niyol'
    ELSE 'global'
  END;
$$;