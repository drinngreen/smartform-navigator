
-- Nuovo modulo Fatturazione (isolato, non tocca tabelle esistenti)

CREATE TABLE IF NOT EXISTS public.fatture (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  numero INTEGER NOT NULL,
  anno INTEGER NOT NULL DEFAULT EXTRACT(YEAR FROM now())::int,
  numero_completo TEXT GENERATED ALWAYS AS (numero::text || '/' || anno::text) STORED,
  data_emissione DATE NOT NULL DEFAULT CURRENT_DATE,
  cliente_id UUID,
  cliente_ragione_sociale TEXT NOT NULL,
  cliente_partita_iva TEXT,
  cliente_codice_fiscale TEXT,
  cliente_indirizzo TEXT,
  cliente_unita_locale TEXT,
  tipo TEXT NOT NULL DEFAULT 'servizi', -- 'servizi' | 'noleggio'
  stato TEXT NOT NULL DEFAULT 'cortesia', -- 'cortesia' | 'inviata' | 'annullata'
  imponibile NUMERIC(14,2) NOT NULL DEFAULT 0,
  iva NUMERIC(14,2) NOT NULL DEFAULT 0,
  totale NUMERIC(14,2) NOT NULL DEFAULT 0,
  reverse_charge BOOLEAN NOT NULL DEFAULT false,
  note TEXT,
  cortesia_pdf_url TEXT,
  xml_url TEXT,
  xml_generato_at TIMESTAMPTZ,
  inviata_at TIMESTAMPTZ,
  locked BOOLEAN NOT NULL DEFAULT false,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, anno, numero)
);

CREATE TABLE IF NOT EXISTS public.fatture_righe (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fattura_id UUID NOT NULL REFERENCES public.fatture(id) ON DELETE CASCADE,
  ordine INTEGER NOT NULL DEFAULT 0,
  descrizione TEXT NOT NULL,
  cer TEXT,
  fir_form_id UUID, -- riferimento in sola lettura ai formulari
  numero_fir TEXT,
  quantita NUMERIC(14,3) NOT NULL DEFAULT 1,
  unita_misura TEXT NOT NULL DEFAULT 'kg',
  prezzo_unitario NUMERIC(14,4) NOT NULL DEFAULT 0,
  imponibile NUMERIC(14,2) NOT NULL DEFAULT 0,
  aliquota_iva NUMERIC(5,2) NOT NULL DEFAULT 22,
  iva NUMERIC(14,2) NOT NULL DEFAULT 0,
  totale NUMERIC(14,2) NOT NULL DEFAULT 0,
  reverse_charge BOOLEAN NOT NULL DEFAULT false,
  tipo_riga TEXT NOT NULL DEFAULT 'servizio', -- 'servizio' | 'trasporto' | 'noleggio'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fatture_tenant ON public.fatture(tenant_id);
CREATE INDEX IF NOT EXISTS idx_fatture_stato ON public.fatture(stato);
CREATE INDEX IF NOT EXISTS idx_fatture_cliente ON public.fatture(cliente_id);
CREATE INDEX IF NOT EXISTS idx_fatture_data ON public.fatture(data_emissione);
CREATE INDEX IF NOT EXISTS idx_fatture_righe_fattura ON public.fatture_righe(fattura_id);
CREATE INDEX IF NOT EXISTS idx_fatture_righe_fir ON public.fatture_righe(fir_form_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.fatture TO authenticated;
GRANT ALL ON public.fatture TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fatture_righe TO authenticated;
GRANT ALL ON public.fatture_righe TO service_role;

ALTER TABLE public.fatture ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fatture_righe ENABLE ROW LEVEL SECURITY;

-- Policies: admin del tenant può gestire; super admin sempre
CREATE POLICY "fatture_tenant_admin_all" ON public.fatture
  FOR ALL TO authenticated
  USING (
    public.is_superadmin()
    OR (
      tenant_id = public.get_user_tenant(auth.uid())
      AND public.has_role(auth.uid(), 'admin'::public.app_role)
    )
    OR (
      public.is_multy_niyol_admin() AND public.is_allowed_multy_niyol_tenant(tenant_id)
    )
  )
  WITH CHECK (
    public.is_superadmin()
    OR (
      tenant_id = public.get_user_tenant(auth.uid())
      AND public.has_role(auth.uid(), 'admin'::public.app_role)
    )
    OR (
      public.is_multy_niyol_admin() AND public.is_allowed_multy_niyol_tenant(tenant_id)
    )
  );

CREATE POLICY "fatture_righe_via_parent" ON public.fatture_righe
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.fatture f
      WHERE f.id = fattura_id
        AND (
          public.is_superadmin()
          OR (f.tenant_id = public.get_user_tenant(auth.uid()) AND public.has_role(auth.uid(), 'admin'::public.app_role))
          OR (public.is_multy_niyol_admin() AND public.is_allowed_multy_niyol_tenant(f.tenant_id))
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.fatture f
      WHERE f.id = fattura_id
        AND (
          public.is_superadmin()
          OR (f.tenant_id = public.get_user_tenant(auth.uid()) AND public.has_role(auth.uid(), 'admin'::public.app_role))
          OR (public.is_multy_niyol_admin() AND public.is_allowed_multy_niyol_tenant(f.tenant_id))
        )
    )
  );

-- Trigger updated_at
CREATE TRIGGER trg_fatture_updated_at
  BEFORE UPDATE ON public.fatture
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Blocca modifiche a fatture inviate (locked)
CREATE OR REPLACE FUNCTION public.fatture_prevent_locked_edit()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.locked = true THEN
    -- Consenti solo aggiornamenti di note e xml_url
    IF (NEW.imponibile IS DISTINCT FROM OLD.imponibile)
       OR (NEW.iva IS DISTINCT FROM OLD.iva)
       OR (NEW.totale IS DISTINCT FROM OLD.totale)
       OR (NEW.cliente_id IS DISTINCT FROM OLD.cliente_id)
       OR (NEW.data_emissione IS DISTINCT FROM OLD.data_emissione)
       OR (NEW.numero IS DISTINCT FROM OLD.numero) THEN
      RAISE EXCEPTION 'Fattura % inviata e bloccata: non modificabile', OLD.numero_completo
        USING ERRCODE = '23514';
    END IF;
  END IF;
  IF TG_OP = 'DELETE' AND OLD.locked = true THEN
    RAISE EXCEPTION 'Fattura % inviata: eliminazione non consentita', OLD.numero_completo
      USING ERRCODE = '23514';
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_fatture_lock_guard
  BEFORE UPDATE OR DELETE ON public.fatture
  FOR EACH ROW EXECUTE FUNCTION public.fatture_prevent_locked_edit();

-- Prossimo numero fattura progressivo per tenant/anno
CREATE OR REPLACE FUNCTION public.next_fattura_number(p_tenant_id UUID, p_anno INTEGER)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_next INTEGER;
BEGIN
  SELECT COALESCE(MAX(numero), 0) + 1 INTO v_next
  FROM public.fatture
  WHERE tenant_id = p_tenant_id AND anno = p_anno;
  RETURN v_next;
END;
$$;
