-- Estende anagrafica_privati per import completo da XLSX (Privati Cittadini)
ALTER TABLE public.anagrafica_privati
  ADD COLUMN IF NOT EXISTS denominazione TEXT,
  ADD COLUMN IF NOT EXISTS indirizzo TEXT,
  ADD COLUMN IF NOT EXISTS cap TEXT,
  ADD COLUMN IF NOT EXISTS provincia TEXT,
  ADD COLUMN IF NOT EXISTS nazione TEXT,
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS telefono TEXT,
  ADD COLUMN IF NOT EXISTS cellulare TEXT,
  ADD COLUMN IF NOT EXISTS pec TEXT,
  ADD COLUMN IF NOT EXISTS fax TEXT,
  ADD COLUMN IF NOT EXISTS partita_iva TEXT,
  ADD COLUMN IF NOT EXISTS codice_destinatario TEXT,
  ADD COLUMN IF NOT EXISTS import_source TEXT,
  ADD COLUMN IF NOT EXISTS import_batch_id UUID;

-- Indici utili per ricerca e selezione rapida
CREATE INDEX IF NOT EXISTS idx_anagrafica_privati_cf ON public.anagrafica_privati (codice_fiscale);
CREATE INDEX IF NOT EXISTS idx_anagrafica_privati_impianto ON public.anagrafica_privati (impianto_id);
CREATE INDEX IF NOT EXISTS idx_anagrafica_privati_tenant ON public.anagrafica_privati (tenant_id);