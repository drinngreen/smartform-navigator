
CREATE TABLE public.appuntamenti_personale (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  messaggio_disponibilita text DEFAULT '',
  risposta_riccardo text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.appuntamenti_personale ENABLE ROW LEVEL SECURITY;

-- Public access (no auth required)
CREATE POLICY "Anyone can read appuntamenti" ON public.appuntamenti_personale FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Anyone can update appuntamenti" ON public.appuntamenti_personale FOR UPDATE TO anon, authenticated USING (true);
CREATE POLICY "Anyone can insert appuntamenti" ON public.appuntamenti_personale FOR INSERT TO anon, authenticated WITH CHECK (true);

-- Seed data
INSERT INTO public.appuntamenti_personale (nome) VALUES
  ('Francesca'), ('Patrizia'), ('Maria'), ('Kley'), ('Manuela'),
  ('Ramona'), ('Raffaele'), ('Daiana'), ('Sharon'), ('Kris'),
  ('Greis'), ('Davide'), ('Manolo'), ('Nello');
