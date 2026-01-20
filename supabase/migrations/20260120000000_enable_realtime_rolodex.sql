-- Enable Supabase Realtime for rolodex tables
-- This allows the frontend to receive live updates when data changes

ALTER PUBLICATION supabase_realtime ADD TABLE people;
ALTER PUBLICATION supabase_realtime ADD TABLE people_x_profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE people_linkedin_profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE people_notes;
ALTER PUBLICATION supabase_realtime ADD TABLE people_touchpoints;
ALTER PUBLICATION supabase_realtime ADD TABLE people_websites;
ALTER PUBLICATION supabase_realtime ADD TABLE people_compliments;
ALTER PUBLICATION supabase_realtime ADD TABLE rolodex_lists;
ALTER PUBLICATION supabase_realtime ADD TABLE rolodex_list_members;
ALTER PUBLICATION supabase_realtime ADD TABLE rolodex_todos;
