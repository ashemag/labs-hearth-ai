import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export interface RolodexContact {
    id: number;
    name: string;
    created_at: string;
    custom_profile_image_url: string | null;
    custom_bio: string | null;
    custom_location: string | null;
    website_url: string | null;
    hidden: boolean;
    last_touchpoint: string | null;
    x_profile: {
        username: string;
        display_name: string | null;
        bio: string | null;
        profile_image_url: string | null;
        followers_count: number | null;
        following_count: number | null;
        verified: boolean;
        website_url: string | null;
        location: string | null;
    } | null;
    linkedin_profile: {
        linkedin_url: string;
        profile_image_url: string | null;
        headline: string | null;
        location: string | null;
    } | null;
    notes: {
        id: number;
        note: string;
        created_at: string;
        source_type: string | null;
    }[];
    touchpoints: {
        id: number;
        created_at: string;
    }[];
    websites: {
        id: number;
        url: string;
        created_at: string;
    }[];
    compliments: {
        id: number;
        compliment: string;
        context: string | null;
        received_at: string | null;
        created_at: string;
    }[];
}

// GET - Fetch all contacts with profiles and notes
export async function GET() {
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        // Fetch all people with their profiles, notes, and compliments
        const { data: people, error: peopleError } = await supabase
            .from("people")
            .select(`
                id,
                name,
                created_at,
                custom_profile_image_url,
                custom_bio,
                custom_location,
                website_url,
                hidden,
                last_touchpoint,
                people_x_profiles (
                    username,
                    display_name,
                    bio,
                    profile_image_url,
                    followers_count,
                    following_count,
                    verified,
                    website_url,
                    location
                ),
                people_linkedin_profiles (
                    linkedin_url,
                    profile_image_url,
                    headline,
                    location
                ),
                people_notes (
                    id,
                    note,
                    created_at,
                    source_type
                ),
                people_touchpoints (
                    id,
                    created_at
                ),
                people_websites (
                    id,
                    url,
                    created_at
                ),
                people_compliments (
                    id,
                    compliment,
                    context,
                    received_at,
                    created_at
                )
            `)
            .eq("user_id", user.id)
            .order("created_at", { ascending: false });

        if (peopleError) {
            console.error("Error fetching people:", peopleError);
            return NextResponse.json({ error: peopleError.message }, { status: 500 });
        }

        // Transform to expected shape
        const contacts: RolodexContact[] = (people || []).map((person: any) => ({
            id: person.id,
            name: person.name,
            created_at: person.created_at,
            custom_profile_image_url: person.custom_profile_image_url || null,
            custom_bio: person.custom_bio || null,
            custom_location: person.custom_location || null,
            website_url: person.website_url || null,
            hidden: person.hidden || false,
            last_touchpoint: person.last_touchpoint || null,
            x_profile: person.people_x_profiles?.[0] || null,
            linkedin_profile: person.people_linkedin_profiles?.[0] || null,
            notes: (person.people_notes || []).sort((a: any, b: any) =>
                new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            ),
            touchpoints: (person.people_touchpoints || []).sort((a: any, b: any) =>
                new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            ),
            websites: (person.people_websites || []).sort((a: any, b: any) =>
                new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
            ),
            compliments: (person.people_compliments || []).sort((a: any, b: any) =>
                new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            ),
        }));

        return NextResponse.json({ contacts });
    } catch (error) {
        console.error("Error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

// POST - Add a new contact (name only for now)
export async function POST(req: NextRequest) {
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await req.json();
        const { name } = body;

        if (!name?.trim()) {
            return NextResponse.json({ error: "Name is required" }, { status: 400 });
        }

        // Create person with just a name
        const { data: person, error: personError } = await supabase
            .from("people")
            .insert({ 
                user_id: user.id,
                name: name.trim() 
            })
            .select()
            .single();

        if (personError) {
            console.error("Error creating person:", personError);
            return NextResponse.json({ error: personError.message }, { status: 500 });
        }

        console.log(`✓ Created contact: ${name}`);

        // Return the new contact
        const contact: RolodexContact = {
            id: person.id,
            name: person.name,
            created_at: person.created_at,
            custom_profile_image_url: null,
            custom_bio: null,
            custom_location: null,
            website_url: null,
            hidden: false,
            last_touchpoint: null,
            x_profile: null,
            linkedin_profile: null,
            notes: [],
            touchpoints: [],
            websites: [],
            compliments: [],
        };

        return NextResponse.json({ contact });
    } catch (error) {
        console.error("Error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

// DELETE - Delete a contact
export async function DELETE(req: NextRequest) {
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get("id");

        if (!id) {
            return NextResponse.json({ error: "Contact ID is required" }, { status: 400 });
        }

        const contactId = parseInt(id, 10);
        if (isNaN(contactId)) {
            return NextResponse.json({ error: "Invalid contact ID" }, { status: 400 });
        }

        // Delete the person (cascade will handle related records)
        // RLS ensures user can only delete their own contacts
        const { error } = await supabase
            .from("people")
            .delete()
            .eq("id", contactId)
            .eq("user_id", user.id);

        if (error) {
            console.error("Error deleting contact:", error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        console.log(`✓ Deleted contact ${contactId}`);
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}


