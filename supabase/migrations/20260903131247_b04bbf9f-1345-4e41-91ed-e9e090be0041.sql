
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
  v_cer text;
BEGIN
  IF p_tenant_id IS NULL OR p_impianto_id IS NULL OR p_cer IS NULL OR btrim(p_cer) = '' THEN
    RAISE EXCEPTION 'Giacenza non ricalcolabile: tenant, impianto o CER mancante';
  END IF;

  v_cer := public.normalize_cer(p_cer);

  PERFORM pg_advisory_xact_lock(public.inventory_lock_key(p_tenant_id, p_impianto_id, v_cer));

  SELECT saldo_iniziale_kg, saldo_snapshot_at
    INTO v_baseline, v_snapshot
  FROM public.magazzino_giacenze
  WHERE tenant_id = p_tenant_id AND impianto_id = p_impianto_id AND cer = v_cer
  FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO public.magazzino_giacenze (
      tenant_id, impianto_id, cer, quantita_kg, saldo_iniziale_kg, saldo_snapshot_at, stato, updated_at
    ) VALUES (
      p_tenant_id, p_impianto_id, v_cer, 0, 0, NULL, 'stoccato', now()
    )
    ON CONFLICT (tenant_id, impianto_id, cer) DO NOTHING;

    SELECT saldo_iniziale_kg, saldo_snapshot_at
      INTO v_baseline, v_snapshot
    FROM public.magazzino_giacenze
    WHERE tenant_id = p_tenant_id AND impianto_id = p_impianto_id AND cer = v_cer
    FOR UPDATE;
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

  UPDATE public.magazzino_giacenze
  SET quantita_kg = COALESCE(v_baseline, 0) + v_delta,
      ultimo_carico_at = CASE WHEN v_delta > 0 THEN now() ELSE ultimo_carico_at END,
      ultimo_scarico_at = CASE WHEN v_delta < 0 THEN now() ELSE ultimo_scarico_at END,
      updated_at = now()
  WHERE tenant_id = p_tenant_id AND impianto_id = p_impianto_id AND cer = v_cer;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Ricalcolo giacenza non completato per CER %', v_cer;
  END IF;
END;
$function$;
