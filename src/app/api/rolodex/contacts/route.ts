import { NextResponse } from "next/server";
import {
    optionalString,
    readJsonObject,
    requiredNumber,
    withUser,
} from "@/server/api/route";
import { createContact, deleteContact, listContacts } from "@/server/rolodex/contacts";

// GET - Fetch all contacts with profiles and notes
export const GET = withUser(async (req, { supabase, user }) => {
    const { searchParams } = new URL(req.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || "500", 10), 1000);
    const offset = Math.max(parseInt(searchParams.get("offset") || "0", 10), 0);

    const contacts = await listContacts(supabase, user.id, { limit, offset });
    return NextResponse.json({ contacts });
});

// POST - Add a new contact from LinkedIn URL, X handle, or just a name
export const POST = withUser(async (req, { supabase, user }) => {
    const body = await readJsonObject(req);
    const handle = optionalString(body.handle);
    const name = optionalString(body.name);

    const contact = await createContact(supabase, user.id, { handle, name });
    return NextResponse.json({ contact });
});

// DELETE - Delete a contact
export const DELETE = withUser(async (req, { supabase, user }) => {
    const { searchParams } = new URL(req.url);
    const contactId = requiredNumber(searchParams.get("id"), "Contact ID");

    await deleteContact(supabase, user.id, contactId);
    return NextResponse.json({ success: true });
});
