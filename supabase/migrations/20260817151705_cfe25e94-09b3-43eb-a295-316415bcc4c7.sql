ALTER TABLE public.privati_conferimenti ADD COLUMN IF NOT EXISTS gruppo_id uuid;
ALTER TABLE public.ricevute_privati ADD COLUMN IF NOT EXISTS gruppo_id uuid;
CREATE INDEX IF NOT EXISTS idx_privati_conferimenti_gruppo ON public.privati_conferimenti(gruppo_id);
CREATE INDEX IF NOT EXISTS idx_ricevute_privati_gruppo ON public.ricevute_privati(gruppo_id);