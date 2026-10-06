CREATE OR REPLACE FUNCTION public.guardia_giacenze_mai_prima_21_09()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF TG_OP IN ('UPDATE','DELETE') AND OLD.incide_giacenze IS TRUE AND OLD.data_movimento <= DATE '2026-09-21' THEN
    RAISE EXCEPTION 'Vietato: le giacenze fino al 21/09/2026 sono immutabili';
  END IF;
  IF TG_OP IN ('INSERT','UPDATE') AND NEW.incide_giacenze IS TRUE
     AND (NEW.data_movimento IS NULL OR NEW.data_movimento <= DATE '2026-09-21'
          OR (NEW.data_emissione_formulario IS NOT NULL AND NEW.data_emissione_formulario <= DATE '2026-09-21')) THEN
    RAISE EXCEPTION 'Vietato: nessun movimento con data fino al 21/09/2026 può incidere sulle giacenze';
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_guardia_giacenze_21_09 ON public.registro_generale;
CREATE TRIGGER trg_guardia_giacenze_21_09
BEFORE INSERT OR UPDATE OR DELETE ON public.registro_generale
FOR EACH ROW EXECUTE FUNCTION public.guardia_giacenze_mai_prima_21_09();

CREATE UNIQUE INDEX IF NOT EXISTS ux_registro_fir_incide_giacenze
ON public.registro_generale (registro, upper(regexp_replace(numero_formulario, '[^A-Za-z0-9]', '', 'g')), cer)
WHERE incide_giacenze IS TRUE AND numero_formulario IS NOT NULL;