import { buildPrivateMediaUrl, extractStoragePath } from "@/lib/storage-urls";
import { badRequest, serverError, type ServerSupabaseClient } from "@/server/api/route";

const allowedImageTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];

function imageExtension(type: string) {
    if (type === "image/png") return "png";
    if (type === "image/webp") return "webp";
    if (type === "image/gif") return "gif";
    return "jpg";
}

async function uploadComplimentImage(
    supabase: ServerSupabaseClient,
    userId: string,
    imageFile: File
) {
    if (!allowedImageTypes.includes(imageFile.type)) {
        badRequest("Invalid image type");
    }

    if (imageFile.size > 5 * 1024 * 1024) {
        badRequest("Image must be under 5MB");
    }

    const buffer = Buffer.from(await imageFile.arrayBuffer());
    const filename = `${userId}/compliments/${Date.now()}.${imageExtension(imageFile.type)}`;
    const { error } = await supabase.storage
        .from("contact-images")
        .upload(filename, buffer, {
            contentType: imageFile.type,
            upsert: false,
        });

    if (error) {
        console.error("Error uploading compliment image:", error);
        serverError("Failed to upload image");
    }

    return buildPrivateMediaUrl("contact-images", filename);
}

export async function listStandaloneCompliments(supabase: ServerSupabaseClient, userId: string) {
    const { data, error } = await supabase
        .from("people_compliments")
        .select("id, compliment, context, source_name, image_url, received_at, created_at")
        .eq("user_id", userId)
        .is("people_id", null)
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Error fetching standalone compliments:", error);
        serverError("Failed to fetch compliments");
    }

    return data || [];
}

export async function createCompliment(
    supabase: ServerSupabaseClient,
    userId: string,
    input: {
        peopleId: number | null;
        compliment: string | null;
        context: string | null;
        receivedAt: string | null;
        sourceName: string | null;
        imageFile?: File | null;
    }
) {
    if (!input.compliment?.trim() && !input.imageFile) {
        badRequest("A compliment or screenshot is required");
    }

    const imageUrl = input.imageFile
        ? await uploadComplimentImage(supabase, userId, input.imageFile)
        : null;

    const { data, error } = await supabase
        .from("people_compliments")
        .insert({
            user_id: userId,
            people_id: input.peopleId,
            compliment: input.compliment?.trim() || null,
            context: input.context?.trim() || null,
            received_at: input.receivedAt || null,
            source_name: input.sourceName?.trim() || null,
            image_url: imageUrl,
        })
        .select()
        .single();

    if (error) {
        console.error("Error adding compliment:", error);
        serverError("Failed to add compliment");
    }

    return data;
}

export async function updateCompliment(
    supabase: ServerSupabaseClient,
    userId: string,
    input: {
        complimentId: number;
        compliment?: string;
        context?: string | null;
        receivedAt?: string | null;
        sourceName?: string | null;
    }
) {
    const updates: {
        compliment?: string;
        context?: string | null;
        received_at?: string | null;
        source_name?: string | null;
    } = {};

    if (input.compliment !== undefined) {
        if (!input.compliment.trim()) {
            badRequest("compliment cannot be empty");
        }
        updates.compliment = input.compliment.trim();
    }

    if (input.context !== undefined) {
        updates.context = input.context?.trim() || null;
    }
    if (input.receivedAt !== undefined) {
        updates.received_at = input.receivedAt || null;
    }
    if (input.sourceName !== undefined) {
        updates.source_name = input.sourceName?.trim() || null;
    }

    if (Object.keys(updates).length === 0) {
        badRequest("No updates provided");
    }

    const { data, error } = await supabase
        .from("people_compliments")
        .update(updates)
        .eq("id", input.complimentId)
        .eq("user_id", userId)
        .select()
        .single();

    if (error) {
        console.error("Error updating compliment:", error);
        serverError("Failed to update compliment");
    }

    return data;
}

export async function deleteCompliment(
    supabase: ServerSupabaseClient,
    userId: string,
    complimentId: number
) {
    const { data: existing } = await supabase
        .from("people_compliments")
        .select("image_url")
        .eq("id", complimentId)
        .eq("user_id", userId)
        .single();

    const { error } = await supabase
        .from("people_compliments")
        .delete()
        .eq("id", complimentId)
        .eq("user_id", userId);

    if (error) {
        console.error("Error deleting compliment:", error);
        serverError("Failed to delete compliment");
    }

    if (existing?.image_url) {
        try {
            const storagePath = extractStoragePath(existing.image_url, "contact-images");
            if (storagePath) {
                await supabase.storage.from("contact-images").remove([storagePath]);
            }
        } catch {
            // Non-critical cleanup failure.
        }
    }
}
