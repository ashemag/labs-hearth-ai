// app/api/slack/workspaces/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { requiredString, withUser } from "@/server/api/route";
import { disconnectSlackWorkspace, listSlackWorkspaces } from "@/server/slack/workspaces";

// GET - List all connected workspaces for the user
export const GET = withUser(async (_req, { supabase, user }) => {
  const workspaces = await listSlackWorkspaces(supabase, user.id);
  return NextResponse.json({ workspaces });
});

// DELETE - Disconnect a workspace
export const DELETE = withUser(async (req, { supabase, user }) => {
  const { searchParams } = new URL(req.url);
  const teamId = requiredString(searchParams.get("team_id"), "team_id");

  await disconnectSlackWorkspace(supabase, user.id, teamId);
  return NextResponse.json({ success: true });
});
