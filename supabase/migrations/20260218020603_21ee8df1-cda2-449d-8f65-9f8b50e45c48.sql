
-- Tabella movimenti impianto centralizzata (produttore + destinatario)
CREATE TABLE public.movimenti_impianto (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  impianto_id UUID NOT NULL REFERENCES public.impianti(id),
  tenant_id UUID REFERENCES public.tenants(id),
  cer TEXT NOT NULL,
  descrizione_rifiuto TEXT,
  quantita_kg NUMERIC NOT NULL DEFAULT 0,
  data_movimento DATE NOT NULL DEFAULT CURRENT_DATE,
  tipo_movimento TEXT NOT NULL CHECK (tipo_movimento IN ('CARICO', 'SCARICO')),
  ruolo_impianto TEXT NOT NULL CHECK (ruolo_impianto IN ('PRODUTTORE', 'DESTINATARIO', 'TRATTAMENTO_INTERNO')),
  origine TEXT,
  fir_id UUID REFERENCES public.fir_forms(id),
  numero_fir TEXT,
  produttore_denominazione TEXT,
  trasportatore_denominazione TEXT,
  destinatario_denominazione TEXT,
  quantita_presunta NUMERIC,
  esito_accettazione TEXT CHECK (esito_accettazione IS NULL OR esito_accettazione IN ('accettato', 'parziale', 'respinto')),
  note TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.movimenti_impianto ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view movements for their tenant"
  ON public.movimenti_impianto FOR SELECT
  USING (tenant_id = public.get_user_tenant(auth.uid()));

CREATE POLICY "Users can insert movements for their tenant"
  ON public.movimenti_impianto FOR INSERT
  WITH CHECK (tenant_id = public.get_user_tenant(auth.uid()));

CREATE POLICY "Users can update movements for their tenant"
  ON public.movimenti_impianto FOR UPDATE
  USING (tenant_id = public.get_user_tenant(auth.uid()));

CREATE POLICY "Users can delete movements for their tenant"
  ON public.movimenti_impianto FOR DELETE
  USING (tenant_id = public.get_user_tenant(auth.uid()));

CREATE TRIGGER update_movimenti_impianto_updated_at
  BEFORE UPDATE ON public.movimenti_impianto
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_movimenti_impianto_tenant ON public.movimenti_impianto(tenant_id);
CREATE INDEX idx_movimenti_impianto_impianto ON public.movimenti_impianto(impianto_id);
CREATE INDEX idx_movimenti_impianto_ruolo ON public.movimenti_impianto(ruolo_impianto);
CREATE INDEX idx_movimenti_impianto_data ON public.movimenti_impianto(data_movimento DESC);
