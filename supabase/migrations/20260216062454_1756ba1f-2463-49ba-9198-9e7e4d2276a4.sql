
-- Add societa_id and qr_code_data to existing fir_number_pool table
ALTER TABLE public.fir_number_pool
  ADD COLUMN IF NOT EXISTS societa_id text NOT NULL DEFAULT 'global',
  ADD COLUMN IF NOT EXISTS qr_code_data text;

-- Create index for fast pool lookups by societa + status
CREATE INDEX IF NOT EXISTS idx_fir_pool_societa_status ON public.fir_number_pool (societa_id, status);
