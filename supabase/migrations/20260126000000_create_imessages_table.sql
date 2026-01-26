-- =====================================================
-- PEOPLE IMESSAGES TABLE
-- Stores iMessage history synced from desktop app
-- =====================================================

CREATE TABLE IF NOT EXISTS people_imessages (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    people_id INTEGER REFERENCES people(id) ON DELETE SET NULL,
    
    -- iMessage identifiers
    handle_id TEXT NOT NULL,  -- phone number or email from iMessage
    contact_name TEXT,        -- display name from iMessage (for fuzzy matching)
    
    -- Message content
    message_text TEXT NOT NULL,
    is_from_me BOOLEAN NOT NULL DEFAULT false,
    message_date TIMESTAMPTZ NOT NULL,
    
    -- Sync metadata
    imessage_id TEXT,         -- original message ID from iMessage DB
    synced_at TIMESTAMPTZ DEFAULT NOW(),
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_people_imessages_user_id ON people_imessages(user_id);
CREATE INDEX IF NOT EXISTS idx_people_imessages_people_id ON people_imessages(people_id);
CREATE INDEX IF NOT EXISTS idx_people_imessages_handle_id ON people_imessages(user_id, handle_id);
CREATE INDEX IF NOT EXISTS idx_people_imessages_message_date ON people_imessages(message_date DESC);
CREATE INDEX IF NOT EXISTS idx_people_imessages_synced_at ON people_imessages(synced_at DESC);

-- Prevent duplicate messages
CREATE UNIQUE INDEX IF NOT EXISTS idx_people_imessages_unique 
    ON people_imessages(user_id, handle_id, imessage_id) 
    WHERE imessage_id IS NOT NULL;

-- Enable RLS
ALTER TABLE people_imessages ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own imessages"
    ON people_imessages FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own imessages"
    ON people_imessages FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own imessages"
    ON people_imessages FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own imessages"
    ON people_imessages FOR DELETE
    USING (auth.uid() = user_id);

-- Enable realtime for live updates
ALTER PUBLICATION supabase_realtime ADD TABLE people_imessages;
ALTER TABLE people_imessages REPLICA IDENTITY FULL;
