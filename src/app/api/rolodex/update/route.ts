import { NextResponse } from "next/server";
import {
    optionalNullableString,
    readJsonObject,
    requiredNumber,
    requiredString,
    withUser,
} from "@/server/api/route";
import { updateContact } from "@/server/rolodex/contacts";

// PATCH - Update a contact's details
export const PATCH = withUser(async (req, { supabase, user }) => {
    const body = await readJsonObject(req);
    const peopleId = requiredNumber(body.people_id, "people_id");
    const name = body.name === undefined ? undefined : requiredString(body.name, "name");
    const hidden = typeof body.hidden === "boolean" ? body.hidden : undefined;
    const customBio = optionalNullableString(body.custom_bio);
    const websiteUrl = optionalNullableString(body.website_url);
    const customLocation = optionalNullableString(body.custom_location);
    const lastTouchpoint = optionalNullableString(body.last_touchpoint);

    const person = await updateContact(supabase, user.id, {
        peopleId,
        name,
        hidden,
        customBio,
        websiteUrl,
        customLocation,
        lastTouchpoint,
    });

    return NextResponse.json({ success: true, person });
});
