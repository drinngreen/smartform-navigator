ALTER TABLE public.registro_generale
  ADD COLUMN IF NOT EXISTS descrizione_tipica text,
  ADD COLUMN IF NOT EXISTS scaricato text,
  ADD COLUMN IF NOT EXISTS nota_int text,
  ADD COLUMN IF NOT EXISTS cod_intermed text,
  ADD COLUMN IF NOT EXISTS intermediario text,
  ADD COLUMN IF NOT EXISTS indirizzo_intermed text,
  ADD COLUMN IF NOT EXISTS flagnomud boolean,
  ADD COLUMN IF NOT EXISTS conai text,
  ADD COLUMN IF NOT EXISTS att_orig_rif text,
  ADD COLUMN IF NOT EXISTS form_urbano boolean,
  ADD COLUMN IF NOT EXISTS ddt_ingresso text,
  ADD COLUMN IF NOT EXISTS data_ddt_ingresso date;

CREATE INDEX IF NOT EXISTS idx_registro_generale_numero_interno
  ON public.registro_generale(tenant_id, numero_interno);