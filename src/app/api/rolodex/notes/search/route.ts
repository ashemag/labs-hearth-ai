import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateEmbedding, formatEmbeddingForSupabase } from "@/lib/embeddings";

// GET - Semantic search across all notes
export async function GET(req: NextRequest) {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { searchParams } = new URL(req.url);
        const query = searchParams.get("q");
        const limit = Math.min(parseInt(searchParams.get("limit") || "10"), 50);
        const threshold = parseFloat(searchParams.get("threshold") || "0.5");

        if (!query || query.trim().length === 0) {
            return NextResponse.json({ error: "Query parameter 'q' is required" }, { status: 400 });
        }

        // Generate embedding for the search query
        const queryEmbedding = await generateEmbedding(query);

        // Use the database function for similarity search
        const { data: results, error } = await supabase.rpc("search_notes_by_embedding", {
            search_embedding: formatEmbeddingForSupabase(queryEmbedding),
            search_user_id: user.id,
            match_threshold: threshold,
            match_count: limit,
        });

        if (error) {
            console.error("Error searching notes:", error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        // Fetch person details for each result
        if (results && results.length > 0) {
            const peopleIds = [...new Set(results.map((r: { people_id: number }) => r.people_id))];

            const { data: people } = await supabase
                .from("people")
                .select("id, name, custom_profile_image_url")
                .in("id", peopleIds);

            const peopleMap = new Map(people?.map(p => [p.id, p]) || []);

            const enrichedResults = results.map((result: { id: number; people_id: number; note: string; source_type: string; created_at: string; similarity: number }) => ({
                ...result,
                person: peopleMap.get(result.people_id) || null,
            }));

            return NextResponse.json({
                query,
                results: enrichedResults,
                count: enrichedResults.length,
            });
        }

        return NextResponse.json({
            query,
            results: [],
            count: 0,
        });
    } catch (error) {
        console.error("Error in semantic search:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
