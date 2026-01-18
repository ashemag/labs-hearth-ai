import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET - Fetch daily contribution data (unique people connected with via notes)
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

        const { data: notes, error } = await supabase
            .from("people_notes")
            .select("people_id, created_at")
            .eq("user_id", user.id)
            .gte("created_at", startDate.toISOString())
            .order("created_at", { ascending: true });

        if (error) {
            console.error("Error fetching contributions:", error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        // Group by date and count unique people per day
        const contributionsByDate: Record<string, Set<number>> = {};

        notes?.forEach((note) => {
            const date = new Date(note.created_at).toISOString().split("T")[0];
            if (!contributionsByDate[date]) {
                contributionsByDate[date] = new Set();
            }
            contributionsByDate[date].add(note.people_id);
        });

        // Convert to array format with unique people count
        const contributions = Object.entries(contributionsByDate).map(([date, peopleSet]) => ({
            date,
            count: peopleSet.size,
        }));

        // Calculate stats
        const today = new Date().toISOString().split("T")[0];
        const todayCount = contributionsByDate[today]?.size || 0;
        
        // Calculate streak (consecutive days with at least 1 connection)
        let streak = 0;
        const checkDate = new Date();
        
        // Start from today and go backwards
        while (true) {
            const dateStr = checkDate.toISOString().split("T")[0];
            if (contributionsByDate[dateStr]?.size > 0) {
                streak++;
                checkDate.setDate(checkDate.getDate() - 1);
            } else {
                // If today has no contributions, check if yesterday started a streak
                if (streak === 0) {
                    checkDate.setDate(checkDate.getDate() - 1);
                    const yesterdayStr = checkDate.toISOString().split("T")[0];
                    if (contributionsByDate[yesterdayStr]?.size > 0) {
                        streak = 1;
                        checkDate.setDate(checkDate.getDate() - 1);
                        continue;
                    }
                }
                break;
            }
        }

        // Total unique people this week
        const weekStart = new Date();
        weekStart.setDate(weekStart.getDate() - 7);
        const weekPeople = new Set<number>();
        notes?.forEach((note) => {
            if (new Date(note.created_at) >= weekStart) {
                weekPeople.add(note.people_id);
            }
        });

        return NextResponse.json({
            contributions,
            stats: {
                today: todayCount,
                streak,
                weekTotal: weekPeople.size,
            },
        });
    } catch (error) {
        console.error("Error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

