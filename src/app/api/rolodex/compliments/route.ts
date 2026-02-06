import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET - Fetch standalone compliments (no linked contact)
export async function GET() {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { data, error } = await supabase
            .from("people_compliments")
            .select("id, compliment, context, source_name, image_url, received_at, created_at")
            .eq("user_id", user.id)
            .is("people_id", null)
            .order("created_at", { ascending: false });

        if (error) {
            console.error("Error fetching standalone compliments:", error);
            return NextResponse.json({ error: "Failed to fetch compliments" }, { status: 500 });
        }

        return NextResponse.json({ compliments: data || [] });
    } catch (error) {
        console.error("Error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

// POST - Add a compliment (optionally linked to a contact, optionally with screenshot)
export async function POST(req: NextRequest) {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const contentType = req.headers.get("content-type") || "";

        let people_id: number | null = null;
        let compliment: string | null = null;
        let context: string | null = null;
        let received_at: string | null = null;
        let source_name: string | null = null;
        let imageFile: File | null = null;

        if (contentType.includes("multipart/form-data")) {
            // FormData submission (with optional image)
            const formData = await req.formData();
            people_id = formData.get("people_id") ? parseInt(formData.get("people_id") as string) : null;
            compliment = (formData.get("compliment") as string) || null;
            context = (formData.get("context") as string) || null;
            received_at = (formData.get("received_at") as string) || null;
            source_name = (formData.get("source_name") as string) || null;
            imageFile = formData.get("image") as File | null;
        } else {
            // JSON submission (text only)
            const body = await req.json();
            people_id = body.people_id || null;
            compliment = body.compliment || null;
            context = body.context || null;
            received_at = body.received_at || null;
            source_name = body.source_name || null;
        }

        // Must have either compliment text or an image
        if (!compliment?.trim() && !imageFile) {
            return NextResponse.json({ error: "A compliment or screenshot is required" }, { status: 400 });
        }

        // Upload image if provided
        let image_url: string | null = null;
        if (imageFile) {
            const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
            if (!allowedTypes.includes(imageFile.type)) {
                return NextResponse.json({ error: "Invalid image type" }, { status: 400 });
            }
            if (imageFile.size > 5 * 1024 * 1024) {
                return NextResponse.json({ error: "Image must be under 5MB" }, { status: 400 });
            }

            const buffer = Buffer.from(await imageFile.arrayBuffer());
            const ext = imageFile.type === "image/png" ? "png" : imageFile.type === "image/webp" ? "webp" : "jpg";
            const filename = `${user.id}/compliments/${Date.now()}.${ext}`;

            const { error: uploadError } = await supabase.storage
                .from("contact-images")
                .upload(filename, buffer, {
                    contentType: imageFile.type,
                    upsert: false,
                });

            if (uploadError) {
                console.error("Error uploading compliment image:", uploadError);
                return NextResponse.json({ error: "Failed to upload image" }, { status: 500 });
            }

            const { data: urlData } = supabase.storage
                .from("contact-images")
                .getPublicUrl(filename);

            image_url = `${urlData.publicUrl}?t=${Date.now()}`;
        }

        const { data, error } = await supabase
            .from("people_compliments")
            .insert({
                user_id: user.id,
                people_id,
                compliment: compliment?.trim() || null,
                context: context?.trim() || null,
                received_at: received_at || null,
                source_name: source_name?.trim() || null,
                image_url,
            })
            .select()
            .single();

        if (error) {
            console.error("Error adding compliment:", error);
            return NextResponse.json({ error: "Failed to add compliment" }, { status: 500 });
        }

        return NextResponse.json({ compliment: data });
    } catch (error) {
        console.error("Error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

// PATCH - Update an existing compliment
export async function PATCH(req: NextRequest) {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await req.json();
        const { compliment_id, compliment, context, received_at, source_name } = body;

        if (!compliment_id) {
            return NextResponse.json({ error: "compliment_id is required" }, { status: 400 });
        }

        const updates: { compliment?: string; context?: string | null; received_at?: string | null; source_name?: string | null } = {};

        if (compliment !== undefined) {
            if (!compliment?.trim()) {
                return NextResponse.json({ error: "compliment cannot be empty" }, { status: 400 });
            }
            updates.compliment = compliment.trim();
        }
        if (context !== undefined) {
            updates.context = context?.trim() || null;
        }
        if (received_at !== undefined) {
            updates.received_at = received_at || null;
        }
        if (source_name !== undefined) {
            updates.source_name = source_name?.trim() || null;
        }

        if (Object.keys(updates).length === 0) {
            return NextResponse.json({ error: "No updates provided" }, { status: 400 });
        }

        const { data, error } = await supabase
            .from("people_compliments")
            .update(updates)
            .eq("id", compliment_id)
            .eq("user_id", user.id)
            .select()
            .single();

        if (error) {
            console.error("Error updating compliment:", error);
            return NextResponse.json({ error: "Failed to update compliment" }, { status: 500 });
        }

        return NextResponse.json({ compliment: data });
    } catch (error) {
        console.error("Error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

// DELETE - Remove a compliment
export async function DELETE(req: NextRequest) {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { searchParams } = new URL(req.url);
        const complimentId = searchParams.get("id");

        if (!complimentId) {
            return NextResponse.json({ error: "Compliment ID is required" }, { status: 400 });
        }

        // Get the compliment to check for image_url before deleting
        const { data: existing } = await supabase
            .from("people_compliments")
            .select("image_url")
            .eq("id", parseInt(complimentId))
            .eq("user_id", user.id)
            .single();

        const { error } = await supabase
            .from("people_compliments")
            .delete()
            .eq("id", parseInt(complimentId))
            .eq("user_id", user.id);

        if (error) {
            console.error("Error deleting compliment:", error);
            return NextResponse.json({ error: "Failed to delete compliment" }, { status: 500 });
        }

        // Clean up image from storage if it exists
        if (existing?.image_url) {
            try {
                const url = new URL(existing.image_url.split("?")[0]);
                const pathParts = url.pathname.split("/contact-images/");
                if (pathParts[1]) {
                    await supabase.storage.from("contact-images").remove([pathParts[1]]);
                }
            } catch {
                // Non-critical, ignore cleanup errors
            }
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
