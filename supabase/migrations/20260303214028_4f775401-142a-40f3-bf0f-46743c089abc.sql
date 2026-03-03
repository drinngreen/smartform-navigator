-- HARD FIX: prevent FIR number reuse across all tenants and enforce reservation at insert time

-- 1) Guard + reservation trigger for fir_forms inserts
CREATE OR REPLACE FUNCTION public.guard_and_reserve_fir_on_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_zero uuid := '00000000-0000-0000-0000-000000000000'::uuid;
  v_pool_id uuid;
BEGIN
  IF NEW.numero_fir IS NULL OR btrim(NEW.numero_fir) = '' THEN
    RETURN NEW;
  END IF;

  -- Hard guard: the same FIR number cannot exist on another non-deleted record
  IF EXISTS (
    SELECT 1
    FROM public.fir_forms ff
    WHERE ff.numero_fir = NEW.numero_fir
      AND coalesce(ff.deleted_by_user, false) = false
      AND ff.id <> NEW.id
  ) THEN
    RAISE EXCEPTION 'Numero FIR già utilizzato: %', NEW.numero_fir
      USING ERRCODE = '23505';
  END IF;

  -- Reserve corresponding pool row if it is still available
  SELECT fp.id INTO v_pool_id
  FROM public.fir_number_pool fp
  WHERE fp.fir_number = NEW.numero_fir
    AND fp.status = 'available'
    AND fp.suspended = false
    AND (fp.user_id = NEW.user_id OR fp.user_id = v_zero)
  ORDER BY (CASE WHEN fp.user_id = NEW.user_id THEN 0 ELSE 1 END), fp.created_at ASC
  LIMIT 1
  FOR UPDATE SKIP LOCKED;

  IF v_pool_id IS NOT NULL THEN
    UPDATE public.fir_number_pool
    SET status = 'reserved',
        reserved_by_fir_id = NEW.id,
        user_id = NEW.user_id,
        assigned_at = COALESCE(assigned_at, now())
    WHERE id = v_pool_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_and_reserve_fir_on_insert ON public.fir_forms;
CREATE TRIGGER trg_guard_and_reserve_fir_on_insert
BEFORE INSERT ON public.fir_forms
FOR EACH ROW
EXECUTE FUNCTION public.guard_and_reserve_fir_on_insert();

-- 2) Backfix duplicates: keep latest active draft per user+numero, archive older ones
WITH ranked AS (
  SELECT id,
         row_number() OVER (
           PARTITION BY user_id, numero_fir
           ORDER BY updated_at DESC NULLS LAST, created_at DESC, id DESC
         ) AS rn
  FROM public.fir_forms
  WHERE status = 'bozza'
    AND coalesce(deleted_by_user, false) = false
    AND numero_fir IS NOT NULL
)
UPDATE public.fir_forms ff
SET deleted_by_user = true
FROM ranked r
WHERE ff.id = r.id
  AND r.rn > 1;

-- 3) Backfix consumed status for numbers already completed/inviato/chiuso
UPDATE public.fir_number_pool fp
SET status = 'consumed',
    consumed_at = COALESCE(fp.consumed_at, src.event_at, now()),
    reserved_by_fir_id = src.fir_id
FROM (
  SELECT DISTINCT ON (ff.numero_fir)
         ff.numero_fir,
         ff.id AS fir_id,
         COALESCE(ff.completed_at, ff.submitted_at, ff.updated_at, ff.created_at) AS event_at
  FROM public.fir_forms ff
  WHERE coalesce(ff.deleted_by_user, false) = false
    AND ff.numero_fir IS NOT NULL
    AND ff.status IN ('inviato', 'completato', 'chiuso')
  ORDER BY ff.numero_fir, COALESCE(ff.completed_at, ff.submitted_at, ff.updated_at, ff.created_at) DESC
) src
WHERE fp.fir_number = src.numero_fir
  AND fp.status IN ('available', 'reserved');

-- 4) Backfix reservation for still-active drafts whose pool row is available
UPDATE public.fir_number_pool fp
SET status = 'reserved',
    reserved_by_fir_id = src.fir_id,
    user_id = src.user_id,
    assigned_at = COALESCE(fp.assigned_at, now())
FROM (
  SELECT DISTINCT ON (ff.numero_fir)
         ff.numero_fir,
         ff.id AS fir_id,
         ff.user_id
  FROM public.fir_forms ff
  WHERE ff.status = 'bozza'
    AND coalesce(ff.deleted_by_user, false) = false
    AND ff.numero_fir IS NOT NULL
  ORDER BY ff.numero_fir, ff.updated_at DESC NULLS LAST, ff.created_at DESC
) src
WHERE fp.fir_number = src.numero_fir
  AND fp.status = 'available';