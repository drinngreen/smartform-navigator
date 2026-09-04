CREATE OR REPLACE FUNCTION public.recalculate_magazzino_giacenza(p_tenant_id uuid, p_impianto_id uuid, p_cer text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_baseline numeric := 0;
  v_snapshot timestamptz;
  v_delta numeric := 0;
  v_cernita numeric := 0;
  v_cernita_impianto uuid;
  v_cer text;
  v_id uuid;
BEGIN
  IF p_tenant_id IS NULL OR p_impianto_id IS NULL OR p_cer IS NULL OR btrim(p_cer) = '' THEN
    RETURN;
  END IF;

  v_cer := public.normalize_cer(p_cer);
  PERFORM pg_advisory_xact_lock(public.inventory_lock_key(p_tenant_id, p_impianto_id, v_cer));

  SELECT id, saldo_iniziale_kg, saldo_snapshot_at
    INTO v_id, v_baseline, v_snapshot
  FROM public.magazzino_giacenze
  WHERE tenant_id = p_tenant_id AND impianto_id = p_impianto_id
    AND public.normalize_cer(cer) = v_cer
  ORDER BY (cer = v_cer) DESC, created_at NULLS LAST
  LIMIT 1
  FOR UPDATE;

  IF v_id IS NULL THEN
    INSERT INTO public.magazzino_giacenze (
      tenant_id, impianto_id, cer, quantita_kg, saldo_iniziale_kg, saldo_snapshot_at, stato, updated_at
    ) VALUES (
      p_tenant_id, p_impianto_id, v_cer, 0, 0, NULL, 'stoccato', now()
    )
    ON CONFLICT (tenant_id, impianto_id, cer) DO UPDATE SET updated_at = now()
    RETURNING id, saldo_iniziale_kg, saldo_snapshot_at INTO v_id, v_baseline, v_snapshot;
  END IF;

  SELECT COALESCE(SUM(
    CASE
      WHEN tipo_movimento = 'CARICO' THEN quantita_kg
      WHEN tipo_movimento = 'SCARICO' THEN -quantita_kg
      ELSE 0
    END
  ), 0)
  INTO v_delta
  FROM public.movimenti_impianto
  WHERE tenant_id = p_tenant_id
    AND impianto_id = p_impianto_id
    AND public.normalize_cer(cer) = v_cer
    AND (v_snapshot IS NULL OR created_at > v_snapshot);

  -- Impianto di riferimento per gli effetti delle cernite (Dragon non ha impianto):
  -- lo stesso scelto da dragon_reconcile_item_to_magazzino.
  SELECT impianto_id INTO v_cernita_impianto
    FROM public.magazzino_giacenze
   WHERE tenant_id = p_tenant_id
     AND public.normalize_cer(cer) = v_cer
     AND impianto_id IS NOT NULL
   ORDER BY (cer = v_cer) DESC, updated_at DESC NULLS LAST, id
   LIMIT 1;

  IF v_cernita_impianto IS NULL THEN
    SELECT id INTO v_cernita_impianto
      FROM public.impianti
     WHERE tenant_id = p_tenant_id
     ORDER BY created_at, id
     LIMIT 1;
  END IF;

  IF v_cernita_impianto = p_impianto_id THEN
    SELECT COALESCE(SUM(CASE sm.sign WHEN 'PLUS' THEN sm.quantity WHEN 'MINUS' THEN -sm.quantity ELSE 0 END), 0)
      INTO v_cernita
      FROM public.dragon_stock_movements sm
      JOIN public.dragon_items it ON it.id = sm.item_id
      JOIN public.dragon_transform_batches tb ON tb.id = sm.source_transform_batch_id
     WHERE sm.company_id = p_tenant_id
       AND sm.warehouse_scope = 'WASTE'
       AND sm.test_session IS NULL
       AND it.test_session IS NULL
       AND tb.test_session IS NULL
       AND tb.status <> 'ANNULLATA'
       AND public.normalize_cer(it.codice_cer) = v_cer
       AND (v_snapshot IS NULL OR sm.created_at > v_snapshot);
  END IF;

  UPDATE public.magazzino_giacenze
  SET quantita_kg = COALESCE(v_baseline, 0) + v_delta + COALESCE(v_cernita, 0),
      ultimo_carico_at = CASE WHEN v_delta > 0 THEN now() ELSE ultimo_carico_at END,
      ultimo_scarico_at = CASE WHEN v_delta < 0 THEN now() ELSE ultimo_scarico_at END,
      updated_at = now()
  WHERE id = v_id;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_user_tenant(uuid) TO authenticated, anon;