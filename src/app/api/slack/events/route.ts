// app/api/slack/events/route.ts
// Handles Slack Events API for people channel messages (multi-workspace)
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { waitUntil } from "@vercel/functions";
import crypto from "crypto";
import { getValidSlackToken, getUserIdForWorkspace, forceRefreshSlackToken } from "@/lib/slack/token-manager";
import { processPeopleMessage } from "@/lib/people/processor";
import { createAdminClient } from "@/lib/supabase/admin";
import { SLACK_PEOPLE_CHANNEL_ID } from "@/lib/constants";

// Supabase admin client for screenshot compliment processing
let supabase: ReturnType<typeof createAdminClient> | null = null;
try { supabase = createAdminClient(); } catch { supabase = null; }

const SLACK_SIGNING_SECRET = process.env.SLACK_SIGNING_SECRET;

const PEOPLE_CHANNEL_ID = SLACK_PEOPLE_CHANNEL_ID;

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
    new Uint8Array(Buffer.from(signature)),
    new Uint8Array(Buffer.from(expectedSignature))
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

// ============================================================================
// SCREENSHOT COMPLIMENT PROCESSING
// ============================================================================

// Supported image formats for OpenAI Vision API
const OPENAI_SUPPORTED_MIME_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/gif",
  "image/webp",
]);

// Detect actual image format from magic bytes
function detectImageFormat(buffer: ArrayBuffer): string | null {
  const bytes = new Uint8Array(buffer);

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47) {
    return "image/png";
  }

  // JPEG: FF D8 FF
  if (bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF) {
    return "image/jpeg";
  }

  // GIF: 47 49 46 38 (GIF8)
  if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x38) {
    return "image/gif";
  }

  // WebP: RIFF....WEBP
  if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
    bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) {
    return "image/webp";
  }

  return null;
}

// Get a supported image URL from Slack file
function getImageUrlAndMimeType(file: any): { url: string; mimeType: string; source: string } | null {
  const originalMimeType = file.mimetype || "image/png";
  const originalUrl = file.url_private_download || file.url_private;

  if (!originalUrl) {
    return null;
  }

  if (OPENAI_SUPPORTED_MIME_TYPES.has(originalMimeType)) {
    return { url: originalUrl, mimeType: originalMimeType, source: "original" };
  }

  return { url: originalUrl, mimeType: originalMimeType, source: "unsupported" };
}

// Process compliment screenshot from Slack
async function processComplimentScreenshotAsync(
  teamId: string,
  userId: string,
  files: any[],
  channel: string,
  timestamp: string,
  messageText: string = ""
) {
  try {
    // Check if user wants verbatim/full text extraction
    const lowerText = messageText.toLowerCase();
    const wantsVerbatim =
      lowerText.includes("verbatim") ||
      lowerText.includes("exact") ||
      lowerText.includes("full") ||
      lowerText.includes("everything") ||
      lowerText.includes("all of it") ||
      lowerText.includes("word for word");

    console.log("🖼️ [COMPLIMENT] Processing screenshot...", {
      wantsVerbatim,
      messageText,
      userId
    });

    await addReaction(teamId, channel, timestamp, "eyes");

    const slackToken = await getValidSlackToken(teamId);

    // Find first image file
    const imageFile = files.find((f: any) =>
      f.mimetype?.startsWith("image/") ||
      f.filetype === "png" ||
      f.filetype === "jpg" ||
      f.filetype === "jpeg" ||
      f.filetype === "gif" ||
      f.filetype === "webp"
    );

    if (!imageFile) {
      await addReaction(teamId, channel, timestamp, "x");
      await postMessage(teamId, channel, "❌ No image file found in the message.", timestamp);
      return;
    }

    // Get image URL
    const imageInfo = getImageUrlAndMimeType(imageFile);
    if (!imageInfo) {
      throw new Error("No download URL available for the file");
    }

    const { url: downloadUrl, mimeType, source } = imageInfo;

    // Reject unsupported formats upfront
    if (source === "unsupported") {
      await addReaction(teamId, channel, timestamp, "x");
      await postMessage(
        teamId,
        channel,
        `❌ Unsupported image format: ${mimeType}. Please upload a PNG, JPEG, GIF, or WebP image.`,
        timestamp
      );
      return;
    }

    // Download image from Slack
    let currentUrl = downloadUrl;
    let redirectCount = 0;
    const maxRedirects = 5;

    console.log("🖼️ [COMPLIMENT] Fetching image from Slack...");

    let fileResponse = await fetch(currentUrl, {
      headers: { Authorization: `Bearer ${slackToken}` },
      redirect: 'manual',
    });

    // Handle redirects
    while (fileResponse.status >= 300 && fileResponse.status < 400 && redirectCount < maxRedirects) {
      const location = fileResponse.headers.get('location');
      if (!location) {
        throw new Error(`Redirect without location header: ${fileResponse.status}`);
      }
      currentUrl = location;
      redirectCount++;
      fileResponse = await fetch(currentUrl, { redirect: 'manual' });
    }

    if (!fileResponse.ok) {
      throw new Error(`Failed to download file: ${fileResponse.status}`);
    }

    const fileBuffer = await fileResponse.arrayBuffer();
    const base64Image = Buffer.from(fileBuffer).toString("base64");
    const detectedFormat = detectImageFormat(fileBuffer);
    const actualMimeType = detectedFormat || mimeType;

    if (!OPENAI_SUPPORTED_MIME_TYPES.has(actualMimeType)) {
      await addReaction(teamId, channel, timestamp, "x");
      await postMessage(
        teamId,
        channel,
        `❌ Unsupported image format detected: ${actualMimeType}. Please convert to PNG, JPEG, GIF, or WebP.`,
        timestamp
      );
      return;
    }

    // Extract compliment using OpenAI Vision
    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
    if (!OPENAI_API_KEY) {
      throw new Error("OpenAI API key not configured");
    }

    const systemPrompt = wantsVerbatim
      ? `You are a text transcription assistant. Transcribe ALL visible text from screenshots exactly as written.
Extract:
1. The person's name or username who wrote the message
2. The FULL, COMPLETE text of their message(s) - transcribe EVERYTHING word for word
3. The context/platform (e.g., "Twitter DM", "Slack", "Text message", "iMessage")

Return JSON: {"personName": "...", "compliments": ["compliment 1", "compliment 2", ...], "context": "..."}
Only return valid JSON.`
      : `You extract compliments from screenshots of messages, tweets, DMs, or conversations.
Extract ALL compliments visible in the screenshot - there may be multiple!

Extract:
1. The person's name or username who gave the compliments
2. ALL compliment texts - each distinct compliment or kind statement should be a separate item
3. The context (e.g., "Twitter DM", "Slack", "Text message")

Return JSON: {"personName": "...", "compliments": ["compliment 1", "compliment 2", ...], "context": "..."}
Return an array even if there's only one compliment.
Only return valid JSON. If no clear compliment exists, return {"error": "No compliment found"}`;

    const userPrompt = wantsVerbatim
      ? "Transcribe ALL the text from this screenshot EXACTLY as written:"
      : "Extract the compliment from this screenshot:";

    console.log("🖼️ [COMPLIMENT] Calling OpenAI Vision API...");

    const visionResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              { type: "text", text: userPrompt },
              {
                type: "image_url",
                image_url: {
                  url: `data:${actualMimeType};base64,${base64Image}`,
                  detail: wantsVerbatim ? "high" : "auto"
                }
              }
            ]
          }
        ],
        max_tokens: wantsVerbatim ? 4000 : 500,
        temperature: 0.1,
      }),
    });

    if (!visionResponse.ok) {
      const errorBody = await visionResponse.text();
      console.error(`❌ [COMPLIMENT] OpenAI Vision API error: ${visionResponse.status}`, errorBody);
      throw new Error(`OpenAI Vision API error: ${visionResponse.status}`);
    }

    const visionData = await visionResponse.json();
    const content = visionData.choices?.[0]?.message?.content?.trim();

    if (!content) {
      throw new Error("No response from vision model");
    }

    // Parse the JSON response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Could not parse response from vision model");
    }

    const extracted = JSON.parse(jsonMatch[0]);

    if (extracted.error) {
      await addReaction(teamId, channel, timestamp, "x");
      await postMessage(teamId, channel, `❌ ${extracted.error}`, timestamp);
      return;
    }

    // First, check if user specified the person's name in their message (e.g., "compliment from Barra")
    const fromMatch = messageText.match(/(?:compliment\s+)?from\s+([A-Za-z][A-Za-z\s]+?)(?:\s*[:\-]|$)/i);
    const userSpecifiedName = fromMatch ? fromMatch[1].trim() : null;

    // Use user-specified name if provided, otherwise fall back to AI extraction
    const extractedPersonName = userSpecifiedName || extracted.personName || extracted.name || extracted.person || extracted.author || extracted.from || extracted.sender;
    const extractedContext = extracted.context || extracted.source || extracted.platform || null;

    // Handle both array and single compliment formats
    let extractedCompliments: string[] = [];
    if (Array.isArray(extracted.compliments)) {
      extractedCompliments = extracted.compliments;
    } else if (extracted.compliments) {
      extractedCompliments = [extracted.compliments];
    } else if (extracted.compliment) {
      extractedCompliments = [extracted.compliment];
    } else if (extracted.text) {
      extractedCompliments = [extracted.text];
    } else if (extracted.message) {
      extractedCompliments = [extracted.message];
    }

    console.log("🖼️ [COMPLIMENT] Extraction:", {
      userSpecifiedName,
      aiExtractedName: extracted.personName,
      finalName: extractedPersonName,
      complimentCount: extractedCompliments.length
    });

    if (!extractedPersonName || extractedCompliments.length === 0) {
      await addReaction(teamId, channel, timestamp, "x");
      const missingFields = [];
      if (!extractedPersonName) missingFields.push("person name");
      if (extractedCompliments.length === 0) missingFields.push("compliment text");
      await postMessage(teamId, channel, `❌ Could not extract ${missingFields.join(" and ")} from the image. Try a clearer screenshot.`, timestamp);
      return;
    }

    // Save to database
    if (!supabase) {
      throw new Error("Database not configured");
    }

    // Find or create person (user-scoped)
    const { data: existingPeople } = await supabase
      .from("people")
      .select("id, name")
      .eq("user_id", userId)
      .ilike("name", extractedPersonName);

    let personId: number;
    let personName: string;
    let isNewPerson = false;

    if (existingPeople && existingPeople.length > 0) {
      const exactMatch = existingPeople.find(p => p.name.toLowerCase() === extractedPersonName.toLowerCase());
      const person = exactMatch || existingPeople[0];
      personId = person.id;
      personName = person.name;
    } else {
      const { data: newPerson, error: createError } = await supabase
        .from("people")
        .insert({ user_id: userId, name: extractedPersonName })
        .select("id, name")
        .single();

      if (createError) {
        throw new Error(`Failed to create person: ${createError.message}`);
      }
      personId = newPerson.id;
      personName = newPerson.name;
      isNewPerson = true;
    }

    // Create all compliments (user-scoped)
    const complimentInserts = extractedCompliments.map(compliment => ({
      user_id: userId,
      people_id: personId,
      compliment,
      context: extractedContext,
    }));

    const { error: complimentError } = await supabase
      .from("people_compliments")
      .insert(complimentInserts);

    if (complimentError) {
      throw new Error(`Failed to save compliments: ${complimentError.message}`);
    }

    console.log(`✅ [COMPLIMENT] Saved ${extractedCompliments.length} compliment(s) from ${personName}`);

    await removeReaction(teamId, channel, timestamp, "eyes");
    await addReaction(teamId, channel, timestamp, "white_check_mark");
    await addReaction(teamId, channel, timestamp, "sparkles");

    const newPersonNote = isNewPerson ? " (new contact added)" : "";
    const verbatimNote = wantsVerbatim ? " _(verbatim)_" : "";
    const complimentCount = extractedCompliments.length > 1 ? `${extractedCompliments.length} compliments` : "Compliment";

    // Format compliments for display
    const complimentsDisplay = extractedCompliments.length > 1
      ? extractedCompliments.map((c, i) => `${i + 1}. "${c}"`).join("\n")
      : `"${extractedCompliments[0]}"`;

    await postMessage(
      teamId,
      channel,
      `✨ *${complimentCount} saved!*${verbatimNote}\n\n` +
      `*From:* ${personName}${newPersonNote}\n` +
      `*Said:*\n${complimentsDisplay}\n` +
      (extractedContext ? `*Context:* ${extractedContext}` : ""),
      timestamp
    );

  } catch (error) {
    console.error("❌ [COMPLIMENT] Error processing screenshot:", error);
    await removeReaction(teamId, channel, timestamp, "eyes");
    await addReaction(teamId, channel, timestamp, "x");
    await postMessage(
      teamId,
      channel,
      `❌ Error processing screenshot: ${error instanceof Error ? error.message : "Unknown error"}`,
      timestamp
    );
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

    console.log(`📨 [SLACK EVENTS] Event: ${event?.type}, Channel: ${event?.channel}, Team: ${teamId}, Subtype: ${event?.subtype || 'none'}`);

    // Check for duplicate events
    const eventId = body.event_id || `${event?.channel}:${event?.ts}`;
    if (isEventProcessed(eventId)) {
      console.log("⏭️ Skipping duplicate event:", eventId);
      return NextResponse.json({ ok: true });
    }

    // Handle channel messages (including file_share for screenshot compliments)
    if (event?.type === "message" && (!event.subtype || event.subtype === "file_share")) {
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

      // Check if message has files (for compliment screenshot processing)
      const hasFiles = message.files && message.files.length > 0;
      const isComplimentScreenshot = hasFiles && message.text?.toLowerCase().includes("compliment");

      // If there's a file and it mentions compliment, process it as screenshot
      if (isComplimentScreenshot) {
        console.log("🖼️ [SLACK EVENTS] Compliment screenshot detected in People channel");

        waitUntil(
          processComplimentScreenshotAsync(
            teamId,
            userId,
            message.files,
            message.channel,
            message.ts,
            message.text || ""
          ).catch(error => {
            console.error("❌ processComplimentScreenshotAsync error:", error);
          })
        );

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
