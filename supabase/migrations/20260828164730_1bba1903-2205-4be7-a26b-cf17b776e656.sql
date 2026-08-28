-- 1) Numero ricevuta derivato ESCLUSIVAMENTE dal movimento
CREATE OR REPLACE FUNCTION public.ricevuta_numero_da_movimento(p_progressivo integer, p_anno integer)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$ SELECT lpad(COALESCE(p_progressivo,0)::text, 5, '0') || '/' || COALESCE(p_anno, 0)::text $$;

-- 2) L'anagrafica del privato non puo' essere successiva al movimento
CREATE OR REPLACE FUNCTION public.privato_allinea_data_registrazione()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.privato_id IS NOT NULL AND NEW.data IS NOT NULL THEN
    UPDATE public.anagrafica_privati
    SET created_at = NEW.data
    WHERE id = NEW.privato_id
      AND created_at > NEW.data;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_privato_allinea_data_registrazione ON public.privati_conferimenti;
CREATE TRIGGER trg_privato_allinea_data_registrazione
AFTER INSERT OR UPDATE OF data, privato_id ON public.privati_conferimenti
FOR EACH ROW EXECUTE FUNCTION public.privato_allinea_data_registrazione();

-- 3) Ogni movimento genera / mantiene allineata la propria ricevuta
CREATE OR REPLACE FUNCTION public.sync_ricevuta_da_conferimento()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_anno integer;
  v_numero text;
BEGIN
  v_anno := COALESCE(NEW.anno_dbt, EXTRACT(YEAR FROM NEW.data)::integer);
  v_numero := public.ricevuta_numero_da_movimento(NEW.numero_progressivo, v_anno);

  UPDATE public.ricevute_privati
  SET numero_ricevuta = v_numero,
      anno = v_anno,
      data_emissione = NEW.data,
      tenant_id = NEW.tenant_id,
      impianto_id = NEW.impianto_id,
      privato_id = NEW.privato_id,
      gruppo_id = NEW.gruppo_id,
      importo = COALESCE(NEW.importo_pagato, 0),
      updated_at = now()
  WHERE conferimento_id = NEW.id;

  IF NOT FOUND THEN
    INSERT INTO public.ricevute_privati (
      tenant_id, impianto_id, conferimento_id, privato_id,
      numero_ricevuta, anno, data_emissione, importo, gruppo_id, note
    ) VALUES (
      NEW.tenant_id, NEW.impianto_id, NEW.id, NEW.privato_id,
      v_numero, v_anno, NEW.data, COALESCE(NEW.importo_pagato, 0), NEW.gruppo_id,
      concat_ws(' — ', NEW.nome_privato, 'CER ' || NEW.cer, NEW.kg_pesati::text || ' kg')
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_ricevuta_da_conferimento ON public.privati_conferimenti;
CREATE TRIGGER trg_sync_ricevuta_da_conferimento
AFTER INSERT OR UPDATE OF data, numero_progressivo, anno_dbt, importo_pagato, privato_id, tenant_id, impianto_id, gruppo_id
ON public.privati_conferimenti
FOR EACH ROW EXECUTE FUNCTION public.sync_ricevuta_da_conferimento();

-- 4) Nessuna ricevuta puo' esistere o divergere dal proprio movimento
CREATE OR REPLACE FUNCTION public.ricevuta_forza_coerenza_movimento()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  m record;
BEGIN
  IF NEW.conferimento_id IS NULL THEN
    RAISE EXCEPTION 'Ricevuta non ammessa: deve essere collegata a un movimento privato';
  END IF;

  SELECT * INTO m FROM public.privati_conferimenti WHERE id = NEW.conferimento_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Ricevuta non ammessa: movimento inesistente';
  END IF;

  NEW.tenant_id := m.tenant_id;
  NEW.impianto_id := m.impianto_id;
  NEW.privato_id := m.privato_id;
  NEW.gruppo_id := m.gruppo_id;
  NEW.anno := COALESCE(m.anno_dbt, EXTRACT(YEAR FROM m.data)::integer);
  NEW.numero_ricevuta := public.ricevuta_numero_da_movimento(m.numero_progressivo, NEW.anno);
  NEW.data_emissione := m.data;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ricevuta_forza_coerenza_movimento ON public.ricevute_privati;
CREATE TRIGGER trg_ricevuta_forza_coerenza_movimento
BEFORE INSERT OR UPDATE ON public.ricevute_privati
FOR EACH ROW EXECUTE FUNCTION public.ricevuta_forza_coerenza_movimento();

-- 5) La ricevuta si elimina solo insieme al proprio movimento
CREATE OR REPLACE FUNCTION public.ricevuta_blocca_eliminazione_isolata()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.privati_conferimenti WHERE id = OLD.conferimento_id) THEN
    RAISE EXCEPTION 'Ricevuta non eliminabile: esiste ancora il movimento collegato';
  END IF;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_ricevuta_blocca_eliminazione_isolata ON public.ricevute_privati;
CREATE TRIGGER trg_ricevuta_blocca_eliminazione_isolata
BEFORE DELETE ON public.ricevute_privati
FOR EACH ROW EXECUTE FUNCTION public.ricevuta_blocca_eliminazione_isolata();

-- 6) La creazione atomica non emette piu' una ricevuta di gruppo:
--    ogni movimento riceve la propria ricevuta dal trigger centrale.
CREATE OR REPLACE FUNCTION public.crea_conferimento_privato_atomico(p_tenant_id uuid, p_impianto_id uuid, p_privato_id uuid, p_nome_privato text, p_cf_pi text, p_tipo_utenza text, p_materiali jsonb, p_data date, p_importo numeric, p_metodo_pag text, p_note text, p_targa text, p_modello text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_gruppo_id uuid := gen_random_uuid();
  v_anno integer := EXTRACT(YEAR FROM COALESCE(p_data, CURRENT_DATE))::integer;
  v_totale_esistente numeric;
  v_totale_nuovo numeric;
  v_numero_ricevuta text;
  v_primo_id uuid;
  v_riga jsonb;
  v_cer text;
  v_kg numeric;
  v_prezzo numeric;
  v_riga_importo numeric;
  v_somma_righe numeric := 0;
  v_id uuid;
  v_ids jsonb := '[]'::jsonb;
  v_index integer := 0;
BEGIN
  IF auth.uid() IS NULL OR NOT public.can_access_tenant(p_tenant_id) THEN
    RAISE EXCEPTION 'Operazione non autorizzata';
  END IF;
  IF p_tenant_id IS NULL OR p_impianto_id IS NULL OR p_privato_id IS NULL THEN
    RAISE EXCEPTION 'Tenant, impianto e privato sono obbligatori';
  END IF;
  IF p_materiali IS NULL OR jsonb_typeof(p_materiali) <> 'array' OR jsonb_array_length(p_materiali) = 0 THEN
    RAISE EXCEPTION 'Inserire almeno un materiale';
  END IF;

  PERFORM 1 FROM public.anagrafica_privati WHERE id = p_privato_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Privato non trovato'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(p_tenant_id::text || '|' || v_anno::text || '|dbt', 0));

  SELECT COALESCE(SUM(kg_pesati), 0)
  INTO v_totale_esistente
  FROM public.privati_conferimenti
  WHERE privato_id = p_privato_id
    AND EXTRACT(YEAR FROM data)::integer = v_anno;

  SELECT COALESCE(SUM((x->>'kg')::numeric), 0)
  INTO v_totale_nuovo
  FROM jsonb_array_elements(p_materiali) AS x;

  IF v_totale_nuovo <= 0 THEN RAISE EXCEPTION 'Peso totale non valido'; END IF;
  IF v_totale_esistente + v_totale_nuovo > 1500 THEN
    RAISE EXCEPTION 'Limite annuale di 1500 kg superato: totale richiesto % kg', v_totale_esistente + v_totale_nuovo;
  END IF;

  FOR v_riga IN SELECT value FROM jsonb_array_elements(p_materiali)
  LOOP
    v_cer := upper(btrim(v_riga->>'cer'));
    BEGIN
      v_kg := (v_riga->>'kg')::numeric;
    EXCEPTION WHEN OTHERS THEN
      RAISE EXCEPTION 'Peso non valido per il materiale %', COALESCE(v_cer, '-');
    END;
    IF v_cer IS NULL OR v_cer = '' OR v_kg IS NULL OR v_kg <= 0 THEN
      RAISE EXCEPTION 'CER e peso positivo sono obbligatori per ogni materiale';
    END IF;

    v_prezzo := NULLIF(v_riga->>'prezzo_kg', '')::numeric;
    v_riga_importo := NULLIF(v_riga->>'importo', '')::numeric;
    IF v_riga_importo IS NULL AND v_prezzo IS NOT NULL THEN
      v_riga_importo := ROUND(v_prezzo * v_kg, 2);
    END IF;
    IF v_prezzo IS NULL AND v_riga_importo IS NOT NULL AND v_kg > 0 THEN
      v_prezzo := ROUND(v_riga_importo / v_kg, 4);
    END IF;
    IF v_riga_importo IS NULL THEN
      v_riga_importo := CASE WHEN v_index = 0 THEN COALESCE(p_importo, 0) ELSE 0 END;
    END IF;
    v_somma_righe := v_somma_righe + COALESCE(v_riga_importo, 0);

    INSERT INTO public.privati_conferimenti (
      tenant_id, impianto_id, cer, kg_pesati, nome_privato, cf_pi,
      importo_pagato, prezzo_kg, metodo_pag, note, privato_id, tipo_utenza,
      targa_automezzo, modello_automezzo, data, gruppo_id
    ) VALUES (
      p_tenant_id, p_impianto_id, v_cer, v_kg, p_nome_privato, NULLIF(p_cf_pi, ''),
      v_riga_importo, v_prezzo,
      NULLIF(p_metodo_pag, ''), NULLIF(p_note, ''), p_privato_id,
      COALESCE(NULLIF(p_tipo_utenza, ''), 'domestica'), NULLIF(p_targa, ''),
      NULLIF(p_modello, ''), COALESCE(p_data, CURRENT_DATE), v_gruppo_id
    )
    RETURNING id INTO v_id;

    IF v_index = 0 THEN v_primo_id := v_id; END IF;
    v_ids := v_ids || jsonb_build_array(v_id);
    v_index := v_index + 1;
  END LOOP;

  IF (SELECT count(*) FROM public.movimenti_impianto WHERE privati_conferimento_id IN (SELECT jsonb_array_elements_text(v_ids)::uuid)) <> v_index THEN
    RAISE EXCEPTION 'Operazione annullata: non tutti i movimenti di magazzino sono stati creati';
  END IF;

  IF (SELECT count(*) FROM public.ricevute_privati WHERE conferimento_id IN (SELECT jsonb_array_elements_text(v_ids)::uuid)) <> v_index THEN
    RAISE EXCEPTION 'Operazione annullata: non tutte le ricevute sono state create';
  END IF;

  SELECT numero_ricevuta INTO v_numero_ricevuta FROM public.ricevute_privati WHERE conferimento_id = v_primo_id;

  RETURN jsonb_build_object(
    'gruppo_id', v_gruppo_id,
    'conferimento_ids', v_ids,
    'numero_ricevuta', v_numero_ricevuta,
    'totale_kg', v_totale_nuovo,
    'totale_importo', CASE WHEN v_somma_righe > 0 THEN v_somma_righe ELSE COALESCE(p_importo, 0) END
  );
END;
$function$;