-- 1) Backfill tenant_id + rinumerazione progressivo DBT senza collisioni
DO $fix$
DECLARE r record; v_next int;
BEGIN
  FOR r IN
    SELECT c.id, i.tenant_id AS tid, COALESCE(c.anno_dbt, EXTRACT(year FROM c.data)::int) AS anno
    FROM public.privati_conferimenti c JOIN public.impianti i ON i.id = c.impianto_id
    WHERE c.tenant_id IS NULL
    ORDER BY c.data
  LOOP
    SELECT COALESCE(MAX(numero_progressivo),0)+1 INTO v_next
    FROM public.privati_conferimenti WHERE tenant_id = r.tid AND anno_dbt = r.anno;
    UPDATE public.privati_conferimenti
    SET tenant_id = r.tid, anno_dbt = r.anno, numero_progressivo = v_next
    WHERE id = r.id;
  END LOOP;
END;
$fix$;

-- 2) Numerazione ricevute robusta (max+1 invece di count+1)
CREATE OR REPLACE FUNCTION public.next_ricevuta_number(p_impianto_id uuid, p_anno integer)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_next INTEGER;
BEGIN
  SELECT COALESCE(MAX(NULLIF(regexp_replace(split_part(numero_ricevuta, '/', 1), '\D', '', 'g'), '')::int), 0) + 1
  INTO v_next
  FROM public.ricevute_privati
  WHERE impianto_id = p_impianto_id AND anno = p_anno;
  RETURN LPAD(v_next::TEXT, 5, '0') || '/' || p_anno::TEXT;
END;
$$;

-- 2b) Rinumera le ricevute duplicate
DO $dup$
DECLARE r record; v_next int;
BEGIN
  FOR r IN
    SELECT id, impianto_id, anno FROM (
      SELECT id, impianto_id, anno,
             row_number() OVER (PARTITION BY impianto_id, anno, numero_ricevuta ORDER BY created_at) rn
      FROM public.ricevute_privati) x WHERE rn > 1
  LOOP
    SELECT COALESCE(MAX(NULLIF(regexp_replace(split_part(numero_ricevuta,'/',1),'\D','','g'),'')::int),0)+1
    INTO v_next FROM public.ricevute_privati WHERE impianto_id=r.impianto_id AND anno=r.anno;
    UPDATE public.ricevute_privati
    SET numero_ricevuta = LPAD(v_next::text,5,'0')||'/'||r.anno::text WHERE id = r.id;
  END LOOP;
END;
$dup$;

CREATE UNIQUE INDEX IF NOT EXISTS ricevute_privati_num_uniq
  ON public.ricevute_privati (impianto_id, anno, numero_ricevuta);

-- 3) STRESS TEST (tutti i dati creati vengono eliminati alla fine)
DELETE FROM public._stress_log;

DO $stress$
DECLARE
  T uuid := '77ec9a3d-602e-438f-97bf-1c69abd8f691';
  I uuid := 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
  v_user uuid;
  g1 numeric; g2 numeric; g1b numeric; g2b numeric; g1c numeric; g2c numeric;
  v_gruppo uuid := gen_random_uuid();
  c1 uuid; c2 uuid; n1 int; n2 int;
  r1 text; r2 text; ric1 uuid; ric2 uuid;
  f_num int; f_id uuid;
  fir_id uuid;
  cer_id uuid;
  tot_start numeric; tot_end numeric;
  cnt int;
BEGIN
  SELECT COALESCE(SUM(quantita_kg),0) INTO tot_start FROM public.magazzino_giacenze;
  SELECT id INTO v_user FROM public.profiles LIMIT 1;

  BEGIN
    SELECT COALESCE(quantita_kg,0) INTO g1 FROM public.magazzino_giacenze WHERE tenant_id=T AND impianto_id=I AND cer='200140-fe';
    SELECT COALESCE(quantita_kg,0) INTO g2 FROM public.magazzino_giacenze WHERE tenant_id=T AND impianto_id=I AND cer='200140-RA';
    g1 := COALESCE(g1,0); g2 := COALESCE(g2,0);

    INSERT INTO public.privati_conferimenti (impianto_id, tenant_id, nome_privato, cf_pi, cer, kg_pesati, gruppo_id, note)
    VALUES (I, T, 'ZZ_STRESS_TEST', 'STRTST00A01H501Z', '200140-fe', 150, v_gruppo, 'STRESS_TEST') RETURNING id, numero_progressivo INTO c1, n1;
    INSERT INTO public.privati_conferimenti (impianto_id, tenant_id, nome_privato, cf_pi, cer, kg_pesati, gruppo_id, note)
    VALUES (I, T, 'ZZ_STRESS_TEST', 'STRTST00A01H501Z', '200140-RA', 80, v_gruppo, 'STRESS_TEST') RETURNING id, numero_progressivo INTO c2, n2;

    SELECT quantita_kg INTO g1b FROM public.magazzino_giacenze WHERE tenant_id=T AND impianto_id=I AND cer='200140-fe';
    SELECT quantita_kg INTO g2b FROM public.magazzino_giacenze WHERE tenant_id=T AND impianto_id=I AND cer='200140-RA';
    SELECT count(*) INTO cnt FROM public.movimenti_impianto WHERE note LIKE '%'||c1::text||'%' OR note LIKE '%'||c2::text||'%';

    INSERT INTO public._stress_log(step,val) VALUES ('1. CONFERIMENTO MULTI-MATERIALE',
      format('fe %s->%s (atteso %s) | ra %s->%s (atteso %s) | movimenti=%s | progressivi %s/%s | ESITO=%s',
        g1,g1b,g1+150,g2,g2b,g2+80,cnt,n1,n2,
        CASE WHEN g1b=g1+150 AND g2b=g2+80 AND cnt=2 AND n1<>n2 AND n1 IS NOT NULL THEN 'OK' ELSE 'FALLITO' END));

    r1 := public.next_ricevuta_number(I, 2026);
    INSERT INTO public.ricevute_privati(tenant_id,impianto_id,conferimento_id,gruppo_id,numero_ricevuta,anno,importo,note)
    VALUES (T,I,c1,v_gruppo,r1,2026,0,'STRESS_TEST') RETURNING id INTO ric1;
    r2 := public.next_ricevuta_number(I, 2026);
    INSERT INTO public.ricevute_privati(tenant_id,impianto_id,conferimento_id,gruppo_id,numero_ricevuta,anno,importo,note)
    VALUES (T,I,c2,v_gruppo,r2,2026,0,'STRESS_TEST') RETURNING id INTO ric2;
    INSERT INTO public._stress_log(step,val) VALUES ('2. NUMERAZIONE RICEVUTE',
      format('%s / %s | ESITO=%s', r1, r2, CASE WHEN r1<>r2 THEN 'OK' ELSE 'FALLITO (duplicato)' END));

    DELETE FROM public.ricevute_privati WHERE id IN (ric1,ric2);

    DELETE FROM public.privati_conferimenti WHERE id IN (c1,c2);
    SELECT quantita_kg INTO g1c FROM public.magazzino_giacenze WHERE tenant_id=T AND impianto_id=I AND cer='200140-fe';
    SELECT quantita_kg INTO g2c FROM public.magazzino_giacenze WHERE tenant_id=T AND impianto_id=I AND cer='200140-RA';
    INSERT INTO public._stress_log(step,val) VALUES ('3. REVERSAL GIACENZE SU ELIMINAZIONE',
      format('fe %s (atteso %s) | ra %s (atteso %s) | ESITO=%s', g1c,g1,g2c,g2,
        CASE WHEN g1c=g1 AND g2c=g2 THEN 'OK' ELSE 'FALLITO' END));
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO public._stress_log(step,val) VALUES ('1-3. PRIVATI/RICEVUTE/GIACENZE', 'ERRORE: '||SQLERRM);
  END;

  BEGIN
    f_num := public.next_fattura_number(T, 2026);
    INSERT INTO public.fatture(tenant_id,numero,anno,numero_completo,cliente_ragione_sociale,imponibile,iva,totale,note)
    VALUES (T,f_num,2026,f_num||'/2026','ZZ_STRESS_TEST SRL',1000,220,1220,'STRESS_TEST') RETURNING id INTO f_id;
    INSERT INTO public.fatture_righe(fattura_id,descrizione,quantita,prezzo_unitario,aliquota_iva,imponibile,iva,totale)
    VALUES (f_id,'Servizio test',1,1000,22,1000,220,1220);
    SELECT count(*) INTO cnt FROM public.fatture_righe WHERE fattura_id=f_id;
    INSERT INTO public._stress_log(step,val) VALUES ('4. FATTURAZIONE',
      format('numero=%s righe=%s | ESITO=%s', f_num, cnt, CASE WHEN f_num>0 AND cnt=1 THEN 'OK' ELSE 'FALLITO' END));
    DELETE FROM public.fatture_righe WHERE fattura_id=f_id;
    DELETE FROM public.fatture WHERE id=f_id;
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO public._stress_log(step,val) VALUES ('4. FATTURAZIONE', 'ERRORE: '||SQLERRM);
  END;

  BEGIN
    INSERT INTO public.fir_forms(user_id,tenant_id,status,numero_fir)
    VALUES (v_user,T,'DRAFT','ZZSTRESS0001') RETURNING id INTO fir_id;
    SELECT count(*) INTO cnt FROM public.fir_forms WHERE id=fir_id AND numero_fir='ZZSTRESS0001';
    INSERT INTO public._stress_log(step,val) VALUES ('5. FORMULARIO MANUALE',
      format('numero conservato=%s | ESITO=%s', cnt, CASE WHEN cnt=1 THEN 'OK' ELSE 'FALLITO (numero sovrascritto)' END));
    DELETE FROM public.fir_forms WHERE id=fir_id;
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO public._stress_log(step,val) VALUES ('5. FORMULARIO MANUALE', 'ERRORE: '||SQLERRM);
  END;

  BEGIN
    SELECT COALESCE(quantita_kg,0) INTO g1 FROM public.magazzino_giacenze WHERE tenant_id=T AND impianto_id=I AND cer='200140-fe';
    cer_id := public.esegui_cernita_atomica(T, I, '200140-fe', 100,
      '[{"cer":"200140-RA","quantita":60,"tipo":"rifiuto"},{"cer":"200140-OT","quantita":40,"tipo":"rifiuto"}]'::jsonb,
      'STRESS_TEST', CURRENT_DATE);
    SELECT quantita_kg INTO g1b FROM public.magazzino_giacenze WHERE tenant_id=T AND impianto_id=I AND cer='200140-fe';
    INSERT INTO public._stress_log(step,val) VALUES ('6. CERNITA ATOMICA',
      format('fe %s->%s (atteso %s) | ESITO=%s', g1,g1b,g1-100, CASE WHEN g1b=g1-100 THEN 'OK' ELSE 'FALLITO' END));
    DELETE FROM public.movimenti_impianto WHERE note LIKE '%'||cer_id::text||'%';
    DELETE FROM public.cernita_output WHERE cernita_id=cer_id;
    DELETE FROM public.cernite WHERE id=cer_id;
    SELECT quantita_kg INTO g1c FROM public.magazzino_giacenze WHERE tenant_id=T AND impianto_id=I AND cer='200140-fe';
    INSERT INTO public._stress_log(step,val) VALUES ('6b. ROLLBACK CERNITA',
      format('fe %s (atteso %s) | ESITO=%s', g1c,g1, CASE WHEN g1c=g1 THEN 'OK' ELSE 'FALLITO' END));
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO public._stress_log(step,val) VALUES ('6. CERNITA ATOMICA', 'ERRORE: '||SQLERRM);
  END;

  SELECT count(*) INTO cnt FROM public.privati_conferimenti WHERE nome_privato ILIKE 'ZZ_STRESS%' OR note='STRESS_TEST';
  SELECT COALESCE(SUM(quantita_kg),0) INTO tot_end FROM public.magazzino_giacenze;
  INSERT INTO public._stress_log(step,val) VALUES ('7. PULIZIA E INTEGRITA',
    format('residui=%s | totale giacenze %s -> %s | ESITO=%s', cnt, tot_start, tot_end,
      CASE WHEN cnt=0 AND tot_start=tot_end THEN 'OK' ELSE 'FALLITO' END));
END;
$stress$;