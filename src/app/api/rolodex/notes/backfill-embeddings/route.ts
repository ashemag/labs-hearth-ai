import { NextResponse } from "next/server";
import { readJsonObject, withUser } from "@/server/api/route";
import { backfillNoteEmbeddings, getNoteEmbeddingStatus } from "@/server/rolodex/notes";

// POST - Backfill embeddings for notes that don't have them.
export const POST = withUser(async (req, { supabase, user }) => {
    let body: Record<string, unknown> = {};
    try {
        body = await readJsonObject(req);
    } catch {
        body = {};
    }

    const batchSize = Math.min(Number(body.batch_size || 50), 100);
    const result = await backfillNoteEmbeddings(supabase, user.id, batchSize);
    return NextResponse.json(result);
});

// GET - Check backfill status
export const GET = withUser(async (_req, { supabase, user }) => {
    const status = await getNoteEmbeddingStatus(supabase, user.id);
    return NextResponse.json(status);
});
