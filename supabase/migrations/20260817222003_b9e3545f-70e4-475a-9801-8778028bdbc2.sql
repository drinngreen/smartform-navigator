ALTER TABLE public.movimenti_impianto
ADD COLUMN IF NOT EXISTS privati_conferimento_id uuid;

ALTER TABLE public.movimenti_impianto
DROP CONSTRAINT IF EXISTS movimenti_impianto_privati_conferimento_id_fkey;

ALTER TABLE public.movimenti_impianto
ADD CONSTRAINT movimenti_impianto_privati_conferimento_id_fkey
FOREIGN KEY (privati_conferimento_id)
REFERENCES public.privati_conferimenti(id)
ON DELETE CASCADE;

CREATE UNIQUE INDEX IF NOT EXISTS movimenti_impianto_privati_conferimento_uidx
ON public.movimenti_impianto (privati_conferimento_id)
WHERE privati_conferimento_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.inventory_lock_key(
  p_tenant_id uuid,
  p_impianto_id uuid,
  p_cer text
)
RETURNS bigint
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT hashtextextended(
    COALESCE(p_tenant_id::text, '') || '|' ||
    COALESCE(p_impianto_id::text, '') || '|' ||
    COALESCE(p_cer, ''),
    0
  );
$$;

CREATE OR REPLACE FUNCTION public.recalculate_magazzino_giacenza(
  p_tenant_id uuid,
  p_impianto_id uuid,
  p_cer text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_baseline numeric := 0;
  v_snapshot timestamptz;
  v_delta numeric := 0;
BEGIN
  IF p_tenant_id IS NULL OR p_impianto_id IS NULL OR p_cer IS NULL OR btrim(p_cer) = '' THEN
    RAISE EXCEPTION 'Giacenza non ricalcolabile: tenant, impianto o CER mancante';
  END IF;

  PERFORM pg_advisory_xact_lock(public.inventory_lock_key(p_tenant_id, p_impianto_id, p_cer));

  SELECT saldo_iniziale_kg, saldo_snapshot_at
    INTO v_baseline, v_snapshot
  FROM public.magazzino_giacenze
  WHERE tenant_id = p_tenant_id
    AND impianto_id = p_impianto_id
    AND cer = p_cer
  FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO public.magazzino_giacenze (
      tenant_id, impianto_id, cer, quantita_kg, saldo_iniziale_kg,
      saldo_snapshot_at, stato, updated_at
    ) VALUES (
      p_tenant_id, p_impianto_id, p_cer, 0, 0,
      NULL, 'stoccato', now()
    )
    ON CONFLICT (tenant_id, impianto_id, cer) DO NOTHING;

    SELECT saldo_iniziale_kg, saldo_snapshot_at
      INTO v_baseline, v_snapshot
    FROM public.magazzino_giacenze
    WHERE tenant_id = p_tenant_id
      AND impianto_id = p_impianto_id
      AND cer = p_cer
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
    AND cer = p_cer
    AND (v_snapshot IS NULL OR created_at > v_snapshot);

  UPDATE public.magazzino_giacenze
  SET quantita_kg = COALESCE(v_baseline, 0) + v_delta,
      ultimo_carico_at = CASE WHEN v_delta > 0 THEN now() ELSE ultimo_carico_at END,
      ultimo_scarico_at = CASE WHEN v_delta < 0 THEN now() ELSE ultimo_scarico_at END,
      updated_at = now()
  WHERE tenant_id = p_tenant_id
    AND impianto_id = p_impianto_id
    AND cer = p_cer;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Ricalcolo giacenza non completato per CER %', p_cer;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.recalculate_stock_after_plant_movement()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old_key bigint;
  v_new_key bigint;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    v_old_key := public.inventory_lock_key(OLD.tenant_id, OLD.impianto_id, OLD.cer);
    v_new_key := public.inventory_lock_key(NEW.tenant_id, NEW.impianto_id, NEW.cer);
    IF v_old_key <= v_new_key THEN
      PERFORM pg_advisory_xact_lock(v_old_key);
      IF v_new_key <> v_old_key THEN PERFORM pg_advisory_xact_lock(v_new_key); END IF;
    ELSE
      PERFORM pg_advisory_xact_lock(v_new_key);
      PERFORM pg_advisory_xact_lock(v_old_key);
    END IF;
    PERFORM public.recalculate_magazzino_giacenza(OLD.tenant_id, OLD.impianto_id, OLD.cer);
    IF v_new_key <> v_old_key THEN
      PERFORM public.recalculate_magazzino_giacenza(NEW.tenant_id, NEW.impianto_id, NEW.cer);
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM public.recalculate_magazzino_giacenza(OLD.tenant_id, OLD.impianto_id, OLD.cer);
  ELSE
    PERFORM public.recalculate_magazzino_giacenza(NEW.tenant_id, NEW.impianto_id, NEW.cer);
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE OR REPLACE FUNCTION public.assert_magazzino_giacenza(
  p_tenant_id uuid,
  p_impianto_id uuid,
  p_cer text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actual numeric;
  v_expected numeric;
  v_baseline numeric;
  v_snapshot timestamptz;
BEGIN
  SELECT quantita_kg, saldo_iniziale_kg, saldo_snapshot_at
  INTO v_actual, v_baseline, v_snapshot
  FROM public.magazzino_giacenze
  WHERE tenant_id = p_tenant_id
    AND impianto_id = p_impianto_id
    AND cer = p_cer;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Garanzia giacenza fallita: saldo assente per CER %', p_cer;
  END IF;

  SELECT COALESCE(v_baseline, 0) + COALESCE(SUM(
    CASE
      WHEN tipo_movimento = 'CARICO' THEN quantita_kg
      WHEN tipo_movimento = 'SCARICO' THEN -quantita_kg
      ELSE 0
    END
  ), 0)
  INTO v_expected
  FROM public.movimenti_impianto
  WHERE tenant_id = p_tenant_id
    AND impianto_id = p_impianto_id
    AND cer = p_cer
    AND (v_snapshot IS NULL OR created_at > v_snapshot);

  IF v_actual IS DISTINCT FROM v_expected THEN
    RAISE EXCEPTION 'Garanzia giacenza fallita per CER %: saldo %, atteso %', p_cer, v_actual, v_expected;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_privati_conferimento_to_inventory()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id uuid;
  v_cer text;
  v_descrizione text;
  v_data_movimento date;
  v_note text;
  v_movement_id uuid;
  v_old_tenant_id uuid;
  v_old_cer text;
BEGIN
  v_tenant_id := NEW.tenant_id;
  IF v_tenant_id IS NULL THEN
    SELECT tenant_id INTO v_tenant_id
    FROM public.impianti
    WHERE id = NEW.impianto_id
    LIMIT 1;
  END IF;

  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Conferimento non salvato: tenant mancante';
  END IF;
  IF NEW.impianto_id IS NULL THEN
    RAISE EXCEPTION 'Conferimento non salvato: impianto mancante';
  END IF;
  IF NEW.cer IS NULL OR btrim(NEW.cer) = '' THEN
    RAISE EXCEPTION 'Conferimento non salvato: CER mancante';
  END IF;
  IF NEW.kg_pesati IS NULL OR NEW.kg_pesati <= 0 THEN
    RAISE EXCEPTION 'Conferimento non salvato: peso non valido';
  END IF;

  v_cer := CASE
    WHEN upper(btrim(NEW.cer)) = '200140-FE' THEN '200140-fe'
    WHEN upper(btrim(NEW.cer)) = '200140-CAVO' THEN '200140-CAVO'
    WHEN upper(btrim(NEW.cer)) = '200140-RA' THEN '200140-RA'
    WHEN upper(btrim(NEW.cer)) = '200140-OT' THEN '200140-OT'
    WHEN upper(btrim(NEW.cer)) = '200140-PI' THEN '200140-PI'
    ELSE upper(btrim(NEW.cer))
  END;

  v_descrizione := CASE
    WHEN v_cer = '200140' THEN 'metalli — alluminio'
    WHEN v_cer = '200140-fe' THEN 'metalli — ferro'
    WHEN v_cer = '200140-RA' THEN 'metalli — metallo-rame'
    WHEN v_cer = '200140-CAVO' THEN 'metalli — metallo-cavo'
    WHEN v_cer = '200140-OT' THEN 'metalli — ottone'
    WHEN v_cer = '200140-PI' THEN 'metalli — metallo-piombo'
    ELSE NULL
  END;
  v_data_movimento := COALESCE(NEW.data::date, CURRENT_DATE);
  v_note := concat_ws(' — ', 'Conferimento privato ' || NEW.id::text, NULLIF(NEW.note, ''), CASE WHEN NEW.targa_automezzo IS NOT NULL AND btrim(NEW.targa_automezzo) <> '' THEN 'Targa: ' || NEW.targa_automezzo END);

  PERFORM pg_advisory_xact_lock(public.inventory_lock_key(v_tenant_id, NEW.impianto_id, v_cer));

  SELECT id, tenant_id, cer
  INTO v_movement_id, v_old_tenant_id, v_old_cer
  FROM public.movimenti_impianto
  WHERE privati_conferimento_id = NEW.id
  LIMIT 1;

  IF v_movement_id IS NULL AND TG_OP = 'UPDATE' THEN
    SELECT id, tenant_id, cer
    INTO v_movement_id, v_old_tenant_id, v_old_cer
    FROM public.movimenti_impianto
    WHERE origine = 'privati'
      AND note LIKE '%' || NEW.id::text || '%'
    ORDER BY created_at
    LIMIT 1;
  END IF;

  IF v_movement_id IS NULL THEN
    INSERT INTO public.movimenti_impianto (
      tenant_id, impianto_id, tipo_movimento, ruolo_impianto, cer,
      descrizione_rifiuto, quantita_kg, data_movimento, origine,
      produttore_denominazione, trasportatore_denominazione,
      destinatario_denominazione, esito_accettazione, note,
      privati_conferimento_id
    ) VALUES (
      v_tenant_id, NEW.impianto_id, 'CARICO', 'DESTINATARIO', v_cer,
      v_descrizione, NEW.kg_pesati, v_data_movimento, 'privati',
      NEW.nome_privato, NEW.nome_privato, 'Multyproget', 'accettato', v_note,
      NEW.id
    )
    RETURNING id INTO v_movement_id;
  ELSE
    UPDATE public.movimenti_impianto
    SET tenant_id = v_tenant_id,
        impianto_id = NEW.impianto_id,
        tipo_movimento = 'CARICO',
        ruolo_impianto = 'DESTINATARIO',
        cer = v_cer,
        descrizione_rifiuto = COALESCE(v_descrizione, descrizione_rifiuto),
        quantita_kg = NEW.kg_pesati,
        data_movimento = v_data_movimento,
        produttore_denominazione = NEW.nome_privato,
        trasportatore_denominazione = NEW.nome_privato,
        destinatario_denominazione = 'Multyproget',
        esito_accettazione = 'accettato',
        note = v_note,
        privati_conferimento_id = NEW.id,
        updated_at = now()
    WHERE id = v_movement_id;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.movimenti_impianto
    WHERE id = v_movement_id
      AND privati_conferimento_id = NEW.id
      AND tenant_id = v_tenant_id
      AND impianto_id = NEW.impianto_id
      AND cer = v_cer
      AND tipo_movimento = 'CARICO'
      AND quantita_kg = NEW.kg_pesati
  ) THEN
    RAISE EXCEPTION 'Conferimento non salvato: movimento di magazzino non verificato';
  END IF;

  PERFORM public.assert_magazzino_giacenza(v_tenant_id, NEW.impianto_id, v_cer);

  IF v_old_tenant_id IS NOT NULL AND v_old_cer IS NOT NULL
     AND (v_old_tenant_id, v_old_cer) IS DISTINCT FROM (v_tenant_id, v_cer) THEN
    PERFORM public.assert_magazzino_giacenza(v_old_tenant_id, NEW.impianto_id, v_old_cer);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_reverse_privati_conferimento_on_delete ON public.privati_conferimenti;
DROP FUNCTION IF EXISTS public.reverse_privati_conferimento_on_delete();