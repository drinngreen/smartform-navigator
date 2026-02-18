
ALTER TABLE public.privati_conferimenti
  ADD COLUMN IF NOT EXISTS targa_automezzo TEXT,
  ADD COLUMN IF NOT EXISTS modello_automezzo TEXT;
