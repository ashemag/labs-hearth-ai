/**
 * Location Normalization Utility
 * 
 * Normalizes location strings to a consistent format:
 * - Standardizes capitalization (title case)
 * - Expands common abbreviations
 * - Normalizes whitespace and separators
 * - Handles country codes and names
 * - Removes common noise patterns
 */

// US State abbreviation to full name mapping
const US_STATE_ABBREVS: Record<string, string> = {
    'AL': 'Alabama', 'AK': 'Alaska', 'AZ': 'Arizona', 'AR': 'Arkansas',
    'CA': 'California', 'CO': 'Colorado', 'CT': 'Connecticut', 'DE': 'Delaware',
    'FL': 'Florida', 'GA': 'Georgia', 'HI': 'Hawaii', 'ID': 'Idaho',
    'IL': 'Illinois', 'IN': 'Indiana', 'IA': 'Iowa', 'KS': 'Kansas',
    'KY': 'Kentucky', 'LA': 'Louisiana', 'ME': 'Maine', 'MD': 'Maryland',
    'MA': 'Massachusetts', 'MI': 'Michigan', 'MN': 'Minnesota', 'MS': 'Mississippi',
    'MO': 'Missouri', 'MT': 'Montana', 'NE': 'Nebraska', 'NV': 'Nevada',
    'NH': 'New Hampshire', 'NJ': 'New Jersey', 'NM': 'New Mexico', 'NY': 'New York',
    'NC': 'North Carolina', 'ND': 'North Dakota', 'OH': 'Ohio', 'OK': 'Oklahoma',
    'OR': 'Oregon', 'PA': 'Pennsylvania', 'RI': 'Rhode Island', 'SC': 'South Carolina',
    'SD': 'South Dakota', 'TN': 'Tennessee', 'TX': 'Texas', 'UT': 'Utah',
    'VT': 'Vermont', 'VA': 'Virginia', 'WA': 'Washington', 'WV': 'West Virginia',
    'WI': 'Wisconsin', 'WY': 'Wyoming', 'DC': 'Washington, DC',
};

// Full state name to abbreviation mapping
const US_STATE_NAMES: Record<string, string> = Object.fromEntries(
    Object.entries(US_STATE_ABBREVS).map(([abbr, name]) => [name.toLowerCase(), abbr])
);

// Common city abbreviations and variations (standalone only, not state abbrevs)
const CITY_NORMALIZATIONS: Record<string, string> = {
    'nyc': 'New York City',
    'la': 'Los Angeles',
    'sf': 'San Francisco',
    'philly': 'Philadelphia',
    'vegas': 'Las Vegas',
    'nola': 'New Orleans',
    'atl': 'Atlanta',
    'chi': 'Chicago',
    'bos': 'Boston',
    'den': 'Denver',
    'pdx': 'Portland',
    'sea': 'Seattle',
    'aus': 'Austin',
    'dfw': 'Dallas-Fort Worth',
    'slc': 'Salt Lake City',
    'dtw': 'Detroit',
    'mia': 'Miami',
    'stl': 'St. Louis',
    'mpls': 'Minneapolis',
    'phx': 'Phoenix',
};

// Patterns that indicate this is not a real location
const NOISE_PATTERNS = [
    /^views\s+(are\s+)?my\s+own$/i,
    /^opinions?\s+(are\s+)?my\s+own$/i,
    /^personal\s+account$/i,
    /^not\s+financial\s+advice$/i,
    /^follow\s+back$/i,
    /^dm\s+for/i,
    /^link\s+in\s+bio$/i,
    /^everywhere$/i,
    /^worldwide$/i,
    /^global$/i,
    /^earth$/i,
    /^the\s+internet$/i,
    /^online$/i,
    /^here$/i,
    /^there$/i,
    /^somewhere$/i,
    /^nowhere$/i,
    /^🌍|🌎|🌏|🌐$/,
];

// Boroughs and neighborhoods that should include their city/state
// Maps lowercase name to full "Name, ST" format
const BOROUGH_NORMALIZATIONS: Record<string, string> = {
    // NYC Boroughs
    'brooklyn': 'Brooklyn, NY',
    'manhattan': 'Manhattan, NY',
    'queens': 'Queens, NY',
    'bronx': 'Bronx, NY',
    'the bronx': 'Bronx, NY',
    'staten island': 'Staten Island, NY',
    'harlem': 'Harlem, NY',
    'soho': 'SoHo, NY',
    'tribeca': 'Tribeca, NY',
    'williamsburg': 'Williamsburg, NY',
    'bushwick': 'Bushwick, NY',
    'greenpoint': 'Greenpoint, NY',
    'astoria': 'Astoria, NY',
    'long island city': 'Long Island City, NY',
    'lic': 'Long Island City, NY',
    'dumbo': 'DUMBO, NY',
    'fidi': 'Financial District, NY',
    // LA neighborhoods
    'hollywood': 'Hollywood, CA',
    'santa monica': 'Santa Monica, CA',
    'venice': 'Venice, CA',
    'beverly hills': 'Beverly Hills, CA',
    'silver lake': 'Silver Lake, CA',
    'echo park': 'Echo Park, CA',
    'downtown la': 'Downtown Los Angeles, CA',
    'dtla': 'Downtown Los Angeles, CA',
    // SF neighborhoods
    'soma': 'SoMa, CA',
    'mission': 'Mission District, CA',
    'the mission': 'Mission District, CA',
    'castro': 'Castro, CA',
    'hayes valley': 'Hayes Valley, CA',
    'noe valley': 'Noe Valley, CA',
    'north beach': 'North Beach, CA',
    'pac heights': 'Pacific Heights, CA',
    // Chicago
    'wicker park': 'Wicker Park, IL',
    'logan square': 'Logan Square, IL',
    'lincoln park': 'Lincoln Park, IL',
    'the loop': 'The Loop, IL',
    // Other notable areas
    'silicon valley': 'Silicon Valley, CA',
    'bay area': 'San Francisco Bay Area, CA',
};

// Country code to name mapping (common ones)
const COUNTRY_CODES: Record<string, string> = {
    'us': 'USA',
    'usa': 'USA',
    'united states': 'USA',
    'united states of america': 'USA',
    'uk': 'United Kingdom',
    'gb': 'United Kingdom',
    'great britain': 'United Kingdom',
    'england': 'United Kingdom',
    'de': 'Germany',
    'deutschland': 'Germany',
    'fr': 'France',
    'jp': 'Japan',
    'cn': 'China',
    'ca': 'Canada',
    'au': 'Australia',
    'br': 'Brazil',
    'in': 'India',
    'es': 'Spain',
    'it': 'Italy',
    'nl': 'Netherlands',
    'pt': 'Portugal',
    'se': 'Sweden',
    'no': 'Norway',
    'dk': 'Denmark',
    'fi': 'Finland',
    'ie': 'Ireland',
    'nz': 'New Zealand',
    'sg': 'Singapore',
    'hk': 'Hong Kong',
    'kr': 'South Korea',
    'mx': 'Mexico',
    'ar': 'Argentina',
    'ch': 'Switzerland',
    'be': 'Belgium',
    'at': 'Austria',
    'pl': 'Poland',
    'za': 'South Africa',
    'ae': 'UAE',
    'uae': 'UAE',
    'united arab emirates': 'UAE',
    'il': 'Israel',
};

// Words that should stay lowercase in title case
const LOWERCASE_WORDS = new Set(['and', 'or', 'the', 'of', 'in', 'at', 'to', 'for', 'on', 'by']);

// Words that should stay uppercase
const UPPERCASE_WORDS = new Set(['usa', 'uk', 'uae', 'dc', 'nyc', 'la', 'sf']);

/**
 * Convert string to title case with smart handling
 */
function toTitleCase(str: string): string {
    return str.split(/\s+/).map((word, index) => {
        const lower = word.toLowerCase();
        
        // Keep uppercase words as-is
        if (UPPERCASE_WORDS.has(lower)) {
            return word.toUpperCase();
        }
        
        // Keep lowercase words lowercase (except first word)
        if (index > 0 && LOWERCASE_WORDS.has(lower)) {
            return lower;
        }
        
        // Handle hyphenated words
        if (word.includes('-')) {
            return word.split('-').map(part => 
                part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()
            ).join('-');
        }
        
        // Standard title case
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    }).join(' ');
}

/**
 * Remove emoji and special characters from location
 */
function removeEmojis(str: string): string {
    // Remove emoji flags and other emoji
    return str.replace(/[\u{1F1E0}-\u{1F1FF}]|[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F700}-\u{1F77F}]|[\u{1F780}-\u{1F7FF}]|[\u{1F800}-\u{1F8FF}]|[\u{1F900}-\u{1F9FF}]|[\u{1FA00}-\u{1FA6F}]|[\u{1FA70}-\u{1FAFF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, '').trim();
}

/**
 * Check if a string is likely noise/not a real location
 */
function isNoise(str: string): boolean {
    return NOISE_PATTERNS.some(pattern => pattern.test(str));
}

/**
 * Normalize a location string to a consistent format
 */
export function normalizeLocation(location: string | null | undefined): string | null {
    if (!location) return null;
    
    // Trim and normalize whitespace
    let normalized = location.trim().replace(/\s+/g, ' ');
    
    if (!normalized) return null;
    
    // Check for noise patterns early
    if (isNoise(normalized)) return null;
    
    // Remove emojis
    normalized = removeEmojis(normalized);
    
    if (!normalized) return null;
    
    // Remove common noise patterns
    normalized = normalized
        .replace(/^📍\s*/i, '') // Remove pin emoji prefix
        .replace(/\s*\(.*?\)\s*/g, ' ') // Remove parenthetical notes
        .replace(/\s*-\s*remote$/i, '') // Remove "- Remote" suffix
        .replace(/\s*\|\s*remote$/i, '') // Remove "| Remote" suffix
        .replace(/,?\s*remote\s*$/i, '') // Remove trailing "Remote"
        .replace(/^remote\s*[-|,]?\s*/i, '') // Remove leading "Remote"
        .replace(/\s+/g, ' ')
        .trim();
    
    if (!normalized) return null;
    
    // Check for noise after cleaning
    if (isNoise(normalized)) return null;
    
    // Check for borough/neighborhood that should include city/state
    // Do this early, before splitting by separators
    const normalizedLower = normalized.toLowerCase();
    if (BOROUGH_NORMALIZATIONS[normalizedLower]) {
        return BOROUGH_NORMALIZATIONS[normalizedLower];
    }
    
    // Remove "Greater" and "Area" from LinkedIn-style locations
    // "Greater Los Angeles Area" → "Los Angeles"
    // "San Francisco Bay Area" → "San Francisco Bay Area" (keep this one, it's meaningful)
    normalized = normalized
        .replace(/^greater\s+/i, '')
        .replace(/\s+metropolitan\s+area$/i, '')
        .replace(/\s+metro\s+area$/i, '')
        .replace(/\s+metro$/i, '');
    
    // Handle special case: "Washington, DC" or "Washington DC"
    if (/^washington[,\s]+d\.?c\.?$/i.test(normalized)) {
        return 'Washington, DC';
    }
    
    // Handle special case: standalone "DC"
    if (/^d\.?c\.?$/i.test(normalized)) {
        return 'Washington, DC';
    }
    
    // Split by common separators
    const parts = normalized.split(/[,;\/]+/).map(p => p.trim()).filter(Boolean);
    
    if (parts.length === 0) return null;
    
    // Special handling for "City, State" where city name == state name (e.g., "New York, NY" or "New York, New York")
    if (parts.length === 2) {
        const [city, state] = parts;
        const cityLower = city.toLowerCase();
        const stateLower = state.toLowerCase();
        const stateUpper = state.toUpperCase();
        
        // Check if state is a 2-letter abbreviation
        if (/^[A-Za-z]{2}$/.test(state) && US_STATE_ABBREVS[stateUpper]) {
            const stateName = US_STATE_ABBREVS[stateUpper].toLowerCase();
            // If city name matches state name, keep format as "City, ST"
            if (cityLower === stateName || cityLower === stateUpper.toLowerCase()) {
                return `${toTitleCase(city)}, ${stateUpper}`;
            }
        }
        
        // Check if state is a full state name
        if (US_STATE_NAMES[stateLower]) {
            const stateAbbrev = US_STATE_NAMES[stateLower];
            const stateName = US_STATE_ABBREVS[stateAbbrev].toLowerCase();
            // If city name matches state name, keep format as "City, ST"
            if (cityLower === stateName) {
                return `${toTitleCase(city)}, ${stateAbbrev}`;
            }
        }
    }
    
    // Process each part
    const processedParts: string[] = [];
    
    for (let i = 0; i < parts.length; i++) {
        let part = parts[i];
        const partLower = part.toLowerCase();
        const nextPart = parts[i + 1];
        const nextPartUpper = nextPart?.toUpperCase();
        
        // Check for city abbreviation (only for single-word parts)
        if (!part.includes(' ') && CITY_NORMALIZATIONS[partLower]) {
            part = CITY_NORMALIZATIONS[partLower];
        }
        // Check for state abbreviation (2 letters)
        else if (/^[A-Za-z]{2}$/.test(part)) {
            const upper = part.toUpperCase();
            if (upper === 'DC') {
                // DC is special - it's Washington, DC
                part = 'DC';
            } else if (US_STATE_ABBREVS[upper]) {
                // Keep as abbreviation for consistency
                part = upper;
            } else if (COUNTRY_CODES[partLower]) {
                part = COUNTRY_CODES[partLower];
            } else {
                part = upper;
            }
        }
        // Check for country name
        else if (COUNTRY_CODES[partLower]) {
            part = COUNTRY_CODES[partLower];
        }
        // Check for full state name - but not if it's followed by a state abbreviation
        // This handles "San Francisco, California, United States" → "San Francisco, CA"
        else if (US_STATE_NAMES[partLower]) {
            // If next part is a country or "United States", convert state to abbreviation
            if (!nextPart || COUNTRY_CODES[nextPart?.toLowerCase()] || nextPart?.toLowerCase() === 'united states') {
                part = US_STATE_NAMES[partLower];
            } else {
                part = toTitleCase(part);
            }
        }
        // Otherwise, apply title case
        else {
            part = toTitleCase(part);
        }
        
        // Skip if this part is a duplicate of the previous part
        if (processedParts.length > 0 && processedParts[processedParts.length - 1].toLowerCase() === part.toLowerCase()) {
            continue;
        }
        
        // Skip "USA" or "United States" if we already have a US state
        if ((part === 'USA' || partLower === 'united states') && processedParts.some(p => US_STATE_ABBREVS[p])) {
            continue;
        }
        
        processedParts.push(part);
    }
    
    if (processedParts.length === 0) return null;
    
    // Special case: if only a state abbreviation, convert to full name
    if (processedParts.length === 1 && US_STATE_ABBREVS[processedParts[0]]) {
        return US_STATE_ABBREVS[processedParts[0]];
    }
    
    // Join with proper formatting
    return processedParts.join(', ');
}

/**
 * Check if two locations are equivalent after normalization
 */
export function locationsMatch(loc1: string | null | undefined, loc2: string | null | undefined): boolean {
    const norm1 = normalizeLocation(loc1);
    const norm2 = normalizeLocation(loc2);
    
    if (!norm1 || !norm2) return false;
    
    return norm1.toLowerCase() === norm2.toLowerCase();
}

/**
 * Extract city from a normalized location
 */
export function extractCity(location: string | null | undefined): string | null {
    const normalized = normalizeLocation(location);
    if (!normalized) return null;
    
    const parts = normalized.split(',').map(p => p.trim());
    return parts[0] || null;
}

/**
 * Extract region/state from a normalized location
 */
export function extractRegion(location: string | null | undefined): string | null {
    const normalized = normalizeLocation(location);
    if (!normalized) return null;
    
    const parts = normalized.split(',').map(p => p.trim());
    if (parts.length < 2) return null;
    
    // Return the second part, which is typically state/region
    const region = parts[1];
    
    // If it's a state abbreviation, return full name
    if (US_STATE_ABBREVS[region]) {
        return US_STATE_ABBREVS[region];
    }
    
    return region;
}

/**
 * Extract country from a normalized location
 */
export function extractCountry(location: string | null | undefined): string | null {
    const normalized = normalizeLocation(location);
    if (!normalized) return null;
    
    const parts = normalized.split(',').map(p => p.trim());
    
    // Check last part for country
    const last = parts[parts.length - 1];
    const lastLower = last?.toLowerCase();
    
    if (COUNTRY_CODES[lastLower]) {
        return COUNTRY_CODES[lastLower];
    }
    
    // If we have a US state, assume USA
    for (const part of parts) {
        if (US_STATE_ABBREVS[part]) {
            return 'USA';
        }
    }
    
    return null;
}

export default normalizeLocation;
