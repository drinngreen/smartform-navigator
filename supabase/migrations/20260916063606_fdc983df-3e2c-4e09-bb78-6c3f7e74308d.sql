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
BEGIN
  IF v_authorized <> 'on' THEN
    RAISE EXCEPTION 'BUG: variazione giacenza fuori dal percorso autorizzato';
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
    PERFORM public.recalculate_magazzino_giacenza(OLD.tenant_id, OLD.impianto_id, OLD.cer);
    IF v_new_key <> v_old_key THEN
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

CREATE OR REPLACE FUNCTION public.applica_movimento_giacenza(p_tenant_id uuid, p_impianto_id uuid, p_cer text, p_quantita_kg numeric, p_segno text, p_causale text, p_documento text, p_attore text DEFAULT 'human'::text, p_descrizione text DEFAULT NULL::text, p_fir_id uuid DEFAULT NULL::uuid, p_numero_fir text DEFAULT NULL::text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_cer text;
  v_segno text;
  v_mov_id uuid;
  v_esistente uuid;
BEGIN
  IF auth.uid() IS NULL OR NOT public.can_access_tenant(p_tenant_id) THEN
    RAISE EXCEPTION 'Operazione non autorizzata';
  END IF;
  IF p_attore IS DISTINCT FROM 'human' THEN
    RAISE EXCEPTION 'Solo una conferma umana puo applicare un movimento alle giacenze (attore: %)', p_attore;
  END IF;
  IF p_tenant_id IS NULL OR p_impianto_id IS NULL OR p_cer IS NULL OR btrim(p_cer) = '' THEN
    RAISE EXCEPTION 'Dati insufficienti: tenant, impianto e CER sono obbligatori';
  END IF;
  IF p_documento IS NULL OR btrim(p_documento) = '' THEN
    RAISE EXCEPTION 'Documento obbligatorio: senza documento non e possibile garantire l idempotenza';
  END IF;
  IF p_quantita_kg IS NULL OR p_quantita_kg <= 0 THEN
    RAISE EXCEPTION 'Quantita non valida: deve essere maggiore di zero';
  END IF;

  v_segno := upper(btrim(p_segno));
  IF v_segno NOT IN ('CARICO', 'SCARICO') THEN
    RAISE EXCEPTION 'Segno non valido: ammessi CARICO o SCARICO';
  END IF;
  v_cer := public.normalize_cer(p_cer);

  SELECT movimento_id INTO v_esistente
  FROM public.giacenze_applicazioni
  WHERE documento = p_documento AND cer = v_cer AND segno = v_segno;
  IF v_esistente IS NOT NULL THEN
    RETURN jsonb_build_object('applicato', false, 'motivo', 'gia_applicato', 'movimento_id', v_esistente);
  END IF;

  PERFORM set_config('app.inventory_authorized', 'on', true);
  PERFORM set_config('app.giacenza_origine', COALESCE(p_causale, 'punto_unico'), true);
  PERFORM set_config('app.giacenza_attore', 'human', true);

  INSERT INTO public.movimenti_impianto (
    impianto_id, tenant_id, cer, descrizione_rifiuto, quantita_kg,
    data_movimento, tipo_movimento, ruolo_impianto, origine,
    fir_id, numero_fir, note, created_by, stato_movimento
  ) VALUES (
    p_impianto_id, p_tenant_id, v_cer, p_descrizione, p_quantita_kg,
    CURRENT_DATE, v_segno,
    CASE WHEN v_segno = 'CARICO' THEN 'destinatario' ELSE 'produttore' END,
    COALESCE(p_causale, 'punto_unico'), p_fir_id, p_numero_fir, p_documento,
    auth.uid(), 'effettivo'
  ) RETURNING id INTO v_mov_id;

  INSERT INTO public.giacenze_applicazioni (
    documento, cer, segno, quantita_kg, tenant_id, impianto_id,
    movimento_id, causale, attore, created_by
  ) VALUES (
    p_documento, v_cer, v_segno, p_quantita_kg, p_tenant_id, p_impianto_id,
    v_mov_id, p_causale, 'human', auth.uid()
  );

  RETURN jsonb_build_object('applicato', true, 'movimento_id', v_mov_id, 'cer', v_cer, 'segno', v_segno, 'quantita_kg', p_quantita_kg);
END;
$function$;

CREATE OR REPLACE FUNCTION public.conferma_movimento_cartaceo_giacenza(p_movimento_id uuid, p_quantita_kg numeric, p_documento text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_row public.movimenti_impianto%ROWTYPE;
  v_result jsonb;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Operazione non autorizzata'; END IF;
  IF p_quantita_kg IS NULL OR p_quantita_kg <= 0 THEN RAISE EXCEPTION 'Peso reale non valido'; END IF;

  SELECT * INTO v_row FROM public.movimenti_impianto WHERE id = p_movimento_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Movimento cartaceo non trovato'; END IF;
  IF NOT public.can_access_tenant(v_row.tenant_id) THEN RAISE EXCEPTION 'Operazione non autorizzata'; END IF;
  IF COALESCE(v_row.origine, '') NOT IN ('conto_terzi_cartaceo', 'fir_cartaceo') THEN
    RAISE EXCEPTION 'Il movimento non appartiene al percorso cartaceo';
  END IF;
  IF COALESCE(v_row.stato_movimento, 'potenziale') = 'effettivo' THEN
    RETURN jsonb_build_object('applicato', false, 'motivo', 'gia_effettivo', 'movimento_id', v_row.id);
  END IF;

  PERFORM set_config('app.inventory_authorized', 'on', true);
  PERFORM set_config('app.giacenza_origine', 'FIR_CARTACEO_CONFERMATO', true);
  PERFORM set_config('app.giacenza_attore', 'human', true);

  UPDATE public.movimenti_impianto
  SET quantita_kg = p_quantita_kg,
      stato_movimento = 'effettivo',
      note = concat_ws(' — ', NULLIF(note, ''), p_documento),
      updated_at = now()
  WHERE id = v_row.id;

  INSERT INTO public.giacenze_applicazioni (
    documento, cer, segno, quantita_kg, tenant_id, impianto_id,
    movimento_id, causale, attore, created_by
  ) VALUES (
    p_documento, public.normalize_cer(v_row.cer), upper(v_row.tipo_movimento), p_quantita_kg,
    v_row.tenant_id, v_row.impianto_id, v_row.id, 'FIR_CARTACEO_CONFERMATO', 'human', auth.uid()
  ) ON CONFLICT DO NOTHING;

  v_result := jsonb_build_object('applicato', true, 'movimento_id', v_row.id, 'quantita_kg', p_quantita_kg);
  RETURN v_result;
END;
$function$;

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
  PERFORM public.assert_magazzino_giacenza(v_tenant_id, NEW.impianto_id, v_cer);
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.esegui_cernita_atomica(p_tenant_id uuid, p_impianto_id uuid, p_cer_input text, p_quantita_input numeric, p_outputs jsonb, p_note text DEFAULT NULL::text, p_data date DEFAULT CURRENT_DATE)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_cernita_id uuid;
  v_giacenza numeric := 0;
  v_out_total numeric := 0;
  v_desc text;
  o jsonb;
BEGIN
  IF auth.uid() IS NULL OR NOT public.can_access_tenant(p_tenant_id) THEN RAISE EXCEPTION 'Operazione non autorizzata'; END IF;
  IF p_tenant_id IS NULL OR p_impianto_id IS NULL OR p_cer_input IS NULL OR btrim(p_cer_input) = '' THEN RAISE EXCEPTION 'Dati cernita incompleti'; END IF;
  IF COALESCE(p_quantita_input,0) <= 0 THEN RAISE EXCEPTION 'La quantità in ingresso deve essere maggiore di zero'; END IF;
  IF p_outputs IS NULL OR jsonb_array_length(p_outputs) = 0 THEN RAISE EXCEPTION 'Serve almeno una frazione in uscita'; END IF;
  FOR o IN SELECT * FROM jsonb_array_elements(p_outputs) LOOP
    IF COALESCE(btrim(o->>'cer'),'') = '' OR COALESCE((o->>'quantita')::numeric,0) <= 0 THEN RAISE EXCEPTION 'Output cernita non valido'; END IF;
    v_out_total := v_out_total + (o->>'quantita')::numeric;
  END LOOP;
  IF v_out_total > p_quantita_input + 0.001 THEN RAISE EXCEPTION 'Gli output superano l input'; END IF;

  SELECT quantita_kg, descrizione_cer INTO v_giacenza, v_desc FROM public.magazzino_giacenze WHERE tenant_id=p_tenant_id AND impianto_id=p_impianto_id AND cer=public.normalize_cer(p_cer_input) FOR UPDATE;
  IF NOT FOUND OR COALESCE(v_giacenza,0) < p_quantita_input - 0.001 THEN RAISE EXCEPTION 'Giacenza insufficiente per il CER %',p_cer_input; END IF;

  PERFORM set_config('app.inventory_authorized','on',true);
  PERFORM set_config('app.giacenza_origine','CERNITA_CONFERMATA',true);
  PERFORM set_config('app.giacenza_attore','human',true);

  INSERT INTO public.cernite(tenant_id,impianto_id,cer_input,descrizione_input,quantita_input,stato,note,created_by) VALUES(p_tenant_id,p_impianto_id,public.normalize_cer(p_cer_input),v_desc,p_quantita_input,'completata',p_note,auth.uid()) RETURNING id INTO v_cernita_id;
  INSERT INTO public.cernita_output(cernita_id,cer_output,quantita,tipo_output) SELECT v_cernita_id,public.normalize_cer(btrim(x->>'cer')),(x->>'quantita')::numeric,COALESCE(x->>'tipo','rifiuto') FROM jsonb_array_elements(p_outputs) x;
  INSERT INTO public.movimenti_impianto(impianto_id,tenant_id,cer,descrizione_rifiuto,quantita_kg,data_movimento,tipo_movimento,ruolo_impianto,origine,note,created_by,stato_movimento) VALUES(p_impianto_id,p_tenant_id,public.normalize_cer(p_cer_input),v_desc,p_quantita_input,p_data,'SCARICO','TRATTAMENTO_INTERNO','cernita','Cernita '||v_cernita_id::text,auth.uid(),'effettivo');
  INSERT INTO public.movimenti_impianto(impianto_id,tenant_id,cer,quantita_kg,data_movimento,tipo_movimento,ruolo_impianto,origine,note,created_by,stato_movimento) SELECT p_impianto_id,p_tenant_id,public.normalize_cer(btrim(x->>'cer')),(x->>'quantita')::numeric,p_data,'CARICO','TRATTAMENTO_INTERNO','cernita','Cernita '||v_cernita_id::text||' — '||COALESCE(x->>'tipo','rifiuto'),auth.uid(),'effettivo' FROM jsonb_array_elements(p_outputs) x;
  RETURN v_cernita_id;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.recalculate_magazzino_giacenza(uuid,uuid,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.recalculate_magazzino_giacenza(uuid,uuid,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.conferma_movimento_cartaceo_giacenza(uuid,numeric,text) TO authenticated, service_role;

DROP POLICY IF EXISTS "Admins can insert giacenze" ON public.magazzino_giacenze;
DROP POLICY IF EXISTS "Admins can update giacenze" ON public.magazzino_giacenze;
DROP POLICY IF EXISTS "Admins can delete giacenze" ON public.magazzino_giacenze;
DROP POLICY IF EXISTS "Dev MultyNiyol admins manage magazzino_giacenze" ON public.magazzino_giacenze;
DROP POLICY IF EXISTS "Admins can insert movements" ON public.movimenti_impianto;
DROP POLICY IF EXISTS "Admins can update movements" ON public.movimenti_impianto;
DROP POLICY IF EXISTS "Admins can delete movements" ON public.movimenti_impianto;
DROP POLICY IF EXISTS "Dev MultyNiyol admins manage movimenti_impianto" ON public.movimenti_impianto;
DROP POLICY IF EXISTS "Users can insert movements for their tenant" ON public.movimenti_impianto;
DROP POLICY IF EXISTS "Users can update movements for their tenant" ON public.movimenti_impianto;
DROP POLICY IF EXISTS "Users can delete movements for their tenant" ON public.movimenti_impianto;