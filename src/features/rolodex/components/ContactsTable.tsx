"use client";

import { memo, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import type { Contact, RolodexList } from "../types";
import { formatTimeAgo } from "../types";
import { contactMatchesSearchIndex, createContactSearchIndex } from "../search";

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

function ContactAvatar({
    contact,
    imageUrl,
    eager = false,
}: {
    contact: Contact;
    imageUrl: string | null;
    eager?: boolean;
}) {
    const [imageFailed, setImageFailed] = useState(false);

    useEffect(() => {
        setImageFailed(false);
    }, [imageUrl]);

    if (!imageUrl || imageFailed) {
        return (
            <div className="h-11 w-11 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    {contact.name.charAt(0).toUpperCase()}
                </span>
            </div>
        );
    }

    return (
        <Image
            src={imageUrl}
            alt=""
            width={44}
            height={44}
            priority={eager}
            loading={eager ? "eager" : "lazy"}
            decoding="async"
            unoptimized
            onError={() => setImageFailed(true)}
            className="h-11 w-11 rounded-full object-cover"
        />
    );
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
        <div className="w-full max-w-4xl rounded-2xl border border-gray-200/80 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {visibleContacts.map((contact, index) => {
                        const isSelected = selectedContacts.has(contact.id);
                        const xp = contact.x_profile;
                        const li = contact.linkedin_profile;
                        const lastNote = contact.notes.find(n => !n.note.includes("LinkedIn Profile Import"));
                        // Table avatars render at 40px, so prefer thumbnail URLs here.
                        const profileImageUrl = contact.custom_profile_image_url || xp?.profile_image_url || li?.profile_image_url || null;
                        const bio = contact.custom_bio || xp?.bio || li?.headline;
                        const description = bio || lastNote?.note;
                        const location = contact.custom_location || xp?.location || li?.location;
                        const memberLists = lists.filter((list) => list.member_ids.includes(contact.id));

                        return (
                            <div key={contact.id} data-contact-id={contact.id}>
                                <div
                                    className={`group flex cursor-pointer items-center gap-4 px-5 py-4 transition-colors select-none ${isSelected
                                        ? "bg-gray-50 dark:bg-gray-800/30"
                                        : selectedContactId === contact.id
                                            ? "bg-gray-50 dark:bg-gray-800/20"
                                            : contact.hidden
                                                ? "bg-gray-50/50 opacity-60 dark:bg-gray-900/20"
                                                : "hover:bg-gray-50/80 dark:hover:bg-gray-900/40"
                                        }`}
                                    onClick={(e) => handleRowClick(contact.id, e)}
                                    onMouseDown={(e) => e.stopPropagation()}
                                    onContextMenu={(e) => handleContextMenu(contact.id, e)}
                                >
                                    <div className="relative flex-shrink-0">
                                        <ContactAvatar contact={contact} imageUrl={profileImageUrl} eager={index < 12} />
                                    </div>

                                    <div className="min-w-0 flex-1">
                                        <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1">
                                            <p
                                                className="truncate text-[15px] font-semibold text-gray-950 dark:text-white"
                                                title={contact.name}
                                            >
                                                {contact.name}
                                            </p>
                                            {xp && (
                                                <p className="truncate text-sm font-medium text-gray-500 dark:text-gray-400">
                                                    @{xp.username}
                                                </p>
                                            )}
                                        </div>
                                        {description && (
                                            <p className="mt-1 line-clamp-1 text-sm text-gray-600 dark:text-gray-400">
                                                {bio ? description : renderNoteWithMentions(description)}
                                            </p>
                                        )}
                                        {(location || lastNote) && (
                                            <div className="mt-2 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-400 dark:text-gray-500">
                                                {location && <span className="truncate">{location}</span>}
                                                {lastNote && (
                                                    <span className="truncate">
                                                        {formatTimeAgo(lastNote.created_at)}
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    <div className="hidden max-w-[180px] shrink-0 items-center justify-end gap-1.5 md:flex md:flex-wrap">
                                        {memberLists
                                            .slice(0, 2)
                                            .map((list) => (
                                                <span
                                                    key={list.id}
                                                    className="inline-flex max-w-[92px] items-center truncate rounded-full px-2 py-1 text-[11px] font-medium"
                                                    style={list.emoji ? { backgroundColor: "#f3f4f6", color: "#6b7280" } : { backgroundColor: `${list.color}18`, color: list.color }}
                                                >
                                                    <span className="truncate">{list.emoji ? `${list.emoji} ` : ""}{list.name}</span>
                                                </span>
                                            ))}
                                        {memberLists.length > 2 && (
                                            <span className="text-xs font-medium text-gray-400">
                                                +{memberLists.length - 2}
                                            </span>
                                        )}
                                    </div>

                                    <div className="flex w-3 shrink-0 justify-end">
                                        {selectedContactId === contact.id && (
                                            <div className="h-2 w-2 rounded-full bg-gray-900 dark:bg-white" />
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
