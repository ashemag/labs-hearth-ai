-- Create storage bucket for contact profile images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('contact-images', 'contact-images', TRUE, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
ON CONFLICT (id) DO NOTHING;

-- Allow public read access to all contact images
CREATE POLICY "Public can view contact images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'contact-images');

-- Allow authenticated users to manage contact images
CREATE POLICY "Authenticated users can manage contact images"
ON storage.objects
FOR ALL
TO authenticated
USING (bucket_id = 'contact-images')
WITH CHECK (bucket_id = 'contact-images');

