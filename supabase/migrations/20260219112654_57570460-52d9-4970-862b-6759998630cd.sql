
-- Task 2: Add automezzo columns to anagrafica_privati
ALTER TABLE public.anagrafica_privati ADD COLUMN IF NOT EXISTS automezzo text;
ALTER TABLE public.anagrafica_privati ADD COLUMN IF NOT EXISTS targa_automezzo text;

-- Task 4: Create storico_ricevute_privati table
CREATE TABLE public.storico_ricevute_privati (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  numero_doc text NOT NULL,
  data_doc date NOT NULL,
  tipo_doc text DEFAULT 'ACQ',
  codice_cliente text,
  ragione_sociale text NOT NULL,
  codice_fiscale text,
  imponibile numeric DEFAULT 0,
  totale_doc numeric DEFAULT 0,
  quantita_kg numeric DEFAULT 0,
  indirizzo text,
  cap text,
  citta text,
  provincia text,
  peso_netto numeric DEFAULT 0,
  peso_lordo numeric DEFAULT 0,
  metodo_pagamento text,
  descrizione_pagamento text,
  stato_ddt text DEFAULT 'U',
  quantita_fatturabile numeric DEFAULT 0,
  tenant_id uuid REFERENCES public.tenants(id),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.storico_ricevute_privati ENABLE ROW LEVEL SECURITY;

-- Admin-only policy
CREATE POLICY "Admins manage storico_ricevute_privati"
  ON public.storico_ricevute_privati
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Index for search
CREATE INDEX idx_storico_ricevute_ragione ON public.storico_ricevute_privati (ragione_sociale);
CREATE INDEX idx_storico_ricevute_cf ON public.storico_ricevute_privati (codice_fiscale);
CREATE INDEX idx_storico_ricevute_data ON public.storico_ricevute_privati (data_doc);
CREATE INDEX idx_storico_ricevute_tenant ON public.storico_ricevute_privati (tenant_id);
