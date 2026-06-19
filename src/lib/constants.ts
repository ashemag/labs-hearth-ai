// =============================================================================
// Application Constants
// Centralized config values that don't belong in environment variables
// =============================================================================

// Slack
export const SLACK_PEOPLE_CHANNEL_ID = process.env.SLACK_PEOPLE_CHANNEL_ID || "C09MPL84L6S";

// Pagination defaults
export const DEFAULT_PAGE_LIMIT = 500;
export const MAX_PAGE_LIMIT = 1000;

// Rate limiting
export const MAGIC_LINK_RATE_LIMIT_MAX = 5;
export const MAGIC_LINK_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
