DO $s3$
DECLARE T uuid := '77ec9a3d-602e-438f-97bf-1c69abd8f691'; v_user uuid; fir_id uuid; cnt int; num text;
BEGIN
  SELECT user_id INTO v_user FROM public.fir_forms WHERE user_id IS NOT NULL ORDER BY created_at DESC LIMIT 1;
  BEGIN
    INSERT INTO public.fir_forms(user_id,tenant_id,status,numero_fir)
    VALUES (v_user,T,'bozza','ZZSTRESS0001') RETURNING id INTO fir_id;
    SELECT numero_fir INTO num FROM public.fir_forms WHERE id=fir_id;
    INSERT INTO public._stress_log(step,val) VALUES ('5. FORMULARIO MANUALE (retry2)',
      format('numero=%s | ESITO=%s', num, CASE WHEN num='ZZSTRESS0001' THEN 'OK' ELSE 'FALLITO (sovrascritto)' END));
    DELETE FROM public.fir_forms WHERE id=fir_id;
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO public._stress_log(step,val) VALUES ('5. FORMULARIO MANUALE (retry2)', 'ERRORE: '||SQLERRM);
  END;
  SELECT count(*) INTO cnt FROM public.fir_forms WHERE numero_fir LIKE 'ZZSTRESS%';
  INSERT INTO public._stress_log(step,val) VALUES ('9. RESIDUI FIR TEST', cnt::text);
END;
$s3$;