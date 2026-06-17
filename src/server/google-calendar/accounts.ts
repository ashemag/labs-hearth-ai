import { createOAuthState } from "@/lib/oauth-state";
import { badRequest, serverError, type ServerSupabaseClient } from "@/server/api/route";

const googleClientId = process.env.GOOGLE_CLIENT_ID;
const scopes = [
    "https://www.googleapis.com/auth/calendar.readonly",
    "https://www.googleapis.com/auth/userinfo.email",
    "https://www.googleapis.com/auth/userinfo.profile",
].join(" ");

export function buildGoogleAuthUrl(
    userId: string,
    options: { loginHint?: string; redirectUri: string }
) {
    if (!googleClientId) {
        serverError("Google OAuth not configured");
    }

    const params = new URLSearchParams({
        client_id: googleClientId,
        redirect_uri: options.redirectUri,
        response_type: "code",
        scope: scopes,
        access_type: "offline",
        prompt: "consent",
        state: createOAuthState(userId, "google"),
    });

    if (options.loginHint) {
        params.set("login_hint", options.loginHint);
    }

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export async function listGoogleAccounts(supabase: ServerSupabaseClient, userId: string) {
    const { data: accounts, error } = await supabase
        .from("user_google_oauth")
        .select("id, google_email, google_name, last_sync_at, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: true });

    if (error) {
        console.error("Error fetching accounts:", error);
        serverError("Failed to fetch Google accounts");
    }

    return accounts || [];
}

export async function disconnectGoogleAccount(
    supabase: ServerSupabaseClient,
    userId: string,
    accountId: number
) {
    await supabase
        .from("people_calendar_events")
        .delete()
        .eq("user_id", userId)
        .eq("google_oauth_id", accountId);

    const { error } = await supabase
        .from("user_google_oauth")
        .delete()
        .eq("id", accountId)
        .eq("user_id", userId);

    if (error) {
        console.error("Error deleting account:", error);
        serverError("Failed to delete Google account");
    }
}

interface UnmatchedAttendee {
    attendee_email: string;
    attendee_name: string | null;
    event_count: number;
    latest_event: string;
}

export async function listUnmatchedAttendees(supabase: ServerSupabaseClient, userId: string) {
    const { data: userProfile } = await supabase
        .from("user_profiles")
        .select("linked_emails")
        .eq("id", userId)
        .single();

    const linkedEmails = new Set(
        ((userProfile?.linked_emails || []) as string[]).map((email) => email.toLowerCase().trim())
    );

    const { data: events, error } = await supabase
        .from("people_calendar_events")
        .select("attendee_email, attendee_name, event_start")
        .eq("user_id", userId)
        .is("people_id", null)
        .order("event_start", { ascending: false });

    if (error) {
        console.error("Error fetching unmatched:", error);
        serverError("Failed to fetch unmatched attendees");
    }

    const grouped = new Map<string, UnmatchedAttendee>();
    for (const event of events || []) {
        const email = event.attendee_email.toLowerCase();
        if (linkedEmails.has(email)) continue;

        if (!grouped.has(email)) {
            grouped.set(email, {
                attendee_email: event.attendee_email,
                attendee_name: event.attendee_name,
                event_count: 1,
                latest_event: event.event_start,
            });
        } else {
            const existing = grouped.get(email)!;
            existing.event_count++;
            if (!existing.attendee_name && event.attendee_name) {
                existing.attendee_name = event.attendee_name;
            }
        }
    }

    return Array.from(grouped.values()).sort((a, b) => b.event_count - a.event_count);
}

async function updateLatestTouchpoint(
    supabase: ServerSupabaseClient,
    userId: string,
    peopleId: number,
    onlyIfNewer: boolean
) {
    const { data: latestEvent } = await supabase
        .from("people_calendar_events")
        .select("event_start")
        .eq("user_id", userId)
        .eq("people_id", peopleId)
        .lte("event_start", new Date().toISOString())
        .order("event_start", { ascending: false })
        .limit(1)
        .single();

    if (!latestEvent) return;

    const query = supabase
        .from("people")
        .update({ last_touchpoint: latestEvent.event_start })
        .eq("id", peopleId);

    if (onlyIfNewer) {
        await query.or(`last_touchpoint.is.null,last_touchpoint.lt.${latestEvent.event_start}`);
    } else {
        await query;
    }
}

export async function linkAttendeeToContact(
    supabase: ServerSupabaseClient,
    userId: string,
    input: { attendeeEmail: string; peopleId: number }
) {
    const normalizedEmail = input.attendeeEmail.toLowerCase().trim();
    if (!normalizedEmail) {
        badRequest("attendee_email and people_id required");
    }

    const { error, count } = await supabase
        .from("people_calendar_events")
        .update({ people_id: input.peopleId, updated_at: new Date().toISOString() })
        .eq("user_id", userId)
        .ilike("attendee_email", input.attendeeEmail)
        .is("people_id", null);

    if (error) {
        console.error("Error linking events:", error);
        serverError("Failed to link calendar events");
    }

    const { data: existing } = await supabase
        .from("people_contact_info")
        .select("id")
        .eq("user_id", userId)
        .eq("people_id", input.peopleId)
        .eq("type", "email")
        .ilike("value", normalizedEmail)
        .limit(1);

    if (!existing || existing.length === 0) {
        await supabase
            .from("people_contact_info")
            .insert({
                user_id: userId,
                people_id: input.peopleId,
                type: "email",
                value: normalizedEmail,
            });
    }

    await updateLatestTouchpoint(supabase, userId, input.peopleId, true);
    console.log(`Linked ${count} calendar events for ${input.attendeeEmail} to contact ${input.peopleId}`);

    return count || 0;
}

export async function createContactForAttendee(
    supabase: ServerSupabaseClient,
    userId: string,
    input: { attendeeEmail: string; name: string }
) {
    const attendeeEmail = input.attendeeEmail.toLowerCase().trim();
    const name = input.name.trim();

    if (!attendeeEmail || !name) {
        badRequest("attendee_email and name required");
    }

    const { data: person, error } = await supabase
        .from("people")
        .insert({
            user_id: userId,
            name,
        })
        .select()
        .single();

    if (error || !person) {
        console.error("Error creating contact:", error);
        serverError("Failed to create contact");
    }

    await supabase
        .from("people_contact_info")
        .insert({
            user_id: userId,
            people_id: person.id,
            type: "email",
            value: attendeeEmail,
        });

    const { count } = await supabase
        .from("people_calendar_events")
        .update({ people_id: person.id, updated_at: new Date().toISOString() })
        .eq("user_id", userId)
        .ilike("attendee_email", input.attendeeEmail)
        .is("people_id", null);

    await updateLatestTouchpoint(supabase, userId, person.id, false);
    console.log(`Created contact ${name} and linked ${count} calendar events`);

    return { contact: person, linkedCount: count || 0 };
}
