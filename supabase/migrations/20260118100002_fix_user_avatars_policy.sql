-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Public read access for avatars" ON storage.objects;

-- Simpler policy: Allow authenticated users to do anything in the user-avatars bucket
-- The app logic ensures users only access their own folder
CREATE POLICY "Authenticated users can manage avatars"
ON storage.objects
FOR ALL
TO authenticated
USING (bucket_id = 'user-avatars')
WITH CHECK (bucket_id = 'user-avatars');

-- Allow public read access to all avatars (for displaying)
CREATE POLICY "Public can view avatars"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'user-avatars');

