import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// POST - Add a compliment to a person
export async function POST(req: NextRequest) {
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await req.json();
        const { people_id, compliment, context, received_at } = body;

        if (!people_id || !compliment) {
            return NextResponse.json({ error: "people_id and compliment are required" }, { status: 400 });
        }

        const { data, error } = await supabase
            .from("people_compliments")
            .insert({
                user_id: user.id,
                people_id,
                compliment,
                context: context || null,
                received_at: received_at || null,
            })
            .select()
            .single();

        if (error) {
            console.error("Error adding compliment:", error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ compliment: data });
    } catch (error) {
        console.error("Error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

// PATCH - Update an existing compliment
export async function PATCH(req: NextRequest) {
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await req.json();
        const { compliment_id, compliment, context, received_at } = body;

        if (!compliment_id) {
            return NextResponse.json({ error: "compliment_id is required" }, { status: 400 });
        }

        const updates: { compliment?: string; context?: string | null; received_at?: string | null } = {};
        
        if (compliment !== undefined) {
            if (!compliment?.trim()) {
                return NextResponse.json({ error: "compliment cannot be empty" }, { status: 400 });
            }
            updates.compliment = compliment.trim();
        }
        if (context !== undefined) {
            updates.context = context?.trim() || null;
        }
        if (received_at !== undefined) {
            updates.received_at = received_at || null;
        }

        if (Object.keys(updates).length === 0) {
            return NextResponse.json({ error: "No updates provided" }, { status: 400 });
        }

        const { data, error } = await supabase
            .from("people_compliments")
            .update(updates)
            .eq("id", compliment_id)
            .eq("user_id", user.id)
            .select()
            .single();

        if (error) {
            console.error("Error updating compliment:", error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ compliment: data });
    } catch (error) {
        console.error("Error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

// DELETE - Remove a compliment
export async function DELETE(req: NextRequest) {
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { searchParams } = new URL(req.url);
        const complimentId = searchParams.get("id");

        if (!complimentId) {
            return NextResponse.json({ error: "Compliment ID is required" }, { status: 400 });
        }

        const { error } = await supabase
            .from("people_compliments")
            .delete()
            .eq("id", parseInt(complimentId))
            .eq("user_id", user.id);

        if (error) {
            console.error("Error deleting compliment:", error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}


