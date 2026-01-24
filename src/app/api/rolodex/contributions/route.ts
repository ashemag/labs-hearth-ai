import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET - Fetch raw note timestamps for contributions
// The frontend will handle timezone-aware grouping
export async function GET() {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        // Get all notes for the user from the last 365 days
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 365);

        // Exclude auto-generated notes (website_analysis, auto) from contributions
        // Include: null, slack, rolodex, x (manual notes)
        // Exclude: auto, website_analysis (auto-generated)
        const { data: notes, error } = await supabase
            .from("people_notes")
            .select("people_id, created_at, source_type")
            .eq("user_id", user.id)
            .gte("created_at", startDate.toISOString())
            .not("source_type", "in", "(auto,website_analysis)")
            .order("created_at", { ascending: true });

        if (error) {
            console.error("Error fetching contributions:", error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        // Return raw data - let frontend handle timezone grouping
        return NextResponse.json({
            notes: notes?.map(n => ({
                people_id: n.people_id,
                created_at: n.created_at,
            })) || [],
        });
    } catch (error) {
        console.error("Error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

