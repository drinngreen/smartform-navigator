
DROP POLICY IF EXISTS "Anyone can delete from code-backup" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can upload to code-backup" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can update code-backup" ON storage.objects;

CREATE POLICY "Admins can upload to code-backup" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'code-backup' AND (public.has_role(auth.uid(),'admin'::app_role) OR public.is_multy_niyol_admin()));

CREATE POLICY "Admins can update code-backup" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'code-backup' AND (public.has_role(auth.uid(),'admin'::app_role) OR public.is_multy_niyol_admin()))
WITH CHECK (bucket_id = 'code-backup' AND (public.has_role(auth.uid(),'admin'::app_role) OR public.is_multy_niyol_admin()));

CREATE POLICY "Admins can delete code-backup" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'code-backup' AND (public.has_role(auth.uid(),'admin'::app_role) OR public.is_multy_niyol_admin()));
