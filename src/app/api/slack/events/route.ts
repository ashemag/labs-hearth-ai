// app/api/slack/events/route.ts
// Handles Slack Events API (multi-workspace)
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

const SLACK_SIGNING_SECRET = process.env.SLACK_SIGNING_SECRET;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Fail fast if critical security env vars are missing
if (!SLACK_SIGNING_SECRET) {
  console.error("❌ CRITICAL: SLACK_SIGNING_SECRET environment variable is not set!");
}

// Helper to get bot token for a workspace
async function getBotToken(teamId: string): Promise<string | null> {
  const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const { data, error } = await sb
    .from("slack_tokens")
    .select("bot_token")
    .eq("team_id", teamId)
    .single();

  if (error || !data) {
    console.error(`❌ [SLACK EVENTS] No token found for team ${teamId}:`, error);
    return null;
  }
  return data.bot_token;
}

// Verify Slack request signature
function verifySlackRequest(
  signature: string | null,
  timestamp: string | null,
  body: string
): boolean {
  if (!SLACK_SIGNING_SECRET || !signature || !timestamp) {
    return false;
  }

  // Check timestamp to prevent replay attacks (within 5 minutes)
  const currentTime = Math.floor(Date.now() / 1000);
  if (Math.abs(currentTime - parseInt(timestamp)) > 300) {
    console.error("❌ Slack request timestamp too old");
    return false;
  }

  const sigBasestring = `v0:${timestamp}:${body}`;
  const expectedSignature = `v0=${crypto
    .createHmac("sha256", SLACK_SIGNING_SECRET)
    .update(sigBasestring)
    .digest("hex")}`;

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

export async function POST(req: NextRequest) {
  console.log("📥 [SLACK EVENTS] Received event");

  const rawBody = await req.text();
  const signature = req.headers.get("x-slack-signature");
  const timestamp = req.headers.get("x-slack-request-timestamp");

  // Verify the request is from Slack
  if (!verifySlackRequest(signature, timestamp, rawBody)) {
    console.error("❌ [SLACK EVENTS] Invalid signature");
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let body;
  try {
    body = JSON.parse(rawBody);
  } catch {
    console.error("❌ [SLACK EVENTS] Invalid JSON");
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Handle URL verification challenge (required for Slack Event API setup)
  if (body.type === "url_verification") {
    console.log("✅ [SLACK EVENTS] URL verification challenge");
    return NextResponse.json({ challenge: body.challenge });
  }

  // Handle event callbacks
  if (body.type === "event_callback") {
    const event = body.event;
    console.log(`📨 [SLACK EVENTS] Event type: ${event?.type}, subtype: ${event?.subtype || "none"}`);

    // Acknowledge receipt immediately (Slack expects response within 3 seconds)
    // Process the event asynchronously if needed
    
    // TODO: Add your event processing logic here
    // Examples:
    // - message.channels: Handle channel messages
    // - message.groups: Handle private channel messages  
    // - reaction_added: Handle emoji reactions
    
    return NextResponse.json({ ok: true });
  }

  // Unknown event type
  console.log(`⚠️ [SLACK EVENTS] Unknown event type: ${body.type}`);
  return NextResponse.json({ ok: true });
}

