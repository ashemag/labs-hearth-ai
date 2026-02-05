import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isLinkedInUrl, fetchLinkedInProfile } from "@/lib/linkedin";
import { isXHandle, extractXUsername, fetchXProfile } from "@/lib/x";
import { normalizeLocation } from "@/lib/location/normalize";
import { SupabaseClient } from "@supabase/supabase-js";

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
    contact_info: {
        id: number;
        type: 'phone' | 'email';
        value: string;
        created_at: string;
    }[];
}

// GET - Fetch all contacts with profiles and notes
export async function GET(request: NextRequest) {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || "500"), 1000);
    const offset = Math.max(parseInt(searchParams.get("offset") || "0"), 0);
    
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
                ),
                people_contact_info (
                    id,
                    type,
                    value,
                    created_at
                )
            `)
            .eq("user_id", user.id)
            .order("created_at", { ascending: false })
            .range(offset, offset + limit - 1);

        if (peopleError) {
            console.error("Error fetching people:", peopleError);
            return NextResponse.json({ error: "Failed to fetch contacts" }, { status: 500 });
        }

        // Transform to expected shape
        interface PersonRecord {
            id: number;
            name: string;
            created_at: string;
            custom_profile_image_url: string | null;
            custom_bio: string | null;
            custom_location: string | null;
            website_url: string | null;
            hidden: boolean;
            last_touchpoint: string | null;
            people_x_profiles?: { username: string; display_name: string | null; bio: string | null; profile_image_url: string | null; followers_count: number | null; following_count: number | null; verified: boolean; website_url: string | null; location: string | null }[];
            people_linkedin_profiles?: { linkedin_url: string; profile_image_url: string | null; headline: string | null; location: string | null }[];
            people_notes?: { id: number; note: string; created_at: string; source_type: string | null }[];
            people_touchpoints?: { id: number; created_at: string }[];
            people_websites?: { id: number; url: string; created_at: string }[];
            people_compliments?: { id: number; compliment: string; context: string | null; received_at: string | null; created_at: string }[];
            people_contact_info?: { id: number; type: 'phone' | 'email'; value: string; created_at: string }[];
        }

        const contacts: RolodexContact[] = (people || []).map((person: PersonRecord) => ({
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
            notes: (person.people_notes || []).sort((a, b) =>
                new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            ),
            touchpoints: (person.people_touchpoints || []).sort((a, b) =>
                new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            ),
            websites: (person.people_websites || []).sort((a, b) =>
                new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
            ),
            compliments: (person.people_compliments || []).sort((a, b) =>
                new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            ),
            contact_info: (person.people_contact_info || []).sort((a, b) =>
                new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
            ),
        }));

        return NextResponse.json({ contacts });
    } catch (error) {
        console.error("Error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

// POST - Add a new contact from LinkedIn URL, X handle, or just a name
export async function POST(req: NextRequest) {
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await req.json();
        const { handle, name } = body;

        // If name is provided without handle, create a simple contact
        if (name && !handle) {
            return handleNameOnlyImport(supabase, user.id, name.trim());
        }

        if (!handle) {
            return NextResponse.json({ error: "Name or social profile is required" }, { status: 400 });
        }

        // Check if this is a LinkedIn URL
        if (isLinkedInUrl(handle)) {
            return handleLinkedInImport(supabase, user.id, handle.trim());
        }

        // Check if this is an X/Twitter URL or handle
        if (isXHandle(handle)) {
            return handleXImport(supabase, user.id, handle.trim());
        }

        // Otherwise treat as a name
        return handleNameOnlyImport(supabase, user.id, handle.trim());
    } catch (error) {
        console.error("Error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

// Handle name-only contact creation
async function handleNameOnlyImport(supabase: SupabaseClient, userId: string, name: string): Promise<NextResponse> {
        // Create person with just a name
        const { data: person, error: personError } = await supabase
            .from("people")
            .insert({ 
            user_id: userId,
            name 
            })
            .select()
            .single();

        if (personError) {
            console.error("Error creating person:", personError);
            return NextResponse.json({ error: "Failed to create contact" }, { status: 500 });
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
            contact_info: [],
        };

        return NextResponse.json({ contact });
}

// Handle LinkedIn import
async function handleLinkedInImport(supabase: SupabaseClient, userId: string, linkedinUrl: string): Promise<NextResponse> {
    // Normalize the URL for checking duplicates
    const normalizedUrl = linkedinUrl.toLowerCase().replace(/\/$/, "");
    const usernameMatch = normalizedUrl.match(/linkedin\.com\/in\/([a-zA-Z0-9\-_]+)/i);
    const username = usernameMatch ? usernameMatch[1] : null;

    if (username) {
        // Check if person already exists with this LinkedIn profile
        const { data: existingProfile } = await supabase
            .from("people_linkedin_profiles")
            .select("people_id")
            .eq("user_id", userId)
            .ilike("linkedin_url", `%/in/${username}%`)
            .single();

        if (existingProfile) {
            return NextResponse.json({
                error: "Contact already exists",
                existing: true,
                contact_id: existingProfile.people_id
            }, { status: 409 });
        }
    }

    // Fetch LinkedIn profile data via SerpAPI
    console.log(`[LinkedIn] Fetching profile for new contact: ${linkedinUrl}`);
    const linkedInProfile = await fetchLinkedInProfile(linkedinUrl);

    if (!linkedInProfile) {
        return NextResponse.json({
            error: "Could not fetch LinkedIn profile. Please try again."
        }, { status: 404 });
    }

    // Create person with name from LinkedIn
    const { data: person, error: personError } = await supabase
        .from("people")
        .insert({ 
            user_id: userId,
            name: linkedInProfile.fullName 
        })
        .select()
        .single();

    if (personError) {
        console.error("Error creating person:", personError);
        return NextResponse.json({ error: "Failed to create contact" }, { status: 500 });
    }

    // Create LinkedIn profile entry
    const { error: profileError } = await supabase
        .from("people_linkedin_profiles")
        .insert({
            user_id: userId,
            people_id: person.id,
            linkedin_url: linkedInProfile.linkedinUrl,
            profile_image_url: linkedInProfile.profileImageUrl,
            headline: linkedInProfile.headline,
            location: normalizeLocation(linkedInProfile.location),
        });

    if (profileError) {
        console.error("Error creating LinkedIn profile:", profileError);
        // Clean up person if profile creation failed
        await supabase.from("people").delete().eq("id", person.id);
        return NextResponse.json({ error: profileError.message }, { status: 500 });
    }

    console.log(`✓ Imported LinkedIn profile for ${linkedInProfile.fullName}`, {
        hasImage: !!linkedInProfile.profileImageUrl,
        hasHeadline: !!linkedInProfile.headline,
    });

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
        linkedin_profile: {
            linkedin_url: linkedInProfile.linkedinUrl,
            profile_image_url: linkedInProfile.profileImageUrl,
            headline: linkedInProfile.headline,
            location: normalizeLocation(linkedInProfile.location),
        },
        notes: [],
        touchpoints: [],
        websites: [],
        compliments: [],
        contact_info: [],
    };

    return NextResponse.json({ contact });
}

// Handle X/Twitter import using SerpAPI + LLM enrichment
async function handleXImport(supabase: SupabaseClient, userId: string, handle: string): Promise<NextResponse> {
    const username = extractXUsername(handle);
    
    if (!username) {
        return NextResponse.json({ error: "Invalid X handle or URL" }, { status: 400 });
    }

    // Check if person already exists with this X profile
    const { data: existingProfile } = await supabase
        .from("people_x_profiles")
        .select("people_id")
        .eq("user_id", userId)
        .ilike("username", username)
        .single();

    if (existingProfile) {
        return NextResponse.json({
            error: "Contact already exists",
            existing: true,
            contact_id: existingProfile.people_id
        }, { status: 409 });
    }

    // Fetch profile data via SerpAPI + LLM (similar to LinkedIn)
    console.log(`[X] Fetching profile for new contact: @${username}`);
    const xProfile = await fetchXProfile(handle);

    if (!xProfile) {
        return NextResponse.json({
            error: "Could not fetch X profile. Please try again."
        }, { status: 404 });
    }

    // Create person with display name from X
    const { data: person, error: personError } = await supabase
        .from("people")
        .insert({ 
            user_id: userId,
            name: xProfile.displayName 
        })
        .select()
        .single();

    if (personError) {
        console.error("Error creating person:", personError);
        return NextResponse.json({ error: "Failed to create contact" }, { status: 500 });
    }

    // Create X profile entry
    const tempXUserId = `manual_${username.toLowerCase()}_${Date.now()}`;
    const { error: profileError } = await supabase
        .from("people_x_profiles")
        .insert({
            user_id: userId,
            people_id: person.id,
            x_user_id: tempXUserId,
            username: xProfile.username,
            display_name: xProfile.displayName,
            bio: xProfile.bio,
            profile_image_url: xProfile.profileImageUrl,
            location: normalizeLocation(xProfile.location),
            last_synced_at: new Date().toISOString(),
        });

    if (profileError) {
        console.error("Error creating X profile:", profileError);
        // Clean up person if profile creation failed
        await supabase.from("people").delete().eq("id", person.id);
        return NextResponse.json({ error: profileError.message }, { status: 500 });
    }

    console.log(`✓ Imported X profile for @${xProfile.username}`, {
        displayName: xProfile.displayName,
        hasBio: !!xProfile.bio,
        hasLocation: !!xProfile.location,
        hasAvatar: !!xProfile.profileImageUrl,
    });

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
        x_profile: {
            username: xProfile.username,
            display_name: xProfile.displayName,
            bio: xProfile.bio,
            profile_image_url: xProfile.profileImageUrl,
            followers_count: null,
            following_count: null,
            verified: false,
            website_url: null,
            location: normalizeLocation(xProfile.location),
        },
        linkedin_profile: null,
        notes: [],
        touchpoints: [],
        websites: [],
        compliments: [],
        contact_info: [],
    };

    return NextResponse.json({ contact });
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
