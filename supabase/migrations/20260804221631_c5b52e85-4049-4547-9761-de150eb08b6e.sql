CREATE TABLE IF NOT EXISTS public.cliente_conducenti (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid references public.anagrafica_aziende_mp(id) on delete cascade,
  tenant_id uuid,
  cognome text,
  nome text,
  note text,
  created_at timestamptz not null default now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cliente_conducenti TO authenticated;
GRANT ALL ON public.cliente_conducenti TO service_role;
ALTER TABLE public.cliente_conducenti ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth manage cliente_conducenti" ON public.cliente_conducenti FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.cliente_partner_default (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid references public.anagrafica_aziende_mp(id) on delete cascade,
  tenant_id uuid,
  ruolo text not null,
  ragione_sociale text,
  indirizzo text,
  cap text,
  citta text,
  provincia text,
  created_at timestamptz not null default now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cliente_partner_default TO authenticated;
GRANT ALL ON public.cliente_partner_default TO service_role;
ALTER TABLE public.cliente_partner_default ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth manage cliente_partner_default" ON public.cliente_partner_default FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE UNIQUE INDEX IF NOT EXISTS uq_cliente_conducenti ON public.cliente_conducenti (cliente_id, coalesce(cognome,''), coalesce(nome,''));
CREATE UNIQUE INDEX IF NOT EXISTS uq_cliente_partner_default ON public.cliente_partner_default (cliente_id, ruolo, coalesce(ragione_sociale,''), coalesce(indirizzo,''));
CREATE UNIQUE INDEX IF NOT EXISTS uq_cliente_cantieri ON public.cliente_cantieri (cliente_id, coalesce(denominazione,''), coalesce(indirizzo,''), coalesce(comune,''));
CREATE UNIQUE INDEX IF NOT EXISTS uq_cliente_targhe ON public.cliente_targhe (cliente_id, targa);
CREATE UNIQUE INDEX IF NOT EXISTS uq_cliente_autorizzazioni ON public.cliente_autorizzazioni (cliente_id, coalesce(tipo,''), coalesce(numero_autorizzazione,''), coalesce(data_scadenza,'1900-01-01'::date));
CREATE UNIQUE INDEX IF NOT EXISTS uq_anagrafica_codice_tenant ON public.anagrafica_aziende_mp (tenant_id, codice);