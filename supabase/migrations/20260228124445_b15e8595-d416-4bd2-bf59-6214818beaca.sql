
-- Create storage bucket for social media uploads
INSERT INTO storage.buckets (id, name, public) VALUES ('social-media', 'social-media', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload to social-media bucket
CREATE POLICY "Authenticated users upload social media"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'social-media' 
  AND auth.role() = 'authenticated'
);

-- Public read access for social media
CREATE POLICY "Public read social media"
ON storage.objects FOR SELECT
USING (bucket_id = 'social-media');

-- Users can delete their own uploads
CREATE POLICY "Users delete own social media"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'social-media' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);
