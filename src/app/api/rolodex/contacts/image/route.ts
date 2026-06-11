import { NextResponse } from "next/server";
import { badRequest, requiredNumber, withUser } from "@/server/api/route";
import { removeContactProfileImage, uploadContactProfileImage } from "@/server/rolodex/contacts";

// POST - Upload a profile image for a contact
export const POST = withUser(async (req, { supabase, user }) => {
    const formData = await req.formData();
    const file = formData.get("file");
    const contactId = requiredNumber(formData.get("contactId"), "Contact ID");

    if (!(file instanceof File)) {
        badRequest("No file provided");
    }

    const url = await uploadContactProfileImage(supabase, user.id, { contactId, file });
    return NextResponse.json({ url });
});

// DELETE - Remove a contact's profile image
export const DELETE = withUser(async (req, { supabase, user }) => {
    const { searchParams } = new URL(req.url);
    const contactId = requiredNumber(searchParams.get("contactId"), "Contact ID");

    await removeContactProfileImage(supabase, user.id, contactId);
    return NextResponse.json({ success: true });
});
