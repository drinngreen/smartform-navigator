CREATE TABLE public.fatture_sibill_sync (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fattura_id uuid NOT NULL,
  tenant_id uuid,
  sibill_document_id text,
  sync_status text NOT NULL DEFAULT 'pending',
  delivery_status text,
  document_status text,
  payment_status text,
  payment_method text,
  payment_date date,
  error_title text,
  error_detail text,
  raw_response jsonb,
  last_sync_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fatture_sibill_sync_fattura_unique UNIQUE (fattura_id)
);

CREATE INDEX idx_fatture_sibill_sync_tenant ON public.fatture_sibill_sync(tenant_id);
CREATE INDEX idx_fatture_sibill_sync_docid ON public.fatture_sibill_sync(sibill_document_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.fatture_sibill_sync TO authenticated;
GRANT ALL ON public.fatture_sibill_sync TO service_role;

ALTER TABLE public.fatture_sibill_sync ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read sibill sync"
  ON public.fatture_sibill_sync FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert sibill sync"
  ON public.fatture_sibill_sync FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update sibill sync"
  ON public.fatture_sibill_sync FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated can delete sibill sync"
  ON public.fatture_sibill_sync FOR DELETE TO authenticated USING (true);

CREATE TABLE public.sibill_counterparts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid,
  azienda_id uuid,
  company_name text NOT NULL,
  vat_number text,
  tax_number text,
  sibill_counterpart_id text NOT NULL,
  raw_payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_sibill_counterparts_vat ON public.sibill_counterparts(vat_number);
CREATE INDEX idx_sibill_counterparts_tenant ON public.sibill_counterparts(tenant_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.sibill_counterparts TO authenticated;
GRANT ALL ON public.sibill_counterparts TO service_role;

ALTER TABLE public.sibill_counterparts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read sibill counterparts"
  ON public.sibill_counterparts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert sibill counterparts"
  ON public.sibill_counterparts FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update sibill counterparts"
  ON public.sibill_counterparts FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated can delete sibill counterparts"
  ON public.sibill_counterparts FOR DELETE TO authenticated USING (true);

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_fatture_sibill_sync_updated_at
  BEFORE UPDATE ON public.fatture_sibill_sync
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_sibill_counterparts_updated_at
  BEFORE UPDATE ON public.sibill_counterparts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();