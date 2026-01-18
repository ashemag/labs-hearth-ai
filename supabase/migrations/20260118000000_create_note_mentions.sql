-- =====================================================
-- PEOPLE NOTE MENTIONS TABLE
-- Tracks which contacts are mentioned in which notes
-- =====================================================
CREATE TABLE IF NOT EXISTS people_note_mentions (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    note_id INTEGER NOT NULL REFERENCES people_notes(id) ON DELETE CASCADE,
    mentioned_people_id INTEGER NOT NULL REFERENCES people(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(note_id, mentioned_people_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_people_note_mentions_user_id ON people_note_mentions(user_id);
CREATE INDEX IF NOT EXISTS idx_people_note_mentions_note_id ON people_note_mentions(note_id);
CREATE INDEX IF NOT EXISTS idx_people_note_mentions_mentioned_people_id ON people_note_mentions(mentioned_people_id);

-- Enable RLS
ALTER TABLE people_note_mentions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own note mentions" ON people_note_mentions
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own note mentions" ON people_note_mentions
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own note mentions" ON people_note_mentions
    FOR DELETE USING (auth.uid() = user_id);

