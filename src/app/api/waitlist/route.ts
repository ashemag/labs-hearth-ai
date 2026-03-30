import axios from "axios";
import { NextResponse } from "next/server";
import { notifyError, notifySlack } from "@/lib/slack/notify";

function formatWaitlistSlackMessage(values: {
  name?: string;
  email?: string;
  twitterUrl?: string;
  linkedinUrl?: string;
  why?: string;
  role?: string;
  company?: string;
}) {
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

export async function POST(request: Request) {
  try {
    const values = await request.json();
    const processedValues = {
      name: values.name,
      email: values.email,
      twitter_url: values.twitterUrl,
      linkedin_url: values.linkedinUrl,
      why: values?.why,
      role: values?.role,
      company: values.company,
     
    };
    const { data } = await axios.post(`${process.env.API_URL}/${process.env.WAITLIST_ENDPOINT}`, processedValues, {
      headers: { "X-API-Key": process.env.CLOUDRUN_API_TOKEN },
    });

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
