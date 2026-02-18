
-- ============================================================
-- ERP CONTABILE - FASE 1+2: Anagrafiche + Fatturazione Attiva
-- ============================================================

-- 1. Anagrafiche (clienti, fornitori, collaboratori, dipendenti, banche)
CREATE TABLE public.erp_anagrafiche (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id),
  tipo_soggetto TEXT NOT NULL CHECK (tipo_soggetto IN ('cliente','fornitore','collaboratore_piva','dipendente','banca')),
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
  codice_destinatario TEXT DEFAULT '0000000',
  iban TEXT,
  telefono TEXT,
  email TEXT,
  condizioni_pagamento_default TEXT,
  note TEXT,
  attivo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.erp_anagrafiche ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage erp_anagrafiche" ON public.erp_anagrafiche FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- 2. Piano dei conti (3-4 livelli)
CREATE TABLE public.erp_piano_conti (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id),
  codice TEXT NOT NULL,
  descrizione TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('attivo','passivo','costo','ricavo','ordine')),
  livello INTEGER NOT NULL DEFAULT 1,
  parent_id UUID REFERENCES public.erp_piano_conti(id),
  is_movimentabile BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, codice)
);
ALTER TABLE public.erp_piano_conti ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage erp_piano_conti" ON public.erp_piano_conti FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- 3. Codici IVA
CREATE TABLE public.erp_codici_iva (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id),
  codice TEXT NOT NULL,
  descrizione TEXT NOT NULL,
  aliquota NUMERIC NOT NULL DEFAULT 22,
  natura TEXT, -- N1..N7 per operazioni esenti/escluse
  attivo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, codice)
);
ALTER TABLE public.erp_codici_iva ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage erp_codici_iva" ON public.erp_codici_iva FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- 4. Causali contabili
CREATE TABLE public.erp_causali_contabili (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id),
  codice TEXT NOT NULL,
  descrizione TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('FV','FA','NC','ND','IF','PF','GN','PA','IN','AM','AP','CH')),
  attivo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, codice)
);
ALTER TABLE public.erp_causali_contabili ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage erp_causali_contabili" ON public.erp_causali_contabili FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- 5. Metodi di pagamento
CREATE TABLE public.erp_metodi_pagamento (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id),
  codice TEXT NOT NULL,
  descrizione TEXT NOT NULL,
  codice_fatturapa TEXT, -- MP01..MP23
  giorni_scadenza INTEGER DEFAULT 30,
  numero_rate INTEGER DEFAULT 1,
  attivo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, codice)
);
ALTER TABLE public.erp_metodi_pagamento ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage erp_metodi_pagamento" ON public.erp_metodi_pagamento FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- 6. Fatture vendita (header)
CREATE TABLE public.erp_fatture_vendita (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id),
  numero TEXT NOT NULL,
  data_fattura DATE NOT NULL DEFAULT CURRENT_DATE,
  tipo_documento TEXT NOT NULL DEFAULT 'TD01' CHECK (tipo_documento IN ('TD01','TD02','TD04','TD05','TD06','TD24','TD25')),
  cliente_id UUID REFERENCES public.erp_anagrafiche(id),
  -- Totali
  imponibile NUMERIC NOT NULL DEFAULT 0,
  iva NUMERIC NOT NULL DEFAULT 0,
  totale NUMERIC NOT NULL DEFAULT 0,
  ritenuta_acconto NUMERIC DEFAULT 0,
  netto_a_pagare NUMERIC NOT NULL DEFAULT 0,
  -- Pagamento
  metodo_pagamento_id UUID REFERENCES public.erp_metodi_pagamento(id),
  condizioni_pagamento TEXT,
  -- Stato
  stato TEXT NOT NULL DEFAULT 'bozza' CHECK (stato IN ('bozza','emessa','inviata_sdi','consegnata','scartata','non_consegnata','accettata','rifiutata','decorrenza_termini','annullata')),
  -- Contabilizzazione
  contabilizzata BOOLEAN NOT NULL DEFAULT false,
  causale_id UUID REFERENCES public.erp_causali_contabili(id),
  -- Integrazione rifiuti
  da_conferimenti BOOLEAN NOT NULL DEFAULT false,
  -- Note
  note TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, numero)
);
ALTER TABLE public.erp_fatture_vendita ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage erp_fatture_vendita" ON public.erp_fatture_vendita FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- 7. Righe fatture vendita
CREATE TABLE public.erp_righe_fatture_vendita (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  fattura_id UUID NOT NULL REFERENCES public.erp_fatture_vendita(id) ON DELETE CASCADE,
  riga_numero INTEGER NOT NULL DEFAULT 1,
  descrizione TEXT NOT NULL,
  quantita NUMERIC NOT NULL DEFAULT 1,
  prezzo_unitario NUMERIC NOT NULL DEFAULT 0,
  sconto_percentuale NUMERIC DEFAULT 0,
  imponibile NUMERIC NOT NULL DEFAULT 0,
  codice_iva_id UUID REFERENCES public.erp_codici_iva(id),
  aliquota_iva NUMERIC NOT NULL DEFAULT 22,
  importo_iva NUMERIC NOT NULL DEFAULT 0,
  -- Collegamento rifiuti
  conferimento_id UUID,
  fir_id UUID,
  cer TEXT,
  peso_totale NUMERIC,
  impianto_id UUID REFERENCES public.impianti(id),
  -- Centro di costo
  centro_costo TEXT,
  commessa TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.erp_righe_fatture_vendita ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage erp_righe_fv" ON public.erp_righe_fatture_vendita FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- 8. Fatture XML (FatturaPA)
CREATE TABLE public.erp_fatture_xml (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  fattura_id UUID NOT NULL REFERENCES public.erp_fatture_vendita(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES public.tenants(id),
  xml_content TEXT,
  nome_file TEXT,
  versione INTEGER NOT NULL DEFAULT 1,
  stato TEXT NOT NULL DEFAULT 'generato' CHECK (stato IN ('generato','inviato','consegnato','scartato','non_consegnato','accettato','rifiutato','decorrenza_termini')),
  sdi_id TEXT,
  esito_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.erp_fatture_xml ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage erp_fatture_xml" ON public.erp_fatture_xml FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger updated_at
CREATE TRIGGER update_erp_anagrafiche_updated_at BEFORE UPDATE ON public.erp_anagrafiche FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_erp_piano_conti_updated_at BEFORE UPDATE ON public.erp_piano_conti FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_erp_fatture_vendita_updated_at BEFORE UPDATE ON public.erp_fatture_vendita FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_erp_fatture_xml_updated_at BEFORE UPDATE ON public.erp_fatture_xml FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Indici utili
CREATE INDEX idx_erp_anagrafiche_tenant ON public.erp_anagrafiche(tenant_id);
CREATE INDEX idx_erp_anagrafiche_tipo ON public.erp_anagrafiche(tipo_soggetto);
CREATE INDEX idx_erp_fatture_vendita_tenant ON public.erp_fatture_vendita(tenant_id);
CREATE INDEX idx_erp_fatture_vendita_cliente ON public.erp_fatture_vendita(cliente_id);
CREATE INDEX idx_erp_fatture_vendita_stato ON public.erp_fatture_vendita(stato);
CREATE INDEX idx_erp_righe_fv_fattura ON public.erp_righe_fatture_vendita(fattura_id);
