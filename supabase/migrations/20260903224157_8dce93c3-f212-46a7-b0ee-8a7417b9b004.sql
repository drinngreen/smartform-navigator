
CREATE OR REPLACE FUNCTION public.system_health_check()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  res jsonb := '[]'::jsonb;
  n bigint;
BEGIN
  SELECT count(*) INTO n FROM (
    SELECT sm.item_id, sm.warehouse_id,
           sum(CASE WHEN sm.sign='PLUS' THEN sm.quantity WHEN sm.sign='MINUS' THEN -sm.quantity ELSE 0 END) saldo
    FROM dragon_stock_movements sm WHERE sm.test_session IS NULL GROUP BY 1,2
  ) t WHERE saldo < -0.001;
  res := res || jsonb_build_object('check','Giacenze Dragon mai negative','anomalie',n);

  SELECT count(*) INTO n FROM magazzino_giacenze WHERE quantita_kg < -0.001;
  res := res || jsonb_build_object('check','Giacenze magazzino mai negative','anomalie',n);

  SELECT count(*) INTO n FROM (
    SELECT coalesce(dd.kg,0) - coalesce(mm.kg,0) delta
    FROM (
      SELECT sm.company_id tenant, upper(i.codice_cer) cer,
             sum(CASE WHEN sm.sign='PLUS' THEN sm.quantity WHEN sm.sign='MINUS' THEN -sm.quantity ELSE 0 END) kg
      FROM dragon_stock_movements sm JOIN dragon_items i ON i.id = sm.item_id
      WHERE sm.test_session IS NULL GROUP BY 1,2
    ) dd
    FULL OUTER JOIN (
      SELECT tenant_id tenant, upper(cer) cer, sum(quantita_kg) kg FROM magazzino_giacenze GROUP BY 1,2
    ) mm ON mm.cer = dd.cer AND mm.tenant = dd.tenant
  ) t WHERE abs(delta) > 0.5;
  res := res || jsonb_build_object('check','Registro Dragon allineato al magazzino','anomalie',n);

  -- allineamento automatico bidirezionale: magazzino -> dragon e dragon -> magazzino
  SELECT greatest(2 - count(*), 0) INTO n FROM pg_trigger
   WHERE NOT tgisinternal AND tgname IN (
     'trg_magazzino_sync_to_dragon',
     'trg_dragon_sync_stock_to_magazzino',
     'trg_dragon_strict_stock_reconciliation'
   );
  res := res || jsonb_build_object('check','Controlli automatici di allineamento attivi','anomalie',n);

  SELECT count(*) INTO n FROM privati_conferimenti pc
   WHERE NOT EXISTS (SELECT 1 FROM ricevute_privati r WHERE r.conferimento_id = pc.id);
  res := res || jsonb_build_object('check','Ogni conferimento privato ha la ricevuta','anomalie',n);

  SELECT count(*) INTO n FROM ricevute_privati r
   WHERE (r.conferimento_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM privati_conferimenti pc WHERE pc.id = r.conferimento_id))
      OR EXISTS (SELECT 1 FROM privati_conferimenti pc WHERE pc.id = r.conferimento_id AND r.data_emissione::date < pc.data::date);
  res := res || jsonb_build_object('check','Ricevute coerenti con i movimenti','anomalie',n);

  SELECT (SELECT count(*) FROM (SELECT upper(codice_cer) c FROM dragon_items WHERE attivo GROUP BY 1 HAVING count(DISTINCT codice_cer) > 1) a)
       + (SELECT count(*) FROM (SELECT tenant_id, upper(cer) c FROM magazzino_giacenze GROUP BY 1,2 HAVING count(DISTINCT cer) > 1) b)
    INTO n;
  res := res || jsonb_build_object('check','Nessun codice materiale duplicato','anomalie',n);

  SELECT (SELECT count(*) FROM (SELECT numero_fir FROM fir_forms WHERE numero_fir IS NOT NULL AND coalesce(deleted_by_user,false)=false GROUP BY 1 HAVING count(*)>1) a)
       + (SELECT count(*) FROM (SELECT fir_number FROM fir_number_pool GROUP BY 1 HAVING count(*)>1) b)
    INTO n;
  res := res || jsonb_build_object('check','Nessun numero formulario duplicato','anomalie',n);

  -- confronto invii RENTRI privati: la sigla materiale storica MET corrisponde all attuale MIX
  WITH norm AS (
    SELECT pc.id, pc.data::date d,
           replace(replace(upper(pc.cer),' MET MIX','-MIX'),'-MET','-MIX') c,
           round(pc.kg_pesati::numeric,2) k
    FROM privati_conferimenti pc
    WHERE pc.data >= '2026-01-01' AND pc.tenant_id = '77ec9a3d-602e-438f-97bf-1c69abd8f691'
  )
  SELECT count(*) INTO n FROM norm nn
   WHERE NOT EXISTS (
     SELECT 1 FROM rentri_registro_esiti e
      WHERE e.registro_label = 'MULTY_PRIVATI'
        AND e.data_movimento = nn.d
        AND replace(replace(upper(e.cer),' MET MIX','-MIX'),'-MET','-MIX') = nn.c
        AND abs(e.quantita_kg - nn.k) < 0.51);
  res := res || jsonb_build_object('check','Movimenti privati con ricevuta RENTRI','anomalie',n);

  SELECT count(*) INTO n FROM cernite c
   WHERE c.stato = 'completata'
     AND NOT EXISTS (SELECT 1 FROM cernita_output o WHERE o.cernita_id = c.id);
  res := res || jsonb_build_object('check','Cernite completate con materiali in uscita','anomalie',n);

  RETURN jsonb_build_object(
    'generated_at', now(),
    'ok', NOT EXISTS (SELECT 1 FROM jsonb_array_elements(res) x WHERE (x->>'anomalie')::bigint > 0),
    'checks', res
  );
END;
$function$;
