import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { normalizeLocation } from "@/lib/location/normalize";

interface ExperienceItem {
    title: string;
    company: string;
    dates: string;
}

interface EducationItem {
    school: string;
    degree: string;
}

interface LinkedInProfileData {
    linkedinUrl: string;
    name: string | null;
    headline: string | null;
    location: string | null;
    profileImageUrl: string | null;
    about: string | null;
    experience?: ExperienceItem[];
    education?: EducationItem[];
}

// POST - Import or enrich a contact from LinkedIn
export async function POST(req: NextRequest) {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const body: LinkedInProfileData = await req.json();
        const { linkedinUrl, name, headline, location: rawLocation, profileImageUrl, about, experience, education } = body;
        
        // Normalize location for consistency
        const location = normalizeLocation(rawLocation);

        if (!name?.trim()) {
            return NextResponse.json({ error: "Name is required" }, { status: 400 });
        }

        if (!linkedinUrl?.trim()) {
            return NextResponse.json({ error: "LinkedIn URL is required" }, { status: 400 });
        }

        // Clean and normalize the LinkedIn URL
        let cleanUrl = linkedinUrl.trim().split('?')[0];
        if (!cleanUrl.startsWith('http')) {
            cleanUrl = `https://${cleanUrl}`;
        }

        // Extract username for matching
        const usernameMatch = cleanUrl.match(/linkedin\.com\/in\/([a-zA-Z0-9\-_]+)/i);
        const linkedinUsername = usernameMatch ? usernameMatch[1].toLowerCase() : null;

        console.log(`[LinkedIn Import] Processing: ${name} - ${cleanUrl}`);

        // Check if contact already exists with this LinkedIn URL
        let existingPeopleId: number | null = null;
        let isUpdate = false;

        if (linkedinUsername) {
            const { data: existingProfile } = await supabase
                .from("people_linkedin_profiles")
                .select("people_id")
                .eq("user_id", user.id)
                .ilike("linkedin_url", `%/in/${linkedinUsername}%`)
                .single();

            if (existingProfile) {
                existingPeopleId = existingProfile.people_id;
                isUpdate = true;
                console.log(`[LinkedIn Import] Found existing contact by LinkedIn URL: ${existingPeopleId}`);
            }
        }

        // If not found by LinkedIn URL, try to find by exact name match
        if (!existingPeopleId) {
            const { data: existingPerson } = await supabase
                .from("people")
                .select("id")
                .eq("user_id", user.id)
                .ilike("name", name.trim())
                .single();

            if (existingPerson) {
                existingPeopleId = existingPerson.id;
                isUpdate = true;
                console.log(`[LinkedIn Import] Found existing contact by name: ${existingPeopleId}`);
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
                console.log(`[LinkedIn Import] Uploaded image: ${uploadedImageUrl ? 'success' : 'failed'}`);
            } catch (imageError) {
                console.error("[LinkedIn Import] Image upload error:", imageError);
            }
        }

        if (isUpdate && existingPeopleId) {
            // Update existing contact
            peopleId = existingPeopleId;

            // Update or create LinkedIn profile
            const { data: existingLinkedIn } = await supabase
                .from("people_linkedin_profiles")
                .select("id")
                .eq("people_id", peopleId)
                .eq("user_id", user.id)
                .single();

            if (existingLinkedIn) {
                await supabase
                    .from("people_linkedin_profiles")
                    .update({
                        linkedin_url: cleanUrl,
                        headline: headline || undefined,
                        location: location || undefined,
                        profile_image_url: uploadedImageUrl || profileImageUrl || undefined,
                        last_synced_at: new Date().toISOString(),
                    })
                    .eq("id", existingLinkedIn.id);
            } else {
                await supabase
                    .from("people_linkedin_profiles")
                    .insert({
                        user_id: user.id,
                        people_id: peopleId,
                        linkedin_url: cleanUrl,
                        headline: headline || null,
                        location: location || null,
                        profile_image_url: uploadedImageUrl || profileImageUrl || null,
                    });
            }

            // Update empty custom fields
            const { data: contact } = await supabase
                .from("people")
                .select("custom_bio, custom_location, custom_profile_image_url")
                .eq("id", peopleId)
                .single();

            const updates: Record<string, string | undefined> = {};

            if (!contact?.custom_bio && headline) {
                updates.custom_bio = headline;
            }
            if (!contact?.custom_location && location) {
                updates.custom_location = location;
            }
            if (!contact?.custom_profile_image_url && uploadedImageUrl) {
                updates.custom_profile_image_url = uploadedImageUrl;
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

            // ADD NOTE with LinkedIn data for existing contacts
            const noteContent = buildLinkedInNote(name, headline, location, about, experience, education, cleanUrl);
            if (noteContent) {
                await supabase
                    .from("people_notes")
                    .insert({
                        user_id: user.id,
                        people_id: peopleId,
                        note: noteContent,
                        source_type: "auto",
                    });
                console.log(`[LinkedIn Import] Added LinkedIn note for contact ${peopleId}`);
            }

            console.log(`[LinkedIn Import] Updated contact: ${name} (ID: ${peopleId})`);

        } else {
            // Create new contact
            const { data: newPerson, error: personError } = await supabase
                .from("people")
                .insert({
                    user_id: user.id,
                    name: name.trim(),
                    custom_bio: headline || null,
                    custom_location: location || null,
                    custom_profile_image_url: uploadedImageUrl || null,
                })
                .select()
                .single();

            if (personError) {
                console.error("[LinkedIn Import] Error creating contact:", personError);
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
                    console.error("[LinkedIn Import] Image upload error (retry):", imageError);
                }
            }

            // Create LinkedIn profile entry
            await supabase
                .from("people_linkedin_profiles")
                .insert({
                    user_id: user.id,
                    people_id: peopleId,
                    linkedin_url: cleanUrl,
                    headline: headline || null,
                    location: location || null,
                    profile_image_url: uploadedImageUrl || profileImageUrl || null,
                });

            // Add note with LinkedIn data for new contacts too
            const noteContent = buildLinkedInNote(name, headline, location, about, experience, education, cleanUrl);
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

            console.log(`[LinkedIn Import] Created new contact: ${name} (ID: ${peopleId})`);
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
                people_linkedin_profiles (
                    linkedin_url,
                    profile_image_url,
                    headline,
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
                linkedin_profile: (contact.people_linkedin_profiles as any)?.[0] || null,
            } : null,
        });

    } catch (error) {
        console.error("[LinkedIn Import] Error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

/**
 * Build a formatted note from LinkedIn data
 */
function buildLinkedInNote(
    name: string | null,
    headline: string | null,
    location: string | null,
    about: string | null,
    experience?: ExperienceItem[],
    education?: EducationItem[],
    linkedinUrl?: string
): string {
    const parts: string[] = [];
    
    parts.push(`📋 LinkedIn Profile Import`);
    parts.push(`—`);
    
    if (headline) {
        parts.push(`${headline}`);
    }
    
    if (location) {
        parts.push(`📍 ${location}`);
    }
    
    if (about) {
        parts.push(``);
        parts.push(`About:`);
        parts.push(about);
    }
    
    if (experience && experience.length > 0) {
        parts.push(``);
        parts.push(`Experience:`);
        experience.forEach((exp) => {
            if (exp.title && exp.company) {
                parts.push(`• ${exp.title} at ${exp.company}${exp.dates ? ` (${exp.dates})` : ''}`);
            } else if (exp.title || exp.company) {
                parts.push(`• ${exp.title || exp.company}${exp.dates ? ` (${exp.dates})` : ''}`);
            }
        });
    }
    
    if (education && education.length > 0) {
        parts.push(``);
        parts.push(`Education:`);
        education.forEach((edu) => {
            if (edu.school) {
                parts.push(`• ${edu.school}${edu.degree ? ` - ${edu.degree}` : ''}`);
            }
        });
    }
    
    if (linkedinUrl) {
        parts.push(``);
        parts.push(linkedinUrl);
    }
    
    return parts.join('\n');
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
        const filename = `${userId}/${contactId}/linkedin_profile.${ext}`;

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
