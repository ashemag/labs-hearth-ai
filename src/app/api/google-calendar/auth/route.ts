import { NextResponse } from "next/server";
import { withUser } from "@/server/api/route";
import { buildGoogleAuthUrl } from "@/server/google-calendar/accounts";

// GET - Redirect to Google OAuth consent screen
export const GET = withUser(async (req, { user }) => {
    const requestUrl = new URL(req.url);
    const { searchParams } = requestUrl;
    const loginHint = searchParams.get("email") || undefined;
    const redirectUri = `${requestUrl.origin}/api/google-calendar/callback`;

    return NextResponse.json({ authUrl: buildGoogleAuthUrl(user.id, { loginHint, redirectUri }) });
});
