
-- Add Produttore Speciali fields to privati_conferimenti
ALTER TABLE public.privati_conferimenti
  ADD COLUMN IF NOT EXISTS tipo_utenza text DEFAULT 'domestica',
  ADD COLUMN IF NOT EXISTS numero_fir text,
  ADD COLUMN IF NOT EXISTS quantita_presunta numeric,
  ADD COLUMN IF NOT EXISTS stato_rifiuto text,
  ADD COLUMN IF NOT EXISTS codice_ce text,
  ADD COLUMN IF NOT EXISTS esito_pesata text;
