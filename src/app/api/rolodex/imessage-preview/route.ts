import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET - Fetch recent messages for a handle_id (for preview in matcher)
export async function GET(req: NextRequest) {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const handleId = req.nextUrl.searchParams.get("handle_id");
    if (!handleId) {
        return NextResponse.json({ error: "handle_id is required" }, { status: 400 });
    }

    try {
        const { data: messages, error } = await supabase
            .from("people_imessages")
            .select("message_text, is_from_me, message_date")
            .eq("user_id", user.id)
            .eq("handle_id", handleId)
            .order("message_date", { ascending: false })
            .limit(15);

        if (error) {
            return NextResponse.json({ error: "Failed to fetch messages" }, { status: 500 });
        }

        // Reverse so oldest is first (chronological order)
        const chronological = (messages || []).reverse();

        return NextResponse.json({ messages: chronological });
    } catch (error) {
        console.error("[iMessage Preview] Error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
