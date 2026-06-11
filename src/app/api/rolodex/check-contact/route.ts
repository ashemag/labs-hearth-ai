import { NextResponse } from "next/server";
import { withUser } from "@/server/api/route";
import { checkContactExists } from "@/server/rolodex/contacts";

// GET - Check if a contact exists by name, LinkedIn URL, or X username
export const GET = withUser(async (req, { supabase, user }) => {
    try {
        const { searchParams } = new URL(req.url);
        const result = await checkContactExists(supabase, user.id, {
            name: searchParams.get("name"),
            linkedinUrl: searchParams.get("linkedinUrl"),
            xUsername: searchParams.get("xUsername"),
        });

        return NextResponse.json(result);
    } catch (error) {
        console.error("[Check Contact] Error:", error);
        return NextResponse.json({ exists: false });
    }
});
