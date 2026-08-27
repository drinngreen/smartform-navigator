CREATE OR REPLACE FUNCTION public.sync_privato_veicoli()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_targa text := NULLIF(upper(trim(coalesce(NEW.targa_automezzo, ''))), '');
  v_modello text := NULLIF(trim(coalesce(NEW.modello_automezzo, NEW.automezzo, '')), '');
  v_old_targa text := NULLIF(upper(trim(coalesce(OLD.targa_automezzo, ''))), '');
  v_exists boolean;
BEGIN
  IF NEW.veicoli IS NULL OR jsonb_typeof(NEW.veicoli) <> 'array' THEN
    NEW.veicoli := '[]'::jsonb;
  END IF;

  -- la targa principale deve sempre comparire nell'elenco mezzi
  IF v_targa IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM jsonb_array_elements(NEW.veicoli) e
      WHERE upper(trim(coalesce(e->>'targa', ''))) = v_targa
    ) INTO v_exists;
    IF NOT v_exists THEN
      NEW.veicoli := jsonb_build_array(
        jsonb_build_object('targa', v_targa, 'modello', coalesce(v_modello, ''))
      ) || NEW.veicoli;
    END IF;
  END IF;

  -- targa principale rimossa da un altro modulo: togli la voce corrispondente
  IF TG_OP = 'UPDATE' AND v_targa IS NULL AND v_old_targa IS NOT NULL
     AND NEW.veicoli IS NOT DISTINCT FROM OLD.veicoli THEN
    SELECT coalesce(jsonb_agg(e), '[]'::jsonb) INTO NEW.veicoli
    FROM jsonb_array_elements(NEW.veicoli) e
    WHERE upper(trim(coalesce(e->>'targa', ''))) <> v_old_targa;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_privato_veicoli ON public.anagrafica_privati;
CREATE TRIGGER trg_sync_privato_veicoli
BEFORE INSERT OR UPDATE ON public.anagrafica_privati
FOR EACH ROW EXECUTE FUNCTION public.sync_privato_veicoli();