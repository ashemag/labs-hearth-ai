import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Normalize phone number
function normalizePhone(phone: string): string {
    const digits = phone.replace(/\D/g, '');
    if (digits.length === 11 && digits.startsWith('1')) {
        return digits.slice(1);
    }
    return digits;
}

// GET - Fetch contact info for a specific contact
export async function GET(req: NextRequest) {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const peopleId = searchParams.get("people_id");

    if (!peopleId) {
        return NextResponse.json({ error: "people_id is required" }, { status: 400 });
    }

    try {
        const { data, error } = await supabase
            .from("people_contact_info")
            .select("*")
            .eq("user_id", user.id)
            .eq("people_id", parseInt(peopleId))
            .order("created_at", { ascending: true });

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ contact_info: data || [] });
    } catch (error) {
        console.error("Error fetching contact info:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

// POST - Add phone/email to a contact
export async function POST(req: NextRequest) {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await req.json();
        const { people_id, type, value } = body;

        if (!people_id || !type || !value) {
            return NextResponse.json({ error: "people_id, type, and value are required" }, { status: 400 });
        }

        if (!['phone', 'email'].includes(type)) {
            return NextResponse.json({ error: "type must be 'phone' or 'email'" }, { status: 400 });
        }

        // Normalize the value
        const normalizedValue = type === 'phone'
            ? normalizePhone(value)
            : value.toLowerCase().trim();

        const { data, error } = await supabase
            .from("people_contact_info")
            .insert({
                user_id: user.id,
                people_id,
                type,
                value: normalizedValue,
            })
            .select()
            .single();

        if (error) {
            if (error.code === '23505') { // Unique violation
                return NextResponse.json({ error: "This contact info already exists" }, { status: 409 });
            }
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, contact_info: data });
    } catch (error) {
        console.error("Error adding contact info:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

// DELETE - Remove phone/email from a contact
export async function DELETE(req: NextRequest) {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
        return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    try {
        const { error } = await supabase
            .from("people_contact_info")
            .delete()
            .eq("id", parseInt(id))
            .eq("user_id", user.id);

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error deleting contact info:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
