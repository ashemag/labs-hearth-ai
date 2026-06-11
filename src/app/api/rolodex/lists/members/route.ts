import { NextResponse } from "next/server";
import { ApiError, readJsonObject, requiredNumber, withUser } from "@/server/api/route";
import { addListMember, deleteListMember } from "@/server/rolodex/list-members";

// POST - Add a contact to a list
export const POST = withUser(async (req, { supabase, user }) => {
    const body = await readJsonObject(req);
    const listId = requiredNumber(body.list_id, "list_id");
    const peopleId = requiredNumber(body.people_id, "people_id");

    try {
        await addListMember(supabase, user.id, { listId, peopleId });
    } catch (error) {
        if (error instanceof ApiError && error.status === 409) {
            return NextResponse.json({ success: true, already_member: true });
        }
        throw error;
    }

    return NextResponse.json({ success: true });
});

// DELETE - Remove a contact from a list
export const DELETE = withUser(async (req, { supabase, user }) => {
    const { searchParams } = new URL(req.url);
    const listId = requiredNumber(searchParams.get("list_id"), "list_id");
    const peopleId = requiredNumber(searchParams.get("people_id"), "people_id");

    await deleteListMember(supabase, user.id, { listId, peopleId });
    return NextResponse.json({ success: true });
});
