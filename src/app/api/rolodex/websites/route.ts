import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// POST - Add a website to a person
export async function POST(req: NextRequest) {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await req.json();
        const { people_id, url } = body;

        if (!people_id || !url) {
            return NextResponse.json({ error: "people_id and url are required" }, { status: 400 });
        }

        const { data, error } = await supabase
            .from("people_websites")
            .insert({
                user_id: user.id,
                people_id,
                url: url.trim(),
            })
            .select()
            .single();

        if (error) {
            console.error("Error adding website:", error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ website: data });
    } catch (error) {
        console.error("Error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

// DELETE - Remove a website
export async function DELETE(req: NextRequest) {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { searchParams } = new URL(req.url);
        const websiteId = searchParams.get("id");

        if (!websiteId) {
            return NextResponse.json({ error: "Website ID is required" }, { status: 400 });
        }

        const { error } = await supabase
            .from("people_websites")
            .delete()
            .eq("id", parseInt(websiteId))
            .eq("user_id", user.id);

        if (error) {
            console.error("Error deleting website:", error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}


