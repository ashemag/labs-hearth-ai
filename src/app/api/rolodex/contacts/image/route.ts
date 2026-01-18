import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// POST - Upload a profile image for a contact
export async function POST(req: NextRequest) {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const formData = await req.formData();
        const file = formData.get("file") as File | null;
        const contactId = formData.get("contactId") as string | null;

        if (!file) {
            return NextResponse.json({ error: "No file provided" }, { status: 400 });
        }

        if (!contactId) {
            return NextResponse.json({ error: "Contact ID is required" }, { status: 400 });
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

        // Verify the contact belongs to this user
        const { data: contact, error: contactError } = await supabase
            .from("people")
            .select("id")
            .eq("id", parseInt(contactId, 10))
            .eq("user_id", user.id)
            .single();

        if (contactError || !contact) {
            return NextResponse.json({ error: "Contact not found" }, { status: 404 });
        }

        // Generate unique filename
        const ext = file.name.split(".").pop() || "jpg";
        const filename = `${user.id}/${contactId}/profile.${ext}`;

        // Convert file to buffer
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Upload to Supabase Storage
        const { error: uploadError } = await supabase.storage
            .from("contact-images")
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
            .from("contact-images")
            .getPublicUrl(filename);

        const imageUrl = `${urlData.publicUrl}?t=${Date.now()}`; // Add cache buster

        // Update the contact with the new image URL
        const { error: updateError } = await supabase
            .from("people")
            .update({
                custom_profile_image_url: imageUrl,
                updated_at: new Date().toISOString(),
            })
            .eq("id", parseInt(contactId, 10))
            .eq("user_id", user.id);

        if (updateError) {
            console.error("Error updating contact:", updateError);
            return NextResponse.json({ error: "Failed to update contact" }, { status: 500 });
        }

        console.log(`✓ Uploaded profile image for contact ${contactId}`);
        return NextResponse.json({ url: imageUrl });
    } catch (error) {
        console.error("Error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

// DELETE - Remove a contact's profile image
export async function DELETE(req: NextRequest) {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { searchParams } = new URL(req.url);
        const contactId = searchParams.get("contactId");

        if (!contactId) {
            return NextResponse.json({ error: "Contact ID is required" }, { status: 400 });
        }

        // Update the contact to remove the image URL
        const { error: updateError } = await supabase
            .from("people")
            .update({
                custom_profile_image_url: null,
                updated_at: new Date().toISOString(),
            })
            .eq("id", parseInt(contactId, 10))
            .eq("user_id", user.id);

        if (updateError) {
            console.error("Error updating contact:", updateError);
            return NextResponse.json({ error: "Failed to update contact" }, { status: 500 });
        }

        // Try to delete the file from storage (ignore errors if file doesn't exist)
        const extensions = ["jpg", "jpeg", "png", "webp", "gif"];
        for (const ext of extensions) {
            await supabase.storage
                .from("contact-images")
                .remove([`${user.id}/${contactId}/profile.${ext}`]);
        }

        console.log(`✓ Removed profile image for contact ${contactId}`);
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

