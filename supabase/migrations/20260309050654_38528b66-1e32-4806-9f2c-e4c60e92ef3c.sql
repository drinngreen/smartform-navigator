
-- Fix overly permissive RLS on impianto_fir_inbox
-- Replace anon policies with service_role only (edge function handles auth)
DROP POLICY IF EXISTS "anon_read_own_inbox" ON public.impianto_fir_inbox;
DROP POLICY IF EXISTS "anon_update_own_inbox" ON public.impianto_fir_inbox;

-- Service role bypasses RLS automatically, so no anon policies needed
-- Add a read policy for anon that uses a custom claim from JWT
CREATE POLICY "service_role_bypass" ON public.impianto_fir_inbox
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);
