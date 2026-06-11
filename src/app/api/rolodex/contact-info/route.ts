import { NextResponse } from "next/server";
import {
    readJsonObject,
    requiredEnum,
    requiredNumber,
    requiredString,
    withUser,
} from "@/server/api/route";
import {
    addContactInfo,
    deleteContactInfo,
    listContactInfo,
} from "@/server/rolodex/contact-info";

// GET - Fetch contact info for a specific contact
export const GET = withUser(async (req, { supabase, user }) => {
    const { searchParams } = new URL(req.url);
    const peopleId = requiredNumber(searchParams.get("people_id"), "people_id");

    const contactInfo = await listContactInfo(supabase, user.id, peopleId);
    return NextResponse.json({ contact_info: contactInfo });
});

// POST - Add phone/email to a contact
export const POST = withUser(async (req, { supabase, user }) => {
    const body = await readJsonObject(req);
    const peopleId = requiredNumber(body.people_id, "people_id");
    const type = requiredEnum(body.type, ["phone", "email"] as const, "type");
    const value = requiredString(body.value, "value");

    const contactInfo = await addContactInfo(supabase, user.id, { peopleId, type, value });
    return NextResponse.json({ success: true, contact_info: contactInfo });
});

// DELETE - Remove phone/email from a contact
export const DELETE = withUser(async (req, { supabase, user }) => {
    const { searchParams } = new URL(req.url);
    const id = requiredNumber(searchParams.get("id"), "id");

    await deleteContactInfo(supabase, user.id, id);
    return NextResponse.json({ success: true });
});
