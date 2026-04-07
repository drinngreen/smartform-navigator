
-- Add columns to magazzino_giacenze
ALTER TABLE public.magazzino_giacenze
  ADD COLUMN IF NOT EXISTS area_stoccaggio TEXT,
  ADD COLUMN IF NOT EXISTS stato TEXT DEFAULT 'stoccato',
  ADD COLUMN IF NOT EXISTS tipo_conferente TEXT DEFAULT 'privato';

-- Create cernite table
CREATE TABLE public.cernite (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id),
  impianto_id UUID REFERENCES public.impianti(id),
  cer_input TEXT NOT NULL,
  descrizione_input TEXT,
  quantita_input NUMERIC NOT NULL,
  stato TEXT DEFAULT 'in_corso',
  note TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create cernita_output table
CREATE TABLE public.cernita_output (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cernita_id UUID REFERENCES public.cernite(id) ON DELETE CASCADE NOT NULL,
  cer_output TEXT NOT NULL,
  descrizione_output TEXT,
  quantita NUMERIC NOT NULL,
  tipo_output TEXT DEFAULT 'rifiuto',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.cernite ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cernita_output ENABLE ROW LEVEL SECURITY;

-- RLS policies for cernite (admin only)
CREATE POLICY "Admins can view all cernite"
  ON public.cernite FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can create cernite"
  ON public.cernite FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update cernite"
  ON public.cernite FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete cernite"
  ON public.cernite FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS policies for cernita_output (admin only)
CREATE POLICY "Admins can view all cernita_output"
  ON public.cernita_output FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can create cernita_output"
  ON public.cernita_output FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update cernita_output"
  ON public.cernita_output FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete cernita_output"
  ON public.cernita_output FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Trigger for updated_at on cernite
CREATE TRIGGER update_cernite_updated_at
  BEFORE UPDATE ON public.cernite
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes
CREATE INDEX idx_cernite_tenant ON public.cernite(tenant_id);
CREATE INDEX idx_cernite_impianto ON public.cernite(impianto_id);
CREATE INDEX idx_cernite_stato ON public.cernite(stato);
CREATE INDEX idx_cernita_output_cernita ON public.cernita_output(cernita_id);
