import { Loader2, Plus, Check, Sparkles, Users, Compass, MoreHorizontal, Pin, PinOff, Eye, EyeOff } from "lucide-react";
import data from "@emoji-mart/data";
import Picker from "@emoji-mart/react";
import type { Contact, RolodexList } from "./types";

interface ListsSidebarProps {
    contacts: Contact[];
    lists: RolodexList[];
    activeList: number | "all" | "curated";
    setActiveList: (list: number | "all" | "curated") => void;
    showNewListInput: boolean;
    setShowNewListInput: (show: boolean) => void;
    newListName: string;
    setNewListName: (name: string) => void;
    creatingList: boolean;
    handleCreateList: () => void;
    renamingListId: number | null;
    setRenamingListId: (id: number | null) => void;
    renameListValue: string;
    setRenameListValue: (value: string) => void;
    handleRenameList: (listId: number, name: string) => void;
    listPickerOpen: number | null;
    setListPickerOpen: (id: number | null) => void;
    handleUpdateListAppearance: (listId: number, updates: { color?: string; emoji?: string }) => void;
    setListContextMenu: (menu: { x: number; y: number; listId: number } | null) => void;
    setShowAddModal: (show: boolean) => void;
    showDiscovery: boolean;
    setShowDiscovery: (show: boolean) => void;
    discoveryUsername: string;
    setDiscoveryUsername: (username: string) => void;
    setDiscoveryPrefillLoading: (loading: boolean) => void;
    showListsDropdown: boolean;
    setShowListsDropdown: (show: boolean) => void;
    listsDropdownRef: React.RefObject<HTMLDivElement>;
    hiddenListIds: Set<number>;
    setHiddenListIds: React.Dispatch<React.SetStateAction<Set<number>>>;
    handleToggleListPin: (listId: number, pinned: boolean) => void;
}

export default function ListsSidebar({
    contacts,
    lists,
    activeList,
    setActiveList,
    showNewListInput,
    setShowNewListInput,
    newListName,
    setNewListName,
    creatingList,
    handleCreateList,
    renamingListId,
    setRenamingListId,
    renameListValue,
    setRenameListValue,
    handleRenameList,
    listPickerOpen,
    setListPickerOpen,
    handleUpdateListAppearance,
    setListContextMenu,
    setShowAddModal,
    showDiscovery,
    setShowDiscovery,
    discoveryUsername,
    setDiscoveryUsername,
    setDiscoveryPrefillLoading,
    showListsDropdown,
    setShowListsDropdown,
    listsDropdownRef,
    hiddenListIds,
    setHiddenListIds,
    handleToggleListPin,
}: ListsSidebarProps) {
    return (
        <div className="w-44 flex-shrink-0 space-y-1">
            {/* Main filters */}
            <button
                onClick={() => setActiveList("curated")}
                className={`w-full flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${activeList === "curated"
                    ? "bg-gray-900 dark:bg-white text-white dark:text-gray-900"
                    : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                    }`}
            >
                <Sparkles className="h-4 w-4" />
                <span className="flex-1 text-left">Curated</span>
                <span className="text-xs opacity-60">{contacts.filter(c => c.notes.some(n => n.source_type !== "website_analysis")).length}</span>
            </button>
            <button
                onClick={() => setActiveList("all")}
                className={`w-full flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${activeList === "all"
                    ? "bg-gray-900 dark:bg-white text-white dark:text-gray-900"
                    : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                    }`}
            >
                <Users className="h-4 w-4" />
                <span className="flex-1 text-left">All</span>
                <span className="text-xs opacity-60">{contacts.length}</span>
            </button>

            {/* Divider */}
            {lists.filter(l => l.pinned).length > 0 && (
                <div className="border-t border-gray-200 dark:border-gray-700 my-2" />
            )}

            {/* Pinned lists */}
            {lists.filter(l => l.pinned).map((list) => (
                <div key={list.id} className="relative">
                    <button
                        onClick={() => setActiveList(activeList === list.id ? "curated" : list.id)}
                        onContextMenu={(e) => {
                            e.preventDefault();
                            setListContextMenu({ x: e.clientX, y: e.clientY, listId: list.id });
                        }}
                        className={`w-full flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${activeList === list.id
                            ? "bg-gray-900 dark:bg-white text-white dark:text-gray-900"
                            : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                            }`}
                    >
                        {list.emoji ? (
                            <span className="text-sm leading-none flex-shrink-0">{list.emoji}</span>
                        ) : (
                            <div
                                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                                style={{ backgroundColor: list.color }}
                            />
                        )}
                        {renamingListId === list.id ? (
                            <input
                                autoFocus
                                value={renameListValue}
                                onChange={(e) => setRenameListValue(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") handleRenameList(list.id, renameListValue);
                                    if (e.key === "Escape") setRenamingListId(null);
                                }}
                                onBlur={() => handleRenameList(list.id, renameListValue)}
                                onClick={(e) => e.stopPropagation()}
                                className="flex-1 text-left text-sm bg-transparent border-b border-gray-300 dark:border-gray-600 outline-none"
                            />
                        ) : (
                            <span className="flex-1 text-left truncate">{list.name}</span>
                        )}
                        <span className="text-xs opacity-60">{list.member_count}</span>
                    </button>

                    {/* Emoji picker popover */}
                    {listPickerOpen === list.id && (
                        <>
                            <div className="fixed inset-0 z-40" onClick={() => setListPickerOpen(null)} />
                            <div className="absolute left-0 top-full mt-1 z-50">
                                <Picker
                                    data={data}
                                    onEmojiSelect={(emoji: { native: string }) => {
                                        handleUpdateListAppearance(list.id, { emoji: emoji.native });
                                        setListPickerOpen(null);
                                    }}
                                    theme="light"
                                    previewPosition="none"
                                    skinTonePosition="none"
                                    perLine={8}
                                />
                                {list.emoji && (
                                    <div className="bg-white dark:bg-gray-800 border border-t-0 border-gray-200 dark:border-gray-700 rounded-b-xl px-3 py-2">
                                        <button
                                            onClick={() => {
                                                handleUpdateListAppearance(list.id, { emoji: "" });
                                                setListPickerOpen(null);
                                            }}
                                            className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                                        >
                                            Remove emoji
                                        </button>
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>
            ))}

            {/* Divider before actions */}
            <div className="border-t border-gray-200 dark:border-gray-700 my-2" />

            {/* New List */}
            {showNewListInput ? (
                <div className="px-1 space-y-1">
                    <input
                        type="text"
                        value={newListName}
                        onChange={(e) => setNewListName(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === "Enter" && newListName.trim()) {
                                handleCreateList();
                            } else if (e.key === "Escape") {
                                setShowNewListInput(false);
                                setNewListName("");
                            }
                        }}
                        placeholder="List name..."
                        autoFocus
                        className="w-full px-2 py-1.5 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-600"
                    />
                    <div className="flex items-center gap-1">
                        <button
                            onClick={handleCreateList}
                            disabled={!newListName.trim() || creatingList}
                            className="flex-1 flex items-center justify-center gap-1 px-2 py-1 text-xs font-medium text-white bg-gray-700 hover:bg-gray-800 disabled:bg-gray-400 rounded transition-colors"
                        >
                            {creatingList ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                                <Check className="h-3 w-3" />
                            )}
                            Save
                        </button>
                        <button
                            onClick={() => {
                                setShowNewListInput(false);
                                setNewListName("");
                            }}
                            className="px-2 py-1 text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            ) : (
                <button
                    onClick={() => setShowNewListInput(true)}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded-lg transition-colors"
                >
                    <Plus className="h-4 w-4" />
                    <span>New List</span>
                </button>
            )}

            {/* New Contact */}
            <button
                onClick={() => setShowAddModal(true)}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded-lg transition-colors"
            >
                <Plus className="h-4 w-4" />
                <span>New Contact</span>
            </button>

            {/* Discover */}
            <button
                onClick={async () => {
                    const opening = !showDiscovery;
                    setShowDiscovery(opening);
                    if (opening && !discoveryUsername) {
                        // Fetch the last replied-to username
                        setDiscoveryPrefillLoading(true);
                        try {
                            const res = await fetch("/api/rolodex/last-reply", {
                                credentials: "include",
                            });
                            const data = await res.json();
                            if (data.username) {
                                setDiscoveryUsername(data.username);
                            }
                        } catch (e) {
                            // Silently fail - not critical
                        } finally {
                            setDiscoveryPrefillLoading(false);
                        }
                    }
                }}
                className={`w-full flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${showDiscovery
                    ? "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                    : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                    }`}
            >
                <Compass className="h-4 w-4" />
                <span>Discover</span>
            </button>

            {/* More lists dropdown */}
            {lists.length > 0 && (
                <div className="relative" ref={listsDropdownRef}>
                    <button
                        onClick={() => setShowListsDropdown(!showListsDropdown)}
                        className={`w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors ${showListsDropdown
                            ? "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                            : hiddenListIds.size > 0
                                ? "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30"
                                : "text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                            }`}
                        title={hiddenListIds.size > 0 ? `${hiddenListIds.size} list${hiddenListIds.size !== 1 ? 's' : ''} hidden` : "Manage lists"}
                    >
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="flex-1 text-left">Manage Lists</span>
                        {hiddenListIds.size > 0 && (
                            <span className="w-5 h-5 bg-red-500 text-white text-[10px] font-medium rounded-full flex items-center justify-center">
                                {hiddenListIds.size}
                            </span>
                        )}
                    </button>

                    {showListsDropdown && (
                        <div className="absolute top-full left-0 mt-1 w-64 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50 py-1 max-h-80 overflow-y-auto">
                            <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
                                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    Manage Lists
                                </p>
                                {hiddenListIds.size > 0 && (
                                    <button
                                        onClick={() => setHiddenListIds(new Set())}
                                        className="text-xs text-gray-700 dark:text-gray-400 hover:underline"
                                    >
                                        Show all
                                    </button>
                                )}
                            </div>
                            {lists.map((list) => {
                                const isHidden = hiddenListIds.has(list.id);
                                return (
                                    <div
                                        key={list.id}
                                        className={`flex items-center justify-between px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700/50 ${isHidden ? "opacity-50" : ""}`}
                                    >
                                        <button
                                            onClick={() => {
                                                setActiveList(activeList === list.id ? "curated" : list.id);
                                                setShowListsDropdown(false);
                                            }}
                                            className="flex items-center gap-2 flex-1 min-w-0"
                                        >
                                            {list.emoji ? (
                                                <span className="text-sm flex-shrink-0">{list.emoji}</span>
                                            ) : (
                                                <div
                                                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                                                    style={{ backgroundColor: list.color }}
                                                />
                                            )}
                                            <span className="text-sm text-gray-700 dark:text-gray-300 truncate">
                                                {list.name}
                                            </span>
                                            <span className="text-xs text-gray-400">
                                                {list.member_count}
                                            </span>
                                        </button>
                                        <div className="flex items-center gap-0.5">
                                            {/* Hide/Show toggle */}
                                            <button
                                                onClick={() => {
                                                    setHiddenListIds(prev => {
                                                        const next = new Set(prev);
                                                        if (next.has(list.id)) {
                                                            next.delete(list.id);
                                                        } else {
                                                            next.add(list.id);
                                                        }
                                                        return next;
                                                    });
                                                }}
                                                className={`p-1 rounded transition-colors ${isHidden
                                                    ? "text-red-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                                                    : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                                                    }`}
                                                title={isHidden ? "Show in list" : "Hide from list"}
                                            >
                                                {isHidden ? (
                                                    <EyeOff className="h-3.5 w-3.5" />
                                                ) : (
                                                    <Eye className="h-3.5 w-3.5" />
                                                )}
                                            </button>
                                        {/* Pin toggle */}
                                        <button
                                            onClick={() => handleToggleListPin(list.id, !list.pinned)}
                                            className={`p-1 rounded transition-colors ${list.pinned
                                                ? "text-gray-600 hover:text-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/20"
                                                : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                                                }`}
                                            title={list.pinned ? "Unpin from bar" : "Pin to bar"}
                                        >
                                            {list.pinned ? (
                                                <Pin className="h-3.5 w-3.5" />
                                            ) : (
                                                <PinOff className="h-3.5 w-3.5" />
                                            )}
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                        {(lists.filter(l => !l.pinned).length > 0 || hiddenListIds.size > 0) && (
                            <div className="px-3 py-1.5 border-t border-gray-100 dark:border-gray-700 mt-1 flex items-center gap-3">
                                {lists.filter(l => !l.pinned).length > 0 && (
                                    <p className="text-xs text-gray-400">
                                        {lists.filter(l => !l.pinned).length} unpinned
                                    </p>
                                )}
                                {hiddenListIds.size > 0 && (
                                    <p className="text-xs text-red-400">
                                        {hiddenListIds.size} hidden
                                    </p>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>
        )}
        </div>
    );
}
