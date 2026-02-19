
-- Rubrica Contatti
CREATE TABLE public.rubrica_contatti (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) NOT NULL,
  nome text NOT NULL,
  cognome text,
  ragione_sociale text,
  telefono text,
  cellulare text,
  email text,
  pec text,
  codice_fiscale text,
  partita_iva text,
  indirizzo text,
  comune text,
  provincia text,
  note text,
  origine text NOT NULL DEFAULT 'manuale',
  anagrafica_id uuid REFERENCES public.erp_anagrafiche(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.rubrica_contatti ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage rubrica_contatti"
  ON public.rubrica_contatti FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role) AND tenant_id = get_user_tenant(auth.uid()));

-- Comunicazioni Log
CREATE TABLE public.comunicazioni_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) NOT NULL,
  contatto_id uuid REFERENCES public.rubrica_contatti(id),
  canale text NOT NULL,
  destinatario text NOT NULL,
  oggetto text,
  contenuto text NOT NULL,
  stato text NOT NULL DEFAULT 'in_coda',
  risposta_api jsonb,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.comunicazioni_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage comunicazioni_log"
  ON public.comunicazioni_log FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role) AND tenant_id = get_user_tenant(auth.uid()));

-- Trigger: auto-sync erp_anagrafiche -> rubrica_contatti
CREATE OR REPLACE FUNCTION public.sync_anagrafica_to_rubrica()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.tenant_id IS NOT NULL THEN
    INSERT INTO public.rubrica_contatti (tenant_id, nome, cognome, ragione_sociale, telefono, email, pec, codice_fiscale, partita_iva, indirizzo, comune, provincia, note, origine, anagrafica_id)
    VALUES (
      NEW.tenant_id,
      COALESCE(NEW.nome, NEW.ragione_sociale),
      NEW.cognome,
      NEW.ragione_sociale,
      NEW.telefono,
      NEW.email,
      NEW.pec,
      NEW.codice_fiscale,
      NEW.partita_iva,
      NEW.indirizzo,
      NEW.comune,
      NEW.provincia,
      NEW.note,
      'anagrafica',
      NEW.id
    )
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER sync_anagrafica_rubrica
  AFTER INSERT ON public.erp_anagrafiche
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_anagrafica_to_rubrica();

-- Updated_at triggers
CREATE TRIGGER update_rubrica_contatti_updated_at
  BEFORE UPDATE ON public.rubrica_contatti
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Index for performance
CREATE INDEX idx_rubrica_contatti_tenant ON public.rubrica_contatti(tenant_id);
CREATE INDEX idx_comunicazioni_log_tenant ON public.comunicazioni_log(tenant_id);
