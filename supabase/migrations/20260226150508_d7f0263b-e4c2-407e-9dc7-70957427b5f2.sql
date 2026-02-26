
-- Tabella magazzino_giacenze per tracking stock CER in tempo reale
CREATE TABLE public.magazzino_giacenze (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id),
  impianto_id UUID REFERENCES public.impianti(id),
  cer TEXT NOT NULL,
  descrizione_cer TEXT,
  quantita_kg NUMERIC NOT NULL DEFAULT 0,
  ultimo_carico_at TIMESTAMPTZ,
  ultimo_scarico_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, impianto_id, cer)
);

-- Enable RLS
ALTER TABLE public.magazzino_giacenze ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Admins can view giacenze" ON public.magazzino_giacenze
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can insert giacenze" ON public.magazzino_giacenze
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can update giacenze" ON public.magazzino_giacenze
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can delete giacenze" ON public.magazzino_giacenze
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- Trigger per updated_at
CREATE TRIGGER update_magazzino_giacenze_updated_at
  BEFORE UPDATE ON public.magazzino_giacenze
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Tabella per documenti scansionati (allegati anagrafiche privati)
CREATE TABLE public.documenti_privati (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  anagrafica_id UUID NOT NULL REFERENCES public.anagrafica_privati(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES public.tenants(id),
  nome_file TEXT NOT NULL,
  tipo_documento TEXT NOT NULL DEFAULT 'documento_identita',
  storage_path TEXT NOT NULL,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID
);

ALTER TABLE public.documenti_privati ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage documenti_privati" ON public.documenti_privati
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- Storage bucket per documenti privati
INSERT INTO storage.buckets (id, name, public) VALUES ('documenti-privati', 'documenti-privati', false)
ON CONFLICT DO NOTHING;

CREATE POLICY "Admins can upload documenti" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'documenti-privati' AND EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins can read documenti" ON storage.objects
  FOR SELECT USING (bucket_id = 'documenti-privati' AND EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins can delete documenti" ON storage.objects
  FOR DELETE USING (bucket_id = 'documenti-privati' AND EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));
