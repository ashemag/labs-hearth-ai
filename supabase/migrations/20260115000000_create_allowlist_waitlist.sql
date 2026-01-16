-- Create allowlist table
CREATE TABLE IF NOT EXISTS allowlist (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create waitlist table
CREATE TABLE IF NOT EXISTS waitlist (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert initial allowlist email
INSERT INTO allowlist (email) VALUES ('ashe.magalhaes@gmail.com')
ON CONFLICT (email) DO NOTHING;

-- Enable Row Level Security
ALTER TABLE allowlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE waitlist ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read allowlist (to check if email exists)
CREATE POLICY "Allow public read access to allowlist" ON allowlist
  FOR SELECT USING (true);

-- Allow anyone to insert into waitlist
CREATE POLICY "Allow public insert to waitlist" ON waitlist
  FOR INSERT WITH CHECK (true);

-- Allow anyone to read waitlist (to check if already on waitlist)
CREATE POLICY "Allow public read access to waitlist" ON waitlist
  FOR SELECT USING (true);



