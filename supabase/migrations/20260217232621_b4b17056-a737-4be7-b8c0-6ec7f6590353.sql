
-- Anagrafica utenti privati
CREATE TABLE public.anagrafica_privati (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id),
  impianto_id UUID REFERENCES public.impianti(id),
  nome TEXT NOT NULL,
  cognome TEXT NOT NULL,
  codice_fiscale TEXT NOT NULL,
  comune_residenza TEXT,
  numero_tessera TEXT,
  tipo_utenza TEXT NOT NULL DEFAULT 'domestica', -- domestica / non_domestica
  note TEXT,
  attivo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.anagrafica_privati ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage anagrafica_privati"
  ON public.anagrafica_privati FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Limiti per CER per tipo utenza
CREATE TABLE public.limiti_privati (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id),
  impianto_id UUID REFERENCES public.impianti(id),
  cer TEXT NOT NULL,
  tipo_utenza TEXT NOT NULL DEFAULT 'domestica',
  limite_conferimento_kg NUMERIC,
  limite_annuo_kg NUMERIC,
  limite_mensile_kg NUMERIC,
  limite_giornaliero_kg NUMERIC,
  periodo_riferimento TEXT NOT NULL DEFAULT 'annuale', -- annuale/mensile/giornaliero
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.limiti_privati ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage limiti_privati"
  ON public.limiti_privati FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Ricevute per conferimenti privati
CREATE TABLE public.ricevute_privati (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id),
  impianto_id UUID REFERENCES public.impianti(id),
  conferimento_id UUID REFERENCES public.privati_conferimenti(id),
  privato_id UUID REFERENCES public.anagrafica_privati(id),
  numero_ricevuta TEXT NOT NULL,
  anno INTEGER NOT NULL DEFAULT EXTRACT(YEAR FROM now()),
  data_emissione TIMESTAMPTZ NOT NULL DEFAULT now(),
  importo NUMERIC DEFAULT 0,
  pdf_path TEXT,
  qr_code_data TEXT,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ricevute_privati ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage ricevute_privati"
  ON public.ricevute_privati FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Add privato_id reference to privati_conferimenti
ALTER TABLE public.privati_conferimenti 
  ADD COLUMN IF NOT EXISTS privato_id UUID REFERENCES public.anagrafica_privati(id);

-- Sequence function for receipt numbers
CREATE OR REPLACE FUNCTION public.next_ricevuta_number(p_impianto_id UUID, p_anno INTEGER)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) + 1 INTO v_count
  FROM ricevute_privati
  WHERE impianto_id = p_impianto_id AND anno = p_anno;
  
  RETURN LPAD(v_count::TEXT, 5, '0') || '/' || p_anno::TEXT;
END;
$$;
