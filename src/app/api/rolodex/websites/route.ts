import { NextResponse } from "next/server";
import { readJsonObject, requiredNumber, requiredString, withUser } from "@/server/api/route";
import { addWebsite, deleteWebsite } from "@/server/rolodex/websites";

// POST - Add a website to a person
export const POST = withUser(async (req, { supabase, user }) => {
    const body = await readJsonObject(req);
    const peopleId = requiredNumber(body.people_id, "people_id");
    const url = requiredString(body.url, "url");

    const website = await addWebsite(supabase, user.id, { peopleId, url });
    return NextResponse.json({ website });
});

// DELETE - Remove a website
export const DELETE = withUser(async (req, { supabase, user }) => {
    const { searchParams } = new URL(req.url);
    const websiteId = requiredNumber(searchParams.get("id"), "Website ID");

    await deleteWebsite(supabase, user.id, websiteId);
    return NextResponse.json({ success: true });
});
