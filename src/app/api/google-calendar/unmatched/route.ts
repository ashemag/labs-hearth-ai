import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface UnmatchedAttendee {
    attendee_email: string;
    attendee_name: string | null;
    event_count: number;
    latest_event: string;
}

// GET - Get unmatched calendar attendees (people not linked to contacts)
export async function GET() {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get all unmatched attendees grouped by email
    const { data: events, error } = await supabase
        .from("people_calendar_events")
        .select("attendee_email, attendee_name, event_start")
        .eq("user_id", user.id)
        .is("people_id", null)
        .order("event_start", { ascending: false });

    if (error) {
        console.error("Error fetching unmatched:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Group by email
    const grouped = new Map<string, UnmatchedAttendee>();
    for (const event of events || []) {
        const email = event.attendee_email.toLowerCase();
        if (!grouped.has(email)) {
            grouped.set(email, {
                attendee_email: event.attendee_email,
                attendee_name: event.attendee_name,
                event_count: 1,
                latest_event: event.event_start,
            });
        } else {
            const existing = grouped.get(email)!;
            existing.event_count++;
            // Keep the most recent name if we have one
            if (!existing.attendee_name && event.attendee_name) {
                existing.attendee_name = event.attendee_name;
            }
        }
    }

    // Sort by event count descending
    const unmatched = Array.from(grouped.values())
        .sort((a, b) => b.event_count - a.event_count);

    return NextResponse.json({ unmatched });
}

// PATCH - Link an unmatched email to a contact
export async function PATCH(req: NextRequest) {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { attendee_email, people_id } = body;

    if (!attendee_email || !people_id) {
        return NextResponse.json({ error: "attendee_email and people_id required" }, { status: 400 });
    }

    // Update all events with this email to link to the contact
    const { error: updateError, count } = await supabase
        .from("people_calendar_events")
        .update({ people_id, updated_at: new Date().toISOString() })
        .eq("user_id", user.id)
        .ilike("attendee_email", attendee_email)
        .is("people_id", null);

    if (updateError) {
        console.error("Error linking events:", updateError);
        return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // Add email to contact_info if not already there
    const normalizedEmail = attendee_email.toLowerCase().trim();
    const { data: existing } = await supabase
        .from("people_contact_info")
        .select("id")
        .eq("user_id", user.id)
        .eq("people_id", people_id)
        .eq("type", "email")
        .ilike("value", normalizedEmail)
        .limit(1);

    if (!existing || existing.length === 0) {
        await supabase
            .from("people_contact_info")
            .insert({
                user_id: user.id,
                people_id: people_id,
                type: "email",
                value: normalizedEmail,
            });
    }

    // Update last_touchpoint on the contact
    const { data: latestEvent } = await supabase
        .from("people_calendar_events")
        .select("event_start")
        .eq("user_id", user.id)
        .eq("people_id", people_id)
        .lte("event_start", new Date().toISOString())
        .order("event_start", { ascending: false })
        .limit(1)
        .single();

    if (latestEvent) {
        await supabase
            .from("people")
            .update({ last_touchpoint: latestEvent.event_start })
            .eq("id", people_id)
            .or(`last_touchpoint.is.null,last_touchpoint.lt.${latestEvent.event_start}`);
    }

    console.log(`✓ Linked ${count} calendar events for ${attendee_email} to contact ${people_id}`);

    return NextResponse.json({ success: true, linkedCount: count });
}

// POST - Create a new contact and link events
export async function POST(req: NextRequest) {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { attendee_email, name } = body;

    if (!attendee_email || !name) {
        return NextResponse.json({ error: "attendee_email and name required" }, { status: 400 });
    }

    // Create the new contact
    const { data: person, error: createError } = await supabase
        .from("people")
        .insert({
            user_id: user.id,
            name: name.trim(),
        })
        .select()
        .single();

    if (createError || !person) {
        console.error("Error creating contact:", createError);
        return NextResponse.json({ error: createError?.message || "Failed to create contact" }, { status: 500 });
    }

    // Add email to contact_info
    await supabase
        .from("people_contact_info")
        .insert({
            user_id: user.id,
            people_id: person.id,
            type: "email",
            value: attendee_email.toLowerCase().trim(),
        });

    // Link all events with this email
    const { count } = await supabase
        .from("people_calendar_events")
        .update({ people_id: person.id, updated_at: new Date().toISOString() })
        .eq("user_id", user.id)
        .ilike("attendee_email", attendee_email)
        .is("people_id", null);

    // Update last_touchpoint
    const { data: latestEvent } = await supabase
        .from("people_calendar_events")
        .select("event_start")
        .eq("user_id", user.id)
        .eq("people_id", person.id)
        .lte("event_start", new Date().toISOString())
        .order("event_start", { ascending: false })
        .limit(1)
        .single();

    if (latestEvent) {
        await supabase
            .from("people")
            .update({ last_touchpoint: latestEvent.event_start })
            .eq("id", person.id);
    }

    console.log(`✓ Created contact ${name} and linked ${count} calendar events`);

    return NextResponse.json({
        success: true,
        contact: person,
        linkedCount: count,
    });
}
