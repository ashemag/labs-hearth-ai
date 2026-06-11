import { NextResponse } from "next/server";
import {
    optionalNullableString,
    optionalString,
    readJsonObject,
    requiredNumber,
    withUser,
} from "@/server/api/route";
import {
    createCompliment,
    deleteCompliment,
    listStandaloneCompliments,
    updateCompliment,
} from "@/server/rolodex/compliments";

// GET - Fetch standalone compliments
export const GET = withUser(async (_req, { supabase, user }) => {
    const compliments = await listStandaloneCompliments(supabase, user.id);
    return NextResponse.json({ compliments });
});

// POST - Add a compliment
export const POST = withUser(async (req, { supabase, user }) => {
    const contentType = req.headers.get("content-type") || "";
    let peopleId: number | null = null;
    let compliment: string | null = null;
    let context: string | null = null;
    let receivedAt: string | null = null;
    let sourceName: string | null = null;
    let imageFile: File | null = null;

    if (contentType.includes("multipart/form-data")) {
        const formData = await req.formData();
        peopleId = formData.get("people_id") ? Number(formData.get("people_id")) : null;
        compliment = (formData.get("compliment") as string) || null;
        context = (formData.get("context") as string) || null;
        receivedAt = (formData.get("received_at") as string) || null;
        sourceName = (formData.get("source_name") as string) || null;
        const image = formData.get("image");
        imageFile = image instanceof File ? image : null;
    } else {
        const body = await readJsonObject(req);
        peopleId = body.people_id ? Number(body.people_id) : null;
        compliment = optionalNullableString(body.compliment) || null;
        context = optionalNullableString(body.context) || null;
        receivedAt = optionalNullableString(body.received_at) || null;
        sourceName = optionalNullableString(body.source_name) || null;
    }

    const created = await createCompliment(supabase, user.id, {
        peopleId,
        compliment,
        context,
        receivedAt,
        sourceName,
        imageFile,
    });
    return NextResponse.json({ compliment: created });
});

// PATCH - Update an existing compliment
export const PATCH = withUser(async (req, { supabase, user }) => {
    const body = await readJsonObject(req);
    const complimentId = requiredNumber(body.compliment_id, "compliment_id");
    const compliment = optionalString(body.compliment);
    const context = optionalNullableString(body.context);
    const receivedAt = optionalNullableString(body.received_at);
    const sourceName = optionalNullableString(body.source_name);

    const updated = await updateCompliment(supabase, user.id, {
        complimentId,
        compliment,
        context,
        receivedAt,
        sourceName,
    });
    return NextResponse.json({ compliment: updated });
});

// DELETE - Remove a compliment
export const DELETE = withUser(async (req, { supabase, user }) => {
    const { searchParams } = new URL(req.url);
    const complimentId = requiredNumber(searchParams.get("id"), "Compliment ID");

    await deleteCompliment(supabase, user.id, complimentId);
    return NextResponse.json({ success: true });
});
