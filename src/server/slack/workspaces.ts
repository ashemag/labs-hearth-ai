import { createOAuthState } from "@/lib/oauth-state";
import { badRequest, serverError, type ServerSupabaseClient } from "@/server/api/route";

const slackClientId = process.env.SLACK_CLIENT_ID;
const slackRedirectOrigin = process.env.SLACK_REDIRECT_ORIGIN;
const appUrl = process.env.NEXT_PUBLIC_APP_URL;

const requiredSlackBotScopes = [
    "app_mentions:read",
    "channels:history",
    "channels:read",
    "chat:write",
    "commands",
    "files:write",
    "groups:history",
    "groups:read",
    "im:history",
    "im:read",
    "im:write",
    "mpim:history",
    "mpim:read",
    "reactions:read",
    "reactions:write",
    "files:read",
];

function getMissingSlackScopes(scope: string | null | undefined) {
    const grantedScopes = new Set(
        (scope || "")
            .split(/[,\s]+/)
            .map((item) => item.trim())
            .filter(Boolean)
    );

    return requiredSlackBotScopes.filter((requiredScope) => !grantedScopes.has(requiredScope));
}

function isLocalOrigin(origin: string | null | undefined) {
    if (!origin) return false;
    return /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin);
}

function cleanOrigin(origin: string | null | undefined) {
    return origin?.replace(/\/$/, "");
}

function getConfiguredRedirectOrigin() {
    const configuredOrigin = cleanOrigin(slackRedirectOrigin || appUrl);
    if (configuredOrigin && !isLocalOrigin(configuredOrigin)) {
        return configuredOrigin;
    }

    if (process.env.NODE_ENV === "production") {
        return "https://labs.hearth.ai";
    }

    return null;
}

export function getSlackOAuthRedirectUri(requestOrigin: string) {
    const cleanedRequestOrigin = cleanOrigin(requestOrigin);

    if (isLocalOrigin(cleanedRequestOrigin)) {
        return `${cleanedRequestOrigin}/api/slack/oauth/callback`;
    }

    const configuredOrigin = process.env.NODE_ENV === "production"
        ? getConfiguredRedirectOrigin()
        : null;
    const origin = configuredOrigin || cleanedRequestOrigin || "https://labs.hearth.ai";
    return `${origin}/api/slack/oauth/callback`;
}

export function buildSlackOAuthUrl(input: { userId: string; origin: string }) {
    if (!slackClientId) {
        serverError("Slack OAuth not configured");
    }

    const scopes = requiredSlackBotScopes.join(",");

    const slackUrl = new URL("https://slack.com/oauth/v2/authorize");
    slackUrl.searchParams.set("client_id", slackClientId);
    slackUrl.searchParams.set("scope", scopes);
    slackUrl.searchParams.set("redirect_uri", getSlackOAuthRedirectUri(input.origin));
    slackUrl.searchParams.set("state", createOAuthState(input.userId, "slack"));

    return slackUrl;
}

export async function listSlackWorkspaces(supabase: ServerSupabaseClient, userId: string) {
    const { data: workspaces, error } = await supabase
        .from("slack_tokens")
        .select("id, team_id, team_name, scope, created_at, updated_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

    if (error) {
        console.error("[SLACK WORKSPACES] Error fetching workspaces:", error);
        serverError("Failed to fetch workspaces");
    }

    return (workspaces || []).map((workspace) => {
        const missingScopes = getMissingSlackScopes(workspace.scope);
        return {
            id: workspace.id,
            team_id: workspace.team_id,
            team_name: workspace.team_name,
            created_at: workspace.created_at,
            updated_at: workspace.updated_at,
            connection_status: missingScopes.length > 0 ? "needs_reauthorization" : "connected",
            missing_scopes: missingScopes,
        };
    });
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
