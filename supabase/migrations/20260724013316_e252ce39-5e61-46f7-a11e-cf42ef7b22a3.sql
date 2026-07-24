
-- Extensions anagrafica cliente
CREATE TABLE IF NOT EXISTS public.cliente_unita_locali (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id uuid NOT NULL REFERENCES public.anagrafica_aziende_mp(id) ON DELETE CASCADE,
  tenant_id uuid REFERENCES public.tenants(id),
  denominazione text NOT NULL,
  indirizzo text, comune text, provincia text, cap text,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.cliente_targhe (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id uuid NOT NULL REFERENCES public.anagrafica_aziende_mp(id) ON DELETE CASCADE,
  tenant_id uuid REFERENCES public.tenants(id),
  targa text NOT NULL,
  tipo_mezzo text,
  conducente_default text,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.cliente_cantieri (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id uuid NOT NULL REFERENCES public.anagrafica_aziende_mp(id) ON DELETE CASCADE,
  tenant_id uuid REFERENCES public.tenants(id),
  denominazione text NOT NULL,
  indirizzo text, comune text, provincia text,
  attivo boolean NOT NULL DEFAULT true,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.cliente_autorizzazioni (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id uuid NOT NULL REFERENCES public.anagrafica_aziende_mp(id) ON DELETE CASCADE,
  tenant_id uuid REFERENCES public.tenants(id),
  numero_autorizzazione text NOT NULL,
  ente_rilascio text,
  data_inizio date,
  data_scadenza date,
  tipo text,
  documento_url text,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.cliente_documenti (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id uuid NOT NULL REFERENCES public.anagrafica_aziende_mp(id) ON DELETE CASCADE,
  tenant_id uuid REFERENCES public.tenants(id),
  tipo text NOT NULL CHECK (tipo IN ('autorizzazione','analisi_metalli','analisi_liquidi','contratto','altro')),
  descrizione text,
  file_url text NOT NULL,
  storage_path text,
  mime_type text,
  data_documento date,
  data_scadenza date,
  uploaded_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS cliente_unita_locali_cliente_idx ON public.cliente_unita_locali(cliente_id);
CREATE INDEX IF NOT EXISTS cliente_targhe_cliente_idx ON public.cliente_targhe(cliente_id);
CREATE INDEX IF NOT EXISTS cliente_cantieri_cliente_idx ON public.cliente_cantieri(cliente_id);
CREATE INDEX IF NOT EXISTS cliente_autoriz_cliente_idx ON public.cliente_autorizzazioni(cliente_id);
CREATE INDEX IF NOT EXISTS cliente_autoriz_scad_idx ON public.cliente_autorizzazioni(data_scadenza);
CREATE INDEX IF NOT EXISTS cliente_documenti_cliente_idx ON public.cliente_documenti(cliente_id);

-- GRANTS
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cliente_unita_locali TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cliente_targhe TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cliente_cantieri TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cliente_autorizzazioni TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cliente_documenti TO authenticated;
GRANT ALL ON public.cliente_unita_locali, public.cliente_targhe, public.cliente_cantieri, public.cliente_autorizzazioni, public.cliente_documenti TO service_role;

-- RLS
ALTER TABLE public.cliente_unita_locali ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cliente_targhe ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cliente_cantieri ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cliente_autorizzazioni ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cliente_documenti ENABLE ROW LEVEL SECURITY;

DO $$ DECLARE t text; BEGIN
  FOR t IN SELECT unnest(ARRAY['cliente_unita_locali','cliente_targhe','cliente_cantieri','cliente_autorizzazioni','cliente_documenti']) LOOP
    EXECUTE format($p$CREATE POLICY "Multy/Niyol gestione %I" ON public.%I FOR ALL TO authenticated
      USING (public.is_multy_niyol_admin() OR public.has_role(auth.uid(),'admin'::public.app_role))
      WITH CHECK (public.is_multy_niyol_admin() OR public.has_role(auth.uid(),'admin'::public.app_role))$p$, t, t);
  END LOOP;
END$$;

-- Triggers updated_at
CREATE TRIGGER trg_cul_updated BEFORE UPDATE ON public.cliente_unita_locali FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_ct_updated  BEFORE UPDATE ON public.cliente_targhe        FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_cc_updated  BEFORE UPDATE ON public.cliente_cantieri      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_ca_updated  BEFORE UPDATE ON public.cliente_autorizzazioni FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Storage policies for bucket documenti_cliente (bucket creato via tool)
CREATE POLICY "Multy/Niyol read documenti_cliente"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'documenti_cliente' AND (public.is_multy_niyol_admin() OR public.has_role(auth.uid(),'admin'::public.app_role)));

CREATE POLICY "Multy/Niyol write documenti_cliente"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'documenti_cliente' AND (public.is_multy_niyol_admin() OR public.has_role(auth.uid(),'admin'::public.app_role)));

CREATE POLICY "Multy/Niyol update documenti_cliente"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'documenti_cliente' AND (public.is_multy_niyol_admin() OR public.has_role(auth.uid(),'admin'::public.app_role)));

CREATE POLICY "Multy/Niyol delete documenti_cliente"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'documenti_cliente' AND (public.is_multy_niyol_admin() OR public.has_role(auth.uid(),'admin'::public.app_role)));
