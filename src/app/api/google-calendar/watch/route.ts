import { NextRequest, NextResponse } from "next/server";
import { readJsonObject, withUser } from "@/server/api/route";
import {
    createCalendarWatch,
    listCalendarWatches,
    stopCalendarWatch,
} from "@/server/google-calendar/watches";

export const POST = withUser(async (req: NextRequest, { supabase, user }) => {
    const body = await readJsonObject(req);

    return NextResponse.json(await createCalendarWatch(supabase, user.id, body));
});

export const DELETE = withUser(async (req: NextRequest, { supabase, user }) => {
    const body = await readJsonObject(req);

    return NextResponse.json(await stopCalendarWatch(supabase, user.id, body));
});

export const GET = withUser(async (req: NextRequest, { supabase, user }) => {
    const { searchParams } = new URL(req.url);

    return NextResponse.json({
        watches: await listCalendarWatches(supabase, user.id, searchParams.get("accountId")),
    });
});
