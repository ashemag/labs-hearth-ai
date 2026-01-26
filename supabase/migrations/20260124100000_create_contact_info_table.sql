-- Create table for storing contact phone/email identifiers
-- Used for matching iMessages to contacts

CREATE TABLE IF NOT EXISTS people_contact_info (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    people_id INTEGER NOT NULL REFERENCES people(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('phone', 'email')),
    value TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, people_id, type, value)
);

-- Create indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_people_contact_info_user_id ON people_contact_info(user_id);
CREATE INDEX IF NOT EXISTS idx_people_contact_info_people_id ON people_contact_info(people_id);
CREATE INDEX IF NOT EXISTS idx_people_contact_info_type_value ON people_contact_info(type, value);

-- Enable RLS
ALTER TABLE people_contact_info ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own contact info"
    ON people_contact_info FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own contact info"
    ON people_contact_info FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own contact info"
    ON people_contact_info FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own contact info"
    ON people_contact_info FOR DELETE
    USING (auth.uid() = user_id);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE people_contact_info;
ALTER TABLE people_contact_info REPLICA IDENTITY FULL;
