import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET - Fetch all lists with member counts
export async function GET() {
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { data: lists, error } = await supabase
            .from("rolodex_lists")
            .select(`
                id,
                name,
                color,
                pinned,
                created_at,
                rolodex_list_members (
                    people_id
                )
            `)
            .eq("user_id", user.id)
            .order("name", { ascending: true });

        if (error) {
            console.error("Error fetching lists:", error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        // Transform to include member count
        const transformedLists = (lists || []).map((list: any) => ({
            id: list.id,
            name: list.name,
            color: list.color,
            pinned: list.pinned ?? true,
            created_at: list.created_at,
            member_count: list.rolodex_list_members?.length || 0,
            member_ids: (list.rolodex_list_members || []).map((m: any) => m.people_id),
        }));

        return NextResponse.json({ lists: transformedLists });
    } catch (error) {
        console.error("Error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

// POST - Create a new list
export async function POST(req: NextRequest) {
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await req.json();
        const { name, color } = body;

        if (!name?.trim()) {
            return NextResponse.json({ error: "Name is required" }, { status: 400 });
        }

        const { data, error } = await supabase
            .from("rolodex_lists")
            .insert({ 
                user_id: user.id,
                name: name.trim(), 
                color: color || "#7BDFF2" 
            })
            .select()
            .single();

        if (error) {
            console.error("Error creating list:", error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({
            list: {
                ...data,
                pinned: data.pinned ?? true,
                member_count: 0,
                member_ids: [],
            }
        });
    } catch (error) {
        console.error("Error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

// PATCH - Update a list (toggle pinned, rename, etc.)
export async function PATCH(req: NextRequest) {
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await req.json();
        const { id, pinned, name, color } = body;

        if (!id) {
            return NextResponse.json({ error: "List ID is required" }, { status: 400 });
        }

        const updates: Record<string, unknown> = {};
        if (typeof pinned === "boolean") updates.pinned = pinned;
        if (name?.trim()) updates.name = name.trim();
        if (color) updates.color = color;

        if (Object.keys(updates).length === 0) {
            return NextResponse.json({ error: "No updates provided" }, { status: 400 });
        }

        const { data, error } = await supabase
            .from("rolodex_lists")
            .update(updates)
            .eq("id", id)
            .eq("user_id", user.id)
            .select()
            .single();

        if (error) {
            console.error("Error updating list:", error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ list: data });
    } catch (error) {
        console.error("Error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

// DELETE - Delete a list
export async function DELETE(req: NextRequest) {
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { searchParams } = new URL(req.url);
        const listId = searchParams.get("id");

        if (!listId) {
            return NextResponse.json({ error: "List ID is required" }, { status: 400 });
        }

        const { error } = await supabase
            .from("rolodex_lists")
            .delete()
            .eq("id", parseInt(listId))
            .eq("user_id", user.id);

        if (error) {
            console.error("Error deleting list:", error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

