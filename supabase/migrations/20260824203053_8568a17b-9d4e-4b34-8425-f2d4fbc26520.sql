ALTER TABLE public.rubrica_contatti
  ADD COLUMN IF NOT EXISTS categoria text NOT NULL DEFAULT 'ALTRO',
  ADD COLUMN IF NOT EXISTS ruoli text,
  ADD COLUMN IF NOT EXISTS autorizzazioni text,
  ADD COLUMN IF NOT EXISTS cap text;

CREATE INDEX IF NOT EXISTS idx_rubrica_contatti_categoria ON public.rubrica_contatti (tenant_id, categoria);
CREATE UNIQUE INDEX IF NOT EXISTS uq_rubrica_contatti_tenant_origine_cf
  ON public.rubrica_contatti (tenant_id, origine, lower(coalesce(codice_fiscale, partita_iva, ragione_sociale, nome)));