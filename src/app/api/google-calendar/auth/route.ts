import { NextResponse } from "next/server";
import { withUser } from "@/server/api/route";
import { buildGoogleAuthUrl } from "@/server/google-calendar/accounts";

// GET - Redirect to Google OAuth consent screen
export const GET = withUser(async (_req, { user }) => {
    return NextResponse.json({ authUrl: buildGoogleAuthUrl(user.id) });
});
