import { NextRequest, NextResponse } from "next/server";
import { waitUntil } from "@vercel/functions";
import { createClient } from "@/lib/supabase/server";
import { encrypt } from "@/lib/crypto";
import { verifyOAuthState } from "@/lib/oauth-state";
import { createCalendarWatch } from "@/server/google-calendar/watches";
import { syncGoogleCalendarAccount } from "@/server/google-calendar/sync";

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID!;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!;
interface GoogleTokenResponse {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
    token_type: string;
    scope: string;
}

interface GoogleUserInfo {
    email: string;
    name?: string;
    picture?: string;
}

async function finishCalendarConnectionInBackground(
    supabase: Awaited<ReturnType<typeof createClient>>,
    userId: string,
    accountId: number,
    email: string
) {
    try {
        await createCalendarWatch(supabase, userId, { accountId });
    } catch (watchErr) {
        console.warn("Webhook setup failed after Google Calendar connect (will use manual sync):", watchErr);
    }

    try {
        await syncGoogleCalendarAccount(supabase, userId, { accountId });
    } catch (syncErr) {
        console.warn(`Initial Google Calendar sync failed for ${email}:`, syncErr);
    }
}

// GET - Handle OAuth callback from Google
export async function GET(req: NextRequest) {
    const requestUrl = new URL(req.url);
    const { searchParams } = requestUrl;
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");
    const redirectUri = `${requestUrl.origin}/api/google-calendar/callback`;

    // Redirect URL for after processing
    const settingsUrl = `${requestUrl.origin}/app/settings?tab=calendar`;

    if (error) {
        console.error("Google OAuth error:", error);
        return NextResponse.redirect(`${settingsUrl}&error=oauth_denied`);
    }

    if (!code || !state) {
        return NextResponse.redirect(`${settingsUrl}&error=missing_params`);
    }

    const verifiedState = verifyOAuthState(state, "google");
    if (!verifiedState) {
        return NextResponse.redirect(`${settingsUrl}&error=invalid_state`);
    }

    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        return NextResponse.redirect(`${settingsUrl}&error=unauthorized`);
    }

    if (verifiedState.userId !== user.id) {
        return NextResponse.redirect(`${settingsUrl}&error=invalid_state`);
    }

    try {
        // Exchange code for tokens
        const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
                code,
                client_id: GOOGLE_CLIENT_ID,
                client_secret: GOOGLE_CLIENT_SECRET,
                redirect_uri: redirectUri,
                grant_type: "authorization_code",
            }),
        });

        if (!tokenResponse.ok) {
            const errorData = await tokenResponse.json();
            console.error("Token exchange failed:", errorData);
            return NextResponse.redirect(`${settingsUrl}&error=token_exchange_failed`);
        }

        const tokens: GoogleTokenResponse = await tokenResponse.json();

        if (!tokens.refresh_token) {
            console.error("No refresh token received");
            return NextResponse.redirect(`${settingsUrl}&error=no_refresh_token`);
        }

        // Get user info from Google
        const userInfoResponse = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
            headers: { Authorization: `Bearer ${tokens.access_token}` },
        });

        if (!userInfoResponse.ok) {
            console.error("Failed to get user info");
            return NextResponse.redirect(`${settingsUrl}&error=userinfo_failed`);
        }

        const userInfo: GoogleUserInfo = await userInfoResponse.json();

        // Calculate token expiry
        const tokenExpiry = new Date(Date.now() + tokens.expires_in * 1000);

        // Encrypt tokens for storage
        const accessTokenEncrypted = encrypt(tokens.access_token);
        const refreshTokenEncrypted = encrypt(tokens.refresh_token);

        // Upsert OAuth record
        const { data: oauthRecord, error: upsertError } = await supabase
            .from("user_google_oauth")
            .upsert({
                user_id: user.id,
                google_email: userInfo.email,
                google_name: userInfo.name || null,
                access_token_encrypted: accessTokenEncrypted,
                refresh_token_encrypted: refreshTokenEncrypted,
                token_expiry: tokenExpiry.toISOString(),
                sync_cursor: null,
                last_sync_at: null,
                updated_at: new Date().toISOString(),
            }, {
                onConflict: "user_id,google_email",
            })
            .select("id")
            .single();

        if (upsertError) {
            console.error("Failed to save OAuth tokens:", upsertError);
            return NextResponse.redirect(`${settingsUrl}&error=save_failed`);
        }

        if (oauthRecord) {
            waitUntil(finishCalendarConnectionInBackground(
                supabase,
                user.id,
                oauthRecord.id,
                userInfo.email
            ));
        }

        console.log(`✓ Google Calendar connected for ${userInfo.email}; finishing setup in background`);
        return NextResponse.redirect(`${settingsUrl}&success=connected&sync=background`);

    } catch (err) {
        console.error("OAuth callback error:", err);
        return NextResponse.redirect(`${settingsUrl}&error=unknown`);
    }
}
