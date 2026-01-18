import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET - Fetch all unique locations for autocomplete
export async function GET() {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        // Get custom locations from people table
        const { data: customLocations, error: customError } = await supabase
            .from("people")
            .select("custom_location")
            .eq("user_id", user.id)
            .not("custom_location", "is", null);

        if (customError) {
            console.error("Error fetching custom locations:", customError);
            return NextResponse.json({ error: customError.message }, { status: 500 });
        }

        // Get locations from X profiles
        const { data: xLocations, error: xError } = await supabase
            .from("people_x_profiles")
            .select("location")
            .eq("user_id", user.id)
            .not("location", "is", null);

        if (xError) {
            console.error("Error fetching X locations:", xError);
        }

        // Get locations from LinkedIn profiles
        const { data: liLocations, error: liError } = await supabase
            .from("people_linkedin_profiles")
            .select("location")
            .eq("user_id", user.id)
            .not("location", "is", null);

        if (liError) {
            console.error("Error fetching LinkedIn locations:", liError);
        }

        // Combine and deduplicate locations
        const allLocations = new Set<string>();

        customLocations?.forEach((row) => {
            if (row.custom_location?.trim()) {
                allLocations.add(row.custom_location.trim());
            }
        });

        xLocations?.forEach((row) => {
            if (row.location?.trim()) {
                allLocations.add(row.location.trim());
            }
        });

        liLocations?.forEach((row) => {
            if (row.location?.trim()) {
                allLocations.add(row.location.trim());
            }
        });

        // Sort alphabetically
        const sortedLocations = Array.from(allLocations).sort((a, b) =>
            a.toLowerCase().localeCompare(b.toLowerCase())
        );

        return NextResponse.json({ locations: sortedLocations });
    } catch (error) {
        console.error("Error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

