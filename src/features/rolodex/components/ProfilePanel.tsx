"use client";

import Image from "next/image";
import {
    Loader2,
    X,
    Pencil,
    Check,
    Calendar,
    ExternalLink,
    PanelRightClose,
    MapPin,
    Camera,
    MoreHorizontal,
    Eye,
    EyeOff,
    Briefcase,
    GraduationCap,
    FileText,
    User,
    Linkedin,
    Phone,
    Mail,
    Plus,
    AtSign,
    Trash2,
} from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/Sheet";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarPicker } from "@/components/ui/calendar";
import type { Contact, Note, Compliment, RolodexList } from "../types";
import { parseLinkedInNote, formatTimeAgo } from "../types";

interface ProfilePanelProps {
    // Data props
    selectedContactId: number | null;
    contacts: Contact[];
    lists: RolodexList[];
    allLocations: string[];
    contactMessages: Record<number, Array<{
        id: number;
        message_text: string;
        is_from_me: boolean;
        message_date: string;
    }>>;

    // Panel state
    profilePanelExpanded: boolean;
    setProfilePanelExpanded: (value: boolean) => void;
    profilePanelTab: "overview" | "professional" | "contact";
    setProfilePanelTab: (value: "overview" | "professional" | "contact") => void;
    profileMenuOpen: boolean;
    setProfileMenuOpen: (value: boolean) => void;

    // Name/Bio/Location editing
    editingNameFor: number | null;
    setEditingNameFor: (value: number | null) => void;
    editName: string;
    setEditName: (value: string) => void;
    editNameLoading: boolean;

    editingBioFor: number | null;
    setEditingBioFor: (value: number | null) => void;
    editBio: string;
    setEditBio: (value: string) => void;
    editBioLoading: boolean;

    editingLocationFor: number | null;
    setEditingLocationFor: (value: number | null) => void;
    editLocation: string;
    setEditLocation: (value: string) => void;
    editLocationLoading: boolean;
    locationSuggestionIndex: number;
    setLocationSuggestionIndex: React.Dispatch<React.SetStateAction<number>>;

    // Note state
    newNote: string;
    setNewNote: (value: string) => void;
    addingNoteFor: number | null;
    setAddingNoteFor: (value: number | null) => void;
    savingNote: boolean;

    editingNote: { noteId: number; contactId: number } | null;
    setEditingNote: (value: { noteId: number; contactId: number } | null) => void;
    editNoteText: string;
    setEditNoteText: (value: string) => void;
    editNoteLoading: boolean;

    editingNoteDate: { noteId: number; contactId: number; currentDate: Date } | null;
    setEditingNoteDate: (value: { noteId: number; contactId: number; currentDate: Date } | null) => void;
    editNoteDateLoading: boolean;

    mentionQuery: string | null;
    mentionPosition: { top: number; left: number } | null;
    mentionIndex: number;
    setMentionIndex: (value: number) => void;
    pendingMentions: Map<string, number>;

    editMentionQuery: string | null;
    editMentionPosition: { top: number; left: number } | null;
    editMentionIndex: number;
    setEditMentionIndex: (value: number) => void;
    editPendingMentions: Map<string, number>;

    noteInputRef: React.RefObject<HTMLTextAreaElement>;
    editNoteInputRef: React.RefObject<HTMLInputElement>;

    mentionSuggestions: Contact[];
    editMentionSuggestions: Contact[];

    // Compliment state
    newCompliment: string;
    setNewCompliment: (value: string) => void;
    newComplimentContext: string;
    setNewComplimentContext: (value: string) => void;
    showComplimentInput: number | null;
    setShowComplimentInput: (value: number | null) => void;
    addingComplimentFor: number | null;

    editingCompliment: { complimentId: number; contactId: number } | null;
    setEditingCompliment: (value: { complimentId: number; contactId: number } | null) => void;
    editComplimentText: string;
    setEditComplimentText: (value: string) => void;
    editComplimentContext: string;
    setEditComplimentContext: (value: string) => void;
    editComplimentLoading: boolean;

    // Link state
    addingLinkFor: number | null;
    setAddingLinkFor: (value: number | null) => void;
    linkInput: string;
    setLinkInput: (value: string) => void;
    linkLoading: boolean;
    linkError: string | null;

    // Contact info state
    addingContactInfoFor: number | null;
    setAddingContactInfoFor: (value: number | null) => void;
    contactInfoType: 'phone' | 'email';
    setContactInfoType: (value: 'phone' | 'email') => void;
    contactInfoValue: string;
    setContactInfoValue: (value: string) => void;
    contactInfoLoading: boolean;

    // Image upload state
    uploadingImageFor: number | null;
    hoveringAvatarFor: number | null;
    setHoveringAvatarFor: (value: number | null) => void;
    imageInputRef: React.RefObject<HTMLInputElement>;

    // List dropdown
    showListDropdownFor: number | null;
    setShowListDropdownFor: (value: number | null) => void;

    // Loading
    loadingMessagesFor: number | null;
    generatingSummaryFor: number | null;
    showMessagesFor: Set<number>;

    // Callbacks
    onClose: () => void;
    handleUpdateName: (contactId: number) => void;
    handleUpdateBio: (contactId: number) => void;
    handleUpdateLocation: (contactId: number) => void;
    handleAddNote: (contactId: number) => void;
    handleEditNote: (noteId: number, contactId: number) => void;
    handleDeleteNote: (noteId: number, contactId: number) => void;
    handleUpdateNoteDate: (noteId: number, contactId: number, date: Date) => void;
    handleAddCompliment: (contactId: number) => void;
    handleEditCompliment: (complimentId: number, contactId: number) => void;
    handleDeleteCompliment: (complimentId: number, contactId: number) => void;
    handleAddLink: (contactId: number) => void;
    handleAddContactInfo: (contactId: number) => void;
    handleDeleteContactInfo: (infoId: number, contactId: number) => void;
    handleAddToList: (listId: number, contactId: number) => void;
    handleRemoveFromList: (listId: number, contactId: number) => void;
    handleNoteInputChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
    handleEditNoteInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    handleNoteKeyDown: (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
    handleEditNoteKeyDown: (e: React.KeyboardEvent<HTMLInputElement>, noteId: number, contactId: number) => void;
    insertMention: (contact: Contact) => void;
    insertEditMention: (contact: Contact) => void;
    toggleMessagesForContact: (contactId: number) => void;
    renderNoteWithMentions: (noteText: string) => React.ReactNode;
    initializeEditMentions: (noteText: string) => void;
    setContacts: React.Dispatch<React.SetStateAction<Contact[]>>;
    setMentionQuery: (value: string | null) => void;
    setMentionPosition: (value: { top: number; left: number } | null) => void;
    setPendingMentions: (value: Map<string, number>) => void;
    setEditMentionQuery: (value: string | null) => void;
    setEditMentionPosition: (value: { top: number; left: number } | null) => void;
    setEditPendingMentions: (value: Map<string, number>) => void;
}

export default function ProfilePanel(props: ProfilePanelProps) {
    const {
        selectedContactId,
        contacts,
        lists,
        allLocations,
        contactMessages,
        profilePanelExpanded,
        profilePanelTab,
        setProfilePanelTab,
        profileMenuOpen,
        setProfileMenuOpen,
        editingNameFor,
        setEditingNameFor,
        editName,
        setEditName,
        editNameLoading,
        editingBioFor,
        setEditingBioFor,
        editBio,
        setEditBio,
        editBioLoading,
        editingLocationFor,
        setEditingLocationFor,
        editLocation,
        setEditLocation,
        editLocationLoading,
        locationSuggestionIndex,
        setLocationSuggestionIndex,
        newNote,
        setNewNote,
        addingNoteFor,
        setAddingNoteFor,
        savingNote,
        editingNote,
        setEditingNote,
        editNoteText,
        setEditNoteText,
        editNoteLoading,
        editingNoteDate,
        setEditingNoteDate,
        editNoteDateLoading,
        mentionQuery,
        mentionPosition,
        mentionIndex,
        editMentionQuery,
        editMentionPosition,
        editMentionIndex,
        noteInputRef,
        editNoteInputRef,
        mentionSuggestions,
        editMentionSuggestions,
        addingLinkFor,
        setAddingLinkFor,
        linkInput,
        setLinkInput,
        linkLoading,
        linkError,
        addingContactInfoFor,
        setAddingContactInfoFor,
        contactInfoType,
        setContactInfoType,
        contactInfoValue,
        setContactInfoValue,
        contactInfoLoading,
        uploadingImageFor,
        hoveringAvatarFor,
        setHoveringAvatarFor,
        imageInputRef,
        showListDropdownFor,
        setShowListDropdownFor,
        loadingMessagesFor,
        generatingSummaryFor,
        showMessagesFor,
        onClose,
        handleUpdateName,
        handleUpdateBio,
        handleUpdateLocation,
        handleAddNote,
        handleEditNote,
        handleDeleteNote,
        handleUpdateNoteDate,
        handleAddLink,
        handleAddContactInfo,
        handleDeleteContactInfo,
        handleAddToList,
        handleRemoveFromList,
        handleNoteInputChange,
        handleEditNoteInputChange,
        handleNoteKeyDown,
        handleEditNoteKeyDown,
        insertMention,
        insertEditMention,
        toggleMessagesForContact,
        renderNoteWithMentions,
        initializeEditMentions,
        setContacts,
        setMentionQuery,
        setMentionPosition,
        setPendingMentions,
        setEditMentionQuery,
        setEditMentionPosition,
        setEditPendingMentions,
    } = props;

    return (
        <Sheet
            open={selectedContactId !== null}
            onOpenChange={(open) => { if (!open) { onClose(); } }}
            expanded={profilePanelExpanded}
            closeOnClickOutside={editingNoteDate === null}
        >
            {(() => {
                const contact = contacts.find(c => c.id === selectedContactId);
                if (!contact) return null;
                const xp = contact.x_profile;
                const li = contact.linkedin_profile;
                const profileImageUrl = contact.custom_profile_image_url || xp?.profile_image_url?.replace("_normal", "_bigger") || li?.profile_image_url;

                return (
                    <>
                        <SheetHeader>
                            <SheetTitle className="sr-only">{contact.name}</SheetTitle>
                            <SheetDescription className="sr-only">Contact profile for {contact.name}</SheetDescription>

                            {/* Panel controls - minimal floating */}
                            <div className="absolute top-5 left-5 flex items-center gap-0.5 z-10">
                                <button
                                    onClick={() => onClose()}
                                    className="p-2 rounded-lg text-gray-300 hover:text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-all"
                                    aria-label="Close panel"
                                >
                                    <PanelRightClose className="h-4 w-4" />
                                </button>
                            </div>

                            {/* More menu - top right */}
                            <div className="absolute top-5 right-5 z-10">
                                <div className="relative">
                                    <button
                                        onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                                        className="p-2 rounded-lg text-gray-300 hover:text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-all"
                                        aria-label="More options"
                                    >
                                        <MoreHorizontal className="h-4 w-4" />
                                    </button>
                                    {profileMenuOpen && (
                                        <>
                                            <div className="fixed inset-0 z-10" onClick={() => setProfileMenuOpen(false)} />
                                            <div className="absolute right-0 top-full mt-1 z-20 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 min-w-[160px]">
                                                <button
                                                    onClick={async () => {
                                                        setProfileMenuOpen(false);
                                                        const res = await fetch("/api/rolodex/update", {
                                                            method: "PATCH",
                                                            headers: { "Content-Type": "application/json" },
                                                            credentials: "include",
                                                            body: JSON.stringify({ people_id: contact.id, hidden: !contact.hidden }),
                                                        });
                                                        if (res.ok) {
                                                            setContacts(prev => prev.map(c => c.id === contact.id ? { ...c, hidden: !contact.hidden } : c));
                                                        }
                                                    }}
                                                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                                                >
                                                    {contact.hidden ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                                                    {contact.hidden ? "Show contact" : "Hide contact"}
                                                </button>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Profile Hero Section - Compact */}
                            <div className="flex flex-col items-center pt-10 pb-3 px-6">
                                {/* Profile Image */}
                                <div
                                    className="relative group cursor-pointer mb-3"
                                    onMouseEnter={() => setHoveringAvatarFor(contact.id)}
                                    onMouseLeave={() => setHoveringAvatarFor(null)}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        imageInputRef.current?.click();
                                        if (imageInputRef.current) {
                                            imageInputRef.current.dataset.contactId = contact.id.toString();
                                        }
                                    }}
                                >
                                    {profileImageUrl ? (
                                        <Image
                                            src={profileImageUrl.replace("_bigger", "_400x400").replace("_normal", "_400x400")}
                                            alt={contact.name}
                                            width={128}
                                            height={128}
                                            unoptimized
                                            className="rounded-full object-cover ring-1 ring-gray-100 dark:ring-gray-800"
                                        />
                                    ) : (
                                        <div className="w-32 h-32 rounded-full bg-gray-50 dark:bg-gray-800 ring-1 ring-gray-100 dark:ring-gray-700 flex items-center justify-center">
                                            <span className="text-4xl font-medium text-gray-300 dark:text-gray-600">
                                                {contact.name.charAt(0).toUpperCase()}
                                            </span>
                                        </div>
                                    )}
                                    {(hoveringAvatarFor === contact.id || uploadingImageFor === contact.id) && (
                                        <div className="absolute inset-0 rounded-full bg-black/30 flex items-center justify-center transition-opacity">
                                            {uploadingImageFor === contact.id ? (
                                                <Loader2 className="h-6 w-6 text-white animate-spin" />
                                            ) : (
                                                <Camera className="h-6 w-6 text-white" />
                                            )}
                                        </div>
                                    )}
                                </div>

                                <div className="text-center w-full">
                                    {editingNameFor === contact.id ? (
                                        <div className="flex items-center gap-2 justify-center">
                                            <input
                                                type="text"
                                                value={editName}
                                                onChange={(e) => setEditName(e.target.value)}
                                                onKeyDown={(e) => {
                                                    if (e.key === "Enter" && editName.trim()) {
                                                        handleUpdateName(contact.id);
                                                    } else if (e.key === "Escape") {
                                                        setEditingNameFor(null);
                                                        setEditName("");
                                                    }
                                                }}
                                                autoFocus
                                                className="px-3 py-1.5 text-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white text-center focus:outline-none focus:ring-1 focus:ring-gray-300"
                                            />
                                            <button
                                                onClick={() => handleUpdateName(contact.id)}
                                                disabled={!editName.trim() || editNameLoading}
                                                className="p-1.5 text-gray-500 hover:text-gray-700 disabled:text-gray-300"
                                            >
                                                {editNameLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                                            </button>
                                            <button onClick={() => { setEditingNameFor(null); setEditName(""); }} className="p-1.5 text-gray-300 hover:text-gray-500">
                                                <X className="h-4 w-4" />
                                            </button>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => { setEditingNameFor(contact.id); setEditName(contact.name); }}
                                            className="group inline-flex items-center gap-2 text-2xl font-semibold text-gray-900 dark:text-white tracking-tight hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                                        >
                                            {contact.name}
                                            <Pencil className="h-3 w-3 opacity-0 group-hover:opacity-50 transition-opacity" />
                                        </button>
                                    )}

                                    {xp && (
                                        <a
                                            href={`https://x.com/${xp.username}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-block mt-0.5 text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                                        >
                                            @{xp.username}
                                        </a>
                                    )}

                                    {contact.last_touchpoint && (
                                        <p className="mt-1.5 text-xs text-gray-300 dark:text-gray-600">
                                            Last connected {formatTimeAgo(contact.last_touchpoint)}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </SheetHeader>
                        <SheetContent className="py-0">
                            {/* Tab Navigation */}
                            <div className="sticky top-0 z-10 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 px-6">
                                <div className="flex gap-0">
                                    {(["overview", "contact", "professional"] as const).map(tab => (
                                        <button
                                            key={tab}
                                            onClick={() => setProfilePanelTab(tab)}
                                            className={`relative px-4 py-3 text-sm font-medium transition-colors ${
                                                profilePanelTab === tab
                                                    ? "text-gray-900 dark:text-white"
                                                    : "text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400"
                                            }`}
                                        >
                                            {tab === "overview" ? "Overview" : tab === "contact" ? "Contact" : "Professional"}
                                            {profilePanelTab === tab && (
                                                <span className="absolute bottom-0 left-4 right-4 h-[2px] bg-gray-900 dark:bg-white rounded-full" />
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {profilePanelTab === "overview" ? (
                            <div className="px-6 py-2 space-y-5">
                            {/* Bio & Location - inline */}
                            <div className="space-y-2">
                                {/* Bio */}
                                {editingBioFor === contact.id ? (
                                    <div className="space-y-2">
                                        <textarea
                                            value={editBio}
                                            onChange={(e) => setEditBio(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleUpdateBio(contact.id); }
                                                else if (e.key === "Escape") { setEditingBioFor(null); setEditBio(""); }
                                            }}
                                            placeholder="Add a bio..."
                                            autoFocus
                                            rows={3}
                                            className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-600 resize-none"
                                        />
                                        <div className="flex gap-2">
                                            <button onClick={() => handleUpdateBio(contact.id)} disabled={editBioLoading} className="px-3 py-1.5 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-300 text-white text-sm font-medium rounded-lg flex items-center gap-1">
                                                {editBioLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />} Save
                                            </button>
                                            <button onClick={() => { setEditingBioFor(null); setEditBio(""); }} className="px-3 py-1.5 text-gray-500 hover:text-gray-700 text-sm">Cancel</button>
                                        </div>
                                    </div>
                                ) : (
                                    <button onClick={() => { setEditBio(contact.custom_bio || xp?.bio || li?.headline || ""); setEditingBioFor(contact.id); }} className="group text-left">
                                        {(contact.custom_bio || xp?.bio || li?.headline) ? (
                                            <span className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                                                {contact.custom_bio || xp?.bio || li?.headline}
                                                <Pencil className="h-3 w-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity inline-block ml-1.5 -mt-0.5" />
                                            </span>
                                        ) : (
                                            <p className="text-sm text-gray-400 dark:text-gray-500">Add bio</p>
                                        )}
                                    </button>
                                )}
                                {/* Location - inline beneath bio */}
                                {editingLocationFor === contact.id ? (
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2 relative">
                                            <MapPin className="h-4 w-4 text-gray-400 flex-shrink-0" />
                                            <div className="flex-1 relative">
                                                <input
                                                    type="text"
                                                    value={editLocation}
                                                    onChange={(e) => { setEditLocation(e.target.value); setLocationSuggestionIndex(0); }}
                                                    onKeyDown={(e) => {
                                                        const suggestions = allLocations.filter(loc =>
                                                            loc.toLowerCase().includes(editLocation.toLowerCase()) &&
                                                            loc.toLowerCase() !== editLocation.toLowerCase()
                                                        ).slice(0, 6);

                                                        if (e.key === "ArrowDown" && suggestions.length > 0) {
                                                            e.preventDefault();
                                                            setLocationSuggestionIndex((prev: number) =>
                                                                prev < suggestions.length - 1 ? prev + 1 : 0
                                                            );
                                                        } else if (e.key === "ArrowUp" && suggestions.length > 0) {
                                                            e.preventDefault();
                                                            setLocationSuggestionIndex((prev: number) =>
                                                                prev > 0 ? prev - 1 : suggestions.length - 1
                                                            );
                                                        } else if (e.key === "Tab" && suggestions.length > 0 && editLocation.trim()) {
                                                            e.preventDefault();
                                                            setEditLocation(suggestions[locationSuggestionIndex]);
                                                        } else if (e.key === "Enter") {
                                                            e.preventDefault();
                                                            if (suggestions.length > 0 && editLocation.trim() && suggestions[locationSuggestionIndex]) {
                                                                setEditLocation(suggestions[locationSuggestionIndex]);
                                                            } else {
                                                                handleUpdateLocation(contact.id);
                                                            }
                                                        } else if (e.key === "Escape") {
                                                            setEditingLocationFor(null);
                                                            setEditLocation("");
                                                            setLocationSuggestionIndex(0);
                                                        }
                                                    }}
                                                    placeholder="City, Country"
                                                    autoFocus
                                                    className="w-full px-2 py-1.5 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-600"
                                                />
                                                {/* Location suggestions dropdown */}
                                                {editLocation.trim() && (() => {
                                                    const suggestions = allLocations.filter(loc =>
                                                        loc.toLowerCase().includes(editLocation.toLowerCase()) &&
                                                        loc.toLowerCase() !== editLocation.toLowerCase()
                                                    ).slice(0, 6);

                                                    if (suggestions.length === 0) return null;

                                                    return (
                                                        <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 overflow-hidden">
                                                            {suggestions.map((loc, idx) => (
                                                                <button
                                                                    key={loc}
                                                                    onClick={() => {
                                                                        setEditLocation(loc);
                                                                        setLocationSuggestionIndex(0);
                                                                    }}
                                                                    className={`w-full px-3 py-2 text-left text-sm flex items-center gap-2 transition-colors ${idx === locationSuggestionIndex
                                                                        ? "bg-gray-50 dark:bg-gray-800/30 text-gray-700 dark:text-gray-300"
                                                                        : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                                                                        }`}
                                                                >
                                                                    <MapPin className="h-3 w-3 text-gray-400" />
                                                                    {loc}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    );
                                                })()}
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <button onClick={() => handleUpdateLocation(contact.id)} disabled={editLocationLoading} className="px-3 py-1.5 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-300 text-white text-sm font-medium rounded-lg flex items-center gap-1">
                                                {editLocationLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />} Save
                                            </button>
                                            <button onClick={() => { setEditingLocationFor(null); setEditLocation(""); setLocationSuggestionIndex(0); }} className="px-3 py-1.5 text-gray-500 hover:text-gray-700 text-sm">Cancel</button>
                                        </div>
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => { setEditLocation(contact.custom_location || xp?.location || li?.location || ""); setEditingLocationFor(contact.id); }}
                                        className="group flex items-center gap-2 text-sm hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
                                    >
                                        <MapPin className="h-4 w-4 text-gray-400" />
                                        {(contact.custom_location || xp?.location || li?.location) ? (
                                            <>
                                                <span className="text-gray-700 dark:text-gray-300">{contact.custom_location || xp?.location || li?.location}</span>
                                                <Pencil className="h-3 w-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                                            </>
                                        ) : (
                                            <span className="text-gray-400 dark:text-gray-500">Add location</span>
                                        )}
                                    </button>
                                )}
                            </div>

                            {/* Links Section */}
                            <div>
                                <h3 className="text-[11px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3">Links</h3>
                                <div className="flex flex-wrap gap-2">
                                    {xp && (
                                        <a href={`https://x.com/${xp.username}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700">
                                            <AtSign className="h-3 w-3" />{xp.username}
                                        </a>
                                    )}
                                    {li && (
                                        <a href={li.linkedin_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700">
                                            <Linkedin className="h-3 w-3" />LinkedIn
                                        </a>
                                    )}
                                    {contact.websites.map(website => (
                                        <div key={website.id} className="inline-flex items-center gap-0.5 group/website">
                                            <a href={website.url.startsWith("http") ? website.url : `https://${website.url}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-l-full hover:bg-green-100">
                                                <ExternalLink className="h-3 w-3" />{website.url.replace(/^https?:\/\//, "").substring(0, 20)}
                                            </a>
                                            <button
                                                onClick={async () => {
                                                    const res = await fetch(`/api/rolodex/websites?id=${website.id}`, { method: "DELETE", credentials: "include" });
                                                    if (res.ok) {
                                                        setContacts(prev => prev.map(c => c.id === contact.id ? { ...c, websites: c.websites.filter(w => w.id !== website.id) } : c));
                                                    }
                                                }}
                                                className="px-1.5 py-1.5 text-xs bg-green-50 dark:bg-green-900/30 text-green-500 dark:text-green-400 rounded-r-full hover:bg-red-100 dark:hover:bg-red-900/30 hover:text-red-500 dark:hover:text-red-400 transition-colors opacity-0 group-hover/website:opacity-100"
                                                title="Remove website"
                                            >
                                                <X className="h-3 w-3" />
                                            </button>
                                        </div>
                                    ))}
                                    {addingLinkFor === contact.id ? (
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="text"
                                                value={linkInput}
                                                onChange={(e) => setLinkInput(e.target.value)}
                                                onKeyDown={(e) => { if (e.key === "Enter" && linkInput.trim()) handleAddLink(contact.id); else if (e.key === "Escape") { setAddingLinkFor(null); setLinkInput(""); } }}
                                                placeholder="x.com/handle or URL"
                                                autoFocus
                                                className="px-2 py-1 text-xs bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-600"
                                            />
                                            <button onClick={() => handleAddLink(contact.id)} disabled={!linkInput.trim() || linkLoading} className="p-1 text-gray-700 hover:text-gray-700 disabled:text-gray-400">
                                                {linkLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                                            </button>
                                            <button onClick={() => { setAddingLinkFor(null); setLinkInput(""); }} className="p-1 text-gray-400 hover:text-gray-600"><X className="h-3 w-3" /></button>
                                        </div>
                                    ) : (
                                        <button onClick={() => setAddingLinkFor(contact.id)} className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 border border-dashed border-gray-300 dark:border-gray-700 rounded-full hover:border-gray-400">
                                            <Plus className="h-3 w-3" />Add link
                                        </button>
                                    )}
                                </div>
                                {linkError && <p className="text-xs text-red-500 mt-1">{linkError}</p>}
                            </div>

                            {/* Lists Section */}
                            <div>
                                <h3 className="text-[11px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3">Lists</h3>
                                <div className="flex flex-wrap gap-2">
                                    {/* Show lists the contact is in (with remove button) */}
                                    {lists.filter(l => l.member_ids.includes(contact.id)).map(list => (
                                        <div key={list.id} className="inline-flex items-center group/list">
                                            <span
                                                className="inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-l-full"
                                                style={list.emoji ? { backgroundColor: "#f3f4f6", color: "#6b7280" } : { backgroundColor: `${list.color}20`, color: list.color }}
                                            >
                                                {list.emoji ? `${list.emoji} ` : ""}{list.name}
                                            </span>
                                            <button
                                                onClick={() => handleRemoveFromList(list.id, contact.id)}
                                                className="px-1.5 py-1 text-xs rounded-r-full transition-colors opacity-0 group-hover/list:opacity-100"
                                                style={list.emoji ? { backgroundColor: "#f3f4f6", color: "#6b7280" } : { backgroundColor: `${list.color}20`, color: list.color }}
                                                title={`Remove from ${list.name}`}
                                            >
                                                <X className="h-3 w-3 hover:text-red-500" />
                                            </button>
                                        </div>
                                    ))}
                                    {/* Dropdown to add to a list */}
                                    {lists.filter(l => !l.member_ids.includes(contact.id)).length > 0 && (
                                        <div className="relative">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setShowListDropdownFor(showListDropdownFor === contact.id ? null : contact.id);
                                                }}
                                                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 border border-dashed border-gray-300 dark:border-gray-700 rounded-full hover:border-gray-400 transition-colors"
                                            >
                                                <Plus className="h-3 w-3" />
                                                Add to list
                                            </button>
                                            {showListDropdownFor === contact.id && (
                                                <div data-list-dropdown="true" className="absolute top-full left-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl z-50 min-w-[160px] py-1">
                                                    {lists.filter(l => !l.member_ids.includes(contact.id)).map(list => (
                                                        <button
                                                            key={list.id}
                                                            onClick={() => {
                                                                handleAddToList(list.id, contact.id);
                                                                setShowListDropdownFor(null);
                                                            }}
                                                            className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                                        >
                                                            {list.emoji ? (
                                                                <span className="text-sm flex-shrink-0">{list.emoji}</span>
                                                            ) : (
                                                                <div
                                                                    className="w-3 h-3 rounded-full flex-shrink-0"
                                                                    style={{ backgroundColor: list.color }}
                                                                />
                                                            )}
                                                            <span className="truncate">{list.name}</span>
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                    {lists.length === 0 && (
                                        <span className="text-sm text-gray-400 italic">No lists created yet</span>
                                    )}
                                </div>
                            </div>

                            {/* Touchpoints Section (Notes + Touchpoints + optional Messages) */}
                            <div>
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-[11px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-widest">Touchpoints</h3>
                                    <div className="flex items-center gap-1.5">
                                        {generatingSummaryFor === contact.id && (
                                            <Loader2 className="h-3 w-3 animate-spin text-violet-400 dark:text-violet-500" />
                                        )}
                                        <button
                                            onClick={() => toggleMessagesForContact(contact.id)}
                                            className={`text-[10px] px-2 py-0.5 rounded-full border transition-colors ${
                                                showMessagesFor.has(contact.id)
                                                    ? "bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400"
                                                    : "bg-transparent border-gray-200 dark:border-gray-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                                            }`}
                                            title={showMessagesFor.has(contact.id) ? "Hide iMessages" : "Show iMessages"}
                                        >
                                            {loadingMessagesFor === contact.id ? "..." : showMessagesFor.has(contact.id) ? "iMessages on" : "iMessages"}
                                        </button>
                                    </div>
                                </div>
                                {/* Add note input - minimal composer */}
                                <div className="mb-4 relative group/composer">
                                    <div className={`rounded-xl border transition-all duration-200 ${
                                        addingNoteFor === contact.id && newNote.trim()
                                            ? "border-gray-300 dark:border-gray-600 shadow-sm bg-white dark:bg-gray-800"
                                            : "border-gray-100 dark:border-gray-800 hover:border-gray-200 dark:hover:border-gray-700 bg-gray-50/50 dark:bg-gray-800/30"
                                    }`}>
                                        <textarea
                                            ref={noteInputRef}
                                            value={addingNoteFor === contact.id ? newNote : ""}
                                            onChange={(e) => {
                                                handleNoteInputChange(e);
                                                setAddingNoteFor(contact.id);
                                            }}
                                            onKeyDown={handleNoteKeyDown}
                                            onFocus={() => setAddingNoteFor(contact.id)}
                                            onBlur={() => {
                                                setTimeout(() => {
                                                    setMentionQuery(null);
                                                    setMentionPosition(null);
                                                }, 150);
                                            }}
                                            placeholder="Write a note..."
                                            rows={1}
                                            className="w-full px-3.5 py-2.5 text-sm bg-transparent text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none resize-none"
                                            style={{ minHeight: "38px" }}
                                            onInput={(e) => {
                                                const target = e.target as HTMLTextAreaElement;
                                                target.style.height = "38px";
                                                target.style.height = Math.min(target.scrollHeight, 120) + "px";
                                            }}
                                        />
                                        {addingNoteFor === contact.id && newNote.trim() && (
                                            <div className="flex items-center justify-between px-3 pb-2">
                                                <span className="text-[10px] text-gray-400">@ to mention</span>
                                                <div className="flex items-center gap-1.5">
                                                    <button onClick={() => { setNewNote(""); setAddingNoteFor(null); setPendingMentions(new Map()); const ta = noteInputRef.current; if (ta) { ta.style.height = "38px"; } }} className="px-2.5 py-1 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-md transition-colors">
                                                        Cancel
                                                    </button>
                                                    <button
                                                        onClick={() => handleAddNote(contact.id)}
                                                        disabled={savingNote}
                                                        className="px-3 py-1 bg-gray-900 dark:bg-white hover:bg-gray-800 dark:hover:bg-gray-100 text-white dark:text-gray-900 text-xs font-medium rounded-lg transition-colors disabled:opacity-50"
                                                    >
                                                        {savingNote ? "Saving..." : "Save"}
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    {/* Mention Dropdown */}
                                    {mentionQuery !== null && mentionSuggestions.length > 0 && addingNoteFor === contact.id && mentionPosition && (
                                        <div
                                            className="fixed bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg z-[9999] max-h-48 overflow-y-auto min-w-[220px] py-1"
                                            style={{ top: mentionPosition.top, left: mentionPosition.left }}
                                        >
                                            {mentionSuggestions.map((c, idx) => {
                                                const profileImg = c.custom_profile_image_url || c.x_profile?.profile_image_url || c.linkedin_profile?.profile_image_url;
                                                return (
                                                    <button
                                                        key={c.id}
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            e.stopPropagation();
                                                            insertMention(c);
                                                        }}
                                                        className={`w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors ${idx === mentionIndex ? "bg-gray-100 dark:bg-gray-700" : "hover:bg-gray-50 dark:hover:bg-gray-750"}`}
                                                    >
                                                        {profileImg ? (
                                                            <Image src={profileImg} alt={c.name} width={22} height={22} unoptimized className="rounded-full" />
                                                        ) : (
                                                            <div className="w-[22px] h-[22px] rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                                                                <span className="text-[10px] font-medium text-gray-500 dark:text-gray-400">{c.name.charAt(0).toUpperCase()}</span>
                                                            </div>
                                                        )}
                                                        <div className="min-w-0">
                                                            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{c.name}</p>
                                                            {c.x_profile?.username && (
                                                                <p className="text-[11px] text-gray-400">@{c.x_profile.username}</p>
                                                            )}
                                                        </div>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                                {/* Timeline list with vertical thread line */}
                                <div className="relative max-h-80 overflow-y-auto pr-1">
                                    {(() => {
                                        type TimelineItem =
                                            | { type: "note"; data: Note; date: string }
                                            | { type: "touchpoint"; data: { id: number; created_at: string }; date: string }
                                            | { type: "message"; data: { id: number; message_text: string; is_from_me: boolean; message_date: string }; date: string }
                                            | { type: "compliment"; data: Compliment; date: string };

                                        const timeline: TimelineItem[] = [
                                            ...contact.notes.filter(n => !n.note.includes("LinkedIn Profile Import")).map(n => ({ type: "note" as const, data: n, date: n.created_at })),
                                            ...contact.touchpoints.map(t => ({ type: "touchpoint" as const, data: t, date: t.created_at })),
                                            ...(contact.compliments || []).map(c => ({ type: "compliment" as const, data: c, date: c.created_at })),
                                        ];

                                        if (showMessagesFor.has(contact.id) && contactMessages[contact.id]) {
                                            timeline.push(...contactMessages[contact.id].map(m => ({
                                                type: "message" as const,
                                                data: m,
                                                date: m.message_date,
                                            })));
                                        }

                                        timeline.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

                                        if (timeline.length === 0) {
                                            return <p className="text-sm text-gray-400 dark:text-gray-500 italic py-4 text-center">No activity yet</p>;
                                        }

                                        return (
                                            <div className="relative">
                                                {/* Vertical thread line */}
                                                {timeline.length > 1 && (
                                                    <div className="absolute left-[7px] top-3 bottom-3 w-px bg-gray-200 dark:bg-gray-700/50" />
                                                )}
                                                <div className="space-y-0.5">
                                                    {timeline.map((item) => {
                                                        if (item.type === "message") {
                                                            const msg = item.data;
                                                            return (
                                                                <div key={`msg-${msg.id}`} className="flex gap-3 py-2 pl-0 group/item">
                                                                    <div className="flex-shrink-0 w-[15px] flex items-start justify-center pt-1.5 relative z-10">
                                                                        <div className={`w-[7px] h-[7px] rounded-full ring-[3px] ring-white dark:ring-gray-900 ${msg.is_from_me ? "bg-blue-400" : "bg-gray-300 dark:bg-gray-600"}`} />
                                                                    </div>
                                                                    <div className="min-w-0 flex-1 py-0.5">
                                                                        <p className="text-[13px] leading-relaxed text-gray-600 dark:text-gray-300 break-words">{msg.message_text.length > 150 ? msg.message_text.slice(0, 150) + "..." : msg.message_text}</p>
                                                                        <div className="flex items-center gap-1.5 mt-1">
                                                                            <span className="text-[10px] text-gray-400 dark:text-gray-500">{msg.is_from_me ? "You" : "Them"}</span>
                                                                            <span className="text-[10px] text-gray-300 dark:text-gray-600">&middot;</span>
                                                                            <span className="text-[10px] text-gray-400 dark:text-gray-500">{formatTimeAgo(msg.message_date)}</span>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            );
                                                        }
                                                        if (item.type === "touchpoint") {
                                                            return (
                                                                <div key={`tp-${item.data.id}`} className="flex gap-3 py-2 pl-0 group/item">
                                                                    <div className="flex-shrink-0 w-[15px] flex items-start justify-center pt-1.5 relative z-10">
                                                                        <div className="w-[7px] h-[7px] rounded-full bg-gray-300 dark:bg-gray-600 ring-[3px] ring-white dark:ring-gray-900" />
                                                                    </div>
                                                                    <div className="flex-1 flex items-center gap-2 py-0.5">
                                                                        <span className="text-[13px] text-gray-500 dark:text-gray-400">Logged touchpoint</span>
                                                                        <span className="text-[10px] text-gray-400 dark:text-gray-500 ml-auto">{formatTimeAgo(item.data.created_at)}</span>
                                                                    </div>
                                                                </div>
                                                            );
                                                        }
                                                        if (item.type === "compliment") {
                                                            const compliment = item.data;
                                                            return (
                                                                <div key={`comp-${compliment.id}`} className="flex gap-3 py-1.5 pl-0 group/item">
                                                                    <div className="flex-shrink-0 w-[15px] flex items-start justify-center pt-2 relative z-10">
                                                                        <div className="w-[7px] h-[7px] rounded-full bg-pink-400 dark:bg-pink-500 ring-[3px] ring-white dark:ring-gray-900" />
                                                                    </div>
                                                                    <div className="flex-1 min-w-0 py-1.5">
                                                                        <p className="text-[13px] leading-relaxed text-gray-700 dark:text-gray-300">
                                                                            <span className="text-pink-500 dark:text-pink-400 mr-1">✨</span>
                                                                            &ldquo;{compliment.compliment}&rdquo;
                                                                        </p>
                                                                        <div className="flex items-center gap-1.5 mt-1">
                                                                            <span className="text-[10px] text-gray-400 dark:text-gray-500">{formatTimeAgo(compliment.created_at)}</span>
                                                                            {compliment.context && (
                                                                                <>
                                                                                    <span className="text-[10px] text-gray-300 dark:text-gray-600">&middot;</span>
                                                                                    <span className="text-[10px] text-gray-400 dark:text-gray-500">{compliment.context}</span>
                                                                                </>
                                                                            )}
                                                                            <span className="text-[10px] font-medium text-pink-500 dark:text-pink-400 bg-pink-50 dark:bg-pink-900/30 px-1.5 py-0.5 rounded-full ml-1">
                                                                                compliment
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            );
                                                        }
                                                        const note = item.data as Note;
                                                        const isAutoNote = note.source_type === "website_analysis" || note.source_type === "auto_summary";
                                                        return (
                                                            <div key={`note-${note.id}`} className="flex gap-3 py-1.5 pl-0 group/item">
                                                                <div className="flex-shrink-0 w-[15px] flex items-start justify-center pt-2 relative z-10">
                                                                    <div className={`w-[7px] h-[7px] rounded-full ring-[3px] ring-white dark:ring-gray-900 ${isAutoNote ? "bg-violet-400 dark:bg-violet-500" : "bg-gray-300 dark:bg-gray-600"}`} />
                                                                </div>
                                                                <div className={`flex-1 min-w-0 relative rounded-lg py-1.5 ${editingNote?.noteId === note.id ? "" : "group"}`}>
                                                                    {editingNote?.noteId === note.id ? (
                                                                        <div className="relative flex items-center gap-2">
                                                                            <input
                                                                                ref={editNoteInputRef}
                                                                                type="text"
                                                                                value={editNoteText}
                                                                                onChange={handleEditNoteInputChange}
                                                                                onKeyDown={(e) => handleEditNoteKeyDown(e, note.id, contact.id)}
                                                                                onBlur={() => {
                                                                                    setTimeout(() => {
                                                                                        setEditMentionQuery(null);
                                                                                        setEditMentionPosition(null);
                                                                                    }, 150);
                                                                                }}
                                                                                autoFocus
                                                                                className="flex-1 px-2.5 py-1.5 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-500"
                                                                            />
                                                                            <button
                                                                                onClick={() => handleEditNote(note.id, contact.id)}
                                                                                disabled={!editNoteText.trim() || editNoteLoading}
                                                                                className="p-1.5 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white disabled:text-gray-300 dark:disabled:text-gray-600 transition-colors"
                                                                            >
                                                                                {editNoteLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                                                                            </button>
                                                                            <button onClick={() => { setEditingNote(null); setEditNoteText(""); setEditPendingMentions(new Map()); }} className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
                                                                                <X className="h-3.5 w-3.5" />
                                                                            </button>
                                                                            {editMentionQuery !== null && editMentionSuggestions.length > 0 && editMentionPosition && (
                                                                                <div
                                                                                    className="fixed z-[9999] bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 py-1 min-w-[220px]"
                                                                                    style={{ top: editMentionPosition.top, left: editMentionPosition.left }}
                                                                                >
                                                                                    {editMentionSuggestions.map((c, idx) => {
                                                                                        const profileImg = c.custom_profile_image_url || c.x_profile?.profile_image_url || c.linkedin_profile?.profile_image_url;
                                                                                        return (
                                                                                            <button
                                                                                                key={c.id}
                                                                                                onClick={() => insertEditMention(c)}
                                                                                                className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 transition-colors ${idx === editMentionIndex ? "bg-gray-100 dark:bg-gray-700" : "hover:bg-gray-50 dark:hover:bg-gray-750"}`}
                                                                                            >
                                                                                                {profileImg ? (
                                                                                                    <Image src={profileImg} alt="" width={22} height={22} unoptimized className="rounded-full object-cover" />
                                                                                                ) : (
                                                                                                    <div className="w-[22px] h-[22px] rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-[10px] font-medium text-gray-500">{c.name.charAt(0)}</div>
                                                                                                )}
                                                                                                <span className="text-gray-900 dark:text-white">{c.name}</span>
                                                                                            </button>
                                                                                        );
                                                                                    })}
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    ) : (
                                                                        <>
                                                                            <p className="text-[13px] leading-relaxed text-gray-700 dark:text-gray-300 pr-14">{renderNoteWithMentions(note.note)}</p>
                                                                            <div className="flex items-center gap-1.5 mt-1">
                                                                                <Popover
                                                                                    open={editingNoteDate?.noteId === note.id && editingNoteDate?.contactId === contact.id}
                                                                                    modal={false}
                                                                                >
                                                                                    <PopoverTrigger asChild>
                                                                                        <button
                                                                                            className="text-[11px] text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400 transition-colors flex items-center gap-1"
                                                                                            title="Click to change date"
                                                                                            onClick={() => setEditingNoteDate({ noteId: note.id, contactId: contact.id, currentDate: new Date(note.created_at) })}
                                                                                        >
                                                                                            <Calendar className="h-2.5 w-2.5" />
                                                                                            {formatTimeAgo(note.created_at)}
                                                                                        </button>
                                                                                    </PopoverTrigger>
                                                                                    <PopoverContent
                                                                                        className="w-auto p-0"
                                                                                        align="start"
                                                                                        onInteractOutside={(e) => e.preventDefault()}
                                                                                        onPointerDownOutside={(e) => e.preventDefault()}
                                                                                        onFocusOutside={(e) => e.preventDefault()}
                                                                                        onEscapeKeyDown={(e) => e.preventDefault()}
                                                                                    >
                                                                                        <div className="flex items-center justify-between px-3 pt-2">
                                                                                            <span className="text-xs font-medium text-gray-500">Change date</span>
                                                                                            <button
                                                                                                onClick={() => setEditingNoteDate(null)}
                                                                                                className="p-1 text-gray-400 hover:text-gray-600 rounded"
                                                                                            >
                                                                                                <X className="h-3 w-3" />
                                                                                            </button>
                                                                                        </div>
                                                                                        <CalendarPicker
                                                                                            mode="single"
                                                                                            selected={editingNoteDate?.currentDate}
                                                                                            onSelect={(date) => {
                                                                                                if (date) {
                                                                                                    const originalDate = new Date(note.created_at);
                                                                                                    date.setHours(originalDate.getHours(), originalDate.getMinutes(), originalDate.getSeconds());
                                                                                                    handleUpdateNoteDate(note.id, contact.id, date);
                                                                                                }
                                                                                            }}
                                                                                            disabled={(date: Date) => date > new Date()}
                                                                                            initialFocus
                                                                                        />
                                                                                        <div className="p-2 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-500 text-center">
                                                                                            {editNoteDateLoading ? "Saving..." : "Select a new date"}
                                                                                        </div>
                                                                                    </PopoverContent>
                                                                                </Popover>
                                                                                {isAutoNote && (
                                                                                    <span className="text-[10px] font-medium text-violet-500 dark:text-violet-400 bg-violet-50 dark:bg-violet-900/30 px-1.5 py-0.5 rounded-full">
                                                                                        {note.source_type === "auto_summary" ? "ai summary" : "auto"}
                                                                                    </span>
                                                                                )}
                                                                            </div>
                                                                            {/* Edit/Delete buttons */}
                                                                            <div className="absolute top-0.5 right-0 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                                <button
                                                                                    onClick={() => { setEditingNote({ noteId: note.id, contactId: contact.id }); setEditNoteText(note.note); initializeEditMentions(note.note); }}
                                                                                    className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
                                                                                    title="Edit note"
                                                                                >
                                                                                    <Pencil className="h-3 w-3" />
                                                                                </button>
                                                                                <button
                                                                                    onClick={() => handleDeleteNote(note.id, contact.id)}
                                                                                    className="p-1.5 text-gray-400 hover:text-red-500 transition-colors rounded-md hover:bg-red-50 dark:hover:bg-red-900/20"
                                                                                    title="Delete note"
                                                                                >
                                                                                    <Trash2 className="h-3 w-3" />
                                                                                </button>
                                                                            </div>
                                                                        </>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        );
                                    })()}
                                </div>
                            </div>

                            </div>
                            ) : profilePanelTab === "contact" ? (
                            /* Contact Tab */
                            <div className="px-6 py-4 space-y-5">
                                {/* Phone & Email */}
                                <div>
                                    <h3 className="text-[11px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3">Phone & Email</h3>
                                    <div className="space-y-1.5">
                                        {(contact.contact_info || []).map(info => (
                                            <div key={info.id} className="flex items-center gap-2 group/info">
                                                {info.type === 'phone' ? <Phone className="h-3.5 w-3.5 text-gray-400" /> : <Mail className="h-3.5 w-3.5 text-gray-400" />}
                                                <span className="text-sm text-gray-700 dark:text-gray-300">
                                                    {info.type === 'phone'
                                                        ? info.value.replace(/^\+?1?(\d{3})(\d{3})(\d{4})$/, '+1 ($1) $2-$3').replace(/^\+(\d{1,3})(\d{3})(\d{3})(\d{4})$/, '+$1 ($2) $3-$4')
                                                        : info.value}
                                                </span>
                                                <button
                                                    onClick={() => handleDeleteContactInfo(info.id, contact.id)}
                                                    className="p-0.5 text-gray-300 hover:text-red-500 transition-colors opacity-0 group-hover/info:opacity-100"
                                                    title="Remove"
                                                >
                                                    <X className="h-3 w-3" />
                                                </button>
                                            </div>
                                        ))}
                                        {addingContactInfoFor === contact.id ? (
                                            <div className="flex items-center gap-2">
                                                <select
                                                    value={contactInfoType}
                                                    onChange={(e) => setContactInfoType(e.target.value as 'phone' | 'email')}
                                                    className="px-2 py-1 text-xs bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gray-600"
                                                >
                                                    <option value="phone">Phone</option>
                                                    <option value="email">Email</option>
                                                </select>
                                                <input
                                                    type={contactInfoType === 'email' ? 'email' : 'tel'}
                                                    value={contactInfoValue}
                                                    onChange={(e) => setContactInfoValue(e.target.value)}
                                                    onKeyDown={(e) => {
                                                        if (e.key === "Enter" && contactInfoValue.trim()) handleAddContactInfo(contact.id);
                                                        else if (e.key === "Escape") { setAddingContactInfoFor(null); setContactInfoValue(""); }
                                                    }}
                                                    placeholder={contactInfoType === 'phone' ? '555-123-4567' : 'email@example.com'}
                                                    autoFocus
                                                    className="px-2 py-1 text-xs bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-600 w-36"
                                                />
                                                <button onClick={() => handleAddContactInfo(contact.id)} disabled={!contactInfoValue.trim() || contactInfoLoading} className="p-1 text-gray-700 hover:text-gray-700 disabled:text-gray-400">
                                                    {contactInfoLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                                                </button>
                                                <button onClick={() => { setAddingContactInfoFor(null); setContactInfoValue(""); }} className="p-1 text-gray-400 hover:text-gray-600">
                                                    <X className="h-3 w-3" />
                                                </button>
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() => setAddingContactInfoFor(contact.id)}
                                                className="flex items-center gap-1.5 text-sm text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400 transition-colors"
                                            >
                                                <Plus className="h-3 w-3" />
                                                Add phone or email
                                            </button>
                                        )}
                                    </div>
                                </div>

                            </div>
                            ) : (
                            /* Professional Tab */
                            <div className="px-6 py-4">
                                {(() => {
                                    // Find LinkedIn import note and parse it
                                    const linkedInNote = contact.notes.find(n => n.note.includes("LinkedIn Profile Import"));
                                    const parsed = linkedInNote ? parseLinkedInNote(linkedInNote.note) : null;
                                    const li = contact.linkedin_profile;

                                    if (!parsed && !li) {
                                        return (
                                            <div className="flex flex-col items-center justify-center py-16 text-center">
                                                <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
                                                    <Briefcase className="h-5 w-5 text-gray-400" />
                                                </div>
                                                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">No professional data</p>
                                                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 max-w-[220px]">Link a LinkedIn profile to see experience, education, and more</p>
                                            </div>
                                        );
                                    }

                                    return (
                                        <div className="space-y-6">
                                            {/* Headline & Location */}
                                            {(parsed?.headline || li?.headline) && (
                                                <div>
                                                    <p className="text-[13px] font-medium text-gray-900 dark:text-white leading-relaxed">
                                                        {parsed?.headline || li?.headline}
                                                    </p>
                                                    {(parsed?.location || li?.location) && (
                                                        <div className="flex items-center gap-1.5 mt-1.5">
                                                            <MapPin className="h-3 w-3 text-gray-400" />
                                                            <span className="text-xs text-gray-500 dark:text-gray-400">{parsed?.location || li?.location}</span>
                                                        </div>
                                                    )}
                                                    {(parsed?.linkedinUrl || li?.linkedin_url) && (
                                                        <a
                                                            href={parsed?.linkedinUrl || li?.linkedin_url}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="inline-flex items-center gap-1 mt-2 text-xs text-blue-600 dark:text-blue-400 hover:underline"
                                                        >
                                                            <ExternalLink className="h-3 w-3" />
                                                            View LinkedIn profile
                                                        </a>
                                                    )}
                                                </div>
                                            )}

                                            {/* About */}
                                            {parsed?.about && (
                                                <div>
                                                    <h3 className="text-[11px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2.5 flex items-center gap-1.5">
                                                        <User className="h-3 w-3" />
                                                        About
                                                    </h3>
                                                    <p className="text-[13px] leading-relaxed text-gray-600 dark:text-gray-300">
                                                        {parsed.about}
                                                    </p>
                                                </div>
                                            )}

                                            {/* Experience */}
                                            {parsed && parsed.experience.length > 0 && (
                                                <div>
                                                    <h3 className="text-[11px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                                                        <Briefcase className="h-3 w-3" />
                                                        Experience
                                                    </h3>
                                                    <div className="relative pl-5">
                                                        {parsed.experience.length > 1 && (
                                                            <div className="absolute left-[3px] top-2 bottom-2 w-px bg-gray-200 dark:bg-gray-700/60" />
                                                        )}
                                                        {parsed.experience.map((exp, i) => (
                                                            <div key={i} className="relative pb-4 last:pb-0">
                                                                <div className="absolute -left-5 top-[6px] w-[7px] h-[7px] rounded-full bg-gray-300 dark:bg-gray-600 ring-[3px] ring-white dark:ring-gray-900" />
                                                                <p className="text-[13px] font-medium text-gray-900 dark:text-white leading-snug">{exp.title}</p>
                                                                {exp.company && (
                                                                    <p className="text-[12px] text-gray-500 dark:text-gray-400 mt-0.5">{exp.company}</p>
                                                                )}
                                                                {exp.dates && (
                                                                    <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">{exp.dates}</p>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Education */}
                                            {parsed && parsed.education.length > 0 && (
                                                <div>
                                                    <h3 className="text-[11px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                                                        <GraduationCap className="h-3 w-3" />
                                                        Education
                                                    </h3>
                                                    <div className="relative pl-5">
                                                        {parsed.education.length > 1 && (
                                                            <div className="absolute left-[3px] top-2 bottom-2 w-px bg-gray-200 dark:bg-gray-700/60" />
                                                        )}
                                                        {parsed.education.map((edu, i) => (
                                                            <div key={i} className="relative pb-4 last:pb-0">
                                                                <div className="absolute -left-5 top-[6px] w-[7px] h-[7px] rounded-full bg-gray-300 dark:bg-gray-600 ring-[3px] ring-white dark:ring-gray-900" />
                                                                <p className="text-[13px] font-medium text-gray-900 dark:text-white leading-snug">{edu.school}</p>
                                                                {edu.degree && (
                                                                    <p className="text-[12px] text-gray-500 dark:text-gray-400 mt-0.5">{edu.degree}</p>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Raw LinkedIn note fallback if no parsed sections */}
                                            {parsed && !parsed.about && parsed.experience.length === 0 && parsed.education.length === 0 && linkedInNote && (
                                                <div>
                                                    <h3 className="text-[11px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2.5 flex items-center gap-1.5">
                                                        <FileText className="h-3 w-3" />
                                                        LinkedIn Import
                                                    </h3>
                                                    <p className="text-[13px] leading-relaxed text-gray-600 dark:text-gray-300 whitespace-pre-line">
                                                        {linkedInNote.note}
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })()}
                            </div>
                            )}

                        </SheetContent>
                    </>
                );
            })()}
        </Sheet>
    );
}
