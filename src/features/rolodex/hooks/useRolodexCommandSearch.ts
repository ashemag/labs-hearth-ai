"use client";

import { useCallback, useDeferredValue, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import type { Contact, RolodexList } from "../types";
import { contactMatchesSearchIndex, createContactSearchIndex } from "../search";

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
    const deferredCommandSearchQuery = useDeferredValue(commandSearchQuery);
    const [commandSearchIndex, setCommandSearchIndex] = useState(0);
    const [creatingSearchList, setCreatingSearchList] = useState(false);
    const [semanticSearchResults, setSemanticSearchResults] = useState<SemanticSearchResult[]>([]);
    const [semanticSearchLoading, setSemanticSearchLoading] = useState(false);

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

        const timeoutId = setTimeout(async () => {
            setSemanticSearchLoading(true);
            try {
                const res = await fetch(`/api/rolodex/notes/search?q=${encodeURIComponent(query)}&limit=10&threshold=0.3`, {
                    credentials: "include",
                });
                if (res.ok) {
                    const data = await res.json();
                    setSemanticSearchResults(data.results || []);
                }
            } catch (error) {
                console.error("Semantic search error:", error);
            } finally {
                setSemanticSearchLoading(false);
            }
        }, 300);

        return () => clearTimeout(timeoutId);
    }, [commandSearchQuery]);

    const sortedContacts = useMemo(() => [...contacts].sort((a, b) => {
        const aLastActivity = a.notes[0]?.created_at || a.created_at;
        const bLastActivity = b.notes[0]?.created_at || b.created_at;
        return new Date(bLastActivity).getTime() - new Date(aLastActivity).getTime();
    }), [contacts]);

    const contactSearchIndexes = useMemo(() => {
        return new Map(contacts.map((contact) => [
            contact.id,
            createContactSearchIndex(contact),
        ]));
    }, [contacts]);

    const commandSearchMatches = useMemo(() => {
        if (!deferredCommandSearchQuery.trim()) {
            return sortedContacts;
        }

        return sortedContacts.filter((contact) => {
            const index = contactSearchIndexes.get(contact.id);
            return index ? contactMatchesSearchIndex(index, deferredCommandSearchQuery) : false;
        });
    }, [deferredCommandSearchQuery, contactSearchIndexes, sortedContacts]);

    const commandSearchResults = useMemo(() => {
        return commandSearchMatches.slice(0, 8);
    }, [commandSearchMatches]);

    const handleCommandSearchSelect = useCallback((contactId: number) => {
        setShowCommandSearch(false);
        setCommandSearchQuery("");
        setCommandSearchIndex(0);
        setActiveList("all");
        setSearchQuery("");
        setTimeout(() => {
            setSelectedContactId(contactId);
            const element = document.querySelector(`[data-contact-id="${contactId}"]`);
            element?.scrollIntoView({ behavior: "smooth", block: "center" });
        }, 50);
    }, [setActiveList, setSearchQuery, setSelectedContactId]);

    const handleCreateListFromCommandSearch = useCallback(async (name: string) => {
        const memberIds = commandSearchMatches.map((contact) => contact.id);
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
            setCommandSearchQuery("");
            setCommandSearchIndex(0);
            toast(`Created "${data.list.name}" with ${memberIds.length} contact${memberIds.length === 1 ? "" : "s"}`);
        } catch (error) {
            console.error("Error creating list from search:", error);
            toast.error("Couldn't create list from search");
        } finally {
            setCreatingSearchList(false);
        }
    }, [commandSearchMatches, setActiveList, setLists]);

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
        commandSearchResultCount: commandSearchMatches.length,
        creatingSearchList,
        handleCommandSearchSelect,
        handleCreateListFromCommandSearch,
    };
}
