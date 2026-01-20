import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { normalizeLocation } from "@/lib/location/normalize";

interface XProfileData {
    profileUrl: string;
    username: string | null;
    name: string | null;
    bio: string | null;
    location: string | null;
    website: string | null;
    profileImageUrl: string | null;
    pinnedTweet: string | null;
    joinDate: string | null;
    followersCount: string | null;
    followingCount: string | null;
}

// POST - Import or enrich a contact from X/Twitter
export async function POST(req: NextRequest) {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const body: XProfileData = await req.json();
        const { profileUrl, username, name, bio, location: rawLocation, website, profileImageUrl, pinnedTweet, joinDate, followersCount, followingCount } = body;
        
        // Normalize location for consistency
        const location = normalizeLocation(rawLocation);

        if (!username?.trim()) {
            return NextResponse.json({ error: "Username is required" }, { status: 400 });
        }

        const cleanUsername = username.trim().replace(/^@/, '').toLowerCase();
        const displayName = name || `@${cleanUsername}`;

        console.log(`[X Import] Processing: @${cleanUsername} (${displayName})`);

        // Check if contact already exists with this X profile
        let existingPeopleId: number | null = null;
        let isUpdate = false;

        // Check by X username
        const { data: existingXProfile } = await supabase
            .from("people_x_profiles")
            .select("people_id")
            .eq("user_id", user.id)
            .ilike("username", cleanUsername)
            .single();

        if (existingXProfile) {
            existingPeopleId = existingXProfile.people_id;
            isUpdate = true;
            console.log(`[X Import] Found existing contact by X username: ${existingPeopleId}`);
        }

        // If not found by X username, try to find by exact name match
        if (!existingPeopleId && name) {
            const { data: existingPerson } = await supabase
                .from("people")
                .select("id")
                .eq("user_id", user.id)
                .ilike("name", name.trim())
                .single();

            if (existingPerson) {
                existingPeopleId = existingPerson.id;
                isUpdate = true;
                console.log(`[X Import] Found existing contact by name: ${existingPeopleId}`);
            }
        }

        let peopleId: number;
        let uploadedImageUrl: string | null = null;

        // Download and upload profile image to Supabase storage
        if (profileImageUrl) {
            try {
                uploadedImageUrl = await downloadAndUploadImage(
                    supabase,
                    user.id,
                    profileImageUrl,
                    existingPeopleId
                );
                console.log(`[X Import] Uploaded image: ${uploadedImageUrl ? 'success' : 'failed'}`);
            } catch (imageError) {
                console.error("[X Import] Image upload error:", imageError);
            }
        }

        if (isUpdate && existingPeopleId) {
            // Update existing contact
            peopleId = existingPeopleId;

            // Update or create X profile
            const { data: existingX } = await supabase
                .from("people_x_profiles")
                .select("id")
                .eq("people_id", peopleId)
                .eq("user_id", user.id)
                .single();

            if (existingX) {
                await supabase
                    .from("people_x_profiles")
                    .update({
                        username: cleanUsername,
                        display_name: name || undefined,
                        bio: bio || undefined,
                        location: location || undefined,
                        website_url: website || undefined,
                        profile_image_url: uploadedImageUrl || profileImageUrl || undefined,
                        last_synced_at: new Date().toISOString(),
                    })
                    .eq("id", existingX.id);
            } else {
                // Create new X profile for existing contact
                const tempXUserId = `ext_${cleanUsername}_${Date.now()}`;
                await supabase
                    .from("people_x_profiles")
                    .insert({
                        user_id: user.id,
                        people_id: peopleId,
                        x_user_id: tempXUserId,
                        username: cleanUsername,
                        display_name: name || null,
                        bio: bio || null,
                        location: location || null,
                        website_url: website || null,
                        profile_image_url: uploadedImageUrl || profileImageUrl || null,
                    });
            }

            // Update empty custom fields
            const { data: contact } = await supabase
                .from("people")
                .select("custom_bio, custom_location, custom_profile_image_url, website_url")
                .eq("id", peopleId)
                .single();

            const updates: Record<string, string | undefined> = {};

            if (!contact?.custom_bio && bio) {
                updates.custom_bio = bio;
            }
            if (!contact?.custom_location && location) {
                updates.custom_location = location;
            }
            if (!contact?.custom_profile_image_url && uploadedImageUrl) {
                updates.custom_profile_image_url = uploadedImageUrl;
            }
            if (!contact?.website_url && website) {
                updates.website_url = website;
            }

            if (Object.keys(updates).length > 0) {
                await supabase
                    .from("people")
                    .update({
                        ...updates,
                        updated_at: new Date().toISOString(),
                    })
                    .eq("id", peopleId);
            }

            // ADD NOTE with X data
            const noteContent = buildXNote(cleanUsername, name, bio, location, website, pinnedTweet, joinDate, followersCount, followingCount, profileUrl);
            if (noteContent) {
                await supabase
                    .from("people_notes")
                    .insert({
                        user_id: user.id,
                        people_id: peopleId,
                        note: noteContent,
                        source_type: "auto",
                    });
                console.log(`[X Import] Added X note for contact ${peopleId}`);
            }

            // Add website to websites table if not already there
            if (website) {
                const { data: existingWebsite } = await supabase
                    .from("people_websites")
                    .select("id")
                    .eq("people_id", peopleId)
                    .eq("user_id", user.id)
                    .ilike("url", `%${website}%`)
                    .single();

                if (!existingWebsite) {
                    await supabase
                        .from("people_websites")
                        .insert({
                            user_id: user.id,
                            people_id: peopleId,
                            url: website.startsWith('http') ? website : `https://${website}`,
                        });
                }
            }

            console.log(`[X Import] Updated contact: ${displayName} (ID: ${peopleId})`);

        } else {
            // Create new contact
            const { data: newPerson, error: personError } = await supabase
                .from("people")
                .insert({
                    user_id: user.id,
                    name: displayName,
                    custom_bio: bio || null,
                    custom_location: location || null,
                    custom_profile_image_url: uploadedImageUrl || null,
                    website_url: website || null,
                })
                .select()
                .single();

            if (personError) {
                console.error("[X Import] Error creating contact:", personError);
                return NextResponse.json({ error: personError.message }, { status: 500 });
            }

            peopleId = newPerson.id;

            // Upload image with actual people ID if needed
            if (profileImageUrl && !uploadedImageUrl) {
                try {
                    uploadedImageUrl = await downloadAndUploadImage(
                        supabase,
                        user.id,
                        profileImageUrl,
                        peopleId
                    );
                    if (uploadedImageUrl) {
                        await supabase
                            .from("people")
                            .update({ custom_profile_image_url: uploadedImageUrl })
                            .eq("id", peopleId);
                    }
                } catch (imageError) {
                    console.error("[X Import] Image upload error (retry):", imageError);
                }
            }

            // Create X profile entry
            const tempXUserId = `ext_${cleanUsername}_${Date.now()}`;
            await supabase
                .from("people_x_profiles")
                .insert({
                    user_id: user.id,
                    people_id: peopleId,
                    x_user_id: tempXUserId,
                    username: cleanUsername,
                    display_name: name || null,
                    bio: bio || null,
                    location: location || null,
                    website_url: website || null,
                    profile_image_url: uploadedImageUrl || profileImageUrl || null,
                });

            // Add note with X data
            const noteContent = buildXNote(cleanUsername, name, bio, location, website, pinnedTweet, joinDate, followersCount, followingCount, profileUrl);
            if (noteContent) {
                await supabase
                    .from("people_notes")
                    .insert({
                        user_id: user.id,
                        people_id: peopleId,
                        note: noteContent,
                        source_type: "auto",
                    });
            }

            // Add website to websites table
            if (website) {
                await supabase
                    .from("people_websites")
                    .insert({
                        user_id: user.id,
                        people_id: peopleId,
                        url: website.startsWith('http') ? website : `https://${website}`,
                    });
            }

            console.log(`[X Import] Created new contact: ${displayName} (ID: ${peopleId})`);
        }

        // Fetch the full contact data to return
        const { data: contact } = await supabase
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
                    location
                )
            `)
            .eq("id", peopleId)
            .single();

        return NextResponse.json({
            success: true,
            isNew: !isUpdate,
            contact: contact ? {
                id: contact.id,
                name: contact.name,
                created_at: contact.created_at,
                custom_profile_image_url: contact.custom_profile_image_url,
                custom_bio: contact.custom_bio,
                custom_location: contact.custom_location,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                x_profile: (contact.people_x_profiles as any)?.[0] || null,
            } : null,
        });

    } catch (error) {
        console.error("[X Import] Error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

/**
 * Build a formatted note from X data - only pinned tweet
 */
function buildXNote(
    username: string,
    name: string | null,
    bio: string | null,
    location: string | null,
    website: string | null,
    pinnedTweet: string | null,
    joinDate: string | null,
    followersCount: string | null,
    followingCount: string | null,
    profileUrl: string | null
): string | null {
    // Only create a note if there's a pinned tweet
    if (pinnedTweet) {
        return pinnedTweet;
    }
    
    return null;
}

/**
 * Download an image from a URL and upload it to Supabase storage
 */
async function downloadAndUploadImage(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    supabase: any,
    userId: string,
    imageUrl: string,
    peopleId: number | null
): Promise<string | null> {
    if (!imageUrl) return null;

    try {
        const response = await fetch(imageUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'image/*',
            },
        });

        if (!response.ok) {
            console.error(`[Image Download] Failed to fetch image: ${response.status}`);
            return null;
        }

        const contentType = response.headers.get('content-type') || 'image/jpeg';
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        let ext = 'jpg';
        if (contentType.includes('png')) ext = 'png';
        else if (contentType.includes('webp')) ext = 'webp';
        else if (contentType.includes('gif')) ext = 'gif';

        const contactId = peopleId || `temp_${Date.now()}`;
        const filename = `${userId}/${contactId}/x_profile.${ext}`;

        const { error: uploadError } = await supabase.storage
            .from("contact-images")
            .upload(filename, buffer, {
                contentType,
                upsert: true,
            });

        if (uploadError) {
            console.error("[Image Upload] Error:", uploadError);
            return null;
        }

        const { data: urlData } = supabase.storage
            .from("contact-images")
            .getPublicUrl(filename);

        return `${urlData.publicUrl}?t=${Date.now()}`;

    } catch (error) {
        console.error("[Image Download/Upload] Error:", error);
        return null;
    }
}
