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
  v_old_tenant_id uuid;
  v_old_impianto_id uuid;
  v_old_cer text;
BEGIN
  v_tenant_id := NEW.tenant_id;
  IF v_tenant_id IS NULL THEN
    SELECT tenant_id INTO v_tenant_id
    FROM public.impianti
    WHERE id = NEW.impianto_id
    LIMIT 1;
  END IF;

  IF v_tenant_id IS NULL THEN RAISE EXCEPTION 'Conferimento non salvato: tenant mancante'; END IF;
  IF NEW.impianto_id IS NULL THEN RAISE EXCEPTION 'Conferimento non salvato: impianto mancante'; END IF;
  IF NEW.cer IS NULL OR btrim(NEW.cer) = '' THEN RAISE EXCEPTION 'Conferimento non salvato: CER mancante'; END IF;
  IF NEW.kg_pesati IS NULL OR NEW.kg_pesati <= 0 THEN RAISE EXCEPTION 'Conferimento non salvato: peso non valido'; END IF;

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

  PERFORM pg_advisory_xact_lock(public.inventory_lock_key(v_tenant_id, NEW.impianto_id, v_cer));

  SELECT id, tenant_id, impianto_id, cer
  INTO v_movement_id, v_old_tenant_id, v_old_impianto_id, v_old_cer
  FROM public.movimenti_impianto
  WHERE privati_conferimento_id = NEW.id
  LIMIT 1;

  IF v_movement_id IS NULL AND TG_OP = 'UPDATE' THEN
    SELECT id, tenant_id, impianto_id, cer
    INTO v_movement_id, v_old_tenant_id, v_old_impianto_id, v_old_cer
    FROM public.movimenti_impianto
    WHERE origine = 'privati'
      AND note LIKE '%' || NEW.id::text || '%'
    ORDER BY created_at
    LIMIT 1;
  END IF;

  IF v_movement_id IS NULL THEN
    INSERT INTO public.movimenti_impianto (
      tenant_id, impianto_id, tipo_movimento, ruolo_impianto, cer,
      descrizione_rifiuto, quantita_kg, data_movimento, origine,
      produttore_denominazione, trasportatore_denominazione,
      destinatario_denominazione, esito_accettazione, note,
      privati_conferimento_id
    ) VALUES (
      v_tenant_id, NEW.impianto_id, 'CARICO', 'DESTINATARIO', v_cer,
      v_descrizione, NEW.kg_pesati, v_data_movimento, 'privati',
      NEW.nome_privato, NEW.nome_privato, 'Multyproget', 'accettato', v_note,
      NEW.id
    ) RETURNING id INTO v_movement_id;
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
        privati_conferimento_id = NEW.id,
        updated_at = now()
    WHERE id = v_movement_id;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.movimenti_impianto
    WHERE id = v_movement_id
      AND privati_conferimento_id = NEW.id
      AND tenant_id = v_tenant_id
      AND impianto_id = NEW.impianto_id
      AND cer = v_cer
      AND tipo_movimento = 'CARICO'
      AND quantita_kg = NEW.kg_pesati
  ) THEN
    RAISE EXCEPTION 'Conferimento non salvato: movimento di magazzino non verificato';
  END IF;

  PERFORM public.assert_magazzino_giacenza(v_tenant_id, NEW.impianto_id, v_cer);

  IF v_old_tenant_id IS NOT NULL AND v_old_impianto_id IS NOT NULL AND v_old_cer IS NOT NULL
     AND (v_old_tenant_id, v_old_impianto_id, v_old_cer)
         IS DISTINCT FROM (v_tenant_id, NEW.impianto_id, v_cer) THEN
    PERFORM public.assert_magazzino_giacenza(v_old_tenant_id, v_old_impianto_id, v_old_cer);
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.inventory_lock_key(uuid, uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.recalculate_magazzino_giacenza(uuid, uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.recalculate_stock_after_plant_movement() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.assert_magazzino_giacenza(uuid, uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sync_privati_conferimento_to_inventory() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.inventory_lock_key(uuid, uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.recalculate_magazzino_giacenza(uuid, uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.recalculate_stock_after_plant_movement() TO service_role;
GRANT EXECUTE ON FUNCTION public.assert_magazzino_giacenza(uuid, uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.sync_privati_conferimento_to_inventory() TO service_role;