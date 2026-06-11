import { NextResponse } from "next/server";
import { withUser } from "@/server/api/route";
import { listLocations } from "@/server/rolodex/locations";

// GET - Fetch all unique locations for autocomplete
export const GET = withUser(async (_req, { supabase, user }) => {
    const locations = await listLocations(supabase, user.id);
    return NextResponse.json({ locations });
});
