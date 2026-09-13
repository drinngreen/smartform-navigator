create table if not exists public.rentri_invii_reali (
  id uuid primary key default gen_random_uuid(),
  azienda text not null,
  nome_registro text not null,
  registro text not null,
  data_registrazione date not null,
  data_trasmissione timestamptz,
  progressivo_anno text,
  id_rentri text,
  causale text,
  fir text,
  fir_norm text,
  unique_key text unique,
  created_at timestamptz not null default now()
);
grant select on public.rentri_invii_reali to authenticated;
grant all on public.rentri_invii_reali to service_role;
alter table public.rentri_invii_reali enable row level security;
drop policy if exists rentri_invii_reali_select_auth on public.rentri_invii_reali;
create policy rentri_invii_reali_select_auth on public.rentri_invii_reali for select to authenticated using (true);
create index if not exists idx_rir_registro_data on public.rentri_invii_reali(registro, data_registrazione);
create index if not exists idx_rir_firnorm on public.rentri_invii_reali(fir_norm);