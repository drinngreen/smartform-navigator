
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS deactivated_at timestamptz NULL;

CREATE INDEX IF NOT EXISTS profiles_deactivated_at_idx
  ON public.profiles (deactivated_at)
  WHERE deactivated_at IS NOT NULL;
