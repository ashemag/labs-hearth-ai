import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// PATCH - Update a contact's details
export async function PATCH(req: NextRequest) {
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await req.json();
        const { people_id, name, hidden, custom_bio, website_url, custom_location, last_touchpoint } = body;

        if (!people_id) {
            return NextResponse.json({ error: "people_id is required" }, { status: 400 });
        }

        // Build update object based on what's provided
        const updateData: { 
            name?: string; 
            hidden?: boolean; 
            custom_bio?: string | null; 
            website_url?: string | null; 
            custom_location?: string | null; 
            last_touchpoint?: string | null 
        } = {};
        
        if (name !== undefined) {
            if (!name?.trim()) {
                return NextResponse.json({ error: "name cannot be empty" }, { status: 400 });
            }
            updateData.name = name.trim();
        }
        
        if (hidden !== undefined) {
            updateData.hidden = hidden;
        }

        if (custom_bio !== undefined) {
            updateData.custom_bio = custom_bio?.trim() || null;
        }

        if (website_url !== undefined) {
            updateData.website_url = website_url?.trim() || null;
        }

        if (custom_location !== undefined) {
            updateData.custom_location = custom_location?.trim() || null;
        }

        if (last_touchpoint !== undefined) {
            updateData.last_touchpoint = last_touchpoint || null;
            
            // Also insert a touchpoint record for history tracking
            if (last_touchpoint) {
                await supabase
                    .from("people_touchpoints")
                    .insert({ 
                        user_id: user.id,
                        people_id, 
                        created_at: last_touchpoint 
                    });
            }
        }

        if (Object.keys(updateData).length === 0) {
            return NextResponse.json({ error: "No fields to update" }, { status: 400 });
        }

        const { data, error } = await supabase
            .from("people")
            .update(updateData)
            .eq("id", people_id)
            .eq("user_id", user.id)
            .select()
            .single();

        if (error) {
            console.error("Error updating person:", error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, person: data });
    } catch (error) {
        console.error("Error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}


