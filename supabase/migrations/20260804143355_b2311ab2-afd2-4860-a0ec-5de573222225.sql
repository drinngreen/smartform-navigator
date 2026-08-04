ALTER TABLE public.magazzino_giacenze
  ADD COLUMN IF NOT EXISTS saldo_iniziale_kg numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS saldo_snapshot_at timestamptz;

UPDATE public.magazzino_giacenze
SET saldo_iniziale_kg = quantita_kg,
    saldo_snapshot_at = now()
WHERE saldo_snapshot_at IS NULL;