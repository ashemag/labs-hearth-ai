import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Extract mention IDs from note text
// Supports @[Name](id) format
function extractMentionIds(noteText: string): number[] {
    const mentionRegex = /@\[([^\]]+)\]\((\d+)\)/g;
    const ids: number[] = [];
    let match;

    while ((match = mentionRegex.exec(noteText)) !== null) {
        const id = parseInt(match[2], 10);
        if (!isNaN(id) && !ids.includes(id)) {
            ids.push(id);
        }
    }

    return ids;
}

// Save mentions to the database
async function saveMentions(
    supabase: Awaited<ReturnType<typeof createClient>>,
    userId: string,
    noteId: number,
    mentionedPeopleIds: number[]
) {
    if (mentionedPeopleIds.length === 0) return;

    const mentionRecords = mentionedPeopleIds.map(peopleId => ({
        user_id: userId,
        note_id: noteId,
        mentioned_people_id: peopleId,
    }));

    const { error } = await supabase
        .from("people_note_mentions")
        .insert(mentionRecords);

    if (error) {
        console.error("Error saving mentions:", error);
        // Don't fail the whole request if mentions fail to save
    }
}

// POST - Add a note to a person
export async function POST(req: NextRequest) {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await req.json();
        const { people_id, note } = body;

        if (!people_id || !note) {
            return NextResponse.json({ error: "people_id and note are required" }, { status: 400 });
        }

        const { data, error } = await supabase
            .from("people_notes")
            .insert({
                user_id: user.id,
                people_id,
                note,
                source_type: "rolodex",
            })
            .select()
            .single();

        if (error) {
            console.error("Error adding note:", error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        // Extract and save mentions
        const mentionIds = extractMentionIds(note);
        if (mentionIds.length > 0) {
            await saveMentions(supabase, user.id, data.id, mentionIds);
            console.log(`✓ Saved ${mentionIds.length} mention(s) for note ${data.id}`);
        }

        return NextResponse.json({ note: data });
    } catch (error) {
        console.error("Error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

// PATCH - Update an existing note (text and/or date)
export async function PATCH(req: NextRequest) {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await req.json();
        const { note_id, note, created_at } = body;

        if (!note_id) {
            return NextResponse.json({ error: "note_id is required" }, { status: 400 });
        }

        // Build update object - only include fields that are provided
        const updateData: { note?: string; created_at?: string } = {};
        if (note?.trim()) {
            updateData.note = note.trim();
        }
        if (created_at) {
            updateData.created_at = created_at;
        }

        if (Object.keys(updateData).length === 0) {
            return NextResponse.json({ error: "No fields to update" }, { status: 400 });
        }

        const { data, error } = await supabase
            .from("people_notes")
            .update(updateData)
            .eq("id", note_id)
            .eq("user_id", user.id)
            .select()
            .single();

        if (error) {
            console.error("Error updating note:", error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        // Update mentions only if note text was updated
        if (updateData.note) {
            await supabase
                .from("people_note_mentions")
                .delete()
                .eq("note_id", note_id)
                .eq("user_id", user.id);

            const mentionIds = extractMentionIds(updateData.note);
            if (mentionIds.length > 0) {
                await saveMentions(supabase, user.id, note_id, mentionIds);
                console.log(`✓ Updated ${mentionIds.length} mention(s) for note ${note_id}`);
            }
        }

        return NextResponse.json({ note: data });
    } catch (error) {
        console.error("Error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

// DELETE - Remove a note
export async function DELETE(req: NextRequest) {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { searchParams } = new URL(req.url);
        const noteId = searchParams.get("id");

        if (!noteId) {
            return NextResponse.json({ error: "Note ID is required" }, { status: 400 });
        }

        const { error } = await supabase
            .from("people_notes")
            .delete()
            .eq("id", parseInt(noteId))
            .eq("user_id", user.id);

        if (error) {
            console.error("Error deleting note:", error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}


