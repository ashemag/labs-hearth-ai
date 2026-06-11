import { NextResponse } from "next/server";
import { requiredString, withUser } from "@/server/api/route";
import { listHandlePreviewMessages } from "@/server/rolodex/messages";

// GET - Fetch recent messages for a handle_id
export const GET = withUser(async (req, { supabase, user }) => {
    const handleId = requiredString(req.nextUrl.searchParams.get("handle_id"), "handle_id");
    const messages = await listHandlePreviewMessages(supabase, user.id, handleId);
    return NextResponse.json({ messages });
});
