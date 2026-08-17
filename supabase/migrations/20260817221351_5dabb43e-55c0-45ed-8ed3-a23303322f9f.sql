DO $$
DECLARE
  v_tenant uuid := '77ec9a3d-602e-438f-97bf-1c69abd8f691';
  v_imp uuid := 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
  r record;
BEGIN
  FOR r IN
    SELECT * FROM (VALUES
      ('200140', 324::numeric),
      ('200140-CAVO', 1394),
      ('200140-fe', 520),
      ('200140-OT', 271),
      ('200140-PI', 216),
      ('200140-RA', 900)
    ) AS t(cer, kg)
  LOOP
    INSERT INTO public.movimenti_impianto
      (impianto_id, tenant_id, cer, quantita_kg, tipo_movimento, ruolo_impianto, data_movimento, note)
    VALUES
      (v_imp, v_tenant, r.cer, r.kg, 'CARICO', 'DESTINATARIO', '2026-08-17'::timestamptz,
       'Ripristino conferimenti privati 17/08/2026 annullati per errore dall''allineamento');
  END LOOP;

  FOR r IN
    SELECT DISTINCT cer FROM public.movimenti_impianto WHERE tenant_id = v_tenant
  LOOP
    PERFORM public.recalculate_magazzino_giacenza(v_tenant, v_imp, r.cer);
  END LOOP;
END $$;