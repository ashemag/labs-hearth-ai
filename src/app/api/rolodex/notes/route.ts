import { NextResponse } from "next/server";
import { waitUntil } from "@vercel/functions";
import {
    optionalString,
    readJsonObject,
    requiredNumber,
    requiredString,
    withUser,
    type ServerSupabaseClient,
} from "@/server/api/route";
import { createNote, deleteNote, updateNote, updateNoteEmbedding } from "@/server/rolodex/notes";

function scheduleNoteEmbedding(
    supabase: ServerSupabaseClient,
    userId: string,
    note: { id: number; note: string }
) {
    waitUntil(
        updateNoteEmbedding(supabase, userId, note.id, note.note).catch((error) => {
            console.error("Error scheduling note embedding:", error);
        })
    );
}

// POST - Add a note to a person
export const POST = withUser(async (req, { supabase, user }) => {
    const body = await readJsonObject(req);
    const peopleId = requiredNumber(body.people_id, "people_id");
    const noteText = requiredString(body.note, "note");

    const note = await createNote(supabase, user.id, { peopleId, note: noteText });
    scheduleNoteEmbedding(supabase, user.id, note);
    return NextResponse.json({ note });
});

// PATCH - Update an existing note
export const PATCH = withUser(async (req, { supabase, user }) => {
    const body = await readJsonObject(req);
    const noteId = requiredNumber(body.note_id, "note_id");
    const noteText = optionalString(body.note);
    const createdAt = optionalString(body.created_at);

    const note = await updateNote(supabase, user.id, { noteId, note: noteText, createdAt });
    if (noteText?.trim()) {
        scheduleNoteEmbedding(supabase, user.id, note);
    }
    return NextResponse.json({ note });
});

// DELETE - Remove a note
export const DELETE = withUser(async (req, { supabase, user }) => {
    const { searchParams } = new URL(req.url);
    const noteId = requiredNumber(searchParams.get("id"), "Note ID");

    await deleteNote(supabase, user.id, noteId);
    return NextResponse.json({ success: true });
});
