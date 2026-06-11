import { NextResponse } from "next/server";
import { withUser } from "@/server/api/route";
import { listContributionTouchpoints } from "@/server/rolodex/contributions";

// GET - Fetch raw touchpoint timestamps for contributions.
export const GET = withUser(async (_req, { supabase, user }) => {
    const touchpoints = await listContributionTouchpoints(supabase, user.id);
    return NextResponse.json({ touchpoints });
});
