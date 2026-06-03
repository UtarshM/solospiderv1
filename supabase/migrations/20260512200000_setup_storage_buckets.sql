-- Create storage bucket for images if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('blog_images', 'blog_images', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public access to read images
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'blog_images' );

-- Allow authenticated users to upload images
DROP POLICY IF EXISTS "Authenticated users can upload images" ON storage.objects;
CREATE POLICY "Authenticated users can upload images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK ( bucket_id = 'blog_images' );

-- Allow authenticated users to update/delete their own images (or any if needed for this app)
DROP POLICY IF EXISTS "Authenticated users can update images" ON storage.objects;
CREATE POLICY "Authenticated users can update images"
ON storage.objects FOR UPDATE
TO authenticated
USING ( bucket_id = 'blog_images' );

DROP POLICY IF EXISTS "Authenticated users can delete images" ON storage.objects;
CREATE POLICY "Authenticated users can delete images"
ON storage.objects FOR DELETE
TO authenticated
USING ( bucket_id = 'blog_images' );
