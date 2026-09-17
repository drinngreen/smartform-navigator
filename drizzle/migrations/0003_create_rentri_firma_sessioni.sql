CREATE TABLE public.rentri_firma_sessioni (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid DEFAULT auth.uid(),
  cliente text NOT NULL,
  numero_fir text NOT NULL,
  credentials_id text,
  device_description text,
  digest_to_sign text,
  token text,
  handle text,
  authorize_at timestamptz,
  conferma_mobile_at timestamptz,
  esito_sign_hash text,
  esito_acquisizione_firma text,
  stato_finale text,
  log_raw jsonb NOT NULL DEFAULT '[]'::jsonb
);

GRANT SELECT, INSERT ON public.rentri_firma_sessioni TO authenticated;
GRANT ALL ON public.rentri_firma_sessioni TO service_role;

ALTER TABLE public.rentri_firma_sessioni ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Utenti autenticati leggono le sessioni di firma"
ON public.rentri_firma_sessioni FOR SELECT TO authenticated USING (true);

CREATE POLICY "Utenti autenticati registrano le sessioni di firma"
ON public.rentri_firma_sessioni FOR INSERT TO authenticated WITH CHECK (true);

CREATE INDEX idx_rentri_firma_sessioni_fir ON public.rentri_firma_sessioni (numero_fir, created_at DESC);