"use client";

import { memo, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { ChevronDown, X } from "lucide-react";
import type { Contact, NetworkObjective, ObjectiveStage, RolodexList } from "../types";
import { contactMatchesSearchIndex, createContactSearchIndex } from "../search";

interface ContactsTableProps {
    contacts: Contact[];
    lists: RolodexList[];
    objective: NetworkObjective | null;
    onSetObjectiveMemberStage: (stageId: number, peopleId: number) => Promise<void>;
    onRemoveObjectiveMember: (peopleId: number) => Promise<void>;
    selectedContacts: Set<number>;
    selectedContactId: number | null;
    activeList: number | "all" | "curated";
    searchQuery: string;
    showHiddenContacts: boolean;
    showLastNote: boolean;
    hiddenListIds: Set<number>;
    handleRowClick: (contactId: number, e: React.MouseEvent) => void;
    handleContextMenu: (contactId: number, e: React.MouseEvent) => void;
    renderNoteWithMentions: (noteText: string) => React.ReactNode;
}

function shortStageLabel(name: string) {
    const words = name.split(/\s+/).filter(Boolean);
    if (words.length === 0) return "Stage";
    if (words.length === 1) return words[0].slice(0, 12);
    return words.slice(0, 2).join(" ").slice(0, 14);
}

function objectiveContactText(contact: Contact) {
    return [
        contact.name,
        contact.custom_bio,
        contact.custom_location,
        ...contact.notes.map((note) => note.note),
        ...contact.calendar_events.map((event) => event.event_title || ""),
    ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
}

function objectiveRuleMatches(contact: Contact, stage: ObjectiveStage) {
    const text = objectiveContactText(contact);
    return stage.rules.some((rule) => {
        const query = rule.rule_text.trim().toLowerCase();
        return query.length > 0 && text.includes(query);
    });
}

function getContactObjectiveStage(contact: Contact, objective: NetworkObjective | null) {
    if (!objective) return null;

    const stages = [...objective.stages].sort((a, b) => a.position - b.position);
    const manualStage = stages.find((stage) => stage.member_ids.includes(contact.id));
    if (manualStage) return { stage: manualStage, source: "manual" as const };

    if ((objective.excluded_member_ids || []).includes(contact.id)) return null;

    const matchedStage = [...stages].reverse().find((stage) => objectiveRuleMatches(contact, stage));
    return matchedStage ? { stage: matchedStage, source: "rule" as const } : null;
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
    objective,
    onSetObjectiveMemberStage,
    onRemoveObjectiveMember,
    selectedContacts,
    selectedContactId,
    activeList,
    searchQuery,
    showHiddenContacts,
    showLastNote,
    hiddenListIds,
    handleRowClick,
    handleContextMenu,
    renderNoteWithMentions,
}: ContactsTableProps) {
    const [stagePickerOpenFor, setStagePickerOpenFor] = useState<number | null>(null);
    const [stageUpdatingFor, setStageUpdatingFor] = useState<number | null>(null);

    useEffect(() => {
        const closePicker = (event: MouseEvent) => {
            if (!(event.target as HTMLElement).closest("[data-objective-stage-picker='true']")) {
                setStagePickerOpenFor(null);
            }
        };

        document.addEventListener("mousedown", closePicker);
        return () => document.removeEventListener("mousedown", closePicker);
    }, []);

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
                        const location = contact.custom_location || xp?.location || li?.location;
                        const memberLists = lists.filter((list) => list.member_ids.includes(contact.id));
                        const objectiveStage = getContactObjectiveStage(contact, objective);
                        const objectiveStages = objective ? [...objective.stages].sort((a, b) => a.position - b.position) : [];

                        return (
                            <div key={contact.id} data-contact-id={contact.id}>
                                <div
                                    className={`group flex cursor-pointer items-center gap-4 px-5 py-4 transition-colors select-none ${isSelected
                                        ? "bg-warm-200/80 hover:bg-[#faf8f5] dark:bg-gray-800/50 dark:hover:bg-gray-800/60"
                                        : selectedContactId === contact.id
                                            ? "bg-warm-200/70 hover:bg-[#faf8f5] dark:bg-gray-800/40 dark:hover:bg-gray-800/60"
                                            : contact.hidden
                                                ? "bg-warm-50/50 opacity-60 hover:bg-[#faf8f5] dark:bg-gray-900/20 dark:hover:bg-gray-800/40"
                                                : "hover:bg-[#faf8f5] dark:hover:bg-gray-800/40"
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
                                                <p className="ml-1.5 truncate text-sm font-medium text-gray-500 dark:text-gray-400">
                                                    &nbsp;@{xp.username}
                                                </p>
                                            )}
                                        </div>
                                        {bio && (
                                            <p className="mt-1 line-clamp-1 text-sm text-gray-600 dark:text-gray-400">
                                                {bio}
                                            </p>
                                        )}
                                        {(location || memberLists.length > 0 || objectiveStages.length > 0) && (
                                            <div className="mt-2 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs text-gray-400 dark:text-gray-500">
                                                {location && <span className="truncate">{location}</span>}
                                                {memberLists.slice(0, 2).map((list) => (
                                                    <span
                                                        key={list.id}
                                                        className="inline-flex max-w-[112px] items-center truncate rounded-full px-2 py-0.5 text-[11px] font-medium"
                                                        style={list.emoji ? { backgroundColor: "#f3f4f6", color: "#6b7280" } : { backgroundColor: `${list.color}18`, color: list.color }}
                                                    >
                                                        <span className="truncate">{list.emoji ? `${list.emoji} ` : ""}{list.name}</span>
                                                    </span>
                                                ))}
                                                {memberLists.length > 2 && (
                                                    <span className="text-[11px] font-medium text-gray-400">
                                                        +{memberLists.length - 2}
                                                    </span>
                                                )}
                                                {objectiveStages.length > 0 && (
                                                    <div
                                                        className="relative"
                                                        data-objective-stage-picker="true"
                                                        onClick={(e) => e.stopPropagation()}
                                                        onMouseDown={(e) => e.stopPropagation()}
                                                    >
                                                        <button
                                                            type="button"
                                                            disabled={stageUpdatingFor === contact.id}
                                                            onClick={() => setStagePickerOpenFor((current) => current === contact.id ? null : contact.id)}
                                                            className={`inline-flex max-w-[132px] items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium transition-colors ${
                                                                objectiveStage
                                                                    ? "border-transparent"
                                                                    : "border-gray-200 bg-white text-gray-400 hover:border-gray-300 hover:text-gray-600 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-500 dark:hover:text-gray-300"
                                                            } disabled:opacity-50`}
                                                            style={objectiveStage ? {
                                                                backgroundColor: `${objectiveStage.stage.color}16`,
                                                                color: objectiveStage.stage.color,
                                                            } : undefined}
                                                            title={objectiveStage ? `In ${objectiveStage.stage.name}` : "Add to funnel stage"}
                                                        >
                                                            {objectiveStage && (
                                                                <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full" style={{ backgroundColor: objectiveStage.stage.color }} />
                                                            )}
                                                            <span className="truncate">
                                                                {objectiveStage ? shortStageLabel(objectiveStage.stage.name) : "Stage +"}
                                                            </span>
                                                            <ChevronDown className="h-3 w-3 flex-shrink-0" />
                                                        </button>

                                                        {stagePickerOpenFor === contact.id && (
                                                            <div className="absolute left-0 top-[calc(100%+6px)] z-30 w-44 overflow-hidden rounded-lg border border-gray-100 bg-white py-1 shadow-lg shadow-gray-200/60 dark:border-gray-800 dark:bg-gray-950 dark:shadow-none">
                                                                {objectiveStages.map((stage) => {
                                                                    const active = objectiveStage?.stage.id === stage.id;
                                                                    return (
                                                                        <button
                                                                            key={stage.id}
                                                                            type="button"
                                                                            disabled={active || stageUpdatingFor === contact.id}
                                                                            onClick={async () => {
                                                                                setStageUpdatingFor(contact.id);
                                                                                try {
                                                                                    await onSetObjectiveMemberStage(stage.id, contact.id);
                                                                                    setStagePickerOpenFor(null);
                                                                                } finally {
                                                                                    setStageUpdatingFor(null);
                                                                                }
                                                                            }}
                                                                            className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium text-gray-700 transition-colors hover:bg-[#F7F3EC] disabled:cursor-default disabled:bg-gray-50 disabled:text-gray-400 dark:text-gray-200 dark:hover:bg-gray-900 dark:disabled:bg-gray-900/60 dark:disabled:text-gray-500"
                                                                        >
                                                                            <span className="h-2 w-2 flex-shrink-0 rounded-full" style={{ backgroundColor: stage.color }} />
                                                                            <span className="min-w-0 flex-1 truncate">{stage.name}</span>
                                                                        </button>
                                                                    );
                                                                })}
                                                                {objectiveStage && (
                                                                    <>
                                                                        <div className="my-1 border-t border-gray-100 dark:border-gray-800" />
                                                                        <button
                                                                            type="button"
                                                                            disabled={stageUpdatingFor === contact.id}
                                                                            onClick={async () => {
                                                                                setStageUpdatingFor(contact.id);
                                                                                try {
                                                                                    await onRemoveObjectiveMember(contact.id);
                                                                                    setStagePickerOpenFor(null);
                                                                                } finally {
                                                                                    setStageUpdatingFor(null);
                                                                                }
                                                                            }}
                                                                            className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium text-gray-500 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-50 dark:text-gray-400 dark:hover:bg-red-950/20 dark:hover:text-red-300"
                                                                        >
                                                                            <X className="h-3 w-3" />
                                                                            Remove from funnel
                                                                        </button>
                                                                    </>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {showLastNote && lastNote?.note && (
                                        <div className="hidden w-56 shrink-0 text-right md:block">
                                            <p className="line-clamp-2 text-xs leading-5 text-gray-400 dark:text-gray-500">
                                                {renderNoteWithMentions(lastNote.note)}
                                            </p>
                                        </div>
                                    )}

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
