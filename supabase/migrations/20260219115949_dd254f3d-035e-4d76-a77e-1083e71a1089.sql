
-- =============================================
-- MODULO INTERMEDIAZIONE RIFIUTI
-- =============================================

-- 1. Tabella intermediari (soggetti cat. 8 Albo)
CREATE TABLE public.intermediari (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id),
  ragione_sociale TEXT NOT NULL,
  nome TEXT,
  cognome TEXT,
  codice_fiscale TEXT,
  partita_iva TEXT,
  indirizzo TEXT,
  cap TEXT,
  comune TEXT,
  provincia TEXT,
  nazione TEXT DEFAULT 'IT',
  pec TEXT,
  email TEXT,
  telefono TEXT,
  codice_destinatario TEXT DEFAULT '0000000',
  -- Campi specifici cat. 8
  numero_iscrizione_albo TEXT,
  data_iscrizione_albo DATE,
  data_scadenza_albo DATE,
  cer_autorizzati TEXT[] DEFAULT '{}',
  categoria_albo TEXT DEFAULT '8',
  note TEXT,
  attivo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.intermediari ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage intermediari"
  ON public.intermediari FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- 2. Tabella intermediazioni (contratti / operazioni)
CREATE TABLE public.intermediazioni (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id),
  intermediario_id UUID NOT NULL REFERENCES public.intermediari(id),
  produttore_id UUID REFERENCES public.organizations(id),
  destinatario_id UUID REFERENCES public.organizations(id),
  trasportatore_id UUID REFERENCES public.organizations(id),
  fir_id UUID REFERENCES public.fir(id),
  fir_form_id UUID REFERENCES public.fir_forms(id),
  cer TEXT,
  descrizione_rifiuto TEXT,
  quantita_stimata_kg NUMERIC,
  quantita_effettiva_kg NUMERIC,
  -- Condizioni economiche
  tipo_provvigione TEXT NOT NULL DEFAULT 'euro_ton', -- percentuale, euro_ton, forfait
  valore_provvigione NUMERIC NOT NULL DEFAULT 0,
  importo_provvigione NUMERIC, -- calcolato
  -- Contratto
  contratto_ref TEXT,
  condizioni_economiche TEXT,
  -- Stato
  stato TEXT NOT NULL DEFAULT 'bozza', -- bozza, attiva, completata, fatturata, annullata
  fatturata BOOLEAN NOT NULL DEFAULT false,
  fattura_id UUID REFERENCES public.erp_fatture_vendita(id),
  -- Metadata
  note TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.intermediazioni ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage intermediazioni"
  ON public.intermediazioni FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- 3. Tabella movimenti_intermediario (registro cronologico cat. 8)
CREATE TABLE public.movimenti_intermediario (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id),
  intermediario_id UUID NOT NULL REFERENCES public.intermediari(id),
  intermediazione_id UUID REFERENCES public.intermediazioni(id),
  data_movimento DATE NOT NULL DEFAULT CURRENT_DATE,
  fir_id UUID REFERENCES public.fir(id),
  fir_form_id UUID REFERENCES public.fir_forms(id),
  produttore_id UUID REFERENCES public.organizations(id),
  destinatario_id UUID REFERENCES public.organizations(id),
  produttore_denominazione TEXT,
  destinatario_denominazione TEXT,
  cer TEXT NOT NULL,
  descrizione_rifiuto TEXT,
  quantita_kg NUMERIC NOT NULL DEFAULT 0,
  numero_fir TEXT,
  tipo_movimento TEXT NOT NULL DEFAULT 'intermediazione', -- intermediazione, rettifica
  note TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.movimenti_intermediario ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage movimenti_intermediario"
  ON public.movimenti_intermediario FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- 4. Tabella listini_intermediazione (condizioni economiche per produttore/cluster)
CREATE TABLE public.listini_intermediazione (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id),
  intermediario_id UUID NOT NULL REFERENCES public.intermediari(id),
  produttore_id UUID REFERENCES public.organizations(id),
  cer TEXT,
  tipo_provvigione TEXT NOT NULL DEFAULT 'euro_ton',
  valore_provvigione NUMERIC NOT NULL DEFAULT 0,
  fee_minimo NUMERIC,
  descrizione TEXT,
  valido_dal DATE,
  valido_al DATE,
  attivo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.listini_intermediazione ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage listini_intermediazione"
  ON public.listini_intermediazione FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- 5. Trigger updated_at per tutte le tabelle
CREATE TRIGGER update_intermediari_updated_at
  BEFORE UPDATE ON public.intermediari
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_intermediazioni_updated_at
  BEFORE UPDATE ON public.intermediazioni
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_movimenti_intermediario_updated_at
  BEFORE UPDATE ON public.movimenti_intermediario
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_listini_intermediazione_updated_at
  BEFORE UPDATE ON public.listini_intermediazione
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
