-- =====================================================
-- USER AI SETTINGS
-- Stores model provider config and encrypted API keys
-- =====================================================

-- Create the table for AI provider settings
CREATE TABLE IF NOT EXISTS user_ai_settings (
    id serial PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    provider text NOT NULL DEFAULT 'anthropic',
    api_key_encrypted text, -- encrypted on the server before storage
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE user_ai_settings ENABLE ROW LEVEL SECURITY;

-- Users can only access their own settings
CREATE POLICY "Users can view own AI settings"
    ON user_ai_settings FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own AI settings"
    ON user_ai_settings FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own AI settings"
    ON user_ai_settings FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own AI settings"
    ON user_ai_settings FOR DELETE
    USING (auth.uid() = user_id);
