-- Create slack_tokens table to store bot tokens (multi-workspace)
CREATE TABLE IF NOT EXISTS slack_tokens (
    id SERIAL PRIMARY KEY,
    team_id TEXT UNIQUE NOT NULL,           -- Slack workspace ID (unique per workspace)
    team_name TEXT,                          -- Slack workspace name
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,  -- Link to Hearth user
    bot_token TEXT NOT NULL,
    bot_user_id TEXT,                        -- Slack bot user ID
    refresh_token TEXT,
    authed_user_id TEXT,                     -- Slack user who installed the app
    scope TEXT,                              -- Granted scopes
    expires_at TIMESTAMPTZ,
    last_refreshed_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_slack_tokens_team ON slack_tokens(team_id);
CREATE INDEX IF NOT EXISTS idx_slack_tokens_user ON slack_tokens(user_id);

-- Enable RLS
ALTER TABLE slack_tokens ENABLE ROW LEVEL SECURITY;

-- Users can only see their own Slack connections
CREATE POLICY "Users can view own slack tokens" ON slack_tokens
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own slack tokens" ON slack_tokens
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own slack tokens" ON slack_tokens
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own slack tokens" ON slack_tokens
    FOR DELETE USING (auth.uid() = user_id);

