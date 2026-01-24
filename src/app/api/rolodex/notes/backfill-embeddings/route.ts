import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateEmbeddings, formatEmbeddingForSupabase } from "@/lib/embeddings";

// POST - Backfill embeddings for notes that don't have them
// Processes in batches to avoid timeouts
export async function POST(req: NextRequest) {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await req.json().catch(() => ({}));
        const batchSize = Math.min(body.batch_size || 50, 100); // Max 100 at a time

        // Get notes without embeddings for this user
        const { data: notes, error: fetchError } = await supabase
            .from("people_notes")
            .select("id, note")
            .eq("user_id", user.id)
            .is("embedding", null)
            .order("created_at", { ascending: true })
            .limit(batchSize);

        if (fetchError) {
            console.error("Error fetching notes:", fetchError);
            return NextResponse.json({ error: fetchError.message }, { status: 500 });
        }

        if (!notes || notes.length === 0) {
            return NextResponse.json({
                message: "All notes already have embeddings",
                processed: 0,
                remaining: 0,
            });
        }

        // Generate embeddings in batch
        const noteTexts = notes.map(n => n.note);
        const embeddings = await generateEmbeddings(noteTexts);

        // Update each note with its embedding
        let successCount = 0;
        let errorCount = 0;

        for (let i = 0; i < notes.length; i++) {
            const note = notes[i];
            const embedding = embeddings[i];

            if (!embedding) {
                errorCount++;
                continue;
            }

            const { error: updateError } = await supabase
                .from("people_notes")
                .update({ embedding: formatEmbeddingForSupabase(embedding) })
                .eq("id", note.id)
                .eq("user_id", user.id);

            if (updateError) {
                console.error(`Error updating note ${note.id}:`, updateError);
                errorCount++;
            } else {
                successCount++;
            }
        }

        // Check how many notes still need embeddings
        const { count: remainingCount } = await supabase
            .from("people_notes")
            .select("id", { count: "exact", head: true })
            .eq("user_id", user.id)
            .is("embedding", null);

        console.log(`✓ Backfilled ${successCount} note embeddings (${errorCount} errors, ${remainingCount} remaining)`);

        return NextResponse.json({
            message: `Processed ${successCount} notes`,
            processed: successCount,
            errors: errorCount,
            remaining: remainingCount || 0,
        });
    } catch (error) {
        console.error("Error in backfill:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

// GET - Check backfill status
export async function GET() {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        // Count total notes
        const { count: totalCount } = await supabase
            .from("people_notes")
            .select("id", { count: "exact", head: true })
            .eq("user_id", user.id);

        // Count notes with embeddings
        const { count: withEmbeddingCount } = await supabase
            .from("people_notes")
            .select("id", { count: "exact", head: true })
            .eq("user_id", user.id)
            .not("embedding", "is", null);

        const total = totalCount || 0;
        const withEmbedding = withEmbeddingCount || 0;
        const withoutEmbedding = total - withEmbedding;

        return NextResponse.json({
            total,
            with_embedding: withEmbedding,
            without_embedding: withoutEmbedding,
            percentage_complete: total > 0 ? Math.round((withEmbedding / total) * 100) : 100,
        });
    } catch (error) {
        console.error("Error checking status:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
