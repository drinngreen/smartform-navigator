DROP TRIGGER IF EXISTS trg_dragon_strict_stock_reconciliation ON public.dragon_stock_movements;

COMMENT ON FUNCTION public.dragon_strict_stock_reconciliation_trigger() IS 'DISATTIVATA il 18/09/2026: il trigger che riscriveva magazzino_giacenze dai movimenti Dragon e stato rimosso. La funzione resta solo per tracciabilita storica e non deve essere ricollegata.';