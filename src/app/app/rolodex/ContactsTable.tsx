"use client";

import { memo, useMemo } from "react";
import Image from "next/image";
import type { Contact, RolodexList } from "./types";
import { formatTimeAgo } from "./types";
import { contactMatchesSearchIndex, createContactSearchIndex } from "./search";

interface ContactsTableProps {
    contacts: Contact[];
    lists: RolodexList[];
    selectedContacts: Set<number>;
    selectedContactId: number | null;
    activeList: number | "all" | "curated";
    searchQuery: string;
    showHiddenContacts: boolean;
    hiddenListIds: Set<number>;
    handleRowClick: (contactId: number, e: React.MouseEvent) => void;
    handleContextMenu: (contactId: number, e: React.MouseEvent) => void;
    renderNoteWithMentions: (noteText: string) => React.ReactNode;
}

function ContactsTable({
    contacts,
    lists,
    selectedContacts,
    selectedContactId,
    activeList,
    searchQuery,
    showHiddenContacts,
    hiddenListIds,
    handleRowClick,
    handleContextMenu,
    renderNoteWithMentions,
}: ContactsTableProps) {
    const searchIndexes = useMemo(() => {
        return new Map(contacts.map((contact) => [
            contact.id,
            createContactSearchIndex(contact),
        ]));
    }, [contacts]);

    const visibleContacts = useMemo(() => {
        const activeListMemberIds = typeof activeList === "number"
            ? new Set(lists.find((list) => list.id === activeList)?.member_ids || [])
            : null;
        const hiddenMemberIds = new Set<number>();

        if (hiddenListIds.size > 0) {
            lists.forEach((list) => {
                if (hiddenListIds.has(list.id)) {
                    list.member_ids.forEach((id) => hiddenMemberIds.add(id));
                }
            });
        }

        const hasSearch = searchQuery.trim().length > 0;

        return contacts
            .filter((contact) => {
                if (contact.hidden && !showHiddenContacts) {
                    return false;
                }
                if (activeList === "curated" && contact.notes.length === 0) {
                    return false;
                }
                if (activeListMemberIds && !activeListMemberIds.has(contact.id)) {
                    return false;
                }
                if (hiddenMemberIds.has(contact.id)) {
                    return false;
                }
                if (hasSearch) {
                    const index = searchIndexes.get(contact.id);
                    return index ? contactMatchesSearchIndex(index, searchQuery) : false;
                }
                return true;
            })
            .sort((a, b) => {
                const getLastActivity = (contact: Contact) => {
                    const dates = [
                        contact.last_touchpoint,
                        contact.notes.find((note) => !note.note.includes("LinkedIn Profile Import"))?.created_at,
                        contact.created_at,
                    ].filter(Boolean) as string[];
                    return Math.max(...dates.map((date) => new Date(date).getTime()));
                };
                return getLastActivity(b) - getLastActivity(a);
            });
    }, [activeList, contacts, hiddenListIds, lists, searchIndexes, searchQuery, showHiddenContacts]);

    return (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden shadow-sm">
            {/* Table Header */}
            <div className="hidden sm:grid sm:grid-cols-[200px,1fr,120px,120px,1fr,40px] gap-4 bg-gray-50/50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800 px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                <div>Contact</div>
                <div>Bio</div>
                <div>Location</div>
                <div>Lists</div>
                <div>Last Note</div>
                <div></div>
            </div>

            {/* Table Body */}
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {visibleContacts.map((contact) => {
                        const isSelected = selectedContacts.has(contact.id);
                        const xp = contact.x_profile;
                        const li = contact.linkedin_profile;
                        const lastNote = contact.notes.find(n => !n.note.includes("LinkedIn Profile Import"));
                        // Get profile image: prioritize custom, then X, then LinkedIn
                        const profileImageUrl = contact.custom_profile_image_url || xp?.profile_image_url || li?.profile_image_url;

                        return (
                            <div key={contact.id} data-contact-id={contact.id}>
                                {/* Row */}
                                <div
                                    className={`grid grid-cols-[1fr,auto] sm:grid-cols-[200px,1fr,120px,120px,1fr,40px] gap-4 items-center px-4 py-3 cursor-pointer transition-colors select-none ${isSelected
                                        ? "bg-gray-50 dark:bg-gray-800/20"
                                        : selectedContactId === contact.id
                                            ? "bg-gray-50/50 dark:bg-gray-800/10 border-l-2 border-gray-600"
                                            : contact.hidden
                                                ? "bg-gray-50/50 dark:bg-gray-900/20 opacity-60"
                                                : "hover:bg-gray-50 dark:hover:bg-gray-900/30"
                                        }`}
                                    onClick={(e) => handleRowClick(contact.id, e)}
                                    onMouseDown={(e) => e.stopPropagation()}
                                    onContextMenu={(e) => handleContextMenu(contact.id, e)}
                                >
                                    {/* Contact Cell */}
                                    <div className="flex items-center gap-3 min-w-0">
                                        {/* Avatar */}
                                        <div className="relative flex-shrink-0">
                                            {profileImageUrl ? (
                                                <Image
                                                    src={contact.custom_profile_image_url || (xp?.profile_image_url?.replace("_normal", "_bigger") || li?.profile_image_url || "")}
                                                    alt={contact.name}
                                                    width={40}
                                                    height={40}
                                                    unoptimized
                                                    className="rounded-full"
                                                />
                                            ) : (
                                                <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                                                    <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                                                        {contact.name.charAt(0).toUpperCase()}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                        {/* Name and handle */}
                                        <div className="min-w-0 overflow-hidden">
                                            <p
                                                className="font-medium text-gray-900 dark:text-white truncate text-sm"
                                                title={contact.name}
                                            >
                                                {contact.name}
                                            </p>
                                            {xp && (
                                                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                                    @{xp.username}
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Bio/Headline Cell */}
                                    <div className="hidden sm:block min-w-0 pr-4">
                                        {(contact.custom_bio || xp?.bio || li?.headline) ? (
                                            <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                                                {contact.custom_bio || xp?.bio || li?.headline}
                                            </p>
                                        ) : (
                                            <span className="text-sm text-gray-400">—</span>
                                        )}
                                    </div>

                                    {/* Location Cell */}
                                    <div className="hidden sm:block min-w-0 pr-4">
                                        {(contact.custom_location || xp?.location || li?.location) ? (
                                            <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                                                {contact.custom_location || xp?.location || li?.location}
                                            </p>
                                        ) : (
                                            <span className="text-sm text-gray-400">—</span>
                                        )}
                                    </div>

                                    {/* Lists Cell */}
                                    <div className="hidden sm:flex items-center gap-1 min-w-0 pr-4 flex-wrap">
                                        {lists
                                            .filter((l) => l.member_ids.includes(contact.id))
                                            .slice(0, 2)
                                            .map((list) => (
                                                <span
                                                    key={list.id}
                                                    className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium rounded"
                                                    style={list.emoji ? { backgroundColor: "#f3f4f6", color: "#6b7280" } : { backgroundColor: `${list.color}20`, color: list.color }}
                                                >
                                                    {list.emoji ? `${list.emoji} ` : ""}{list.name}
                                                </span>
                                            ))}
                                        {lists.filter((l) => l.member_ids.includes(contact.id)).length > 2 && (
                                            <span className="text-[10px] text-gray-400">
                                                +{lists.filter((l) => l.member_ids.includes(contact.id)).length - 2}
                                            </span>
                                        )}
                                        {lists.filter((l) => l.member_ids.includes(contact.id)).length === 0 && (
                                            <span className="text-sm text-gray-400">—</span>
                                        )}
                                    </div>

                                    {/* Last Note Cell */}
                                    <div className="hidden sm:block min-w-0 pr-2">
                                        {lastNote && (
                                            <div>
                                                <div className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                                                    {renderNoteWithMentions(lastNote.note)}
                                                </div>
                                                <span className="text-xs text-gray-400">
                                                    {formatTimeAgo(lastNote.created_at)}
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Open Panel Indicator */}
                                    <div className="flex items-center justify-end">
                                        {selectedContactId === contact.id && (
                                            <div className="w-1.5 h-1.5 rounded-full bg-gray-600" />
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
            </div>
        </div>
    );
}

export default memo(ContactsTable);
