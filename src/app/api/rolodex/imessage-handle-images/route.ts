import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// POST - Upload Apple contact images for iMessage handles (called from Electron after sync)
export async function POST(req: NextRequest) {
    const authHeader = req.headers.get("Authorization");
    let user;
    let supabase;

    if (authHeader?.startsWith("Bearer ")) {
        const token = authHeader.slice(7);
        supabase = createSupabaseClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            { global: { headers: { Authorization: `Bearer ${token}` } } }
        );
        const { data, error } = await supabase.auth.getUser(token);
        if (error || !data.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        user = data.user;
    } else {
        supabase = await createClient();
        const { data: { user: cookieUser }, error: authError } = await supabase.auth.getUser();
        if (authError || !cookieUser) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        user = cookieUser;
    }

    try {
        const { images } = await req.json() as { images: Record<string, string> };

        if (!images || typeof images !== "object") {
            return NextResponse.json({ error: "images object is required" }, { status: 400 });
        }

        let uploaded = 0;

        for (const [handleId, dataUri] of Object.entries(images)) {
            if (!dataUri) continue;

            const match = dataUri.match(/^data:([^;]+);base64,(.+)$/);
            if (!match) continue;

            const mimeType = match[1];
            const base64Data = match[2];
            const ext = mimeType.split("/")[1] === "png" ? "png" : "jpg";
            const buffer = Buffer.from(base64Data, "base64");

            if (buffer.length === 0 || buffer.length > 5 * 1024 * 1024) continue;

            const filename = `${user.id}/handles/${handleId}.${ext}`;

            const { error: uploadError } = await supabase.storage
                .from("contact-images")
                .upload(filename, buffer, {
                    contentType: mimeType,
                    upsert: true,
                });

            if (uploadError) {
                console.error(`[Handle Images] Upload error for ${handleId}:`, uploadError);
            } else {
                uploaded++;
            }
        }

        console.log(`[Handle Images] Uploaded ${uploaded} handle images for user ${user.id}`);
        return NextResponse.json({ success: true, uploaded });
    } catch (error) {
        console.error("[Handle Images] Error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

// GET - Get image URLs for a list of handle_ids
export async function GET(req: NextRequest) {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const handleIds = req.nextUrl.searchParams.get("handles")?.split(",") || [];
    if (handleIds.length === 0) {
        return NextResponse.json({ images: {} });
    }

    const images: Record<string, string> = {};

    // List all files once
    const { data: allFiles } = await supabase.storage
        .from("contact-images")
        .list(`${user.id}/handles`, { limit: 1000 });
    const fileSet = new Set((allFiles || []).map(f => f.name));

    for (const handleId of handleIds) {
        for (const ext of ["jpg", "png"]) {
            const fileName = `${handleId}.${ext}`;
            if (fileSet.has(fileName)) {
                const { data: urlData } = supabase.storage
                    .from("contact-images")
                    .getPublicUrl(`${user.id}/handles/${fileName}`);
                images[handleId] = `${urlData.publicUrl}?t=${Date.now()}`;
                break;
            }
        }
    }

    return NextResponse.json({ images });
}
