CREATE TABLE public.rentri_operation_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  tenant_id UUID,
  cliente TEXT NOT NULL,
  tipo_operazione TEXT NOT NULL,
  rentri_method TEXT,
  rentri_path TEXT,
  mode TEXT NOT NULL DEFAULT 'real',
  http_status INTEGER,
  success BOOLEAN NOT NULL DEFAULT false,
  error_code TEXT,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.rentri_operation_history TO authenticated;
GRANT ALL ON public.rentri_operation_history TO service_role;

ALTER TABLE public.rentri_operation_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rentri_history_select_own_or_tenant"
ON public.rentri_operation_history
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR (tenant_id IS NOT NULL AND public.can_access_tenant(tenant_id))
  OR public.is_multy_niyol_admin()
  OR public.is_superadmin()
);

CREATE POLICY "rentri_history_insert_self"
ON public.rentri_operation_history
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE INDEX idx_rentri_history_created_at ON public.rentri_operation_history (created_at DESC);
CREATE INDEX idx_rentri_history_cliente ON public.rentri_operation_history (cliente);
CREATE INDEX idx_rentri_history_user ON public.rentri_operation_history (user_id);