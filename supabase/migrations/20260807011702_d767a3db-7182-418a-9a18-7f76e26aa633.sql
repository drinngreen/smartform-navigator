
TRUNCATE public._stress_log;
DO $$
DECLARE
  v_tenant uuid := '77ec9a3d-602e-438f-97bf-1c69abd8f691';
  v_imp uuid := 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
  v_mov uuid; v_priv uuid; v_conf uuid;
  v0 numeric; v1 numeric; v2 numeric; p0 numeric; p1 numeric; p2 numeric;
BEGIN
  SELECT quantita_kg INTO v0 FROM magazzino_giacenze WHERE tenant_id=v_tenant AND impianto_id=v_imp AND cer='170405';
  INSERT INTO movimenti_impianto (tenant_id, impianto_id, cer, tipo_movimento, ruolo_impianto, quantita_kg, data_movimento, origine, note)
  VALUES (v_tenant, v_imp, '170405', 'CARICO', 'DESTINATARIO', 1000, now(), 'formulario', '[STRESS TEST]') RETURNING id INTO v_mov;
  SELECT quantita_kg INTO v1 FROM magazzino_giacenze WHERE tenant_id=v_tenant AND impianto_id=v_imp AND cer='170405';
  DELETE FROM movimenti_impianto WHERE id=v_mov;
  SELECT quantita_kg INTO v2 FROM magazzino_giacenze WHERE tenant_id=v_tenant AND impianto_id=v_imp AND cer='170405';
  INSERT INTO public._stress_log(step,val) VALUES ('MOVIMENTO/FIR 170405', format('start=%s carico=%s delete=%s OK=%s', v0,v1,v2, (v1-v0=1000 AND v2=v0)));

  SELECT quantita_kg INTO p0 FROM magazzino_giacenze WHERE tenant_id=v_tenant AND impianto_id=v_imp AND cer='080112';
  INSERT INTO anagrafica_privati (tenant_id, nome, cognome, codice_fiscale, tipo_utenza, attivo)
  VALUES (v_tenant, 'STRESS', 'TEST', 'STRSTS80A01H501Z', 'domestica', true) RETURNING id INTO v_priv;
  INSERT INTO privati_conferimenti (tenant_id, impianto_id, privato_id, nome_privato, cer, kg_pesati, data, note)
  VALUES (v_tenant, v_imp, v_priv, 'STRESS TEST', '080112', 50, now(), '[STRESS TEST]') RETURNING id INTO v_conf;
  SELECT quantita_kg INTO p1 FROM magazzino_giacenze WHERE tenant_id=v_tenant AND impianto_id=v_imp AND cer='080112';
  DELETE FROM privati_conferimenti WHERE id=v_conf;
  DELETE FROM anagrafica_privati WHERE id=v_priv;
  SELECT quantita_kg INTO p2 FROM magazzino_giacenze WHERE tenant_id=v_tenant AND impianto_id=v_imp AND cer='080112';
  INSERT INTO public._stress_log(step,val) VALUES ('PRIVATI 080112', format('start=%s conf=%s delete=%s OK=%s', p0,p1,p2, (p1-p0=50 AND p2=p0)));
  INSERT INTO public._stress_log(step,val) VALUES ('RESIDUI TEST', (SELECT count(*)::text FROM privati_conferimenti WHERE note='[STRESS TEST]') || ' conf / ' || (SELECT count(*)::text FROM movimenti_impianto WHERE note='[STRESS TEST]') || ' mov');
  INSERT INTO public._stress_log(step,val) VALUES ('TOTALE GIACENZE', (SELECT round(sum(quantita_kg),3)::text FROM magazzino_giacenze));
EXCEPTION WHEN OTHERS THEN
  INSERT INTO public._stress_log(step,val) VALUES ('ERRORE', SQLERRM);
END $$;
