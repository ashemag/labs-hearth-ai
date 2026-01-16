// app/api/slack/connect/route.ts
// Initiates Slack OAuth flow with user ID in state
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const SLACK_CLIENT_ID = process.env.SLACK_CLIENT_ID!;

export async function GET(req: NextRequest) {
  // Get the current user
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    console.error("❌ [SLACK CONNECT] User not authenticated");
    return NextResponse.redirect(new URL("/sign-in", req.url));
  }

  console.log(`🔗 [SLACK CONNECT] Initiating OAuth for user: ${user.id}`);

  // Create state parameter with user ID (base64 encoded)
  const state = Buffer.from(JSON.stringify({
    user_id: user.id,
    timestamp: Date.now(),
  })).toString('base64');

  // Build Slack OAuth URL
  const scopes = [
    "app_mentions:read",
    "channels:history",
    "channels:read",
    "chat:write",
    "commands",
    "files:write",
    "groups:history",
    "groups:read",
    "im:write",
    "reactions:read",
    "reactions:write",
    "files:read",
  ].join(",");

  const userScopes = ["im:history"].join(",");

  const slackUrl = new URL("https://slack.com/oauth/v2/authorize");
  slackUrl.searchParams.set("client_id", SLACK_CLIENT_ID);
  slackUrl.searchParams.set("scope", scopes);
  slackUrl.searchParams.set("user_scope", userScopes);
  slackUrl.searchParams.set("redirect_uri", `${new URL(req.url).origin}/api/slack/oauth/callback`);
  slackUrl.searchParams.set("state", state);

  console.log(`🔗 [SLACK CONNECT] Redirecting to Slack OAuth`);
  return NextResponse.redirect(slackUrl.toString());
}

