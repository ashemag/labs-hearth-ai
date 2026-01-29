-- Google Calendar Integration Tables
-- Stores OAuth tokens and calendar events for touchpoint tracking

-- Table to store Google OAuth tokens per user
CREATE TABLE IF NOT EXISTS user_google_oauth (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- OAuth tokens (encrypted)
    access_token_encrypted TEXT NOT NULL,
    refresh_token_encrypted TEXT NOT NULL,
    token_expiry TIMESTAMPTZ NOT NULL,

    -- Account info
    google_email TEXT NOT NULL,
    google_name TEXT,

    -- Sync metadata
    last_sync_at TIMESTAMPTZ,
    sync_cursor TEXT,  -- For incremental sync (syncToken from Google)

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(user_id, google_email)
);

-- Table to store calendar events as touchpoints
CREATE TABLE IF NOT EXISTS people_calendar_events (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    people_id INTEGER REFERENCES people(id) ON DELETE SET NULL,

    -- Calendar identifiers
    google_oauth_id INTEGER NOT NULL REFERENCES user_google_oauth(id) ON DELETE CASCADE,
    calendar_id TEXT NOT NULL,  -- Calendar ID from Google
    event_id TEXT NOT NULL,     -- Event ID from Google

    -- Attendee info (the contact we're linking to)
    attendee_email TEXT NOT NULL,
    attendee_name TEXT,

    -- Event details
    event_title TEXT,
    event_description TEXT,
    event_start TIMESTAMPTZ NOT NULL,
    event_end TIMESTAMPTZ,
    event_location TEXT,
    is_organizer BOOLEAN DEFAULT false,  -- Is the user the organizer?
    response_status TEXT,  -- needsAction, declined, tentative, accepted

    -- Sync metadata
    synced_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_user_google_oauth_user_id ON user_google_oauth(user_id);
CREATE INDEX IF NOT EXISTS idx_people_calendar_events_user_id ON people_calendar_events(user_id);
CREATE INDEX IF NOT EXISTS idx_people_calendar_events_people_id ON people_calendar_events(people_id);
CREATE INDEX IF NOT EXISTS idx_people_calendar_events_start ON people_calendar_events(event_start DESC);
CREATE INDEX IF NOT EXISTS idx_people_calendar_events_attendee ON people_calendar_events(user_id, attendee_email);

-- Unique constraint to prevent duplicate events per attendee
CREATE UNIQUE INDEX IF NOT EXISTS idx_people_calendar_events_unique
    ON people_calendar_events(user_id, google_oauth_id, calendar_id, event_id, attendee_email);

-- Enable RLS
ALTER TABLE user_google_oauth ENABLE ROW LEVEL SECURITY;
ALTER TABLE people_calendar_events ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_google_oauth
CREATE POLICY "Users can view own OAuth tokens"
    ON user_google_oauth FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own OAuth tokens"
    ON user_google_oauth FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own OAuth tokens"
    ON user_google_oauth FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own OAuth tokens"
    ON user_google_oauth FOR DELETE
    USING (auth.uid() = user_id);

-- RLS policies for people_calendar_events
CREATE POLICY "Users can view own calendar events"
    ON people_calendar_events FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own calendar events"
    ON people_calendar_events FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own calendar events"
    ON people_calendar_events FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own calendar events"
    ON people_calendar_events FOR DELETE
    USING (auth.uid() = user_id);
