-- Google Calendar Webhook/Push Notification Tracking
-- Stores webhook subscriptions for real-time calendar updates

CREATE TABLE IF NOT EXISTS google_calendar_watches (
    id SERIAL PRIMARY KEY,
    google_oauth_id INTEGER NOT NULL REFERENCES user_google_oauth(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Watch subscription identifiers from Google
    channel_id UUID NOT NULL UNIQUE,  -- Our generated UUID for the channel
    resource_id TEXT NOT NULL,         -- Google's resource ID for the subscription

    -- Calendar being watched
    calendar_id TEXT NOT NULL DEFAULT 'primary',

    -- Subscription metadata
    expiration TIMESTAMPTZ NOT NULL,   -- When the watch expires (max 7 days from Google)

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_google_calendar_watches_oauth_id ON google_calendar_watches(google_oauth_id);
CREATE INDEX IF NOT EXISTS idx_google_calendar_watches_user_id ON google_calendar_watches(user_id);
CREATE INDEX IF NOT EXISTS idx_google_calendar_watches_channel_id ON google_calendar_watches(channel_id);
CREATE INDEX IF NOT EXISTS idx_google_calendar_watches_expiration ON google_calendar_watches(expiration);

-- Enable RLS
ALTER TABLE google_calendar_watches ENABLE ROW LEVEL SECURITY;

-- RLS policies - users can manage their own watches
CREATE POLICY "Users can view own calendar watches"
    ON google_calendar_watches FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own calendar watches"
    ON google_calendar_watches FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own calendar watches"
    ON google_calendar_watches FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own calendar watches"
    ON google_calendar_watches FOR DELETE
    USING (auth.uid() = user_id);

-- Service role bypass for webhook handler (needs to look up by channel_id without user context)
CREATE POLICY "Service role can manage all watches"
    ON google_calendar_watches FOR ALL
    USING (auth.role() = 'service_role');
