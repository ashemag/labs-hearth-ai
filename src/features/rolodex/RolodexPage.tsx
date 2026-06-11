// =============================================================================
// WARM ACCENT THEME (Easily Reversible)
// - UI chrome (backgrounds, borders, buttons, hover states) use gray-* colors
// - Table body text (names, bios, locations, notes) uses gray-* for readability
// 
// To fully revert to gray theme: Find & Replace "gray-" → "gray-" in this file
// The warm palette is defined in tailwind.config.ts
// =============================================================================
"use client";

import { useState, useCallback, useRef, useMemo, useDeferredValue } from "react";
import Link from "next/link";
import Image from "next/image";
import {
    Loader2,
    Plus,
    X,
    Trash2,
    Users,
    Merge,
    Pencil,
    Check,
    Search,
    CheckCircle2,
    ChevronRight,
    ClipboardList,
    PanelRightClose,
    Pin,
    PinOff,
    Eye,
    EyeOff,
    Sparkles,
    Command,
    LogOut,
    Palette,
    Settings,
    ImagePlus,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/Sheet";
import ContributionsGrid from "@/components/ContributionsGrid";
import ChatWidget from "@/components/ChatWidget";
import type { Contact, RolodexList, ContextMenuState, DiscoveryResult } from "./types";
import CommandSearchModal from "./components/CommandSearchModal";
import AddContactModal from "./components/AddContactModal";
import DiscoveryPanel from "./components/DiscoveryPanel";
import TodoSheet from "./components/TodoSheet";
import ProfilePanel from "./components/ProfilePanel";
import ListsSidebar from "./components/ListsSidebar";
import ContactsTable from "./components/ContactsTable";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { smartCropImageToSquare } from "@/lib/smart-image-crop";
import { useRolodexBootstrap } from "./hooks/useRolodexBootstrap";
import { useRolodexCommandSearch } from "./hooks/useRolodexCommandSearch";
import { useRolodexPageEffects } from "./hooks/useRolodexPageEffects";
import { useRolodexTodos } from "./hooks/useRolodexTodos";

export default function RolodexPage() {
    const {
        authLoading,
        authenticated,
        user,
        showUserMenu,
        setShowUserMenu,
        userMenuRef,
        contacts,
        setContacts,
        loading,
        lists,
        setLists,
        todos,
        setTodos,
        allLocations,
        setAllLocations,
        standaloneCompliments,
        setStandaloneCompliments,
        fetchContacts,
    } = useRolodexBootstrap();

    const [contributionsRefreshKey, setContributionsRefreshKey] = useState(0);
    const [showAddModal, setShowAddModal] = useState(false);
    const [addMode, setAddMode] = useState<"social" | "name">("social");
    const [addHandle, setAddHandle] = useState("");
    const [addName, setAddName] = useState("");
    const [addLoading, setAddLoading] = useState(false);
    const [addError, setAddError] = useState<string | null>(null);
    const [newNote, setNewNote] = useState("");
    const [addingNoteFor, setAddingNoteFor] = useState<number | null>(null);
    const [savingNote, setSavingNote] = useState(false);
    const [selectedContacts, setSelectedContacts] = useState<Set<number>>(new Set());
    const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
    const [showListSubmenu, setShowListSubmenu] = useState(false);
    const [merging, setMerging] = useState(false);
    // Unified link adding state
    const [addingLinkFor, setAddingLinkFor] = useState<number | null>(null);
    const [linkInput, setLinkInput] = useState("");
    const [linkLoading, setLinkLoading] = useState(false);
    const [linkError, setLinkError] = useState<string | null>(null);
    const [editingNameFor, setEditingNameFor] = useState<number | null>(null);
    const [editName, setEditName] = useState("");
    const [editNameLoading, setEditNameLoading] = useState(false);
    const [editingBioFor, setEditingBioFor] = useState<number | null>(null);
    const [editBio, setEditBio] = useState("");
    const [editBioLoading, setEditBioLoading] = useState(false);
    const [editingLocationFor, setEditingLocationFor] = useState<number | null>(null);
    const [editLocation, setEditLocation] = useState("");
    const [editLocationLoading, setEditLocationLoading] = useState(false);
    const [locationSuggestionIndex, setLocationSuggestionIndex] = useState(0);
    const [activeList, setActiveList] = useState<number | "all" | "curated">("curated");
    const [showNewListInput, setShowNewListInput] = useState(false);
    const [listPickerOpen, setListPickerOpen] = useState<number | null>(null);
    const [listContextMenu, setListContextMenu] = useState<{ x: number; y: number; listId: number } | null>(null);
    const [renamingListId, setRenamingListId] = useState<number | null>(null);
    const [renameListValue, setRenameListValue] = useState("");
    const [newListName, setNewListName] = useState("");
    const [creatingList, setCreatingList] = useState(false);
    const [showListsDropdown, setShowListsDropdown] = useState(false);
    const [showListDropdownFor, setShowListDropdownFor] = useState<number | null>(null);
    const [hiddenListIds, setHiddenListIds] = useState<Set<number>>(new Set());
    const listsDropdownRef = useRef<HTMLDivElement>(null);
    const [editingNote, setEditingNote] = useState<{ noteId: number; contactId: number } | null>(null);
    const [editNoteText, setEditNoteText] = useState("");
    const [editNoteLoading, setEditNoteLoading] = useState(false);
    const [editingNoteDate, setEditingNoteDate] = useState<{ noteId: number; contactId: number; currentDate: Date } | null>(null);
    const [editNoteDateLoading, setEditNoteDateLoading] = useState(false);
    // Compliments state
    const [newCompliment, setNewCompliment] = useState("");
    const [newComplimentContext, setNewComplimentContext] = useState("");
    const [addingComplimentFor, setAddingComplimentFor] = useState<number | null>(null);
    const [showComplimentInput, setShowComplimentInput] = useState<number | null>(null);
    const [editingCompliment, setEditingCompliment] = useState<{ complimentId: number; contactId: number } | null>(null);
    const [editComplimentText, setEditComplimentText] = useState("");
    const [editComplimentContext, setEditComplimentContext] = useState("");
    const [editComplimentLoading, setEditComplimentLoading] = useState(false);
    const [mentionQuery, setMentionQuery] = useState<string | null>(null);
    const [mentionPosition, setMentionPosition] = useState<{ top: number; left: number } | null>(null);
    const [mentionIndex, setMentionIndex] = useState(0);
    const [searchQuery, setSearchQuery] = useState("");
    const deferredSearchQuery = useDeferredValue(searchQuery);
    const [pendingMentions, setPendingMentions] = useState<Map<string, number>>(new Map());
    // Edit note mention state
    const [editPendingMentions, setEditPendingMentions] = useState<Map<string, number>>(new Map());
    const [editMentionQuery, setEditMentionQuery] = useState<string | null>(null);
    const [editMentionPosition, setEditMentionPosition] = useState<{ top: number; left: number } | null>(null);
    const [editMentionIndex, setEditMentionIndex] = useState(0);
    const [showTodoSheet, setShowTodoSheet] = useState(() => {
        if (typeof window !== "undefined") {
            return localStorage.getItem("rolodex-todo-sheet-open") === "true";
        }
        return false;
    });
    const [showBoostSheet, setShowBoostSheet] = useState(false);
    const [showBoostAddForm, setShowBoostAddForm] = useState(false);
    const [boostNewCompliment, setBoostNewCompliment] = useState("");
    const [boostNewSource, setBoostNewSource] = useState("");
    const [boostNewContext, setBoostNewContext] = useState("");
    const [boostAddLoading, setBoostAddLoading] = useState(false);
    const [boostImagePreview, setBoostImagePreview] = useState<string | null>(null);
    const [boostDragOver, setBoostDragOver] = useState(false);
    const [boostExtracting, setBoostExtracting] = useState(false);
    const pendingListDeleteRef = useRef<{ list: RolodexList; timeoutId: ReturnType<typeof setTimeout> } | null>(null);
    const {
        completedTodosExpanded,
        setCompletedTodosExpanded,
        todoNameFilter,
        setTodoNameFilter,
        todoNameSearch,
        setTodoNameSearch,
        showTodoNameDropdown,
        setShowTodoNameDropdown,
        todoDueDateFilter,
        setTodoDueDateFilter,
        editingTodoId,
        setEditingTodoId,
        editingTodoDueDate,
        setEditingTodoDueDate,
        todoNameSearchRef,
        showAddTodoModal,
        setShowAddTodoModal,
        addTodoForContact,
        setAddTodoForContact,
        newTodoTask,
        setNewTodoTask,
        newTodoDueDate,
        setNewTodoDueDate,
        handleAddTodo,
        toggleTodoComplete,
        deleteTodo,
        updateTodoDueDate,
        formatDueDate,
        isDueOverdue,
        filteredTodos,
        activeTodos,
        completedTodos,
    } = useRolodexTodos({ todos, setTodos });
    // Discovery state
    const [showDiscovery, setShowDiscovery] = useState(false);
    const [discoveryUsername, setDiscoveryUsername] = useState("");
    const [discoveryLoading, setDiscoveryLoading] = useState(false);
    const [discoveryPrefillLoading, setDiscoveryPrefillLoading] = useState(false);
    const [discoveryResult, setDiscoveryResult] = useState<DiscoveryResult | null>(null);
    const [discoveryError, setDiscoveryError] = useState<string | null>(null);
    // Delete confirmation state
    const [deleteConfirm, setDeleteConfirm] = useState<{ id: number; name: string } | null>(null);
    const [deleteLoading, setDeleteLoading] = useState(false);
    // Image upload state
    const [uploadingImageFor, setUploadingImageFor] = useState<number | null>(null);
    const [hoveringAvatarFor, setHoveringAvatarFor] = useState<number | null>(null);
    // Hidden contacts state
    const [showHiddenContacts, setShowHiddenContacts] = useState(false);
    const [togglingHiddenFor, setTogglingHiddenFor] = useState<number | null>(null);
    // Contact profile panel state
    const [selectedContactId, setSelectedContactId] = useState<number | null>(null);
    const [profilePanelExpanded, setProfilePanelExpanded] = useState(false);
    const [profilePanelTab, setProfilePanelTab] = useState<"overview" | "professional" | "contact">("overview");
    const [profileMenuOpen, setProfileMenuOpen] = useState(false);
    const {
        showCommandSearch,
        setShowCommandSearch,
        commandSearchQuery,
        setCommandSearchQuery,
        commandSearchIndex,
        setCommandSearchIndex,
        commandSearchResults,
        semanticSearchResults,
        semanticSearchLoading,
        commandSearchResultCount,
        creatingSearchList,
        handleCommandSearchSelect,
        handleCreateListFromCommandSearch,
    } = useRolodexCommandSearch({
        contacts,
        setLists,
        setActiveList,
        setSearchQuery,
        setSelectedContactId,
    });
    // Contact info (phone/email) state
    const [addingContactInfoFor, setAddingContactInfoFor] = useState<number | null>(null);
    const [contactInfoType, setContactInfoType] = useState<'phone' | 'email'>('phone');
    const [contactInfoValue, setContactInfoValue] = useState("");
    const [contactInfoLoading, setContactInfoLoading] = useState(false);
    // iMessage timeline state
    const [showMessagesFor, setShowMessagesFor] = useState<Set<number>>(new Set());
    const [contactMessages, setContactMessages] = useState<Record<number, Array<{
        id: number;
        message_text: string;
        is_from_me: boolean;
        message_date: string;
    }>>>({});
    const [loadingMessagesFor, setLoadingMessagesFor] = useState<number | null>(null);
    const [generatingSummaryFor, setGeneratingSummaryFor] = useState<number | null>(null);
    const imageInputRef = useRef<HTMLInputElement>(null);
    const noteInputRef = useRef<HTMLTextAreaElement>(null);
    const editNoteInputRef = useRef<HTMLInputElement>(null);

    useRolodexPageEffects({
        selectedContactId,
        noteInputRef,
        setGeneratingSummaryFor,
        setContacts,
        setContextMenu,
        setListContextMenu,
        setShowListSubmenu,
        setSelectedContacts,
        showTodoSheet,
        showTodoNameDropdown,
        todoNameSearchRef,
        setShowTodoNameDropdown,
        showListsDropdown,
        listsDropdownRef,
        setShowListsDropdown,
        showListDropdownFor,
        setShowListDropdownFor,
    });

    const handleAddContact = async (e: React.FormEvent) => {
        e.preventDefault();

        const isSocialMode = addMode === "social";
        const value = isSocialMode ? addHandle.trim() : addName.trim();
        if (!value) return;

        setAddLoading(true);
        setAddError(null);

        try {
            const res = await fetch("/api/rolodex/contacts", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify(isSocialMode ? { handle: value } : { name: value }),
            });

            const data = await res.json();

            if (!res.ok) {
                setAddError(data.error || "Failed to add contact");
                return;
            }

            // Add to local state
            setContacts((prev) => [data.contact, ...prev]);
            setShowAddModal(false);
            setAddHandle("");
            setAddName("");
        } catch (error) {
            setAddError("Network error. Please try again.");
        } finally {
            setAddLoading(false);
        }
    };

    const handleAddNote = async (contactId: number) => {
        if (!newNote.trim()) return;
        // Prevent double submission
        if (savingNote) return;

        setSavingNote(true);

        // Convert @Name to @[Name](id) format using pending mentions
        let noteToSave = newNote.trim();
        pendingMentions.forEach((id, name) => {
            // Replace @Name with @[Name](id) - match the name anywhere after @
            const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const mentionPattern = new RegExp(`@${escapedName}(?![\\w])`, 'g');
            noteToSave = noteToSave.replace(mentionPattern, `@[${name}](${id})`);
        });

        try {
            const res = await fetch("/api/rolodex/notes", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ people_id: contactId, note: noteToSave }),
            });

            const data = await res.json();

            if (!res.ok) {
                console.error("Error adding note:", data.error);
                return;
            }

            // Update local state
            setContacts((prev) =>
                prev.map((c) =>
                    c.id === contactId
                        ? { ...c, notes: [data.note, ...c.notes] }
                        : c
                )
            );
            setNewNote("");
            setPendingMentions(new Map());
            setAddingNoteFor(null);
            // Reset textarea height
            if (noteInputRef.current) {
                noteInputRef.current.style.height = 'auto';
            }
            // Refresh contributions grid
            setContributionsRefreshKey(prev => prev + 1);
        } catch (error) {
            console.error("Error adding note:", error);
        } finally {
            setSavingNote(false);
        }
    };

    const handleEditNote = async (noteId: number, contactId: number) => {
        if (!editNoteText.trim()) return;

        setEditNoteLoading(true);

        // Convert @Name to @[Name](id) format using pending mentions
        let noteToSave = editNoteText.trim();
        editPendingMentions.forEach((id, name) => {
            // Replace @Name with @[Name](id) - match the name anywhere after @
            const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const mentionPattern = new RegExp(`@${escapedName}(?![\\w])`, 'g');
            noteToSave = noteToSave.replace(mentionPattern, `@[${name}](${id})`);
        });

        try {
            const res = await fetch("/api/rolodex/notes", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ note_id: noteId, note: noteToSave }),
            });

            if (res.ok) {
                const data = await res.json();
                setContacts((prev) =>
                    prev.map((c) =>
                        c.id === contactId
                            ? {
                                ...c,
                                notes: c.notes.map((n) =>
                                    n.id === noteId ? { ...n, note: data.note.note } : n
                                ),
                            }
                            : c
                    )
                );
                setEditingNote(null);
                setEditNoteText("");
                setEditPendingMentions(new Map());
                setEditMentionQuery(null);
                setEditMentionPosition(null);
            }
        } catch (error) {
            console.error("Error editing note:", error);
        } finally {
            setEditNoteLoading(false);
        }
    };

    const handleUpdateNoteDate = async (noteId: number, contactId: number, newDate: Date) => {
        setEditNoteDateLoading(true);
        try {
            const res = await fetch("/api/rolodex/notes", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ note_id: noteId, created_at: newDate.toISOString() }),
            });

            if (res.ok) {
                const data = await res.json();
                setContacts((prev) =>
                    prev.map((c) =>
                        c.id === contactId
                            ? {
                                ...c,
                                notes: c.notes.map((n) =>
                                    n.id === noteId ? { ...n, created_at: data.note.created_at } : n
                                ),
                            }
                            : c
                    )
                );
                setEditingNoteDate(null);
                // Refresh contributions grid since date changed
                setContributionsRefreshKey(prev => prev + 1);
            }
        } catch (error) {
            console.error("Error updating note date:", error);
        } finally {
            setEditNoteDateLoading(false);
        }
    };

    const handleDeleteNote = async (noteId: number, contactId: number) => {
        try {
            const res = await fetch(`/api/rolodex/notes?id=${noteId}`, {
                method: "DELETE",
                credentials: "include",
            });

            if (!res.ok) {
                console.error("Error deleting note");
                return;
            }

            // Update local state
            setContacts((prev) =>
                prev.map((c) =>
                    c.id === contactId
                        ? { ...c, notes: c.notes.filter((n) => n.id !== noteId) }
                        : c
                )
            );
        } catch (error) {
            console.error("Error deleting note:", error);
        }
    };

    // Compliment handlers
    const handleAddCompliment = async (contactId: number) => {
        if (!newCompliment.trim()) return;

        setAddingComplimentFor(contactId);

        try {
            const res = await fetch("/api/rolodex/compliments", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({
                    people_id: contactId,
                    compliment: newCompliment.trim(),
                    context: newComplimentContext.trim() || null,
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                console.error("Error adding compliment:", data.error);
                return;
            }

            // Update local state
            setContacts((prev) =>
                prev.map((c) =>
                    c.id === contactId
                        ? {
                            ...c,
                            compliments: [
                                {
                                    id: data.compliment.id,
                                    compliment: data.compliment.compliment,
                                    context: data.compliment.context,
                                    received_at: data.compliment.receivedAt,
                                    created_at: data.compliment.createdAt,
                                },
                                ...c.compliments,
                            ],
                        }
                        : c
                )
            );
            setNewCompliment("");
            setNewComplimentContext("");
            setShowComplimentInput(null);
        } catch (error) {
            console.error("Error adding compliment:", error);
        } finally {
            setAddingComplimentFor(null);
        }
    };

    const handleEditCompliment = async (complimentId: number, contactId: number) => {
        if (!editComplimentText.trim()) return;

        setEditComplimentLoading(true);
        try {
            const res = await fetch("/api/rolodex/compliments", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({
                    id: complimentId,
                    compliment: editComplimentText.trim(),
                    context: editComplimentContext.trim() || null,
                }),
            });

            if (res.ok) {
                const data = await res.json();
                setContacts((prev) =>
                    prev.map((c) =>
                        c.id === contactId
                            ? {
                                ...c,
                                compliments: c.compliments.map((comp) =>
                                    comp.id === complimentId
                                        ? {
                                            ...comp,
                                            compliment: data.compliment.compliment,
                                            context: data.compliment.context,
                                        }
                                        : comp
                                ),
                            }
                            : c
                    )
                );
                setEditingCompliment(null);
                setEditComplimentText("");
                setEditComplimentContext("");
            }
        } catch (error) {
            console.error("Error editing compliment:", error);
        } finally {
            setEditComplimentLoading(false);
        }
    };

    const handleDeleteCompliment = async (complimentId: number, contactId: number) => {
        try {
            const res = await fetch(`/api/rolodex/compliments?id=${complimentId}`, {
                method: "DELETE",
                credentials: "include",
            });

            if (!res.ok) {
                console.error("Error deleting compliment");
                return;
            }

            // Update local state
            setContacts((prev) =>
                prev.map((c) =>
                    c.id === contactId
                        ? { ...c, compliments: c.compliments.filter((comp) => comp.id !== complimentId) }
                        : c
                )
            );
        } catch (error) {
            console.error("Error deleting compliment:", error);
        }
    };

    const handleBoostImageFile = async (file: File) => {
        const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
        if (!allowedTypes.includes(file.type) || file.size > 5 * 1024 * 1024) return;
        const reader = new FileReader();
        reader.onload = (e) => setBoostImagePreview(e.target?.result as string);
        reader.readAsDataURL(file);
        setShowBoostAddForm(true);

        // Auto-extract compliment text via GPT-4o Vision
        setBoostExtracting(true);
        try {
            const formData = new FormData();
            formData.append("image", file);
            const res = await fetch("/api/rolodex/compliments/extract", {
                method: "POST",
                credentials: "include",
                body: formData,
            });
            if (res.ok) {
                const data = await res.json();
                if (data.compliments?.length > 0) {
                    setBoostNewCompliment(data.compliments.join(" "));
                }
                if (data.personName) {
                    setBoostNewSource(data.personName);
                }
                if (data.context) {
                    setBoostNewContext(data.context);
                }
            }
        } catch (error) {
            console.error("Error extracting compliment:", error);
        } finally {
            setBoostExtracting(false);
        }
    };

    const clearBoostForm = () => {
        setBoostNewCompliment("");
        setBoostNewSource("");
        setBoostNewContext("");
        setBoostImagePreview(null);
        setBoostExtracting(false);
        setShowBoostAddForm(false);
    };

    const handleAddStandaloneCompliment = async () => {
        if (!boostNewCompliment.trim()) return;

        setBoostAddLoading(true);
        try {
            const res = await fetch("/api/rolodex/compliments", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({
                    compliment: boostNewCompliment.trim(),
                    source_name: boostNewSource.trim() || null,
                    context: boostNewContext.trim() || null,
                }),
            });

            if (res.ok) {
                const data = await res.json();
                setStandaloneCompliments((prev) => [data.compliment, ...prev]);
                clearBoostForm();
            }
        } catch (error) {
            console.error("Error adding standalone compliment:", error);
        } finally {
            setBoostAddLoading(false);
        }
    };

    const handleDeleteStandaloneCompliment = async (complimentId: number) => {
        try {
            const res = await fetch(`/api/rolodex/compliments?id=${complimentId}`, {
                method: "DELETE",
                credentials: "include",
            });

            if (res.ok) {
                setStandaloneCompliments((prev) => prev.filter((c) => c.id !== complimentId));
            }
        } catch (error) {
            console.error("Error deleting standalone compliment:", error);
        }
    };

    const handleDeleteContact = async () => {
        if (!deleteConfirm) return;

        setDeleteLoading(true);
        try {
            const res = await fetch(`/api/rolodex/contacts?id=${deleteConfirm.id}`, {
                method: "DELETE",
                credentials: "include",
            });

            if (!res.ok) {
                console.error("Error deleting contact");
                return;
            }

            // Update local state
            setContacts((prev) => prev.filter((c) => c.id !== deleteConfirm.id));
            setSelectedContacts((prev) => {
                const next = new Set(prev);
                next.delete(deleteConfirm.id);
                return next;
            });
            setDeleteConfirm(null);
        } catch (error) {
            console.error("Error deleting contact:", error);
        } finally {
            setDeleteLoading(false);
        }
    };

    const handleToggleHidden = async (contactId: number, hidden: boolean) => {
        setTogglingHiddenFor(contactId);
        try {
            const res = await fetch("/api/rolodex/update", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ people_id: contactId, hidden }),
            });

            if (!res.ok) {
                console.error("Error toggling hidden status");
                return;
            }

            // Update local state
            setContacts((prev) =>
                prev.map((c) =>
                    c.id === contactId ? { ...c, hidden } : c
                )
            );
            // Clear selection and close profile panel if hiding
            if (hidden) {
                setSelectedContacts((prev) => {
                    const next = new Set(prev);
                    next.delete(contactId);
                    return next;
                });
                if (selectedContactId === contactId) {
                    setSelectedContactId(null);
                }
            }
            setContextMenu(null);
        } catch (error) {
            console.error("Error toggling hidden status:", error);
        } finally {
            setTogglingHiddenFor(null);
        }
    };

    // Mention system
    const mentionSuggestions = mentionQuery !== null
        ? contacts.filter((c) =>
            c.name.toLowerCase().includes(mentionQuery.toLowerCase())
        ).slice(0, 5)
        : [];

    // Edit mention suggestions
    const editMentionSuggestions = editMentionQuery !== null
        ? contacts.filter((c) =>
            c.name.toLowerCase().includes(editMentionQuery.toLowerCase())
        ).slice(0, 5)
        : [];

    const handleNoteInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const value = e.target.value;
        setNewNote(value);

        // Check for @ mentions
        const cursorPos = e.target.selectionStart || 0;
        const textBeforeCursor = value.slice(0, cursorPos);
        const mentionMatch = textBeforeCursor.match(/@(\w*)$/);

        if (mentionMatch) {
            setMentionQuery(mentionMatch[1]);
            setMentionIndex(0);

            // Position the dropdown
            if (noteInputRef.current) {
                const rect = noteInputRef.current.getBoundingClientRect();
                setMentionPosition({
                    top: rect.bottom + 4,
                    left: rect.left,
                });
            }
        } else {
            setMentionQuery(null);
            setMentionPosition(null);
        }
    };

    const insertMention = (contact: Contact) => {
        if (!noteInputRef.current) return;

        const cursorPos = noteInputRef.current.selectionStart || 0;
        const textBeforeCursor = newNote.slice(0, cursorPos);
        const textAfterCursor = newNote.slice(cursorPos);

        // Find where the @ starts
        const mentionStartMatch = textBeforeCursor.match(/@(\w*)$/);
        if (!mentionStartMatch) return;

        const mentionStart = cursorPos - mentionStartMatch[0].length;
        const beforeMention = newNote.slice(0, mentionStart);
        // Show clean @Name in input
        const displayText = `@${contact.name}`;

        const newValue = beforeMention + displayText + " " + textAfterCursor;
        setNewNote(newValue);

        // Track the mention for conversion when saving
        setPendingMentions((prev) => {
            const updated = new Map(prev);
            updated.set(contact.name, contact.id);
            return updated;
        });

        setMentionQuery(null);
        setMentionPosition(null);

        // Focus back on input
        setTimeout(() => {
            if (noteInputRef.current) {
                noteInputRef.current.focus();
                const newCursorPos = beforeMention.length + displayText.length + 1;
                noteInputRef.current.setSelectionRange(newCursorPos, newCursorPos);
            }
        }, 0);
    };

    const handleNoteKeyDown = (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        if (mentionQuery !== null && mentionSuggestions.length > 0) {
            if (e.key === "ArrowDown") {
                e.preventDefault();
                setMentionIndex((prev) => Math.min(prev + 1, mentionSuggestions.length - 1));
            } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setMentionIndex((prev) => Math.max(prev - 1, 0));
            } else if (e.key === "Enter" || e.key === "Tab") {
                e.preventDefault();
                insertMention(mentionSuggestions[mentionIndex]);
            } else if (e.key === "Escape") {
                setMentionQuery(null);
                setMentionPosition(null);
            }
        }
        // Note: Enter to submit is now handled in the textarea's onKeyDown
    };

    // Edit note mention handlers
    const handleEditNoteInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setEditNoteText(value);

        // Check for @ mentions
        const cursorPos = e.target.selectionStart || 0;
        const textBeforeCursor = value.slice(0, cursorPos);
        const mentionMatch = textBeforeCursor.match(/@(\w*)$/);

        if (mentionMatch) {
            setEditMentionQuery(mentionMatch[1]);
            setEditMentionIndex(0);

            // Position the dropdown
            if (editNoteInputRef.current) {
                const rect = editNoteInputRef.current.getBoundingClientRect();
                setEditMentionPosition({
                    top: rect.bottom + 4,
                    left: rect.left,
                });
            }
        } else {
            setEditMentionQuery(null);
            setEditMentionPosition(null);
        }
    };

    const insertEditMention = (contact: Contact) => {
        if (!editNoteInputRef.current) return;

        const cursorPos = editNoteInputRef.current.selectionStart || 0;
        const textBeforeCursor = editNoteText.slice(0, cursorPos);
        const textAfterCursor = editNoteText.slice(cursorPos);

        // Find where the @ starts
        const mentionStartMatch = textBeforeCursor.match(/@(\w*)$/);
        if (!mentionStartMatch) return;

        const mentionStart = cursorPos - mentionStartMatch[0].length;
        const beforeMention = editNoteText.slice(0, mentionStart);
        // Show clean @Name in input
        const displayText = `@${contact.name}`;

        const newValue = beforeMention + displayText + " " + textAfterCursor;
        setEditNoteText(newValue);

        // Track the mention for conversion when saving
        setEditPendingMentions((prev) => {
            const updated = new Map(prev);
            updated.set(contact.name, contact.id);
            return updated;
        });

        setEditMentionQuery(null);
        setEditMentionPosition(null);

        // Focus back on input
        setTimeout(() => {
            if (editNoteInputRef.current) {
                editNoteInputRef.current.focus();
                const newCursorPos = beforeMention.length + displayText.length + 1;
                editNoteInputRef.current.setSelectionRange(newCursorPos, newCursorPos);
            }
        }, 0);
    };

    const handleEditNoteKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, noteId: number, contactId: number) => {
        if (editMentionQuery !== null && editMentionSuggestions.length > 0) {
            if (e.key === "ArrowDown") {
                e.preventDefault();
                setEditMentionIndex((prev) => Math.min(prev + 1, editMentionSuggestions.length - 1));
            } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setEditMentionIndex((prev) => Math.max(prev - 1, 0));
            } else if (e.key === "Enter" || e.key === "Tab") {
                e.preventDefault();
                insertEditMention(editMentionSuggestions[editMentionIndex]);
            } else if (e.key === "Escape") {
                setEditMentionQuery(null);
                setEditMentionPosition(null);
            }
        } else if (e.key === "Enter" && editNoteText.trim()) {
            handleEditNote(noteId, contactId);
        } else if (e.key === "Escape") {
            setEditingNote(null);
            setEditNoteText("");
            setEditPendingMentions(new Map());
        }
    };

    // Initialize edit pending mentions from existing note text
    const initializeEditMentions = (noteText: string) => {
        const mentionRegex = /@\[([^\]]+)\]\((\d+)\)/g;
        const mentions = new Map<string, number>();
        let match;
        while ((match = mentionRegex.exec(noteText)) !== null) {
            mentions.set(match[1], parseInt(match[2], 10));
        }
        setEditPendingMentions(mentions);
    };

    const mentionSearchData = useMemo(() => {
        const nameToId = new Map(contacts.map((contact) => [contact.name, contact.id]));
        const escapedNames = contacts
            .map(c => c.name)
            .sort((a, b) => b.length - a.length)
            .map(n => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
            .join('|');
        const regex = escapedNames
            ? new RegExp(`@\\[([^\\]]+)\\]\\((\\d+)\\)|@(${escapedNames})(?![\\w])`, 'g')
            : /@\[([^\]]+)\]\((\d+)\)/g;

        return { nameToId, regex };
    }, [contacts]);

    // Parse and render note text with mentions
    const renderNoteWithMentions = useCallback((noteText: string) => {
        const mentionRegex = mentionSearchData.regex;
        mentionRegex.lastIndex = 0;
        const parts: React.ReactNode[] = [];
        let lastIndex = 0;
        let match;

        while ((match = mentionRegex.exec(noteText)) !== null) {
            // Add text before the mention
            if (match.index > lastIndex) {
                parts.push(noteText.slice(lastIndex, match.index));
            }

            let mentionName: string;
            let mentionId: number | null = null;

            if (match[1] && match[2]) {
                // @[Name](id) format
                mentionName = match[1];
                mentionId = parseInt(match[2], 10);
            } else if (match[3]) {
                // @Name format - look up the contact
                mentionName = match[3];
                mentionId = mentionSearchData.nameToId.get(mentionName) || null;
            } else {
                continue;
            }

            parts.push(
                <button
                    key={`${match.index}-${mentionId || mentionName}`}
                    onClick={(e) => {
                        e.stopPropagation();
                        if (mentionId) {
                            setSelectedContactId(mentionId);
                            const element = document.querySelector(`[data-contact-id="${mentionId}"]`);
                            element?.scrollIntoView({ behavior: "smooth", block: "center" });
                        }
                    }}
                    className="text-gray-700 dark:text-gray-400 font-medium hover:underline"
                >
                    {mentionName}
                </button>
            );

            lastIndex = match.index + match[0].length;
        }

        // Add remaining text
        if (lastIndex < noteText.length) {
            parts.push(noteText.slice(lastIndex));
        }

        return parts.length > 0 ? parts : noteText;
    }, [mentionSearchData]);

    const handleRowClick = useCallback((contactId: number, e: React.MouseEvent) => {
        // Multi-select with Cmd/Ctrl or Shift
        if (e.metaKey || e.ctrlKey) {
            e.preventDefault();
            setSelectedContacts((prev) => {
                const next = new Set(prev);
                if (next.has(contactId)) {
                    next.delete(contactId);
                } else {
                    next.add(contactId);
                }
                return next;
            });
        } else if (e.shiftKey && selectedContacts.size > 0) {
            // Shift-click for range select
            e.preventDefault();
            const lastSelected = Array.from(selectedContacts).pop()!;
            const lastIndex = contacts.findIndex(c => c.id === lastSelected);
            const currentIndex = contacts.findIndex(c => c.id === contactId);
            const start = Math.min(lastIndex, currentIndex);
            const end = Math.max(lastIndex, currentIndex);
            const rangeIds = contacts.slice(start, end + 1).map(c => c.id);
            setSelectedContacts(new Set([...Array.from(selectedContacts), ...rangeIds]));
        } else if (selectedContacts.size > 0) {
            // Clear selection on normal click if something is selected
            setSelectedContacts(new Set());
        } else {
            // Normal click - open profile panel (or switch to different contact)
            setSelectedContactId(contactId);
        }
    }, [contacts, selectedContacts]);

    const handleContextMenu = useCallback((contactId: number, e: React.MouseEvent) => {
        e.preventDefault();

        // If right-clicking on an unselected contact, select it
        if (!selectedContacts.has(contactId)) {
            setSelectedContacts(new Set([contactId]));
        }

        const menuWidth = 180;
        const menuHeight = 250;
        const x = Math.min(e.clientX, window.innerWidth - menuWidth - 8);
        const y = Math.min(e.clientY, window.innerHeight - menuHeight - 8);

        setContextMenu({
            x,
            y,
            contactId,
        });
    }, [selectedContacts]);

    const handleCreateList = async () => {
        if (!newListName.trim()) return;

        setCreatingList(true);
        try {
            const res = await fetch("/api/rolodex/lists", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ name: newListName.trim() }),
            });

            const data = await res.json();
            if (res.ok && data.list) {
                setLists((prev) => [...prev, data.list].sort((a, b) => a.name.localeCompare(b.name)));
                setNewListName("");
                setShowNewListInput(false);
            }
        } catch (error) {
            console.error("Error creating list:", error);
        } finally {
            setCreatingList(false);
        }
    };

    const handleDeleteList = (listId: number) => {
        // Cancel any existing pending delete and execute it immediately
        if (pendingListDeleteRef.current) {
            clearTimeout(pendingListDeleteRef.current.timeoutId);
            fetch(`/api/rolodex/lists?id=${pendingListDeleteRef.current.list.id}`, {
                method: "DELETE",
                credentials: "include",
            }).catch((err) => console.error("Error deleting list:", err));
            pendingListDeleteRef.current = null;
        }

        const listToDelete = lists.find((l) => l.id === listId);
        if (!listToDelete) return;

        // Optimistically remove
        setLists((prev) => prev.filter((l) => l.id !== listId));
        if (activeList === listId) {
            setActiveList("curated");
        }

        // Schedule actual delete after 5 seconds
        const timeoutId = setTimeout(async () => {
            try {
                await fetch(`/api/rolodex/lists?id=${listId}`, {
                    method: "DELETE",
                    credentials: "include",
                });
            } catch (error) {
                console.error("Error deleting list:", error);
            }
            pendingListDeleteRef.current = null;
        }, 5000);

        pendingListDeleteRef.current = { list: listToDelete, timeoutId };

        toast(`Deleted "${listToDelete.name}"`, {
            duration: 5000,
            action: {
                label: "Undo",
                onClick: () => {
                    if (pendingListDeleteRef.current?.list.id === listId) {
                        clearTimeout(pendingListDeleteRef.current.timeoutId);
                        setLists((prev) => [...prev, listToDelete].sort((a, b) => a.id - b.id));
                        pendingListDeleteRef.current = null;
                    }
                },
            },
        });
    };

    const handleUpdateListAppearance = async (listId: number, updates: { color?: string; emoji?: string }) => {
        // Optimistic update
        setLists((prev) =>
            prev.map((l) => (l.id === listId ? { ...l, ...updates, emoji: updates.emoji ?? l.emoji } : l))
        );

        try {
            await fetch("/api/rolodex/lists", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ id: listId, ...updates }),
            });
        } catch (error) {
            console.error("Error updating list appearance:", error);
        }
    };

    const handleRenameList = async (listId: number, name: string) => {
        if (!name.trim()) return;
        setLists((prev) => prev.map((l) => (l.id === listId ? { ...l, name: name.trim() } : l)));
        try {
            await fetch("/api/rolodex/lists", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ id: listId, name: name.trim() }),
            });
        } catch (error) {
            console.error("Error renaming list:", error);
        }
        setRenamingListId(null);
    };

    const handleToggleListPin = async (listId: number, pinned: boolean) => {
        // Optimistic update
        setLists((prev) =>
            prev.map((l) => (l.id === listId ? { ...l, pinned } : l))
        );

        try {
            const res = await fetch("/api/rolodex/lists", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ id: listId, pinned }),
            });

            if (!res.ok) {
                // Revert on error
                setLists((prev) =>
                    prev.map((l) => (l.id === listId ? { ...l, pinned: !pinned } : l))
                );
            }
        } catch (error) {
            console.error("Error toggling list pin:", error);
            // Revert on error
            setLists((prev) =>
                prev.map((l) => (l.id === listId ? { ...l, pinned: !pinned } : l))
            );
        }
    };

    const handleAddToList = async (listId: number, peopleId: number) => {
        try {
            const res = await fetch("/api/rolodex/lists/members", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ list_id: listId, people_id: peopleId }),
            });

            if (res.ok) {
                setLists((prev) =>
                    prev.map((l) =>
                        l.id === listId
                            ? {
                                ...l,
                                member_count: l.member_count + 1,
                                member_ids: [...l.member_ids, peopleId],
                            }
                            : l
                    )
                );
            }
        } catch (error) {
            console.error("Error adding to list:", error);
        }
    };

    const handleRemoveFromList = async (listId: number, peopleId: number) => {
        try {
            const res = await fetch(`/api/rolodex/lists/members?list_id=${listId}&people_id=${peopleId}`, {
                method: "DELETE",
                credentials: "include",
            });

            if (res.ok) {
                setLists((prev) =>
                    prev.map((l) =>
                        l.id === listId
                            ? {
                                ...l,
                                member_count: Math.max(0, l.member_count - 1),
                                member_ids: l.member_ids.filter((id) => id !== peopleId),
                            }
                            : l
                    )
                );
            }
        } catch (error) {
            console.error("Error removing from list:", error);
        }
    };

    const handleUpdateName = async (contactId: number) => {
        if (!editName.trim()) return;

        setEditNameLoading(true);

        try {
            const res = await fetch("/api/rolodex/update", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ people_id: contactId, name: editName.trim() }),
            });

            if (res.ok) {
                setContacts((prev) =>
                    prev.map((c) =>
                        c.id === contactId ? { ...c, name: editName.trim() } : c
                    )
                );
                setEditingNameFor(null);
                setEditName("");
            }
        } catch (error) {
            console.error("Error updating name:", error);
        } finally {
            setEditNameLoading(false);
        }
    };

    const handleUpdateBio = async (contactId: number) => {
        setEditBioLoading(true);

        try {
            const res = await fetch("/api/rolodex/update", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ people_id: contactId, custom_bio: editBio.trim() || null }),
            });

            if (res.ok) {
                setContacts((prev) =>
                    prev.map((c) =>
                        c.id === contactId ? { ...c, custom_bio: editBio.trim() || null } : c
                    )
                );
                setEditingBioFor(null);
                setEditBio("");
            }
        } catch (error) {
            console.error("Error updating bio:", error);
        } finally {
            setEditBioLoading(false);
        }
    };

    const handleUpdateLocation = async (contactId: number) => {
        setEditLocationLoading(true);

        try {
            const res = await fetch("/api/rolodex/update", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ people_id: contactId, custom_location: editLocation.trim() || null }),
            });

            if (res.ok) {
                const newLocation = editLocation.trim() || null;
                setContacts((prev) =>
                    prev.map((c) =>
                        c.id === contactId ? { ...c, custom_location: newLocation } : c
                    )
                );
                // Add to locations list if it's new
                if (newLocation && !allLocations.includes(newLocation)) {
                    setAllLocations(prev => [...prev, newLocation].sort((a, b) =>
                        a.toLowerCase().localeCompare(b.toLowerCase())
                    ));
                }
                setEditingLocationFor(null);
                setEditLocation("");
                setLocationSuggestionIndex(0);
            }
        } catch (error) {
            console.error("Error updating location:", error);
        } finally {
            setEditLocationLoading(false);
        }
    };

    const handleImageUpload = async (contactId: number, file: File) => {
        setUploadingImageFor(contactId);

        try {
            const croppedFile = await smartCropImageToSquare(file);
            const formData = new FormData();
            formData.append("file", croppedFile);
            formData.append("contactId", contactId.toString());

            const res = await fetch("/api/rolodex/contacts/image", {
                method: "POST",
                credentials: "include",
                body: formData,
            });

            const data = await res.json();

            if (!res.ok) {
                console.error("Error uploading image:", data.error);
                return;
            }

            // Update local state with the new custom profile image
            setContacts((prev) =>
                prev.map((c) =>
                    c.id === contactId
                        ? { ...c, custom_profile_image_url: data.url }
                        : c
                )
            );
        } catch (error) {
            console.error("Error uploading image:", error);
        } finally {
            setUploadingImageFor(null);
        }
    };

    // Detect link type from input
    const detectLinkType = (input: string): "x" | "linkedin" | "website" => {
        const trimmed = input.trim().toLowerCase();
        if (trimmed.includes("x.com") || trimmed.includes("twitter.com") || trimmed.startsWith("@")) {
            return "x";
        }
        if (trimmed.includes("linkedin.com")) {
            return "linkedin";
        }
        return "website";
    };

    const handleAddLink = async (contactId: number) => {
        if (!linkInput.trim()) return;

        const linkType = detectLinkType(linkInput);
        setLinkLoading(true);
        setLinkError(null);

        try {
            if (linkType === "x") {
                // Link X profile
                const res = await fetch("/api/rolodex/link-x", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    credentials: "include",
                    body: JSON.stringify({ people_id: contactId, handle: linkInput.trim() }),
                });

                const data = await res.json();

                if (!res.ok) {
                    setLinkError(data.error || "Failed to link X profile");
                    return;
                }

                setContacts((prev) =>
                    prev.map((c) =>
                        c.id === contactId
                            ? {
                                ...c,
                                x_profile: data.x_profile,
                                custom_profile_image_url: data.custom_profile_image_url || c.custom_profile_image_url,
                                name: data.x_profile.display_name || c.name,
                            }
                            : c
                    )
                );
            } else if (linkType === "linkedin") {
                // Link LinkedIn profile
                console.log("Linking LinkedIn for contact:", contactId, "URL:", linkInput.trim());
                const res = await fetch("/api/rolodex/link-linkedin", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    credentials: "include",
                    body: JSON.stringify({ people_id: contactId, linkedin_url: linkInput.trim() }),
                });

                const data = await res.json();
                console.log("LinkedIn link response:", res.status, data);

                if (!res.ok) {
                    const errorMsg = data.error || "Failed to link LinkedIn profile";
                    console.error("LinkedIn link error:", errorMsg);
                    setLinkError(errorMsg);
                    return;
                }

                console.log("Updating contact with LinkedIn profile:", data.linkedin_profile);
                setContacts((prev) =>
                    prev.map((c) =>
                        c.id === contactId
                            ? { ...c, linkedin_profile: data.linkedin_profile }
                            : c
                    )
                );
            } else {
                // Add personal website
                const res = await fetch("/api/rolodex/websites", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    credentials: "include",
                    body: JSON.stringify({ people_id: contactId, url: linkInput.trim() }),
                });

                if (!res.ok) {
                    const data = await res.json();
                    setLinkError(data.error || "Failed to add website");
                    return;
                }

                const data = await res.json();
                setContacts((prev) =>
                    prev.map((c) =>
                        c.id === contactId
                            ? { ...c, websites: [...c.websites, data.website] }
                            : c
                    )
                );

                // Analyze the website in the background to extract facts
                fetch("/api/rolodex/analyze-website", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    credentials: "include",
                    body: JSON.stringify({
                        website_url: linkInput.trim(),
                        people_id: contactId,
                        auto_add_notes: true,
                    }),
                }).then(async (analyzeRes) => {
                    if (analyzeRes.ok) {
                        const analyzeData = await analyzeRes.json();
                        if (analyzeData.notesAdded > 0) {
                            // Refresh contacts to get the new notes
                            const refreshRes = await fetch("/api/rolodex/contacts", {
                                credentials: "include",
                            });
                            if (refreshRes.ok) {
                                const refreshData = await refreshRes.json();
                                setContacts(refreshData.contacts || []);
                            }
                        }
                    }
                }).catch(console.error);
            }

            setAddingLinkFor(null);
            setLinkInput("");
        } catch (error) {
            setLinkError("Network error. Please try again.");
        } finally {
            setLinkLoading(false);
        }
    };

    // Add contact info (phone/email)
    const handleAddContactInfo = async (contactId: number) => {
        if (!contactInfoValue.trim()) return;

        setContactInfoLoading(true);
        try {
            const res = await fetch("/api/rolodex/contact-info", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({
                    people_id: contactId,
                    type: contactInfoType,
                    value: contactInfoValue.trim(),
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                console.error("Error adding contact info:", data.error);
                return;
            }

            // Update local state
            setContacts(prev => prev.map(c =>
                c.id === contactId
                    ? { ...c, contact_info: [...(c.contact_info || []), data.contact_info] }
                    : c
            ));

            setAddingContactInfoFor(null);
            setContactInfoValue("");
            setContactInfoType('phone');
        } catch (error) {
            console.error("Error adding contact info:", error);
        } finally {
            setContactInfoLoading(false);
        }
    };

    // Delete contact info
    const handleDeleteContactInfo = async (infoId: number, contactId: number) => {
        try {
            const res = await fetch(`/api/rolodex/contact-info?id=${infoId}`, {
                method: "DELETE",
                credentials: "include",
            });

            if (res.ok) {
                setContacts(prev => prev.map(c =>
                    c.id === contactId
                        ? { ...c, contact_info: (c.contact_info || []).filter(i => i.id !== infoId) }
                        : c
                ));
            }
        } catch (error) {
            console.error("Error deleting contact info:", error);
        }
    };

    // Toggle iMessages visibility for a contact
    const toggleMessagesForContact = async (contactId: number) => {
        const newShowMessages = new Set(showMessagesFor);
        
        if (newShowMessages.has(contactId)) {
            // Hide messages
            newShowMessages.delete(contactId);
            setShowMessagesFor(newShowMessages);
        } else {
            // Show messages - fetch if not already loaded
            newShowMessages.add(contactId);
            setShowMessagesFor(newShowMessages);
            
            if (!contactMessages[contactId]) {
                setLoadingMessagesFor(contactId);
                try {
                    const res = await fetch(`/api/rolodex/imessages?people_id=${contactId}&limit=100`, {
                        credentials: "include",
                    });
                    if (res.ok) {
                        const { messages } = await res.json();
                        setContactMessages(prev => ({ ...prev, [contactId]: messages || [] }));
                    }
                } catch (error) {
                    console.error("Error fetching messages:", error);
                } finally {
                    setLoadingMessagesFor(null);
                }
            }
        }
    };

    // Discovery - fetch top interactions for a username
    const handleDiscoverySearch = async () => {
        if (!discoveryUsername.trim()) return;

        setDiscoveryLoading(true);
        setDiscoveryError(null);
        setDiscoveryResult(null);

        try {
            const res = await fetch(
                `/api/x/top-interactions?username=${encodeURIComponent(discoveryUsername.trim().replace(/^@/, ""))}`,
                { credentials: "include" }
            );

            const data = await res.json();

            if (!res.ok) {
                setDiscoveryError(data.error || "Failed to fetch interactions");
                return;
            }

            setDiscoveryResult(data);
        } catch (error) {
            setDiscoveryError("Network error. Please try again.");
        } finally {
            setDiscoveryLoading(false);
        }
    };

    // Add a discovered person to the rolodex
    const handleAddFromDiscovery = async (username: string) => {
        try {
            const res = await fetch("/api/rolodex/contacts", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ handle: username }),
            });

            const data = await res.json();

            if (res.ok && data.contact) {
                setContacts((prev) => [data.contact, ...prev]);
            }
        } catch (error) {
            console.error("Error adding contact from discovery:", error);
        }
    };

    const handleMerge = async () => {
        if (selectedContacts.size !== 2) return;

        const [first, second] = Array.from(selectedContacts);
        const firstContact = contacts.find(c => c.id === first);
        const secondContact = contacts.find(c => c.id === second);

        if (!firstContact || !secondContact) return;

        // Prefer the one with X profile as the keeper
        let keepId: number, mergeId: number;
        if (firstContact.x_profile && !secondContact.x_profile) {
            keepId = first;
            mergeId = second;
        } else if (secondContact.x_profile && !firstContact.x_profile) {
            keepId = second;
            mergeId = first;
        } else {
            // Both have or neither have X profile - use first selected
            keepId = first;
            mergeId = second;
        }

        setMerging(true);
        setContextMenu(null);

        try {
            const res = await fetch("/api/rolodex/merge", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ keep_id: keepId, merge_id: mergeId }),
            });

            if (res.ok) {
                // Refresh contacts
                await fetchContacts();
                setSelectedContacts(new Set());
            } else {
                const data = await res.json();
                alert(data.error || "Merge failed");
            }
        } catch (error) {
            console.error("Error merging:", error);
            alert("Merge failed");
        } finally {
            setMerging(false);
        }
    };

    if (authLoading || !authenticated || loading) {
        return (
            <div className="h-screen bg-white dark:bg-black flex items-center justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
            </div>
        );
    }

    return (
        <div className="min-h-full bg-white dark:bg-black safe-area-inset">
            {/* Command+K Search Modal */}
            {showCommandSearch && (
                <CommandSearchModal
                    commandSearchQuery={commandSearchQuery}
                    setCommandSearchQuery={setCommandSearchQuery}
                    commandSearchIndex={commandSearchIndex}
                    setCommandSearchIndex={setCommandSearchIndex}
                    commandSearchResults={commandSearchResults}
                    semanticSearchResults={semanticSearchResults}
                    semanticSearchLoading={semanticSearchLoading}
                    searchResultCount={commandSearchResultCount}
                    creatingSearchList={creatingSearchList}
                    contacts={contacts}
                    onSelect={handleCommandSearchSelect}
                    onCreateListFromResults={handleCreateListFromCommandSearch}
                    onClose={() => {
                        setShowCommandSearch(false);
                        setCommandSearchQuery("");
                        setCommandSearchIndex(0);
                    }}
                />
            )}

            {/* Context Menu */}
            {contextMenu && (
                <div
                    className="fixed z-50 bg-white dark:bg-gray-900 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 py-1 min-w-[180px]"
                    style={{ left: contextMenu.x, top: contextMenu.y }}
                    onClick={(e) => e.stopPropagation()}
                >
                    {selectedContacts.size === 1 && (
                        <button
                            onClick={() => {
                                const contactId = Array.from(selectedContacts)[0];
                                const contact = contacts.find((c) => c.id === contactId);
                                if (contact) {
                                    setAddTodoForContact({ id: contact.id, name: contact.name });
                                    setShowAddTodoModal(true);
                                }
                                setContextMenu(null);
                            }}
                            className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-2"
                        >
                            <CheckCircle2 className="h-4 w-4" />
                            Add To Do
                        </button>
                    )}
                    {selectedContacts.size === 2 && (
                        <button
                            onClick={handleMerge}
                            disabled={merging}
                            className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-2"
                        >
                            {merging ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <Merge className="h-4 w-4" />
                            )}
                            Merge contacts
                        </button>
                    )}
                    {selectedContacts.size >= 1 && typeof activeList === "number" && (() => {
                        const currentList = lists.find((list) => list.id === activeList);
                        if (!currentList) return null;

                        const selectedIds = Array.from(selectedContacts);
                        const removableIds = selectedIds.filter((id) => currentList.member_ids.includes(id));
                        if (removableIds.length === 0) return null;

                        return (
                            <button
                                onClick={() => {
                                    removableIds.forEach((id) => handleRemoveFromList(currentList.id, id));
                                    setContextMenu(null);
                                    setShowListSubmenu(false);
                                }}
                                className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-2"
                            >
                                <X className="h-4 w-4" />
                                <span className="truncate">
                                    {removableIds.length === 1
                                        ? `Remove from ${currentList.name}`
                                        : `Remove ${removableIds.length} from ${currentList.name}`}
                                </span>
                            </button>
                        );
                    })()}
                    {/* Add to list - submenu (flyout on desktop, inline on mobile) */}
                    {selectedContacts.size >= 1 && lists.length > 0 && (
                        <>
                            {selectedContacts.size === 2 && <div className="border-t border-gray-100 dark:border-gray-800 my-1" />}
                            <div className="relative group/list">
                                <button
                                    onClick={() => setShowListSubmenu(!showListSubmenu)}
                                    className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-2"
                                >
                                    <Plus className="h-4 w-4" />
                                    <span className="flex-1">Add to list</span>
                                    <ChevronRight className={`h-3.5 w-3.5 text-gray-400 transition-transform md:transition-none ${showListSubmenu ? "rotate-90 md:rotate-0" : ""}`} />
                                </button>
                                {/* Invisible bridge so cursor can travel to submenu (desktop only) */}
                                <div className="hidden md:invisible md:group-hover/list:visible md:block absolute left-full top-0 w-2 h-full" />
                                {/* Desktop: flyout submenu on hover */}
                                <div className="hidden md:invisible md:group-hover/list:visible md:block absolute left-full top-0 -mt-1 ml-1.5 bg-white dark:bg-gray-900 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 py-1 min-w-[180px] max-h-64 overflow-y-auto">
                                    {lists.map((list) => {
                                        const selectedIds = Array.from(selectedContacts);
                                        const allInList = selectedIds.every((id) => list.member_ids.includes(id));
                                        const someInList = selectedIds.some((id) => list.member_ids.includes(id));

                                        return (
                                            <button
                                                key={list.id}
                                                onClick={() => {
                                                    selectedIds.forEach((id) => {
                                                        if (allInList) {
                                                            handleRemoveFromList(list.id, id);
                                                        } else if (!list.member_ids.includes(id)) {
                                                            handleAddToList(list.id, id);
                                                        }
                                                    });
                                                    setContextMenu(null);
                                                    setShowListSubmenu(false);
                                                }}
                                                className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-2"
                                            >
                                                {list.emoji ? (
                                                    <span className="text-sm flex-shrink-0">{list.emoji}</span>
                                                ) : (
                                                    <div
                                                        className="w-3 h-3 rounded-full flex-shrink-0"
                                                        style={{ backgroundColor: list.color }}
                                                    />
                                                )}
                                                <span className="flex-1 truncate">{list.name}</span>
                                                {allInList && <Check className="h-3.5 w-3.5 text-green-500" />}
                                                {someInList && !allInList && <span className="text-xs text-gray-400">partial</span>}
                                            </button>
                                        );
                                    })}
                                </div>
                                {/* Mobile: inline list on click */}
                                {showListSubmenu && (
                                    <div className="md:hidden max-h-48 overflow-y-auto">
                                        {lists.map((list) => {
                                            const selectedIds = Array.from(selectedContacts);
                                            const allInList = selectedIds.every((id) => list.member_ids.includes(id));
                                            const someInList = selectedIds.some((id) => list.member_ids.includes(id));

                                            return (
                                                <button
                                                    key={list.id}
                                                    onClick={() => {
                                                        selectedIds.forEach((id) => {
                                                            if (allInList) {
                                                                handleRemoveFromList(list.id, id);
                                                            } else if (!list.member_ids.includes(id)) {
                                                                handleAddToList(list.id, id);
                                                            }
                                                        });
                                                        setContextMenu(null);
                                                        setShowListSubmenu(false);
                                                    }}
                                                    className="w-full pl-10 pr-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-2"
                                                >
                                                    {list.emoji ? (
                                                        <span className="text-sm flex-shrink-0">{list.emoji}</span>
                                                    ) : (
                                                        <div
                                                            className="w-3 h-3 rounded-full flex-shrink-0"
                                                            style={{ backgroundColor: list.color }}
                                                        />
                                                    )}
                                                    <span className="flex-1 truncate">{list.name}</span>
                                                    {allInList && <Check className="h-3.5 w-3.5 text-green-500" />}
                                                    {someInList && !allInList && <span className="text-xs text-gray-400">partial</span>}
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </>
                    )}

                    {/* Hide/Unhide option */}
                    {selectedContacts.size === 1 && (
                        <>
                            <div className="border-t border-gray-100 dark:border-gray-800 my-1" />
                            {(() => {
                                const contactId = Array.from(selectedContacts)[0];
                                const contact = contacts.find((c) => c.id === contactId);
                                const isHidden = contact?.hidden || false;
                                return (
                                    <button
                                        onClick={() => handleToggleHidden(contactId, !isHidden)}
                                        disabled={togglingHiddenFor === contactId}
                                        className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-2"
                                    >
                                        {togglingHiddenFor === contactId ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : isHidden ? (
                                            <Eye className="h-4 w-4" />
                                        ) : (
                                            <EyeOff className="h-4 w-4" />
                                        )}
                                        {isHidden ? "Unhide contact" : "Hide contact"}
                                    </button>
                                );
                            })()}
                        </>
                    )}

                    {/* Delete option */}
                    {selectedContacts.size === 1 && (
                        <>
                            <div className="border-t border-gray-100 dark:border-gray-800 my-1" />
                            <button
                                onClick={() => {
                                    const contactId = Array.from(selectedContacts)[0];
                                    const contact = contacts.find((c) => c.id === contactId);
                                    if (contact) {
                                        setDeleteConfirm({ id: contact.id, name: contact.name });
                                    }
                                    setContextMenu(null);
                                }}
                                className="w-full px-4 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
                            >
                                <Trash2 className="h-4 w-4" />
                                Delete contact
                            </button>
                        </>
                    )}
                </div>
            )}


            {/* List Context Menu */}
            {listContextMenu && (() => {
                const list = lists.find(l => l.id === listContextMenu.listId);
                if (!list) return null;
                return (
                    <>
                        <div className="fixed inset-0 z-40" onClick={() => setListContextMenu(null)} />
                        <div
                            className="fixed z-50 bg-white dark:bg-gray-900 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 py-1 min-w-[180px]"
                            style={{ left: listContextMenu.x, top: listContextMenu.y }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <button
                                onClick={() => {
                                    setRenamingListId(list.id);
                                    setRenameListValue(list.name);
                                    setListContextMenu(null);
                                }}
                                className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-2"
                            >
                                <Pencil className="h-4 w-4" />
                                Rename
                            </button>
                            <button
                                onClick={() => {
                                    setListPickerOpen(list.id);
                                    setListContextMenu(null);
                                }}
                                className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-2"
                            >
                                <Palette className="h-4 w-4" />
                                Change icon
                            </button>
                            <button
                                onClick={() => {
                                    handleToggleListPin(list.id, !list.pinned);
                                    setListContextMenu(null);
                                }}
                                className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-2"
                            >
                                {list.pinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
                                {list.pinned ? "Unpin" : "Pin to sidebar"}
                            </button>
                            <div className="border-t border-gray-200 dark:border-gray-700 my-1" />
                            <button
                                onClick={() => {
                                    handleDeleteList(list.id);
                                    setListContextMenu(null);
                                }}
                                className="w-full px-4 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
                            >
                                <Trash2 className="h-4 w-4" />
                                Delete list
                            </button>
                        </div>
                    </>
                );
            })()}

            {/* Delete Confirmation Modal */}
            {deleteConfirm && (
                <div
                    className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
                    onClick={() => setDeleteConfirm(null)}
                >
                    <div
                        className="bg-white dark:bg-gray-900 rounded-xl w-full max-w-sm p-6 shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                            Delete contact
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                            Are you sure you want to delete <span className="font-medium text-gray-900 dark:text-white">{deleteConfirm.name}</span>? This action cannot be undone.
                        </p>
                        <div className="flex gap-3 justify-end">
                            <button
                                onClick={() => setDeleteConfirm(null)}
                                disabled={deleteLoading}
                                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDeleteContact}
                                disabled={deleteLoading}
                                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:bg-red-400 rounded-lg transition-colors flex items-center gap-2"
                            >
                                {deleteLoading ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <Trash2 className="h-4 w-4" />
                                )}
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Add Contact Modal */}
            {showAddModal && (
                <AddContactModal
                    addMode={addMode}
                    setAddMode={setAddMode}
                    addHandle={addHandle}
                    setAddHandle={setAddHandle}
                    addName={addName}
                    setAddName={setAddName}
                    addLoading={addLoading}
                    addError={addError}
                    setAddError={setAddError}
                    onSubmit={handleAddContact}
                    onClose={() => setShowAddModal(false)}
                />
            )}

            {/* Todo Sheet */}
            <TodoSheet
                showTodoSheet={showTodoSheet}
                setShowTodoSheet={setShowTodoSheet}
                loading={loading}
                todos={todos}
                contacts={contacts}
                todoNameSearch={todoNameSearch}
                setTodoNameSearch={setTodoNameSearch}
                showTodoNameDropdown={showTodoNameDropdown}
                setShowTodoNameDropdown={setShowTodoNameDropdown}
                todoNameFilter={todoNameFilter}
                setTodoNameFilter={setTodoNameFilter}
                todoDueDateFilter={todoDueDateFilter}
                setTodoDueDateFilter={setTodoDueDateFilter}
                editingTodoId={editingTodoId}
                setEditingTodoId={setEditingTodoId}
                editingTodoDueDate={editingTodoDueDate}
                setEditingTodoDueDate={setEditingTodoDueDate}
                completedTodosExpanded={completedTodosExpanded}
                setCompletedTodosExpanded={setCompletedTodosExpanded}
                todoNameSearchRef={todoNameSearchRef}
                onToggleTodoComplete={toggleTodoComplete}
                onDeleteTodo={deleteTodo}
                onUpdateTodoDueDate={updateTodoDueDate}
                onNavigateToContact={(contactId) => {
                    setShowTodoSheet(false);
                    setTimeout(() => {
                        setSelectedContactId(contactId);
                        const element = document.querySelector(`[data-contact-id="${contactId}"]`);
                        element?.scrollIntoView({ behavior: "smooth", block: "center" });
                    }, 300);
                }}
                filteredTodos={filteredTodos}
                activeTodos={activeTodos}
                completedTodos={completedTodos}
                formatDueDate={formatDueDate}
                isDueOverdue={isDueOverdue}
            />

            {/* Boost (Compliments) Sheet */}
            <Sheet open={showBoostSheet && !loading} onOpenChange={(open) => { setShowBoostSheet(open); if (!open) clearBoostForm(); }}>
                <SheetHeader>
                    <SheetTitle className="flex items-center gap-2">
                        <button
                            onClick={() => setShowBoostSheet(false)}
                            className="p-1 -ml-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                            aria-label="Collapse panel"
                        >
                            <PanelRightClose className="h-5 w-5" />
                        </button>
                        <Sparkles className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                        Confidence Boost
                        <button
                            onClick={() => showBoostAddForm ? clearBoostForm() : setShowBoostAddForm(true)}
                            className="ml-auto p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                            aria-label="Add compliment"
                        >
                            {showBoostAddForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                        </button>
                    </SheetTitle>
                    <SheetDescription>
                        {contacts.reduce((sum, c) => sum + c.compliments.length, 0) + standaloneCompliments.length} compliments collected
                    </SheetDescription>
                </SheetHeader>
                <SheetContent className="p-4">
                  <div
                    className="relative"
                    onPaste={(e) => {
                        const items = e.clipboardData?.items;
                        if (!items) return;
                        for (const item of Array.from(items)) {
                            if (item.type.startsWith("image/")) {
                                e.preventDefault();
                                const file = item.getAsFile();
                                if (file) handleBoostImageFile(file);
                                return;
                            }
                        }
                    }}
                    onDragOver={(e) => {
                        e.preventDefault();
                        setBoostDragOver(true);
                    }}
                    onDragLeave={(e) => {
                        e.preventDefault();
                        setBoostDragOver(false);
                    }}
                    onDrop={(e) => {
                        e.preventDefault();
                        setBoostDragOver(false);
                        const file = e.dataTransfer?.files?.[0];
                        if (file && file.type.startsWith("image/")) {
                            handleBoostImageFile(file);
                        }
                    }}
                  >
                    {/* Drag overlay */}
                    {boostDragOver && (
                        <div className="absolute inset-0 z-50 bg-brand-orange/10 border-2 border-dashed border-brand-orange rounded-xl flex items-center justify-center pointer-events-none">
                            <div className="text-center">
                                <ImagePlus className="h-8 w-8 text-brand-orange mx-auto mb-2" />
                                <p className="text-sm font-medium text-brand-orange">Drop screenshot here</p>
                            </div>
                        </div>
                    )}

                    {/* Add compliment form */}
                    {showBoostAddForm && (
                        <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl space-y-2">
                            {/* Image preview / drop zone */}
                            {boostImagePreview ? (
                                <div className="relative">
                                    <Image
                                        src={boostImagePreview}
                                        alt="Screenshot preview"
                                        width={640}
                                        height={360}
                                        unoptimized
                                        className={`w-full rounded-lg border border-gray-200 dark:border-gray-700 transition-opacity ${boostExtracting ? "opacity-60" : ""}`}
                                    />
                                    {boostExtracting && (
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <div className="flex items-center gap-2 bg-black/60 text-white text-xs px-3 py-1.5 rounded-full">
                                                <Loader2 className="h-3 w-3 animate-spin" />
                                                Extracting text...
                                            </div>
                                        </div>
                                    )}
                                    <button
                                        onClick={() => setBoostImagePreview(null)}
                                        className="absolute top-1.5 right-1.5 p-1 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
                                    >
                                        <X className="h-3 w-3" />
                                    </button>
                                </div>
                            ) : (
                                <label className="flex flex-col items-center justify-center py-4 border border-dashed border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:border-brand-orange/50 hover:bg-gray-100/50 dark:hover:bg-gray-700/30 transition-colors">
                                    <ImagePlus className="h-5 w-5 text-gray-400 mb-1" />
                                    <span className="text-xs text-gray-400">Drop, paste, or click to add screenshot</span>
                                    <input
                                        type="file"
                                        accept="image/jpeg,image/png,image/webp,image/gif"
                                        className="hidden"
                                        onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file) handleBoostImageFile(file);
                                            e.target.value = "";
                                        }}
                                    />
                                </label>
                            )}
                            <input
                                type="text"
                                placeholder="Quote text (optional with screenshot)"
                                value={boostNewCompliment}
                                onChange={(e) => setBoostNewCompliment(e.target.value)}
                                className="w-full text-sm px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-brand-orange/50"
                            />
                            <input
                                type="text"
                                placeholder="From (optional)"
                                value={boostNewSource}
                                onChange={(e) => setBoostNewSource(e.target.value)}
                                className="w-full text-sm px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-brand-orange/50"
                            />
                            <input
                                type="text"
                                placeholder="Context (optional)"
                                value={boostNewContext}
                                onChange={(e) => setBoostNewContext(e.target.value)}
                                className="w-full text-sm px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-brand-orange/50"
                            />
                            <div className="flex justify-end gap-2">
                                <button
                                    onClick={clearBoostForm}
                                    className="text-xs px-3 py-1.5 rounded-lg text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleAddStandaloneCompliment}
                                    disabled={!boostNewCompliment.trim() || boostAddLoading || boostExtracting}
                                    className="text-xs px-3 py-1.5 rounded-lg bg-brand-orange text-white hover:bg-brand-orange-dark transition-colors disabled:opacity-40"
                                >
                                    {boostAddLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : "Add"}
                                </button>
                            </div>
                        </div>
                    )}

                    {(() => {
                        // Collect contact-linked compliments
                        const contactCompliments = contacts.flatMap(contact =>
                            contact.compliments.map(comp => ({
                                id: comp.id,
                                compliment: comp.compliment,
                                context: comp.context,
                                received_at: comp.received_at,
                                created_at: comp.created_at,
                                sourceName: contact.name,
                                contactId: contact.id as number | null,
                                profileImage: contact.custom_profile_image_url || contact.x_profile?.profile_image_url || contact.linkedin_profile?.profile_image_url || null,
                            }))
                        );

                        // Collect standalone compliments
                        const standaloneItems = standaloneCompliments.map(comp => ({
                            id: comp.id,
                            compliment: comp.compliment,
                            context: comp.context,
                            received_at: comp.received_at,
                            created_at: comp.created_at,
                            sourceName: comp.source_name || null,
                            contactId: null as number | null,
                            profileImage: null as string | null,
                        }));

                        // Merge and sort by date
                        const allCompliments = [...contactCompliments, ...standaloneItems]
                            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

                        if (allCompliments.length === 0 && !showBoostAddForm) {
                            return (
                                <div className="flex flex-col items-center justify-center py-12 text-center">
                                    <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
                                        <Sparkles className="h-8 w-8 text-gray-400 dark:text-gray-500" />
                                    </div>
                                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                                        No compliments yet
                                    </h3>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 max-w-[240px]">
                                        Paste a screenshot or type kind words people have said to you.
                                    </p>
                                </div>
                            );
                        }

                        return (
                            <div className="space-y-3">
                                {allCompliments.map(comp => (
                                    <div
                                        key={`${comp.contactId ? 'c' : 's'}-${comp.id}`}
                                        className="group bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                                        onClick={() => {
                                            if (comp.contactId) {
                                                setShowBoostSheet(false);
                                                setTimeout(() => {
                                                    setSelectedContactId(comp.contactId!);
                                                }, 150);
                                            }
                                        }}
                                    >
                                        <div className="flex items-start gap-3">
                                            {comp.sourceName && (
                                                comp.profileImage ? (
                                                    <Image
                                                        src={comp.profileImage}
                                                        alt={comp.sourceName}
                                                        width={36}
                                                        height={36}
                                                        unoptimized
                                                        className="rounded-full flex-shrink-0"
                                                    />
                                                ) : (
                                                    <div className="w-9 h-9 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
                                                        <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                                                            {comp.sourceName.charAt(0).toUpperCase()}
                                                        </span>
                                                    </div>
                                                )
                                            )}
                                            <div className="flex-1 min-w-0">
                                                {comp.sourceName && (
                                                    <p className="text-sm font-medium text-gray-900 dark:text-white mb-0.5">
                                                        {comp.sourceName}
                                                    </p>
                                                )}
                                                {comp.compliment && (
                                                    <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                                                        &ldquo;{comp.compliment}&rdquo;
                                                    </p>
                                                )}
                                                <div className="flex items-center gap-2 mt-2">
                                                    {comp.context && (
                                                        <span className="text-xs text-gray-600 dark:text-gray-400 bg-gray-200/70 dark:bg-gray-700/50 px-2 py-0.5 rounded-full">
                                                            {comp.context}
                                                        </span>
                                                    )}
                                                    <span className="text-xs text-gray-400 dark:text-gray-500">
                                                        {new Date(comp.received_at || comp.created_at).toLocaleDateString("en-US", {
                                                            month: "short",
                                                            day: "numeric",
                                                            year: new Date(comp.received_at || comp.created_at).getFullYear() !== new Date().getFullYear() ? "numeric" : undefined,
                                                        })}
                                                    </span>
                                                    {!comp.contactId && (
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleDeleteStandaloneCompliment(comp.id);
                                                            }}
                                                            className="ml-auto opacity-0 group-hover:opacity-100 p-1 rounded text-gray-400 hover:text-red-500 transition-all"
                                                            aria-label="Delete compliment"
                                                        >
                                                            <Trash2 className="h-3 w-3" />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        );
                    })()}
                  </div>
                </SheetContent>
            </Sheet>

            {/* Contact Profile Sheet */}
            <ProfilePanel
                selectedContactId={selectedContactId}
                contacts={contacts}
                lists={lists}
                allLocations={allLocations}
                contactMessages={contactMessages}
                profilePanelExpanded={profilePanelExpanded}
                setProfilePanelExpanded={setProfilePanelExpanded}
                profilePanelTab={profilePanelTab}
                setProfilePanelTab={setProfilePanelTab}
                profileMenuOpen={profileMenuOpen}
                setProfileMenuOpen={setProfileMenuOpen}
                editingNameFor={editingNameFor}
                setEditingNameFor={setEditingNameFor}
                editName={editName}
                setEditName={setEditName}
                editNameLoading={editNameLoading}
                editingBioFor={editingBioFor}
                setEditingBioFor={setEditingBioFor}
                editBio={editBio}
                setEditBio={setEditBio}
                editBioLoading={editBioLoading}
                editingLocationFor={editingLocationFor}
                setEditingLocationFor={setEditingLocationFor}
                editLocation={editLocation}
                setEditLocation={setEditLocation}
                editLocationLoading={editLocationLoading}
                locationSuggestionIndex={locationSuggestionIndex}
                setLocationSuggestionIndex={setLocationSuggestionIndex}
                newNote={newNote}
                setNewNote={setNewNote}
                addingNoteFor={addingNoteFor}
                setAddingNoteFor={setAddingNoteFor}
                savingNote={savingNote}
                editingNote={editingNote}
                setEditingNote={setEditingNote}
                editNoteText={editNoteText}
                setEditNoteText={setEditNoteText}
                editNoteLoading={editNoteLoading}
                editingNoteDate={editingNoteDate}
                setEditingNoteDate={setEditingNoteDate}
                editNoteDateLoading={editNoteDateLoading}
                mentionQuery={mentionQuery}
                mentionPosition={mentionPosition}
                mentionIndex={mentionIndex}
                setMentionIndex={setMentionIndex}
                pendingMentions={pendingMentions}
                editMentionQuery={editMentionQuery}
                editMentionPosition={editMentionPosition}
                editMentionIndex={editMentionIndex}
                setEditMentionIndex={setEditMentionIndex}
                editPendingMentions={editPendingMentions}
                noteInputRef={noteInputRef}
                editNoteInputRef={editNoteInputRef}
                mentionSuggestions={mentionSuggestions}
                editMentionSuggestions={editMentionSuggestions}
                newCompliment={newCompliment}
                setNewCompliment={setNewCompliment}
                newComplimentContext={newComplimentContext}
                setNewComplimentContext={setNewComplimentContext}
                showComplimentInput={showComplimentInput}
                setShowComplimentInput={setShowComplimentInput}
                addingComplimentFor={addingComplimentFor}
                editingCompliment={editingCompliment}
                setEditingCompliment={setEditingCompliment}
                editComplimentText={editComplimentText}
                setEditComplimentText={setEditComplimentText}
                editComplimentContext={editComplimentContext}
                setEditComplimentContext={setEditComplimentContext}
                editComplimentLoading={editComplimentLoading}
                addingLinkFor={addingLinkFor}
                setAddingLinkFor={setAddingLinkFor}
                linkInput={linkInput}
                setLinkInput={setLinkInput}
                linkLoading={linkLoading}
                linkError={linkError}
                addingContactInfoFor={addingContactInfoFor}
                setAddingContactInfoFor={setAddingContactInfoFor}
                contactInfoType={contactInfoType}
                setContactInfoType={setContactInfoType}
                contactInfoValue={contactInfoValue}
                setContactInfoValue={setContactInfoValue}
                contactInfoLoading={contactInfoLoading}
                uploadingImageFor={uploadingImageFor}
                hoveringAvatarFor={hoveringAvatarFor}
                setHoveringAvatarFor={setHoveringAvatarFor}
                imageInputRef={imageInputRef}
                showListDropdownFor={showListDropdownFor}
                setShowListDropdownFor={setShowListDropdownFor}
                loadingMessagesFor={loadingMessagesFor}
                generatingSummaryFor={generatingSummaryFor}
                showMessagesFor={showMessagesFor}
                onClose={() => {
                    setSelectedContactId(null);
                    setShowListDropdownFor(null);
                    setProfilePanelExpanded(false);
                    setEditingNoteDate(null);
                    setProfilePanelTab("overview");
                    setProfileMenuOpen(false);
                }}
                handleUpdateName={handleUpdateName}
                handleUpdateBio={handleUpdateBio}
                handleUpdateLocation={handleUpdateLocation}
                handleAddNote={handleAddNote}
                handleEditNote={handleEditNote}
                handleDeleteNote={handleDeleteNote}
                handleUpdateNoteDate={handleUpdateNoteDate}
                handleAddCompliment={handleAddCompliment}
                handleEditCompliment={handleEditCompliment}
                handleDeleteCompliment={handleDeleteCompliment}
                handleAddLink={handleAddLink}
                handleAddContactInfo={handleAddContactInfo}
                handleDeleteContactInfo={handleDeleteContactInfo}
                handleAddToList={handleAddToList}
                handleRemoveFromList={handleRemoveFromList}
                handleNoteInputChange={handleNoteInputChange}
                handleEditNoteInputChange={handleEditNoteInputChange}
                handleNoteKeyDown={handleNoteKeyDown}
                handleEditNoteKeyDown={handleEditNoteKeyDown}
                insertMention={insertMention}
                insertEditMention={insertEditMention}
                toggleMessagesForContact={toggleMessagesForContact}
                renderNoteWithMentions={renderNoteWithMentions}
                initializeEditMentions={initializeEditMentions}
                setContacts={setContacts}
                setMentionQuery={setMentionQuery}
                setMentionPosition={setMentionPosition}
                setPendingMentions={setPendingMentions}
                setEditMentionQuery={setEditMentionQuery}
                setEditMentionPosition={setEditMentionPosition}
                setEditPendingMentions={setEditPendingMentions}
            />

            {/* Add Todo Modal */}
            {showAddTodoModal && addTodoForContact && (
                <div
                    className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
                    onClick={() => {
                        setShowAddTodoModal(false);
                        setAddTodoForContact(null);
                        setNewTodoTask("");
                        setNewTodoDueDate("");
                    }}
                >
                    <div
                        className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-md p-6 shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                                Add To Do
                            </h2>
                            <button
                                onClick={() => {
                                    setShowAddTodoModal(false);
                                    setAddTodoForContact(null);
                                    setNewTodoTask("");
                                    setNewTodoDueDate("");
                                }}
                                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                            For: <span className="font-medium text-gray-900 dark:text-white">{addTodoForContact.name}</span>
                        </p>

                        <div className="space-y-4">
                            <div>
                                <input
                                    type="text"
                                    value={newTodoTask}
                                    onChange={(e) => setNewTodoTask(e.target.value)}
                                    placeholder="What needs to be done?"
                                    autoFocus
                                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-600 focus:border-transparent"
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter" && newTodoTask.trim()) {
                                            handleAddTodo();
                                        }
                                    }}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Due date (optional)
                                </label>
                                <input
                                    type="date"
                                    value={newTodoDueDate}
                                    onChange={(e) => setNewTodoDueDate(e.target.value)}
                                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gray-600 focus:border-transparent"
                                />
                            </div>

                            <button
                                onClick={handleAddTodo}
                                disabled={!newTodoTask.trim()}
                                className="w-full py-3 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
                            >
                                <Plus className="h-4 w-4" />
                                Add To Do
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Full-width Header Bar */}
            <header className="sticky top-0 z-40 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800">
                <div className="flex items-center justify-between px-4 sm:px-8 py-3">
                    <div className="flex items-center h-full">
                        <Image
                            src="/brand/logo_square_new.png"
                            alt="Hearth"
                            width={32}
                            height={32}
                            className="object-contain"
                        />
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Todo Button */}
                        <button
                            onClick={() => setShowTodoSheet(true)}
                            className="group relative flex items-center h-9 px-2 overflow-hidden transition-all duration-300 ease-out hover:pr-14"
                        >
                            <ClipboardList className="h-4 w-4 text-gray-400 dark:text-gray-500 transition-transform duration-300 group-hover:scale-110" />
                            <span className="absolute left-8 opacity-0 translate-x-2 text-sm font-medium text-gray-600 dark:text-gray-300 transition-all duration-300 ease-out group-hover:opacity-100 group-hover:translate-x-0 whitespace-nowrap">
                                To Do
                            </span>
                        </button>

                        {/* Confidence Boost Button */}
                        <button
                            onClick={() => setShowBoostSheet(true)}
                            className="group relative flex items-center h-9 px-2 overflow-hidden transition-all duration-300 ease-out hover:pr-14"
                        >
                            <Sparkles className="h-4 w-4 text-gray-400 dark:text-gray-500 transition-transform duration-300 group-hover:scale-110" />
                            <span className="absolute left-8 opacity-0 translate-x-2 text-sm font-medium text-gray-600 dark:text-gray-300 transition-all duration-300 ease-out group-hover:opacity-100 group-hover:translate-x-0 whitespace-nowrap">
                                Boost
                            </span>
                        </button>

                        {/* User Avatar with Dropdown */}
                        <div className="relative" ref={userMenuRef}>
                            <button
                                onClick={() => setShowUserMenu(!showUserMenu)}
                                className="relative group"
                            >
                                {(user?.customAvatarUrl || user?.avatarUrl) ? (
                                    <Image
                                        src={user.customAvatarUrl || user.avatarUrl || ""}
                                        alt={user?.fullName || "Profile"}
                                        width={32}
                                        height={32}
                                        unoptimized
                                        className="rounded-full ring-2 ring-white dark:ring-gray-800 shadow-sm object-cover"
                                    />
                                ) : (
                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center ring-2 ring-white dark:ring-gray-800 shadow-sm">
                                        <span className="text-white text-sm font-semibold">
                                            {user?.email?.charAt(0).toUpperCase() || "?"}
                                        </span>
                                    </div>
                                )}
                            </button>

                            {/* Dropdown Menu */}
                            {showUserMenu && (
                                <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-xl shadow-gray-200/50 dark:shadow-black/50 py-1 animate-in fade-in slide-in-from-top-2 duration-200 z-50">
                                    {/* User Info */}
                                    <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
                                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                            {user?.fullName || "User"}
                                        </p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                            {user?.email}
                                        </p>
                                    </div>

                                    {/* Settings */}
                                    <div className="px-2 py-1">
                                        <Link
                                            href="/app/settings"
                                            onClick={() => setShowUserMenu(false)}
                                            className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors"
                                        >
                                            <Settings className="h-4 w-4" />
                                            Settings
                                        </Link>
                                    </div>

                                    {/* Sign Out */}
                                    <div className="px-2 py-1 border-t border-gray-100 dark:border-gray-800">
                                        <button
                                            onClick={async () => {
                                                const supabase = createClient();
                                                await supabase.auth.signOut();
                                                window.location.href = "/";
                                            }}
                                            className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors"
                                        >
                                            <LogOut className="h-4 w-4" />
                                            Sign out
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <div className="px-5 py-7 sm:px-8 lg:px-12">
                <div className="w-full max-w-7xl mx-auto">
                    {/* Contributions Grid */}
                    <ContributionsGrid refreshKey={contributionsRefreshKey} />

                    {/* Main layout with sidebar */}
                    {!loading && contacts.length > 0 && (
                        <div className="flex items-start gap-8 lg:gap-10">
                            {/* Left Sidebar - Lists Navigation */}
                            <ListsSidebar
                                contacts={contacts}
                                lists={lists}
                                activeList={activeList}
                                setActiveList={setActiveList}
                                showNewListInput={showNewListInput}
                                setShowNewListInput={setShowNewListInput}
                                newListName={newListName}
                                setNewListName={setNewListName}
                                creatingList={creatingList}
                                handleCreateList={handleCreateList}
                                renamingListId={renamingListId}
                                setRenamingListId={setRenamingListId}
                                renameListValue={renameListValue}
                                setRenameListValue={setRenameListValue}
                                handleRenameList={handleRenameList}
                                listPickerOpen={listPickerOpen}
                                setListPickerOpen={setListPickerOpen}
                                handleUpdateListAppearance={handleUpdateListAppearance}
                                setListContextMenu={setListContextMenu}
                                setShowAddModal={setShowAddModal}
                                showDiscovery={showDiscovery}
                                setShowDiscovery={setShowDiscovery}
                                discoveryUsername={discoveryUsername}
                                setDiscoveryUsername={setDiscoveryUsername}
                                setDiscoveryPrefillLoading={setDiscoveryPrefillLoading}
                                showListsDropdown={showListsDropdown}
                                setShowListsDropdown={setShowListsDropdown}
                                listsDropdownRef={listsDropdownRef}
                                hiddenListIds={hiddenListIds}
                                setHiddenListIds={setHiddenListIds}
                                handleToggleListPin={handleToggleListPin}
                            />

                            {/* Main Content Area - Filter + Table */}
                            <div className="flex-1 min-w-0 max-w-4xl">
                                {/* Filter Bar */}
                                <div className="mb-5 flex items-center gap-3">
                                    {/* Search Button - opens command menu */}
                                    <Button
                                        variant="outline"
                                        onClick={() => {
                                            setShowCommandSearch(true);
                                            setCommandSearchQuery("");
                                            setCommandSearchIndex(0);
                                        }}
                                        className="h-11 w-full max-w-md justify-between rounded-xl border-0 bg-gray-100 px-4 text-sm font-normal text-muted-foreground shadow-none hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700"
                                    >
                                        <span className="flex items-center gap-2">
                                            <Search className="h-4 w-4" />
                                            Search...
                                        </span>
                                        <kbd className="pointer-events-none hidden sm:inline-flex h-5 select-none items-center gap-0.5 rounded border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
                                            <Command className="h-2.5 w-2.5" />K
                                        </kbd>
                                    </Button>

                                    {/* Hidden contacts toggle */}
                                    {contacts.some(c => c.hidden) && (
                                        <button
                                            onClick={() => setShowHiddenContacts(!showHiddenContacts)}
                                            className={`flex h-11 items-center gap-2 whitespace-nowrap rounded-xl px-4 text-sm font-medium transition-colors ${showHiddenContacts
                                                ? "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                                                : "text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                                                }`}
                                            title={showHiddenContacts ? "Hide hidden contacts" : "Show hidden contacts"}
                                        >
                                            {showHiddenContacts ? (
                                                <Eye className="h-3.5 w-3.5" />
                                            ) : (
                                                <EyeOff className="h-3.5 w-3.5" />
                                            )}
                                            <span className="text-xs">{contacts.filter(c => c.hidden).length} hidden</span>
                                        </button>
                                    )}
                                </div>

                    {/* Discovery Panel */}
                    {showDiscovery && (
                        <DiscoveryPanel
                            discoveryUsername={discoveryUsername}
                            setDiscoveryUsername={setDiscoveryUsername}
                            discoveryLoading={discoveryLoading}
                            discoveryPrefillLoading={discoveryPrefillLoading}
                            discoveryResult={discoveryResult}
                            discoveryError={discoveryError}
                            contacts={contacts}
                            onSearch={handleDiscoverySearch}
                            onAddFromDiscovery={handleAddFromDiscovery}
                            onClose={() => {
                                setShowDiscovery(false);
                                setDiscoveryResult(null);
                                setDiscoveryUsername("");
                                setDiscoveryError(null);
                            }}
                        />
                    )}

                                    {/* Table */}
                                    <ContactsTable
                                        contacts={contacts}
                                        lists={lists}
                                        selectedContacts={selectedContacts}
                                        selectedContactId={selectedContactId}
                                        activeList={activeList}
                                        searchQuery={deferredSearchQuery}
                                        showHiddenContacts={showHiddenContacts}
                                        hiddenListIds={hiddenListIds}
                                        handleRowClick={handleRowClick}
                                        handleContextMenu={handleContextMenu}
                                        renderNoteWithMentions={renderNoteWithMentions}
                                    />
                                </div>
                            </div>
                        )}

                    {/* Empty State */}
                    {!loading && contacts.length === 0 && (
                        <div className="text-center py-16">
                            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 mb-4">
                                <Users className="h-8 w-8 text-gray-400" />
                            </div>
                            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                                No contacts yet
                            </h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                                Add someone by their X handle to get started
                            </p>
                            <button
                                onClick={() => setShowAddModal(true)}
                                className="inline-flex items-center gap-2 px-5 py-2.5 bg-gray-600 hover:bg-gray-700 text-white text-sm font-medium rounded-xl transition-colors"
                            >
                                <Plus className="h-4 w-4" />
                                Add First Contact
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Hidden file input for image upload */}
            <input
                ref={imageInputRef}
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                className="hidden"
                onChange={(e) => {
                    const file = e.target.files?.[0];
                    const contactId = e.target.dataset.contactId;
                    if (file && contactId) {
                        handleImageUpload(parseInt(contactId, 10), file);
                    }
                    // Reset the input so the same file can be selected again
                    e.target.value = "";
                }}
            />

            {/* Chat Agent Widget */}
            <ChatWidget sidePanelOpen={selectedContactId !== null} />
        </div>
    );
}
