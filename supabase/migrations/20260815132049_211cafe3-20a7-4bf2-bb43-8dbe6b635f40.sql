-- 1) Allinea le giacenze storiche fuori quadratura: sposta la differenza nel saldo iniziale
--    (nessun kg viene perso o creato, la giacenza totale resta invariata)
WITH calc AS (
  SELECT g.id,
         g.quantita_kg,
         COALESCE(g.saldo_iniziale_kg,0) AS baseline,
         COALESCE((
           SELECT SUM(CASE WHEN m.tipo_movimento='CARICO' THEN m.quantita_kg
                           WHEN m.tipo_movimento='SCARICO' THEN -m.quantita_kg ELSE 0 END)
           FROM public.movimenti_impianto m
           WHERE m.tenant_id = g.tenant_id AND m.impianto_id = g.impianto_id AND m.cer = g.cer
             AND (g.saldo_snapshot_at IS NULL OR m.created_at > g.saldo_snapshot_at)
         ),0) AS delta
  FROM public.magazzino_giacenze g
)
UPDATE public.magazzino_giacenze g
SET saldo_iniziale_kg = c.quantita_kg - c.delta,
    updated_at = now()
FROM calc c
WHERE g.id = c.id
  AND abs(c.quantita_kg - (c.baseline + c.delta)) > 0.001;

-- 2) Funzione di controllo coerenza giacenze
CREATE OR REPLACE FUNCTION public.check_giacenze_allineate(p_tenant_id uuid DEFAULT NULL)
RETURNS TABLE(cer text, impianto_id uuid, quantita_kg numeric, atteso_kg numeric, delta_kg numeric)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT g.cer,
         g.impianto_id,
         g.quantita_kg,
         COALESCE(g.saldo_iniziale_kg,0) + COALESCE((
           SELECT SUM(CASE WHEN m.tipo_movimento='CARICO' THEN m.quantita_kg
                           WHEN m.tipo_movimento='SCARICO' THEN -m.quantita_kg ELSE 0 END)
           FROM public.movimenti_impianto m
           WHERE m.tenant_id = g.tenant_id AND m.impianto_id = g.impianto_id AND m.cer = g.cer
             AND (g.saldo_snapshot_at IS NULL OR m.created_at > g.saldo_snapshot_at)
         ),0) AS atteso_kg,
         g.quantita_kg - (COALESCE(g.saldo_iniziale_kg,0) + COALESCE((
           SELECT SUM(CASE WHEN m.tipo_movimento='CARICO' THEN m.quantita_kg
                           WHEN m.tipo_movimento='SCARICO' THEN -m.quantita_kg ELSE 0 END)
           FROM public.movimenti_impianto m
           WHERE m.tenant_id = g.tenant_id AND m.impianto_id = g.impianto_id AND m.cer = g.cer
             AND (g.saldo_snapshot_at IS NULL OR m.created_at > g.saldo_snapshot_at)
         ),0)) AS delta_kg
  FROM public.magazzino_giacenze g
  WHERE (p_tenant_id IS NULL OR g.tenant_id = p_tenant_id)
    AND abs(g.quantita_kg - (COALESCE(g.saldo_iniziale_kg,0) + COALESCE((
           SELECT SUM(CASE WHEN m.tipo_movimento='CARICO' THEN m.quantita_kg
                           WHEN m.tipo_movimento='SCARICO' THEN -m.quantita_kg ELSE 0 END)
           FROM public.movimenti_impianto m
           WHERE m.tenant_id = g.tenant_id AND m.impianto_id = g.impianto_id AND m.cer = g.cer
             AND (g.saldo_snapshot_at IS NULL OR m.created_at > g.saldo_snapshot_at)
         ),0))) > 0.001;
$$;

GRANT EXECUTE ON FUNCTION public.check_giacenze_allineate(uuid) TO authenticated, service_role;

-- 3) Cernita atomica e validata
CREATE OR REPLACE FUNCTION public.esegui_cernita_atomica(
  p_tenant_id uuid,
  p_impianto_id uuid,
  p_cer_input text,
  p_quantita_input numeric,
  p_outputs jsonb,
  p_note text DEFAULT NULL,
  p_data date DEFAULT CURRENT_DATE
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_cernita_id uuid;
  v_giacenza numeric := 0;
  v_out_total numeric := 0;
  v_desc text;
  o jsonb;
BEGIN
  IF p_tenant_id IS NULL OR p_impianto_id IS NULL OR p_cer_input IS NULL OR btrim(p_cer_input) = '' THEN
    RAISE EXCEPTION 'Dati cernita incompleti (tenant, impianto o CER input mancante)';
  END IF;
  IF COALESCE(p_quantita_input,0) <= 0 THEN
    RAISE EXCEPTION 'La quantità in ingresso deve essere maggiore di zero';
  END IF;
  IF p_outputs IS NULL OR jsonb_array_length(p_outputs) = 0 THEN
    RAISE EXCEPTION 'Serve almeno una frazione in uscita';
  END IF;

  -- somma output e validazione singole righe
  FOR o IN SELECT * FROM jsonb_array_elements(p_outputs) LOOP
    IF COALESCE(btrim(o->>'cer'),'') = '' THEN
      RAISE EXCEPTION 'Ogni frazione in uscita deve avere un CER';
    END IF;
    IF COALESCE((o->>'quantita')::numeric, 0) <= 0 THEN
      RAISE EXCEPTION 'Quantità non valida per il CER %', o->>'cer';
    END IF;
    v_out_total := v_out_total + (o->>'quantita')::numeric;
  END LOOP;

  IF v_out_total > p_quantita_input + 0.001 THEN
    RAISE EXCEPTION 'Gli output (% kg) superano l''input (% kg)', v_out_total, p_quantita_input;
  END IF;

  -- giacenza disponibile sul CER di input (lock riga)
  SELECT quantita_kg, descrizione_cer INTO v_giacenza, v_desc
  FROM public.magazzino_giacenze
  WHERE tenant_id = p_tenant_id AND impianto_id = p_impianto_id AND cer = p_cer_input
  FOR UPDATE;

  IF NOT FOUND OR COALESCE(v_giacenza,0) < p_quantita_input - 0.001 THEN
    RAISE EXCEPTION 'Giacenza insufficiente per il CER %: disponibili % kg, richiesti % kg',
      p_cer_input, COALESCE(v_giacenza,0), p_quantita_input;
  END IF;

  INSERT INTO public.cernite (tenant_id, impianto_id, cer_input, descrizione_input, quantita_input, stato, note, created_by)
  VALUES (p_tenant_id, p_impianto_id, p_cer_input, v_desc, p_quantita_input, 'completata', p_note, auth.uid())
  RETURNING id INTO v_cernita_id;

  INSERT INTO public.cernita_output (cernita_id, cer_output, quantita, tipo_output)
  SELECT v_cernita_id, btrim(x->>'cer'), (x->>'quantita')::numeric, COALESCE(x->>'tipo','rifiuto')
  FROM jsonb_array_elements(p_outputs) x;

  -- SCARICO input
  INSERT INTO public.movimenti_impianto (
    impianto_id, tenant_id, cer, descrizione_rifiuto, quantita_kg, data_movimento,
    tipo_movimento, ruolo_impianto, origine, note, created_by
  ) VALUES (
    p_impianto_id, p_tenant_id, p_cer_input, v_desc, p_quantita_input, p_data,
    'SCARICO', 'TRATTAMENTO_INTERNO', 'cernita', 'Cernita ' || v_cernita_id::text, auth.uid()
  );

  -- CARICO output
  INSERT INTO public.movimenti_impianto (
    impianto_id, tenant_id, cer, quantita_kg, data_movimento,
    tipo_movimento, ruolo_impianto, origine, note, created_by
  )
  SELECT p_impianto_id, p_tenant_id, btrim(x->>'cer'), (x->>'quantita')::numeric, p_data,
         'CARICO', 'TRATTAMENTO_INTERNO', 'cernita',
         'Cernita ' || v_cernita_id::text || ' — ' || COALESCE(x->>'tipo','rifiuto'), auth.uid()
  FROM jsonb_array_elements(p_outputs) x;

  -- riallinea le giacenze coinvolte
  PERFORM public.recalculate_magazzino_giacenza(p_tenant_id, p_impianto_id, p_cer_input);
  PERFORM public.recalculate_magazzino_giacenza(p_tenant_id, p_impianto_id, btrim(x->>'cer'))
  FROM jsonb_array_elements(p_outputs) x;

  RETURN v_cernita_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.esegui_cernita_atomica(uuid, uuid, text, numeric, jsonb, text, date) TO authenticated, service_role;