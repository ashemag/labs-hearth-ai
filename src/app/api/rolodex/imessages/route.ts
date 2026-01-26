import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET - Fetch iMessages for a specific contact
export async function GET(req: NextRequest) {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const peopleId = searchParams.get("people_id");
    const limit = parseInt(searchParams.get("limit") || "50", 10);

    if (!peopleId) {
        return NextResponse.json({ error: "people_id is required" }, { status: 400 });
    }

    try {
        const { data: messages, error } = await supabase
            .from("people_imessages")
            .select("id, message_text, is_from_me, message_date, handle_id, contact_name")
            .eq("user_id", user.id)
            .eq("people_id", parseInt(peopleId))
            .order("message_date", { ascending: false })
            .limit(limit);

        if (error) {
            console.error("Error fetching iMessages:", error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ messages: messages || [] });
    } catch (error) {
        console.error("Error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
