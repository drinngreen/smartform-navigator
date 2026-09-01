ALTER TABLE public.registro_generale ADD COLUMN IF NOT EXISTS registro text;
CREATE INDEX IF NOT EXISTS idx_registro_generale_registro ON public.registro_generale(tenant_id, registro);

CREATE TABLE IF NOT EXISTS public.rentri_registro_esiti (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  azienda text NOT NULL,
  registro_id text NOT NULL,
  registro_label text,
  data_movimento date NOT NULL,
  numero_interno integer NOT NULL,
  movimento text,
  cer text,
  quantita_kg numeric,
  numero_fir text,
  progressivi text[] NOT NULL DEFAULT '{}',
  identificativi_rentri text[] NOT NULL DEFAULT '{}',
  transazione_id text,
  esito text NOT NULL DEFAULT 'TROVATO',
  inviato_il timestamptz,
  origine text NOT NULL DEFAULT 'TERMINALE',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_rentri_registro_esiti ON public.rentri_registro_esiti(registro_id, numero_interno);
CREATE INDEX IF NOT EXISTS idx_rentri_registro_esiti_tenant ON public.rentri_registro_esiti(tenant_id, data_movimento);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.rentri_registro_esiti TO authenticated;
GRANT ALL ON public.rentri_registro_esiti TO service_role;
ALTER TABLE public.rentri_registro_esiti ENABLE ROW LEVEL SECURITY;

CREATE POLICY "esiti_select_tenant" ON public.rentri_registro_esiti FOR SELECT TO authenticated
USING (public.can_access_tenant(tenant_id) OR public.is_multy_niyol_admin());
CREATE POLICY "esiti_insert_admin" ON public.rentri_registro_esiti FOR INSERT TO authenticated
WITH CHECK (public.can_access_tenant(tenant_id) OR public.is_multy_niyol_admin());
CREATE POLICY "esiti_update_admin" ON public.rentri_registro_esiti FOR UPDATE TO authenticated
USING (public.is_multy_niyol_admin() OR public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.is_multy_niyol_admin() OR public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "esiti_delete_admin" ON public.rentri_registro_esiti FOR DELETE TO authenticated
USING (public.is_multy_niyol_admin() OR public.has_role(auth.uid(), 'admin'::app_role));