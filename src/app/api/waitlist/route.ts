import axios from "axios";
import { NextResponse } from "next/server";
import { notifyError, notifySlack } from "@/lib/slack/notify";
import { createAdminClient } from "@/lib/supabase/admin";

type WaitlistValues = {
  name?: string;
  email?: string;
  twitterUrl?: string;
  linkedinUrl?: string;
  why?: string;
  role?: string;
  company?: string;
};

function formatWaitlistSlackMessage(values: WaitlistValues) {
  const lines = [
    "📥 *New waitlist signup*",
    values.name ? `Name: ${values.name}` : null,
    values.email ? `Email: ${values.email}` : null,
    values.company ? `Company: ${values.company}` : null,
    values.role ? `Role: ${values.role}` : null,
    values.twitterUrl ? `X: ${values.twitterUrl}` : null,
    values.linkedinUrl ? `LinkedIn: ${values.linkedinUrl}` : null,
    values.why ? `Why: ${values.why}` : null,
  ];

  return lines.filter(Boolean).join("\n");
}

function normalizeUrlBase(value: string) {
  return /^https?:\/\//i.test(value) ? value : `https://${value}`;
}

function getWaitlistEndpoint() {
  const apiUrl = process.env.API_URL?.trim();
  const endpoint = process.env.WAITLIST_ENDPOINT?.trim();

  if (!apiUrl || !endpoint) {
    return null;
  }

  const base = normalizeUrlBase(apiUrl);
  const path = endpoint.replace(/^\/+/, "");
  try {
    return new URL(path, base.endsWith("/") ? base : `${base}/`).toString();
  } catch {
    return null;
  }
}

async function saveWaitlistFallback(values: WaitlistValues) {
  const email = values.email?.trim().toLowerCase();
  if (!email) {
    throw new Error("Email is required");
  }

  const supabase = createAdminClient();
  const { error } = await supabase.from("waitlist").insert({ email });

  if (error && error.code !== "23505") {
    throw new Error(error.message);
  }

  return { message: "You're on the waitlist." };
}

export async function POST(request: Request) {
  try {
    const values = (await request.json()) as WaitlistValues;
    const processedValues = {
      name: values.name,
      email: values.email,
      twitter_url: values.twitterUrl,
      linkedin_url: values.linkedinUrl,
      why: values?.why,
      role: values?.role,
      company: values.company,
     
    };
    const waitlistEndpoint = getWaitlistEndpoint();
    const data = waitlistEndpoint
      ? (
          await axios.post(waitlistEndpoint, processedValues, {
            headers: { "X-API-Key": process.env.CLOUDRUN_API_TOKEN },
          })
        ).data
      : await saveWaitlistFallback(values);

    notifySlack(formatWaitlistSlackMessage(values)).catch(() => {});
    
    return NextResponse.json({ data });
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error(error.message);
      notifyError("/api/waitlist", "Failed to submit waitlist signup", error.message).catch(() => {});
      return new Response(error.message, {
        status: 500,
      });
    }
    notifyError("/api/waitlist", "Failed to submit waitlist signup", "Unknown error").catch(() => {});
    return new Response("Unknown error", {
      status: 500,
    });
  }
}
