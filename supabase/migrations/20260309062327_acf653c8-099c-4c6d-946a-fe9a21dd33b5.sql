
CREATE TABLE public.anagrafica_aziende_mp (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) DEFAULT '77ec9a3d-a6d4-4235-8e68-1a6f345de57a',
  codice text,
  ragione_sociale text NOT NULL,
  indirizzo text,
  citta text,
  provincia text,
  cap text,
  codice_fiscale text,
  p_sl boolean DEFAULT false,
  p_ul boolean DEFAULT false,
  trasportatore boolean DEFAULT false,
  destinatario boolean DEFAULT false,
  intermediario boolean DEFAULT false,
  fornitore boolean DEFAULT false,
  cliente boolean DEFAULT false,
  alias text,
  cod_tipologia text,
  tipologia text DEFAULT 'Azienda Privata',
  fax text,
  email text,
  nazione text DEFAULT 'IT',
  partita_iva text,
  telefono text,
  zona_gruppo_cliente text,
  stato text DEFAULT '0',
  cellulare text,
  cod_cliente text,
  cliente_fatturazione text,
  codice_destinatario text,
  pec text,
  latitudine text,
  longitudine text,
  codice_cat_eco text,
  note text,
  stato_amm text,
  codice_cdc text,
  urbano boolean DEFAULT false,
  attivo boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.anagrafica_aziende_mp ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage anagrafica_aziende_mp" ON public.anagrafica_aziende_mp
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
