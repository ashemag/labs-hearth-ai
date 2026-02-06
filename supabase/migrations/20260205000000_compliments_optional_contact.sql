-- Allow compliments without a linked contact (standalone compliments)
-- Add source_name for attributing standalone compliments to a person by name

-- Make people_id nullable
ALTER TABLE people_compliments ALTER COLUMN people_id DROP NOT NULL;

-- Drop the existing foreign key constraint and re-add with ON DELETE SET NULL
ALTER TABLE people_compliments DROP CONSTRAINT IF EXISTS people_compliments_people_id_fkey;
ALTER TABLE people_compliments ADD CONSTRAINT people_compliments_people_id_fkey
    FOREIGN KEY (people_id) REFERENCES people(id) ON DELETE SET NULL;

-- Add source_name column for standalone compliments (who said it)
ALTER TABLE people_compliments ADD COLUMN IF NOT EXISTS source_name TEXT;

-- Make compliment text nullable (screenshot-only entries don't need text)
ALTER TABLE people_compliments ALTER COLUMN compliment DROP NOT NULL;

-- Add image_url column for screenshot-based compliments
ALTER TABLE people_compliments ADD COLUMN IF NOT EXISTS image_url TEXT;
