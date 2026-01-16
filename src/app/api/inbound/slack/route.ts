// app/api/inbound/slack/route.ts
// Alternative inbound endpoint for Slack (OAuth redirect)
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  // Redirect to the main OAuth callback
  const searchParams = req.nextUrl.searchParams;
  const url = new URL("/api/slack/oauth/callback", req.url);
  
  // Forward all query params
  searchParams.forEach((value, key) => {
    url.searchParams.set(key, value);
  });

  return NextResponse.redirect(url);
}

export async function POST(req: NextRequest) {
  // Handle any POST requests (might be used for some Slack interactions)
  console.log("📥 [INBOUND SLACK] Received POST request");
  return NextResponse.json({ ok: true });
}

