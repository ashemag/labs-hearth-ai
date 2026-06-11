import { serverError, type ServerSupabaseClient } from "@/server/api/route";

export async function listContributionTouchpoints(supabase: ServerSupabaseClient, userId: string) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 365);

    const { data: notes, error: notesError } = await supabase
        .from("people_notes")
        .select("people_id, created_at, people(name)")
        .eq("user_id", userId)
        .gte("created_at", startDate.toISOString())
        .not("source_type", "in", "(auto,website_analysis)")
        .order("created_at", { ascending: true });

    if (notesError) {
        console.error("Error fetching notes:", notesError);
        serverError("Failed to fetch contributions");
    }

    const { data: messages, error: messagesError } = await supabase
        .from("people_imessages")
        .select("people_id, message_date, contact_name, handle_id, people(name)")
        .eq("user_id", userId)
        .gte("message_date", startDate.toISOString())
        .limit(50000);

    if (messagesError) {
        console.error("Error fetching iMessages:", messagesError);
        serverError("Failed to fetch contributions");
    }

    const { data: calendarEvents, error: calendarError } = await supabase
        .from("people_calendar_events")
        .select("people_id, event_start, attendee_name, people(name)")
        .eq("user_id", userId)
        .not("people_id", "is", null)
        .gte("event_start", startDate.toISOString())
        .lte("event_start", new Date().toISOString())
        .limit(50000);

    if (calendarError) {
        console.error("Error fetching calendar events:", calendarError);
    }

    return [
        ...(notes?.map((note) => ({
            people_id: note.people_id,
            contact_name: (note.people as unknown as { name: string } | null)?.name || "Unknown",
            timestamp: note.created_at,
            type: "note" as const,
        })) || []),
        ...(messages?.filter((message) => message.people_id !== null).map((message) => ({
            people_id: message.people_id,
            contact_name: (message.people as unknown as { name: string } | null)?.name || message.contact_name || "Unknown",
            timestamp: message.message_date,
            type: "imessage" as const,
        })) || []),
        ...(calendarEvents?.map((event) => ({
            people_id: event.people_id,
            contact_name: (event.people as unknown as { name: string } | null)?.name || event.attendee_name || "Unknown",
            timestamp: event.event_start,
            type: "calendar" as const,
        })) || []),
    ];
}
