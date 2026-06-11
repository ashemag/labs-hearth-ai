import { normalizeLocation } from "@/lib/location/normalize";
import { serverError, type ServerSupabaseClient } from "@/server/api/route";

export async function listLocations(supabase: ServerSupabaseClient, userId: string) {
    const { data: customLocations, error: customError } = await supabase
        .from("people")
        .select("custom_location")
        .eq("user_id", userId)
        .not("custom_location", "is", null);

    if (customError) {
        console.error("Error fetching custom locations:", customError);
        serverError("Failed to fetch locations");
    }

    const { data: xLocations, error: xError } = await supabase
        .from("people_x_profiles")
        .select("location")
        .eq("user_id", userId)
        .not("location", "is", null);

    if (xError) {
        console.error("Error fetching X locations:", xError);
    }

    const { data: liLocations, error: liError } = await supabase
        .from("people_linkedin_profiles")
        .select("location")
        .eq("user_id", userId)
        .not("location", "is", null);

    if (liError) {
        console.error("Error fetching LinkedIn locations:", liError);
    }

    const allLocations = new Set<string>();
    const addLocation = (location: string | null) => {
        const normalized = normalizeLocation(location);
        if (normalized) {
            allLocations.add(normalized);
        }
    };

    customLocations?.forEach((row) => addLocation(row.custom_location));
    xLocations?.forEach((row) => addLocation(row.location));
    liLocations?.forEach((row) => addLocation(row.location));

    return Array.from(allLocations).sort((a, b) =>
        a.toLowerCase().localeCompare(b.toLowerCase())
    );
}
