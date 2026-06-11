import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { refreshGoogleAccessToken } from "@/server/google-calendar/tokens";

// Use service role client for webhook processing (no user context)
const supabaseAdmin = createAdminClient();

interface GoogleOAuthRecord {
    id: number;
    user_id: string;
    google_email: string;
    access_token_encrypted: string;
    refresh_token_encrypted: string;
    token_expiry: string;
    sync_cursor: string | null;
}

interface CalendarEvent {
    id: string;
    status?: string;
    summary?: string;
    description?: string;
    start: { dateTime?: string; date?: string };
    end?: { dateTime?: string; date?: string };
    location?: string;
    organizer?: { email: string; self?: boolean };
    attendees?: Array<{
        email: string;
        displayName?: string;
        responseStatus?: string;
        self?: boolean;
    }>;
}

// Normalize email for matching
function normalizeEmail(email: string): string {
    return email.toLowerCase().trim();
}

// Sync calendar events for a given OAuth record
async function syncCalendarEvents(oauthRecord: GoogleOAuthRecord): Promise<void> {
    const accessToken = await refreshGoogleAccessToken(supabaseAdmin, oauthRecord);

    // Get user's contacts for matching
    const { data: contacts } = await supabaseAdmin
        .from("people")
        .select(`
            id,
            name,
            people_contact_info (type, value)
        `)
        .eq("user_id", oauthRecord.user_id);

    // Build email to contact ID map
    const emailToContact = new Map<string, number>();
    for (const contact of contacts || []) {
        const contactInfo = (contact as { people_contact_info?: Array<{ type: string; value: string }> }).people_contact_info || [];
        for (const info of contactInfo) {
            if (info.type === "email") {
                emailToContact.set(normalizeEmail(info.value), contact.id);
            }
        }
    }

    // Fetch calendar events using sync token for incremental sync
    const calendarParams = new URLSearchParams({
        singleEvents: "true",
        maxResults: "2500",
    });

    // Use sync token for incremental sync if available
    if (oauthRecord.sync_cursor) {
        calendarParams.set("syncToken", oauthRecord.sync_cursor);
    } else {
        // Full sync: last 90 days to next 30 days
        const timeMin = new Date();
        timeMin.setDate(timeMin.getDate() - 90);
        const timeMax = new Date();
        timeMax.setDate(timeMax.getDate() + 30);
        calendarParams.set("timeMin", timeMin.toISOString());
        calendarParams.set("timeMax", timeMax.toISOString());
        calendarParams.set("orderBy", "startTime");
    }

    let events: CalendarEvent[] = [];
    let nextPageToken: string | undefined;
    let newSyncToken: string | undefined;

    // Paginate through all events
    do {
        const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?${calendarParams.toString()}${nextPageToken ? `&pageToken=${nextPageToken}` : ""}`;

        const response = await fetch(url, {
            headers: { Authorization: `Bearer ${accessToken}` },
        });

        if (!response.ok) {
            // If sync token is invalid, clear it and do full sync next time
            if (response.status === 410 && oauthRecord.sync_cursor) {
                console.log("[Webhook] Sync token expired, clearing for full sync");
                await supabaseAdmin
                    .from("user_google_oauth")
                    .update({ sync_cursor: null })
                    .eq("id", oauthRecord.id);
                return;
            }

            const errorData = await response.json();
            console.error("[Webhook] Calendar API error:", errorData);
            throw new Error(`Calendar API error: ${response.status}`);
        }

        const data = await response.json();
        events = events.concat(data.items || []);
        nextPageToken = data.nextPageToken;
        newSyncToken = data.nextSyncToken;

    } while (nextPageToken);

    // Process events and link to contacts
    let syncedCount = 0;
    let linkedCount = 0;
    const userEmail = normalizeEmail(oauthRecord.google_email);

    for (const event of events) {
        // Handle deleted events
        if (event.status === "cancelled") {
            await supabaseAdmin
                .from("people_calendar_events")
                .delete()
                .eq("google_oauth_id", oauthRecord.id)
                .eq("event_id", event.id);
            continue;
        }

        if (!event.start?.dateTime && !event.start?.date) continue;

        // Get all attendees except the user
        const attendees = (event.attendees || []).filter(
            a => !a.self && normalizeEmail(a.email) !== userEmail
        );

        // If no attendees (solo event), skip
        if (attendees.length === 0) continue;

        const isOrganizer = event.organizer?.self || false;
        const eventStart = event.start.dateTime || event.start.date;
        const eventEnd = event.end?.dateTime || event.end?.date;

        // Create an event record for each attendee
        for (const attendee of attendees) {
            const attendeeEmail = normalizeEmail(attendee.email);
            const contactId = emailToContact.get(attendeeEmail) || null;

            // Upsert the event
            const { error: upsertError } = await supabaseAdmin
                .from("people_calendar_events")
                .upsert({
                    user_id: oauthRecord.user_id,
                    people_id: contactId,
                    google_oauth_id: oauthRecord.id,
                    calendar_id: "primary",
                    event_id: event.id,
                    attendee_email: attendee.email,
                    attendee_name: attendee.displayName || null,
                    event_title: event.summary || null,
                    event_description: event.description || null,
                    event_start: eventStart,
                    event_end: eventEnd || null,
                    event_location: event.location || null,
                    is_organizer: isOrganizer,
                    response_status: attendee.responseStatus || null,
                    updated_at: new Date().toISOString(),
                }, {
                    onConflict: "user_id,google_oauth_id,calendar_id,event_id,attendee_email",
                });

            if (!upsertError) {
                syncedCount++;
                if (contactId) {
                    linkedCount++;

                    // Update last_touchpoint on the contact
                    const eventDate = new Date(eventStart!);
                    if (eventDate <= new Date()) {  // Only past events
                        await supabaseAdmin
                            .from("people")
                            .update({ last_touchpoint: eventStart })
                            .eq("id", contactId)
                            .or(`last_touchpoint.is.null,last_touchpoint.lt.${eventStart}`);
                    }
                }
            }
        }
    }

    // Update sync cursor and last_sync_at
    await supabaseAdmin
        .from("user_google_oauth")
        .update({
            sync_cursor: newSyncToken || null,
            last_sync_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        })
        .eq("id", oauthRecord.id);

    console.log(`[Webhook] Synced ${syncedCount} events (${linkedCount} linked) for account ${oauthRecord.id}`);
}

// POST - Receive push notifications from Google Calendar
export async function POST(req: NextRequest) {
    // Google sends specific headers with push notifications
    const channelId = req.headers.get("X-Goog-Channel-ID");
    const resourceId = req.headers.get("X-Goog-Resource-ID");
    const resourceState = req.headers.get("X-Goog-Resource-State");
    const messageNumber = req.headers.get("X-Goog-Message-Number");

    console.log(`[Webhook] Received notification: channel=${channelId}, state=${resourceState}, msg=${messageNumber}`);

    // Validate required headers
    if (!channelId || !resourceId) {
        console.error("[Webhook] Missing required headers");
        return NextResponse.json({ error: "Missing headers" }, { status: 400 });
    }

    // Handle sync message (initial verification from Google)
    if (resourceState === "sync") {
        console.log("[Webhook] Received sync verification");
        return NextResponse.json({ ok: true });
    }

    // Look up the watch subscription to find the associated account
    const { data: watch, error: watchError } = await supabaseAdmin
        .from("google_calendar_watches")
        .select("*, user_google_oauth(*)")
        .eq("channel_id", channelId)
        .single();

    if (watchError || !watch) {
        console.error("[Webhook] Watch not found for channel:", channelId);
        // Return 200 to prevent Google from retrying
        return NextResponse.json({ ok: true });
    }

    // Verify resource ID matches
    if (watch.resource_id !== resourceId) {
        console.error("[Webhook] Resource ID mismatch");
        return NextResponse.json({ ok: true });
    }

    const oauthRecord = watch.user_google_oauth as GoogleOAuthRecord;

    // Handle the notification based on state
    if (resourceState === "exists" || resourceState === "update") {
        try {
            // Trigger incremental sync for this account
            await syncCalendarEvents(oauthRecord);
        } catch (err) {
            console.error("[Webhook] Sync error:", err);
            // Still return 200 to prevent excessive retries
        }
    }

    // Always return 200 to acknowledge receipt
    return NextResponse.json({ ok: true });
}
