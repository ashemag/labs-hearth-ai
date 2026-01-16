// app/api/slack/options/route.ts
// Handles Slack interactive message menu options
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  console.log("📥 [SLACK OPTIONS] Received options request");

  // TODO: Implement message menu options if needed
  // This endpoint is called when users interact with message menus
  
  return NextResponse.json({ options: [] });
}


