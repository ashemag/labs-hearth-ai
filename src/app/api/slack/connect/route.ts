// app/api/slack/connect/route.ts
// Initiates Slack OAuth flow with user ID in state
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildSlackOAuthUrl } from "@/server/slack/workspaces";

export async function GET(req: NextRequest) {
  // Get the current user
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    console.error("❌ [SLACK CONNECT] User not authenticated");
    return NextResponse.redirect(new URL("/sign-in", req.url));
  }

  console.log(`[SLACK CONNECT] Initiating OAuth for user: ${user.id}`);
  const slackUrl = buildSlackOAuthUrl({ userId: user.id, origin: new URL(req.url).origin });

  console.log("[SLACK CONNECT] Redirecting to Slack OAuth");
  return NextResponse.redirect(slackUrl.toString());
}
