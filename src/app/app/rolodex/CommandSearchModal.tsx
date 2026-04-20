import Image from "next/image";
import { Search, Loader2, Command } from "lucide-react";
import { useRef, useEffect } from "react";
import type { Contact } from "./types";

export interface SemanticSearchResult {
    id: number;
    people_id: number;
    note: string;
    similarity: number;
    person: { id: number; name: string; custom_profile_image_url?: string } | null;
}

interface CommandSearchModalProps {
    commandSearchQuery: string;
    setCommandSearchQuery: (query: string) => void;
    commandSearchIndex: number;
    setCommandSearchIndex: (index: number | ((prev: number) => number)) => void;
    commandSearchResults: Contact[];
    semanticSearchResults: SemanticSearchResult[];
    semanticSearchLoading: boolean;
    contacts: Contact[];
    onSelect: (contactId: number) => void;
    onClose: () => void;
}

export default function CommandSearchModal({
    commandSearchQuery,
    setCommandSearchQuery,
    commandSearchIndex,
    setCommandSearchIndex,
    commandSearchResults,
    semanticSearchResults,
    semanticSearchLoading,
    contacts,
    onSelect,
    onClose,
}: CommandSearchModalProps) {
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    const isSemanticMode = commandSearchQuery.toLowerCase().startsWith("q:");
    const resultsLength = isSemanticMode ? semanticSearchResults.length : commandSearchResults.length;

    return (
        <div
            className="fixed inset-0 z-[100] bg-black/50 flex items-start justify-center pt-[15vh]"
            onClick={onClose}
        >
            <div
                className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-lg shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Search Input */}
                <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                    <Search className="h-5 w-5 text-gray-400 flex-shrink-0" />
                    <input
                        ref={inputRef}
                        type="text"
                        value={commandSearchQuery}
                        onChange={(e) => {
                            setCommandSearchQuery(e.target.value);
                            setCommandSearchIndex(0);
                        }}
                        onKeyDown={(e) => {
                            if (e.key === "Escape") {
                                onClose();
                            } else if (e.key === "ArrowDown") {
                                e.preventDefault();
                                setCommandSearchIndex((prev: number) =>
                                    prev < resultsLength - 1 ? prev + 1 : prev
                                );
                            } else if (e.key === "ArrowUp") {
                                e.preventDefault();
                                setCommandSearchIndex((prev: number) => (prev > 0 ? prev - 1 : 0));
                            } else if (e.key === "Enter" && resultsLength > 0) {
                                e.preventDefault();
                                if (isSemanticMode) {
                                    onSelect(semanticSearchResults[commandSearchIndex].people_id);
                                } else {
                                    onSelect(commandSearchResults[commandSearchIndex].id);
                                }
                            }
                        }}
                        placeholder="Search contacts... (q: for notes)"
                        className="flex-1 bg-transparent text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none text-base"
                    />
                    <div className="flex items-center gap-1 text-xs text-gray-400">
                        <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700 font-mono">
                            esc
                        </kbd>
                    </div>
                </div>

                {/* Results */}
                <div className="max-h-80 overflow-y-auto">
                    {(() => {
                        const semanticQuery = commandSearchQuery.slice(2).trim();

                        // Semantic search mode
                        if (isSemanticMode) {
                            if (semanticSearchLoading) {
                                return (
                                    <div className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                                        <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" />
                                        Searching notes...
                                    </div>
                                );
                            }

                            if (!semanticQuery) {
                                return (
                                    <div className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                                        Type a question to search your notes
                                    </div>
                                );
                            }

                            if (semanticSearchResults.length === 0 && !semanticSearchLoading) {
                                return (
                                    <div className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                                        Type a question to search your notes
                                    </div>
                                );
                            }

                            return (
                                <div className="py-2">
                                    {semanticSearchResults.map((result, index) => {
                                        const isSelected = index === commandSearchIndex;
                                        const contact = contacts.find(c => c.id === result.people_id);
                                        const xp = contact?.x_profile;
                                        const li = contact?.linkedin_profile;
                                        const profileImageUrl = contact?.custom_profile_image_url || xp?.profile_image_url?.replace("_normal", "_bigger") || li?.profile_image_url;

                                        return (
                                            <button
                                                key={result.id}
                                                onClick={() => onSelect(result.people_id)}
                                                onMouseEnter={() => setCommandSearchIndex(index)}
                                                className={`w-full flex items-start gap-3 px-4 py-3 text-left transition-colors ${isSelected
                                                    ? "bg-gray-50 dark:bg-gray-800/20"
                                                    : "hover:bg-gray-50 dark:hover:bg-gray-800/50"
                                                    }`}
                                            >
                                                {profileImageUrl ? (
                                                    <Image
                                                        src={profileImageUrl}
                                                        alt={result.person?.name || ""}
                                                        width={36}
                                                        height={36}
                                                        unoptimized
                                                        className="rounded-full flex-shrink-0 mt-0.5"
                                                    />
                                                ) : (
                                                    <div className="w-9 h-9 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center flex-shrink-0 mt-0.5">
                                                        <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                                                            {(result.person?.name || "?").charAt(0).toUpperCase()}
                                                        </span>
                                                    </div>
                                                )}
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-medium text-gray-900 dark:text-white truncate">
                                                        {result.person?.name || "Unknown"}
                                                    </p>
                                                    <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2 mt-0.5">
                                                        {result.note}
                                                    </p>
                                                </div>
                                                {isSelected && (
                                                    <div className="flex items-center gap-1 text-xs text-gray-400 mt-0.5">
                                                        <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700 font-mono">
                                                            &crarr;
                                                        </kbd>
                                                    </div>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            );
                        }

                        // Regular contact search mode
                        if (commandSearchResults.length === 0) {
                            return (
                                <div className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                                    {commandSearchQuery.trim() ? "No contacts found" : "No contacts yet"}
                                </div>
                            );
                        }

                        return (
                            <div className="py-2">
                                {commandSearchResults.map((contact, index) => {
                                    const xp = contact.x_profile;
                                    const li = contact.linkedin_profile;
                                    const profileImageUrl = contact.custom_profile_image_url || xp?.profile_image_url?.replace("_normal", "_bigger") || li?.profile_image_url;
                                    const isSelected = index === commandSearchIndex;

                                    return (
                                        <button
                                            key={contact.id}
                                            onClick={() => onSelect(contact.id)}
                                            onMouseEnter={() => setCommandSearchIndex(index)}
                                            className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${isSelected
                                                ? "bg-gray-50 dark:bg-gray-800/20"
                                                : "hover:bg-gray-50 dark:hover:bg-gray-800/50"
                                                }`}
                                        >
                                            {profileImageUrl ? (
                                                <Image
                                                    src={profileImageUrl}
                                                    alt={contact.name}
                                                    width={36}
                                                    height={36}
                                                    unoptimized
                                                    className="rounded-full flex-shrink-0"
                                                />
                                            ) : (
                                                <div className="w-9 h-9 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
                                                    <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                                                        {contact.name.charAt(0).toUpperCase()}
                                                    </span>
                                                </div>
                                            )}
                                            <div className="flex-1 min-w-0">
                                                <p className="font-medium text-gray-900 dark:text-white truncate">
                                                    {contact.name}
                                                </p>
                                                {xp?.username && (
                                                    <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                                                        @{xp.username}
                                                    </p>
                                                )}
                                                {!xp?.username && li?.headline && (
                                                    <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                                                        {li.headline}
                                                    </p>
                                                )}
                                            </div>
                                            {isSelected && (
                                                <div className="flex items-center gap-1 text-xs text-gray-400">
                                                    <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700 font-mono">
                                                        &crarr;
                                                    </kbd>
                                                </div>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        );
                    })()}
                </div>

                {/* Footer hint */}
                <div className="px-4 py-2.5 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                    <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1">
                            <kbd className="px-1 py-0.5 bg-white dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600 font-mono">&uarr;</kbd>
                            <kbd className="px-1 py-0.5 bg-white dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600 font-mono">&darr;</kbd>
                            <span className="ml-1">navigate</span>
                        </span>
                        <span className="flex items-center gap-1">
                            <kbd className="px-1.5 py-0.5 bg-white dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600 font-mono">&crarr;</kbd>
                            <span className="ml-1">select</span>
                        </span>
                    </div>
                    <span className="flex items-center gap-1">
                        <Command className="h-3 w-3" />
                        <span>K to search</span>
                    </span>
                </div>
            </div>
        </div>
    );
}
