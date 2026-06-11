import type { SupabaseClient } from "@supabase/supabase-js";
import { v4 as uuidv4 } from "uuid";
import { ApiError, badRequest, serverError, type ServerSupabaseClient } from "@/server/api/route";
import { refreshGoogleAccessToken, type GoogleOAuthTokenRecord } from "@/server/google-calendar/tokens";

const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

interface GoogleOAuthRecord extends GoogleOAuthTokenRecord {
    user_id: string;
    google_email: string;
}

interface RenewWatchRecord {
    id: number;
    google_oauth_id: number;
    user_id: string;
    channel_id: string;
    resource_id: string;
    calendar_id: string;
    expiration: string;
    user_google_oauth: GoogleOAuthTokenRecord;
}

async function readGoogleError(response: Response) {
    try {
        return await response.json();
    } catch {
        return null;
    }
}

function requiredAccountId(value: unknown) {
    const accountId = typeof value === "number" ? value : Number(value);
    if (!Number.isFinite(accountId) || accountId <= 0) {
        badRequest("Account ID required");
    }

    return accountId;
}

async function getUserGoogleOAuthRecord(
    supabase: ServerSupabaseClient,
    userId: string,
    accountId: number
) {
    const { data: oauthRecord, error } = await supabase
        .from("user_google_oauth")
        .select("*")
        .eq("id", accountId)
        .eq("user_id", userId)
        .single();

    if (error || !oauthRecord) {
        throw new ApiError("Account not found", 404);
    }

    return oauthRecord as GoogleOAuthRecord;
}

export async function createCalendarWatch(
    supabase: ServerSupabaseClient,
    userId: string,
    input: Record<string, unknown>
) {
    const accountId = requiredAccountId(input.accountId);
    const calendarId = typeof input.calendarId === "string" && input.calendarId.trim()
        ? input.calendarId.trim()
        : "primary";

    const oauthRecord = await getUserGoogleOAuthRecord(supabase, userId, accountId);

    const { data: existingWatch } = await supabase
        .from("google_calendar_watches")
        .select("*")
        .eq("google_oauth_id", accountId)
        .eq("calendar_id", calendarId)
        .gt("expiration", new Date().toISOString())
        .single();

    if (existingWatch) {
        return {
            success: true,
            message: "Watch already exists",
            watch: {
                channelId: existingWatch.channel_id,
                expiration: existingWatch.expiration,
            },
        };
    }

    const accessToken = await refreshGoogleAccessToken(supabase, oauthRecord);
    const channelId = uuidv4();
    const webhookUrl = `${appUrl}/api/google-calendar/webhook`;

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
        const details = await readGoogleError(response);
        console.error("Watch creation error:", details);

        if (response.status === 403) {
            throw new ApiError("Webhook URL not authorized. Add your domain to Google Cloud Console.", 403, {
                error: "Webhook URL not authorized. Add your domain to Google Cloud Console.",
                details,
            });
        }

        throw new ApiError("Failed to create watch", response.status, {
            error: "Failed to create watch",
            details,
        });
    }

    const watchData = await response.json();
    const expiration = new Date(parseInt(watchData.expiration)).toISOString();

    const { error: insertError } = await supabase
        .from("google_calendar_watches")
        .insert({
            google_oauth_id: accountId,
            user_id: userId,
            channel_id: channelId,
            resource_id: watchData.resourceId,
            calendar_id: calendarId,
            expiration,
        });

    if (insertError) {
        console.error("Failed to store watch:", insertError);
        await fetch("https://www.googleapis.com/calendar/v3/channels/stop", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${accessToken}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                id: channelId,
                resourceId: watchData.resourceId,
            }),
        });
        serverError("Failed to store watch subscription");
    }

    console.log(`✓ Created calendar watch for account ${accountId}, expires: ${watchData.expiration}`);

    return {
        success: true,
        watch: {
            channelId,
            resourceId: watchData.resourceId,
            expiration,
        },
    };
}

export async function stopCalendarWatch(
    supabase: ServerSupabaseClient,
    userId: string,
    input: Record<string, unknown>
) {
    const accountId = requiredAccountId(input.accountId);
    const channelId = typeof input.channelId === "string" ? input.channelId.trim() : "";
    if (!channelId) {
        badRequest("Account ID and Channel ID required");
    }

    const oauthRecord = await getUserGoogleOAuthRecord(supabase, userId, accountId);

    const { data: watch, error: watchError } = await supabase
        .from("google_calendar_watches")
        .select("*")
        .eq("channel_id", channelId)
        .eq("user_id", userId)
        .single();

    if (watchError || !watch) {
        throw new ApiError("Watch not found", 404);
    }

    const accessToken = await refreshGoogleAccessToken(supabase, oauthRecord);

    await fetch("https://www.googleapis.com/calendar/v3/channels/stop", {
        method: "POST",
        headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            id: channelId,
            resourceId: watch.resource_id,
        }),
    });

    await supabase
        .from("google_calendar_watches")
        .delete()
        .eq("channel_id", channelId);

    return { success: true };
}

export async function listCalendarWatches(
    supabase: ServerSupabaseClient,
    userId: string,
    accountIdParam: string | null
) {
    let query = supabase
        .from("google_calendar_watches")
        .select("*")
        .eq("user_id", userId)
        .gt("expiration", new Date().toISOString());

    if (accountIdParam) {
        query = query.eq("google_oauth_id", parseInt(accountIdParam));
    }

    const { data: watches, error } = await query;

    if (error) {
        serverError("Failed to fetch watches");
    }

    return watches || [];
}

export async function renewExpiringCalendarWatches(supabase: SupabaseClient) {
    const expirationThreshold = new Date();
    expirationThreshold.setHours(expirationThreshold.getHours() + 24);

    const { data: expiringWatches, error: fetchError } = await supabase
        .from("google_calendar_watches")
        .select("*, user_google_oauth(*)")
        .lt("expiration", expirationThreshold.toISOString())
        .gt("expiration", new Date().toISOString());

    if (fetchError) {
        console.error("[Renew] Failed to fetch expiring watches:", fetchError);
        serverError("Failed to fetch watches");
    }

    if (!expiringWatches || expiringWatches.length === 0) {
        console.log("[Renew] No watches expiring soon");
        return { renewed: 0, failed: 0 };
    }

    console.log(`[Renew] Found ${expiringWatches.length} watches expiring soon`);

    let renewed = 0;
    let failed = 0;

    for (const watch of expiringWatches as RenewWatchRecord[]) {
        const oauthRecord = watch.user_google_oauth;

        try {
            const accessToken = await refreshGoogleAccessToken(supabase, oauthRecord);

            await fetch("https://www.googleapis.com/calendar/v3/channels/stop", {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    id: watch.channel_id,
                    resourceId: watch.resource_id,
                }),
            });

            const newChannelId = uuidv4();
            const webhookUrl = `${appUrl}/api/google-calendar/webhook`;

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
                const errorData = await readGoogleError(watchResponse);
                console.error(`[Renew] Failed to create new watch for account ${oauthRecord.id}:`, errorData);
                failed++;
                continue;
            }

            const watchData = await watchResponse.json();

            await supabase
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

    const { data: expiredWatches } = await supabase
        .from("google_calendar_watches")
        .select("id")
        .lt("expiration", new Date().toISOString());

    if (expiredWatches && expiredWatches.length > 0) {
        await supabase
            .from("google_calendar_watches")
            .delete()
            .lt("expiration", new Date().toISOString());

        console.log(`[Renew] Cleaned up ${expiredWatches.length} expired watches`);
    }

    return {
        renewed,
        failed,
        expiredCleaned: expiredWatches?.length || 0,
    };
}
