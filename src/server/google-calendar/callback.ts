import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { encrypt } from "@/lib/crypto";
import { v4 as uuidv4 } from "uuid";
import { verifyOAuthState } from "@/lib/oauth-state";

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID!;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!;
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || "https://labs.hearth.ai/api/google-calendar/callback";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

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

// GET - Handle OAuth callback from Google
export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");

    // Redirect URL for after processing
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://labs.hearth.ai";
    const settingsUrl = `${appUrl}/app/settings?tab=calendar`;

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
                redirect_uri: GOOGLE_REDIRECT_URI,
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
        const { error: upsertError } = await supabase
            .from("user_google_oauth")
            .upsert({
                user_id: user.id,
                google_email: userInfo.email,
                google_name: userInfo.name || null,
                access_token_encrypted: accessTokenEncrypted,
                refresh_token_encrypted: refreshTokenEncrypted,
                token_expiry: tokenExpiry.toISOString(),
                updated_at: new Date().toISOString(),
            }, {
                onConflict: "user_id,google_email",
            });

        if (upsertError) {
            console.error("Failed to save OAuth tokens:", upsertError);
            return NextResponse.redirect(`${settingsUrl}&error=save_failed`);
        }

        // Get the OAuth record ID for setting up the watch
        const { data: oauthRecord } = await supabase
            .from("user_google_oauth")
            .select("id")
            .eq("user_id", user.id)
            .eq("google_email", userInfo.email)
            .single();

        // Set up webhook for real-time updates
        if (oauthRecord) {
            try {
                const channelId = uuidv4();
                const webhookUrl = `${APP_URL}/api/google-calendar/webhook`;

                const watchResponse = await fetch(
                    "https://www.googleapis.com/calendar/v3/calendars/primary/events/watch",
                    {
                        method: "POST",
                        headers: {
                            Authorization: `Bearer ${tokens.access_token}`,
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify({
                            id: channelId,
                            type: "web_hook",
                            address: webhookUrl,
                        }),
                    }
                );

                if (watchResponse.ok) {
                    const watchData = await watchResponse.json();

                    // Store the watch subscription
                    await supabase
                        .from("google_calendar_watches")
                        .insert({
                            google_oauth_id: oauthRecord.id,
                            user_id: user.id,
                            channel_id: channelId,
                            resource_id: watchData.resourceId,
                            calendar_id: "primary",
                            expiration: new Date(parseInt(watchData.expiration)).toISOString(),
                        });

                    console.log(`✓ Calendar webhook set up, expires: ${watchData.expiration}`);
                } else {
                    // Webhook setup failed - this is OK, we can still sync manually
                    // Common reason: domain not verified in Google Cloud Console
                    const errorData = await watchResponse.json();
                    console.warn("Webhook setup failed (will use manual sync):", errorData);
                }
            } catch (watchErr) {
                console.warn("Webhook setup error (will use manual sync):", watchErr);
            }
        }

        console.log(`✓ Google Calendar connected for ${userInfo.email}`);
        return NextResponse.redirect(`${settingsUrl}&success=connected`);

    } catch (err) {
        console.error("OAuth callback error:", err);
        return NextResponse.redirect(`${settingsUrl}&error=unknown`);
    }
}
