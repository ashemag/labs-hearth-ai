import { NextRequest, NextResponse } from "next/server";
import { readJsonObject, withUser } from "@/server/api/route";
import { getUserProfile, updateUserProfile, uploadUserAvatar } from "@/server/user/profile";

export const GET = withUser(async (_req, { supabase, user }) => {
    return NextResponse.json(await getUserProfile(supabase, user.id));
});

// POST - Upload profile image
export const POST = withUser(async (req: NextRequest, { supabase, user }) => {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    return NextResponse.json(await uploadUserAvatar(supabase, user.id, file));
});

// PATCH - Update profile data (display name, etc.)
export const PATCH = withUser(async (req: NextRequest, { supabase, user }) => {
    const body = await readJsonObject(req);

    return NextResponse.json(await updateUserProfile(supabase, user.id, body));
});
