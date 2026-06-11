import { NextRequest, NextResponse } from "next/server";
import { readJsonObject, withUser } from "@/server/api/route";
import {
    deleteUserAiSettings,
    getUserAiSettings,
    saveUserAiSettings,
} from "@/server/user/ai-settings";

export const GET = withUser(async (_req, { supabase, user }) => {
    return NextResponse.json(await getUserAiSettings(supabase, user.id));
});

// POST - Save or update AI settings
export const POST = withUser(async (req: NextRequest, { supabase, user }) => {
    const body = await readJsonObject(req);

    return NextResponse.json(await saveUserAiSettings(supabase, user.id, body));
});

// DELETE - Remove AI settings
export const DELETE = withUser(async (_req, { supabase, user }) => {
    return NextResponse.json(await deleteUserAiSettings(supabase, user.id));
});
