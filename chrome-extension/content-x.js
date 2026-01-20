/**
 * Hearth Rolodex - X/Twitter Profile Scraper Content Script
 * 
 * This script runs on X profile pages and extracts profile data.
 */

// Listen for messages from the popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'GET_PROFILE_DATA') {
        const data = extractXProfileData();
        sendResponse(data);
    }
    return true;
});

// Check if we're on an X profile page (not home, search, etc.)
function isProfilePage() {
    const path = window.location.pathname;
    // Profile pages are /{username} but not /home, /search, /explore, /notifications, /messages, /settings, /i/
    const nonProfilePaths = ['/home', '/search', '/explore', '/notifications', '/messages', '/settings', '/i/', '/compose', '/login', '/logout'];
    if (nonProfilePaths.some(p => path.startsWith(p))) {
        return false;
    }
    // Must have a username (starts with / and has alphanumeric chars)
    return /^\/[a-zA-Z0-9_]+\/?$/.test(path) || /^\/[a-zA-Z0-9_]+\/(with_replies|media|likes)?\/?$/.test(path);
}

// Extract profile data from the page
function extractXProfileData() {
    const data = {
        platform: 'x',
        profileUrl: window.location.href.split('?')[0],
        username: null,
        name: null,
        bio: null,
        location: null,
        website: null,
        profileImageUrl: null,
        pinnedTweet: null,
        joinDate: null,
        followersCount: null,
        followingCount: null,
    };

    // Extract username from URL
    const pathMatch = window.location.pathname.match(/^\/([a-zA-Z0-9_]+)/);
    if (pathMatch) {
        data.username = pathMatch[1];
    }

    // Extract display name
    const nameSelectors = [
        '[data-testid="UserName"] span span',
        '[data-testid="UserName"] > div > div > span > span',
        'h2[role="heading"] span',
    ];
    
    for (const selector of nameSelectors) {
        const el = document.querySelector(selector);
        if (el && el.textContent.trim() && !el.textContent.startsWith('@')) {
            data.name = el.textContent.trim();
            break;
        }
    }

    // Extract bio/description
    const bioSelectors = [
        '[data-testid="UserDescription"]',
        '[data-testid="UserProfileHeader_Items"]',
    ];
    
    for (const selector of bioSelectors) {
        const el = document.querySelector(selector);
        if (el) {
            // Get text content but preserve some structure
            const bioText = el.textContent.trim();
            if (bioText && bioText.length > 0) {
                data.bio = bioText;
                break;
            }
        }
    }

    // Try alternative bio extraction
    if (!data.bio) {
        const userCell = document.querySelector('[data-testid="UserCell"]');
        if (userCell) {
            const bioDiv = userCell.parentElement?.querySelector('div[dir="auto"]');
            if (bioDiv) {
                data.bio = bioDiv.textContent.trim();
            }
        }
    }

    // Extract location
    const locationSelectors = [
        '[data-testid="UserProfileHeader_Items"] [data-testid="UserLocation"]',
        '[data-testid="UserProfileHeader_Items"] span[data-testid="UserLocation"]',
    ];
    
    for (const selector of locationSelectors) {
        const el = document.querySelector(selector);
        if (el) {
            data.location = el.textContent.trim();
            break;
        }
    }

    // Fallback: look for location icon and nearby text
    if (!data.location) {
        const headerItems = document.querySelector('[data-testid="UserProfileHeader_Items"]');
        if (headerItems) {
            const spans = headerItems.querySelectorAll('span');
            for (const span of spans) {
                const text = span.textContent.trim();
                // Location usually doesn't have @ or http
                if (text && !text.includes('@') && !text.includes('http') && !text.includes('Joined') && text.length < 50) {
                    // Check if it might be a location (has common patterns)
                    if (text.includes(',') || /^[A-Z]/.test(text)) {
                        data.location = text;
                        break;
                    }
                }
            }
        }
    }

    // Extract website/URL
    const linkSelectors = [
        '[data-testid="UserProfileHeader_Items"] a[href^="https://t.co"]',
        '[data-testid="UserProfileHeader_Items"] a[rel="noopener noreferrer nofollow"]',
        '[data-testid="UserUrl"]',
    ];
    
    for (const selector of linkSelectors) {
        const el = document.querySelector(selector);
        if (el) {
            // Get the displayed text (actual URL) not the t.co link
            data.website = el.textContent.trim() || el.href;
            break;
        }
    }

    // Extract profile image - need to find the MAIN profile avatar specifically
    // The main profile avatar is linked to /{username}/photo
    const username = data.username;
    
    if (username) {
        // Look for the profile photo link specific to this user
        const photoLink = document.querySelector(`a[href="/${username}/photo"]`);
        if (photoLink) {
            const img = photoLink.querySelector('img');
            if (img?.src && img.src.includes('pbs.twimg.com/profile_images')) {
                let imageUrl = img.src;
                imageUrl = imageUrl.replace(/_normal\./, '_400x400.');
                imageUrl = imageUrl.replace(/_bigger\./, '_400x400.');
                imageUrl = imageUrl.replace(/_mini\./, '_400x400.');
                imageUrl = imageUrl.replace(/_x96\./, '_400x400.');
                imageUrl = imageUrl.replace(/_200x200\./, '_400x400.');
                data.profileImageUrl = imageUrl;
                console.log('[Hearth] Found X profile image via photo link:', imageUrl);
            }
        }
    }

    // Fallback: look for large avatar in the header section (before any tweets)
    if (!data.profileImageUrl) {
        // The main avatar is usually in a div that's much larger (around 133px or more)
        const avatarContainers = document.querySelectorAll('[data-testid^="UserAvatar-Container"]');
        for (const container of avatarContainers) {
            const img = container.querySelector('img');
            if (img?.src && img.src.includes('pbs.twimg.com/profile_images')) {
                // Check if this is a larger avatar (main profile, not a small one in tweets)
                const rect = img.getBoundingClientRect();
                if (rect.width >= 100 || rect.height >= 100) {
                    let imageUrl = img.src;
                    imageUrl = imageUrl.replace(/_normal\./, '_400x400.');
                    imageUrl = imageUrl.replace(/_bigger\./, '_400x400.');
                    imageUrl = imageUrl.replace(/_mini\./, '_400x400.');
                    imageUrl = imageUrl.replace(/_x96\./, '_400x400.');
                    data.profileImageUrl = imageUrl;
                    console.log('[Hearth] Found X profile image via large avatar:', imageUrl);
                    break;
                }
            }
        }
    }

    // Final fallback: first profile image that's reasonably large
    if (!data.profileImageUrl) {
        const allImages = document.querySelectorAll('img[src*="pbs.twimg.com/profile_images"]');
        for (const img of allImages) {
            const rect = img.getBoundingClientRect();
            // Only consider images that are at least 48px (skip tiny ones)
            if (rect.width >= 48 && img.src) {
                let imageUrl = img.src;
                imageUrl = imageUrl.replace(/_normal\./, '_400x400.');
                imageUrl = imageUrl.replace(/_bigger\./, '_400x400.');
                imageUrl = imageUrl.replace(/_mini\./, '_400x400.');
                data.profileImageUrl = imageUrl;
                console.log('[Hearth] Found X profile image (size fallback):', imageUrl);
                break;
            }
        }
    }

    // Extract pinned tweet
    const pinnedTweet = document.querySelector('[data-testid="tweet"][tabindex="0"]');
    if (pinnedTweet) {
        // Check if it's actually pinned (look for pin icon or pinned label)
        const tweetText = pinnedTweet.querySelector('[data-testid="tweetText"]');
        if (tweetText) {
            const text = tweetText.textContent.trim();
            if (text.length > 0) {
                data.pinnedTweet = text.substring(0, 500); // Limit length
            }
        }
    }

    // Extract join date
    const joinDateSelectors = [
        '[data-testid="UserProfileHeader_Items"] span:has(svg)',
    ];
    
    const headerItems = document.querySelector('[data-testid="UserProfileHeader_Items"]');
    if (headerItems) {
        const text = headerItems.textContent;
        const joinMatch = text.match(/Joined\s+(\w+\s+\d{4})/);
        if (joinMatch) {
            data.joinDate = joinMatch[1];
        }
    }

    // Extract follower/following counts
    const followLinks = document.querySelectorAll('a[href*="/following"], a[href*="/verified_followers"], a[href*="/followers"]');
    followLinks.forEach(link => {
        const text = link.textContent.trim();
        if (link.href.includes('/following')) {
            const match = text.match(/^([\d,.KMB]+)/);
            if (match) data.followingCount = match[1];
        } else if (link.href.includes('/followers') || link.href.includes('/verified_followers')) {
            const match = text.match(/^([\d,.KMB]+)/);
            if (match) data.followersCount = match[1];
        }
    });

    console.log('[Hearth] Extracted X profile data:', data);
    return data;
}

// Log that the content script is loaded
console.log('[Hearth] X content script loaded on:', window.location.href);
