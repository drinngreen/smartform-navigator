
-- Table for admin system prompt requests per tenant
CREATE TABLE public.system_prompt_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id),
  tenant_label TEXT NOT NULL,
  user_id UUID NOT NULL,
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  admin_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.system_prompt_requests ENABLE ROW LEVEL SECURITY;

-- Users can view own requests
CREATE POLICY "Users can view own prompt requests"
ON public.system_prompt_requests FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert own requests
CREATE POLICY "Users can insert own prompt requests"
ON public.system_prompt_requests FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update own requests
CREATE POLICY "Users can update own prompt requests"
ON public.system_prompt_requests FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete own requests
CREATE POLICY "Users can delete own prompt requests"
ON public.system_prompt_requests FOR DELETE
USING (auth.uid() = user_id);

-- Admins can see all (using has_role)
CREATE POLICY "Admins can view all prompt requests"
ON public.system_prompt_requests FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can update all (for status/notes)
CREATE POLICY "Admins can update all prompt requests"
ON public.system_prompt_requests FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_system_prompt_requests_updated_at
BEFORE UPDATE ON public.system_prompt_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
