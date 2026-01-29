import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { decrypt, encrypt } from "@/lib/crypto";
import { v4 as uuidv4 } from "uuid";

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID!;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

interface GoogleOAuthRecord {
    id: number;
    user_id: string;
    google_email: string;
    access_token_encrypted: string;
    refresh_token_encrypted: string;
    token_expiry: string;
}

// Refresh access token if expired
async function refreshAccessToken(
    supabase: Awaited<ReturnType<typeof createClient>>,
    oauthRecord: GoogleOAuthRecord
): Promise<string> {
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

// POST - Create a watch subscription for a calendar
export async function POST(req: NextRequest) {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { accountId, calendarId = "primary" } = body;

    if (!accountId) {
        return NextResponse.json({ error: "Account ID required" }, { status: 400 });
    }

    // Get OAuth record
    const { data: oauthRecord, error: oauthError } = await supabase
        .from("user_google_oauth")
        .select("*")
        .eq("id", accountId)
        .eq("user_id", user.id)
        .single();

    if (oauthError || !oauthRecord) {
        return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    try {
        // Check for existing active watch
        const { data: existingWatch } = await supabase
            .from("google_calendar_watches")
            .select("*")
            .eq("google_oauth_id", accountId)
            .eq("calendar_id", calendarId)
            .gt("expiration", new Date().toISOString())
            .single();

        if (existingWatch) {
            return NextResponse.json({
                success: true,
                message: "Watch already exists",
                watch: {
                    channelId: existingWatch.channel_id,
                    expiration: existingWatch.expiration,
                },
            });
        }

        // Get fresh access token
        const accessToken = await refreshAccessToken(supabase, oauthRecord as GoogleOAuthRecord);

        // Generate unique channel ID
        const channelId = uuidv4();

        // Webhook URL - must be HTTPS in production
        const webhookUrl = `${APP_URL}/api/google-calendar/webhook`;

        // Create watch subscription with Google
        const response = await fetch(
            `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/watch`,
            {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    id: channelId,
                    type: "web_hook",
                    address: webhookUrl,
                }),
            }
        );

        if (!response.ok) {
            const errorData = await response.json();
            console.error("Watch creation error:", errorData);

            // Common errors:
            // 401 - Token expired or invalid
            // 403 - Webhook URL not authorized (needs to be added in Google Cloud Console)
            // 400 - Invalid request
            if (response.status === 403) {
                return NextResponse.json({
                    error: "Webhook URL not authorized. Add your domain to Google Cloud Console.",
                    details: errorData,
                }, { status: 403 });
            }

            return NextResponse.json({
                error: "Failed to create watch",
                details: errorData,
            }, { status: response.status });
        }

        const watchData = await response.json();

        // Store the watch subscription
        const { error: insertError } = await supabase
            .from("google_calendar_watches")
            .insert({
                google_oauth_id: accountId,
                user_id: user.id,
                channel_id: channelId,
                resource_id: watchData.resourceId,
                calendar_id: calendarId,
                expiration: new Date(parseInt(watchData.expiration)).toISOString(),
            });

        if (insertError) {
            console.error("Failed to store watch:", insertError);
            // Try to stop the watch since we couldn't store it
            await fetch(
                "https://www.googleapis.com/calendar/v3/channels/stop",
                {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        id: channelId,
                        resourceId: watchData.resourceId,
                    }),
                }
            );
            throw new Error("Failed to store watch subscription");
        }

        console.log(`✓ Created calendar watch for account ${accountId}, expires: ${watchData.expiration}`);

        return NextResponse.json({
            success: true,
            watch: {
                channelId,
                resourceId: watchData.resourceId,
                expiration: new Date(parseInt(watchData.expiration)).toISOString(),
            },
        });

    } catch (err) {
        console.error("Watch error:", err);
        return NextResponse.json({
            error: err instanceof Error ? err.message : "Failed to create watch",
        }, { status: 500 });
    }
}

// DELETE - Stop a watch subscription
export async function DELETE(req: NextRequest) {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { accountId, channelId } = body;

    if (!accountId || !channelId) {
        return NextResponse.json({ error: "Account ID and Channel ID required" }, { status: 400 });
    }

    // Get OAuth record
    const { data: oauthRecord, error: oauthError } = await supabase
        .from("user_google_oauth")
        .select("*")
        .eq("id", accountId)
        .eq("user_id", user.id)
        .single();

    if (oauthError || !oauthRecord) {
        return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    // Get watch record
    const { data: watch, error: watchError } = await supabase
        .from("google_calendar_watches")
        .select("*")
        .eq("channel_id", channelId)
        .eq("user_id", user.id)
        .single();

    if (watchError || !watch) {
        return NextResponse.json({ error: "Watch not found" }, { status: 404 });
    }

    try {
        // Get fresh access token
        const accessToken = await refreshAccessToken(supabase, oauthRecord as GoogleOAuthRecord);

        // Stop the watch with Google
        await fetch(
            "https://www.googleapis.com/calendar/v3/channels/stop",
            {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    id: channelId,
                    resourceId: watch.resource_id,
                }),
            }
        );

        // Delete from database
        await supabase
            .from("google_calendar_watches")
            .delete()
            .eq("channel_id", channelId);

        return NextResponse.json({ success: true });

    } catch (err) {
        console.error("Stop watch error:", err);
        return NextResponse.json({
            error: err instanceof Error ? err.message : "Failed to stop watch",
        }, { status: 500 });
    }
}

// GET - List active watches for user
export async function GET(req: NextRequest) {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const accountId = searchParams.get("accountId");

    let query = supabase
        .from("google_calendar_watches")
        .select("*")
        .eq("user_id", user.id)
        .gt("expiration", new Date().toISOString());

    if (accountId) {
        query = query.eq("google_oauth_id", parseInt(accountId));
    }

    const { data: watches, error } = await query;

    if (error) {
        return NextResponse.json({ error: "Failed to fetch watches" }, { status: 500 });
    }

    return NextResponse.json({ watches });
}
