import { NextResponse } from "next/server";
import {
    optionalNullableString,
    readJsonObject,
    requiredNumber,
    requiredString,
    withUser,
} from "@/server/api/route";
import {
    createRolodexList,
    deleteRolodexList,
    listRolodexLists,
    uniquePositiveIds,
    updateRolodexList,
} from "@/server/rolodex/lists";

// GET - Fetch all lists with member counts
export const GET = withUser(async (_req, { supabase, user }) => {
    const lists = await listRolodexLists(supabase, user.id);
    return NextResponse.json({ lists });
});

// POST - Create a new list
export const POST = withUser(async (req, { supabase, user }) => {
    const body = await readJsonObject(req);
    const name = requiredString(body.name, "Name");
    const color = optionalNullableString(body.color) || undefined;
    const peopleIds = uniquePositiveIds(body.people_ids);

    const list = await createRolodexList(supabase, user.id, { name, color, peopleIds });
    return NextResponse.json({ list });
});

// PATCH - Update a list
export const PATCH = withUser(async (req, { supabase, user }) => {
    const body = await readJsonObject(req);
    const id = requiredNumber(body.id, "List ID");
    const name = body.name === undefined ? undefined : requiredString(body.name, "Name");
    const color = optionalNullableString(body.color) || undefined;
    const emoji = optionalNullableString(body.emoji);
    const pinned = typeof body.pinned === "boolean" ? body.pinned : undefined;

    const list = await updateRolodexList(supabase, user.id, { id, pinned, name, color, emoji });
    return NextResponse.json({ list });
});

// DELETE - Delete a list
export const DELETE = withUser(async (req, { supabase, user }) => {
    const { searchParams } = new URL(req.url);
    const listId = requiredNumber(searchParams.get("id"), "List ID");

    await deleteRolodexList(supabase, user.id, listId);
    return NextResponse.json({ success: true });
});
