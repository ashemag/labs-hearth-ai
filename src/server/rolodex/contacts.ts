import type { SupabaseClient } from "@supabase/supabase-js";
import { isLinkedInUrl, fetchLinkedInProfile } from "@/lib/linkedin";
import { isXHandle, extractXUsername, fetchXProfile } from "@/lib/x";
import { normalizeLocation } from "@/lib/location/normalize";
import { downloadAndStoreContactProfileImage } from "@/lib/profile-image-import";
import { buildPrivateMediaUrl, normalizePrivateMediaUrl } from "@/lib/storage-urls";
import { ApiError, badRequest, serverError, type ServerSupabaseClient } from "@/server/api/route";

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
        type: "phone" | "email";
        value: string;
        created_at: string;
    }[];
}

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
    people_x_profiles?: {
        username: string;
        display_name: string | null;
        bio: string | null;
        profile_image_url: string | null;
        followers_count: number | null;
        following_count: number | null;
        verified: boolean;
        website_url: string | null;
        location: string | null;
    }[];
    people_linkedin_profiles?: {
        linkedin_url: string;
        profile_image_url: string | null;
        headline: string | null;
        location: string | null;
    }[];
    people_notes?: { id: number; note: string; created_at: string; source_type: string | null }[];
    people_touchpoints?: { id: number; created_at: string }[];
    people_websites?: { id: number; url: string; created_at: string }[];
    people_compliments?: {
        id: number;
        compliment: string;
        context: string | null;
        received_at: string | null;
        created_at: string;
    }[];
    people_contact_info?: { id: number; type: "phone" | "email"; value: string; created_at: string }[];
}

function emptyContact(person: { id: number; name: string; created_at: string }): RolodexContact {
    return {
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
}

function toContact(person: PersonRecord): RolodexContact {
    const xProfile = person.people_x_profiles?.[0] || null;
    const linkedInProfile = person.people_linkedin_profiles?.[0] || null;

    return {
        id: person.id,
        name: person.name,
        created_at: person.created_at,
        custom_profile_image_url: normalizePrivateMediaUrl(person.custom_profile_image_url, "contact-images"),
        custom_bio: person.custom_bio || null,
        custom_location: person.custom_location || null,
        website_url: person.website_url || null,
        hidden: person.hidden || false,
        last_touchpoint: person.last_touchpoint || null,
        x_profile: xProfile ? {
            ...xProfile,
            profile_image_url: normalizePrivateMediaUrl(xProfile.profile_image_url, "contact-images"),
        } : null,
        linkedin_profile: linkedInProfile ? {
            ...linkedInProfile,
            profile_image_url: normalizePrivateMediaUrl(linkedInProfile.profile_image_url, "contact-images"),
        } : null,
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
    };
}

function duplicateContact(contactId: number): never {
    throw new ApiError("Contact already exists", 409, {
        error: "Contact already exists",
        existing: true,
        contact_id: contactId,
    });
}

export async function listContacts(
    supabase: ServerSupabaseClient,
    userId: string,
    input: { limit: number; offset: number }
) {
    const { data: people, error } = await supabase
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
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .range(input.offset, input.offset + input.limit - 1);

    if (error) {
        console.error("Error fetching people:", error);
        serverError("Failed to fetch contacts");
    }

    return ((people || []) as PersonRecord[]).map(toContact);
}

export async function createContact(
    supabase: ServerSupabaseClient,
    userId: string,
    input: { handle?: string; name?: string }
) {
    if (input.name && !input.handle) {
        return createNameOnlyContact(supabase, userId, input.name.trim());
    }

    if (!input.handle) {
        badRequest("Name or social profile is required");
    }

    const handle = input.handle.trim();

    if (isLinkedInUrl(handle)) {
        return createLinkedInContact(supabase, userId, handle);
    }

    if (isXHandle(handle)) {
        return createXContact(supabase, userId, handle);
    }

    return createNameOnlyContact(supabase, userId, handle);
}

async function createNameOnlyContact(
    supabase: ServerSupabaseClient,
    userId: string,
    name: string
) {
    const { data: person, error } = await supabase
        .from("people")
        .insert({
            user_id: userId,
            name,
        })
        .select()
        .single();

    if (error) {
        console.error("Error creating person:", error);
        serverError("Failed to create contact");
    }

    console.log(`Created contact: ${name}`);
    return emptyContact(person);
}

async function createLinkedInContact(
    supabase: ServerSupabaseClient,
    userId: string,
    linkedinUrl: string
) {
    const normalizedUrl = linkedinUrl.toLowerCase().replace(/\/$/, "");
    const usernameMatch = normalizedUrl.match(/linkedin\.com\/in\/([a-zA-Z0-9\-_]+)/i);
    const username = usernameMatch ? usernameMatch[1] : null;

    if (username) {
        const { data: existingProfile } = await supabase
            .from("people_linkedin_profiles")
            .select("people_id")
            .eq("user_id", userId)
            .ilike("linkedin_url", `%/in/${username}%`)
            .single();

        if (existingProfile) {
            duplicateContact(existingProfile.people_id);
        }
    }

    console.log(`[LinkedIn] Fetching profile for new contact: ${linkedinUrl}`);
    const linkedInProfile = await fetchLinkedInProfile(linkedinUrl);

    if (!linkedInProfile) {
        throw new ApiError("Could not fetch LinkedIn profile. Please try again.", 404);
    }

    const { data: person, error: personError } = await supabase
        .from("people")
        .insert({
            user_id: userId,
            name: linkedInProfile.fullName,
        })
        .select()
        .single();

    if (personError) {
        console.error("Error creating person:", personError);
        serverError("Failed to create contact");
    }

    const normalizedLocation = normalizeLocation(linkedInProfile.location);
    const { error: profileError } = await supabase
        .from("people_linkedin_profiles")
        .insert({
            user_id: userId,
            people_id: person.id,
            linkedin_url: linkedInProfile.linkedinUrl,
            profile_image_url: linkedInProfile.profileImageUrl,
            headline: linkedInProfile.headline,
            location: normalizedLocation,
        });

    if (profileError) {
        console.error("Error creating LinkedIn profile:", profileError);
        await supabase.from("people").delete().eq("id", person.id);
        serverError("Failed to link LinkedIn profile");
    }

    console.log(`Imported LinkedIn profile for ${linkedInProfile.fullName}`, {
        hasImage: !!linkedInProfile.profileImageUrl,
        hasHeadline: !!linkedInProfile.headline,
    });

    return {
        ...emptyContact(person),
        linkedin_profile: {
            linkedin_url: linkedInProfile.linkedinUrl,
            profile_image_url: linkedInProfile.profileImageUrl,
            headline: linkedInProfile.headline,
            location: normalizedLocation,
        },
    };
}

async function createXContact(
    supabase: ServerSupabaseClient,
    userId: string,
    handle: string
) {
    const username = extractXUsername(handle);

    if (!username) {
        badRequest("Invalid X handle or URL");
    }

    const { data: existingProfile } = await supabase
        .from("people_x_profiles")
        .select("people_id")
        .eq("user_id", userId)
        .ilike("username", username)
        .single();

    if (existingProfile) {
        duplicateContact(existingProfile.people_id);
    }

    console.log(`[X] Fetching profile for new contact: @${username}`);
    const xProfile = await fetchXProfile(handle);

    if (!xProfile) {
        throw new ApiError("Could not fetch X profile. Please try again.", 404);
    }

    const { data: person, error: personError } = await supabase
        .from("people")
        .insert({
            user_id: userId,
            name: xProfile.displayName,
        })
        .select()
        .single();

    if (personError) {
        console.error("Error creating person:", personError);
        serverError("Failed to create contact");
    }

    const uploadedImageUrl = await downloadAndStoreContactProfileImage(
        supabase as SupabaseClient,
        userId,
        person.id,
        xProfile.profileImageUrl,
        "x"
    );

    if (uploadedImageUrl) {
        await supabase
            .from("people")
            .update({ custom_profile_image_url: uploadedImageUrl })
            .eq("id", person.id)
            .eq("user_id", userId);
    }

    const normalizedLocation = normalizeLocation(xProfile.location);
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
            profile_image_url: uploadedImageUrl || xProfile.profileImageUrl,
            location: normalizedLocation,
            last_synced_at: new Date().toISOString(),
        });

    if (profileError) {
        console.error("Error creating X profile:", profileError);
        await supabase.from("people").delete().eq("id", person.id);
        serverError("Failed to link X profile");
    }

    console.log(`Imported X profile for @${xProfile.username}`, {
        displayName: xProfile.displayName,
        hasBio: !!xProfile.bio,
        hasLocation: !!xProfile.location,
        hasAvatar: !!uploadedImageUrl || !!xProfile.profileImageUrl,
        storedAvatar: !!uploadedImageUrl,
    });

    return {
        ...emptyContact(person),
        custom_profile_image_url: uploadedImageUrl || null,
        x_profile: {
            username: xProfile.username,
            display_name: xProfile.displayName,
            bio: xProfile.bio,
            profile_image_url: uploadedImageUrl || xProfile.profileImageUrl,
            followers_count: null,
            following_count: null,
            verified: false,
            website_url: null,
            location: normalizedLocation,
        },
    };
}

export async function deleteContact(
    supabase: ServerSupabaseClient,
    userId: string,
    contactId: number
) {
    const { error } = await supabase
        .from("people")
        .delete()
        .eq("id", contactId)
        .eq("user_id", userId);

    if (error) {
        console.error("Error deleting contact:", error);
        serverError("Failed to delete contact");
    }

    console.log(`Deleted contact ${contactId}`);
}

export async function updateContact(
    supabase: ServerSupabaseClient,
    userId: string,
    input: {
        peopleId: number;
        name?: string;
        hidden?: boolean;
        customBio?: string | null;
        websiteUrl?: string | null;
        customLocation?: string | null;
        lastTouchpoint?: string | null;
    }
) {
    const updateData: {
        name?: string;
        hidden?: boolean;
        custom_bio?: string | null;
        website_url?: string | null;
        custom_location?: string | null;
        last_touchpoint?: string | null;
    } = {};

    if (input.name !== undefined) {
        updateData.name = input.name;
    }

    if (input.hidden !== undefined) {
        updateData.hidden = input.hidden;
    }

    if (input.customBio !== undefined) {
        updateData.custom_bio = input.customBio?.trim() || null;
    }

    if (input.websiteUrl !== undefined) {
        updateData.website_url = input.websiteUrl?.trim() || null;
    }

    if (input.customLocation !== undefined) {
        updateData.custom_location = normalizeLocation(input.customLocation);
    }

    if (input.lastTouchpoint !== undefined) {
        updateData.last_touchpoint = input.lastTouchpoint || null;

        if (input.lastTouchpoint) {
            await supabase
                .from("people_touchpoints")
                .insert({
                    user_id: userId,
                    people_id: input.peopleId,
                    created_at: input.lastTouchpoint,
                });
        }
    }

    if (Object.keys(updateData).length === 0) {
        badRequest("No fields to update");
    }

    const { data, error } = await supabase
        .from("people")
        .update(updateData)
        .eq("id", input.peopleId)
        .eq("user_id", userId)
        .select()
        .single();

    if (error) {
        console.error("Error updating person:", error);
        serverError("Failed to update contact");
    }

    return data;
}

export async function checkContactExists(
    supabase: ServerSupabaseClient,
    userId: string,
    input: { name?: string | null; linkedinUrl?: string | null; xUsername?: string | null }
) {
    if (!input.name && !input.linkedinUrl && !input.xUsername) {
        return { exists: false };
    }

    if (input.xUsername) {
        const cleanUsername = input.xUsername.replace(/^@/, "").toLowerCase();
        const { data: existingXProfile } = await supabase
            .from("people_x_profiles")
            .select("people_id")
            .eq("user_id", userId)
            .ilike("username", cleanUsername)
            .single();

        if (existingXProfile) {
            return {
                exists: true,
                contactId: existingXProfile.people_id,
                matchedBy: "x",
            };
        }
    }

    if (input.linkedinUrl) {
        const match = input.linkedinUrl.match(/linkedin\.com\/in\/([a-zA-Z0-9\-_]+)/i);
        const linkedinUsername = match ? match[1].toLowerCase() : null;

        if (linkedinUsername) {
            const { data: existingProfile } = await supabase
                .from("people_linkedin_profiles")
                .select("people_id")
                .eq("user_id", userId)
                .ilike("linkedin_url", `%/in/${linkedinUsername}%`)
                .single();

            if (existingProfile) {
                return {
                    exists: true,
                    contactId: existingProfile.people_id,
                    matchedBy: "linkedin",
                };
            }
        }
    }

    if (input.name) {
        const { data: existingPerson } = await supabase
            .from("people")
            .select("id")
            .eq("user_id", userId)
            .ilike("name", input.name.trim())
            .single();

        if (existingPerson) {
            return {
                exists: true,
                contactId: existingPerson.id,
                matchedBy: "name",
            };
        }
    }

    return { exists: false };
}

const allowedProfileImageTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export async function uploadContactProfileImage(
    supabase: ServerSupabaseClient,
    userId: string,
    input: { contactId: number; file: File }
) {
    if (!allowedProfileImageTypes.includes(input.file.type)) {
        badRequest("Invalid file type. Please upload a JPEG, PNG, WebP, or GIF.");
    }

    if (input.file.size > 5 * 1024 * 1024) {
        badRequest("File too large. Maximum size is 5MB.");
    }

    const { data: contact, error: contactError } = await supabase
        .from("people")
        .select("id")
        .eq("id", input.contactId)
        .eq("user_id", userId)
        .single();

    if (contactError || !contact) {
        throw new ApiError("Contact not found", 404);
    }

    const ext = input.file.name.split(".").pop() || "jpg";
    const filename = `${userId}/${input.contactId}/profile.${ext}`;
    const buffer = Buffer.from(await input.file.arrayBuffer());

    const { error: uploadError } = await supabase.storage
        .from("contact-images")
        .upload(filename, buffer, {
            contentType: input.file.type,
            upsert: true,
        });

    if (uploadError) {
        console.error("Error uploading file:", uploadError);
        serverError("Failed to upload image");
    }

    const imageUrl = buildPrivateMediaUrl("contact-images", filename);
    const { error: updateError } = await supabase
        .from("people")
        .update({
            custom_profile_image_url: imageUrl,
            updated_at: new Date().toISOString(),
        })
        .eq("id", input.contactId)
        .eq("user_id", userId);

    if (updateError) {
        console.error("Error updating contact:", updateError);
        serverError("Failed to update contact");
    }

    console.log(`Uploaded profile image for contact ${input.contactId}`);
    return imageUrl;
}

export async function removeContactProfileImage(
    supabase: ServerSupabaseClient,
    userId: string,
    contactId: number
) {
    const { error: updateError } = await supabase
        .from("people")
        .update({
            custom_profile_image_url: null,
            updated_at: new Date().toISOString(),
        })
        .eq("id", contactId)
        .eq("user_id", userId);

    if (updateError) {
        console.error("Error updating contact:", updateError);
        serverError("Failed to update contact");
    }

    const extensions = ["jpg", "jpeg", "png", "webp", "gif"];
    for (const ext of extensions) {
        await supabase.storage
            .from("contact-images")
            .remove([`${userId}/${contactId}/profile.${ext}`]);
    }

    console.log(`Removed profile image for contact ${contactId}`);
}
