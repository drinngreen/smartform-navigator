
CREATE TABLE public.ddt_forms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id),
  numero_ddt text NOT NULL,
  anno integer NOT NULL DEFAULT EXTRACT(YEAR FROM now())::integer,
  data date NOT NULL DEFAULT CURRENT_DATE,
  cliente_destinatario text NOT NULL,
  indirizzo_destinazione text,
  descrizione_bene text NOT NULL,
  quantita text,
  targa_mezzo text,
  conducente text,
  causale_trasporto text NOT NULL DEFAULT 'Conto proprio',
  note text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, anno, numero_ddt)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ddt_forms TO authenticated;
GRANT ALL ON public.ddt_forms TO service_role;

ALTER TABLE public.ddt_forms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Multy/Niyol gestione ddt" ON public.ddt_forms
  FOR ALL TO authenticated
  USING (public.is_multy_niyol_admin() OR public.has_role(auth.uid(),'admin'::public.app_role))
  WITH CHECK (public.is_multy_niyol_admin() OR public.has_role(auth.uid(),'admin'::public.app_role));

CREATE TRIGGER trg_ddt_updated BEFORE UPDATE ON public.ddt_forms
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.next_ddt_number(p_tenant_id uuid, p_anno integer)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  SELECT COUNT(*) + 1 INTO v_count
  FROM public.ddt_forms
  WHERE tenant_id = p_tenant_id AND anno = p_anno;
  RETURN LPAD(v_count::text, 4, '0') || '/' || p_anno::text;
END;
$$;
