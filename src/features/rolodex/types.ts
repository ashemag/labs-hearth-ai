// =============================================================================
// Rolodex shared types
// =============================================================================

export interface Note {
    id: number;
    note: string;
    created_at: string;
    source_type: string | null;
}

export interface Compliment {
    id: number;
    compliment: string;
    context: string | null;
    received_at: string | null;
    created_at: string;
}

export interface StandaloneCompliment {
    id: number;
    compliment: string | null;
    context: string | null;
    source_name: string | null;
    image_url: string | null;
    received_at: string | null;
    created_at: string;
}

export interface XProfile {
    username: string;
    display_name: string | null;
    bio: string | null;
    profile_image_url: string | null;
    followers_count: number | null;
    following_count: number | null;
    verified: boolean;
    website_url: string | null;
    location: string | null;
}

export interface LinkedInProfile {
    linkedin_url: string;
    profile_image_url: string | null;
    headline: string | null;
    location: string | null;
}

export interface Touchpoint {
    id: number;
    created_at: string;
}

export interface ContactInfo {
    id: number;
    type: 'phone' | 'email';
    value: string;
    created_at: string;
}

export interface Website {
    id: number;
    url: string;
    created_at: string;
}

export interface Contact {
    id: number;
    name: string;
    created_at: string;
    custom_profile_image_url: string | null;
    custom_bio: string | null;
    custom_location: string | null;
    website_url: string | null;
    hidden: boolean;
    last_touchpoint: string | null;
    x_profile: XProfile | null;
    linkedin_profile: LinkedInProfile | null;
    notes: Note[];
    touchpoints: Touchpoint[];
    websites: Website[];
    compliments: Compliment[];
    contact_info: ContactInfo[];
}

export interface ContextMenuState {
    x: number;
    y: number;
    contactId: number;
}

export interface RolodexList {
    id: number;
    name: string;
    color: string;
    emoji: string | null;
    pinned: boolean;
    member_count: number;
    member_ids: number[];
}

export interface Todo {
    id: number;
    contactId: number;
    contactName: string;
    task: string;
    dueDate: string;
    completed: boolean;
    createdAt: string;
}

export interface DiscoveryInteraction {
    username: string;
    name?: string;
    profileUrl: string;
    count: number;
    types: {
        mentions: number;
        replies: number;
        quotes: number;
        retweets: number;
    };
}

export interface DiscoveryResult {
    username: string;
    tweetCount: number;
    timeRange: { start: string; end: string };
    topInteractions: DiscoveryInteraction[];
}

export interface UserProfile {
    id: string;
    email: string;
    avatarUrl: string | null;
    fullName: string | null;
    customAvatarUrl: string | null;
}

export interface ParsedLinkedInProfile {
    headline: string | null;
    location: string | null;
    about: string | null;
    experience: { title: string; company: string; dates: string }[];
    education: { school: string; degree: string }[];
    linkedinUrl: string | null;
}

// Utility functions

export function parseLinkedInNote(noteText: string): ParsedLinkedInProfile | null {
    if (!noteText.includes("LinkedIn Profile Import")) return null;
    const lines = noteText.split("\n").map(l => l.trim()).filter(Boolean);
    const result: ParsedLinkedInProfile = { headline: null, location: null, about: null, experience: [], education: [], linkedinUrl: null };

    let section: "top" | "about" | "experience" | "education" = "top";
    const aboutLines: string[] = [];

    for (const line of lines) {
        if (line === "📋 LinkedIn Profile Import" || line === "—") continue;
        if (line === "About:") { section = "about"; continue; }
        if (line === "Experience:") { section = "experience"; continue; }
        if (line === "Education:") { section = "education"; continue; }
        if (line.startsWith("http") && line.includes("linkedin.com")) { result.linkedinUrl = line; continue; }

        if (section === "top") {
            if (line.startsWith("📍")) { result.location = line.replace("📍 ", ""); }
            else if (!result.headline) { result.headline = line; }
        } else if (section === "about") {
            aboutLines.push(line);
        } else if (section === "experience" && line.startsWith("•")) {
            const text = line.slice(2);
            const atMatch = text.match(/^(.+?) at (.+?)(?:\s*\((.+?)\))?$/);
            if (atMatch) {
                result.experience.push({ title: atMatch[1], company: atMatch[2], dates: atMatch[3] || "" });
            } else {
                const dateMatch = text.match(/^(.+?)(?:\s*\((.+?)\))?$/);
                result.experience.push({ title: dateMatch ? dateMatch[1] : text, company: "", dates: dateMatch?.[2] || "" });
            }
        } else if (section === "education" && line.startsWith("•")) {
            const text = line.slice(2);
            const parts = text.split(" - ");
            result.education.push({ school: parts[0] || text, degree: parts[1] || "" });
        }
    }
    if (aboutLines.length > 0) result.about = aboutLines.join("\n");
    return result;
}

export function formatTimeAgo(dateString: string): string {
    const now = new Date();
    const date = new Date(dateString);

    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const dateStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const diffDays = Math.floor((todayStart.getTime() - dateStart.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays}d ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`;
    return `${Math.floor(diffDays / 365)}y ago`;
}

/** Get the best available profile image for a contact */
export function getProfileImage(contact: Contact): string | null {
    return contact.custom_profile_image_url
        || contact.x_profile?.profile_image_url
        || contact.linkedin_profile?.profile_image_url
        || null;
}
