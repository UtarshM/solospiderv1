-- Create storage bucket for social media images if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('social_media', 'social_media', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public access to read social media images
DROP POLICY IF EXISTS "Public Access Social Media" ON storage.objects;
CREATE POLICY "Public Access Social Media"
ON storage.objects FOR SELECT
USING ( bucket_id = 'social_media' );

-- Allow authenticated users to upload social media images
DROP POLICY IF EXISTS "Authenticated users can upload social media" ON storage.objects;
CREATE POLICY "Authenticated users can upload social media"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK ( bucket_id = 'social_media' );

-- Allow authenticated users to update/delete their own social media images
DROP POLICY IF EXISTS "Authenticated users can update social media" ON storage.objects;
CREATE POLICY "Authenticated users can update social media"
ON storage.objects FOR UPDATE
TO authenticated
USING ( bucket_id = 'social_media' );

DROP POLICY IF EXISTS "Authenticated users can delete social media" ON storage.objects;
CREATE POLICY "Authenticated users can delete social media"
ON storage.objects FOR DELETE
TO authenticated
USING ( bucket_id = 'social_media' );
