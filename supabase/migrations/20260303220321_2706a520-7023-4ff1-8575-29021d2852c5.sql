-- Fix FK violation during FIR initialization:
-- BEFORE trigger was writing reserved_by_fir_id to fir_number_pool before fir_forms row existed.
-- Keep duplicate guard in BEFORE trigger, but postpone FK reference to AFTER INSERT.

CREATE OR REPLACE FUNCTION public.guard_and_reserve_fir_on_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_zero uuid := '00000000-0000-0000-0000-000000000000'::uuid;
  v_pool_id uuid;
BEGIN
  IF NEW.numero_fir IS NULL OR btrim(NEW.numero_fir) = '' THEN
    RETURN NEW;
  END IF;

  -- Hard guard: same FIR number cannot exist on another non-deleted record
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

  -- Reserve corresponding pool row if still available
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
        user_id = NEW.user_id,
        assigned_at = COALESCE(assigned_at, now())
    WHERE id = v_pool_id;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.link_pool_row_after_fir_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.numero_fir IS NULL OR btrim(NEW.numero_fir) = '' THEN
    RETURN NEW;
  END IF;

  UPDATE public.fir_number_pool fp
  SET reserved_by_fir_id = NEW.id,
      status = CASE WHEN fp.status = 'available' THEN 'reserved' ELSE fp.status END,
      user_id = NEW.user_id,
      assigned_at = COALESCE(fp.assigned_at, now())
  WHERE fp.fir_number = NEW.numero_fir
    AND fp.suspended = false
    AND (fp.user_id = NEW.user_id OR fp.user_id = '00000000-0000-0000-0000-000000000000'::uuid)
    AND fp.reserved_by_fir_id IS NULL;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_link_pool_row_after_fir_insert ON public.fir_forms;
CREATE TRIGGER trg_link_pool_row_after_fir_insert
AFTER INSERT ON public.fir_forms
FOR EACH ROW
EXECUTE FUNCTION public.link_pool_row_after_fir_insert();