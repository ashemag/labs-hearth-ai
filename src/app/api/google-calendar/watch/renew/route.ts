import { NextRequest, NextResponse } from "next/server";
import { decrypt, encrypt } from "@/lib/crypto";
import { v4 as uuidv4 } from "uuid";
import { createAdminClient } from "@/lib/supabase/admin";

// Use service role client for automated renewal (no user context)
const supabaseAdmin = createAdminClient();

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID!;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

// Secret for cron job authentication (required in production)
const CRON_SECRET = process.env.CRON_SECRET;

interface GoogleOAuthRecord {
    id: number;
    user_id: string;
    access_token_encrypted: string;
    refresh_token_encrypted: string;
    token_expiry: string;
}

interface WatchRecord {
    id: number;
    google_oauth_id: number;
    user_id: string;
    channel_id: string;
    resource_id: string;
    calendar_id: string;
    expiration: string;
    user_google_oauth: GoogleOAuthRecord;
}

// Refresh access token if expired
async function refreshAccessToken(oauthRecord: GoogleOAuthRecord): Promise<string> {
    const now = new Date();
    const expiry = new Date(oauthRecord.token_expiry);

    // If token is still valid (with 5 min buffer), return it
    if (expiry.getTime() - now.getTime() > 5 * 60 * 1000) {
        return decrypt(oauthRecord.access_token_encrypted);
    }

    // Refresh the token
    const refreshToken = decrypt(oauthRecord.refresh_token_encrypted);
    const response = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
            client_id: GOOGLE_CLIENT_ID,
            client_secret: GOOGLE_CLIENT_SECRET,
            refresh_token: refreshToken,
            grant_type: "refresh_token",
        }),
    });

    if (!response.ok) {
        throw new Error("Failed to refresh access token");
    }

    const tokens = await response.json();
    const newExpiry = new Date(Date.now() + tokens.expires_in * 1000);

    // Update stored tokens
    await supabaseAdmin
        .from("user_google_oauth")
        .update({
            access_token_encrypted: encrypt(tokens.access_token),
            token_expiry: newExpiry.toISOString(),
            updated_at: new Date().toISOString(),
        })
        .eq("id", oauthRecord.id);

    return tokens.access_token;
}

// POST - Renew expiring webhook subscriptions
// Call this via cron job (e.g., daily) to keep webhooks active
export async function POST(req: NextRequest) {
    // Verify cron secret for security
    const authHeader = req.headers.get("authorization");
    if (!CRON_SECRET || authHeader !== `Bearer ${CRON_SECRET}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Find watches expiring in the next 24 hours
    const expirationThreshold = new Date();
    expirationThreshold.setHours(expirationThreshold.getHours() + 24);

    const { data: expiringWatches, error: fetchError } = await supabaseAdmin
        .from("google_calendar_watches")
        .select("*, user_google_oauth(*)")
        .lt("expiration", expirationThreshold.toISOString())
        .gt("expiration", new Date().toISOString());

    if (fetchError) {
        console.error("[Renew] Failed to fetch expiring watches:", fetchError);
        return NextResponse.json({ error: "Failed to fetch watches" }, { status: 500 });
    }

    if (!expiringWatches || expiringWatches.length === 0) {
        console.log("[Renew] No watches expiring soon");
        return NextResponse.json({ renewed: 0, failed: 0 });
    }

    console.log(`[Renew] Found ${expiringWatches.length} watches expiring soon`);

    let renewed = 0;
    let failed = 0;

    for (const watch of expiringWatches as WatchRecord[]) {
        const oauthRecord = watch.user_google_oauth;

        try {
            // Get fresh access token
            const accessToken = await refreshAccessToken(oauthRecord);

            // Stop the old watch
            await fetch(
                "https://www.googleapis.com/calendar/v3/channels/stop",
                {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        id: watch.channel_id,
                        resourceId: watch.resource_id,
                    }),
                }
            );

            // Create a new watch
            const newChannelId = uuidv4();
            const webhookUrl = `${APP_URL}/api/google-calendar/webhook`;

            const watchResponse = await fetch(
                `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(watch.calendar_id)}/events/watch`,
                {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        id: newChannelId,
                        type: "web_hook",
                        address: webhookUrl,
                    }),
                }
            );

            if (!watchResponse.ok) {
                const errorData = await watchResponse.json();
                console.error(`[Renew] Failed to create new watch for account ${oauthRecord.id}:`, errorData);
                failed++;
                continue;
            }

            const watchData = await watchResponse.json();

            // Update the watch record with new channel
            await supabaseAdmin
                .from("google_calendar_watches")
                .update({
                    channel_id: newChannelId,
                    resource_id: watchData.resourceId,
                    expiration: new Date(parseInt(watchData.expiration)).toISOString(),
                    updated_at: new Date().toISOString(),
                })
                .eq("id", watch.id);

            console.log(`[Renew] Renewed watch for account ${oauthRecord.id}, new expiration: ${watchData.expiration}`);
            renewed++;

        } catch (err) {
            console.error(`[Renew] Error renewing watch for account ${oauthRecord.id}:`, err);
            failed++;
        }
    }

    // Also clean up any expired watches
    const { data: expiredWatches } = await supabaseAdmin
        .from("google_calendar_watches")
        .select("id")
        .lt("expiration", new Date().toISOString());

    if (expiredWatches && expiredWatches.length > 0) {
        await supabaseAdmin
            .from("google_calendar_watches")
            .delete()
            .lt("expiration", new Date().toISOString());

        console.log(`[Renew] Cleaned up ${expiredWatches.length} expired watches`);
    }

    return NextResponse.json({
        renewed,
        failed,
        expiredCleaned: expiredWatches?.length || 0,
    });
}
