import { ApiError, badRequest, type ServerSupabaseClient } from "@/server/api/route";
import { refreshGoogleAccessToken, type GoogleOAuthTokenRecord } from "@/server/google-calendar/tokens";

interface GoogleOAuthRecord extends GoogleOAuthTokenRecord {
    user_id: string;
    google_email: string;
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

export function normalizeEmail(email: string): string {
    return email.toLowerCase().trim();
}

function requiredAccountId(value: unknown) {
    const accountId = typeof value === "number" ? value : Number(value);
    if (!Number.isFinite(accountId) || accountId <= 0) {
        badRequest("Account ID required");
    }

    return accountId;
}

async function loadUserGoogleOAuthRecord(
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

async function listCalendarEvents(
    supabase: ServerSupabaseClient,
    oauthRecord: GoogleOAuthRecord,
    accessToken: string
) {
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

    if (oauthRecord.sync_cursor) {
        calendarParams.set("syncToken", oauthRecord.sync_cursor);
        calendarParams.delete("timeMin");
        calendarParams.delete("timeMax");
    }

    let events: CalendarEvent[] = [];
    let nextPageToken: string | undefined;
    let newSyncToken: string | undefined;

    do {
        const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?${calendarParams.toString()}${nextPageToken ? `&pageToken=${nextPageToken}` : ""}`;

        const response = await fetch(url, {
            headers: { Authorization: `Bearer ${accessToken}` },
        });

        if (!response.ok) {
            if (response.status === 410 && oauthRecord.sync_cursor) {
                console.log("Sync token expired, doing full sync");
                await supabase
                    .from("user_google_oauth")
                    .update({ sync_cursor: null })
                    .eq("id", oauthRecord.id);

                throw new ApiError("Sync token expired, please try again", 409, {
                    error: "Sync token expired, please try again",
                    retry: true,
                });
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

    return { events, newSyncToken };
}

export async function syncGoogleCalendarAccount(
    supabase: ServerSupabaseClient,
    userId: string,
    input: Record<string, unknown>
) {
    const accountId = requiredAccountId(input.accountId);
    const oauthRecord = await loadUserGoogleOAuthRecord(supabase, userId, accountId);

    try {
        const accessToken = await refreshGoogleAccessToken(supabase, oauthRecord);

        const { data: userProfile } = await supabase
            .from("user_profiles")
            .select("linked_emails")
            .eq("id", userId)
            .single();

        const linkedEmails = new Set(
            ((userProfile?.linked_emails || []) as string[]).map((email) => normalizeEmail(email))
        );

        const { data: contacts } = await supabase
            .from("people")
            .select(`
                id,
                name,
                people_contact_info (type, value)
            `)
            .eq("user_id", userId);

        const emailToContact = new Map<string, number>();
        for (const contact of contacts || []) {
            const contactInfo = (contact as { people_contact_info?: Array<{ type: string; value: string }> }).people_contact_info || [];
            for (const info of contactInfo) {
                if (info.type === "email") {
                    emailToContact.set(normalizeEmail(info.value), contact.id);
                }
            }
        }

        const { events, newSyncToken } = await listCalendarEvents(supabase, oauthRecord, accessToken);

        let syncedCount = 0;
        let linkedCount = 0;
        const userEmail = normalizeEmail(oauthRecord.google_email);

        for (const event of events) {
            if (!event.start?.dateTime && !event.start?.date) continue;

            const attendees = (event.attendees || []).filter(
                (attendee) =>
                    !attendee.self &&
                    normalizeEmail(attendee.email) !== userEmail &&
                    !linkedEmails.has(normalizeEmail(attendee.email))
            );

            if (attendees.length === 0) continue;

            const isOrganizer = event.organizer?.self || false;
            const eventStart = event.start.dateTime || event.start.date;
            const eventEnd = event.end?.dateTime || event.end?.date;

            for (const attendee of attendees) {
                const attendeeEmail = normalizeEmail(attendee.email);
                const contactId = emailToContact.get(attendeeEmail) || null;

                const { error: upsertError } = await supabase
                    .from("people_calendar_events")
                    .upsert({
                        user_id: userId,
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

                        const eventDate = new Date(eventStart!);
                        if (eventDate <= new Date()) {
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

        await supabase
            .from("user_google_oauth")
            .update({
                sync_cursor: newSyncToken || null,
                last_sync_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            })
            .eq("id", oauthRecord.id);

        console.log(`✓ Synced ${syncedCount} calendar events (${linkedCount} linked to contacts)`);

        return {
            success: true,
            eventsProcessed: events.length,
            eventsSynced: syncedCount,
            eventsLinked: linkedCount,
        };
    } catch (err) {
        if (err instanceof ApiError) {
            throw err;
        }

        console.error("Sync error:", err);
        throw new ApiError(err instanceof Error ? err.message : "Sync failed", 500);
    }
}
