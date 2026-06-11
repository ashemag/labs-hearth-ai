import { NextResponse } from "next/server";
import { requiredString, withUser } from "@/server/api/route";
import { searchNotes } from "@/server/rolodex/notes";

// GET - Semantic search across all notes
export const GET = withUser(async (req, { supabase, user }) => {
    const { searchParams } = new URL(req.url);
    const query = requiredString(searchParams.get("q"), "Query parameter 'q'");
    const limit = Math.min(parseInt(searchParams.get("limit") || "10", 10), 50);
    const threshold = parseFloat(searchParams.get("threshold") || "0.5");

    const results = await searchNotes(supabase, user.id, { query, limit, threshold });
    return NextResponse.json({ query, results, count: results.length });
});
