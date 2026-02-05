import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET - Fetch raw touchpoint timestamps for contributions
// Includes notes, iMessages, and calendar events
// The frontend will handle timezone-aware grouping and deduplication per contact per day
export async function GET() {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        // Get all touchpoints for the user from the last 365 days
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 365);

        // Fetch notes with contact names (exclude auto-generated)
        const { data: notes, error: notesError } = await supabase
            .from("people_notes")
            .select("people_id, created_at, people(name)")
            .eq("user_id", user.id)
            .gte("created_at", startDate.toISOString())
            .not("source_type", "in", "(auto,website_analysis)")
            .order("created_at", { ascending: true });

        if (notesError) {
            console.error("Error fetching notes:", notesError);
            return NextResponse.json({ error: notesError.message }, { status: 500 });
        }

        // Fetch iMessages - we only need people_id and message_date for contributions
        // Group by date happens in frontend, so we don't need all fields
        // Use a high limit to get all messages (Supabase default is 1000)
        const { data: messages, error: messagesError } = await supabase
            .from("people_imessages")
            .select("people_id, message_date, contact_name, handle_id, people(name)")
            .eq("user_id", user.id)
            .gte("message_date", startDate.toISOString())
            .limit(50000);

        if (messagesError) {
            console.error("Error fetching iMessages:", messagesError);
            return NextResponse.json({ error: messagesError.message }, { status: 500 });
        }

        // Fetch calendar events (only past events, linked to contacts)
        const { data: calendarEvents, error: calendarError } = await supabase
            .from("people_calendar_events")
            .select("people_id, event_start, attendee_name, people(name)")
            .eq("user_id", user.id)
            .not("people_id", "is", null)
            .gte("event_start", startDate.toISOString())
            .lte("event_start", new Date().toISOString())  // Only past events
            .limit(50000);

        if (calendarError) {
            console.error("Error fetching calendar events:", calendarError);
            // Don't fail the whole request if calendar fails
        }

        // Combine and return - frontend will dedupe per contact per day
        // Only include messages that are linked to a contact (have people_id)
        const touchpoints = [
            ...(notes?.map(n => ({
                people_id: n.people_id,
                contact_name: (n.people as unknown as { name: string } | null)?.name || 'Unknown',
                timestamp: n.created_at,
                type: 'note' as const,
            })) || []),
            ...(messages?.filter(m => m.people_id !== null).map(m => ({
                people_id: m.people_id,
                contact_name: (m.people as unknown as { name: string } | null)?.name || m.contact_name || 'Unknown',
                timestamp: m.message_date,
                type: 'imessage' as const,
            })) || []),
            ...(calendarEvents?.map(e => ({
                people_id: e.people_id,
                contact_name: (e.people as unknown as { name: string } | null)?.name || e.attendee_name || 'Unknown',
                timestamp: e.event_start,
                type: 'calendar' as const,
            })) || []),
        ];

        return NextResponse.json({ touchpoints });
    } catch (error) {
        console.error("Error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

