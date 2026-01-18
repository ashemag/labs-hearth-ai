import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET - Fetch user profile
export async function GET() {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { data: profile, error } = await supabase
            .from("user_profiles")
            .select("*")
            .eq("id", user.id)
            .single();

        if (error && error.code !== "PGRST116") {
            // PGRST116 = no rows returned, which is fine for new users
            console.error("Error fetching profile:", error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ profile: profile || null });
    } catch (error) {
        console.error("Error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

// POST - Upload profile image
export async function POST(req: NextRequest) {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const formData = await req.formData();
        const file = formData.get("file") as File | null;

        if (!file) {
            return NextResponse.json({ error: "No file provided" }, { status: 400 });
        }

        // Validate file type
        const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
        if (!allowedTypes.includes(file.type)) {
            return NextResponse.json({ error: "Invalid file type. Please upload a JPEG, PNG, WebP, or GIF." }, { status: 400 });
        }

        // Validate file size (max 5MB)
        const maxSize = 5 * 1024 * 1024;
        if (file.size > maxSize) {
            return NextResponse.json({ error: "File too large. Maximum size is 5MB." }, { status: 400 });
        }

        // Generate unique filename
        const ext = file.name.split(".").pop() || "jpg";
        const filename = `${user.id}/avatar.${ext}`;

        // Convert file to buffer
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Upload to Supabase Storage
        const { error: uploadError } = await supabase.storage
            .from("user-avatars")
            .upload(filename, buffer, {
                contentType: file.type,
                upsert: true,
            });

        if (uploadError) {
            console.error("Error uploading file:", uploadError);
            return NextResponse.json({ error: "Failed to upload image" }, { status: 500 });
        }

        // Get the public URL
        const { data: urlData } = supabase.storage
            .from("user-avatars")
            .getPublicUrl(filename);

        const avatarUrl = `${urlData.publicUrl}?t=${Date.now()}`; // Add cache buster

        // Upsert user profile with new avatar URL
        const { error: upsertError } = await supabase
            .from("user_profiles")
            .upsert({
                id: user.id,
                avatar_url: avatarUrl,
                updated_at: new Date().toISOString(),
            }, {
                onConflict: "id",
            });

        if (upsertError) {
            console.error("Error updating profile:", upsertError);
            return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
        }

        return NextResponse.json({ avatarUrl });
    } catch (error) {
        console.error("Error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

// PATCH - Update profile data (display name, etc.)
export async function PATCH(req: NextRequest) {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await req.json();
        const { display_name } = body;

        const { error: upsertError } = await supabase
            .from("user_profiles")
            .upsert({
                id: user.id,
                display_name,
                updated_at: new Date().toISOString(),
            }, {
                onConflict: "id",
            });

        if (upsertError) {
            console.error("Error updating profile:", upsertError);
            return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

