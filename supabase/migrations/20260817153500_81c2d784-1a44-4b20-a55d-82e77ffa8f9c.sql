INSERT INTO public.movimenti_impianto (
  tenant_id, impianto_id, tipo_movimento, ruolo_impianto, cer, descrizione_rifiuto,
  quantita_kg, data_movimento, origine, produttore_denominazione,
  destinatario_denominazione, esito_accettazione, note
)
SELECT m.tenant_id, m.impianto_id, 'SCARICO', 'TRATTAMENTO_INTERNO', m.cer, m.descrizione_rifiuto,
       m.quantita_kg, DATE '2026-08-17', 'rettifica', 'Rettifica inventario',
       'Multyproget', 'accettato',
       'Storno allineamento 17/08/2026 — conferimento gia incluso nel saldo ufficiale (mov. '||m.id::text||')'
FROM public.movimenti_impianto m
WHERE m.id IN (
  '312414f2-139d-4956-a4d6-99170c971dd2',
  '7fa1d0f4-87ff-45fb-9f12-81e9a2e91b45',
  'b82fae98-894b-4520-8ae5-27714c49c6de',
  '85b371e1-3305-4cb4-ac9b-676b656c8250',
  '721327b2-b7f7-4e0d-b7ad-d34387d04a88'
);

DO $s2$
DECLARE
  T uuid := '77ec9a3d-602e-438f-97bf-1c69abd8f691';
  v_user uuid; f_num int; f_id uuid; fir_id uuid; cnt int; tot numeric;
BEGIN
  SELECT id INTO v_user FROM public.profiles LIMIT 1;

  BEGIN
    f_num := public.next_fattura_number(T, 2026);
    INSERT INTO public.fatture(tenant_id,numero,anno,cliente_ragione_sociale,imponibile,iva,totale,note)
    VALUES (T,f_num,2026,'ZZ_STRESS_TEST SRL',1000,220,1220,'STRESS_TEST') RETURNING id INTO f_id;
    INSERT INTO public.fatture_righe(fattura_id,descrizione,quantita,prezzo_unitario,aliquota_iva,imponibile,iva,totale)
    VALUES (f_id,'Servizio test',1,1000,22,1000,220,1220);
    SELECT count(*) INTO cnt FROM public.fatture_righe WHERE fattura_id=f_id;
    INSERT INTO public._stress_log(step,val) VALUES ('4. FATTURAZIONE (retry)',
      format('numero=%s righe=%s | ESITO=%s', f_num, cnt, CASE WHEN f_num>0 AND cnt=1 THEN 'OK' ELSE 'FALLITO' END));
    DELETE FROM public.fatture_righe WHERE fattura_id=f_id;
    DELETE FROM public.fatture WHERE id=f_id;
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO public._stress_log(step,val) VALUES ('4. FATTURAZIONE (retry)', 'ERRORE: '||SQLERRM);
  END;

  BEGIN
    INSERT INTO public.fir_forms(user_id,tenant_id,status,numero_fir)
    VALUES (v_user,T,'bozza','ZZSTRESS0001') RETURNING id INTO fir_id;
    SELECT count(*) INTO cnt FROM public.fir_forms WHERE id=fir_id AND numero_fir='ZZSTRESS0001';
    INSERT INTO public._stress_log(step,val) VALUES ('5. FORMULARIO MANUALE (retry)',
      format('numero conservato=%s | ESITO=%s', cnt, CASE WHEN cnt=1 THEN 'OK' ELSE 'FALLITO (numero sovrascritto)' END));
    DELETE FROM public.fir_forms WHERE id=fir_id;
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO public._stress_log(step,val) VALUES ('5. FORMULARIO MANUALE (retry)', 'ERRORE: '||SQLERRM);
  END;

  SELECT COALESCE(SUM(quantita_kg),0) INTO tot FROM public.magazzino_giacenze;
  SELECT count(*) INTO cnt FROM public.fir_forms WHERE numero_fir LIKE 'ZZSTRESS%';
  INSERT INTO public._stress_log(step,val) VALUES ('8. TOTALE GIACENZE POST-STORNO',
    format('%s kg | residui test=%s', tot, cnt));
END;
$s2$;