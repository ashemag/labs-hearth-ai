import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// This endpoint creates a fresh test user for testing the new user flow
// Only works in development mode
export async function POST(request: NextRequest) {
  // Only allow in development
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available in production" }, { status: 403 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  if (!supabaseServiceKey) {
    return NextResponse.json({ error: "Service role key not configured" }, { status: 500 });
  }

  // Get the origin from the request to stay on the same host
  const origin = request.headers.get("origin") || "http://localhost:3000";

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Generate a unique test email
  const timestamp = Date.now();
  const testEmail = `test-user-${timestamp}@test.hearth.ai`;

  try {
    // Create the user in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: testEmail,
      email_confirm: true,
      password: `test-password-${timestamp}`,
    });

    if (authError) {
      console.error("Auth error:", authError);
      return NextResponse.json({ error: authError.message }, { status: 500 });
    }

    // Add to allowlist so they can proceed
    const { error: allowlistError } = await supabase
      .from("allowlist")
      .insert({ email: testEmail.toLowerCase() });

    if (allowlistError) {
      console.error("Allowlist error:", allowlistError);
      // Clean up the created user
      if (authData.user) {
        await supabase.auth.admin.deleteUser(authData.user.id);
      }
      return NextResponse.json({ error: allowlistError.message }, { status: 500 });
    }

    // Generate a magic link for this user
    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: "magiclink",
      email: testEmail,
      options: {
        redirectTo: `${origin}/auth/callback`,
      },
    });

    if (linkError) {
      console.error("Link error:", linkError);
      return NextResponse.json({ error: linkError.message }, { status: 500 });
    }

    // The magic link from Supabase points to their domain, but contains token_hash and type params
    // We need to extract those and build a link to our own auth callback
    const supabaseMagicLink = linkData.properties?.action_link || "";
    const url = new URL(supabaseMagicLink);
    const token = url.searchParams.get("token");
    const type = url.searchParams.get("type");

    // Build the link to our auth callback on the current origin
    const localMagicLink = `${origin}/auth/callback?token_hash=${token}&type=${type}`;

    return NextResponse.json({
      success: true,
      testUser: {
        email: testEmail,
        userId: authData.user?.id,
        magicLink: localMagicLink,
      },
    });
  } catch (error) {
    console.error("Error creating test user:", error);
    return NextResponse.json({ error: "Failed to create test user" }, { status: 500 });
  }
}

// Clean up test users (optional endpoint)
export async function DELETE() {
  // Only allow in development
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available in production" }, { status: 403 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  if (!supabaseServiceKey) {
    return NextResponse.json({ error: "Service role key not configured" }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // Find all test users
    const { data: allowlistEntries } = await supabase
      .from("allowlist")
      .select("email")
      .like("email", "test-user-%@test.hearth.ai");

    if (!allowlistEntries || allowlistEntries.length === 0) {
      return NextResponse.json({ message: "No test users to clean up" });
    }

    let deletedCount = 0;

    for (const entry of allowlistEntries) {
      // Find the user in auth
      const { data: users } = await supabase.auth.admin.listUsers();
      const user = users?.users?.find((u) => u.email === entry.email);

      if (user) {
        // Delete payments
        await supabase.from("user_payments").delete().eq("user_id", user.id);

        // Delete from auth
        await supabase.auth.admin.deleteUser(user.id);
      }

      // Delete from allowlist
      await supabase.from("allowlist").delete().eq("email", entry.email);

      deletedCount++;
    }

    return NextResponse.json({
      success: true,
      deletedCount,
      message: `Cleaned up ${deletedCount} test user(s)`,
    });
  } catch (error) {
    console.error("Error cleaning up test users:", error);
    return NextResponse.json({ error: "Failed to clean up test users" }, { status: 500 });
  }
}
