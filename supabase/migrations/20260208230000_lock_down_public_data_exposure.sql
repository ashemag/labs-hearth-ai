-- Lock down public data exposure for auth lists and private media.

DROP POLICY IF EXISTS "Allow public read access to allowlist" ON allowlist;
DROP POLICY IF EXISTS "Allow public read access to waitlist" ON waitlist;

CREATE POLICY "Allow authenticated users to read their own allowlist entry"
ON allowlist
FOR SELECT
TO authenticated
USING (lower(email) = lower(coalesce(auth.jwt()->>'email', '')));

UPDATE storage.buckets
SET public = FALSE
WHERE id IN ('user-avatars', 'contact-images');

DROP POLICY IF EXISTS "Public read access for avatars" ON storage.objects;
DROP POLICY IF EXISTS "Public can view avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can manage avatars" ON storage.objects;
DROP POLICY IF EXISTS "Public can view contact images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can manage contact images" ON storage.objects;

CREATE POLICY "Users can view their own avatars"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'user-avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can insert their own avatars"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'user-avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can update their own avatars"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'user-avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'user-avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can delete their own avatars"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'user-avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can view their own contact images"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'contact-images'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can insert their own contact images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'contact-images'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can update their own contact images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'contact-images'
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'contact-images'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can delete their own contact images"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'contact-images'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

UPDATE user_profiles
SET avatar_url = '/api/media/user-avatars/' ||
  split_part(split_part(avatar_url, '/storage/v1/object/public/user-avatars/', 2), '?', 1)
WHERE avatar_url LIKE '%/storage/v1/object/public/user-avatars/%';

UPDATE people
SET custom_profile_image_url = '/api/media/contact-images/' ||
  split_part(split_part(custom_profile_image_url, '/storage/v1/object/public/contact-images/', 2), '?', 1)
WHERE custom_profile_image_url LIKE '%/storage/v1/object/public/contact-images/%';

UPDATE people_compliments
SET image_url = '/api/media/contact-images/' ||
  split_part(split_part(image_url, '/storage/v1/object/public/contact-images/', 2), '?', 1)
WHERE image_url LIKE '%/storage/v1/object/public/contact-images/%';
