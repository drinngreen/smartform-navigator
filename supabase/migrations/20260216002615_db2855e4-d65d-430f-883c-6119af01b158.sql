
-- Drop the authenticated-only insert policy and replace with public insert
DROP POLICY IF EXISTS "Authenticated users can upload to code-backup" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update code-backup" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete from code-backup" ON storage.objects;

-- Allow anyone to upload to code-backup (temporary for restore)
CREATE POLICY "Anyone can upload to code-backup"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'code-backup');

CREATE POLICY "Anyone can update code-backup"
ON storage.objects FOR UPDATE
USING (bucket_id = 'code-backup');

CREATE POLICY "Anyone can delete from code-backup"
ON storage.objects FOR DELETE
USING (bucket_id = 'code-backup');
