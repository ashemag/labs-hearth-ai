import { NextRequest, NextResponse } from "next/server";
import { readJsonObject, withUser } from "@/server/api/route";
import { syncGoogleCalendarAccount } from "@/server/google-calendar/sync";

export const POST = withUser(async (req: NextRequest, { supabase, user }) => {
    const body = await readJsonObject(req);

    return NextResponse.json(await syncGoogleCalendarAccount(supabase, user.id, body));
});
