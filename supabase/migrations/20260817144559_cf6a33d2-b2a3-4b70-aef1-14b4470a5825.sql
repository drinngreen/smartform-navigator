
CREATE TABLE IF NOT EXISTS public.sibill_documents_cache (
  doc_id text PRIMARY KEY,
  number text,
  direction text,
  type text,
  status text,
  delivery_status text,
  delivery_date timestamptz,
  document_date date,
  gross numeric,
  vat numeric,
  currency text,
  counterpart text,
  file_name text,
  is_e_invoice boolean DEFAULT false,
  raw jsonb,
  synced_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS sibill_documents_cache_dir_idx ON public.sibill_documents_cache (direction, document_date DESC);
CREATE INDEX IF NOT EXISTS sibill_documents_cache_number_idx ON public.sibill_documents_cache (number);

CREATE TABLE IF NOT EXISTS public.sibill_scan_state (
  id text PRIMARY KEY,
  cursor text,
  scanned integer NOT NULL DEFAULT 0,
  done boolean NOT NULL DEFAULT false,
  started_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.sibill_documents_cache TO authenticated;
GRANT ALL ON public.sibill_documents_cache TO service_role;
GRANT SELECT ON public.sibill_scan_state TO authenticated;
GRANT ALL ON public.sibill_scan_state TO service_role;

ALTER TABLE public.sibill_documents_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sibill_scan_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sibill_docs_cache_read" ON public.sibill_documents_cache FOR SELECT TO authenticated USING (true);
CREATE POLICY "sibill_scan_state_read" ON public.sibill_scan_state FOR SELECT TO authenticated USING (true);
