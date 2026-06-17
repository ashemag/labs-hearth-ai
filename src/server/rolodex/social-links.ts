import type { SupabaseClient } from "@supabase/supabase-js";
import { fetchLinkedInProfile, extractLinkedInUsername } from "@/lib/linkedin";
import { normalizeLocation } from "@/lib/location/normalize";
import { downloadAndStoreContactProfileImage } from "@/lib/profile-image-import";
import { ApiError, badRequest, serverError, type ServerSupabaseClient } from "@/server/api/route";
import { sanitizeXBio } from "@/server/rolodex/x-profile";

const nitterInstances = [
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

function normalizeLinkedInUrl(input: string) {
    let cleanUrl = input.trim();

    if (!cleanUrl.includes("linkedin.com")) {
        cleanUrl = `https://www.linkedin.com/in/${cleanUrl.replace(/^\/+/, "")}`;
    } else if (!cleanUrl.startsWith("http")) {
        cleanUrl = `https://${cleanUrl}`;
    }

    if (!cleanUrl.match(/linkedin\.com\/(in|company)\/[a-zA-Z0-9_-]+/)) {
        badRequest("Invalid LinkedIn URL format");
    }

    return cleanUrl;
}

function normalizeXHandle(input: string) {
    let cleanHandle = input.trim();

    if (cleanHandle.includes("x.com/") || cleanHandle.includes("twitter.com/")) {
        const match = cleanHandle.match(/(?:x\.com|twitter\.com)\/([a-zA-Z0-9_]+)/);
        if (match) {
            cleanHandle = match[1];
        }
    }

    cleanHandle = cleanHandle.replace(/^@/, "");

    if (!/^[a-zA-Z0-9_]{1,15}$/.test(cleanHandle)) {
        badRequest("Invalid X handle format");
    }

    return cleanHandle;
}

async function assertOwnedContact(
    supabase: ServerSupabaseClient,
    userId: string,
    peopleId: number
) {
    const { data: person, error } = await supabase
        .from("people")
        .select("id, name, custom_profile_image_url")
        .eq("id", peopleId)
        .eq("user_id", userId)
        .single();

    if (error || !person) {
        throw new ApiError("Contact not found", 404);
    }

    return person;
}

export async function linkLinkedInProfile(
    supabase: ServerSupabaseClient,
    userId: string,
    input: { peopleId: number; linkedInUrl: string }
) {
    const cleanUrl = normalizeLinkedInUrl(input.linkedInUrl);
    await assertOwnedContact(supabase, userId, input.peopleId);

    console.log(`[LinkedIn] Enriching profile for contact ${input.peopleId}: ${cleanUrl}`);
    const profileData = await fetchLinkedInProfile(cleanUrl);
    const username = extractLinkedInUsername(cleanUrl);

    console.log("[LinkedIn] Enrichment result:", {
        username,
        hasName: !!profileData?.fullName,
        hasHeadline: !!profileData?.headline,
        hasLocation: !!profileData?.location,
        hasImage: !!profileData?.profileImageUrl,
    });

    await supabase
        .from("people_linkedin_profiles")
        .delete()
        .eq("people_id", input.peopleId)
        .eq("user_id", userId);

    const { data: linkedinProfile, error } = await supabase
        .from("people_linkedin_profiles")
        .insert({
            user_id: userId,
            people_id: input.peopleId,
            linkedin_url: profileData?.linkedinUrl || cleanUrl,
            profile_image_url: profileData?.profileImageUrl || null,
            headline: profileData?.headline || null,
            location: normalizeLocation(profileData?.location),
        })
        .select()
        .single();

    if (error) {
        console.error("Error creating LinkedIn profile:", error);
        serverError("Failed to link LinkedIn profile");
    }

    console.log(`Linked LinkedIn profile to contact ${input.peopleId}`, {
        hasAvatar: !!profileData?.profileImageUrl,
        hasHeadline: !!profileData?.headline,
        hasLocation: !!profileData?.location,
    });

    return {
        linkedin_url: linkedinProfile.linkedin_url,
        profile_image_url: linkedinProfile.profile_image_url,
        headline: linkedinProfile.headline,
        location: linkedinProfile.location,
    };
}

export async function unlinkLinkedInProfile(
    supabase: ServerSupabaseClient,
    userId: string,
    peopleId: number
) {
    const { error } = await supabase
        .from("people_linkedin_profiles")
        .delete()
        .eq("people_id", peopleId)
        .eq("user_id", userId);

    if (error) {
        console.error("Error deleting LinkedIn profile:", error);
        serverError("Failed to unlink LinkedIn profile");
    }

    console.log(`Unlinked LinkedIn profile from contact ${peopleId}`);
}

async function fetchFromNitter(username: string): Promise<Partial<XProfileData> | null> {
    for (const instance of nitterInstances) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);

            const response = await fetch(`https://${instance}/${username}`, {
                signal: controller.signal,
                headers: {
                    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
                    Accept: "text/html",
                },
            });

            clearTimeout(timeoutId);

            if (!response.ok) continue;

            const html = await response.text();
            const displayNameMatch = html.match(/<a[^>]*class="profile-card-fullname"[^>]*>([^<]+)<\/a>/);
            const bioMatch = html.match(/<div[^>]*class="profile-bio"[^>]*>([^<]*(?:<[^>]*>[^<]*)*)<\/div>/);
            const locationMatch = html.match(/<span[^>]*class="profile-location"[^>]*>([^<]+)<\/span>/);
            const websiteMatch = html.match(/<a[^>]*class="profile-website"[^>]*href="([^"]+)"/);
            const avatarMatch = html.match(/<a[^>]*class="profile-card-avatar"[^>]*href="([^"]+)"/);
            const followingMatch = html.match(/<span[^>]*class="profile-stat-num"[^>]*>([0-9,]+)<\/span>\s*<span[^>]*class="profile-stat-header"[^>]*>Following/);
            const followersMatch = html.match(/<span[^>]*class="profile-stat-num"[^>]*>([0-9,]+)<\/span>\s*<span[^>]*class="profile-stat-header"[^>]*>Followers/);

            let bio = bioMatch?.[1] || null;
            if (bio) {
                bio = bio.replace(/<[^>]*>/g, "").trim();
                bio = bio.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, "\"");
            }

            const parseCount = (str: string | undefined): number | null => {
                if (!str) return null;
                const num = parseInt(str.replace(/,/g, ""), 10);
                return Number.isNaN(num) ? null : num;
            };

            let avatarUrl = avatarMatch?.[1] || null;
            if (avatarUrl && !avatarUrl.startsWith("http")) {
                avatarUrl = `https://${instance}${avatarUrl}`;
            }

            console.log(`Fetched profile data from ${instance} for @${username}`);

            return {
                display_name: displayNameMatch?.[1]?.trim() || null,
                bio,
                location: locationMatch?.[1]?.trim() || null,
                website_url: websiteMatch?.[1] || null,
                profile_image_url: avatarUrl,
                followers_count: parseCount(followersMatch?.[1]),
                following_count: parseCount(followingMatch?.[1]),
            };
        } catch {
            console.log(`Nitter instance ${instance} failed, trying next...`);
        }
    }

    return null;
}

async function getAvatarUrl(username: string): Promise<string | null> {
    try {
        const avatarUrl = `https://unavatar.io/twitter/${username}`;
        const response = await fetch(avatarUrl, { method: "HEAD" });
        if (response.ok) {
            return avatarUrl;
        }
    } catch {
        // Ignore fallback errors.
    }

    return null;
}

export async function linkXProfile(
    supabase: ServerSupabaseClient,
    userId: string,
    input: { peopleId: number; handle: string }
) {
    const cleanHandle = normalizeXHandle(input.handle);
    const person = await assertOwnedContact(supabase, userId, input.peopleId);

    console.log(`Fetching X profile data for @${cleanHandle}...`);

    let profileData: Partial<XProfileData> = {};
    const nitterData = await fetchFromNitter(cleanHandle);
    if (nitterData) {
        profileData = { ...nitterData };
    }

    if (!profileData.profile_image_url) {
        const avatarUrl = await getAvatarUrl(cleanHandle);
        if (avatarUrl) {
            profileData.profile_image_url = avatarUrl;
        }
    }

    const uploadedImageUrl = await downloadAndStoreContactProfileImage(
        supabase as SupabaseClient,
        userId,
        person.id,
        profileData.profile_image_url,
        "x"
    );

    if (uploadedImageUrl) {
        profileData.profile_image_url = uploadedImageUrl;

        if (!person.custom_profile_image_url) {
            await supabase
                .from("people")
                .update({ custom_profile_image_url: uploadedImageUrl })
                .eq("id", input.peopleId)
                .eq("user_id", userId);
        }
    }

    const { data: existingProfile } = await supabase
        .from("people_x_profiles")
        .select("id")
        .eq("people_id", input.peopleId)
        .eq("user_id", userId)
        .single();

    const profilePayload = {
        username: cleanHandle.toLowerCase(),
        display_name: profileData.display_name || cleanHandle,
        bio: sanitizeXBio(profileData.bio, profileData.location),
        profile_image_url: profileData.profile_image_url || null,
        location: normalizeLocation(profileData.location),
        website_url: profileData.website_url || null,
        followers_count: profileData.followers_count || null,
        following_count: profileData.following_count || null,
        verified: profileData.verified || false,
        last_synced_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    };

    const result = existingProfile
        ? await supabase
            .from("people_x_profiles")
            .update(profilePayload)
            .eq("id", existingProfile.id)
            .select()
            .single()
        : await supabase
            .from("people_x_profiles")
            .insert({
                user_id: userId,
                people_id: input.peopleId,
                x_user_id: `manual_${cleanHandle.toLowerCase()}_${Date.now()}`,
                ...profilePayload,
            })
            .select()
            .single();

    if (result.error) {
        console.error(existingProfile ? "Error updating X profile:" : "Error creating X profile:", result.error);
        serverError(existingProfile ? "Failed to update X profile" : "Failed to link X profile");
    }

    const xProfile = result.data;
    console.log(`Linked X profile @${cleanHandle} to contact ${input.peopleId}`, {
        hasDisplayName: !!profileData.display_name,
        hasBio: !!profileData.bio,
        hasAvatar: !!profileData.profile_image_url,
        storedAvatar: !!uploadedImageUrl,
    });

    return {
        custom_profile_image_url: uploadedImageUrl || person.custom_profile_image_url || null,
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
        },
    };
}

export async function unlinkXProfile(
    supabase: ServerSupabaseClient,
    userId: string,
    peopleId: number
) {
    const { error } = await supabase
        .from("people_x_profiles")
        .delete()
        .eq("people_id", peopleId)
        .eq("user_id", userId);

    if (error) {
        console.error("Error deleting X profile:", error);
        serverError("Failed to unlink X profile");
    }

    console.log(`Unlinked X profile from contact ${peopleId}`);
}
