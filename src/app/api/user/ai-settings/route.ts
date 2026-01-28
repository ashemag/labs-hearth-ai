import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { encrypt, decrypt } from "@/lib/crypto";

// GET - Retrieve user's AI settings (provider + masked key)
export async function GET() {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data, error } = await supabase
        .from("user_ai_settings")
        .select("provider, api_key_encrypted, updated_at")
        .eq("user_id", user.id)
        .single();

    if (error && error.code !== "PGRST116") {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
        return NextResponse.json({ provider: null, hasApiKey: false });
    }

    // Mask the API key - only show last 4 chars
    let maskedKey: string | null = null;
    if (data.api_key_encrypted) {
        try {
            const decrypted = decrypt(data.api_key_encrypted);
            maskedKey = "••••••••" + decrypted.slice(-4);
        } catch {
            maskedKey = null;
        }
    }

    return NextResponse.json({
        provider: data.provider,
        hasApiKey: !!data.api_key_encrypted,
        maskedKey,
        updatedAt: data.updated_at,
    });
}

// POST - Save or update AI settings
export async function POST(req: NextRequest) {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { provider, apiKey } = body;

    if (!provider || typeof provider !== "string") {
        return NextResponse.json({ error: "Provider is required" }, { status: 400 });
    }

    const allowedProviders = ["anthropic", "openai", "google", "mistral", "groq", "openrouter"];
    if (!allowedProviders.includes(provider)) {
        return NextResponse.json({ error: "Invalid provider" }, { status: 400 });
    }

    const updateData: Record<string, unknown> = {
        user_id: user.id,
        provider,
        updated_at: new Date().toISOString(),
    };

    // Only update API key if provided (allows changing provider without re-entering key)
    if (apiKey && typeof apiKey === "string" && apiKey.trim().length > 0) {
        updateData.api_key_encrypted = encrypt(apiKey.trim());
    }

    const { error } = await supabase
        .from("user_ai_settings")
        .upsert(updateData, { onConflict: "user_id" });

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
}

// DELETE - Remove AI settings
export async function DELETE() {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { error } = await supabase
        .from("user_ai_settings")
        .delete()
        .eq("user_id", user.id);

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
}
