import { createOAuthState } from "@/lib/oauth-state";
import { badRequest, serverError, type ServerSupabaseClient } from "@/server/api/route";

const slackClientId = process.env.SLACK_CLIENT_ID;

export function buildSlackOAuthUrl(input: { userId: string; origin: string }) {
    if (!slackClientId) {
        serverError("Slack OAuth not configured");
    }

    const scopes = [
        "app_mentions:read",
        "channels:history",
        "channels:read",
        "chat:write",
        "commands",
        "files:write",
        "groups:history",
        "groups:read",
        "im:write",
        "reactions:read",
        "reactions:write",
        "files:read",
    ].join(",");

    const slackUrl = new URL("https://slack.com/oauth/v2/authorize");
    slackUrl.searchParams.set("client_id", slackClientId);
    slackUrl.searchParams.set("scope", scopes);
    slackUrl.searchParams.set("user_scope", "im:history");
    slackUrl.searchParams.set("redirect_uri", `${input.origin}/api/slack/oauth/callback`);
    slackUrl.searchParams.set("state", createOAuthState(input.userId, "slack"));

    return slackUrl;
}

export async function listSlackWorkspaces(supabase: ServerSupabaseClient, userId: string) {
    const { data: workspaces, error } = await supabase
        .from("slack_tokens")
        .select("id, team_id, team_name, created_at, updated_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

    if (error) {
        console.error("[SLACK WORKSPACES] Error fetching workspaces:", error);
        serverError("Failed to fetch workspaces");
    }

    return workspaces || [];
}

export async function disconnectSlackWorkspace(
    supabase: ServerSupabaseClient,
    userId: string,
    teamId: string
) {
    if (!teamId) {
        badRequest("team_id is required");
    }

    const { error } = await supabase
        .from("slack_tokens")
        .delete()
        .eq("team_id", teamId)
        .eq("user_id", userId);

    if (error) {
        console.error("[SLACK WORKSPACES] Error disconnecting workspace:", error);
        serverError("Failed to disconnect workspace");
    }

    console.log(`[SLACK WORKSPACES] Disconnected workspace ${teamId} for user ${userId}`);
}
