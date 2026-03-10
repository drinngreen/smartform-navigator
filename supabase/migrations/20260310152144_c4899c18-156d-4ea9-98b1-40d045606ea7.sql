ALTER TABLE public.anagrafica_privati ADD COLUMN IF NOT EXISTS numero_documento TEXT;
ALTER TABLE public.anagrafica_privati ADD COLUMN IF NOT EXISTS scadenza_documento DATE;
ALTER TABLE public.anagrafica_privati ADD COLUMN IF NOT EXISTS modello_automezzo TEXT;