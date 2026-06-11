import type { SupabaseClient } from "@supabase/supabase-js";
import { decrypt, encrypt } from "@/lib/crypto";

const googleClientId = process.env.GOOGLE_CLIENT_ID!;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET!;

export interface GoogleOAuthTokenRecord {
    id: number;
    access_token_encrypted: string;
    refresh_token_encrypted: string;
    token_expiry: string;
}

export async function refreshGoogleAccessToken(
    supabase: SupabaseClient,
    oauthRecord: GoogleOAuthTokenRecord
): Promise<string> {
    const now = new Date();
    const expiry = new Date(oauthRecord.token_expiry);

    if (expiry.getTime() - now.getTime() > 5 * 60 * 1000) {
        return decrypt(oauthRecord.access_token_encrypted);
    }

    const refreshToken = decrypt(oauthRecord.refresh_token_encrypted);
    const response = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
            client_id: googleClientId,
            client_secret: googleClientSecret,
            refresh_token: refreshToken,
            grant_type: "refresh_token",
        }),
    });

    if (!response.ok) {
        throw new Error("Failed to refresh access token");
    }

    const tokens = await response.json();
    const newExpiry = new Date(Date.now() + tokens.expires_in * 1000);

    await supabase
        .from("user_google_oauth")
        .update({
            access_token_encrypted: encrypt(tokens.access_token),
            token_expiry: newExpiry.toISOString(),
            updated_at: new Date().toISOString(),
        })
        .eq("id", oauthRecord.id);

    return tokens.access_token;
}
