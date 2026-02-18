
-- Prima Nota (Journal Entries) header
CREATE TABLE public.erp_prima_nota (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id),
  data_registrazione DATE NOT NULL DEFAULT CURRENT_DATE,
  numero_registro INTEGER NOT NULL DEFAULT 1,
  descrizione TEXT NOT NULL DEFAULT '',
  causale_id UUID REFERENCES public.erp_causali_contabili(id),
  documento_tipo TEXT, -- FATTURA_VENDITA, FATTURA_ACQUISTO, INCASSO, PAGAMENTO, GIROCONTO, STIPENDI, AMMORTAMENTO, MANUALE
  documento_id UUID, -- nullable FK to the linked document
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Prima Nota rows (journal lines)
CREATE TABLE public.erp_prima_nota_righe (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  prima_nota_id UUID NOT NULL REFERENCES public.erp_prima_nota(id) ON DELETE CASCADE,
  conto_id UUID REFERENCES public.erp_piano_conti(id),
  centro_costo TEXT,
  commessa TEXT,
  segno TEXT NOT NULL CHECK (segno IN ('DARE', 'AVERE')),
  importo NUMERIC NOT NULL DEFAULT 0,
  descrizione_riga TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.erp_prima_nota ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_prima_nota_righe ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Admins manage erp_prima_nota"
  ON public.erp_prima_nota FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins manage erp_prima_nota_righe"
  ON public.erp_prima_nota_righe FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.erp_prima_nota pn
    WHERE pn.id = erp_prima_nota_righe.prima_nota_id
    AND has_role(auth.uid(), 'admin'::app_role)
  ));

-- Trigger for updated_at
CREATE TRIGGER update_erp_prima_nota_updated_at
  BEFORE UPDATE ON public.erp_prima_nota
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Sequence-like function for progressive number per year
CREATE OR REPLACE FUNCTION public.next_prima_nota_number(p_tenant_id UUID, p_anno INTEGER)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_next INTEGER;
BEGIN
  SELECT COALESCE(MAX(numero_registro), 0) + 1 INTO v_next
  FROM erp_prima_nota
  WHERE tenant_id = p_tenant_id
    AND EXTRACT(YEAR FROM data_registrazione) = p_anno;
  RETURN v_next;
END;
$$;
