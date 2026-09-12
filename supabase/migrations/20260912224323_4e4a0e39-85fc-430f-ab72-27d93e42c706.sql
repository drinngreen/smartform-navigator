CREATE TABLE public.rentri_operazioni (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cliente TEXT NOT NULL,
  company TEXT,
  registro_id TEXT,
  tipo_operazione TEXT NOT NULL,
  rentri_method TEXT,
  rentri_path TEXT,
  payload_inviato JSONB,
  risposta JSONB,
  transazione_id TEXT,
  identificativo_rentri TEXT,
  http_status INTEGER,
  success BOOLEAN NOT NULL DEFAULT false,
  error_code TEXT,
  error_message TEXT,
  esito_finale TEXT NOT NULL DEFAULT 'IN_VERIFICA',
  verificato_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT ON public.rentri_operazioni TO authenticated;
GRANT ALL ON public.rentri_operazioni TO service_role;

ALTER TABLE public.rentri_operazioni ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rentri_operazioni_select_auth"
ON public.rentri_operazioni FOR SELECT TO authenticated USING (true);

CREATE INDEX idx_rentri_operazioni_created_at ON public.rentri_operazioni (created_at DESC);
CREATE INDEX idx_rentri_operazioni_transazione ON public.rentri_operazioni (transazione_id);
CREATE INDEX idx_rentri_operazioni_cliente ON public.rentri_operazioni (cliente, tipo_operazione);

CREATE TRIGGER update_rentri_operazioni_updated_at
BEFORE UPDATE ON public.rentri_operazioni
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();