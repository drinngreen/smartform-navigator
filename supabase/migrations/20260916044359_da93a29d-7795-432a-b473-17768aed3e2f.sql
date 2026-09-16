REVOKE EXECUTE ON FUNCTION public.log_giacenza_change() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_dragon_auto_stock ON public.dragon_register_movements;
DROP TRIGGER IF EXISTS trg_dragon_auto_stock_insert ON public.dragon_register_movements;

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
    AND COALESCE(stato_movimento, 'effettivo') = 'effettivo'
    AND (v_snapshot IS NULL OR created_at > v_snapshot);

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

CREATE OR REPLACE FUNCTION public.simula_recalculate_magazzino_giacenza(p_tenant_id uuid, p_impianto_id uuid, p_cer text)
RETURNS TABLE (cer text, saldo_registrato numeric, saldo_atteso numeric, differenza numeric)
LANGUAGE plpgsql
STABLE
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
  v_registrato numeric := 0;
BEGIN
  IF p_tenant_id IS NULL OR p_impianto_id IS NULL OR p_cer IS NULL OR btrim(p_cer) = '' THEN
    RETURN;
  END IF;

  v_cer := public.normalize_cer(p_cer);

  SELECT quantita_kg, saldo_iniziale_kg, saldo_snapshot_at
    INTO v_registrato, v_baseline, v_snapshot
  FROM public.magazzino_giacenze
  WHERE tenant_id = p_tenant_id AND impianto_id = p_impianto_id
    AND public.normalize_cer(cer) = v_cer
  ORDER BY (cer = v_cer) DESC, created_at NULLS LAST
  LIMIT 1;

  SELECT COALESCE(SUM(
    CASE WHEN tipo_movimento = 'CARICO' THEN quantita_kg
         WHEN tipo_movimento = 'SCARICO' THEN -quantita_kg ELSE 0 END), 0)
  INTO v_delta
  FROM public.movimenti_impianto
  WHERE tenant_id = p_tenant_id
    AND impianto_id = p_impianto_id
    AND public.normalize_cer(cer) = v_cer
    AND COALESCE(stato_movimento, 'effettivo') = 'effettivo'
    AND (v_snapshot IS NULL OR created_at > v_snapshot);

  SELECT impianto_id INTO v_cernita_impianto
    FROM public.magazzino_giacenze
   WHERE tenant_id = p_tenant_id
     AND public.normalize_cer(cer) = v_cer
     AND impianto_id IS NOT NULL
   ORDER BY (cer = v_cer) DESC, updated_at DESC NULLS LAST, id
   LIMIT 1;

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

  cer := v_cer;
  saldo_registrato := COALESCE(v_registrato, 0);
  saldo_atteso := COALESCE(v_baseline, 0) + v_delta + COALESCE(v_cernita, 0);
  differenza := saldo_atteso - saldo_registrato;
  RETURN NEXT;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.simula_recalculate_magazzino_giacenza(uuid, uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.simula_recalculate_magazzino_giacenza(uuid, uuid, text) TO authenticated, service_role;

CREATE TABLE IF NOT EXISTS public.giacenze_applicazioni (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  documento text NOT NULL,
  cer text NOT NULL,
  segno text NOT NULL,
  quantita_kg numeric NOT NULL,
  tenant_id uuid,
  impianto_id uuid,
  movimento_id uuid,
  causale text,
  attore text NOT NULL DEFAULT 'human',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT giacenze_applicazioni_unica UNIQUE (documento, cer, segno)
);

GRANT SELECT ON public.giacenze_applicazioni TO authenticated;
GRANT ALL ON public.giacenze_applicazioni TO service_role;

ALTER TABLE public.giacenze_applicazioni ENABLE ROW LEVEL SECURITY;

CREATE POLICY "applicazioni leggibili agli autenticati"
ON public.giacenze_applicazioni FOR SELECT TO authenticated USING (true);

CREATE OR REPLACE FUNCTION public.applica_movimento_giacenza(
  p_tenant_id uuid,
  p_impianto_id uuid,
  p_cer text,
  p_quantita_kg numeric,
  p_segno text,
  p_causale text,
  p_documento text,
  p_attore text DEFAULT 'human',
  p_descrizione text DEFAULT NULL,
  p_fir_id uuid DEFAULT NULL,
  p_numero_fir text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_cer text;
  v_segno text;
  v_mov_id uuid;
  v_esistente uuid;
BEGIN
  IF p_attore IS DISTINCT FROM 'human' THEN
    RAISE EXCEPTION 'Solo una conferma umana puo applicare un movimento alle giacenze (attore: %)', p_attore;
  END IF;
  IF p_tenant_id IS NULL OR p_impianto_id IS NULL OR p_cer IS NULL OR btrim(p_cer) = '' THEN
    RAISE EXCEPTION 'Dati insufficienti: tenant, impianto e CER sono obbligatori';
  END IF;
  IF p_documento IS NULL OR btrim(p_documento) = '' THEN
    RAISE EXCEPTION 'Documento obbligatorio: senza documento non e possibile garantire l idempotenza';
  END IF;
  IF p_quantita_kg IS NULL OR p_quantita_kg <= 0 THEN
    RAISE EXCEPTION 'Quantita non valida: deve essere maggiore di zero';
  END IF;

  v_segno := upper(btrim(p_segno));
  IF v_segno NOT IN ('CARICO', 'SCARICO') THEN
    RAISE EXCEPTION 'Segno non valido: ammessi CARICO o SCARICO';
  END IF;

  v_cer := public.normalize_cer(p_cer);

  SELECT movimento_id INTO v_esistente
    FROM public.giacenze_applicazioni
   WHERE documento = p_documento AND cer = v_cer AND segno = v_segno;

  IF v_esistente IS NOT NULL THEN
    RETURN jsonb_build_object('applicato', false, 'motivo', 'gia_applicato', 'movimento_id', v_esistente);
  END IF;

  INSERT INTO public.movimenti_impianto (
    impianto_id, tenant_id, cer, descrizione_rifiuto, quantita_kg,
    data_movimento, tipo_movimento, ruolo_impianto, origine,
    fir_id, numero_fir, note, created_by, stato_movimento
  ) VALUES (
    p_impianto_id, p_tenant_id, v_cer, p_descrizione, p_quantita_kg,
    CURRENT_DATE, v_segno,
    CASE WHEN v_segno = 'CARICO' THEN 'destinatario' ELSE 'produttore' END,
    COALESCE(p_causale, 'punto_unico'),
    p_fir_id, p_numero_fir, p_documento, auth.uid(), 'effettivo'
  )
  RETURNING id INTO v_mov_id;

  INSERT INTO public.giacenze_applicazioni (
    documento, cer, segno, quantita_kg, tenant_id, impianto_id,
    movimento_id, causale, attore, created_by
  ) VALUES (
    p_documento, v_cer, v_segno, p_quantita_kg, p_tenant_id, p_impianto_id,
    v_mov_id, p_causale, 'human', auth.uid()
  );

  RETURN jsonb_build_object('applicato', true, 'movimento_id', v_mov_id, 'cer', v_cer, 'segno', v_segno, 'quantita_kg', p_quantita_kg);
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.applica_movimento_giacenza(uuid, uuid, text, numeric, text, text, text, text, text, uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.applica_movimento_giacenza(uuid, uuid, text, numeric, text, text, text, text, text, uuid, text) TO authenticated, service_role;