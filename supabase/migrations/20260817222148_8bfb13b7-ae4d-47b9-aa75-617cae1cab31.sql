CREATE OR REPLACE FUNCTION public.crea_conferimento_privato_atomico(
  p_tenant_id uuid,
  p_impianto_id uuid,
  p_privato_id uuid,
  p_nome_privato text,
  p_cf_pi text,
  p_tipo_utenza text,
  p_materiali jsonb,
  p_data date,
  p_importo numeric,
  p_metodo_pag text,
  p_note text,
  p_targa text,
  p_modello text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_gruppo_id uuid := gen_random_uuid();
  v_anno integer := EXTRACT(YEAR FROM COALESCE(p_data, CURRENT_DATE))::integer;
  v_totale_esistente numeric;
  v_totale_nuovo numeric;
  v_numero_ricevuta text;
  v_primo_id uuid;
  v_primo_progressivo integer;
  v_primo_anno integer;
  v_riga jsonb;
  v_cer text;
  v_kg numeric;
  v_id uuid;
  v_ids jsonb := '[]'::jsonb;
  v_dettaglio text := '';
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
  PERFORM pg_advisory_xact_lock(hashtextextended(p_impianto_id::text || '|' || v_anno::text || '|ricevuta', 0));

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

    INSERT INTO public.privati_conferimenti (
      tenant_id, impianto_id, cer, kg_pesati, nome_privato, cf_pi,
      importo_pagato, metodo_pag, note, privato_id, tipo_utenza,
      targa_automezzo, modello_automezzo, data, gruppo_id
    ) VALUES (
      p_tenant_id, p_impianto_id, v_cer, v_kg, p_nome_privato, NULLIF(p_cf_pi, ''),
      CASE WHEN v_index = 0 THEN p_importo ELSE 0 END,
      NULLIF(p_metodo_pag, ''), NULLIF(p_note, ''), p_privato_id,
      COALESCE(NULLIF(p_tipo_utenza, ''), 'domestica'), NULLIF(p_targa, ''),
      NULLIF(p_modello, ''), COALESCE(p_data, CURRENT_DATE), v_gruppo_id
    )
    RETURNING id, numero_progressivo, anno_dbt INTO v_id, v_primo_progressivo, v_primo_anno;

    IF v_index = 0 THEN v_primo_id := v_id; END IF;
    v_ids := v_ids || jsonb_build_array(v_id);
    v_dettaglio := concat_ws(' | ', NULLIF(v_dettaglio, ''), 'CER ' || v_cer || ' — ' || v_kg || ' kg');
    v_index := v_index + 1;
  END LOOP;

  SELECT public.next_ricevuta_number(p_impianto_id, v_anno) INTO v_numero_ricevuta;

  INSERT INTO public.ricevute_privati (
    tenant_id, impianto_id, conferimento_id, privato_id, numero_ricevuta,
    anno, data_emissione, importo, gruppo_id, note
  ) VALUES (
    p_tenant_id, p_impianto_id, v_primo_id, p_privato_id, v_numero_ricevuta,
    v_anno, COALESCE(p_data, CURRENT_DATE), COALESCE(p_importo, 0), v_gruppo_id,
    'DBT #' || COALESCE(v_primo_progressivo::text, '-') || '/' || COALESCE(v_primo_anno, v_anno)::text ||
    ' — ' || p_nome_privato || ' — ' || v_dettaglio || ' — Totale ' || v_totale_nuovo ||
    ' kg — Pag.: ' || CASE WHEN p_metodo_pag = 'contanti' THEN 'Contanti' ELSE 'Tracciabile/Politico' END ||
    CASE WHEN NULLIF(p_targa, '') IS NOT NULL THEN ' — Targa: ' || p_targa ELSE '' END
  );

  IF (SELECT count(*) FROM public.movimenti_impianto WHERE privati_conferimento_id IN (SELECT jsonb_array_elements_text(v_ids)::uuid)) <> v_index THEN
    RAISE EXCEPTION 'Operazione annullata: non tutti i movimenti di magazzino sono stati creati';
  END IF;

  RETURN jsonb_build_object(
    'gruppo_id', v_gruppo_id,
    'conferimento_ids', v_ids,
    'numero_ricevuta', v_numero_ricevuta,
    'totale_kg', v_totale_nuovo
  );
END;
$$;

REVOKE ALL ON FUNCTION public.crea_conferimento_privato_atomico(uuid, uuid, uuid, text, text, text, jsonb, date, numeric, text, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.crea_conferimento_privato_atomico(uuid, uuid, uuid, text, text, text, jsonb, date, numeric, text, text, text, text) TO authenticated, service_role;