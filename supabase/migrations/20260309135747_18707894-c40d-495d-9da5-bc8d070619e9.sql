ALTER TABLE public.notifications 
ADD COLUMN app_context text DEFAULT NULL,
ADD COLUMN tenant_id uuid DEFAULT NULL;