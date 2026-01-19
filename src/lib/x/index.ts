/**
 * X/Twitter profile extraction via SerpAPI Google Search
 * 
 * This module uses SerpAPI to search Google for X profile information
 * and extract profile data from search results, similar to LinkedIn enrichment.
 */

import OpenAI from "openai";

const SERPAPI_KEY = process.env.SERPAPI_KEY;

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export interface XProfile {
    username: string;
    displayName: string;
    bio: string | null;
    location: string | null;
    profileImageUrl: string | null;
}

/**
 * Check if a string is an X/Twitter URL or handle
 */
export function isXHandle(input: string): boolean {
    const trimmed = input.trim().toLowerCase();
    return (
        trimmed.includes("x.com/") ||
        trimmed.includes("twitter.com/") ||
        trimmed.startsWith("@")
    );
}

/**
 * Extract username from X URL or handle
 */
export function extractXUsername(input: string): string | null {
    const trimmed = input.trim();
    
    // Handle full URLs
    if (trimmed.includes("x.com/") || trimmed.includes("twitter.com/")) {
        const match = trimmed.match(/(?:x\.com|twitter\.com)\/([a-zA-Z0-9_]+)/i);
        if (match) {
            const username = match[1].toLowerCase();
            // Filter out common non-profile paths
            if (["home", "explore", "search", "notifications", "messages", "settings", "i", "intent"].includes(username)) {
                return null;
            }
            return username;
        }
    }
    
    // Handle @username
    if (trimmed.startsWith("@")) {
        const username = trimmed.slice(1).toLowerCase();
        if (/^[a-zA-Z0-9_]{1,15}$/.test(username)) {
            return username;
        }
    }
    
    return null;
}

/**
 * Fetch X profile data using SerpAPI
 * Searches Google for the X profile and extracts data from results
 */
export async function fetchXProfile(handle: string): Promise<XProfile | null> {
    const username = extractXUsername(handle);
    if (!username) {
        console.error("[X] Could not extract username from input:", handle);
        return null;
    }

    // Try SerpAPI (recommended)
    if (SERPAPI_KEY) {
        try {
            const profile = await fetchViaSerpAPI(username);
            if (profile) {
                return profile;
            }
        } catch (error) {
            console.error("[X] SerpAPI error:", error);
        }
    } else {
        console.warn("[X] SERPAPI_KEY not configured - add it to .env for profile enrichment");
    }

    // Fallback: Return basic profile with unavatar
    return {
        username,
        displayName: username,
        bio: null,
        location: null,
        profileImageUrl: `https://unavatar.io/twitter/${username}`,
    };
}

/**
 * Use LLM to extract clean bio and location from Google search results
 */
async function extractBioWithLLM(title: string, snippet: string): Promise<{ bio: string | null; location: string | null; displayName: string | null }> {
    if (!process.env.OPENAI_API_KEY) {
        return { bio: null, location: null, displayName: null };
    }

    try {
        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                {
                    role: "system",
                    content: `Extract profile info from this X/Twitter search result.

Return a JSON object with:
1. "displayName": The person's display name (NOT their @handle). Example: "Elon Musk", "Naval Ravikant"  
2. "bio": A clean bio (1-2 sentences max). Summarize what they do based on the snippet. Do NOT include location or website in the bio.
3. "location": The city/location. Look for patterns like "Location: Atlanta, GA" or just city names. Return the location exactly as shown (e.g. "Atlanta, GA", "San Francisco", "NYC"). Return null if not found.

IMPORTANT: X profile snippets often have format like "Location: CityName. Website: url" - extract the location from this.

Return ONLY valid JSON, no other text. Example:
{"displayName": "Tope Awotona", "bio": "Founder of Calendly", "location": "Atlanta, GA"}`
                },
                {
                    role: "user",
                    content: `Title: ${title}\n\nSnippet: ${snippet}`
                }
            ],
            max_tokens: 200,
            temperature: 0,
        });

        const content = response.choices[0]?.message?.content?.trim();
        if (!content) {
            return { bio: null, location: null, displayName: null };
        }

        try {
            const parsed = JSON.parse(content);
            return {
                displayName: parsed.displayName || null,
                bio: parsed.bio || null,
                location: parsed.location || null,
            };
        } catch {
            return { bio: null, location: null, displayName: null };
        }
    } catch (error) {
        console.error("[X] LLM extraction error:", error);
        return { bio: null, location: null, displayName: null };
    }
}

/**
 * Fetch profile data via SerpAPI Google Search
 */
async function fetchViaSerpAPI(username: string): Promise<XProfile | null> {
    if (!SERPAPI_KEY) {
        return null;
    }

    console.log(`[X] Fetching profile via SerpAPI for @${username}`);

    // Run both searches in parallel for speed
    const [bioData, imageUrl] = await Promise.all([
        fetchBioViaSerpAPI(username),
        fetchImageViaSerpAPI(username),
    ]);

    const displayName = bioData?.displayName || username;
    const bio = bioData?.bio || null;
    const location = bioData?.location || null;
    const profileImageUrl = imageUrl || `https://unavatar.io/twitter/${username}`;

    console.log(`[X] Found: ${displayName}, bio: ${bio ? 'yes' : 'no'}, location: ${location || 'no'}, image: ${profileImageUrl ? 'yes' : 'no'}`);

    return {
        username,
        displayName,
        bio,
        location,
        profileImageUrl,
    };
}

/**
 * Fetch bio/name/location via SerpAPI regular Google search
 */
async function fetchBioViaSerpAPI(username: string): Promise<{ displayName: string | null; bio: string | null; location: string | null } | null> {
    if (!SERPAPI_KEY) {
        return null;
    }

    // Search using the full X URL - this often includes location in the snippet
    const searchQuery = encodeURIComponent(`https://x.com/${username}`);
    const apiUrl = `https://serpapi.com/search.json?q=${searchQuery}&api_key=${SERPAPI_KEY}&engine=google`;

    try {
        console.log(`[X] Fetching bio via SerpAPI for @${username}`);
        const response = await fetch(apiUrl);

        if (!response.ok) {
            console.error("[X] SerpAPI bio search not ok:", response.status);
            return null;
        }

        const data = await response.json();

        if (!data.organic_results || data.organic_results.length === 0) {
            console.log(`[X] No organic results found for @${username}`);
            return null;
        }

        // Find the most relevant result (profile page, not a post)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const profileResult = data.organic_results.find((r: any) => {
            const link = r.link?.toLowerCase() || "";
            // Match profile URLs like x.com/username or twitter.com/username (not /status/)
            return (link.includes(`x.com/${username}`) || link.includes(`twitter.com/${username}`)) &&
                !link.includes("/status/");
        }) || data.organic_results[0];

        const rawTitle = profileResult.title || "";
        const rawSnippet = profileResult.snippet || "";
        
        console.log(`[X] SerpAPI result for @${username}:`, { title: rawTitle, snippet: rawSnippet });

        // Use LLM to extract clean data
        let displayName: string | null = null;
        let bio: string | null = null;
        let location: string | null = null;

        if (rawTitle || rawSnippet) {
            const extracted = await extractBioWithLLM(rawTitle, rawSnippet);
            displayName = extracted.displayName;
            bio = extracted.bio;
            location = extracted.location;
        }

        // Fallback: try to extract display name from title
        // Format is usually "DisplayName (@username) / X" or "DisplayName (@username) on X"
        if (!displayName && rawTitle) {
            const titleMatch = rawTitle.match(/^(.+?)\s*\(@/);
            if (titleMatch) {
                displayName = titleMatch[1].trim();
            }
        }

        return { displayName, bio, location };
    } catch (error) {
        console.error("[X] Error fetching bio via SerpAPI:", error);
        return null;
    }
}

/**
 * Fetch profile image via SerpAPI Google Images search
 */
async function fetchImageViaSerpAPI(username: string): Promise<string | null> {
    if (!SERPAPI_KEY) {
        return null;
    }

    // Search Google Images for the X profile
    const searchQuery = encodeURIComponent(`"@${username}" site:x.com OR site:twitter.com profile photo`);
    const apiUrl = `https://serpapi.com/search.json?q=${searchQuery}&api_key=${SERPAPI_KEY}&engine=google_images&num=5`;

    try {
        console.log(`[X] Fetching image via SerpAPI Images for @${username}`);
        const response = await fetch(apiUrl);

        if (!response.ok) {
            console.error("[X] SerpAPI image search not ok:", response.status);
            return null;
        }

        const data = await response.json();

        if (data.images_results && data.images_results.length > 0) {
            // Look for X/Twitter source first
            const xImage = data.images_results.find(
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (img: any) => 
                    img.source?.toLowerCase().includes("x.com") ||
                    img.source?.toLowerCase().includes("twitter") ||
                    img.link?.toLowerCase().includes("x.com") ||
                    img.link?.toLowerCase().includes("twitter.com")
            );

            if (xImage) {
                return xImage.original || xImage.thumbnail || null;
            }

            // Fallback to first image that looks like a profile photo
            const firstImage = data.images_results[0];
            return firstImage.original || firstImage.thumbnail || null;
        }

        return null;
    } catch (error) {
        console.error("[X] Error fetching image via SerpAPI:", error);
        return null;
    }
}

