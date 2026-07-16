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
BEGIN
  IF TG_OP <> 'INSERT' THEN
    RETURN NEW;
  END IF;

  IF NEW.kg_pesati IS NULL OR NEW.kg_pesati <= 0 OR NEW.impianto_id IS NULL OR NEW.cer IS NULL OR btrim(NEW.cer) = '' THEN
    RETURN NEW;
  END IF;

  v_tenant_id := NEW.tenant_id;
  IF v_tenant_id IS NULL THEN
    SELECT i.tenant_id INTO v_tenant_id
    FROM public.impianti i
    WHERE i.id = NEW.impianto_id
    LIMIT 1;
  END IF;

  IF v_tenant_id IS NULL THEN
    RETURN NEW;
  END IF;

  v_cer := btrim(NEW.cer);
  v_cer := CASE
    WHEN upper(v_cer) = '200140-FE' THEN '200140-fe'
    WHEN upper(v_cer) = '200140-CAVO' THEN '200140-CAVO'
    WHEN upper(v_cer) = '200140-RA' THEN '200140-RA'
    WHEN upper(v_cer) = '200140-OT' THEN '200140-OT'
    WHEN upper(v_cer) = '200140-PI' THEN '200140-PI'
    ELSE upper(v_cer)
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
  v_note := concat_ws(' — ',
    'Conferimento privato ' || NEW.id::text,
    NULLIF(NEW.note, ''),
    CASE WHEN NEW.targa_automezzo IS NOT NULL AND btrim(NEW.targa_automezzo) <> '' THEN 'Targa: ' || NEW.targa_automezzo ELSE NULL END
  );

  IF NOT EXISTS (
    SELECT 1
    FROM public.movimenti_impianto mi
    WHERE mi.tenant_id = v_tenant_id
      AND mi.impianto_id = NEW.impianto_id
      AND mi.origine = 'privati'
      AND mi.note LIKE '%' || NEW.id::text || '%'
  ) THEN
    INSERT INTO public.movimenti_impianto (
      tenant_id,
      impianto_id,
      tipo_movimento,
      ruolo_impianto,
      cer,
      descrizione_rifiuto,
      quantita_kg,
      data_movimento,
      origine,
      produttore_denominazione,
      trasportatore_denominazione,
      destinatario_denominazione,
      esito_accettazione,
      note
    ) VALUES (
      v_tenant_id,
      NEW.impianto_id,
      'CARICO',
      'DESTINATARIO',
      v_cer,
      v_descrizione,
      NEW.kg_pesati,
      v_data_movimento,
      'privati',
      NEW.nome_privato,
      NEW.nome_privato,
      'Multyproget',
      'accettato',
      v_note
    );

    INSERT INTO public.magazzino_giacenze (
      tenant_id,
      impianto_id,
      cer,
      descrizione_cer,
      quantita_kg,
      ultimo_carico_at,
      tipo_conferente,
      stato
    ) VALUES (
      v_tenant_id,
      NEW.impianto_id,
      v_cer,
      v_descrizione,
      NEW.kg_pesati,
      now(),
      'privato',
      'stoccato'
    )
    ON CONFLICT (tenant_id, impianto_id, cer)
    DO UPDATE SET
      quantita_kg = public.magazzino_giacenze.quantita_kg + EXCLUDED.quantita_kg,
      descrizione_cer = COALESCE(public.magazzino_giacenze.descrizione_cer, EXCLUDED.descrizione_cer),
      ultimo_carico_at = EXCLUDED.ultimo_carico_at,
      tipo_conferente = COALESCE(public.magazzino_giacenze.tipo_conferente, 'privato'),
      stato = COALESCE(public.magazzino_giacenze.stato, 'stoccato'),
      updated_at = now();
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_privati_conferimento_to_inventory ON public.privati_conferimenti;

CREATE TRIGGER trg_sync_privati_conferimento_to_inventory
AFTER INSERT ON public.privati_conferimenti
FOR EACH ROW
EXECUTE FUNCTION public.sync_privati_conferimento_to_inventory();