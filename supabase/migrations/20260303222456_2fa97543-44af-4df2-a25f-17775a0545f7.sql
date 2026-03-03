-- 1. Improve release_fir_number to also match by numero_fir
CREATE OR REPLACE FUNCTION public.release_fir_number(p_fir_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_numero text;
BEGIN
  SELECT numero_fir INTO v_numero
  FROM public.fir_forms
  WHERE id = p_fir_id;

  UPDATE public.fir_number_pool
  SET status = 'available',
      reserved_by_fir_id = NULL,
      consumed_at = NULL
  WHERE reserved_by_fir_id = p_fir_id
    AND status IN ('reserved', 'consumed');

  IF v_numero IS NOT NULL THEN
    UPDATE public.fir_number_pool
    SET status = 'available',
        reserved_by_fir_id = NULL,
        consumed_at = NULL
    WHERE fir_number = v_numero
      AND status IN ('reserved', 'consumed')
      AND (reserved_by_fir_id = p_fir_id OR reserved_by_fir_id IS NULL);
  END IF;
END;
$$;

-- 2. Trigger: auto-release FIR number when a draft is soft-deleted
CREATE OR REPLACE FUNCTION public.auto_release_on_soft_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.deleted_by_user = true AND OLD.deleted_by_user = false THEN
    IF OLD.status = 'bozza' AND NEW.numero_fir IS NOT NULL THEN
      UPDATE public.fir_number_pool
      SET status = 'available',
          reserved_by_fir_id = NULL,
          consumed_at = NULL
      WHERE (reserved_by_fir_id = NEW.id OR fir_number = NEW.numero_fir)
        AND status IN ('reserved');
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_release_on_soft_delete ON public.fir_forms;
CREATE TRIGGER trg_auto_release_on_soft_delete
  BEFORE UPDATE ON public.fir_forms
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_release_on_soft_delete()