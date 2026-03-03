
-- 1. DROP the recursive trigger that causes stack overflow
DROP TRIGGER IF EXISTS trg_ensure_fir_draft_on_pool_change ON public.fir_number_pool;

-- 2. Release stuck reserved pool entries pointing to deleted drafts
UPDATE public.fir_number_pool fp
SET status = 'available',
    reserved_by_fir_id = NULL
FROM public.fir_forms ff
WHERE fp.reserved_by_fir_id = ff.id
  AND fp.status = 'reserved'
  AND ff.deleted_by_user = true;

-- 3. Release reserved entries pointing to completed/sent FIRs (should be consumed)
UPDATE public.fir_number_pool fp
SET status = 'consumed',
    consumed_at = COALESCE(fp.consumed_at, now())
FROM public.fir_forms ff
WHERE fp.reserved_by_fir_id = ff.id
  AND fp.status = 'reserved'
  AND ff.status IN ('completato', 'inviato');
