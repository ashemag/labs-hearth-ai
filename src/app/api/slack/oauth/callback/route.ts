// app/api/slack/oauth/callback/route.ts
// Handles OAuth callback when someone clicks "Add to Slack" (multi-workspace)
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const SLACK_CLIENT_ID = process.env.SLACK_CLIENT_ID!;
const SLACK_SECRET = process.env.SLACK_SECRET!;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Fail fast if critical env vars are missing
if (!SLACK_CLIENT_ID || !SLACK_SECRET) {
  console.error("❌ CRITICAL: SLACK_CLIENT_ID or SLACK_SECRET not set!");
}

export async function GET(req: NextRequest) {
  console.log("🔐 [SLACK OAUTH] Received OAuth callback");

  // 1) Get the authorization code and state from query params
  const searchParams = req.nextUrl.searchParams;
  const code = searchParams.get("code");
  const error = searchParams.get("error");
  const state = searchParams.get("state"); // Contains user_id

  // Handle user denial
  if (error) {
    console.log(`❌ [SLACK OAUTH] User denied authorization: ${error}`);
    return NextResponse.redirect(
      new URL("/slack/error?reason=access_denied", req.url)
    );
  }

  // Validate code exists
  if (!code) {
    console.error("❌ [SLACK OAUTH] No code parameter in callback");
    return NextResponse.redirect(
      new URL("/slack/error?reason=missing_code", req.url)
    );
  }

  // Parse state to get user_id
  let userId: string | null = null;
  if (state) {
    try {
      const stateData = JSON.parse(Buffer.from(state, 'base64').toString());
      userId = stateData.user_id;
      console.log(`✅ [SLACK OAUTH] User ID from state: ${userId}`);
    } catch {
      console.warn("⚠️ [SLACK OAUTH] Could not parse state parameter");
    }
  }

  console.log("✅ [SLACK OAUTH] Authorization code received");

  // 2) Exchange code for access token
  try {
    console.log("🔄 [SLACK OAUTH] Exchanging code for access token...");

    const response = await fetch("https://slack.com/api/oauth.v2.access", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: SLACK_CLIENT_ID,
        client_secret: SLACK_SECRET,
        code: code,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ [SLACK OAUTH] Slack API error: ${response.status} - ${errorText}`);
      return NextResponse.redirect(
        new URL("/slack/error?reason=api_error", req.url)
      );
    }

    const tokens = await response.json();

    // Check if Slack returned an error
    if (!tokens.ok) {
      console.error(`❌ [SLACK OAUTH] Slack returned error: ${tokens.error}`);
      return NextResponse.redirect(
        new URL(`/slack/error?reason=${tokens.error}`, req.url)
      );
    }

    console.log("✅ [SLACK OAUTH] Access token received");
    console.log(`   Team: ${tokens.team?.name} (${tokens.team?.id})`);
    console.log(`   User: ${tokens.authed_user?.id}`);
    console.log(`   Scopes: ${tokens.scope || 'none'}`);

    // 3) Store tokens in the slack_tokens table (keyed by team_id for multi-workspace)
    try {
      const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

      // Calculate expiration time (default to 12 hours if not provided)
      const expiresIn = tokens.expires_in || 43200; // 12 hours in seconds
      const expiresAt = new Date(Date.now() + (expiresIn * 1000)).toISOString();

      const tokenData: Record<string, unknown> = {
        team_id: tokens.team?.id,
        team_name: tokens.team?.name,
        bot_token: tokens.access_token,
        bot_user_id: tokens.bot_user_id,
        refresh_token: tokens.refresh_token,
        authed_user_id: tokens.authed_user?.id,
        scope: tokens.scope,
        expires_at: expiresAt,
        last_refreshed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Link to user if we have their ID
      if (userId) {
        tokenData.user_id = userId;
      }

      const { error } = await sb.from("slack_tokens").upsert(tokenData, {
        onConflict: "team_id",
        ignoreDuplicates: false,
      });

      if (error) {
        console.error("❌ [SLACK OAUTH] Failed to store tokens in database:", error);
        return NextResponse.redirect(
          new URL("/slack/error?reason=storage_failed", req.url)
        );
      }

      console.log("✅ [SLACK OAUTH] Tokens stored in database successfully");
      console.log(`   Team ID: ${tokens.team?.id}`);
      console.log(`   User ID: ${userId || 'not linked'}`);
    } catch (e) {
      console.error("❌ [SLACK OAUTH] Exception storing tokens:", e);
      return NextResponse.redirect(
        new URL("/slack/error?reason=storage_exception", req.url)
      );
    }

    // Log the full token response for debugging
    console.log("📝 [SLACK OAUTH] Full token response:", JSON.stringify({
      ok: tokens.ok,
      access_token: tokens.access_token ? "[REDACTED]" : undefined,
      team_id: tokens.team?.id,
      team_name: tokens.team?.name,
      authed_user_id: tokens.authed_user?.id,
      bot_user_id: tokens.bot_user_id,
      scope: tokens.scope,
    }));

    // 4) Redirect to success page
    console.log("🎉 [SLACK OAUTH] OAuth flow completed successfully");
    return NextResponse.redirect(
      new URL("/slack/success", req.url)
    );

  } catch (error) {
    console.error("❌ [SLACK OAUTH] Exception during OAuth flow:", error);
    return NextResponse.redirect(
      new URL("/slack/error?reason=exception", req.url)
    );
  }
}

