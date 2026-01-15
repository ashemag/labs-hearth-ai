import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  if (!supabaseUrl || !supabaseServiceKey) {
    return NextResponse.json({ error: "Missing Supabase credentials" }, { status: 500 });
  }

  // Create admin client with service role key
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  const results: string[] = [];

  try {
    // Try to create allowlist table by inserting (will fail if table doesn't exist)
    // First, let's just try inserting the email - if table exists, this works
    const { error: allowlistInsertError } = await supabase
      .from("allowlist")
      .upsert({ email: "ashe.magalhaes@gmail.com" }, { onConflict: "email" });

    if (allowlistInsertError) {
      results.push(`Allowlist insert error: ${allowlistInsertError.message}`);
      
      // Table probably doesn't exist - need to create via SQL Editor
      return NextResponse.json({ 
        success: false, 
        message: "Tables don't exist yet. Please run the SQL in Supabase Dashboard.",
        sqlToRun: `
-- Run this in Supabase SQL Editor:

CREATE TABLE IF NOT EXISTS allowlist (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS waitlist (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

INSERT INTO allowlist (email) VALUES ('ashe.magalhaes@gmail.com')
ON CONFLICT (email) DO NOTHING;

ALTER TABLE allowlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE waitlist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to allowlist" ON allowlist FOR SELECT USING (true);
CREATE POLICY "Allow public insert to waitlist" ON waitlist FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public read access to waitlist" ON waitlist FOR SELECT USING (true);
        `,
        results
      }, { status: 400 });
    } else {
      results.push("Allowlist: email inserted successfully");
    }

    // Test waitlist table
    const { error: waitlistTestError } = await supabase
      .from("waitlist")
      .select("id")
      .limit(1);

    if (waitlistTestError) {
      results.push(`Waitlist test error: ${waitlistTestError.message}`);
    } else {
      results.push("Waitlist: table accessible");
    }

    return NextResponse.json({ 
      success: true, 
      message: "Setup complete! Tables exist and your email is in the allowlist.",
      results
    });
  } catch (error) {
    return NextResponse.json({ 
      success: false, 
      error: String(error),
      results 
    }, { status: 500 });
  }
}
