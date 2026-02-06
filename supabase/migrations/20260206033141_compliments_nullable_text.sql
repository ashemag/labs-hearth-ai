-- Make compliment text nullable (screenshot-only entries don't need text)
ALTER TABLE people_compliments ALTER COLUMN compliment DROP NOT NULL;
