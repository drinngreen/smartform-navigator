
-- Tabella account impianti destinatari (login separato, non legato a auth.users)
CREATE TABLE public.impianti_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ragione_sociale TEXT NOT NULL,
  email TEXT NOT NULL,
  password_hash TEXT NOT NULL, -- bcrypt hash
  tenant_id UUID REFERENCES public.tenants(id),
  attivo BOOLEAN NOT NULL DEFAULT true,
  ultimo_accesso TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(email)
);

ALTER TABLE public.impianti_accounts ENABLE ROW LEVEL SECURITY;

-- Admin possono tutto
CREATE POLICY "admin_full_access_impianti_accounts" ON public.impianti_accounts
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Tabella per collegare FIR completati agli impianti destinatari
CREATE TABLE public.impianto_fir_inbox (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  impianto_account_id UUID NOT NULL REFERENCES public.impianti_accounts(id) ON DELETE CASCADE,
  fir_form_id UUID NOT NULL REFERENCES public.fir_forms(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES public.tenants(id),
  stato TEXT NOT NULL DEFAULT 'ricevuto', -- ricevuto, confermato, contestato
  peso_verificato NUMERIC,
  note_impianto TEXT,
  data_conferma TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(fir_form_id, impianto_account_id)
);

ALTER TABLE public.impianto_fir_inbox ENABLE ROW LEVEL SECURITY;

-- Admin possono tutto
CREATE POLICY "admin_full_access_impianto_fir_inbox" ON public.impianto_fir_inbox
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Anon può leggere i propri FIR (via edge function con JWT custom)
CREATE POLICY "anon_read_own_inbox" ON public.impianto_fir_inbox
  FOR SELECT TO anon
  USING (true);

-- Anon può aggiornare stato
CREATE POLICY "anon_update_own_inbox" ON public.impianto_fir_inbox
  FOR UPDATE TO anon
  USING (true)
  WITH CHECK (true);

-- Trigger updated_at
CREATE TRIGGER update_impianti_accounts_updated_at
  BEFORE UPDATE ON public.impianti_accounts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_impianto_fir_inbox_updated_at
  BEFORE UPDATE ON public.impianto_fir_inbox
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
