CREATE TABLE public.contratti_clienti (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL,
  numero TEXT NOT NULL,
  data_ordine DATE,
  cliente_codice TEXT,
  cliente_ragione_sociale TEXT NOT NULL,
  cliente_id UUID REFERENCES public.erp_anagrafiche(id),
  data_inizio DATE,
  data_fine DATE,
  stato TEXT NOT NULL DEFAULT 'attivo',
  data_recesso DATE,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, numero)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.contratti_clienti TO authenticated;
GRANT ALL ON public.contratti_clienti TO service_role;
ALTER TABLE public.contratti_clienti ENABLE ROW LEVEL SECURITY;
CREATE POLICY "contratti_clienti_tenant" ON public.contratti_clienti
  FOR ALL TO authenticated
  USING (can_access_tenant(tenant_id)) WITH CHECK (can_access_tenant(tenant_id));

CREATE TABLE public.contratti_clienti_righe (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contratto_id UUID NOT NULL REFERENCES public.contratti_clienti(id) ON DELETE CASCADE,
  articolo_cer TEXT,
  descrizione TEXT NOT NULL,
  servizio TEXT,
  quantita NUMERIC NOT NULL DEFAULT 1,
  unita_misura TEXT DEFAULT 'NR',
  prezzo_unitario NUMERIC NOT NULL DEFAULT 0,
  sconto_percentuale NUMERIC NOT NULL DEFAULT 0,
  aliquota_iva NUMERIC NOT NULL DEFAULT 22,
  ricorrente BOOLEAN NOT NULL DEFAULT false,
  periodicita_mesi INTEGER NOT NULL DEFAULT 1,
  mese_fatturazione TEXT,
  data_inizio DATE,
  data_fine DATE,
  attiva BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.contratti_clienti_righe TO authenticated;
GRANT ALL ON public.contratti_clienti_righe TO service_role;
ALTER TABLE public.contratti_clienti_righe ENABLE ROW LEVEL SECURITY;
CREATE POLICY "contratti_righe_tenant" ON public.contratti_clienti_righe
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.contratti_clienti c WHERE c.id = contratto_id AND can_access_tenant(c.tenant_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.contratti_clienti c WHERE c.id = contratto_id AND can_access_tenant(c.tenant_id)));

CREATE TABLE public.contratti_fatture_generate (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL,
  contratto_id UUID NOT NULL REFERENCES public.contratti_clienti(id) ON DELETE CASCADE,
  periodo DATE NOT NULL,
  fattura_id UUID REFERENCES public.erp_fatture_vendita(id) ON DELETE SET NULL,
  importo_totale NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (contratto_id, periodo)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.contratti_fatture_generate TO authenticated;
GRANT ALL ON public.contratti_fatture_generate TO service_role;
ALTER TABLE public.contratti_fatture_generate ENABLE ROW LEVEL SECURITY;
CREATE POLICY "contratti_fatture_generate_tenant" ON public.contratti_fatture_generate
  FOR ALL TO authenticated
  USING (can_access_tenant(tenant_id)) WITH CHECK (can_access_tenant(tenant_id));

CREATE TRIGGER trg_contratti_clienti_updated BEFORE UPDATE ON public.contratti_clienti
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_contratti_righe_updated BEFORE UPDATE ON public.contratti_clienti_righe
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.genera_fatture_contratti(p_tenant_id UUID, p_periodo DATE)
RETURNS JSONB
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_inizio DATE := date_trunc('month', p_periodo)::date;
  v_fine DATE := (date_trunc('month', p_periodo) + interval '1 month - 1 day')::date;
  v_anno INTEGER := EXTRACT(YEAR FROM v_inizio);
  v_contratto RECORD;
  v_riga RECORD;
  v_fattura_id UUID;
  v_numero INTEGER;
  v_imponibile NUMERIC;
  v_iva NUMERIC;
  v_riga_num INTEGER;
  v_riga_imp NUMERIC;
  v_create INTEGER := 0;
  v_saltati INTEGER := 0;
BEGIN
  FOR v_contratto IN
    SELECT c.* FROM public.contratti_clienti c
    WHERE c.tenant_id = p_tenant_id
      AND c.stato = 'attivo'
      AND (c.data_recesso IS NULL OR c.data_recesso > v_fine)
      AND (c.data_inizio IS NULL OR c.data_inizio <= v_fine)
      AND (c.data_fine IS NULL OR c.data_fine >= v_inizio)
    ORDER BY c.numero
  LOOP
    IF EXISTS (SELECT 1 FROM public.contratti_fatture_generate g
               WHERE g.contratto_id = v_contratto.id AND g.periodo = v_inizio) THEN
      v_saltati := v_saltati + 1;
      CONTINUE;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM public.contratti_clienti_righe r
      WHERE r.contratto_id = v_contratto.id AND r.ricorrente AND r.attiva
        AND (r.data_inizio IS NULL OR r.data_inizio <= v_fine)
        AND (r.data_fine IS NULL OR r.data_fine >= v_inizio)
    ) THEN
      CONTINUE;
    END IF;

    SELECT COALESCE(MAX(NULLIF(split_part(numero, '/', 1), '')::INTEGER), 0) + 1
      INTO v_numero
      FROM public.erp_fatture_vendita
     WHERE tenant_id = p_tenant_id
       AND EXTRACT(YEAR FROM data_fattura) = v_anno
       AND split_part(numero, '/', 1) ~ '^[0-9]+$';

    v_imponibile := 0; v_iva := 0; v_riga_num := 0;

    INSERT INTO public.erp_fatture_vendita
      (tenant_id, numero, data_fattura, tipo_documento, cliente_id, imponibile, iva, totale, netto_a_pagare, stato, note)
    VALUES
      (p_tenant_id, v_numero || '/' || v_anno, v_fine, 'TD01', v_contratto.cliente_id, 0, 0, 0, 0, 'bozza',
       'Canone contratto ' || v_contratto.numero || ' — ' || v_contratto.cliente_ragione_sociale ||
       ' — periodo ' || to_char(v_inizio, 'MM/YYYY'))
    RETURNING id INTO v_fattura_id;

    FOR v_riga IN
      SELECT * FROM public.contratti_clienti_righe r
      WHERE r.contratto_id = v_contratto.id AND r.ricorrente AND r.attiva
        AND (r.data_inizio IS NULL OR r.data_inizio <= v_fine)
        AND (r.data_fine IS NULL OR r.data_fine >= v_inizio)
      ORDER BY r.created_at
    LOOP
      IF v_riga.periodicita_mesi > 1 AND v_riga.data_inizio IS NOT NULL THEN
        IF MOD((EXTRACT(YEAR FROM v_inizio)::INTEGER - EXTRACT(YEAR FROM v_riga.data_inizio)::INTEGER) * 12
               + (EXTRACT(MONTH FROM v_inizio)::INTEGER - EXTRACT(MONTH FROM v_riga.data_inizio)::INTEGER),
               v_riga.periodicita_mesi) <> 0 THEN
          CONTINUE;
        END IF;
      END IF;

      v_riga_num := v_riga_num + 1;
      v_riga_imp := ROUND(v_riga.quantita * v_riga.prezzo_unitario * (1 - COALESCE(v_riga.sconto_percentuale, 0) / 100.0), 2);

      INSERT INTO public.erp_righe_fatture_vendita
        (fattura_id, riga_numero, descrizione, quantita, prezzo_unitario, sconto_percentuale, imponibile, aliquota_iva, importo_iva)
      VALUES
        (v_fattura_id, v_riga_num,
         v_riga.descrizione || ' — canone ' || to_char(v_inizio, 'MM/YYYY'),
         v_riga.quantita, v_riga.prezzo_unitario, COALESCE(v_riga.sconto_percentuale, 0),
         v_riga_imp, v_riga.aliquota_iva, ROUND(v_riga_imp * v_riga.aliquota_iva / 100.0, 2));

      v_imponibile := v_imponibile + v_riga_imp;
      v_iva := v_iva + ROUND(v_riga_imp * v_riga.aliquota_iva / 100.0, 2);
    END LOOP;

    IF v_riga_num = 0 THEN
      DELETE FROM public.erp_fatture_vendita WHERE id = v_fattura_id;
      CONTINUE;
    END IF;

    UPDATE public.erp_fatture_vendita
       SET imponibile = v_imponibile, iva = v_iva,
           totale = v_imponibile + v_iva, netto_a_pagare = v_imponibile + v_iva
     WHERE id = v_fattura_id;

    INSERT INTO public.contratti_fatture_generate (tenant_id, contratto_id, periodo, fattura_id, importo_totale)
    VALUES (p_tenant_id, v_contratto.id, v_inizio, v_fattura_id, v_imponibile + v_iva);

    v_create := v_create + 1;
  END LOOP;

  RETURN jsonb_build_object('periodo', to_char(v_inizio, 'MM/YYYY'), 'fatture_create', v_create, 'gia_presenti', v_saltati);
END;
$$;

GRANT EXECUTE ON FUNCTION public.genera_fatture_contratti(UUID, DATE) TO authenticated;