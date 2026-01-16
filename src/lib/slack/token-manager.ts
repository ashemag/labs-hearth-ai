// lib/slack/token-manager.ts
// Manages Slack OAuth token refresh with multi-workspace support

import { createClient } from "@supabase/supabase-js";

const SLACK_CLIENT_ID = process.env.SLACK_CLIENT_ID;
const SLACK_SECRET = process.env.SLACK_SECRET;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  : null;

interface SlackRefreshResponse {
  ok: boolean;
  access_token?: string;
  expires_in?: number;
  refresh_token?: string;
  error?: string;
}

interface SlackTokenRow {
  id: number;
  team_id: string;
  team_name: string | null;
  user_id: string;
  bot_token: string;
  refresh_token: string | null;
  expires_at: string;
  last_refreshed_at: string;
}

/**
 * Gets a valid Slack bot token for a specific workspace (team_id)
 * Refreshes if expired or expiring soon
 */
export async function getValidSlackToken(teamId: string): Promise<string> {
  if (!supabase) {
    throw new Error("Supabase not configured");
  }

  try {
    const { data, error } = await supabase
      .from("slack_tokens")
      .select("*")
      .eq("team_id", teamId)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        throw new Error(`No token found for workspace ${teamId}`);
      }
      throw error;
    }

    const tokenRow = data as SlackTokenRow;

    // Check if token is expired (with 5 min buffer)
    const bufferTime = 5 * 60 * 1000;
    const now = Date.now();
    const expiresAt = new Date(tokenRow.expires_at).getTime();

    if (now >= (expiresAt - bufferTime)) {
      console.log(`⏰ [SLACK TOKEN] Token for ${teamId} expired, refreshing...`);
      
      if (!tokenRow.refresh_token) {
        throw new Error(`No refresh token for workspace ${teamId}`);
      }
      
      return await refreshSlackToken(teamId, tokenRow.refresh_token);
    }

    console.log(`✅ [SLACK TOKEN] Using valid token for workspace ${teamId}`);
    return tokenRow.bot_token.trim();

  } catch (error) {
    console.error(`❌ [SLACK TOKEN] Error getting token for ${teamId}:`, error);
    throw error;
  }
}

/**
 * Get the user_id associated with a workspace
 */
export async function getUserIdForWorkspace(teamId: string): Promise<string | null> {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("slack_tokens")
    .select("user_id")
    .eq("team_id", teamId)
    .single();

  if (error || !data) {
    console.error(`❌ [SLACK TOKEN] No user found for workspace ${teamId}`);
    return null;
  }

  return data.user_id;
}

/**
 * Refreshes the Slack bot token for a specific workspace
 */
async function refreshSlackToken(teamId: string, refreshToken: string): Promise<string> {
  if (!SLACK_CLIENT_ID || !SLACK_SECRET) {
    throw new Error("Slack OAuth credentials not configured");
  }

  if (!supabase) {
    throw new Error("Supabase not configured");
  }

  console.log(`🔄 [SLACK TOKEN] Refreshing token for workspace ${teamId}...`);

  try {
    const response = await fetch("https://slack.com/api/oauth.v2.access", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: SLACK_CLIENT_ID,
        client_secret: SLACK_SECRET,
        grant_type: "refresh_token",
        refresh_token: refreshToken,
      }),
    });

    if (!response.ok) {
      throw new Error(`Token refresh failed: ${response.statusText}`);
    }

    const data: SlackRefreshResponse = await response.json();

    if (!data.ok || !data.access_token) {
      throw new Error(`Token refresh error: ${data.error || 'unknown'}`);
    }

    // Calculate expiration time
    const expiresIn = data.expires_in || 43200;
    const expiresAt = new Date(Date.now() + (expiresIn * 1000)).toISOString();
    const newRefreshToken = data.refresh_token || refreshToken;

    // Update in database
    const { error: updateError } = await supabase
      .from("slack_tokens")
      .update({
        bot_token: data.access_token.trim(),
        refresh_token: newRefreshToken.trim(),
        expires_at: expiresAt,
        last_refreshed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("team_id", teamId);

    if (updateError) {
      console.error(`❌ [SLACK TOKEN] Failed to update token for ${teamId}:`, updateError);
      throw updateError;
    }

    console.log(`✅ [SLACK TOKEN] Token refreshed for ${teamId} (expires in ${expiresIn}s)`);
    return data.access_token;

  } catch (error) {
    console.error(`❌ [SLACK TOKEN] Exception refreshing token for ${teamId}:`, error);
    throw error;
  }
}

/**
 * Forces a token refresh for a workspace
 */
export async function forceRefreshSlackToken(teamId: string): Promise<string> {
  if (!supabase) {
    throw new Error("Supabase not configured");
  }

  const { data } = await supabase
    .from("slack_tokens")
    .select("refresh_token")
    .eq("team_id", teamId)
    .single();

  if (!data?.refresh_token) {
    throw new Error(`No refresh token for workspace ${teamId}`);
  }

  return await refreshSlackToken(teamId, data.refresh_token);
}


