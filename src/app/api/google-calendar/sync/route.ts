import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { decrypt, encrypt } from "@/lib/crypto";

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID!;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!;

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

// Normalize email for matching
function normalizeEmail(email: string): string {
    return email.toLowerCase().trim();
}

// POST - Sync calendar events for a specific account
export async function POST(req: NextRequest) {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { accountId } = body;

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
        // Get fresh access token
        const accessToken = await refreshAccessToken(supabase, oauthRecord as GoogleOAuthRecord);

        // Get user's linked emails to exclude from attendees
        const { data: userProfile } = await supabase
            .from("user_profiles")
            .select("linked_emails")
            .eq("id", user.id)
            .single();
        const linkedEmails = new Set(
            (userProfile?.linked_emails || []).map((e: string) => e.toLowerCase().trim())
        );

        // Get user's contacts for matching
        const { data: contacts } = await supabase
            .from("people")
            .select(`
                id,
                name,
                people_contact_info (type, value)
            `)
            .eq("user_id", user.id);

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

        // Fetch calendar events
        // Get events from the last 90 days and next 30 days
        const timeMin = new Date();
        timeMin.setDate(timeMin.getDate() - 90);
        const timeMax = new Date();
        timeMax.setDate(timeMax.getDate() + 30);

        const calendarParams = new URLSearchParams({
            timeMin: timeMin.toISOString(),
            timeMax: timeMax.toISOString(),
            singleEvents: "true",
            orderBy: "startTime",
            maxResults: "2500",
        });

        // Use sync token for incremental sync if available
        if (oauthRecord.sync_cursor) {
            calendarParams.set("syncToken", oauthRecord.sync_cursor);
            calendarParams.delete("timeMin");
            calendarParams.delete("timeMax");
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
                // If sync token is invalid, do a full sync
                if (response.status === 410 && oauthRecord.sync_cursor) {
                    console.log("Sync token expired, doing full sync");
                    // Clear sync cursor and retry
                    await supabase
                        .from("user_google_oauth")
                        .update({ sync_cursor: null })
                        .eq("id", oauthRecord.id);

                    return NextResponse.json({
                        error: "Sync token expired, please try again",
                        retry: true
                    }, { status: 409 });
                }

                const errorData = await response.json();
                console.error("Calendar API error:", errorData);
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
            if (!event.start?.dateTime && !event.start?.date) continue;

            // Get all attendees except the user and their linked emails
            const attendees = (event.attendees || []).filter(
                a => !a.self && normalizeEmail(a.email) !== userEmail && !linkedEmails.has(normalizeEmail(a.email))
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
                const { error: upsertError } = await supabase
                    .from("people_calendar_events")
                    .upsert({
                        user_id: user.id,
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
                            await supabase
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
        await supabase
            .from("user_google_oauth")
            .update({
                sync_cursor: newSyncToken || null,
                last_sync_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            })
            .eq("id", oauthRecord.id);

        console.log(`✓ Synced ${syncedCount} calendar events (${linkedCount} linked to contacts)`);

        return NextResponse.json({
            success: true,
            eventsProcessed: events.length,
            eventsSynced: syncedCount,
            eventsLinked: linkedCount,
        });

    } catch (err) {
        console.error("Sync error:", err);
        return NextResponse.json({
            error: err instanceof Error ? err.message : "Sync failed",
        }, { status: 500 });
    }
}
