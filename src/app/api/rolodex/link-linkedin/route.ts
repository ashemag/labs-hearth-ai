import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Extract username from LinkedIn URL
function extractLinkedInUsername(url: string): string | null {
    const match = url.match(/linkedin\.com\/in\/([a-zA-Z0-9_-]+)/);
    return match ? match[1] : null;
}

// Get profile image URL from unavatar.io (returns URL directly - service handles fallbacks)
function getLinkedInAvatarUrl(username: string): string {
    return `https://unavatar.io/linkedin/${username}?fallback=false`;
}

// POST - Link a LinkedIn profile to a contact
export async function POST(req: NextRequest) {
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await req.json();
        const { people_id, linkedin_url } = body;

        if (!people_id) {
            return NextResponse.json({ error: "Contact ID is required" }, { status: 400 });
        }

        if (!linkedin_url?.trim()) {
            return NextResponse.json({ error: "LinkedIn URL is required" }, { status: 400 });
        }

        // Clean and validate the LinkedIn URL
        let cleanUrl = linkedin_url.trim();
        
        // Handle various LinkedIn URL formats
        // linkedin.com/in/username, www.linkedin.com/in/username, etc.
        if (!cleanUrl.includes("linkedin.com")) {
            // Assume it's just the username/handle
            cleanUrl = `https://www.linkedin.com/in/${cleanUrl.replace(/^\/+/, "")}`;
        } else if (!cleanUrl.startsWith("http")) {
            cleanUrl = `https://${cleanUrl}`;
        }

        // Validate it's a LinkedIn URL
        if (!cleanUrl.match(/linkedin\.com\/(in|company)\/[a-zA-Z0-9_-]+/)) {
            return NextResponse.json({ error: "Invalid LinkedIn URL format" }, { status: 400 });
        }

        // Check that the contact belongs to this user
        const { data: person, error: personError } = await supabase
            .from("people")
            .select("id, name")
            .eq("id", people_id)
            .eq("user_id", user.id)
            .single();

        if (personError || !person) {
            return NextResponse.json({ error: "Contact not found" }, { status: 404 });
        }

        // Get profile image URL
        const username = extractLinkedInUsername(cleanUrl);
        const profileImageUrl = username ? getLinkedInAvatarUrl(username) : null;
        
        console.log(`LinkedIn link: username=${username}, avatarUrl=${profileImageUrl}`);

        // Delete any existing LinkedIn profile for this contact (to avoid unique constraint issues)
        await supabase
            .from("people_linkedin_profiles")
            .delete()
            .eq("people_id", people_id)
            .eq("user_id", user.id);

        // Insert the new profile
        const { data: linkedinProfile, error: createError } = await supabase
            .from("people_linkedin_profiles")
            .insert({
                user_id: user.id,
                people_id: people_id,
                linkedin_url: cleanUrl,
                profile_image_url: profileImageUrl,
            })
            .select()
            .single();

        if (createError) {
            console.error("Error creating LinkedIn profile:", createError);
            return NextResponse.json({ error: createError.message }, { status: 500 });
        }

        console.log(`✓ Linked LinkedIn profile to contact ${people_id}`, { hasAvatar: !!profileImageUrl });

        // Return in the format expected by the frontend
        return NextResponse.json({
            linkedin_profile: {
                linkedin_url: linkedinProfile.linkedin_url,
                profile_image_url: linkedinProfile.profile_image_url,
                headline: linkedinProfile.headline,
                location: linkedinProfile.location,
            }
        });
    } catch (error) {
        console.error("Error linking LinkedIn profile:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

// DELETE - Unlink a LinkedIn profile from a contact
export async function DELETE(req: NextRequest) {
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { searchParams } = new URL(req.url);
        const peopleId = searchParams.get("people_id");

        if (!peopleId) {
            return NextResponse.json({ error: "Contact ID is required" }, { status: 400 });
        }

        const { error } = await supabase
            .from("people_linkedin_profiles")
            .delete()
            .eq("people_id", parseInt(peopleId, 10))
            .eq("user_id", user.id);

        if (error) {
            console.error("Error deleting LinkedIn profile:", error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        console.log(`✓ Unlinked LinkedIn profile from contact ${peopleId}`);
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

