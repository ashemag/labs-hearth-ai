import { NextResponse } from "next/server";
import { requiredNumber, withUser } from "@/server/api/route";
import { listContactMessages } from "@/server/rolodex/messages";

// GET - Fetch iMessages for a specific contact
export const GET = withUser(async (req, { supabase, user }) => {
    const { searchParams } = new URL(req.url);
    const peopleId = requiredNumber(searchParams.get("people_id"), "people_id");
    const limit = Math.max(parseInt(searchParams.get("limit") || "50", 10), 1);

    const messages = await listContactMessages(supabase, user.id, { peopleId, limit });
    return NextResponse.json({ messages });
});
