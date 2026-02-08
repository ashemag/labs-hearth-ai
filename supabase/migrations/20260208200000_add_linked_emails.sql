-- Add linked_emails to user_profiles
-- These are the user's own email addresses (work, personal, etc.)
-- Used to exclude them from calendar unmatched attendees
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS linked_emails TEXT[] DEFAULT '{}';
