
-- Remove the overly permissive policy (service role key bypasses RLS anyway)
DROP POLICY "Service role full access" ON public.ai_user_memory;
