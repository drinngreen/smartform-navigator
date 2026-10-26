CREATE OR REPLACE FUNCTION public.sync_privati_conferimento_to_inventory()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
  IF v_tenant_id IS NULL THEN SELECT tenant_id INTO v_tenant_id FROM public.impianti WHERE id = NEW.impianto_id LIMIT 1; END IF;
  IF v_tenant_id IS NULL THEN RAISE EXCEPTION 'Conferimento non salvato: tenant mancante'; END IF;
  IF NEW.impianto_id IS NULL THEN RAISE EXCEPTION 'Conferimento non salvato: impianto mancante'; END IF;
  IF NEW.cer IS NULL OR btrim(NEW.cer) = '' THEN RAISE EXCEPTION 'Conferimento non salvato: CER mancante'; END IF;
  IF NEW.kg_pesati IS NULL OR NEW.kg_pesati <= 0 THEN RAISE EXCEPTION 'Conferimento non salvato: peso non valido'; END IF;

  v_cer := public.normalize_cer(NEW.cer);
  v_descrizione := CASE WHEN upper(v_cer) = '200140' THEN 'metalli — alluminio' WHEN upper(v_cer) = '200140-FE' THEN 'metalli — ferro' WHEN upper(v_cer) = '200140-RA' THEN 'metalli — metallo-rame' WHEN upper(v_cer) = '200140-CAVO' THEN 'metalli — metallo-cavo' WHEN upper(v_cer) = '200140-OT' THEN 'metalli — ottone' WHEN upper(v_cer) = '200140-PI' THEN 'metalli — metallo-piombo' ELSE NULL END;
  v_data_movimento := COALESCE(NEW.data::date, CURRENT_DATE);
  IF v_tenant_id = '77ec9a3d-602e-438f-97bf-1c69abd8f691'::uuid
     AND v_data_movimento <= DATE '2026-09-21' THEN
    RAISE EXCEPTION 'Vietato: le giacenze fino al 21/09/2026 sono immutabili';
  END IF;
  v_note := concat_ws(' — ', 'Conferimento privato ' || NEW.id::text, NULLIF(NEW.note, ''), CASE WHEN NEW.targa_automezzo IS NOT NULL AND btrim(NEW.targa_automezzo) <> '' THEN 'Targa: ' || NEW.targa_automezzo END);
  PERFORM pg_advisory_xact_lock(public.inventory_lock_key(v_tenant_id, NEW.impianto_id, v_cer));
  PERFORM set_config('app.inventory_authorized', 'on', true);
  PERFORM set_config('app.giacenza_origine', 'CONFERIMENTO_PRIVATO_PESATO', true);
  PERFORM set_config('app.giacenza_attore', 'human', true);

  SELECT id, tenant_id, impianto_id, cer INTO v_movement_id, v_old_tenant_id, v_old_impianto_id, v_old_cer
  FROM public.movimenti_impianto WHERE privati_conferimento_id = NEW.id LIMIT 1;

  IF v_movement_id IS NULL THEN
    INSERT INTO public.movimenti_impianto (tenant_id, impianto_id, tipo_movimento, ruolo_impianto, cer, descrizione_rifiuto, quantita_kg, data_movimento, origine, produttore_denominazione, trasportatore_denominazione, destinatario_denominazione, esito_accettazione, note, privati_conferimento_id, stato_movimento)
    VALUES (v_tenant_id, NEW.impianto_id, 'CARICO', 'DESTINATARIO', v_cer, v_descrizione, NEW.kg_pesati, v_data_movimento, 'privati', NEW.nome_privato, NEW.nome_privato, 'Multyproget', 'accettato', v_note, NEW.id, 'effettivo') RETURNING id INTO v_movement_id;
  ELSE
    UPDATE public.movimenti_impianto SET tenant_id=v_tenant_id, impianto_id=NEW.impianto_id, tipo_movimento='CARICO', ruolo_impianto='DESTINATARIO', cer=v_cer, descrizione_rifiuto=COALESCE(v_descrizione,descrizione_rifiuto), quantita_kg=NEW.kg_pesati, data_movimento=v_data_movimento, produttore_denominazione=NEW.nome_privato, trasportatore_denominazione=NEW.nome_privato, destinatario_denominazione='Multyproget', esito_accettazione='accettato', note=v_note, privati_conferimento_id=NEW.id, stato_movimento='effettivo', updated_at=now() WHERE id=v_movement_id;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.giacenze_applicazioni WHERE documento='PRIVATO:' || NEW.id::text AND cer=v_cer AND segno='CARICO') THEN
    INSERT INTO public.giacenze_applicazioni(documento,cer,segno,quantita_kg,tenant_id,impianto_id,movimento_id,causale,attore,created_by)
    VALUES('PRIVATO:' || NEW.id::text,v_cer,'CARICO',NEW.kg_pesati,v_tenant_id,NEW.impianto_id,v_movement_id,'CONFERIMENTO_PRIVATO_PESATO','human',auth.uid());
  END IF;
  -- Multy reads official stock from the frozen snapshot plus dated human operations.
  -- Private loads are included directly from privati_conferimenti, exactly once.
  IF v_tenant_id <> '77ec9a3d-602e-438f-97bf-1c69abd8f691'::uuid THEN
    PERFORM public.assert_magazzino_giacenza(v_tenant_id, NEW.impianto_id, v_cer);
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.recalculate_stock_after_plant_movement()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_old_key bigint;
  v_new_key bigint;
  v_authorized text := COALESCE(current_setting('app.inventory_authorized', true), '');
  v_old_effective boolean := TG_OP <> 'INSERT' AND COALESCE(OLD.stato_movimento, 'effettivo') = 'effettivo';
  v_new_effective boolean := TG_OP <> 'DELETE' AND COALESCE(NEW.stato_movimento, 'effettivo') = 'effettivo';
BEGIN
  IF NOT v_old_effective AND NOT v_new_effective THEN
    RETURN COALESCE(NEW, OLD);
  END IF;
  IF v_authorized <> 'on' THEN
    RAISE EXCEPTION 'BUG: variazione giacenza fuori dal percorso autorizzato';
  END IF;

  -- The legacy physical stock is not the source of truth for Multy.
  -- Reject reassignment instead of accidentally recalculating either tenant.
  IF TG_OP = 'UPDATE' AND OLD.tenant_id IS DISTINCT FROM NEW.tenant_id
     AND (OLD.tenant_id = '77ec9a3d-602e-438f-97bf-1c69abd8f691'::uuid
       OR NEW.tenant_id = '77ec9a3d-602e-438f-97bf-1c69abd8f691'::uuid) THEN
    RAISE EXCEPTION 'Cambio azienda del movimento non consentito';
  END IF;
  IF COALESCE(NEW.tenant_id, OLD.tenant_id) = '77ec9a3d-602e-438f-97bf-1c69abd8f691'::uuid THEN
    IF (v_old_effective AND OLD.data_movimento::date <= DATE '2026-09-21')
       OR (v_new_effective AND NEW.data_movimento::date <= DATE '2026-09-21') THEN
      RAISE EXCEPTION 'Vietato: le giacenze fino al 21/09/2026 sono immutabili';
    END IF;
    RETURN COALESCE(NEW, OLD);
  END IF;

  IF TG_OP = 'UPDATE' THEN
    v_old_key := public.inventory_lock_key(OLD.tenant_id, OLD.impianto_id, OLD.cer);
    v_new_key := public.inventory_lock_key(NEW.tenant_id, NEW.impianto_id, NEW.cer);
    IF v_old_key <= v_new_key THEN
      PERFORM pg_advisory_xact_lock(v_old_key);
      IF v_new_key <> v_old_key THEN PERFORM pg_advisory_xact_lock(v_new_key); END IF;
    ELSE
      PERFORM pg_advisory_xact_lock(v_new_key);
      PERFORM pg_advisory_xact_lock(v_old_key);
    END IF;
    IF v_old_effective THEN PERFORM public.recalculate_magazzino_giacenza(OLD.tenant_id, OLD.impianto_id, OLD.cer); END IF;
    IF v_new_effective AND (NOT v_old_effective OR v_new_key <> v_old_key) THEN
      PERFORM public.recalculate_magazzino_giacenza(NEW.tenant_id, NEW.impianto_id, NEW.cer);
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM public.recalculate_magazzino_giacenza(OLD.tenant_id, OLD.impianto_id, OLD.cer);
  ELSE
    PERFORM public.recalculate_magazzino_giacenza(NEW.tenant_id, NEW.impianto_id, NEW.cer);
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$function$;

