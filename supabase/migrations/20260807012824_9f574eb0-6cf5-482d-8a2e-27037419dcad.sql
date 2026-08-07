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
BEGIN
  IF p_tenant_id IS NULL OR p_impianto_id IS NULL OR p_cer IS NULL OR btrim(p_cer) = '' THEN
    RETURN;
  END IF;

  SELECT saldo_iniziale_kg, saldo_snapshot_at
    INTO v_baseline, v_snapshot
  FROM public.magazzino_giacenze
  WHERE tenant_id = p_tenant_id
    AND impianto_id = p_impianto_id
    AND cer = p_cer
  LIMIT 1;

  IF NOT FOUND THEN
    v_baseline := 0;
    v_snapshot := now();
    INSERT INTO public.magazzino_giacenze (
      tenant_id, impianto_id, cer, quantita_kg, saldo_iniziale_kg,
      saldo_snapshot_at, stato, updated_at
    ) VALUES (
      p_tenant_id, p_impianto_id, p_cer, 0, 0,
      v_snapshot, 'stoccato', now()
    )
    ON CONFLICT (tenant_id, impianto_id, cer) DO NOTHING;

    SELECT saldo_iniziale_kg, saldo_snapshot_at
      INTO v_baseline, v_snapshot
    FROM public.magazzino_giacenze
    WHERE tenant_id = p_tenant_id
      AND impianto_id = p_impianto_id
      AND cer = p_cer
    LIMIT 1;
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
    AND cer = p_cer
    AND (
      v_snapshot IS NULL
      OR created_at > v_snapshot
    );

  UPDATE public.magazzino_giacenze
  SET quantita_kg = COALESCE(v_baseline, 0) + v_delta,
      ultimo_carico_at = CASE WHEN v_delta > 0 THEN now() ELSE ultimo_carico_at END,
      updated_at = now()
  WHERE tenant_id = p_tenant_id
    AND impianto_id = p_impianto_id
    AND cer = p_cer;
END;
$function$;

DO $block$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT DISTINCT tenant_id, impianto_id, cer
    FROM public.movimenti_impianto
    WHERE tenant_id = '77ec9a3d-602e-438f-97bf-1c69abd8f691'::uuid
      AND created_at > '2026-08-04 23:59:59+00'::timestamptz
  LOOP
    PERFORM public.recalculate_magazzino_giacenza(r.tenant_id, r.impianto_id, r.cer);
  END LOOP;
END;
$block$;