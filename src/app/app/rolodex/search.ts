import {
    extractCity,
    extractCountry,
    extractRegion,
    normalizeLocation,
} from "@/lib/location/normalize";
import type { Contact } from "./types";

export type ContactSearchIndex = {
    contactId: number;
    text: string;
    compactText: string;
};

export function normalizeSearchText(value: string | null | undefined) {
    return (value || "")
        .toLowerCase()
        .normalize("NFKD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, " ")
        .trim()
        .replace(/\s+/g, " ");
}

function addLocationVariants(variants: Set<string>, location: string | null | undefined) {
    const normalized = normalizeLocation(location);
    const source = normalizeSearchText(location);
    const normalizedText = normalizeSearchText(normalized);
    const city = normalizeSearchText(extractCity(normalized));
    const region = normalizeSearchText(extractRegion(normalized));
    const country = normalizeSearchText(extractCountry(normalized));

    [source, normalizedText, city, region, country].forEach((value) => {
        if (value) variants.add(value);
    });

    if (
        normalizedText === "new york ny" ||
        normalizedText === "new york city" ||
        city === "new york" ||
        city === "new york city"
    ) {
        variants.add("nyc");
        variants.add("new york");
        variants.add("new york city");
    }
}

export function createContactSearchIndex(contact: Contact): ContactSearchIndex {
    const xp = contact.x_profile;
    const li = contact.linkedin_profile;
    const values = new Set<string>();

    [
        contact.name,
        xp?.username,
        xp?.display_name,
        xp?.bio,
        li?.headline,
        li?.linkedin_url,
        contact.custom_bio,
        contact.website_url,
        ...contact.notes.map((note) => note.note),
    ].forEach((value) => {
        const normalized = normalizeSearchText(value);
        if (normalized) values.add(normalized);
    });

    addLocationVariants(values, contact.custom_location);
    addLocationVariants(values, xp?.location);
    addLocationVariants(values, li?.location);

    const text = [...values].join(" ");

    return {
        contactId: contact.id,
        text,
        compactText: text.replace(/\s+/g, ""),
    };
}

export function contactMatchesSearchIndex(index: ContactSearchIndex, query: string) {
    const normalizedQuery = normalizeSearchText(query);
    if (!normalizedQuery) return true;

    return (
        index.text.includes(normalizedQuery) ||
        index.compactText.includes(normalizedQuery.replace(/\s+/g, ""))
    );
}

export function contactMatchesSearchQuery(contact: Contact, query: string) {
    if (!query.trim()) return true;
    return contactMatchesSearchIndex(createContactSearchIndex(contact), query);
}
