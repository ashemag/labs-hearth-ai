import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildPrivateMediaUrl } from "@/lib/storage-urls";

// GET - Fetch unmatched iMessage handles (grouped by handle_id)
export async function GET() {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        // Get all messages where people_id is null, grouped by handle_id
        const { data: messages, error } = await supabase
            .from("people_imessages")
            .select("handle_id, contact_name, message_date")
            .eq("user_id", user.id)
            .is("people_id", null);

        if (error) {
            return NextResponse.json({ error: "Failed to fetch unmatched messages" }, { status: 500 });
        }

        // Group by handle_id, count messages, and track most recent message
        const handleMap = new Map<string, { handle_id: string; contact_name: string | null; message_count: number; last_message_date: string | null }>();
        for (const msg of messages || []) {
            const existing = handleMap.get(msg.handle_id);
            if (existing) {
                existing.message_count++;
                // Prefer non-null contact_name
                if (!existing.contact_name && msg.contact_name) {
                    existing.contact_name = msg.contact_name;
                }
                // Track most recent message
                if (msg.message_date && (!existing.last_message_date || msg.message_date > existing.last_message_date)) {
                    existing.last_message_date = msg.message_date;
                }
            } else {
                handleMap.set(msg.handle_id, {
                    handle_id: msg.handle_id,
                    contact_name: msg.contact_name,
                    message_count: 1,
                    last_message_date: msg.message_date || null,
                });
            }
        }

        const unmatched = Array.from(handleMap.values()).sort((a, b) => {
            // Sort by most recent message first
            if (!a.last_message_date && !b.last_message_date) return 0;
            if (!a.last_message_date) return 1;
            if (!b.last_message_date) return -1;
            return b.last_message_date.localeCompare(a.last_message_date);
        });

        // Look up Apple contact images from storage
        const handleImages: Record<string, string> = {};

        // List all files in the user's handles directory once
        const { data: allHandleFiles } = await supabase.storage
            .from("contact-images")
            .list(`${user.id}/handles`, { limit: 1000 });

        const fileSet = new Set((allHandleFiles || []).map(f => f.name));
        console.log(`[iMessage Unmatched] Found ${fileSet.size} handle image files in storage`);

        for (const item of unmatched) {
            for (const ext of ["jpg", "png"]) {
                const fileName = `${item.handle_id}.${ext}`;
                if (fileSet.has(fileName)) {
                    const fullPath = `${user.id}/handles/${fileName}`;
                    handleImages[item.handle_id] = buildPrivateMediaUrl("contact-images", fullPath);
                    break;
                }
            }
        }

        console.log(`[iMessage Unmatched] Matched ${Object.keys(handleImages).length} of ${unmatched.length} handles to images`);

        return NextResponse.json({ unmatched, handleImages });
    } catch (error) {
        console.error("[iMessage Unmatched] Error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

// Helper: upload base64 image to Supabase Storage and return public URL
async function uploadContactImage(
    supabase: ReturnType<typeof import("@supabase/supabase-js").createClient>,
    userId: string,
    contactId: number,
    imageBase64: string
): Promise<string | null> {
    try {
        // Parse data URI: "data:image/jpeg;base64,/9j/4AAQ..."
        const match = imageBase64.match(/^data:([^;]+);base64,(.+)$/);
        if (!match) return null;

        const mimeType = match[1];
        const base64Data = match[2];
        const ext = mimeType.split("/")[1] === "png" ? "png" : "jpg";
        const buffer = Buffer.from(base64Data, "base64");

        if (buffer.length === 0 || buffer.length > 5 * 1024 * 1024) return null;

        const filename = `${userId}/${contactId}/profile.${ext}`;

        const { error: uploadError } = await supabase.storage
            .from("contact-images")
            .upload(filename, buffer, {
                contentType: mimeType,
                upsert: true,
            });

        if (uploadError) {
            console.error("[iMessage Unmatched] Image upload error:", uploadError);
            return null;
        }

        return buildPrivateMediaUrl("contact-images", filename);
    } catch (err) {
        console.error("[iMessage Unmatched] Image upload exception:", err);
        return null;
    }
}

// Helper: link handle to contact (shared by PATCH and POST)
async function linkHandleToContact(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    supabase: any,
    userId: string,
    handleId: string,
    peopleId: number,
    imageBase64?: string
) {
    // Update all messages with this handle_id to link to the contact
    const { error: updateError, count } = await supabase
        .from("people_imessages")
        .update({ people_id: peopleId })
        .eq("user_id", userId)
        .eq("handle_id", handleId)
        .is("people_id", null);

    if (updateError) {
        throw new Error(updateError.message);
    }

    // Save phone/email to people_contact_info (skip if already linked to another contact)
    const isEmail = handleId.includes("@");
    const type = isEmail ? "email" : "phone";
    const value = isEmail ? handleId.toLowerCase().trim() : handleId.replace(/[^+\d]/g, "");

    // Check if this handle is already linked to a different contact
    const { data: existingInfo } = await supabase
        .from("people_contact_info")
        .select("people_id")
        .eq("user_id", userId)
        .eq("type", type)
        .eq("value", value)
        .neq("people_id", peopleId)
        .limit(1)
        .maybeSingle();

    if (existingInfo) {
        console.log(`[iMessage Unmatched] Handle ${handleId} already linked to contact ${existingInfo.people_id}, skipping duplicate`);
        throw new Error(`This handle is already linked to another contact (ID: ${existingInfo.people_id})`);
    }

    const { error: infoError } = await supabase
        .from("people_contact_info")
        .insert({
            user_id: userId,
            people_id: peopleId,
            type,
            value,
        });

    if (infoError && infoError.code !== "23505") {
        console.error("[iMessage Unmatched] Failed to save contact info:", infoError);
    }

    // Upload Apple contact image if provided (base64) or copy from handle storage
    const { data: existingContact } = await supabase
        .from("people")
        .select("custom_profile_image_url")
        .eq("id", peopleId)
        .single();

    if (!existingContact?.custom_profile_image_url) {
        if (imageBase64) {
            const imageUrl = await uploadContactImage(supabase, userId, peopleId, imageBase64);
            if (imageUrl) {
                await supabase
                    .from("people")
                    .update({ custom_profile_image_url: imageUrl })
                    .eq("id", peopleId);
                console.log(`[iMessage Unmatched] Uploaded Apple contact image for contact ${peopleId}`);
            }
        } else {
            // Try to copy from handle image storage
            for (const ext of ["jpg", "png"]) {
                const srcFilename = `${userId}/handles/${handleId}.${ext}`;
                const destFilename = `${userId}/${peopleId}/profile.${ext}`;

                const { data: srcFile } = await supabase.storage
                    .from("contact-images")
                    .download(srcFilename);

                if (srcFile) {
                    const buffer = Buffer.from(await srcFile.arrayBuffer());
                    const contentType = ext === "png" ? "image/png" : "image/jpeg";

                    const { error: copyError } = await supabase.storage
                        .from("contact-images")
                        .upload(destFilename, buffer, { contentType, upsert: true });

                    if (!copyError) {
                        await supabase
                            .from("people")
                            .update({ custom_profile_image_url: buildPrivateMediaUrl("contact-images", destFilename) })
                            .eq("id", peopleId);
                        console.log(`[iMessage Unmatched] Copied handle image to contact ${peopleId}`);
                    }
                    break;
                }
            }
        }
    }

    // Update last_touchpoint on the contact from the latest message
    const { data: latestMsg } = await supabase
        .from("people_imessages")
        .select("message_date")
        .eq("user_id", userId)
        .eq("handle_id", handleId)
        .eq("people_id", peopleId)
        .order("message_date", { ascending: false })
        .limit(1)
        .single();

    if (latestMsg) {
        await supabase
            .from("people")
            .update({ last_touchpoint: latestMsg.message_date })
            .eq("id", peopleId)
            .or(`last_touchpoint.is.null,last_touchpoint.lt.${latestMsg.message_date}`);
    }

    return count;
}

// PATCH - Link an unmatched handle to an existing Rolodex contact
export async function PATCH(req: NextRequest) {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { handle_id, people_id, image_base64 } = await req.json();

        if (!handle_id || !people_id) {
            return NextResponse.json({ error: "handle_id and people_id are required" }, { status: 400 });
        }

        const count = await linkHandleToContact(supabase, user.id, handle_id, people_id, image_base64);

        console.log(`[iMessage Unmatched] Linked ${handle_id} → contact ${people_id} (${count} messages)`);
        return NextResponse.json({ success: true, linked: count });
    } catch (error) {
        console.error("[iMessage Unmatched] Error:", error);
        const message = error instanceof Error ? error.message : "Internal server error";
        if (message.includes("already linked")) {
            return NextResponse.json({ error: message }, { status: 409 });
        }
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

// POST - Create a new Rolodex contact from an unmatched handle and link it
export async function POST(req: NextRequest) {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { handle_id, name, image_base64 } = await req.json();

        if (!handle_id || !name) {
            return NextResponse.json({ error: "handle_id and name are required" }, { status: 400 });
        }

        // Check if this handle is already linked to an existing contact
        const isEmail = handle_id.includes("@");
        const infoType = isEmail ? "email" : "phone";
        const infoValue = isEmail ? handle_id.toLowerCase().trim() : handle_id.replace(/[^+\d]/g, "");

        const { data: existingLink } = await supabase
            .from("people_contact_info")
            .select("people_id")
            .eq("user_id", user.id)
            .eq("type", infoType)
            .eq("value", infoValue)
            .limit(1)
            .maybeSingle();

        if (existingLink) {
            return NextResponse.json(
                { error: "This handle is already linked to an existing contact", existing_contact_id: existingLink.people_id },
                { status: 409 }
            );
        }

        // Create the new contact
        const { data: person, error: personError } = await supabase
            .from("people")
            .insert({
                user_id: user.id,
                name: name.trim(),
            })
            .select()
            .single();

        if (personError) {
            console.error("[iMessage Unmatched] Error creating contact:", personError);
            return NextResponse.json({ error: "Failed to create contact" }, { status: 500 });
        }

        // Link the handle and upload image
        const count = await linkHandleToContact(supabase, user.id, handle_id, person.id, image_base64);

        console.log(`[iMessage Unmatched] Created "${name}" (id: ${person.id}) and linked ${handle_id} (${count} messages)`);
        return NextResponse.json({ success: true, contact_id: person.id, linked: count });
    } catch (error) {
        console.error("[iMessage Unmatched] Error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
