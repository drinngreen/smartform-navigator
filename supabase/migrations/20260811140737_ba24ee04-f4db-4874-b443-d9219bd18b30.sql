CREATE TABLE public.rentri_invii_registri (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID,
  user_id UUID NOT NULL DEFAULT auth.uid(),
  cliente TEXT NOT NULL,
  registro_id TEXT NOT NULL,
  registro_nome TEXT,
  tipo TEXT,
  movimenti JSONB NOT NULL DEFAULT '[]'::jsonb,
  num_movimenti INTEGER NOT NULL DEFAULT 0,
  transazione_id TEXT,
  stato TEXT NOT NULL DEFAULT 'INVIATO',
  http_status INTEGER,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.rentri_invii_registri TO authenticated;
GRANT ALL ON public.rentri_invii_registri TO service_role;

ALTER TABLE public.rentri_invii_registri ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read register submissions"
ON public.rentri_invii_registri FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Owner or admin can insert register submissions"
ON public.rentri_invii_registri FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Owner or admin can update register submissions"
ON public.rentri_invii_registri FOR UPDATE TO authenticated
USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin can delete register submissions"
ON public.rentri_invii_registri FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_rentri_invii_registri_updated_at
BEFORE UPDATE ON public.rentri_invii_registri
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_rentri_invii_registri_cliente_created ON public.rentri_invii_registri (cliente, created_at DESC);