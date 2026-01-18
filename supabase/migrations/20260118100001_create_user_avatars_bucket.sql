-- Create the user-avatars storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'user-avatars',
    'user-avatars',
    true,
    5242880, -- 5MB
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload to their own folder
CREATE POLICY "Users can upload their own avatar"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'user-avatars' 
    AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow authenticated users to update their own avatar
CREATE POLICY "Users can update their own avatar"
ON storage.objects FOR UPDATE
TO authenticated
USING (
    bucket_id = 'user-avatars' 
    AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow public read access to all avatars
CREATE POLICY "Public read access for avatars"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'user-avatars');

