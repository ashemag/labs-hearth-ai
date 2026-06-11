import { NextResponse } from "next/server";
import { readJsonObject, requiredNumber, requiredString, withUser } from "@/server/api/route";
import {
    createContactForAttendee,
    linkAttendeeToContact,
    listUnmatchedAttendees,
} from "@/server/google-calendar/accounts";

// GET - Get unmatched calendar attendees
export const GET = withUser(async (_req, { supabase, user }) => {
    const unmatched = await listUnmatchedAttendees(supabase, user.id);
    return NextResponse.json({ unmatched });
});

// PATCH - Link an unmatched email to a contact
export const PATCH = withUser(async (req, { supabase, user }) => {
    const body = await readJsonObject(req);
    const attendeeEmail = requiredString(body.attendee_email, "attendee_email");
    const peopleId = requiredNumber(body.people_id, "people_id");

    const linkedCount = await linkAttendeeToContact(supabase, user.id, { attendeeEmail, peopleId });
    return NextResponse.json({ success: true, linkedCount });
});

// POST - Create a new contact and link events
export const POST = withUser(async (req, { supabase, user }) => {
    const body = await readJsonObject(req);
    const attendeeEmail = requiredString(body.attendee_email, "attendee_email");
    const name = requiredString(body.name, "name");

    const { contact, linkedCount } = await createContactForAttendee(supabase, user.id, { attendeeEmail, name });
    return NextResponse.json({ success: true, contact, linkedCount });
});
