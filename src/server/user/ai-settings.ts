import { decrypt, encrypt } from "@/lib/crypto";
import { badRequest, serverError, type ServerSupabaseClient } from "@/server/api/route";

const allowedProviders = ["anthropic", "openai", "google", "mistral", "groq", "openrouter"] as const;

export async function getUserAiSettings(supabase: ServerSupabaseClient, userId: string) {
    const { data, error } = await supabase
        .from("user_ai_settings")
        .select("provider, api_key_encrypted, updated_at")
        .eq("user_id", userId)
        .single();

    if (error && error.code !== "PGRST116") {
        serverError("Failed to fetch AI settings");
    }

    if (!data) {
        return { provider: null, hasApiKey: false };
    }

    let maskedKey: string | null = null;
    if (data.api_key_encrypted) {
        try {
            const decrypted = decrypt(data.api_key_encrypted);
            maskedKey = "••••••••" + decrypted.slice(-4);
        } catch {
            maskedKey = null;
        }
    }

    return {
        provider: data.provider,
        hasApiKey: !!data.api_key_encrypted,
        maskedKey,
        updatedAt: data.updated_at,
    };
}

export async function saveUserAiSettings(
    supabase: ServerSupabaseClient,
    userId: string,
    input: Record<string, unknown>
) {
    const provider = input.provider;
    const apiKey = input.apiKey;

    if (typeof provider !== "string" || provider.trim().length === 0) {
        badRequest("Provider is required");
    }

    if (!allowedProviders.includes(provider as typeof allowedProviders[number])) {
        badRequest("Invalid provider");
    }

    const updateData: Record<string, unknown> = {
        user_id: userId,
        provider,
        updated_at: new Date().toISOString(),
    };

    if (typeof apiKey === "string" && apiKey.trim().length > 0) {
        updateData.api_key_encrypted = encrypt(apiKey.trim());
    }

    const { error } = await supabase
        .from("user_ai_settings")
        .upsert(updateData, { onConflict: "user_id" });

    if (error) {
        serverError("Failed to save AI settings");
    }

    return { success: true };
}

export async function deleteUserAiSettings(supabase: ServerSupabaseClient, userId: string) {
    const { error } = await supabase
        .from("user_ai_settings")
        .delete()
        .eq("user_id", userId);

    if (error) {
        serverError("Failed to delete AI settings");
    }

    return { success: true };
}
