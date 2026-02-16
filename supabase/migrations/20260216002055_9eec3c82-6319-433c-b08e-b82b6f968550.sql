
-- Create public bucket for temporary code backup/restore
INSERT INTO storage.buckets (id, name, public) VALUES ('code-backup', 'code-backup', true);

-- Allow authenticated users to upload files
CREATE POLICY "Authenticated users can upload to code-backup"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'code-backup');

-- Allow anyone to read (public bucket)
CREATE POLICY "Public read access for code-backup"
ON storage.objects FOR SELECT
USING (bucket_id = 'code-backup');

-- Allow authenticated users to overwrite/delete
CREATE POLICY "Authenticated users can update code-backup"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'code-backup');

CREATE POLICY "Authenticated users can delete from code-backup"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'code-backup');
