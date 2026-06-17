import { NextResponse } from "next/server";
import { waitUntil } from "@vercel/functions";
import {
    readJsonObject,
    requiredEnum,
    requiredNumber,
    requiredString,
    withUser,
} from "@/server/api/route";
import {
    addContactInfo,
    deleteContactInfo,
    listContactInfo,
} from "@/server/rolodex/contact-info";
import { linkAttendeeToContact } from "@/server/google-calendar/accounts";
import { syncGoogleCalendarAccount } from "@/server/google-calendar/sync";

async function syncGoogleAccountsForUser(
    supabase: Parameters<typeof syncGoogleCalendarAccount>[0],
    userId: string
) {
    const { data: accounts, error } = await supabase
        .from("user_google_oauth")
        .select("id")
        .eq("user_id", userId);

    if (error) {
        console.error("Error fetching Google accounts for contact email match:", error);
        return { attempted: 0, failed: 0 };
    }

    let attempted = 0;
    let failed = 0;

    for (const account of accounts || []) {
        attempted++;
        try {
            await syncGoogleCalendarAccount(supabase, userId, { accountId: account.id });
        } catch (error) {
            if (
                error instanceof Error &&
                "status" in error &&
                (error as Error & { status?: number }).status === 409
            ) {
                try {
                    await syncGoogleCalendarAccount(supabase, userId, { accountId: account.id });
                    continue;
                } catch (retryError) {
                    console.warn("Calendar sync retry failed while adding contact email:", retryError);
                    failed++;
                    continue;
                }
            }

            console.warn("Calendar sync failed while adding contact email:", error);
            failed++;
        }
    }

    return { attempted, failed };
}

async function matchCalendarEventsForEmail(
    supabase: Parameters<typeof syncGoogleCalendarAccount>[0],
    userId: string,
    peopleId: number,
    attendeeEmail: string
) {
    const cachedLinkedCount = await linkAttendeeToContact(supabase, userId, {
        peopleId,
        attendeeEmail,
    });

    const syncResult = await syncGoogleAccountsForUser(supabase, userId);
    if (syncResult.attempted > 0 && syncResult.failed === syncResult.attempted) {
        console.warn("Calendar sync failed for every connected Google account while matching contact email");
    }

    const syncedLinkedCount = await linkAttendeeToContact(supabase, userId, {
        peopleId,
        attendeeEmail,
    });

    console.log(
        `Background calendar email match linked ${cachedLinkedCount + syncedLinkedCount} event(s) for contact ${peopleId}`
    );
}

// GET - Fetch contact info for a specific contact
export const GET = withUser(async (req, { supabase, user }) => {
    const { searchParams } = new URL(req.url);
    const peopleId = requiredNumber(searchParams.get("people_id"), "people_id");

    const contactInfo = await listContactInfo(supabase, user.id, peopleId);
    return NextResponse.json({ contact_info: contactInfo });
});

// POST - Add phone/email to a contact
export const POST = withUser(async (req, { supabase, user }) => {
    const body = await readJsonObject(req);
    const peopleId = requiredNumber(body.people_id, "people_id");
    const type = requiredEnum(body.type, ["phone", "email"] as const, "type");
    const value = requiredString(body.value, "value");

    const contactInfo = await addContactInfo(supabase, user.id, { peopleId, type, value });

    if (type === "email") {
        waitUntil(
            matchCalendarEventsForEmail(supabase, user.id, peopleId, contactInfo.value).catch((error) => {
                console.error("Background calendar email match failed:", error);
            })
        );
    }

    return NextResponse.json({
        success: true,
        contact_info: contactInfo,
        calendar_match_queued: type === "email",
    });
});

// DELETE - Remove phone/email from a contact
export const DELETE = withUser(async (req, { supabase, user }) => {
    const { searchParams } = new URL(req.url);
    const id = requiredNumber(searchParams.get("id"), "id");

    await deleteContactInfo(supabase, user.id, id);
    return NextResponse.json({ success: true });
});
