-- Fix linter WARN: overly permissive policy on office_calls
-- (previous migration attempt failed with: ERROR: 42601: syntax error at or near "CREATE")

ALTER TABLE public.office_calls ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role can update calls" ON public.office_calls;
DROP POLICY IF EXISTS "Participants can update office_calls" ON public.office_calls;
DROP POLICY IF EXISTS "Users can insert office_calls" ON public.office_calls;
DROP POLICY IF EXISTS "Admins can view office_calls" ON public.office_calls;
DROP POLICY IF EXISTS "Users can view own office_calls" ON public.office_calls;

-- INSERT: user can only insert their own rows
CREATE POLICY "Users can insert office_calls"
ON public.office_calls
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- UPDATE: user can update their own rows; admins can update any
CREATE POLICY "Participants can update office_calls"
ON public.office_calls
FOR UPDATE
USING ((auth.uid() = user_id) OR has_role(auth.uid(), 'admin'::app_role))
WITH CHECK ((auth.uid() = user_id) OR has_role(auth.uid(), 'admin'::app_role));

-- SELECT: user can see their own rows
CREATE POLICY "Users can view own office_calls"
ON public.office_calls
FOR SELECT
USING (auth.uid() = user_id);

-- SELECT: admins can see all
CREATE POLICY "Admins can view office_calls"
ON public.office_calls
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));