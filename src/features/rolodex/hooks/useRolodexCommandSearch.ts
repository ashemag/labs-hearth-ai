"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import type { Contact, RolodexList } from "../types";
import { createContactSearchIndex, normalizeSearchText } from "../search";

interface SemanticSearchResult {
    id: number;
    people_id: number;
    note: string;
    similarity: number;
    person: { id: number; name: string; custom_profile_image_url?: string } | null;
}

interface UseRolodexCommandSearchInput {
    contacts: Contact[];
    setLists: React.Dispatch<React.SetStateAction<RolodexList[]>>;
    setActiveList: React.Dispatch<React.SetStateAction<number | "all" | "curated">>;
    setSearchQuery: React.Dispatch<React.SetStateAction<string>>;
    setSelectedContactId: React.Dispatch<React.SetStateAction<number | null>>;
}

export function useRolodexCommandSearch({
    contacts,
    setLists,
    setActiveList,
    setSearchQuery,
    setSelectedContactId,
}: UseRolodexCommandSearchInput) {
    const [showCommandSearch, setShowCommandSearch] = useState(false);
    const [commandSearchQuery, setCommandSearchQuery] = useState("");
    const [commandSearchIndex, setCommandSearchIndex] = useState(0);
    const [creatingSearchList, setCreatingSearchList] = useState(false);
    const [semanticSearchResults, setSemanticSearchResults] = useState<SemanticSearchResult[]>([]);
    const [semanticSearchLoading, setSemanticSearchLoading] = useState(false);
    const [, startTransition] = useTransition();
    const semanticSearchCache = useRef(new Map<string, SemanticSearchResult[]>());

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "k") {
                e.preventDefault();
                setShowCommandSearch(true);
                setCommandSearchQuery("");
                setCommandSearchIndex(0);
            }
        };

        document.addEventListener("keydown", handleKeyDown);
        return () => document.removeEventListener("keydown", handleKeyDown);
    }, []);

    useEffect(() => {
        const isSemanticQuery = commandSearchQuery.toLowerCase().startsWith("q:");

        if (!isSemanticQuery) {
            setSemanticSearchResults([]);
            setSemanticSearchLoading(false);
            return;
        }

        const query = commandSearchQuery.slice(2).trim();
        if (!query) {
            setSemanticSearchResults([]);
            setSemanticSearchLoading(false);
            return;
        }

        const cacheKey = query.toLowerCase();
        const cachedResults = semanticSearchCache.current.get(cacheKey);
        if (cachedResults) {
            setSemanticSearchResults(cachedResults);
            setSemanticSearchLoading(false);
            return;
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(async () => {
            setSemanticSearchLoading(true);
            try {
                const res = await fetch(`/api/rolodex/notes/search?q=${encodeURIComponent(query)}&limit=10&threshold=0.3`, {
                    credentials: "include",
                    signal: controller.signal,
                });
                if (res.ok) {
                    const data = await res.json();
                    const results = data.results || [];
                    semanticSearchCache.current.set(cacheKey, results);
                    setSemanticSearchResults(results);
                }
            } catch (error) {
                if (!(error instanceof DOMException && error.name === "AbortError")) {
                    console.error("Semantic search error:", error);
                }
            } finally {
                if (!controller.signal.aborted) {
                    setSemanticSearchLoading(false);
                }
            }
        }, 180);

        return () => {
            clearTimeout(timeoutId);
            controller.abort();
        };
    }, [commandSearchQuery]);

    const searchableContacts = useMemo(() => {
        return contacts
            .map((contact) => ({
                contact,
                index: createContactSearchIndex(contact),
                lastActivityTime: new Date(contact.notes[0]?.created_at || contact.created_at).getTime(),
            }))
            .sort((a, b) => b.lastActivityTime - a.lastActivityTime);
    }, [contacts]);

    const commandSearchState = useMemo(() => {
        const normalizedQuery = normalizeSearchText(commandSearchQuery);
        const compactQuery = normalizedQuery.replace(/\s+/g, "");
        const isSemanticQuery = commandSearchQuery.toLowerCase().startsWith("q:");
        const results: Contact[] = [];
        const matchedContactIds: number[] = [];

        if (isSemanticQuery) {
            return { results, matchedContactIds, count: 0 };
        }

        for (const { contact, index } of searchableContacts) {
            const matches = !normalizedQuery ||
                index.text.includes(normalizedQuery) ||
                index.compactText.includes(compactQuery);

            if (!matches) continue;

            matchedContactIds.push(contact.id);
            if (results.length < 8) {
                results.push(contact);
            }
        }

        return {
            results,
            matchedContactIds,
            count: matchedContactIds.length,
        };
    }, [commandSearchQuery, searchableContacts]);

    const commandSearchResults = commandSearchState.results;

    const handleCommandSearchSelect = useCallback((contactId: number) => {
        setShowCommandSearch(false);
        startTransition(() => setCommandSearchQuery(""));
        setCommandSearchIndex(0);
        setActiveList("all");
        setSearchQuery("");
        setTimeout(() => {
            setSelectedContactId(contactId);
            const element = document.querySelector(`[data-contact-id="${contactId}"]`);
            element?.scrollIntoView({ behavior: "smooth", block: "center" });
        }, 50);
    }, [setActiveList, setSearchQuery, setSelectedContactId, startTransition]);

    const handleCreateListFromCommandSearch = useCallback(async (name: string) => {
        const memberIds = commandSearchState.matchedContactIds;
        if (!name.trim() || memberIds.length === 0) return;

        setCreatingSearchList(true);
        try {
            const res = await fetch("/api/rolodex/lists", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ name: name.trim(), people_ids: memberIds }),
            });
            const data = await res.json();

            if (!res.ok || !data.list) {
                throw new Error(data.error || "Failed to create list");
            }

            setLists((prev) => [...prev, data.list].sort((a, b) => a.name.localeCompare(b.name)));
            setActiveList(data.list.id);
            setShowCommandSearch(false);
            startTransition(() => setCommandSearchQuery(""));
            setCommandSearchIndex(0);
            toast(`Created "${data.list.name}" with ${memberIds.length} contact${memberIds.length === 1 ? "" : "s"}`);
        } catch (error) {
            console.error("Error creating list from search:", error);
            toast.error("Couldn't create list from search");
        } finally {
            setCreatingSearchList(false);
        }
    }, [commandSearchState.matchedContactIds, setActiveList, setLists, startTransition]);

    return {
        showCommandSearch,
        setShowCommandSearch,
        commandSearchQuery,
        setCommandSearchQuery,
        commandSearchIndex,
        setCommandSearchIndex,
        commandSearchResults,
        semanticSearchResults,
        semanticSearchLoading,
        commandSearchResultCount: commandSearchState.count,
        creatingSearchList,
        handleCommandSearchSelect,
        handleCreateListFromCommandSearch,
    };
}
