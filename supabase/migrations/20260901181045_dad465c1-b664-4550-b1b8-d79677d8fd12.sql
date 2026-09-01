REVOKE EXECUTE ON FUNCTION public.dragon_sync_stock_to_magazzino() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.magazzino_sync_to_dragon() FROM anon, authenticated, public;