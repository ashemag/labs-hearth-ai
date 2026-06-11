import { buildPrivateMediaUrl, normalizePrivateMediaUrl } from "@/lib/storage-urls";
import { badRequest, serverError, type ServerSupabaseClient } from "@/server/api/route";

const allowedAvatarTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const maxAvatarSize = 5 * 1024 * 1024;

export async function getUserProfile(supabase: ServerSupabaseClient, userId: string) {
    const { data: profile, error } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("id", userId)
        .single();

    if (error && error.code !== "PGRST116") {
        console.error("Error fetching profile:", error);
        serverError("Failed to fetch profile");
    }

    return {
        profile: profile ? {
            ...profile,
            avatar_url: normalizePrivateMediaUrl(profile.avatar_url, "user-avatars"),
        } : null,
    };
}

export async function uploadUserAvatar(
    supabase: ServerSupabaseClient,
    userId: string,
    file: File | null
) {
    if (!file) {
        badRequest("No file provided");
    }

    if (!allowedAvatarTypes.includes(file.type)) {
        badRequest("Invalid file type. Please upload a JPEG, PNG, WebP, or GIF.");
    }

    if (file.size > maxAvatarSize) {
        badRequest("File too large. Maximum size is 5MB.");
    }

    const ext = file.name.split(".").pop() || "jpg";
    const filename = `${userId}/avatar.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadError } = await supabase.storage
        .from("user-avatars")
        .upload(filename, buffer, {
            contentType: file.type,
            upsert: true,
        });

    if (uploadError) {
        console.error("Error uploading file:", uploadError);
        serverError("Failed to upload image");
    }

    const avatarUrl = buildPrivateMediaUrl("user-avatars", filename);

    const { error: upsertError } = await supabase
        .from("user_profiles")
        .upsert({
            id: userId,
            avatar_url: avatarUrl,
            updated_at: new Date().toISOString(),
        }, {
            onConflict: "id",
        });

    if (upsertError) {
        console.error("Error updating profile:", upsertError);
        serverError("Failed to update profile");
    }

    return { avatarUrl };
}

export async function updateUserProfile(
    supabase: ServerSupabaseClient,
    userId: string,
    input: Record<string, unknown>
) {
    const updateData: Record<string, unknown> = {
        id: userId,
        updated_at: new Date().toISOString(),
    };

    if (input.display_name !== undefined) {
        updateData.display_name = input.display_name;
    }

    if (input.linked_emails !== undefined) {
        if (!Array.isArray(input.linked_emails)) {
            badRequest("linked_emails must be an array");
        }

        updateData.linked_emails = [...new Set(
            input.linked_emails
                .filter((email): email is string => typeof email === "string")
                .map((email) => email.toLowerCase().trim())
                .filter(Boolean)
        )];
    }

    const { error } = await supabase
        .from("user_profiles")
        .upsert(updateData, {
            onConflict: "id",
        });

    if (error) {
        console.error("Error updating profile:", error);
        serverError("Failed to update profile");
    }

    return { success: true };
}
