const joinedDatePattern = /^Joined\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}$/i;

function normalizeComparable(value: string) {
    return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

export function sanitizeXBio(rawBio: string | null | undefined, rawLocation?: string | null) {
    if (typeof rawBio !== "string") return null;

    const bio = rawBio?.replace(/\s+/g, " ").trim();
    if (!bio) return null;

    const location = rawLocation?.trim();
    if (location && normalizeComparable(bio) === normalizeComparable(location)) {
        return null;
    }

    const lines = rawBio
        .split(/\r?\n/)
        .map((line) => line.replace(/\s+/g, " ").trim())
        .filter(Boolean)
        .filter((line) => {
            if (joinedDatePattern.test(line)) return false;
            return !location || normalizeComparable(line) !== normalizeComparable(location);
        });

    const cleaned = (lines.length > 0 ? lines.join(" ") : bio).trim();
    if (!cleaned || joinedDatePattern.test(cleaned)) return null;

    if (location) {
        const comparableLocation = normalizeComparable(location);
        const comparableCleaned = normalizeComparable(cleaned);
        if (comparableCleaned.startsWith(comparableLocation)) {
            const remainder = cleaned.slice(location.length).replace(/^[\s,;:|/-]+/, "").trim();
            if (!remainder || joinedDatePattern.test(remainder)) {
                return null;
            }
        }
    }

    return cleaned;
}
