import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// POST - Add a contact to a list
export async function POST(req: NextRequest) {
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await req.json();
        const { list_id, people_id } = body;

        if (!list_id || !people_id) {
            return NextResponse.json({ error: "list_id and people_id are required" }, { status: 400 });
        }

        const { error } = await supabase
            .from("rolodex_list_members")
            .insert({ 
                user_id: user.id,
                list_id, 
                people_id 
            });

        if (error) {
            if (error.code === "23505") {
                // Already a member
                return NextResponse.json({ success: true, already_member: true });
            }
            console.error("Error adding to list:", error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

// DELETE - Remove a contact from a list
export async function DELETE(req: NextRequest) {
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { searchParams } = new URL(req.url);
        const listId = searchParams.get("list_id");
        const peopleId = searchParams.get("people_id");

        if (!listId || !peopleId) {
            return NextResponse.json({ error: "list_id and people_id are required" }, { status: 400 });
        }

        const { error } = await supabase
            .from("rolodex_list_members")
            .delete()
            .eq("list_id", parseInt(listId))
            .eq("people_id", parseInt(peopleId))
            .eq("user_id", user.id);

        if (error) {
            console.error("Error removing from list:", error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}


