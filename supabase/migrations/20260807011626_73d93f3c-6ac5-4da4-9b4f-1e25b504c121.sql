
CREATE TABLE IF NOT EXISTS public._stress_log (id serial primary key, step text, val text, at timestamptz default now());
GRANT ALL ON public._stress_log TO service_role;
ALTER TABLE public._stress_log ENABLE ROW LEVEL SECURITY;
TRUNCATE public._stress_log;

DO $$
DECLARE
  v_tenant uuid := '77ec9a3d-602e-438f-97bf-1c69abd8f691';
  v_imp uuid := 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
  v_mov uuid;
  v_priv uuid;
  v_conf uuid;
  v0 numeric; v1 numeric; v2 numeric;
  p0 numeric; p1 numeric; p2 numeric;
BEGIN
  SELECT quantita_kg INTO v0 FROM magazzino_giacenze WHERE tenant_id=v_tenant AND impianto_id=v_imp AND cer='170405';
  INSERT INTO movimenti_impianto (tenant_id, impianto_id, cer, tipo_movimento, quantita_kg, data_movimento, note)
  VALUES (v_tenant, v_imp, '170405', 'CARICO', 1000, now(), '[STRESS TEST]') RETURNING id INTO v_mov;
  SELECT quantita_kg INTO v1 FROM magazzino_giacenze WHERE tenant_id=v_tenant AND impianto_id=v_imp AND cer='170405';
  DELETE FROM movimenti_impianto WHERE id=v_mov;
  SELECT quantita_kg INTO v2 FROM magazzino_giacenze WHERE tenant_id=v_tenant AND impianto_id=v_imp AND cer='170405';
  INSERT INTO public._stress_log(step,val) VALUES ('FIR/movimento 170405', format('start=%s dopo_carico=%s dopo_delete=%s ok=%s', v0,v1,v2, (v1-v0=1000 AND v2=v0)));

  SELECT quantita_kg INTO p0 FROM magazzino_giacenze WHERE tenant_id=v_tenant AND impianto_id=v_imp AND cer='080112';
  INSERT INTO anagrafica_privati (tenant_id, nome, cognome, codice_fiscale)
  VALUES (v_tenant, 'STRESS', 'TEST', 'STRSTS80A01H501Z') RETURNING id INTO v_priv;
  INSERT INTO privati_conferimenti (tenant_id, impianto_id, privato_id, cer, quantita_kg, data_conferimento, note)
  VALUES (v_tenant, v_imp, v_priv, '080112', 50, now(), '[STRESS TEST]') RETURNING id INTO v_conf;
  SELECT quantita_kg INTO p1 FROM magazzino_giacenze WHERE tenant_id=v_tenant AND impianto_id=v_imp AND cer='080112';
  DELETE FROM privati_conferimenti WHERE id=v_conf;
  DELETE FROM anagrafica_privati WHERE id=v_priv;
  SELECT quantita_kg INTO p2 FROM magazzino_giacenze WHERE tenant_id=v_tenant AND impianto_id=v_imp AND cer='080112';
  INSERT INTO public._stress_log(step,val) VALUES ('Privati 080112', format('start=%s dopo_conf=%s dopo_delete=%s ok=%s', p0,p1,p2, (p1-p0=50 AND p2=p0)));
EXCEPTION WHEN OTHERS THEN
  INSERT INTO public._stress_log(step,val) VALUES ('ERRORE', SQLERRM);
END $$;
