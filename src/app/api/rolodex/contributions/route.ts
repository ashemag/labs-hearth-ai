import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET - Fetch raw touchpoint timestamps for contributions
// Includes notes and iMessages
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

        // Fetch iMessages with contact names (only those linked to contacts)
        const { data: messages, error: messagesError } = await supabase
            .from("people_imessages")
            .select("people_id, message_date, people(name)")
            .eq("user_id", user.id)
            .not("people_id", "is", null)
            .gte("message_date", startDate.toISOString())
            .order("message_date", { ascending: true });

        if (messagesError) {
            console.error("Error fetching iMessages:", messagesError);
            return NextResponse.json({ error: messagesError.message }, { status: 500 });
        }

        // Combine and return - frontend will dedupe per contact per day
        const touchpoints = [
            ...(notes?.map(n => ({
                people_id: n.people_id,
                contact_name: (n.people as { name: string } | null)?.name || 'Unknown',
                timestamp: n.created_at,
                type: 'note' as const,
            })) || []),
            ...(messages?.map(m => ({
                people_id: m.people_id,
                contact_name: (m.people as { name: string } | null)?.name || 'Unknown',
                timestamp: m.message_date,
                type: 'imessage' as const,
            })) || []),
        ];

        return NextResponse.json({ touchpoints });
    } catch (error) {
        console.error("Error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

