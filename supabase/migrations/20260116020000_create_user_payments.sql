-- Create user_payments table to track beta payments
CREATE TABLE IF NOT EXISTS user_payments (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    stripe_payment_intent_id TEXT,
    amount_cents INTEGER NOT NULL DEFAULT 10000,  -- $100.00
    status TEXT NOT NULL DEFAULT 'pending',  -- pending, completed, failed
    paid_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_payments_user_id ON user_payments(user_id);
CREATE INDEX IF NOT EXISTS idx_user_payments_status ON user_payments(status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_payments_user_id_completed ON user_payments(user_id) WHERE status = 'completed';

-- Enable RLS
ALTER TABLE user_payments ENABLE ROW LEVEL SECURITY;

-- Users can view their own payments
CREATE POLICY "Users can view own payments" ON user_payments
    FOR SELECT USING (auth.uid() = user_id);

-- Service role can do everything (for API routes)
CREATE POLICY "Service role full access" ON user_payments
    FOR ALL USING (true) WITH CHECK (true);

