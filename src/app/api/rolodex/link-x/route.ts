import { NextResponse } from "next/server";
import { readJsonObject, requiredNumber, requiredString, withUser } from "@/server/api/route";
import { linkXProfile, unlinkXProfile } from "@/server/rolodex/social-links";

// POST - Link an X profile to a contact
export const POST = withUser(async (req, { supabase, user }) => {
    const body = await readJsonObject(req);
    const peopleId = requiredNumber(body.people_id, "Contact ID");
    const handle = requiredString(body.handle, "X handle");

    const result = await linkXProfile(supabase, user.id, { peopleId, handle });
    return NextResponse.json(result);
});

// DELETE - Unlink an X profile from a contact
export const DELETE = withUser(async (req, { supabase, user }) => {
    const { searchParams } = new URL(req.url);
    const peopleId = requiredNumber(searchParams.get("people_id"), "Contact ID");

    await unlinkXProfile(supabase, user.id, peopleId);
    return NextResponse.json({ success: true });
});
