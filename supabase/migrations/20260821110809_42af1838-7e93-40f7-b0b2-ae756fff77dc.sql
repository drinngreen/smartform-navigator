REVOKE ALL ON FUNCTION public.dragon_validate_lot_balance() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.dragon_create_cernita_atomic(uuid,uuid,numeric,jsonb,uuid,date,text,boolean) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.dragon_complete_cernita_atomic(uuid,jsonb) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.dragon_cancel_cernita_atomic(uuid,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.dragon_create_cernita_atomic(uuid,uuid,numeric,jsonb,uuid,date,text,boolean) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.dragon_complete_cernita_atomic(uuid,jsonb) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.dragon_cancel_cernita_atomic(uuid,text) TO authenticated, service_role;