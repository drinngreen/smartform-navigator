
-- Reverse inventory when a privati_conferimenti row is deleted
CREATE OR REPLACE FUNCTION public.reverse_privati_conferimento_on_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id uuid;
  v_cer text;
  v_movimento record;
BEGIN
  v_tenant_id := OLD.tenant_id;
  IF v_tenant_id IS NULL THEN
    SELECT i.tenant_id INTO v_tenant_id FROM public.impianti i WHERE i.id = OLD.impianto_id LIMIT 1;
  END IF;
  IF v_tenant_id IS NULL OR OLD.kg_pesati IS NULL OR OLD.kg_pesati <= 0 THEN
    RETURN OLD;
  END IF;

  v_cer := btrim(OLD.cer);
  v_cer := CASE
    WHEN upper(v_cer) = '200140-FE' THEN '200140-fe'
    WHEN upper(v_cer) = '200140-CAVO' THEN '200140-CAVO'
    WHEN upper(v_cer) = '200140-RA' THEN '200140-RA'
    WHEN upper(v_cer) = '200140-OT' THEN '200140-OT'
    WHEN upper(v_cer) = '200140-PI' THEN '200140-PI'
    ELSE upper(v_cer)
  END;

  -- Delete matching plant movement(s) for this conferimento
  FOR v_movimento IN
    SELECT id, quantita_kg
    FROM public.movimenti_impianto
    WHERE tenant_id = v_tenant_id
      AND impianto_id = OLD.impianto_id
      AND origine = 'privati'
      AND note LIKE '%' || OLD.id::text || '%'
  LOOP
    DELETE FROM public.movimenti_impianto WHERE id = v_movimento.id;
  END LOOP;

  -- Reverse giacenza
  UPDATE public.magazzino_giacenze
  SET quantita_kg = GREATEST(0, quantita_kg - OLD.kg_pesati),
      updated_at = now()
  WHERE tenant_id = v_tenant_id
    AND impianto_id = OLD.impianto_id
    AND cer = v_cer;

  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_reverse_privati_conferimento_on_delete ON public.privati_conferimenti;
CREATE TRIGGER trg_reverse_privati_conferimento_on_delete
BEFORE DELETE ON public.privati_conferimenti
FOR EACH ROW EXECUTE FUNCTION public.reverse_privati_conferimento_on_delete();

-- Sync date change to the corresponding plant movement
CREATE OR REPLACE FUNCTION public.sync_privati_conferimento_date_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.data IS DISTINCT FROM OLD.data THEN
    UPDATE public.movimenti_impianto
    SET data_movimento = COALESCE(NEW.data::date, CURRENT_DATE),
        updated_at = now()
    WHERE tenant_id = COALESCE(NEW.tenant_id, OLD.tenant_id)
      AND impianto_id = NEW.impianto_id
      AND origine = 'privati'
      AND note LIKE '%' || NEW.id::text || '%';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_privati_conferimento_date_update ON public.privati_conferimenti;
CREATE TRIGGER trg_sync_privati_conferimento_date_update
AFTER UPDATE ON public.privati_conferimenti
FOR EACH ROW EXECUTE FUNCTION public.sync_privati_conferimento_date_update();
