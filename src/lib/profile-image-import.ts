import type { SupabaseClient } from "@supabase/supabase-js";
import { buildPrivateMediaUrl } from "@/lib/storage-urls";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

function getImageType(contentType: string | null, bytes: Uint8Array) {
    const type = contentType?.split(";")[0].trim().toLowerCase() || "";

    if (["image/jpeg", "image/png", "image/webp", "image/gif"].includes(type)) {
        return type;
    }

    if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
    if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return "image/png";
    if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) return "image/gif";
    if (
        bytes[0] === 0x52 &&
        bytes[1] === 0x49 &&
        bytes[2] === 0x46 &&
        bytes[3] === 0x46 &&
        bytes[8] === 0x57 &&
        bytes[9] === 0x45 &&
        bytes[10] === 0x42 &&
        bytes[11] === 0x50
    ) {
        return "image/webp";
    }

    return null;
}

function extensionForType(type: string) {
    switch (type) {
        case "image/png":
            return "png";
        case "image/webp":
            return "webp";
        case "image/gif":
            return "gif";
        default:
            return "jpg";
    }
}

function getImageCandidates(imageUrl: string) {
    const candidates = new Set([imageUrl]);

    if (imageUrl.includes("pbs.twimg.com/profile_images")) {
        [
            ["_400x400.", "_normal."],
            ["_400x400.", "_bigger."],
            ["_400x400.", "."],
            ["_normal.", "_400x400."],
            ["_bigger.", "_400x400."],
            ["_mini.", "_400x400."],
            ["_x96.", "_400x400."],
            ["_200x200.", "_400x400."],
            ["name=400x400", "name=normal"],
            ["name=400x400", "name=bigger"],
            ["name=400x400", "name=large"],
            ["name=small", "name=400x400"],
            ["name=normal", "name=400x400"],
            ["name=bigger", "name=400x400"],
        ].forEach(([from, to]) => {
            if (imageUrl.includes(from)) {
                candidates.add(imageUrl.replace(from, to));
            }
        });
    }

    return [...candidates];
}

export async function downloadAndStoreContactProfileImage(
    supabase: SupabaseClient,
    userId: string,
    peopleId: number,
    imageUrl: string | null | undefined,
    source: "x" | "linkedin" | "profile" = "profile"
) {
    if (!imageUrl) return null;
    if (imageUrl.startsWith("/api/media/")) return imageUrl;

    for (const candidateUrl of getImageCandidates(imageUrl)) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);

        try {
            const response = await fetch(candidateUrl, {
                signal: controller.signal,
                headers: {
                    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
                    Accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
                },
            });

            if (!response.ok) {
                console.error(`[Profile Image Import] Failed to fetch image: ${response.status}`);
                continue;
            }

            const arrayBuffer = await response.arrayBuffer();
            if (arrayBuffer.byteLength === 0 || arrayBuffer.byteLength > MAX_IMAGE_BYTES) {
                console.error("[Profile Image Import] Image size is invalid");
                continue;
            }

            const bytes = new Uint8Array(arrayBuffer);
            const contentType = getImageType(response.headers.get("content-type"), bytes);
            if (!contentType) {
                console.error("[Profile Image Import] Response was not a supported image");
                continue;
            }

            const filename = `${userId}/${peopleId}/${source}_profile.${extensionForType(contentType)}`;
            const { error } = await supabase.storage
                .from("contact-images")
                .upload(filename, bytes, {
                    contentType,
                    upsert: true,
                });

            if (error) {
                console.error("[Profile Image Import] Upload error:", error);
                return null;
            }

            return buildPrivateMediaUrl("contact-images", filename);
        } catch (error) {
            console.error("[Profile Image Import] Error:", error);
        } finally {
            clearTimeout(timeout);
        }
    }

    return null;
}
