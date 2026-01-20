import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET - Check if a contact exists by name, LinkedIn URL, or X username
export async function GET(req: NextRequest) {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { searchParams } = new URL(req.url);
        const name = searchParams.get("name");
        const linkedinUrl = searchParams.get("linkedinUrl");
        const xUsername = searchParams.get("xUsername");

        if (!name && !linkedinUrl && !xUsername) {
            return NextResponse.json({ exists: false });
        }

        // Check by X username first (if provided)
        if (xUsername) {
            const cleanUsername = xUsername.replace(/^@/, '').toLowerCase();
            const { data: existingXProfile } = await supabase
                .from("people_x_profiles")
                .select("people_id")
                .eq("user_id", user.id)
                .ilike("username", cleanUsername)
                .single();

            if (existingXProfile) {
                return NextResponse.json({
                    exists: true,
                    contactId: existingXProfile.people_id,
                    matchedBy: "x",
                });
            }
        }

        // Check by LinkedIn URL
        if (linkedinUrl) {
            const match = linkedinUrl.match(/linkedin\.com\/in\/([a-zA-Z0-9\-_]+)/i);
            const linkedinUsername = match ? match[1].toLowerCase() : null;

            if (linkedinUsername) {
                const { data: existingProfile } = await supabase
                    .from("people_linkedin_profiles")
                    .select("people_id")
                    .eq("user_id", user.id)
                    .ilike("linkedin_url", `%/in/${linkedinUsername}%`)
                    .single();

                if (existingProfile) {
                    return NextResponse.json({
                        exists: true,
                        contactId: existingProfile.people_id,
                        matchedBy: "linkedin",
                    });
                }
            }
        }

        // Check by name
        if (name) {
            const { data: existingPerson } = await supabase
                .from("people")
                .select("id")
                .eq("user_id", user.id)
                .ilike("name", name.trim())
                .single();

            if (existingPerson) {
                return NextResponse.json({
                    exists: true,
                    contactId: existingPerson.id,
                    matchedBy: "name",
                });
            }
        }

        return NextResponse.json({ exists: false });

    } catch (error) {
        console.error("[Check Contact] Error:", error);
        return NextResponse.json({ exists: false });
    }
}
