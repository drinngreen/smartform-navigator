REVOKE ALL ON FUNCTION public.dragon_reconcile_item_to_magazzino(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.dragon_reconcile_item_to_magazzino(uuid, uuid) TO service_role;
REVOKE ALL ON FUNCTION public.dragon_strict_stock_reconciliation_trigger() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.dragon_strict_stock_reconciliation_trigger() TO service_role;