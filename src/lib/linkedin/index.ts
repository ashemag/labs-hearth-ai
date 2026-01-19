/**
 * LinkedIn profile extraction via SerpAPI Google Search
 * 
 * This module uses SerpAPI to search Google for LinkedIn profile information
 * and extract the profile image from search results.
 */

import OpenAI from "openai";

const SERPAPI_KEY = process.env.SERPAPI_KEY;

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export interface LinkedInProfile {
    fullName: string;
    linkedinUrl: string;
    profileImageUrl: string | null;
    headline: string | null;
    location: string | null;
}

/**
 * Extract LinkedIn username/handle from a LinkedIn URL
 */
export function extractLinkedInUsername(url: string): string | null {
    // Handle various LinkedIn URL formats:
    // https://www.linkedin.com/in/username
    // https://linkedin.com/in/username
    // https://www.linkedin.com/in/username/
    // linkedin.com/in/username
    const patterns = [
        /linkedin\.com\/in\/([a-zA-Z0-9\-_]+)/i,
    ];

    for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match) {
            return match[1];
        }
    }

    return null;
}

/**
 * Check if a string is a LinkedIn URL
 */
export function isLinkedInUrl(input: string): boolean {
    return /linkedin\.com\/in\//i.test(input);
}

/**
 * Fetch LinkedIn profile data using SerpAPI
 * Searches Google for the LinkedIn profile and extracts the image from results
 */
export async function fetchLinkedInProfile(linkedinUrl: string): Promise<LinkedInProfile | null> {
    const username = extractLinkedInUsername(linkedinUrl);
    if (!username) {
        console.error("[LinkedIn] Could not extract username from URL:", linkedinUrl);
        return null;
    }

    // Normalize the LinkedIn URL
    const normalizedUrl = `https://www.linkedin.com/in/${username}`;

    // Try SerpAPI first (recommended)
    if (SERPAPI_KEY) {
        try {
            const profile = await fetchViaSerpAPI(normalizedUrl, username);
            if (profile) {
                return profile;
            }
        } catch (error) {
            console.error("[LinkedIn] SerpAPI error:", error);
        }
    } else {
        console.warn("[LinkedIn] SERPAPI_KEY not configured - add it to .env for profile images");
    }

    // Fallback: Try to fetch Open Graph data from LinkedIn page directly
    try {
        const profile = await fetchViaOpenGraph(normalizedUrl);
        if (profile) {
            return profile;
        }
    } catch (error) {
        console.error("[LinkedIn] Open Graph fetch error:", error);
    }

    // Last resort: Return what we can from the URL
    return {
        fullName: formatNameFromUsername(username),
        linkedinUrl: normalizedUrl,
        profileImageUrl: null,
        headline: null,
        location: null,
    };
}

/**
 * Use LLM to extract a clean bio and location from Google search title and snippet
 */
async function extractBioWithLLM(title: string, snippet: string): Promise<{ headline: string | null; location: string | null }> {
    if (!process.env.OPENAI_API_KEY) {
        return { headline: null, location: null };
    }

    try {
        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                {
                    role: "system",
                    content: `Extract professional info from this LinkedIn search result.

Return a JSON object with:
1. "headline": A clean professional bio (1-2 sentences max). Do NOT include the person's name. Start directly with their role/title. Example: "AI at Meta - specializing in strategy and product development."
2. "location": The city/location if mentioned (e.g. "San Francisco", "New York, NY", "London"). Return null if not found.

Return ONLY valid JSON, no other text. Example:
{"headline": "Founder at StartupCo", "location": "San Francisco"}`
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
            return { headline: null, location: null };
        }

        try {
            const parsed = JSON.parse(content);
            return {
                headline: parsed.headline || null,
                location: parsed.location || null,
            };
        } catch {
            // If JSON parsing fails, treat the whole response as headline
            return { headline: content, location: null };
        }
    } catch (error) {
        console.error("[LinkedIn] LLM extraction error:", error);
        return { headline: null, location: null };
    }
}

/**
 * Fetch profile data via SerpAPI Google Search
 * Makes 2 API calls: one for bio/name, one for profile image
 */
async function fetchViaSerpAPI(linkedinUrl: string, username: string): Promise<LinkedInProfile | null> {
    if (!SERPAPI_KEY) {
        return null;
    }

    console.log(`[LinkedIn] Fetching profile via SerpAPI for ${username}`);

    // Run both searches in parallel for speed
    const [bioData, imageUrl] = await Promise.all([
        fetchBioViaSerpAPI(username),
        fetchImageViaSerpAPI(linkedinUrl),
    ]);

    const fullName = bioData?.fullName || formatNameFromUsername(username);
    const headline = bioData?.headline || null;
    const location = bioData?.location || null;
    const profileImageUrl = imageUrl;

    console.log(`[LinkedIn] Found: ${fullName}, bio: ${headline ? 'yes' : 'no'}, location: ${location || 'no'}, image: ${profileImageUrl ? 'yes' : 'no'}`);

    return {
        fullName,
        linkedinUrl,
        profileImageUrl,
        headline,
        location,
    };
}

/**
 * Fetch bio/name/location via SerpAPI regular Google search
 */
async function fetchBioViaSerpAPI(username: string): Promise<{ fullName: string; headline: string | null; location: string | null } | null> {
    if (!SERPAPI_KEY) {
        return null;
    }

    const searchQuery = encodeURIComponent(`site:linkedin.com/in/${username}`);
    const apiUrl = `https://serpapi.com/search.json?q=${searchQuery}&api_key=${SERPAPI_KEY}&engine=google`;

    try {
        console.log(`[LinkedIn] Fetching bio via SerpAPI for ${username}`);
        const response = await fetch(apiUrl);

        if (!response.ok) {
            console.error("[LinkedIn] SerpAPI bio search not ok:", response.status);
            return null;
        }

        const data = await response.json();

        if (!data.organic_results || data.organic_results.length === 0) {
            return null;
        }

        const result = data.organic_results[0];
        const rawTitle = result.title || "";
        const rawSnippet = result.snippet || "";

        // Extract name from title (format: "FirstName LastName - Title | LinkedIn")
        let fullName = formatNameFromUsername(username);
        if (rawTitle) {
            const titleMatch = rawTitle.match(/^(.+?)\s*[-–|]/);
            if (titleMatch) {
                fullName = titleMatch[1].trim();
            }
        }

        // Use LLM to extract clean bio and location
        let headline: string | null = null;
        let location: string | null = null;
        if (rawTitle || rawSnippet) {
            const extracted = await extractBioWithLLM(rawTitle, rawSnippet);
            headline = extracted.headline;
            location = extracted.location;
        }

        return { fullName, headline, location };
    } catch (error) {
        console.error("[LinkedIn] Error fetching bio via SerpAPI:", error);
        return null;
    }
}

/**
 * Fetch profile image via SerpAPI Google Images search
 * Searches for the exact LinkedIn URL to get the actual profile photo
 */
async function fetchImageViaSerpAPI(linkedinUrl: string): Promise<string | null> {
    if (!SERPAPI_KEY) {
        return null;
    }

    // Search Google Images for the exact LinkedIn profile URL
    const searchQuery = encodeURIComponent(linkedinUrl);
    const apiUrl = `https://serpapi.com/search.json?q=${searchQuery}&api_key=${SERPAPI_KEY}&engine=google_images&num=5`;

    try {
        console.log(`[LinkedIn] Fetching image via SerpAPI Images for ${linkedinUrl}`);
        const response = await fetch(apiUrl);

        if (!response.ok) {
            console.error("[LinkedIn] SerpAPI image search not ok:", response.status);
            return null;
        }

        const data = await response.json();

        // Find the first image result that's from LinkedIn
        if (data.images_results && data.images_results.length > 0) {
            // Look for LinkedIn source first
            const linkedInImage = data.images_results.find(
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (img: any) => img.source?.toLowerCase().includes("linkedin") ||
                    img.link?.toLowerCase().includes("linkedin.com")
            );

            if (linkedInImage) {
                // Prefer original (high-res) over thumbnail
                return linkedInImage.original || linkedInImage.thumbnail || null;
            }

            // Fallback to first image
            const firstImage = data.images_results[0];
            return firstImage.original || firstImage.thumbnail || null;
        }

        return null;
    } catch (error) {
        console.error("[LinkedIn] Error fetching image via SerpAPI:", error);
        return null;
    }
}

/**
 * Try to fetch Open Graph metadata directly from LinkedIn
 * Note: This may not work due to LinkedIn's bot protection
 */
async function fetchViaOpenGraph(linkedinUrl: string): Promise<LinkedInProfile | null> {
    try {
        const response = await fetch(linkedinUrl, {
            headers: {
                "User-Agent": "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            },
        });

        if (!response.ok) {
            return null;
        }

        const html = await response.text();

        // Extract Open Graph tags
        const ogTitle = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i)?.[1];
        const ogImage = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i)?.[1];
        const ogDescription = html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["']/i)?.[1];

        if (!ogTitle) {
            return null;
        }

        // Extract name from title (format: "FirstName LastName - Title | LinkedIn")
        let fullName = ogTitle;
        const titleMatch = ogTitle.match(/^(.+?)\s*[-–|]/);
        if (titleMatch) {
            fullName = titleMatch[1].trim();
        }

        return {
            fullName,
            linkedinUrl,
            profileImageUrl: ogImage || null,
            headline: ogDescription || null,
            location: null,
        };
    } catch (error) {
        console.error("[LinkedIn] Error fetching Open Graph data:", error);
        return null;
    }
}

/**
 * Convert a LinkedIn username to a readable name
 * e.g., "john-doe-123abc" -> "John Doe"
 */
function formatNameFromUsername(username: string): string {
    // Remove trailing numbers/IDs (e.g., "john-doe-123abc" -> "john-doe")
    const cleanUsername = username.replace(/-[a-z0-9]{6,}$/i, "");

    // Split by hyphens and underscores, capitalize each word
    return cleanUsername
        .split(/[-_]/)
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(" ");
}

