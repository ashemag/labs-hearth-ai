// app/api/slack/workspaces/route.ts
// Lists connected Slack workspaces for the current user
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET - List all connected workspaces for the user
export async function GET() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: workspaces, error } = await supabase
    .from("slack_tokens")
    .select("id, team_id, team_name, created_at, updated_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("❌ [SLACK WORKSPACES] Error fetching workspaces:", error);
    return NextResponse.json({ error: "Failed to fetch workspaces" }, { status: 500 });
  }

  return NextResponse.json({ workspaces: workspaces || [] });
}

// DELETE - Disconnect a workspace
export async function DELETE(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const teamId = searchParams.get("team_id");

  if (!teamId) {
    return NextResponse.json({ error: "team_id is required" }, { status: 400 });
  }

  const { error } = await supabase
    .from("slack_tokens")
    .delete()
    .eq("team_id", teamId)
    .eq("user_id", user.id);

  if (error) {
    console.error("❌ [SLACK WORKSPACES] Error disconnecting workspace:", error);
    return NextResponse.json({ error: "Failed to disconnect workspace" }, { status: 500 });
  }

  console.log(`✅ [SLACK WORKSPACES] Disconnected workspace ${teamId} for user ${user.id}`);
  return NextResponse.json({ success: true });
}

