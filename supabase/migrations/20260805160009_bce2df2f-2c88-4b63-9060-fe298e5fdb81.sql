CREATE OR REPLACE FUNCTION public.recalculate_magazzino_giacenza(
  p_tenant_id uuid,
  p_impianto_id uuid,
  p_cer text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_baseline numeric := 0;
  v_snapshot timestamptz;
  v_delta numeric := 0;
BEGIN
  IF p_tenant_id IS NULL OR p_impianto_id IS NULL OR p_cer IS NULL OR btrim(p_cer) = '' THEN
    RETURN;
  END IF;

  SELECT saldo_iniziale_kg, saldo_snapshot_at
    INTO v_baseline, v_snapshot
  FROM public.magazzino_giacenze
  WHERE tenant_id = p_tenant_id
    AND impianto_id = p_impianto_id
    AND cer = p_cer
  LIMIT 1;

  IF NOT FOUND THEN
    v_baseline := 0;
    v_snapshot := now();
    INSERT INTO public.magazzino_giacenze (
      tenant_id, impianto_id, cer, quantita_kg, saldo_iniziale_kg,
      saldo_snapshot_at, stato, updated_at
    ) VALUES (
      p_tenant_id, p_impianto_id, p_cer, 0, 0,
      v_snapshot, 'stoccato', now()
    )
    ON CONFLICT (tenant_id, impianto_id, cer) DO NOTHING;

    SELECT saldo_iniziale_kg, saldo_snapshot_at
      INTO v_baseline, v_snapshot
    FROM public.magazzino_giacenze
    WHERE tenant_id = p_tenant_id
      AND impianto_id = p_impianto_id
      AND cer = p_cer
    LIMIT 1;
  END IF;

  SELECT COALESCE(SUM(
    CASE
      WHEN tipo_movimento = 'CARICO' THEN quantita_kg
      WHEN tipo_movimento = 'SCARICO' THEN -quantita_kg
      ELSE 0
    END
  ), 0)
  INTO v_delta
  FROM public.movimenti_impianto
  WHERE tenant_id = p_tenant_id
    AND impianto_id = p_impianto_id
    AND cer = p_cer
    AND (v_snapshot IS NULL OR data_movimento > (v_snapshot AT TIME ZONE 'UTC')::date);

  UPDATE public.magazzino_giacenze
  SET quantita_kg = COALESCE(v_baseline, 0) + v_delta,
      ultimo_carico_at = CASE WHEN v_delta > 0 THEN now() ELSE ultimo_carico_at END,
      updated_at = now()
  WHERE tenant_id = p_tenant_id
    AND impianto_id = p_impianto_id
    AND cer = p_cer;
END;
$$;

REVOKE ALL ON FUNCTION public.recalculate_magazzino_giacenza(uuid, uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.recalculate_magazzino_giacenza(uuid, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.recalculate_magazzino_giacenza(uuid, uuid, text) TO service_role;

CREATE OR REPLACE FUNCTION public.recalculate_stock_after_plant_movement()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP IN ('UPDATE', 'DELETE') THEN
    PERFORM public.recalculate_magazzino_giacenza(OLD.tenant_id, OLD.impianto_id, OLD.cer);
  END IF;
  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    PERFORM public.recalculate_magazzino_giacenza(NEW.tenant_id, NEW.impianto_id, NEW.cer);
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_recalculate_stock_after_plant_movement ON public.movimenti_impianto;
CREATE TRIGGER trg_recalculate_stock_after_plant_movement
AFTER INSERT OR UPDATE OR DELETE ON public.movimenti_impianto
FOR EACH ROW EXECUTE FUNCTION public.recalculate_stock_after_plant_movement();

CREATE OR REPLACE FUNCTION public.sync_privati_conferimento_to_inventory()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id uuid;
  v_cer text;
  v_descrizione text;
  v_data_movimento date;
  v_note text;
  v_movement_id uuid;
BEGIN
  v_tenant_id := NEW.tenant_id;
  IF v_tenant_id IS NULL THEN
    SELECT tenant_id INTO v_tenant_id FROM public.impianti WHERE id = NEW.impianto_id LIMIT 1;
  END IF;
  IF v_tenant_id IS NULL OR NEW.impianto_id IS NULL OR NEW.cer IS NULL OR btrim(NEW.cer) = '' OR NEW.kg_pesati IS NULL OR NEW.kg_pesati <= 0 THEN
    RETURN NEW;
  END IF;

  v_cer := CASE
    WHEN upper(btrim(NEW.cer)) = '200140-FE' THEN '200140-fe'
    WHEN upper(btrim(NEW.cer)) = '200140-CAVO' THEN '200140-CAVO'
    WHEN upper(btrim(NEW.cer)) = '200140-RA' THEN '200140-RA'
    WHEN upper(btrim(NEW.cer)) = '200140-OT' THEN '200140-OT'
    WHEN upper(btrim(NEW.cer)) = '200140-PI' THEN '200140-PI'
    ELSE upper(btrim(NEW.cer))
  END;
  v_descrizione := CASE
    WHEN v_cer = '200140' THEN 'metalli — alluminio'
    WHEN v_cer = '200140-fe' THEN 'metalli — ferro'
    WHEN v_cer = '200140-RA' THEN 'metalli — metallo-rame'
    WHEN v_cer = '200140-CAVO' THEN 'metalli — metallo-cavo'
    WHEN v_cer = '200140-OT' THEN 'metalli — ottone'
    WHEN v_cer = '200140-PI' THEN 'metalli — metallo-piombo'
    ELSE NULL
  END;
  v_data_movimento := COALESCE(NEW.data::date, CURRENT_DATE);
  v_note := concat_ws(' — ', 'Conferimento privato ' || NEW.id::text, NULLIF(NEW.note, ''), CASE WHEN NEW.targa_automezzo IS NOT NULL AND btrim(NEW.targa_automezzo) <> '' THEN 'Targa: ' || NEW.targa_automezzo END);

  SELECT id INTO v_movement_id
  FROM public.movimenti_impianto
  WHERE origine = 'privati' AND note LIKE '%' || NEW.id::text || '%'
  ORDER BY created_at LIMIT 1;

  IF v_movement_id IS NULL THEN
    INSERT INTO public.movimenti_impianto (
      tenant_id, impianto_id, tipo_movimento, ruolo_impianto, cer,
      descrizione_rifiuto, quantita_kg, data_movimento, origine,
      produttore_denominazione, trasportatore_denominazione,
      destinatario_denominazione, esito_accettazione, note
    ) VALUES (
      v_tenant_id, NEW.impianto_id, 'CARICO', 'DESTINATARIO', v_cer,
      v_descrizione, NEW.kg_pesati, v_data_movimento, 'privati',
      NEW.nome_privato, NEW.nome_privato, 'Multyproget', 'accettato', v_note
    );
  ELSE
    UPDATE public.movimenti_impianto
    SET tenant_id = v_tenant_id,
        impianto_id = NEW.impianto_id,
        tipo_movimento = 'CARICO',
        ruolo_impianto = 'DESTINATARIO',
        cer = v_cer,
        descrizione_rifiuto = COALESCE(v_descrizione, descrizione_rifiuto),
        quantita_kg = NEW.kg_pesati,
        data_movimento = v_data_movimento,
        produttore_denominazione = NEW.nome_privato,
        trasportatore_denominazione = NEW.nome_privato,
        destinatario_denominazione = 'Multyproget',
        esito_accettazione = 'accettato',
        note = v_note,
        updated_at = now()
    WHERE id = v_movement_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_privati_conferimento_to_inventory ON public.privati_conferimenti;
CREATE TRIGGER trg_sync_privati_conferimento_to_inventory
AFTER INSERT OR UPDATE OF tenant_id, impianto_id, cer, kg_pesati, data, nome_privato, note, targa_automezzo
ON public.privati_conferimenti
FOR EACH ROW EXECUTE FUNCTION public.sync_privati_conferimento_to_inventory();

DROP TRIGGER IF EXISTS trg_sync_privati_conferimento_date_update ON public.privati_conferimenti;

CREATE OR REPLACE FUNCTION public.reverse_privati_conferimento_on_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.movimenti_impianto
  WHERE origine = 'privati'
    AND note LIKE '%' || OLD.id::text || '%';
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_reverse_privati_conferimento_on_delete ON public.privati_conferimenti;
CREATE TRIGGER trg_reverse_privati_conferimento_on_delete
BEFORE DELETE ON public.privati_conferimenti
FOR EACH ROW EXECUTE FUNCTION public.reverse_privati_conferimento_on_delete();