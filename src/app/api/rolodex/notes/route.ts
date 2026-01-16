import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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

        return NextResponse.json({ note: data });
    } catch (error) {
        console.error("Error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

// PATCH - Update an existing note
export async function PATCH(req: NextRequest) {
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await req.json();
        const { note_id, note } = body;

        if (!note_id || !note?.trim()) {
            return NextResponse.json({ error: "note_id and note are required" }, { status: 400 });
        }

        const { data, error } = await supabase
            .from("people_notes")
            .update({ note: note.trim() })
            .eq("id", note_id)
            .eq("user_id", user.id)
            .select()
            .single();

        if (error) {
            console.error("Error updating note:", error);
            return NextResponse.json({ error: error.message }, { status: 500 });
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

