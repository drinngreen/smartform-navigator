CREATE TABLE public.rentri_invii_privati (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  conferimento_id uuid,
  numero_riga integer,
  data_movimento date NOT NULL,
  cer text NOT NULL,
  kg numeric NOT NULL DEFAULT 0,
  produttore text,
  mezzo text,
  progressivo_rentri text,
  transazione_id text,
  id_ricevuta text,
  esito text,
  stato text NOT NULL DEFAULT 'NON_CONFERMATO',
  origine text NOT NULL DEFAULT 'APP',
  unique_key text UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.rentri_invii_privati TO authenticated;
GRANT ALL ON public.rentri_invii_privati TO service_role;

ALTER TABLE public.rentri_invii_privati ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rip_select" ON public.rentri_invii_privati
  FOR SELECT TO authenticated
  USING (can_access_tenant(tenant_id) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "rip_insert" ON public.rentri_invii_privati
  FOR INSERT TO authenticated
  WITH CHECK (can_access_tenant(tenant_id) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "rip_update" ON public.rentri_invii_privati
  FOR UPDATE TO authenticated
  USING (can_access_tenant(tenant_id) OR has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (can_access_tenant(tenant_id) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "rip_delete" ON public.rentri_invii_privati
  FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_rip_tenant_data ON public.rentri_invii_privati (tenant_id, data_movimento DESC);
CREATE INDEX idx_rip_conferimento ON public.rentri_invii_privati (conferimento_id);

CREATE TRIGGER update_rentri_invii_privati_updated_at
  BEFORE UPDATE ON public.rentri_invii_privati
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();