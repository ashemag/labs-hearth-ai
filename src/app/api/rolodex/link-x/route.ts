import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Nitter instances to try (public mirrors of Twitter that are easier to scrape)
const NITTER_INSTANCES = [
    "nitter.poast.org",
    "nitter.privacydev.net",
    "nitter.woodland.cafe",
];

interface XProfileData {
    username: string;
    display_name: string | null;
    bio: string | null;
    profile_image_url: string | null;
    followers_count: number | null;
    following_count: number | null;
    verified: boolean;
    website_url: string | null;
    location: string | null;
}

// Try to fetch profile data from Nitter instances
async function fetchFromNitter(username: string): Promise<Partial<XProfileData> | null> {
    for (const instance of NITTER_INSTANCES) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);
            
            const response = await fetch(`https://${instance}/${username}`, {
                signal: controller.signal,
                headers: {
                    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
                    "Accept": "text/html",
                },
            });
            
            clearTimeout(timeoutId);
            
            if (!response.ok) continue;
            
            const html = await response.text();
            
            // Parse the HTML for profile data
            const displayNameMatch = html.match(/<a[^>]*class="profile-card-fullname"[^>]*>([^<]+)<\/a>/);
            const bioMatch = html.match(/<div[^>]*class="profile-bio"[^>]*>([^<]*(?:<[^>]*>[^<]*)*)<\/div>/);
            const locationMatch = html.match(/<span[^>]*class="profile-location"[^>]*>([^<]+)<\/span>/);
            const websiteMatch = html.match(/<a[^>]*class="profile-website"[^>]*href="([^"]+)"/);
            const avatarMatch = html.match(/<a[^>]*class="profile-card-avatar"[^>]*href="([^"]+)"/);
            
            // Stats parsing
            const followingMatch = html.match(/<span[^>]*class="profile-stat-num"[^>]*>([0-9,]+)<\/span>\s*<span[^>]*class="profile-stat-header"[^>]*>Following/);
            const followersMatch = html.match(/<span[^>]*class="profile-stat-num"[^>]*>([0-9,]+)<\/span>\s*<span[^>]*class="profile-stat-header"[^>]*>Followers/);
            
            // Clean bio HTML
            let bio = bioMatch?.[1] || null;
            if (bio) {
                bio = bio.replace(/<[^>]*>/g, "").trim();
                bio = bio.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"');
            }
            
            const parseCount = (str: string | undefined): number | null => {
                if (!str) return null;
                const cleaned = str.replace(/,/g, "");
                const num = parseInt(cleaned, 10);
                return isNaN(num) ? null : num;
            };
            
            // Get avatar URL - Nitter hosts a copy
            let avatarUrl = avatarMatch?.[1] || null;
            if (avatarUrl && !avatarUrl.startsWith("http")) {
                avatarUrl = `https://${instance}${avatarUrl}`;
            }
            
            console.log(`✓ Fetched profile data from ${instance} for @${username}`);
            
            return {
                display_name: displayNameMatch?.[1]?.trim() || null,
                bio: bio,
                location: locationMatch?.[1]?.trim() || null,
                website_url: websiteMatch?.[1] || null,
                profile_image_url: avatarUrl,
                followers_count: parseCount(followersMatch?.[1]),
                following_count: parseCount(followingMatch?.[1]),
            };
        } catch (error) {
            // Try next instance
            console.log(`Nitter instance ${instance} failed, trying next...`);
            continue;
        }
    }
    return null;
}

// Fallback: Get profile image from unavatar.io (aggregates social profile photos)
async function getAvatarUrl(username: string): Promise<string | null> {
    try {
        // unavatar.io provides a unified API for social profile images
        // It will redirect to the actual image or return a fallback
        const avatarUrl = `https://unavatar.io/twitter/${username}`;
        
        // Check if it returns a valid image
        const response = await fetch(avatarUrl, { method: "HEAD" });
        if (response.ok) {
            return avatarUrl;
        }
    } catch {
        // Ignore errors
    }
    return null;
}

// POST - Link an X (Twitter) profile to a contact
export async function POST(req: NextRequest) {
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await req.json();
        const { people_id, handle } = body;

        if (!people_id) {
            return NextResponse.json({ error: "Contact ID is required" }, { status: 400 });
        }

        if (!handle?.trim()) {
            return NextResponse.json({ error: "X handle is required" }, { status: 400 });
        }

        // Clean the handle (remove @ if present, extract from URL if needed)
        let cleanHandle = handle.trim();
        
        // Handle full URLs like https://x.com/username or https://twitter.com/username
        if (cleanHandle.includes("x.com/") || cleanHandle.includes("twitter.com/")) {
            const match = cleanHandle.match(/(?:x\.com|twitter\.com)\/([a-zA-Z0-9_]+)/);
            if (match) {
                cleanHandle = match[1];
            }
        }
        
        // Remove @ if present
        cleanHandle = cleanHandle.replace(/^@/, "");

        // Validate handle format (alphanumeric and underscores only, 1-15 chars)
        if (!/^[a-zA-Z0-9_]{1,15}$/.test(cleanHandle)) {
            return NextResponse.json({ error: "Invalid X handle format" }, { status: 400 });
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

        // Try to fetch profile data from external sources
        console.log(`Fetching X profile data for @${cleanHandle}...`);
        
        let profileData: Partial<XProfileData> = {};
        
        // Try Nitter first for full profile data
        const nitterData = await fetchFromNitter(cleanHandle);
        if (nitterData) {
            profileData = { ...nitterData };
        }
        
        // If no avatar from Nitter, try unavatar.io
        if (!profileData.profile_image_url) {
            const avatarUrl = await getAvatarUrl(cleanHandle);
            if (avatarUrl) {
                profileData.profile_image_url = avatarUrl;
            }
        }

        // Check if this contact already has an X profile
        const { data: existingProfile } = await supabase
            .from("people_x_profiles")
            .select("id")
            .eq("people_id", people_id)
            .eq("user_id", user.id)
            .single();

        // Generate a temporary x_user_id since we don't have API access
        const tempXUserId = `manual_${cleanHandle.toLowerCase()}_${Date.now()}`;

        let xProfile;

        const profilePayload = {
            username: cleanHandle.toLowerCase(),
            display_name: profileData.display_name || cleanHandle,
            bio: profileData.bio || null,
            profile_image_url: profileData.profile_image_url || null,
            location: profileData.location || null,
            website_url: profileData.website_url || null,
            followers_count: profileData.followers_count || null,
            following_count: profileData.following_count || null,
            verified: profileData.verified || false,
            last_synced_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        };

        if (existingProfile) {
            // Update existing profile
            const { data: updatedProfile, error: updateError } = await supabase
                .from("people_x_profiles")
                .update(profilePayload)
                .eq("id", existingProfile.id)
                .select()
                .single();

            if (updateError) {
                console.error("Error updating X profile:", updateError);
                return NextResponse.json({ error: updateError.message }, { status: 500 });
            }

            xProfile = updatedProfile;
        } else {
            // Create new profile
            const { data: newProfile, error: createError } = await supabase
                .from("people_x_profiles")
                .insert({
                    user_id: user.id,
                    people_id: people_id,
                    x_user_id: tempXUserId,
                    ...profilePayload,
                })
                .select()
                .single();

            if (createError) {
                console.error("Error creating X profile:", createError);
                return NextResponse.json({ error: createError.message }, { status: 500 });
            }

            xProfile = newProfile;
        }

        console.log(`✓ Linked X profile @${cleanHandle} to contact ${people_id}`, {
            hasDisplayName: !!profileData.display_name,
            hasBio: !!profileData.bio,
            hasAvatar: !!profileData.profile_image_url,
        });

        // Return in the format expected by the frontend
        return NextResponse.json({
            x_profile: {
                username: xProfile.username,
                display_name: xProfile.display_name,
                bio: xProfile.bio,
                profile_image_url: xProfile.profile_image_url,
                followers_count: xProfile.followers_count,
                following_count: xProfile.following_count,
                verified: xProfile.verified || false,
                website_url: xProfile.website_url,
                location: xProfile.location,
            }
        });
    } catch (error) {
        console.error("Error linking X profile:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

// DELETE - Unlink an X profile from a contact
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
            .from("people_x_profiles")
            .delete()
            .eq("people_id", parseInt(peopleId, 10))
            .eq("user_id", user.id);

        if (error) {
            console.error("Error deleting X profile:", error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        console.log(`✓ Unlinked X profile from contact ${peopleId}`);
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

