import { generateEmbedding, generateEmbeddings, formatEmbeddingForSupabase } from "@/lib/embeddings";
import { badRequest, serverError, type ServerSupabaseClient } from "@/server/api/route";

function extractMentionIds(noteText: string): number[] {
    const mentionRegex = /@\[([^\]]+)\]\((\d+)\)/g;
    const ids: number[] = [];
    let match;

    while ((match = mentionRegex.exec(noteText)) !== null) {
        const id = parseInt(match[2], 10);
        if (!Number.isNaN(id) && !ids.includes(id)) {
            ids.push(id);
        }
    }

    return ids;
}

async function saveMentions(
    supabase: ServerSupabaseClient,
    userId: string,
    noteId: number,
    mentionedPeopleIds: number[]
) {
    if (mentionedPeopleIds.length === 0) return;

    const mentionRecords = mentionedPeopleIds.map((peopleId) => ({
        user_id: userId,
        note_id: noteId,
        mentioned_people_id: peopleId,
    }));

    const { error } = await supabase
        .from("people_note_mentions")
        .insert(mentionRecords);

    if (error) {
        console.error("Error saving mentions:", error);
    }
}

async function embeddingForNote(note: string, logLabel: string) {
    try {
        const embeddingVector = await generateEmbedding(note);
        return formatEmbeddingForSupabase(embeddingVector);
    } catch (error) {
        console.error(logLabel, error);
        return null;
    }
}

export async function createNote(
    supabase: ServerSupabaseClient,
    userId: string,
    input: { peopleId: number; note: string; calendarEventId?: number }
) {
    if (input.calendarEventId) {
        const { data: calendarEvent, error: calendarEventError } = await supabase
            .from("people_calendar_events")
            .select("id")
            .eq("id", input.calendarEventId)
            .eq("user_id", userId)
            .eq("people_id", input.peopleId)
            .single();

        if (calendarEventError || !calendarEvent) {
            console.error("Invalid calendar event attachment:", calendarEventError);
            badRequest("Calendar event not found for this contact");
        }
    }

    const { data, error } = await supabase
        .from("people_notes")
        .insert({
            user_id: userId,
            people_id: input.peopleId,
            note: input.note,
            calendar_event_id: input.calendarEventId || null,
            source_type: "rolodex",
        })
        .select()
        .single();

    if (error) {
        console.error("Error adding note:", error);
        serverError("Failed to save note");
    }

    const mentionIds = extractMentionIds(input.note);
    if (mentionIds.length > 0) {
        await saveMentions(supabase, userId, data.id, mentionIds);
        console.log(`Saved ${mentionIds.length} mention(s) for note ${data.id}`);
    }

    console.log(`Note ${data.id} created`);
    return data;
}

export async function updateNoteEmbedding(
    supabase: ServerSupabaseClient,
    userId: string,
    noteId: number,
    note: string
) {
    const embedding = await embeddingForNote(note, "Error generating note embedding:");

    if (!embedding) {
        return;
    }

    const { error } = await supabase
        .from("people_notes")
        .update({ embedding })
        .eq("id", noteId)
        .eq("user_id", userId)
        .eq("note", note);

    if (error) {
        console.error("Error updating note embedding:", error);
    }
}

export async function updateNote(
    supabase: ServerSupabaseClient,
    userId: string,
    input: { noteId: number; note?: string; createdAt?: string }
) {
    const updateData: { note?: string; created_at?: string; embedding?: string | null } = {};

    if (input.note?.trim()) {
        updateData.note = input.note.trim();
        updateData.embedding = null;
    }

    if (input.createdAt) {
        updateData.created_at = input.createdAt;
    }

    if (Object.keys(updateData).length === 0) {
        badRequest("No fields to update");
    }

    const { data, error } = await supabase
        .from("people_notes")
        .update(updateData)
        .eq("id", input.noteId)
        .eq("user_id", userId)
        .select()
        .single();

    if (error) {
        console.error("Error updating note:", error);
        serverError("Failed to update note");
    }

    if (updateData.note) {
        await supabase
            .from("people_note_mentions")
            .delete()
            .eq("note_id", input.noteId)
            .eq("user_id", userId);

        const mentionIds = extractMentionIds(updateData.note);
        if (mentionIds.length > 0) {
            await saveMentions(supabase, userId, input.noteId, mentionIds);
            console.log(`Updated ${mentionIds.length} mention(s) for note ${input.noteId}`);
        }
    }

    return data;
}

export async function deleteNote(
    supabase: ServerSupabaseClient,
    userId: string,
    noteId: number
) {
    const { error } = await supabase
        .from("people_notes")
        .delete()
        .eq("id", noteId)
        .eq("user_id", userId);

    if (error) {
        console.error("Error deleting note:", error);
        serverError("Failed to delete note");
    }
}

export async function searchNotes(
    supabase: ServerSupabaseClient,
    userId: string,
    input: { query: string; limit: number; threshold: number }
) {
    const queryEmbedding = await generateEmbedding(input.query);
    const { data: results, error } = await supabase.rpc("search_notes_by_embedding", {
        search_embedding: formatEmbeddingForSupabase(queryEmbedding),
        search_user_id: userId,
        match_threshold: input.threshold,
        match_count: input.limit,
    });

    if (error) {
        console.error("Error searching notes:", error);
        serverError("Failed to search notes");
    }

    if (!results || results.length === 0) {
        return [];
    }

    const peopleIds = [...new Set(results.map((result: { people_id: number }) => result.people_id))];
    const { data: people } = await supabase
        .from("people")
        .select("id, name, custom_profile_image_url")
        .in("id", peopleIds);

    const peopleMap = new Map(people?.map((person) => [person.id, person]) || []);

    return results.map((result: {
        id: number;
        people_id: number;
        note: string;
        source_type: string;
        created_at: string;
        similarity: number;
    }) => ({
        ...result,
        person: peopleMap.get(result.people_id) || null,
    }));
}

export async function backfillNoteEmbeddings(
    supabase: ServerSupabaseClient,
    userId: string,
    batchSize: number
) {
    const { data: notes, error: fetchError } = await supabase
        .from("people_notes")
        .select("id, note")
        .eq("user_id", userId)
        .is("embedding", null)
        .order("created_at", { ascending: true })
        .limit(batchSize);

    if (fetchError) {
        console.error("Error fetching notes:", fetchError);
        serverError("Failed to fetch notes");
    }

    if (!notes || notes.length === 0) {
        return {
            message: "All notes already have embeddings",
            processed: 0,
            remaining: 0,
        };
    }

    const embeddings = await generateEmbeddings(notes.map((note) => note.note));
    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < notes.length; i++) {
        const note = notes[i];
        const embedding = embeddings[i];

        if (!embedding) {
            errorCount++;
            continue;
        }

        const { error } = await supabase
            .from("people_notes")
            .update({ embedding: formatEmbeddingForSupabase(embedding) })
            .eq("id", note.id)
            .eq("user_id", userId);

        if (error) {
            console.error(`Error updating note ${note.id}:`, error);
            errorCount++;
        } else {
            successCount++;
        }
    }

    const { count: remainingCount } = await supabase
        .from("people_notes")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .is("embedding", null);

    console.log(`Backfilled ${successCount} note embeddings (${errorCount} errors, ${remainingCount} remaining)`);

    return {
        message: `Processed ${successCount} notes`,
        processed: successCount,
        errors: errorCount,
        remaining: remainingCount || 0,
    };
}

export async function getNoteEmbeddingStatus(supabase: ServerSupabaseClient, userId: string) {
    const { count: totalCount } = await supabase
        .from("people_notes")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId);

    const { count: withEmbeddingCount } = await supabase
        .from("people_notes")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .not("embedding", "is", null);

    const total = totalCount || 0;
    const withEmbedding = withEmbeddingCount || 0;
    const withoutEmbedding = total - withEmbedding;

    return {
        total,
        with_embedding: withEmbedding,
        without_embedding: withoutEmbedding,
        percentage_complete: total > 0 ? Math.round((withEmbedding / total) * 100) : 100,
    };
}
