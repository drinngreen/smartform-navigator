CREATE TABLE public.autorizzazioni_aziendali (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  azienda text NOT NULL CHECK (azienda IN ('multyproget','niyol')),
  titolo text NOT NULL,
  tipo text NOT NULL DEFAULT 'altro',
  numero text,
  ente text,
  oggetto text,
  data_rilascio date,
  data_scadenza date,
  file_path text,
  file_name text,
  contenuto text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.autorizzazioni_aziendali TO authenticated;
GRANT ALL ON public.autorizzazioni_aziendali TO service_role;

ALTER TABLE public.autorizzazioni_aziendali ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Autenticati leggono autorizzazioni" ON public.autorizzazioni_aziendali FOR SELECT TO authenticated USING (true);
CREATE POLICY "Autenticati inseriscono autorizzazioni" ON public.autorizzazioni_aziendali FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Autenticati aggiornano autorizzazioni" ON public.autorizzazioni_aziendali FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Autenticati eliminano autorizzazioni" ON public.autorizzazioni_aziendali FOR DELETE TO authenticated USING (true);

CREATE TRIGGER update_autorizzazioni_aziendali_updated_at BEFORE UPDATE ON public.autorizzazioni_aziendali FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_autorizzazioni_azienda ON public.autorizzazioni_aziendali(azienda);

CREATE POLICY "Autenticati leggono file autorizzazioni" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'autorizzazioni');
CREATE POLICY "Autenticati caricano autorizzazioni" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'autorizzazioni');
CREATE POLICY "Autenticati aggiornano file autorizzazioni" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'autorizzazioni');
CREATE POLICY "Autenticati eliminano file autorizzazioni" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'autorizzazioni');