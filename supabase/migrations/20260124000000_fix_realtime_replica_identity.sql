-- Fix Realtime by setting REPLICA IDENTITY FULL
-- This ensures UPDATE and DELETE events include the full row data
-- Required for Supabase Realtime to properly broadcast changes

ALTER TABLE people REPLICA IDENTITY FULL;
ALTER TABLE people_x_profiles REPLICA IDENTITY FULL;
ALTER TABLE people_linkedin_profiles REPLICA IDENTITY FULL;
ALTER TABLE people_notes REPLICA IDENTITY FULL;
ALTER TABLE people_touchpoints REPLICA IDENTITY FULL;
ALTER TABLE people_websites REPLICA IDENTITY FULL;
ALTER TABLE people_compliments REPLICA IDENTITY FULL;
ALTER TABLE rolodex_lists REPLICA IDENTITY FULL;
ALTER TABLE rolodex_list_members REPLICA IDENTITY FULL;
ALTER TABLE rolodex_todos REPLICA IDENTITY FULL;
