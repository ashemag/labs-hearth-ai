import { NextResponse } from "next/server";
import { readJsonObject, requiredNumber, requiredString, withUser } from "@/server/api/route";
import { linkLinkedInProfile, unlinkLinkedInProfile } from "@/server/rolodex/social-links";

// POST - Link a LinkedIn profile to a contact
export const POST = withUser(async (req, { supabase, user }) => {
    const body = await readJsonObject(req);
    const peopleId = requiredNumber(body.people_id, "Contact ID");
    const linkedInUrl = requiredString(body.linkedin_url, "LinkedIn URL");

    const linkedInProfile = await linkLinkedInProfile(supabase, user.id, { peopleId, linkedInUrl });
    return NextResponse.json({ linkedin_profile: linkedInProfile });
});

// DELETE - Unlink a LinkedIn profile from a contact
export const DELETE = withUser(async (req, { supabase, user }) => {
    const { searchParams } = new URL(req.url);
    const peopleId = requiredNumber(searchParams.get("people_id"), "Contact ID");

    await unlinkLinkedInProfile(supabase, user.id, peopleId);
    return NextResponse.json({ success: true });
});
