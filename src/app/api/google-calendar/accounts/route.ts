import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET - List connected Google accounts
export async function GET() {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: accounts, error } = await supabase
        .from("user_google_oauth")
        .select("id, google_email, google_name, last_sync_at, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true });

    if (error) {
        console.error("Error fetching accounts:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ accounts: accounts || [] });
}

// DELETE - Disconnect a Google account
export async function DELETE(req: NextRequest) {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const accountId = searchParams.get("id");

    if (!accountId) {
        return NextResponse.json({ error: "Account ID required" }, { status: 400 });
    }

    // Delete calendar events first (cascade should handle this, but be explicit)
    await supabase
        .from("people_calendar_events")
        .delete()
        .eq("user_id", user.id)
        .eq("google_oauth_id", parseInt(accountId));

    // Delete the OAuth record
    const { error } = await supabase
        .from("user_google_oauth")
        .delete()
        .eq("id", parseInt(accountId))
        .eq("user_id", user.id);

    if (error) {
        console.error("Error deleting account:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
}
