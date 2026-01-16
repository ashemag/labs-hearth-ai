import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  const next = searchParams.get("next") ?? "/";

  const supabase = await createClient();

  // Handle code-based auth (standard OAuth/magic link callback)
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Handle token_hash verification (for dev login and direct verification)
  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash,
      type: type as 'magiclink' | 'email',
    });
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
    console.error('OTP verification error:', error);
  }

  // Redirect to home page - AuthHandler will catch tokens in hash fragment if present
  // This handles the case where Supabase uses implicit flow (tokens in hash)
  return NextResponse.redirect(`${origin}/`);
}

