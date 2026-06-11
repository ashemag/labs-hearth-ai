import { NextResponse } from "next/server";
import { requiredNumber, withUser } from "@/server/api/route";
import { disconnectGoogleAccount, listGoogleAccounts } from "@/server/google-calendar/accounts";

// GET - List connected Google accounts
export const GET = withUser(async (_req, { supabase, user }) => {
    const accounts = await listGoogleAccounts(supabase, user.id);
    return NextResponse.json({ accounts });
});

// DELETE - Disconnect a Google account
export const DELETE = withUser(async (req, { supabase, user }) => {
    const { searchParams } = new URL(req.url);
    const accountId = requiredNumber(searchParams.get("id"), "Account ID");

    await disconnectGoogleAccount(supabase, user.id, accountId);
    return NextResponse.json({ success: true });
});
