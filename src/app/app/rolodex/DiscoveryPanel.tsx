import Image from "next/image";
import { Compass, X, AtSign, Loader2, Search, ExternalLink, Plus, Check } from "lucide-react";
import type { Contact, DiscoveryResult } from "./types";

interface DiscoveryPanelProps {
    discoveryUsername: string;
    setDiscoveryUsername: (value: string) => void;
    discoveryLoading: boolean;
    discoveryPrefillLoading: boolean;
    discoveryResult: DiscoveryResult | null;
    discoveryError: string | null;
    contacts: Contact[];
    onSearch: () => void;
    onAddFromDiscovery: (username: string) => void;
    onClose: () => void;
}

export default function DiscoveryPanel({
    discoveryUsername,
    setDiscoveryUsername,
    discoveryLoading,
    discoveryPrefillLoading,
    discoveryResult,
    discoveryError,
    contacts,
    onSearch,
    onAddFromDiscovery,
    onClose,
}: DiscoveryPanelProps) {
    return (
        <div className="mb-6 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <Compass className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                        <h3 className="font-semibold text-gray-900 dark:text-white">
                            Discover Connections
                        </h3>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    See who someone interacted with most recently on X
                </p>
                <div className="flex gap-2">
                    <div className="relative flex-1">
                        {discoveryPrefillLoading ? (
                            <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 animate-spin" />
                        ) : (
                            <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        )}
                        <input
                            type="text"
                            value={discoveryUsername}
                            onChange={(e) => setDiscoveryUsername(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter" && discoveryUsername.trim()) {
                                    onSearch();
                                }
                            }}
                            placeholder={discoveryPrefillLoading ? "Loading suggestion..." : "Enter X username..."}
                            className="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-transparent text-sm"
                        />
                    </div>
                    <button
                        onClick={onSearch}
                        disabled={discoveryLoading || !discoveryUsername.trim()}
                        className="px-5 py-2.5 bg-gray-900 hover:bg-gray-800 dark:bg-gray-700 dark:hover:bg-gray-600 disabled:bg-gray-300 dark:disabled:bg-gray-700 text-white font-medium rounded-xl transition-colors flex items-center gap-2 text-sm"
                    >
                        {discoveryLoading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <Search className="h-4 w-4" />
                        )}
                        Search
                    </button>
                </div>
                {discoveryError && (
                    <p className="mt-3 text-sm text-red-600 dark:text-red-400">{discoveryError}</p>
                )}
            </div>

            {/* Results */}
            {discoveryResult && (
                <div className="p-5">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-900 dark:text-white">
                                @{discoveryResult.username}
                            </span>
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                                · {discoveryResult.tweetCount} tweets analyzed
                            </span>
                        </div>
                        <a
                            href={`https://x.com/${discoveryResult.username}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-gray-500 dark:text-gray-400 hover:underline flex items-center gap-1"
                        >
                            View profile
                            <ExternalLink className="h-3 w-3" />
                        </a>
                    </div>

                    {discoveryResult.topInteractions.filter(i => i.username.toLowerCase() !== "ashebytes").length === 0 ? (
                        <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">
                            No interactions found in the last 7 days
                        </p>
                    ) : (
                        <div className="flex flex-wrap gap-2">
                            {discoveryResult.topInteractions.filter(i => i.username.toLowerCase() !== "ashebytes").map((interaction) => {
                                const rolodexContact = contacts.find(
                                    (c) => c.x_profile?.username.toLowerCase() === interaction.username.toLowerCase()
                                );
                                const isInRolodex = !!rolodexContact;
                                const profileImageUrl = rolodexContact?.custom_profile_image_url || rolodexContact?.x_profile?.profile_image_url?.replace("_normal", "_bigger");

                                return (
                                    <div
                                        key={interaction.username}
                                        className={`group flex items-center gap-2 pl-1 pr-2 py-1 rounded-full border transition-colors ${isInRolodex
                                            ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800/50"
                                            : "bg-white dark:bg-gray-900/60 border-gray-200 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-500"
                                            }`}
                                    >
                                        {/* Profile image */}
                                        {profileImageUrl ? (
                                            <Image
                                                src={profileImageUrl}
                                                alt={interaction.username}
                                                width={24}
                                                height={24}
                                                className="rounded-full"
                                            />
                                        ) : (
                                            <div className="w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                                                <span className="text-[10px] font-medium text-gray-600 dark:text-gray-400">
                                                    {interaction.username.charAt(0).toUpperCase()}
                                                </span>
                                            </div>
                                        )}

                                        {/* Username */}
                                        <a
                                            href={interaction.profileUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-sm text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
                                        >
                                            @{interaction.username}
                                        </a>

                                        {/* Count */}
                                        <span className="text-xs text-gray-400 dark:text-gray-500">
                                            {interaction.count}
                                        </span>

                                        {/* Add button */}
                                        {!isInRolodex && (
                                            <button
                                                onClick={() => onAddFromDiscovery(interaction.username)}
                                                className="opacity-0 group-hover:opacity-100 p-0.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 transition-all"
                                                title="Add to People"
                                            >
                                                <Plus className="h-3.5 w-3.5" />
                                            </button>
                                        )}

                                        {/* Check for in rolodex */}
                                        {isInRolodex && (
                                            <Check className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
