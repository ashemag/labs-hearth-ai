-- Add emoji column to rolodex_lists
ALTER TABLE rolodex_lists ADD COLUMN IF NOT EXISTS emoji TEXT DEFAULT NULL;
