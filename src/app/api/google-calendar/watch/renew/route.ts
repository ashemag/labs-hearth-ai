import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { renewExpiringCalendarWatches } from "@/server/google-calendar/watches";

const cronSecret = process.env.CRON_SECRET;

export async function POST(req: NextRequest) {
    const authHeader = req.headers.get("authorization");
    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json(await renewExpiringCalendarWatches(createAdminClient()));
}
