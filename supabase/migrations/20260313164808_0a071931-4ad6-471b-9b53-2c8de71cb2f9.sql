
create table public.rentri_logs (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  cliente text,
  ruolo text,
  stato text,
  messaggio text,
  dati_inviati jsonb,
  risposta_rentri jsonb
);

-- RLS disabilitata: la VPS scrive con Service Role Key
alter table public.rentri_logs enable row level security;

-- Policy per lettura admin
create policy "Admins can read rentri_logs"
on public.rentri_logs for select
to authenticated
using (public.has_role(auth.uid(), 'admin'));

-- Policy per inserimento via service role (nessuna policy INSERT = solo service role può inserire)
