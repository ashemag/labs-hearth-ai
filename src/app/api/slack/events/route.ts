// app/api/slack/events/route.ts
// Handles Slack Events API for people channel messages (multi-workspace)
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { waitUntil } from "@vercel/functions";
import crypto from "crypto";
import { getValidSlackToken, getUserIdForWorkspace, forceRefreshSlackToken } from "@/lib/slack/token-manager";
import { processPeopleMessage } from "@/lib/people/processor";

const SLACK_SIGNING_SECRET = process.env.SLACK_SIGNING_SECRET;

// HARDCODED PEOPLE CHANNEL ID - update this to your channel
const PEOPLE_CHANNEL_ID = process.env.SLACK_PEOPLE_CHANNEL_ID || "C09MPL84L6S";

// Message subtypes to ignore
const IGNORED_MESSAGE_SUBTYPES = new Set([
  "bot_message",
  "message_changed",
  "message_deleted",
  "channel_join",
  "channel_leave",
  "channel_topic",
  "channel_purpose",
  "channel_name",
  "channel_archive",
  "channel_unarchive",
  "group_join",
  "group_leave",
]);

// Fail fast if critical security env vars are missing
if (!SLACK_SIGNING_SECRET) {
  console.error("❌ CRITICAL: SLACK_SIGNING_SECRET environment variable is not set!");
}

// Simple rate limiter
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 10;

function checkRateLimit(identifier: string): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(identifier);

  if (!record || now > record.resetAt) {
    rateLimitMap.set(identifier, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }

  if (record.count >= RATE_LIMIT_MAX_REQUESTS) {
    return false;
  }

  record.count++;
  return true;
}

// Event deduplication
const processedEvents = new Map<string, number>();
const EVENT_DEDUP_WINDOW_MS = 60 * 60 * 1000;

function isEventProcessed(eventId: string): boolean {
  const now = Date.now();

  // Clean up old entries
  processedEvents.forEach((timestamp, id) => {
    if (now - timestamp > EVENT_DEDUP_WINDOW_MS) {
      processedEvents.delete(id);
    }
  });

  if (processedEvents.has(eventId)) {
    return true;
  }

  processedEvents.set(eventId, now);
  return false;
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

// Add reaction to message
async function addReaction(teamId: string, channel: string, timestamp: string, emoji: string, retryCount = 0) {
  try {
    const slackToken = await getValidSlackToken(teamId);

    const response = await fetch("https://slack.com/api/reactions.add", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${slackToken}`,
      },
      body: JSON.stringify({ channel, timestamp, name: emoji }),
    });

    const result = await response.json();

    if (!result.ok) {
      if (result.error === "already_reacted") return;

      if (result.error === "token_expired" && retryCount === 0) {
        console.log("⚠️ Token expired, forcing refresh and retrying...");
        await forceRefreshSlackToken(teamId);
        return await addReaction(teamId, channel, timestamp, emoji, retryCount + 1);
      }
      console.error(`❌ Failed to add reaction: ${result.error}`);
    }
  } catch (err) {
    console.error("❌ Exception adding reaction:", err);
  }
}

// Remove reaction from message
async function removeReaction(teamId: string, channel: string, timestamp: string, emoji: string, retryCount = 0) {
  try {
    const slackToken = await getValidSlackToken(teamId);

    const response = await fetch("https://slack.com/api/reactions.remove", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${slackToken}`,
      },
      body: JSON.stringify({ channel, timestamp, name: emoji }),
    });

    const result = await response.json();

    if (!result.ok && result.error !== "no_reaction") {
      if (result.error === "token_expired" && retryCount === 0) {
        await forceRefreshSlackToken(teamId);
        return await removeReaction(teamId, channel, timestamp, emoji, retryCount + 1);
      }
      console.error(`❌ Failed to remove reaction: ${result.error}`);
    }
  } catch (err) {
    console.error("❌ Exception removing reaction:", err);
  }
}

// Post message to Slack
async function postMessage(teamId: string, channel: string, text: string, threadTs?: string, retryCount = 0) {
  try {
    const slackToken = await getValidSlackToken(teamId);

    const response = await fetch("https://slack.com/api/chat.postMessage", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${slackToken}`,
      },
      body: JSON.stringify({
        channel,
        text,
        thread_ts: threadTs,
        unfurl_links: false,
        unfurl_media: false,
      }),
    });

    const result = await response.json();

    if (!result.ok) {
      if (result.error === "token_expired" && retryCount === 0) {
        await forceRefreshSlackToken(teamId);
        return await postMessage(teamId, channel, text, threadTs, retryCount + 1);
      }
      console.error(`❌ Failed to post message: ${result.error}`);
    }
  } catch (err) {
    console.error("❌ Exception posting message:", err);
  }
}

// Get parent message for thread context
async function getParentMessage(teamId: string, channel: string, threadTs: string, retryCount = 0): Promise<string | null> {
  try {
    const slackToken = await getValidSlackToken(teamId);

    const response = await fetch(
      `https://slack.com/api/conversations.history?channel=${channel}&latest=${threadTs}&limit=1&inclusive=true`,
      {
        headers: { "Authorization": `Bearer ${slackToken}` },
      }
    );

    const result = await response.json();

    if (!result.ok) {
      if (result.error === "token_expired" && retryCount === 0) {
        await forceRefreshSlackToken(teamId);
        return await getParentMessage(teamId, channel, threadTs, retryCount + 1);
      }
      console.error(`❌ Failed to get parent message: ${result.error}`);
      return null;
    }

    return result.messages?.[0]?.text || null;
  } catch (err) {
    console.error("❌ Exception getting parent message:", err);
    return null;
  }
}

// Process people channel message asynchronously
async function processPeopleMessageAsync(
  teamId: string,
  userId: string,
  text: string,
  channel: string,
  timestamp: string,
  threadTs?: string
) {
  console.log("👤 [PEOPLE] Processing message for user:", userId);

  try {
    await addReaction(teamId, channel, timestamp, "thought_balloon");

    // Get parent message context if this is a thread reply
    let parentContext: string | null = null;
    if (threadTs) {
      parentContext = await getParentMessage(teamId, channel, threadTs);
    }

    // Process with OpenAI agent
    const result = await processPeopleMessage({
      userId,
      text,
      messageTs: timestamp,
      channelId: channel,
      parentMessage: parentContext || undefined,
    });

    await removeReaction(teamId, channel, timestamp, "thought_balloon");

    if (result.shouldRespond && result.response) {
      await addReaction(teamId, channel, timestamp, "white_check_mark");
      await postMessage(teamId, channel, result.response, threadTs || timestamp);
    } else if (result.toolsExecuted.length > 0) {
      await addReaction(teamId, channel, timestamp, "white_check_mark");
    }

    console.log("✅ [PEOPLE] Message processed successfully");
  } catch (error) {
    console.error("❌ [PEOPLE] Exception:", error);

    try {
      await removeReaction(teamId, channel, timestamp, "thought_balloon");
      await addReaction(teamId, channel, timestamp, "x");
      await postMessage(
        teamId,
        channel,
        "❌ Sorry, I encountered an error processing your message.",
        threadTs || timestamp
      );
    } catch (e) {
      console.error("❌ Failed to add error reaction:", e);
    }
  }
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

  // Handle URL verification challenge
  if (body.type === "url_verification") {
    console.log("✅ [SLACK EVENTS] URL verification challenge");
    return NextResponse.json({ challenge: body.challenge });
  }

  // Handle event callbacks
  if (body.type === "event_callback") {
    const event = body.event;
    const teamId = body.team_id;

    console.log(`📨 [SLACK EVENTS] Event: ${event?.type}, Channel: ${event?.channel}, Team: ${teamId}`);

    // Check for duplicate events
    const eventId = body.event_id || `${event?.channel}:${event?.ts}`;
    if (isEventProcessed(eventId)) {
      console.log("⏭️ Skipping duplicate event:", eventId);
      return NextResponse.json({ ok: true });
    }

    // Handle channel messages
    if (event?.type === "message" && !event.subtype) {
      const message = event;

      // Only process messages from the people channel
      if (message.channel !== PEOPLE_CHANNEL_ID) {
        console.log(`⏭️ Ignoring message from channel ${message.channel} (not people channel)`);
        return NextResponse.json({ ok: true });
      }

      // Ignore bot messages
      if (message.bot_id || message.bot_profile) {
        console.log("⏭️ Ignoring bot message");
        return NextResponse.json({ ok: true });
      }

      // Ignore empty messages
      if (!message.text || message.text.trim().length === 0) {
        console.log("⏭️ Ignoring empty message");
        return NextResponse.json({ ok: true });
      }

      // Get the user_id associated with this workspace
      const userId = await getUserIdForWorkspace(teamId);
      if (!userId) {
        console.error(`❌ No user found for workspace ${teamId}`);
        return NextResponse.json({ ok: true });
      }

      // Rate limiting
      const rateLimitKey = message.user || `channel:${message.channel}`;
      if (!checkRateLimit(rateLimitKey)) {
        console.log(`⚠️ Rate limit exceeded for ${rateLimitKey}`);
        await addReaction(teamId, message.channel, message.ts, "warning");
        return NextResponse.json({ ok: true });
      }

      console.log("👤 [SLACK EVENTS] Processing people channel message");

      // Process asynchronously so we can respond to Slack within 3 seconds
      waitUntil(
        processPeopleMessageAsync(
          teamId,
          userId,
          message.text,
          message.channel,
          message.ts,
          message.thread_ts
        ).catch(error => {
          console.error("❌ processPeopleMessageAsync error:", error);
        })
      );

      return NextResponse.json({ ok: true });
    }

    // Handle message subtypes we want to ignore
    if (event?.type === "message" && event.subtype && IGNORED_MESSAGE_SUBTYPES.has(event.subtype)) {
      console.log(`⏭️ Ignoring message subtype: ${event.subtype}`);
      return NextResponse.json({ ok: true });
    }
  }

  return NextResponse.json({ ok: true });
}
