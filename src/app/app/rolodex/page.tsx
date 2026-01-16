"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import {
    Loader2,
    ArrowLeft,
    Plus,
    X,
    ChevronDown,
    ChevronRight,
    Trash2,
    Users,
    Merge,
    Pencil,
    Check,
    Search,
    Calendar,
    CheckCircle2,
    Compass,
    AtSign,
    ExternalLink,
    ClipboardList,
    PanelRightClose,
    MapPin,
    Camera,
    Pin,
    PinOff,
    MoreHorizontal,
    Eye,
    EyeOff,
    Sparkles,
    Command,
    LogOut,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/Sheet";

interface Note {
    id: number;
    note: string;
    created_at: string;
    source_type: string | null;
}

interface Compliment {
    id: number;
    compliment: string;
    context: string | null;
    received_at: string | null;
    created_at: string;
}

interface XProfile {
    username: string;
    display_name: string | null;
    bio: string | null;
    profile_image_url: string | null;
    followers_count: number | null;
    following_count: number | null;
    verified: boolean;
    website_url: string | null;
    location: string | null;
}

interface LinkedInProfile {
    linkedin_url: string;
    profile_image_url: string | null;
    headline: string | null;
    location: string | null;
}

interface Touchpoint {
    id: number;
    created_at: string;
}

interface Website {
    id: number;
    url: string;
    created_at: string;
}

interface Contact {
    id: number;
    name: string;
    created_at: string;
    custom_profile_image_url: string | null;
    custom_bio: string | null;
    custom_location: string | null;
    website_url: string | null;
    hidden: boolean;
    last_touchpoint: string | null;
    x_profile: XProfile | null;
    linkedin_profile: LinkedInProfile | null;
    notes: Note[];
    touchpoints: Touchpoint[];
    websites: Website[];
    compliments: Compliment[];
}

interface ContextMenuState {
    x: number;
    y: number;
    contactId: number;
}

interface RolodexList {
    id: number;
    name: string;
    color: string;
    pinned: boolean;
    member_count: number;
    member_ids: number[];
}

interface Todo {
    id: number;
    contactId: number;
    contactName: string;
    task: string;
    dueDate: string;
    completed: boolean;
    createdAt: string;
}

interface DiscoveryInteraction {
    username: string;
    name?: string;
    profileUrl: string;
    count: number;
    types: {
        mentions: number;
        replies: number;
        quotes: number;
        retweets: number;
    };
}

interface DiscoveryResult {
    username: string;
    tweetCount: number;
    timeRange: { start: string; end: string };
    topInteractions: DiscoveryInteraction[];
}

function formatTimeAgo(dateString: string): string {
    const now = new Date();
    const date = new Date(dateString);
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays}d ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`;
    return `${Math.floor(diffDays / 365)}y ago`;
}

export default function RolodexPage() {
    const [authLoading, setAuthLoading] = useState(true);
    const [authenticated, setAuthenticated] = useState(false);
    const [contacts, setContacts] = useState<Contact[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedContact, setExpandedContact] = useState<number | null>(null);
    const [showAddModal, setShowAddModal] = useState(false);
    const [addMode, setAddMode] = useState<"social" | "name">("social");
    const [addHandle, setAddHandle] = useState("");
    const [addName, setAddName] = useState("");
    const [addLoading, setAddLoading] = useState(false);
    const [addError, setAddError] = useState<string | null>(null);
    const [newNote, setNewNote] = useState("");
    const [addingNoteFor, setAddingNoteFor] = useState<number | null>(null);
    const [selectedContacts, setSelectedContacts] = useState<Set<number>>(new Set());
    const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
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
    const [allLocations, setAllLocations] = useState<string[]>([]);
    const [locationSuggestionIndex, setLocationSuggestionIndex] = useState(0);
    const [lists, setLists] = useState<RolodexList[]>([]);
    const [activeList, setActiveList] = useState<number | null>(null);
    const [showNewListInput, setShowNewListInput] = useState(false);
    const [newListName, setNewListName] = useState("");
    const [creatingList, setCreatingList] = useState(false);
    const [showListsDropdown, setShowListsDropdown] = useState(false);
    const [hiddenListIds, setHiddenListIds] = useState<Set<number>>(new Set());
    const listsDropdownRef = useRef<HTMLDivElement>(null);
    const [editingNote, setEditingNote] = useState<{ noteId: number; contactId: number } | null>(null);
    const [editNoteText, setEditNoteText] = useState("");
    const [editNoteLoading, setEditNoteLoading] = useState(false);
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
    const [pendingMentions, setPendingMentions] = useState<Map<string, number>>(new Map());
    const [todos, setTodos] = useState<Todo[]>([]);
    const [showTodoSheet, setShowTodoSheet] = useState(() => {
        if (typeof window !== "undefined") {
            return localStorage.getItem("rolodex-todo-sheet-open") === "true";
        }
        return false;
    });
    const [completedTodosExpanded, setCompletedTodosExpanded] = useState(false);
    const [todoNameFilter, setTodoNameFilter] = useState<{ id: number; name: string; profileImage: string | null } | null>(null);
    const [todoNameSearch, setTodoNameSearch] = useState("");
    const [showTodoNameDropdown, setShowTodoNameDropdown] = useState(false);
    const [todoDueDateFilter, setTodoDueDateFilter] = useState<"all" | "overdue" | "today" | "week" | "two-weeks" | "month" | "no-date">("all");
    const [editingTodoId, setEditingTodoId] = useState<number | null>(null);
    const [editingTodoDueDate, setEditingTodoDueDate] = useState("");
    const todoNameSearchRef = useRef<HTMLDivElement>(null);
    const [showAddTodoModal, setShowAddTodoModal] = useState(false);
    const [addTodoForContact, setAddTodoForContact] = useState<{ id: number; name: string } | null>(null);
    const [newTodoTask, setNewTodoTask] = useState("");
    const [newTodoDueDate, setNewTodoDueDate] = useState("");
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
    // Touchpoint state
    const [updatingTouchpointFor, setUpdatingTouchpointFor] = useState<number | null>(null);
    // Contact profile panel state
    const [selectedContactId, setSelectedContactId] = useState<number | null>(null);
    // Command+K search state
    const [showCommandSearch, setShowCommandSearch] = useState(false);
    const [commandSearchQuery, setCommandSearchQuery] = useState("");
    const [commandSearchIndex, setCommandSearchIndex] = useState(0);
    const commandSearchInputRef = useRef<HTMLInputElement>(null);
    const imageInputRef = useRef<HTMLInputElement>(null);
    const addInputRef = useRef<HTMLInputElement>(null);
    const expandedRowRef = useRef<HTMLDivElement>(null);
    const noteInputRef = useRef<HTMLTextAreaElement>(null);

    // Auth is handled by middleware - set as authenticated
    useEffect(() => {
        setAuthenticated(true);
        setAuthLoading(false);
    }, []);

    // Fetch todos
    const fetchTodos = useCallback(async () => {
        try {
            const res = await fetch("/api/rolodex/todos", {
                credentials: "include",
            });
            const data = await res.json();
            if (data.todos) {
                setTodos(data.todos);
            }
        } catch (error) {
            console.error("Error fetching todos:", error);
        }
    }, []);

    // Fetch contacts
    const fetchContacts = useCallback(async () => {
        try {
            const res = await fetch("/api/rolodex/contacts", {
                credentials: "include",
            });
            const data = await res.json();
            if (data.contacts) {
                setContacts(data.contacts);
            }
        } catch (error) {
            console.error("Error fetching contacts:", error);
        } finally {
            setLoading(false);
        }
    }, []);

    // Fetch lists
    const fetchLists = useCallback(async () => {
        try {
            const res = await fetch("/api/rolodex/lists", {
                credentials: "include",
            });
            const data = await res.json();
            if (data.lists) {
                setLists(data.lists);
            }
        } catch (error) {
            console.error("Error fetching lists:", error);
        }
    }, []);

    // Fetch all unique locations for autocomplete
    const fetchLocations = useCallback(async () => {
        try {
            const res = await fetch("/api/rolodex/locations", {
                credentials: "include",
            });
            if (res.ok) {
                const data = await res.json();
                setAllLocations(data.locations || []);
            }
        } catch (error) {
            console.error("Error fetching locations:", error);
        }
    }, []);

    useEffect(() => {
        if (authenticated) {
            fetchContacts();
            fetchLists();
            fetchTodos();
            fetchLocations();
        }
    }, [authenticated, fetchContacts, fetchLists, fetchTodos, fetchLocations]);

    // Focus input when modal opens
    useEffect(() => {
        if (showAddModal && addInputRef.current) {
            addInputRef.current.focus();
        }
    }, [showAddModal]);

    // Close context menu on click outside
    useEffect(() => {
        const handleClick = () => setContextMenu(null);
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                setContextMenu(null);
                setSelectedContacts(new Set());
            }
        };

        document.addEventListener("click", handleClick);
        document.addEventListener("keydown", handleKeyDown);
        return () => {
            document.removeEventListener("click", handleClick);
            document.removeEventListener("keydown", handleKeyDown);
        };
    }, []);

    // Close expanded row on click outside
    useEffect(() => {
        if (!expandedContact) return;

        const handleClickOutside = (e: MouseEvent) => {
            if (expandedRowRef.current && !expandedRowRef.current.contains(e.target as Node)) {
                setExpandedContact(null);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [expandedContact]);

    // Persist todo sheet state to localStorage
    useEffect(() => {
        localStorage.setItem("rolodex-todo-sheet-open", showTodoSheet ? "true" : "false");
    }, [showTodoSheet]);

    // Close todo name dropdown when clicking outside
    useEffect(() => {
        if (!showTodoNameDropdown) return;

        const handleClickOutside = (e: MouseEvent) => {
            if (todoNameSearchRef.current && !todoNameSearchRef.current.contains(e.target as Node)) {
                setShowTodoNameDropdown(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [showTodoNameDropdown]);

    // Close lists dropdown when clicking outside
    useEffect(() => {
        if (!showListsDropdown) return;

        const handleClickOutside = (e: MouseEvent) => {
            if (listsDropdownRef.current && !listsDropdownRef.current.contains(e.target as Node)) {
                setShowListsDropdown(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [showListsDropdown]);

    // Command+K search keyboard listener
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Open command search with Cmd+K (Mac) or Ctrl+K (Windows/Linux)
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

    // Focus command search input when modal opens
    useEffect(() => {
        if (showCommandSearch && commandSearchInputRef.current) {
            commandSearchInputRef.current.focus();
        }
    }, [showCommandSearch]);

    // Filtered contacts for command search (sorted by most recent activity)
    const sortedContacts = [...contacts].sort((a, b) => {
        const aLastActivity = a.notes[0]?.created_at || a.created_at;
        const bLastActivity = b.notes[0]?.created_at || b.created_at;
        return new Date(bLastActivity).getTime() - new Date(aLastActivity).getTime();
    });

    // Count manual notes added this week (excluding auto-generated ones and 🌐 notes)
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const notesThisWeekDetails = contacts.flatMap(contact => 
        contact.notes
            .filter(note => 
                new Date(note.created_at) > weekAgo && 
                note.source_type !== "website_analysis" &&
                !note.note.includes("🌐")
            )
            .map(note => ({ contact: contact.name, note: note.note, created_at: note.created_at, source_type: note.source_type }))
    );
    console.log("Notes this week:", notesThisWeekDetails);
    const notesThisWeek = notesThisWeekDetails.length;

    const commandSearchResults = commandSearchQuery.trim()
        ? sortedContacts.filter((contact) => {
            const query = commandSearchQuery.toLowerCase();
            const xp = contact.x_profile;
            const li = contact.linkedin_profile;
            return (
                contact.name.toLowerCase().includes(query) ||
                xp?.username?.toLowerCase().includes(query) ||
                xp?.display_name?.toLowerCase().includes(query) ||
                li?.headline?.toLowerCase().includes(query)
            );
        }).slice(0, 8)
        : sortedContacts.slice(0, 8);

    // Handle command search selection
    const handleCommandSearchSelect = (contactId: number) => {
        setShowCommandSearch(false);
        setCommandSearchQuery("");
        setCommandSearchIndex(0);
        // Clear any list filter to ensure the contact is visible
        setActiveList(null);
        setSearchQuery("");
        // Expand the contact and scroll to it
        setTimeout(() => {
            setExpandedContact(contactId);
            const element = document.querySelector(`[data-contact-id="${contactId}"]`);
            element?.scrollIntoView({ behavior: "smooth", block: "center" });
        }, 50);
    };

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

        setAddingNoteFor(contactId);

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
            // Reset textarea height
            if (noteInputRef.current) {
                noteInputRef.current.style.height = 'auto';
            }
        } catch (error) {
            console.error("Error adding note:", error);
        } finally {
            setAddingNoteFor(null);
        }
    };

    const handleEditNote = async (noteId: number, contactId: number) => {
        if (!editNoteText.trim()) return;

        setEditNoteLoading(true);
        try {
            const res = await fetch("/api/rolodex/notes", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ note_id: noteId, note: editNoteText.trim() }),
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
            }
        } catch (error) {
            console.error("Error editing note:", error);
        } finally {
            setEditNoteLoading(false);
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
            // Clear selection and collapse if hiding
            if (hidden) {
                setSelectedContacts((prev) => {
                    const next = new Set(prev);
                    next.delete(contactId);
                    return next;
                });
                if (expandedContact === contactId) {
                    setExpandedContact(null);
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

    const handleNoteKeyDown = (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>, contactId: number) => {
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

    // Parse and render note text with mentions
    const renderNoteWithMentions = (noteText: string) => {
        // First, handle @[Name](id) format, then handle @Name format by looking up contacts
        // Build a combined regex that matches both patterns
        // @[Name](id) or @Name (where Name is a known contact)

        const contactNames = contacts.map(c => c.name).sort((a, b) => b.length - a.length); // Sort by length desc to match longer names first
        const escapedNames = contactNames.map(n => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');

        // Match @[Name](id) OR @KnownName
        const mentionRegex = escapedNames
            ? new RegExp(`@\\[([^\\]]+)\\]\\((\\d+)\\)|@(${escapedNames})(?![\\w])`, 'g')
            : /@\[([^\]]+)\]\((\d+)\)/g;

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
                const foundContact = contacts.find(c => c.name === mentionName);
                mentionId = foundContact?.id || null;
            } else {
                continue;
            }

            parts.push(
                <button
                    key={`${match.index}-${mentionId || mentionName}`}
                    onClick={(e) => {
                        e.stopPropagation();
                        if (mentionId) {
                            setExpandedContact(mentionId);
                            const element = document.querySelector(`[data-contact-id="${mentionId}"]`);
                            element?.scrollIntoView({ behavior: "smooth", block: "center" });
                        }
                    }}
                    className="text-amber-600 dark:text-amber-400 font-medium hover:underline"
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
    };

    // Render input text with styled mentions (for the input overlay)
    const renderInputWithMentions = (text: string) => {
        if (!text) return null;

        // Match both @[Name](id) format and @Name format
        const mentionRegex = /@\[([^\]]+)\]\((\d+)\)|@(\w[\w\s]*?)(?=\s|$|@)/g;
        const parts: React.ReactNode[] = [];
        let lastIndex = 0;
        let match;

        while ((match = mentionRegex.exec(text)) !== null) {
            // Add text before the mention
            if (match.index > lastIndex) {
                parts.push(
                    <span key={`text-${lastIndex}`} className="text-gray-900 dark:text-white">
                        {text.slice(lastIndex, match.index)}
                    </span>
                );
            }

            // Check which pattern matched
            const mentionName = match[1] || match[3]; // match[1] for @[Name](id), match[3] for @Name

            parts.push(
                <span
                    key={`mention-${match.index}`}
                    className="text-amber-600 dark:text-amber-400 font-medium"
                >
                    @{mentionName}
                </span>
            );

            // For @[Name](id) format, skip the whole thing; for @Name, skip @Name
            lastIndex = match.index + match[0].length;
        }

        // Add remaining text
        if (lastIndex < text.length) {
            parts.push(
                <span key={`text-${lastIndex}`} className="text-gray-900 dark:text-white">
                    {text.slice(lastIndex)}
                </span>
            );
        }

        return parts.length > 0 ? parts : <span className="text-gray-900 dark:text-white">{text}</span>;
    };

    // Todo functions
    const handleAddTodo = async () => {
        if (!newTodoTask.trim() || !addTodoForContact) return;

        try {
            const res = await fetch("/api/rolodex/todos", {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    people_id: addTodoForContact.id,
                    task: newTodoTask.trim(),
                    due_date: newTodoDueDate || null,
                }),
            });

            if (res.ok) {
                const data = await res.json();
                setTodos((prev) => [...prev, data.todo].sort((a, b) => {
                    if (!a.dueDate && !b.dueDate) return 0;
                    if (!a.dueDate) return 1;
                    if (!b.dueDate) return -1;
                    return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
                }));
            }
        } catch (error) {
            console.error("Error adding todo:", error);
        }

        setShowAddTodoModal(false);
        setAddTodoForContact(null);
        setNewTodoTask("");
        setNewTodoDueDate("");
    };

    const toggleTodoComplete = async (todoId: number) => {
        const todo = todos.find(t => t.id === todoId);
        if (!todo) return;

        // Optimistic update
        setTodos((prev) =>
            prev.map((t) => (t.id === todoId ? { ...t, completed: !t.completed } : t))
        );

        try {
            const res = await fetch("/api/rolodex/todos", {
                method: "PATCH",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    id: todoId,
                    completed: !todo.completed,
                }),
            });

            if (!res.ok) {
                // Revert on error
                setTodos((prev) =>
                    prev.map((t) => (t.id === todoId ? { ...t, completed: todo.completed } : t))
                );
            }
        } catch (error) {
            console.error("Error toggling todo:", error);
            // Revert on error
            setTodos((prev) =>
                prev.map((t) => (t.id === todoId ? { ...t, completed: todo.completed } : t))
            );
        }
    };

    const deleteTodo = async (todoId: number) => {
        const todoToDelete = todos.find(t => t.id === todoId);

        // Optimistic update
        setTodos((prev) => prev.filter((t) => t.id !== todoId));

        try {
            const res = await fetch(`/api/rolodex/todos?id=${todoId}`, {
                method: "DELETE",
                credentials: "include",
            });

            if (!res.ok && todoToDelete) {
                // Revert on error
                setTodos((prev) => [...prev, todoToDelete]);
            }
        } catch (error) {
            console.error("Error deleting todo:", error);
            if (todoToDelete) {
                // Revert on error
                setTodos((prev) => [...prev, todoToDelete]);
            }
        }
    };

    const updateTodoDueDate = async (todoId: number, newDueDate: string) => {
        const todo = todos.find(t => t.id === todoId);
        if (!todo) return;

        const oldDueDate = todo.dueDate;

        // Optimistic update
        setTodos((prev) =>
            prev.map((t) => (t.id === todoId ? { ...t, dueDate: newDueDate } : t))
                .sort((a, b) => {
                    if (!a.dueDate && !b.dueDate) return 0;
                    if (!a.dueDate) return 1;
                    if (!b.dueDate) return -1;
                    return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
                })
        );
        setEditingTodoId(null);
        setEditingTodoDueDate("");

        try {
            const res = await fetch("/api/rolodex/todos", {
                method: "PATCH",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    id: todoId,
                    due_date: newDueDate || null,
                }),
            });

            if (!res.ok) {
                // Revert on error
                setTodos((prev) =>
                    prev.map((t) => (t.id === todoId ? { ...t, dueDate: oldDueDate } : t))
                );
            }
        } catch (error) {
            console.error("Error updating todo:", error);
            // Revert on error
            setTodos((prev) =>
                prev.map((t) => (t.id === todoId ? { ...t, dueDate: oldDueDate } : t))
            );
        }
    };

    const formatDueDate = (dateStr: string) => {
        if (!dateStr) return "";
        const date = new Date(dateStr);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const dueDate = new Date(dateStr);
        dueDate.setHours(0, 0, 0, 0);

        if (dueDate.getTime() === today.getTime()) return "Today";
        if (dueDate.getTime() === tomorrow.getTime()) return "Tomorrow";
        if (dueDate < today) return "Overdue";
        return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    };

    const isDueOverdue = (dateStr: string) => {
        if (!dateStr) return false;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const dueDate = new Date(dateStr);
        dueDate.setHours(0, 0, 0, 0);
        return dueDate < today;
    };

    // Filter todos based on name and due date filters (but NOT by completed status)
    const filteredTodos = todos.filter((todo) => {
        // Name filter
        if (todoNameFilter && todo.contactId !== todoNameFilter.id) {
            return false;
        }

        // Due date filter
        if (todoDueDateFilter !== "all") {
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            if (todoDueDateFilter === "no-date") {
                return !todo.dueDate;
            }

            if (!todo.dueDate) {
                return false;
            }

            // Parse date without timezone issues (YYYY-MM-DD format)
            const [year, month, day] = todo.dueDate.split('-').map(Number);
            const dueDate = new Date(year, month - 1, day);

            if (todoDueDateFilter === "overdue") {
                return dueDate < today && !todo.completed;
            }

            if (todoDueDateFilter === "today") {
                return dueDate.getTime() === today.getTime();
            }

            if (todoDueDateFilter === "week") {
                const endDate = new Date(today);
                endDate.setDate(endDate.getDate() + 6); // Today + 6 more days = 7 days total
                return dueDate >= today && dueDate <= endDate;
            }

            if (todoDueDateFilter === "two-weeks") {
                const endDate = new Date(today);
                endDate.setDate(endDate.getDate() + 13); // Today + 13 more days = 14 days total
                return dueDate >= today && dueDate <= endDate;
            }

            if (todoDueDateFilter === "month") {
                const endDate = new Date(today);
                endDate.setDate(endDate.getDate() + 29); // Today + 29 more days = 30 days total
                return dueDate >= today && dueDate <= endDate;
            }
        }

        return true;
    });

    // Split filtered todos into active and completed
    const activeTodos = filteredTodos.filter((todo) => !todo.completed);
    const completedTodos = filteredTodos.filter((todo) => todo.completed);

    const handleRowClick = (contactId: number, e: React.MouseEvent) => {
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
    };

    const handleContextMenu = (contactId: number, e: React.MouseEvent) => {
        e.preventDefault();

        // If right-clicking on an unselected contact, select it
        if (!selectedContacts.has(contactId)) {
            setSelectedContacts(new Set([contactId]));
        }

        setContextMenu({
            x: e.clientX,
            y: e.clientY,
            contactId,
        });
    };

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

    const handleDeleteList = async (listId: number) => {
        try {
            const res = await fetch(`/api/rolodex/lists?id=${listId}`, {
                method: "DELETE",
                credentials: "include",
            });

            if (res.ok) {
                setLists((prev) => prev.filter((l) => l.id !== listId));
                if (activeList === listId) {
                    setActiveList(null);
                }
            }
        } catch (error) {
            console.error("Error deleting list:", error);
        }
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

    const handleLogTouchpoint = async (contactId: number) => {
        setUpdatingTouchpointFor(contactId);

        try {
            const now = new Date().toISOString();
            const res = await fetch("/api/rolodex/update", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ people_id: contactId, last_touchpoint: now }),
            });

            if (res.ok) {
                // Generate a temporary ID for the new touchpoint (will be replaced on next fetch)
                const tempId = Date.now();
                setContacts((prev) =>
                    prev.map((c) =>
                        c.id === contactId
                            ? {
                                ...c,
                                last_touchpoint: now,
                                touchpoints: [{ id: tempId, created_at: now }, ...c.touchpoints]
                            }
                            : c
                    )
                );
            }
        } catch (error) {
            console.error("Error logging touchpoint:", error);
        } finally {
            setUpdatingTouchpointFor(null);
        }
    };

    const handleImageUpload = async (contactId: number, file: File) => {
        setUploadingImageFor(contactId);

        try {
            const formData = new FormData();
            formData.append("file", file);
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
                            ? { ...c, x_profile: data.x_profile, name: data.x_profile.display_name || c.name }
                            : c
                    )
                );
            } else if (linkType === "linkedin") {
                // Link LinkedIn profile
                const res = await fetch("/api/rolodex/link-linkedin", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    credentials: "include",
                    body: JSON.stringify({ people_id: contactId, linkedin_url: linkInput.trim() }),
                });

                const data = await res.json();

                if (!res.ok) {
                    setLinkError(data.error || "Failed to link LinkedIn profile");
                    return;
                }

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

    if (authLoading || !authenticated) {
        return (
            <div className="min-h-screen bg-white dark:bg-black flex items-center justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
            </div>
        );
    }

    return (
        <div className="min-h-full bg-white dark:bg-black safe-area-inset">
            {/* Command+K Search Modal */}
            {showCommandSearch && (
                <div
                    className="fixed inset-0 z-[100] bg-black/50 flex items-start justify-center pt-[15vh]"
                    onClick={() => {
                        setShowCommandSearch(false);
                        setCommandSearchQuery("");
                        setCommandSearchIndex(0);
                    }}
                >
                    <div
                        className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-lg shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Search Input */}
                        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                            <Search className="h-5 w-5 text-gray-400 flex-shrink-0" />
                            <input
                                ref={commandSearchInputRef}
                                type="text"
                                value={commandSearchQuery}
                                onChange={(e) => {
                                    setCommandSearchQuery(e.target.value);
                                    setCommandSearchIndex(0);
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === "Escape") {
                                        setShowCommandSearch(false);
                                        setCommandSearchQuery("");
                                        setCommandSearchIndex(0);
                                    } else if (e.key === "ArrowDown") {
                                        e.preventDefault();
                                        setCommandSearchIndex((prev) =>
                                            prev < commandSearchResults.length - 1 ? prev + 1 : prev
                                        );
                                    } else if (e.key === "ArrowUp") {
                                        e.preventDefault();
                                        setCommandSearchIndex((prev) => (prev > 0 ? prev - 1 : 0));
                                    } else if (e.key === "Enter" && commandSearchResults.length > 0) {
                                        e.preventDefault();
                                        handleCommandSearchSelect(commandSearchResults[commandSearchIndex].id);
                                    }
                                }}
                                placeholder="Search contacts..."
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
                            {commandSearchResults.length === 0 ? (
                                <div className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                                    {commandSearchQuery.trim() ? "No contacts found" : "No contacts yet"}
                                </div>
                            ) : (
                                <div className="py-2">
                                    {commandSearchResults.map((contact, index) => {
                                        const xp = contact.x_profile;
                                        const li = contact.linkedin_profile;
                                        const profileImageUrl = contact.custom_profile_image_url || xp?.profile_image_url?.replace("_normal", "_bigger") || li?.profile_image_url;
                                        const isSelected = index === commandSearchIndex;

                                        return (
                                            <button
                                                key={contact.id}
                                                onClick={() => handleCommandSearchSelect(contact.id)}
                                                onMouseEnter={() => setCommandSearchIndex(index)}
                                                className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${isSelected
                                                    ? "bg-amber-50 dark:bg-amber-900/20"
                                                    : "hover:bg-gray-50 dark:hover:bg-gray-800/50"
                                                    }`}
                                            >
                                                {profileImageUrl ? (
                                                    <Image
                                                        src={profileImageUrl}
                                                        alt={contact.name}
                                                        width={36}
                                                        height={36}
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
                                                            ↵
                                                        </kbd>
                                                    </div>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Footer hint */}
                        <div className="px-4 py-2.5 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                            <div className="flex items-center gap-3">
                                <span className="flex items-center gap-1">
                                    <kbd className="px-1 py-0.5 bg-white dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600 font-mono">↑</kbd>
                                    <kbd className="px-1 py-0.5 bg-white dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600 font-mono">↓</kbd>
                                    <span className="ml-1">navigate</span>
                                </span>
                                <span className="flex items-center gap-1">
                                    <kbd className="px-1.5 py-0.5 bg-white dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600 font-mono">↵</kbd>
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
                    {/* List options */}
                    {selectedContacts.size >= 1 && lists.length > 0 && (
                        <>
                            {selectedContacts.size === 2 && <div className="border-t border-gray-100 dark:border-gray-800 my-1" />}
                            <div className="px-3 py-1.5 text-xs font-medium text-gray-400 uppercase">
                                Add to list
                            </div>
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
                                        }}
                                        className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-2"
                                    >
                                        <div
                                            className="w-3 h-3 rounded-full flex-shrink-0"
                                            style={{ backgroundColor: list.color }}
                                        />
                                        <span className="flex-1 truncate">{list.name}</span>
                                        {allInList && <Check className="h-3.5 w-3.5 text-green-500" />}
                                        {someInList && !allInList && <span className="text-xs text-gray-400">partial</span>}
                                    </button>
                                );
                            })}
                        </>
                    )}

                    {selectedContacts.size === 1 && lists.length === 0 && (
                        <div className="px-4 py-2 text-sm text-gray-400 dark:text-gray-500">
                            No lists yet
                        </div>
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
                <div
                    className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
                    onClick={() => setShowAddModal(false)}
                >
                    <div
                        className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-md p-6 shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                                Add Contact
                            </h2>
                            <button
                                onClick={() => setShowAddModal(false)}
                                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {/* Mode Toggle */}
                        <div className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg mb-4">
                            <button
                                type="button"
                                onClick={() => { setAddMode("social"); setAddError(null); }}
                                className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${addMode === "social"
                                    ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                                    : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                                    }`}
                            >
                                Import from Social
                            </button>
                            <button
                                type="button"
                                onClick={() => { setAddMode("name"); setAddError(null); }}
                                className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${addMode === "name"
                                    ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                                    : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                                    }`}
                            >
                                Add by Name
                            </button>
                        </div>

                        <form onSubmit={handleAddContact}>
                            {addMode === "social" ? (
                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        X Handle, X URL, or LinkedIn URL
                                    </label>
                                    <input
                                        ref={addInputRef}
                                        type="text"
                                        value={addHandle}
                                        onChange={(e) => setAddHandle(e.target.value)}
                                        placeholder="@username, x.com/..., or linkedin.com/in/..."
                                        className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                                    />
                                    <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                                        Imports profile photo and bio automatically
                                    </p>
                                </div>
                            ) : (
                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Contact Name
                                    </label>
                                    <input
                                        type="text"
                                        value={addName}
                                        onChange={(e) => setAddName(e.target.value)}
                                        placeholder="John Doe"
                                        autoFocus
                                        className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                                    />
                                    <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                                        Add a contact without a social profile. You can link one later.
                                    </p>
                                </div>
                            )}

                            {addError && (
                                <p className="text-sm text-red-500 mb-4">{addError}</p>
                            )}

                            <button
                                type="submit"
                                disabled={addLoading || (addMode === "social" ? !addHandle.trim() : !addName.trim())}
                                className="w-full py-3 bg-amber-500 hover:bg-amber-600 disabled:bg-gray-300 dark:disabled:bg-gray-700 text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
                            >
                                {addLoading ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        {addMode === "social" ? "Loading profile..." : "Creating..."}
                                    </>
                                ) : (
                                    <>
                                        <Plus className="h-4 w-4" />
                                        Add Contact
                                    </>
                                )}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Todo Sheet */}
            <Sheet open={showTodoSheet && !loading} onOpenChange={setShowTodoSheet} defaultOpen>
                <SheetHeader>
                    <SheetTitle className="flex items-center gap-2">
                        <button
                            onClick={() => setShowTodoSheet(false)}
                            className="p-1 -ml-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                            aria-label="Collapse panel"
                        >
                            <PanelRightClose className="h-5 w-5" />
                        </button>
                        To Do
                    </SheetTitle>
                    <SheetDescription>
                        {todos.filter(t => !t.completed).length} active · {todos.filter(t => t.completed).length} completed
                    </SheetDescription>
                </SheetHeader>
                <SheetContent className="p-4">
                    {/* Filters */}
                    {todos.length > 0 && (
                        <div className="space-y-3 mb-4">
                            {/* Name search with autocomplete */}
                            <div className="relative" ref={todoNameSearchRef}>
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <input
                                    type="text"
                                    value={todoNameSearch}
                                    onChange={(e) => {
                                        setTodoNameSearch(e.target.value);
                                        setShowTodoNameDropdown(true);
                                    }}
                                    onFocus={() => setShowTodoNameDropdown(true)}
                                    placeholder="Filter by contact..."
                                    className="w-full pl-9 pr-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-transparent"
                                />
                                {showTodoNameDropdown && todoNameSearch && (
                                    <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 max-h-48 overflow-y-auto z-20">
                                        {(() => {
                                            // Get unique contacts from todos that match the search
                                            const todoContactIds = new Set(todos.map(t => t.contactId));
                                            const matchingContacts = contacts
                                                .filter(c => todoContactIds.has(c.id))
                                                .filter(c => c.name.toLowerCase().includes(todoNameSearch.toLowerCase()))
                                                .slice(0, 8);

                                            if (matchingContacts.length === 0) {
                                                return (
                                                    <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
                                                        No matching contacts
                                                    </div>
                                                );
                                            }

                                            return matchingContacts.map((contact) => (
                                                <button
                                                    key={contact.id}
                                                    onClick={() => {
                                                        setTodoNameFilter({
                                                            id: contact.id,
                                                            name: contact.name,
                                                            profileImage: contact.custom_profile_image_url || contact.x_profile?.profile_image_url || contact.linkedin_profile?.profile_image_url || null,
                                                        });
                                                        setTodoNameSearch("");
                                                        setShowTodoNameDropdown(false);
                                                    }}
                                                    className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 text-left"
                                                >
                                                    {(contact.custom_profile_image_url || contact.x_profile?.profile_image_url || contact.linkedin_profile?.profile_image_url) ? (
                                                        <Image
                                                            src={contact.custom_profile_image_url || contact.x_profile?.profile_image_url || contact.linkedin_profile?.profile_image_url || ""}
                                                            alt={contact.name}
                                                            width={24}
                                                            height={24}
                                                            className="rounded-full flex-shrink-0"
                                                        />
                                                    ) : (
                                                        <div className="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
                                                            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                                                                {contact.name.charAt(0).toUpperCase()}
                                                            </span>
                                                        </div>
                                                    )}
                                                    <span className="text-sm text-gray-900 dark:text-white truncate">
                                                        {contact.name}
                                                    </span>
                                                    <span className="ml-auto text-xs text-gray-400">
                                                        {todos.filter(t => t.contactId === contact.id).length} todos
                                                    </span>
                                                </button>
                                            ));
                                        })()}
                                    </div>
                                )}
                            </div>

                            {/* Selected contact pill */}
                            {todoNameFilter && (
                                <div className="flex items-center gap-1.5">
                                    <span className="text-xs text-gray-500 dark:text-gray-400">Contact:</span>
                                    <div className="inline-flex items-center gap-1.5 pl-1 pr-2 py-1 bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 rounded-full text-xs font-medium">
                                        {todoNameFilter.profileImage ? (
                                            <Image
                                                src={todoNameFilter.profileImage}
                                                alt={todoNameFilter.name}
                                                width={18}
                                                height={18}
                                                className="rounded-full flex-shrink-0"
                                            />
                                        ) : (
                                            <div className="w-[18px] h-[18px] rounded-full bg-amber-200 dark:bg-amber-800 flex items-center justify-center flex-shrink-0">
                                                <span className="text-[9px] font-semibold text-amber-700 dark:text-amber-300">
                                                    {todoNameFilter.name.charAt(0).toUpperCase()}
                                                </span>
                                            </div>
                                        )}
                                        <span className="truncate max-w-[120px]">{todoNameFilter.name}</span>
                                        <button
                                            onClick={() => setTodoNameFilter(null)}
                                            className="p-0.5 hover:bg-amber-200 dark:hover:bg-amber-800 rounded-full transition-colors"
                                        >
                                            <X className="h-3 w-3" />
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Due date filter pills */}
                            <div className="flex flex-wrap gap-1.5">
                                {[
                                    { value: "all", label: "All" },
                                    { value: "overdue", label: "Overdue" },
                                    { value: "today", label: "Today" },
                                    { value: "week", label: "Week" },
                                    { value: "two-weeks", label: "2 weeks" },
                                    { value: "month", label: "Month" },
                                    { value: "no-date", label: "No date" },
                                ].map((filter) => (
                                    <button
                                        key={filter.value}
                                        onClick={() => setTodoDueDateFilter(filter.value as typeof todoDueDateFilter)}
                                        className={`px-2.5 py-1 text-xs font-medium rounded-full transition-colors ${todoDueDateFilter === filter.value
                                            ? filter.value === "overdue"
                                                ? "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300"
                                                : "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300"
                                            : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
                                            }`}
                                    >
                                        {filter.label}
                                    </button>
                                ))}
                            </div>

                            {/* Active filter count */}
                            {(todoNameFilter || todoDueDateFilter !== "all") && (
                                <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                                    <span>
                                        Showing {filteredTodos.length} of {todos.length} todos
                                    </span>
                                    <button
                                        onClick={() => {
                                            setTodoNameFilter(null);
                                            setTodoNameSearch("");
                                            setTodoDueDateFilter("all");
                                        }}
                                        className="text-amber-600 dark:text-amber-400 hover:underline"
                                    >
                                        Clear filters
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {todos.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                            <CheckCircle2 className="h-12 w-12 text-gray-300 dark:text-gray-600 mb-3" />
                            <p className="text-sm text-gray-500 dark:text-gray-400">No todos yet</p>
                            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                                Add a todo from a contact&apos;s dropdown menu
                            </p>
                        </div>
                    ) : filteredTodos.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                            <Search className="h-12 w-12 text-gray-300 dark:text-gray-600 mb-3" />
                            <p className="text-sm text-gray-500 dark:text-gray-400">No matching todos</p>
                            <button
                                onClick={() => {
                                    setTodoNameFilter(null);
                                    setTodoNameSearch("");
                                    setTodoDueDateFilter("all");
                                }}
                                className="text-xs text-amber-600 dark:text-amber-400 hover:underline mt-1"
                            >
                                Clear filters
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {/* Active Todos */}
                            {activeTodos.map((todo) => (
                                <div
                                    key={todo.id}
                                    className="group flex items-start gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 hover:bg-amber-50 dark:hover:bg-amber-900/20 border border-gray-100 dark:border-gray-800 hover:border-amber-200 dark:hover:border-amber-800/50 transition-colors"
                                >
                                    <button
                                        onClick={() => toggleTodoComplete(todo.id)}
                                        className="flex-shrink-0 mt-0.5 text-amber-600 dark:text-amber-400 hover:text-green-600 dark:hover:text-green-500 transition-colors"
                                    >
                                        <div className="h-5 w-5 rounded-full border-2 border-current" />
                                    </button>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm text-gray-900 dark:text-gray-100">
                                            {todo.task}
                                        </p>
                                        <div className="flex items-center gap-2 mt-1.5">
                                            <button
                                                onClick={() => {
                                                    setShowTodoSheet(false);
                                                    setTimeout(() => {
                                                        setExpandedContact(todo.contactId);
                                                        const element = document.querySelector(`[data-contact-id="${todo.contactId}"]`);
                                                        element?.scrollIntoView({ behavior: "smooth", block: "center" });
                                                    }, 300);
                                                }}
                                                className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 hover:underline truncate font-medium"
                                            >
                                                {(() => {
                                                    const contact = contacts.find(c => c.id === todo.contactId);
                                                    const profileImg = contact?.custom_profile_image_url || contact?.x_profile?.profile_image_url || contact?.linkedin_profile?.profile_image_url;
                                                    return profileImg ? (
                                                        <Image
                                                            src={profileImg}
                                                            alt={todo.contactName}
                                                            width={16}
                                                            height={16}
                                                            className="rounded-full flex-shrink-0"
                                                        />
                                                    ) : (
                                                        <div className="w-4 h-4 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
                                                            <span className="text-[8px] font-medium text-gray-500 dark:text-gray-400">
                                                                {todo.contactName.charAt(0).toUpperCase()}
                                                            </span>
                                                        </div>
                                                    );
                                                })()}
                                                {todo.contactName}
                                            </button>
                                            {editingTodoId === todo.id ? (
                                                <div className="flex items-center gap-2 mt-1">
                                                    <input
                                                        type="date"
                                                        value={editingTodoDueDate}
                                                        onChange={(e) => setEditingTodoDueDate(e.target.value)}
                                                        className="text-xs px-2 py-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                                                        autoFocus
                                                    />
                                                    <button
                                                        onClick={() => updateTodoDueDate(todo.id, editingTodoDueDate)}
                                                        className="p-1 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded"
                                                    >
                                                        <Check className="h-3.5 w-3.5" />
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            setEditingTodoId(null);
                                                            setEditingTodoDueDate("");
                                                        }}
                                                        className="p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                                                    >
                                                        <X className="h-3.5 w-3.5" />
                                                    </button>
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={() => {
                                                        setEditingTodoId(todo.id);
                                                        setEditingTodoDueDate(todo.dueDate || "");
                                                    }}
                                                    className={`text-xs flex items-center gap-1 px-2 py-0.5 rounded-full transition-colors ${todo.dueDate
                                                        ? isDueOverdue(todo.dueDate)
                                                            ? "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 font-medium hover:bg-red-200 dark:hover:bg-red-900/50"
                                                            : "bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600"
                                                        : "bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-600"
                                                        }`}
                                                >
                                                    <Calendar className="h-3 w-3" />
                                                    {todo.dueDate ? formatDueDate(todo.dueDate) : "Add date"}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => deleteTodo(todo.id)}
                                        className="flex-shrink-0 opacity-0 group-hover:opacity-100 p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                                    >
                                        <X className="h-4 w-4" />
                                    </button>
                                </div>
                            ))}

                            {/* Empty state when no active todos but there are completed ones */}
                            {activeTodos.length === 0 && completedTodos.length > 0 && (
                                <div className="flex flex-col items-center justify-center py-8 text-center">
                                    <CheckCircle2 className="h-10 w-10 text-green-400 dark:text-green-600 mb-2" />
                                    <p className="text-sm text-gray-500 dark:text-gray-400">All caught up!</p>
                                </div>
                            )}

                            {/* Completed Todos Section */}
                            {completedTodos.length > 0 && (
                                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                                    <button
                                        onClick={() => setCompletedTodosExpanded(!completedTodosExpanded)}
                                        className="flex items-center gap-2 w-full text-left text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors mb-2"
                                    >
                                        <ChevronRight className={`h-4 w-4 transition-transform ${completedTodosExpanded ? "rotate-90" : ""}`} />
                                        <span>Completed</span>
                                        <span className="text-xs font-normal text-gray-400 dark:text-gray-500">
                                            ({completedTodos.length})
                                        </span>
                                    </button>

                                    {completedTodosExpanded && (
                                        <div className="space-y-2">
                                            {completedTodos.map((todo) => (
                                                <div
                                                    key={todo.id}
                                                    className="group flex items-start gap-3 p-3 rounded-xl bg-gray-50/50 dark:bg-gray-800/30 hover:bg-gray-100 dark:hover:bg-gray-800/50 border border-gray-100 dark:border-gray-800/50 transition-colors opacity-60"
                                                >
                                                    <button
                                                        onClick={() => toggleTodoComplete(todo.id)}
                                                        className="flex-shrink-0 mt-0.5 text-green-600 dark:text-green-500 hover:text-amber-600 dark:hover:text-amber-400 transition-colors"
                                                    >
                                                        <CheckCircle2 className="h-5 w-5" />
                                                    </button>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm text-gray-500 dark:text-gray-400 line-through">
                                                            {todo.task}
                                                        </p>
                                                        <div className="flex items-center gap-2 mt-1.5">
                                                            <button
                                                                onClick={() => {
                                                                    setShowTodoSheet(false);
                                                                    setTimeout(() => {
                                                                        setExpandedContact(todo.contactId);
                                                                        const element = document.querySelector(`[data-contact-id="${todo.contactId}"]`);
                                                                        element?.scrollIntoView({ behavior: "smooth", block: "center" });
                                                                    }, 300);
                                                                }}
                                                                className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500 hover:text-amber-600 dark:hover:text-amber-400 hover:underline truncate"
                                                            >
                                                                {(() => {
                                                                    const contact = contacts.find(c => c.id === todo.contactId);
                                                                    const profileImg = contact?.custom_profile_image_url || contact?.x_profile?.profile_image_url || contact?.linkedin_profile?.profile_image_url;
                                                                    return profileImg ? (
                                                                        <Image
                                                                            src={profileImg}
                                                                            alt={todo.contactName}
                                                                            width={16}
                                                                            height={16}
                                                                            className="rounded-full flex-shrink-0 grayscale"
                                                                        />
                                                                    ) : (
                                                                        <div className="w-4 h-4 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
                                                                            <span className="text-[8px] font-medium text-gray-400 dark:text-gray-500">
                                                                                {todo.contactName.charAt(0).toUpperCase()}
                                                                            </span>
                                                                        </div>
                                                                    );
                                                                })()}
                                                                {todo.contactName}
                                                            </button>
                                                            {todo.dueDate && (
                                                                <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500">
                                                                    {formatDueDate(todo.dueDate)}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={() => deleteTodo(todo.id)}
                                                        className="flex-shrink-0 opacity-0 group-hover:opacity-100 p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                                                    >
                                                        <X className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </SheetContent>
            </Sheet>

            {/* Contact Profile Sheet */}
            <Sheet open={selectedContactId !== null} onOpenChange={(open) => !open && setSelectedContactId(null)}>
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

                                {/* Close button */}
                                <button
                                    onClick={() => setSelectedContactId(null)}
                                    className="absolute top-4 left-4 p-1.5 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all z-10"
                                    aria-label="Close panel"
                                >
                                    <PanelRightClose className="h-5 w-5" />
                                </button>

                                {/* Profile Hero Section */}
                                <div className="flex flex-col items-center pt-8 pb-4">
                                    {/* Large Profile Image with upload capability */}
                                    <div 
                                        className="relative group mb-5 cursor-pointer"
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
                                        <div className="absolute -inset-1 bg-gradient-to-br from-amber-200/40 via-amber-100/20 to-transparent dark:from-amber-500/20 dark:via-amber-400/10 rounded-full blur-sm" />
                                        {profileImageUrl ? (
                                            <Image
                                                src={profileImageUrl.replace("_bigger", "_400x400").replace("_normal", "_400x400")}
                                                alt={contact.name}
                                                width={120}
                                                height={120}
                                                className="relative rounded-full ring-2 ring-white dark:ring-gray-800 shadow-xl shadow-gray-200/50 dark:shadow-gray-900/50 object-cover"
                                            />
                                        ) : (
                                            <div className="relative w-[120px] h-[120px] rounded-full bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 ring-2 ring-white dark:ring-gray-800 shadow-xl shadow-gray-200/50 dark:shadow-gray-900/50 flex items-center justify-center">
                                                <span className="text-4xl font-semibold text-gray-400 dark:text-gray-500">
                                                    {contact.name.charAt(0).toUpperCase()}
                                                </span>
                                            </div>
                                        )}
                                        {/* Camera overlay on hover or while uploading */}
                                        {(hoveringAvatarFor === contact.id || uploadingImageFor === contact.id) && (
                                            <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center transition-opacity">
                                                {uploadingImageFor === contact.id ? (
                                                    <Loader2 className="h-8 w-8 text-white animate-spin" />
                                                ) : (
                                                    <Camera className="h-8 w-8 text-white" />
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {/* Name */}
                                    <div className="text-center">
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
                                                    className="px-3 py-1.5 text-base bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white text-center focus:outline-none focus:ring-2 focus:ring-amber-500"
                                                />
                                                <button
                                                    onClick={() => handleUpdateName(contact.id)}
                                                    disabled={!editName.trim() || editNameLoading}
                                                    className="p-1.5 text-amber-600 hover:text-amber-700 disabled:text-gray-400"
                                                >
                                                    {editNameLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                                                </button>
                                                <button onClick={() => { setEditingNameFor(null); setEditName(""); }} className="p-1.5 text-gray-400 hover:text-gray-600">
                                                    <X className="h-4 w-4" />
                                                </button>
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() => { setEditingNameFor(contact.id); setEditName(contact.name); }}
                                                className="group flex items-center justify-center gap-2 text-xl font-semibold text-gray-900 dark:text-white hover:text-amber-600 dark:hover:text-amber-400 transition-colors"
                                            >
                                                {contact.name}
                                                <Pencil className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                                            </button>
                                        )}

                                        {/* Username / Handle */}
                                        {xp && (
                                            <a
                                                href={`https://x.com/${xp.username}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-block mt-1 text-sm text-gray-500 dark:text-gray-400 hover:text-amber-600 dark:hover:text-amber-400 transition-colors"
                                            >
                                                @{xp.username}
                                            </a>
                                        )}

                                        {/* Last Touchpoint */}
                                        {contact.last_touchpoint && (
                                            <p className="mt-2 text-xs text-gray-400 dark:text-gray-500">
                                                Last connected {formatTimeAgo(contact.last_touchpoint)}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </SheetHeader>
                            <SheetContent className="p-4 space-y-6">
                                {/* Touchpoint Button */}
                                <button
                                    onClick={() => handleLogTouchpoint(contact.id)}
                                    disabled={updatingTouchpointFor === contact.id}
                                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-50 dark:bg-amber-900/20 hover:bg-amber-100 dark:hover:bg-amber-900/30 text-amber-700 dark:text-amber-300 text-sm font-medium rounded-xl transition-colors disabled:opacity-50"
                                >
                                    {updatingTouchpointFor === contact.id ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <CheckCircle2 className="h-4 w-4" />
                                    )}
                                    Log Touchpoint
                                </button>

                                {/* Bio Section */}
                                <div>
                                    <h3 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Bio</h3>
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
                                                className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
                                            />
                                            <div className="flex gap-2">
                                                <button onClick={() => handleUpdateBio(contact.id)} disabled={editBioLoading} className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 disabled:bg-gray-300 text-white text-sm font-medium rounded-lg flex items-center gap-1">
                                                    {editBioLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />} Save
                                                </button>
                                                <button onClick={() => { setEditingBioFor(null); setEditBio(""); }} className="px-3 py-1.5 text-gray-500 hover:text-gray-700 text-sm">Cancel</button>
                                            </div>
                                        </div>
                                    ) : (
                                        <button onClick={() => { setEditBio(contact.custom_bio || xp?.bio || li?.headline || ""); setEditingBioFor(contact.id); }} className="group text-left w-full">
                                            {(contact.custom_bio || xp?.bio || li?.headline) ? (
                                                <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed flex items-start gap-1.5">
                                                    <span className="flex-1">{contact.custom_bio || xp?.bio || li?.headline}</span>
                                                    <Pencil className="h-3 w-3 opacity-0 group-hover:opacity-50 transition-opacity flex-shrink-0 mt-1" />
                                                </p>
                                            ) : (
                                                <p className="text-sm text-gray-400 italic flex items-center gap-1.5">+ Add bio <Pencil className="h-3 w-3 opacity-0 group-hover:opacity-50" /></p>
                                            )}
                                        </button>
                                    )}
                                </div>

                                {/* Location Section */}
                                <div>
                                    <h3 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Location</h3>
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
                                                                setLocationSuggestionIndex(prev =>
                                                                    prev < suggestions.length - 1 ? prev + 1 : 0
                                                                );
                                                            } else if (e.key === "ArrowUp" && suggestions.length > 0) {
                                                                e.preventDefault();
                                                                setLocationSuggestionIndex(prev =>
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
                                                        className="w-full px-2 py-1.5 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
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
                                                                            ? "bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300"
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
                                                <button onClick={() => handleUpdateLocation(contact.id)} disabled={editLocationLoading} className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 disabled:bg-gray-300 text-white text-sm font-medium rounded-lg flex items-center gap-1">
                                                    {editLocationLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />} Save
                                                </button>
                                                <button onClick={() => { setEditingLocationFor(null); setEditLocation(""); setLocationSuggestionIndex(0); }} className="px-3 py-1.5 text-gray-500 hover:text-gray-700 text-sm">Cancel</button>
                                            </div>
                                        </div>
                                    ) : (
                                        <button onClick={() => { setEditLocation(contact.custom_location || xp?.location || li?.location || ""); setEditingLocationFor(contact.id); }} className="group flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800">
                                            <MapPin className="h-4 w-4" />
                                            {(contact.custom_location || xp?.location || li?.location) ? (
                                                <span className="flex items-center gap-1">{contact.custom_location || xp?.location || li?.location} <Pencil className="h-3 w-3 opacity-0 group-hover:opacity-50" /></span>
                                            ) : (
                                                <span className="text-gray-400 italic">+ Add location <Pencil className="h-3 w-3 opacity-0 group-hover:opacity-50" /></span>
                                            )}
                                        </button>
                                    )}
                                </div>

                                {/* Links Section */}
                                <div>
                                    <h3 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Links</h3>
                                    <div className="flex flex-wrap gap-2">
                                        {xp && (
                                            <a href={`https://x.com/${xp.username}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700">
                                                <AtSign className="h-3 w-3" />{xp.username}
                                            </a>
                                        )}
                                        {li && (
                                            <a href={li.linkedin_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full hover:bg-blue-100">
                                                <ExternalLink className="h-3 w-3" />LinkedIn
                                            </a>
                                        )}
                                        {contact.websites.map(website => (
                                            <div key={website.id} className="inline-flex items-center gap-0.5 group/website">
                                                <a href={website.url.startsWith("http") ? website.url : `https://${website.url}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-l-full hover:bg-green-100">
                                                    <ExternalLink className="h-3 w-3" />{website.url.replace(/^https?:\/\//, "").substring(0, 20)}
                                                </a>
                                                <button
                                                    onClick={async () => {
                                                        const res = await fetch(`/api/rolodex/websites?id=${website.id}`, {
                                                            method: "DELETE",
                                                            credentials: "include",
                                                        });
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
                                                    className="px-2 py-1 text-xs bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
                                                />
                                                <button onClick={() => handleAddLink(contact.id)} disabled={!linkInput.trim() || linkLoading} className="p-1 text-amber-600 hover:text-amber-700 disabled:text-gray-400">
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
                                    <h3 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Lists</h3>
                                    <div className="flex flex-wrap gap-2">
                                        {lists.filter(l => l.member_ids.includes(contact.id)).map(list => (
                                            <span key={list.id} className="inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-full" style={{ backgroundColor: `${list.color}20`, color: list.color }}>
                                                {list.name}
                                            </span>
                                        ))}
                                        {lists.filter(l => l.member_ids.includes(contact.id)).length === 0 && (
                                            <span className="text-sm text-gray-400 italic">No lists</span>
                                        )}
                                    </div>
                                </div>

                                {/* Timeline Section (Notes + Touchpoints) */}
                                <div>
                                    <h3 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Timeline</h3>
                                    {/* Add note input */}
                                    <div className="mb-3">
                                        <textarea
                                            ref={noteInputRef}
                                            value={addingNoteFor === contact.id ? newNote : ""}
                                            onChange={(e) => { setNewNote(e.target.value); setAddingNoteFor(contact.id); }}
                                            onFocus={() => setAddingNoteFor(contact.id)}
                                            placeholder="Add a note..."
                                            rows={2}
                                            className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
                                        />
                                        {addingNoteFor === contact.id && newNote.trim() && (
                                            <div className="flex gap-2 mt-2">
                                                <button
                                                    onClick={async () => {
                                                        const res = await fetch("/api/rolodex/notes", {
                                                            method: "POST",
                                                            headers: { "Content-Type": "application/json" },
                                                            credentials: "include",
                                                            body: JSON.stringify({ people_id: contact.id, note: newNote.trim() }),
                                                        });
                                                        if (res.ok) {
                                                            const data = await res.json();
                                                            setContacts(prev => prev.map(c => c.id === contact.id ? { ...c, notes: [data.note, ...c.notes] } : c));
                                                            setNewNote("");
                                                            setAddingNoteFor(null);
                                                        }
                                                    }}
                                                    className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium rounded-lg"
                                                >
                                                    Save
                                                </button>
                                                <button onClick={() => { setNewNote(""); setAddingNoteFor(null); }} className="px-3 py-1.5 text-gray-500 hover:text-gray-700 text-sm">Cancel</button>
                                            </div>
                                        )}
                                    </div>
                                    {/* Timeline list (notes + touchpoints interspersed) */}
                                    <div className="space-y-3 max-h-64 overflow-y-auto">
                                        {(() => {
                                            // Combine notes and touchpoints into a unified timeline
                                            const timeline: Array<{ type: "note"; data: Note } | { type: "touchpoint"; data: Touchpoint }> = [
                                                ...contact.notes.map(n => ({ type: "note" as const, data: n })),
                                                ...contact.touchpoints.map(t => ({ type: "touchpoint" as const, data: t })),
                                            ].sort((a, b) => new Date(b.data.created_at).getTime() - new Date(a.data.created_at).getTime());

                                            if (timeline.length === 0) {
                                                return <p className="text-sm text-gray-400 italic">No activity yet</p>;
                                            }

                                            return timeline.map(item => {
                                                if (item.type === "touchpoint") {
                                                    return (
                                                        <div key={`tp-${item.data.id}`} className="flex items-center gap-2 py-2 px-3 bg-gray-100 dark:bg-gray-800/30 rounded-lg">
                                                            <div className="w-2 h-2 rounded-full bg-gray-400 dark:bg-gray-500" />
                                                            <span className="text-xs text-gray-500 dark:text-gray-400">Logged touchpoint</span>
                                                            <span className="text-xs text-gray-400 ml-auto">{formatTimeAgo(item.data.created_at)}</span>
                                                        </div>
                                                    );
                                                }
                                                const note = item.data;
                                                return (
                                                    <div key={`note-${note.id}`} className={`group relative rounded-lg p-3 ${note.source_type === "website_analysis" ? "bg-violet-50 dark:bg-violet-900/20 border border-violet-100 dark:border-violet-800/30" : "bg-gray-50 dark:bg-gray-800/50"}`}>
                                                        {editingNote?.noteId === note.id ? (
                                                            <div className="flex items-center gap-2">
                                                                <input
                                                                    type="text"
                                                                    value={editNoteText}
                                                                    onChange={(e) => setEditNoteText(e.target.value)}
                                                                    onKeyDown={(e) => {
                                                                        if (e.key === "Enter" && editNoteText.trim()) {
                                                                            handleEditNote(note.id, contact.id);
                                                                        } else if (e.key === "Escape") {
                                                                            setEditingNote(null);
                                                                            setEditNoteText("");
                                                                        }
                                                                    }}
                                                                    autoFocus
                                                                    className="flex-1 px-2 py-1 text-sm bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-600 rounded text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                                                                />
                                                                <button
                                                                    onClick={() => handleEditNote(note.id, contact.id)}
                                                                    disabled={!editNoteText.trim() || editNoteLoading}
                                                                    className="p-1 text-amber-600 hover:text-amber-700 disabled:text-gray-400"
                                                                >
                                                                    {editNoteLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                                                                </button>
                                                                <button onClick={() => { setEditingNote(null); setEditNoteText(""); }} className="p-1 text-gray-400 hover:text-gray-600">
                                                                    <X className="h-4 w-4" />
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <>
                                                                <p className="text-sm text-gray-700 dark:text-gray-300 pr-16">{renderNoteWithMentions(note.note)}</p>
                                                                <div className="flex items-center gap-2 mt-1">
                                                                    <span className="text-xs text-gray-400">{formatTimeAgo(note.created_at)}</span>
                                                                    {note.source_type === "website_analysis" && (
                                                                        <span className="text-[10px] font-medium text-violet-500 dark:text-violet-400 bg-violet-100 dark:bg-violet-900/40 px-1.5 py-0.5 rounded">auto</span>
                                                                    )}
                                                                </div>
                                                                {/* Edit/Delete buttons */}
                                                                <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                    <button
                                                                        onClick={() => { setEditingNote({ noteId: note.id, contactId: contact.id }); setEditNoteText(note.note); }}
                                                                        className="p-1 text-gray-400 hover:text-amber-500 transition-colors"
                                                                        title="Edit note"
                                                                    >
                                                                        <Pencil className="h-3 w-3" />
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handleDeleteNote(note.id, contact.id)}
                                                                        className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                                                                        title="Delete note"
                                                                    >
                                                                        <Trash2 className="h-3 w-3" />
                                                                    </button>
                                                                </div>
                                                            </>
                                                        )}
                                                    </div>
                                                );
                                            });
                                        })()}
                                    </div>
                                </div>

                                {/* Compliments Section */}
                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <h3 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                            Compliments {contact.compliments.length > 0 && `(${contact.compliments.length})`}
                                        </h3>
                                        {showComplimentInput !== contact.id && (
                                            <button
                                                onClick={() => {
                                                    setShowComplimentInput(contact.id);
                                                    setNewCompliment("");
                                                    setNewComplimentContext("");
                                                }}
                                                className="text-xs text-amber-500 hover:text-amber-600 dark:text-amber-400 dark:hover:text-amber-300 flex items-center gap-1"
                                            >
                                                <Plus className="h-3 w-3" />
                                                Add
                                            </button>
                                        )}
                                    </div>

                                    {/* Add Compliment Input */}
                                    {showComplimentInput === contact.id && (
                                        <div className="mb-3 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800/50">
                                            <textarea
                                                value={newCompliment}
                                                onChange={(e) => setNewCompliment(e.target.value)}
                                                placeholder="What nice thing did they say? ✨"
                                                rows={2}
                                                autoFocus
                                                className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-amber-200 dark:border-amber-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
                                            />
                                            <input
                                                type="text"
                                                value={newComplimentContext}
                                                onChange={(e) => setNewComplimentContext(e.target.value)}
                                                placeholder="Context (optional): email, Twitter, in person..."
                                                className="w-full mt-2 px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-amber-200 dark:border-amber-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
                                            />
                                            <div className="flex justify-end gap-2 mt-3">
                                                <button
                                                    onClick={() => {
                                                        setShowComplimentInput(null);
                                                        setNewCompliment("");
                                                        setNewComplimentContext("");
                                                    }}
                                                    className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700"
                                                >
                                                    Cancel
                                                </button>
                                                <button
                                                    onClick={() => handleAddCompliment(contact.id)}
                                                    disabled={!newCompliment.trim() || addingComplimentFor === contact.id}
                                                    className="px-4 py-1.5 bg-amber-500 hover:bg-amber-600 disabled:bg-gray-300 text-white text-sm font-medium rounded-lg"
                                                >
                                                    {addingComplimentFor === contact.id ? (
                                                        <Loader2 className="h-4 w-4 animate-spin" />
                                                    ) : (
                                                        "Save"
                                                    )}
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {/* Compliments List */}
                                    {contact.compliments.length > 0 ? (
                                        <div className="space-y-2">
                                            {contact.compliments.map(comp => (
                                                <div key={comp.id} className="group bg-amber-50 dark:bg-amber-900/20 rounded-lg p-3">
                                                    {editingCompliment?.complimentId === comp.id && editingCompliment?.contactId === contact.id ? (
                                                        /* Edit mode */
                                                        <div className="space-y-2">
                                                            <textarea
                                                                value={editComplimentText}
                                                                onChange={(e) => setEditComplimentText(e.target.value)}
                                                                rows={2}
                                                                autoFocus
                                                                className="w-full px-2 py-1.5 text-sm bg-white dark:bg-gray-800 border border-amber-200 dark:border-amber-700 rounded text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
                                                            />
                                                            <input
                                                                type="text"
                                                                value={editComplimentContext}
                                                                onChange={(e) => setEditComplimentContext(e.target.value)}
                                                                placeholder="Context (optional)"
                                                                className="w-full px-2 py-1.5 text-sm bg-white dark:bg-gray-800 border border-amber-200 dark:border-amber-700 rounded text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                                                            />
                                                            <div className="flex justify-end gap-2">
                                                                <button
                                                                    onClick={() => {
                                                                        setEditingCompliment(null);
                                                                        setEditComplimentText("");
                                                                        setEditComplimentContext("");
                                                                    }}
                                                                    className="p-1 text-gray-400 hover:text-gray-600"
                                                                >
                                                                    <X className="h-4 w-4" />
                                                                </button>
                                                                <button
                                                                    onClick={() => handleEditCompliment(comp.id, contact.id)}
                                                                    disabled={!editComplimentText.trim() || editComplimentLoading}
                                                                    className="p-1 text-amber-600 hover:text-amber-700 disabled:text-gray-400"
                                                                >
                                                                    {editComplimentLoading ? (
                                                                        <Loader2 className="h-4 w-4 animate-spin" />
                                                                    ) : (
                                                                        <Check className="h-4 w-4" />
                                                                    )}
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        /* View mode */
                                                        <>
                                                            <div className="flex items-start justify-between gap-2">
                                                                <p className="text-sm text-amber-800 dark:text-amber-200 flex-1">&ldquo;{comp.compliment}&rdquo;</p>
                                                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                    <button
                                                                        onClick={() => {
                                                                            setEditingCompliment({ complimentId: comp.id, contactId: contact.id });
                                                                            setEditComplimentText(comp.compliment);
                                                                            setEditComplimentContext(comp.context || "");
                                                                        }}
                                                                        className="p-1 text-amber-600/50 hover:text-amber-600 transition-colors"
                                                                        title="Edit"
                                                                    >
                                                                        <Pencil className="h-3.5 w-3.5" />
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handleDeleteCompliment(comp.id, contact.id)}
                                                                        className="p-1 text-amber-600/50 hover:text-red-500 transition-colors"
                                                                        title="Delete"
                                                                    >
                                                                        <Trash2 className="h-3.5 w-3.5" />
                                                                    </button>
                                                                </div>
                                                            </div>
                                                            {comp.context && <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">{comp.context}</p>}
                                                        </>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-sm text-gray-400 italic">No compliments yet</p>
                                    )}
                                </div>

                                {/* Actions */}
                                <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                                    <button
                                        onClick={async () => {
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
                                        className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                                    >
                                        {contact.hidden ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                                        {contact.hidden ? "Show contact" : "Hide contact"}
                                    </button>
                                </div>

                            </SheetContent>
                        </>
                    );
                })()}
            </Sheet>

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
                                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
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
                                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                                />
                            </div>

                            <button
                                onClick={handleAddTodo}
                                disabled={!newTodoTask.trim()}
                                className="w-full py-3 bg-amber-500 hover:bg-amber-600 disabled:bg-gray-300 dark:disabled:bg-gray-700 text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
                            >
                                <Plus className="h-4 w-4" />
                                Add To Do
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="px-4 py-6 sm:px-8 sm:py-6">
                <div className="w-full max-w-5xl mx-auto">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6 sm:mb-8">
                        <div>
                            <h1 className="text-xl sm:text-2xl font-medium text-gray-900 dark:text-white mb-1">
                                Rolodex
                            </h1>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                {selectedContacts.size > 0
                                    ? `${selectedContacts.size} selected`
                                    : `${contacts.filter(c => !c.hidden).length} contact${contacts.filter(c => !c.hidden).length !== 1 ? "s" : ""}`}
                                {selectedContacts.size === 0 && notesThisWeek > 0 && (
                                    <span className="ml-2 text-amber-600 dark:text-amber-400">
                                        · {notesThisWeek} note{notesThisWeek !== 1 ? "s" : ""} this week
                                    </span>
                                )}
                            </p>
                        </div>

                        <div className="flex items-center gap-2">
                            {/* Confidence Boost Button */}
                            <Link
                                href="/app/rolodex/compliments"
                                className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-pink-50 to-rose-50 dark:from-pink-950/30 dark:to-rose-950/30 hover:from-pink-100 hover:to-rose-100 dark:hover:from-pink-900/40 dark:hover:to-rose-900/40 rounded-xl border border-pink-200 dark:border-pink-800/50 hover:border-pink-300 dark:hover:border-pink-700/50 transition-colors"
                            >
                                <Sparkles className="h-4 w-4 text-pink-500" />
                                <span className="text-sm font-medium text-pink-700 dark:text-pink-300">Boost</span>
                                {contacts.reduce((sum, c) => sum + c.compliments.length, 0) > 0 && (
                                    <span className="flex items-center justify-center h-5 min-w-[20px] px-1.5 text-xs font-semibold bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-full">
                                        {contacts.reduce((sum, c) => sum + c.compliments.length, 0)}
                                    </span>
                                )}
                            </Link>

                            {/* Todo Button */}
                            <button
                                onClick={() => setShowTodoSheet(true)}
                                className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 dark:bg-gray-800 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-amber-200 dark:hover:border-amber-800/50 transition-colors"
                            >
                                <ClipboardList className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">To Do</span>
                                {todos.filter(t => !t.completed).length > 0 && (
                                    <span className="flex items-center justify-center h-5 min-w-[20px] px-1.5 text-xs font-semibold bg-amber-500 dark:bg-amber-600 text-white rounded-full">
                                        {todos.filter(t => !t.completed).length}
                                    </span>
                                )}
                            </button>

                            {/* Sign Out Button */}
                            <button
                                onClick={async () => {
                                    const supabase = createClient();
                                    await supabase.auth.signOut();
                                    window.location.href = "/";
                                }}
                                className="flex items-center gap-2 px-3 py-2.5 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
                                title="Sign out"
                            >
                                <LogOut className="h-4 w-4" />
                            </button>
                        </div>
                    </div>

                    {/* Lists Bar with Filter */}
                    {!loading && contacts.length > 0 && (
                        <div className="flex items-center gap-2 mb-4 relative">
                            <div className="flex items-center gap-2 overflow-x-auto pb-2 flex-1">
                                <button
                                    onClick={() => setActiveList(null)}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg whitespace-nowrap transition-colors ${activeList === null
                                        ? "bg-gray-900 dark:bg-white text-white dark:text-gray-900"
                                        : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
                                        }`}
                                >
                                    <Users className="h-3.5 w-3.5" />
                                    All
                                    <span className="text-xs opacity-60">{contacts.length}</span>
                                </button>

                                {/* Show only pinned lists */}
                                {lists.filter(l => l.pinned).map((list) => (
                                    <button
                                        key={list.id}
                                        onClick={() => setActiveList(activeList === list.id ? null : list.id)}
                                        onContextMenu={(e) => {
                                            e.preventDefault();
                                            if (confirm(`Delete list "${list.name}"?`)) {
                                                handleDeleteList(list.id);
                                            }
                                        }}
                                        className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg whitespace-nowrap transition-colors ${activeList === list.id
                                            ? "bg-gray-900 dark:bg-white text-white dark:text-gray-900"
                                            : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
                                            }`}
                                    >
                                        <div
                                            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                                            style={{ backgroundColor: list.color }}
                                        />
                                        {list.name}
                                        <span className="text-xs opacity-60">{list.member_count}</span>
                                    </button>
                                ))}

                                {showNewListInput ? (
                                    <div className="flex items-center gap-1">
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
                                            className="w-32 px-2 py-1 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                                        />
                                        <button
                                            onClick={handleCreateList}
                                            disabled={!newListName.trim() || creatingList}
                                            className="p-1 text-amber-600 hover:text-amber-700 disabled:text-gray-400"
                                        >
                                            {creatingList ? (
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                            ) : (
                                                <Check className="h-4 w-4" />
                                            )}
                                        </button>
                                        <button
                                            onClick={() => {
                                                setShowNewListInput(false);
                                                setNewListName("");
                                            }}
                                            className="p-1 text-gray-400 hover:text-gray-600"
                                        >
                                            <X className="h-4 w-4" />
                                        </button>
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => setShowNewListInput(true)}
                                        className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 border border-dashed border-gray-300 dark:border-gray-700 rounded-lg hover:border-gray-400 dark:hover:border-gray-600 transition-colors"
                                    >
                                        <Plus className="h-3.5 w-3.5" />
                                        New List
                                    </button>
                                )}

                                <button
                                    onClick={() => setShowAddModal(true)}
                                    className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 border border-dashed border-gray-300 dark:border-gray-700 rounded-lg hover:border-gray-400 dark:hover:border-gray-600 transition-colors"
                                >
                                    <Plus className="h-3.5 w-3.5" />
                                    New Contact
                                </button>

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
                                    className={`flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-lg whitespace-nowrap transition-colors ${showDiscovery
                                        ? "bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 border border-violet-300 dark:border-violet-700"
                                        : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 border border-dashed border-gray-300 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-600"
                                        }`}
                                >
                                    <Compass className="h-3.5 w-3.5" />
                                    Discover
                                </button>

                                {/* Filter */}
                                <div className="relative flex-shrink-0">
                                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                                    <input
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        placeholder="Filter..."
                                        className="w-36 sm:w-44 pl-8 pr-14 py-1.5 text-sm bg-gray-100 dark:bg-gray-800 border-0 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
                                    />
                                    {searchQuery ? (
                                        <button
                                            onClick={() => setSearchQuery("")}
                                            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                                        >
                                            <X className="h-3.5 w-3.5" />
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => setShowCommandSearch(true)}
                                            className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] text-gray-400 bg-white dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 transition-colors"
                                            title="Search contacts (⌘K)"
                                        >
                                            <Command className="h-2.5 w-2.5" />
                                            <span>K</span>
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Hidden contacts toggle */}
                            {contacts.some(c => c.hidden) && (
                                <button
                                    onClick={() => setShowHiddenContacts(!showHiddenContacts)}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg whitespace-nowrap transition-colors flex-shrink-0 ${showHiddenContacts
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

                            {/* More lists dropdown - outside scrollable container */}
                            {lists.length > 0 && (
                                <div className="relative flex-shrink-0" ref={listsDropdownRef}>
                                    <button
                                        onClick={() => setShowListsDropdown(!showListsDropdown)}
                                        className={`relative flex items-center gap-1 px-2 py-1.5 text-sm rounded-lg transition-colors ${showListsDropdown
                                            ? "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                                            : hiddenListIds.size > 0
                                                ? "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30"
                                                : "text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                                            }`}
                                        title={hiddenListIds.size > 0 ? `${hiddenListIds.size} list${hiddenListIds.size !== 1 ? 's' : ''} hidden` : "Manage lists"}
                                    >
                                        <MoreHorizontal className="h-4 w-4" />
                                        {hiddenListIds.size > 0 && (
                                            <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-medium rounded-full flex items-center justify-center">
                                                {hiddenListIds.size}
                                            </span>
                                        )}
                                    </button>

                                    {showListsDropdown && (
                                        <div className="absolute top-full right-0 mt-1 w-72 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50 py-1 max-h-80 overflow-y-auto">
                                            <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
                                                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                                    Manage Lists
                                                </p>
                                                {hiddenListIds.size > 0 && (
                                                    <button
                                                        onClick={() => setHiddenListIds(new Set())}
                                                        className="text-xs text-amber-600 dark:text-amber-400 hover:underline"
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
                                                                setActiveList(activeList === list.id ? null : list.id);
                                                                setShowListsDropdown(false);
                                                            }}
                                                            className="flex items-center gap-2 flex-1 min-w-0"
                                                        >
                                                            <div
                                                                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                                                                style={{ backgroundColor: list.color }}
                                                            />
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
                                                                    ? "text-amber-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20"
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
                    )}

                    {/* Discovery Panel */}
                    {showDiscovery && (
                        <div className="mb-6 bg-gradient-to-br from-violet-50 to-fuchsia-50 dark:from-violet-950/40 dark:to-fuchsia-950/40 rounded-2xl border border-violet-200/60 dark:border-violet-800/40 overflow-hidden">
                            <div className="px-5 py-4 border-b border-violet-200/60 dark:border-violet-800/40">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                        <div className="p-1.5 bg-violet-100 dark:bg-violet-900/50 rounded-lg">
                                            <Compass className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                                        </div>
                                        <h3 className="font-semibold text-gray-900 dark:text-white">
                                            Discover Connections
                                        </h3>
                                    </div>
                                    <button
                                        onClick={() => {
                                            setShowDiscovery(false);
                                            setDiscoveryResult(null);
                                            setDiscoveryUsername("");
                                            setDiscoveryError(null);
                                        }}
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
                                            <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-violet-500 animate-spin" />
                                        ) : (
                                            <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                        )}
                                        <input
                                            type="text"
                                            value={discoveryUsername}
                                            onChange={(e) => setDiscoveryUsername(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === "Enter" && discoveryUsername.trim()) {
                                                    handleDiscoverySearch();
                                                }
                                            }}
                                            placeholder={discoveryPrefillLoading ? "Loading suggestion..." : "Enter X username..."}
                                            className="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-gray-900 border border-violet-200 dark:border-violet-800 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent text-sm"
                                        />
                                    </div>
                                    <button
                                        onClick={handleDiscoverySearch}
                                        disabled={discoveryLoading || !discoveryUsername.trim()}
                                        className="px-5 py-2.5 bg-violet-600 hover:bg-violet-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 text-white font-medium rounded-xl transition-colors flex items-center gap-2 text-sm"
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
                                            className="text-xs text-violet-600 dark:text-violet-400 hover:underline flex items-center gap-1"
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
                                                            : "bg-white dark:bg-gray-900/60 border-violet-200 dark:border-violet-800/50 hover:border-violet-400 dark:hover:border-violet-600"
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
                                                            <div className="w-6 h-6 rounded-full bg-violet-100 dark:bg-violet-900/50 flex items-center justify-center">
                                                                <span className="text-[10px] font-medium text-violet-600 dark:text-violet-400">
                                                                    {interaction.username.charAt(0).toUpperCase()}
                                                                </span>
                                                            </div>
                                                        )}

                                                        {/* Username */}
                                                        <a
                                                            href={interaction.profileUrl}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="text-sm text-gray-700 dark:text-gray-300 hover:text-violet-600 dark:hover:text-violet-400 transition-colors"
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
                                                                onClick={() => handleAddFromDiscovery(interaction.username)}
                                                                className="opacity-0 group-hover:opacity-100 p-0.5 text-violet-500 hover:text-violet-700 dark:text-violet-400 dark:hover:text-violet-300 transition-all"
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
                    )}

                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                        </div>
                    ) : contacts.length === 0 ? (
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
                                className="inline-flex items-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium rounded-xl transition-colors"
                            >
                                <Plus className="h-4 w-4" />
                                Add First Contact
                            </button>
                        </div>
                    ) : (
                        <div className="border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
                            {/* Table Header */}
                            <div className="hidden sm:grid sm:grid-cols-[160px,1fr,100px,120px,1fr,40px] bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-800 px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                <div>Contact</div>
                                <div>Bio</div>
                                <div>Location</div>
                                <div>Lists</div>
                                <div>Last Note</div>
                                <div></div>
                            </div>

                            {/* Table Body */}
                            <div className="divide-y divide-gray-100 dark:divide-gray-800">
                                {contacts
                                    .filter((contact) => {
                                        // Hidden contacts filter
                                        if (contact.hidden && !showHiddenContacts) {
                                            return false;
                                        }
                                        // List filter
                                        if (activeList !== null) {
                                            const list = lists.find((l) => l.id === activeList);
                                            if (!list?.member_ids.includes(contact.id)) return false;
                                        }
                                        // Hidden lists filter - exclude contacts in hidden lists
                                        if (hiddenListIds.size > 0) {
                                            const contactListIds = lists
                                                .filter(l => l.member_ids.includes(contact.id))
                                                .map(l => l.id);
                                            if (contactListIds.some(id => hiddenListIds.has(id))) {
                                                return false;
                                            }
                                        }
                                        // Search filter
                                        if (searchQuery.trim()) {
                                            const query = searchQuery.toLowerCase();
                                            const xp = contact.x_profile;
                                            const li = contact.linkedin_profile;
                                            return (
                                                contact.name.toLowerCase().includes(query) ||
                                                xp?.username?.toLowerCase().includes(query) ||
                                                xp?.bio?.toLowerCase().includes(query) ||
                                                xp?.location?.toLowerCase().includes(query) ||
                                                li?.headline?.toLowerCase().includes(query) ||
                                                li?.location?.toLowerCase().includes(query) ||
                                                li?.linkedin_url?.toLowerCase().includes(query) ||
                                                contact.notes.some((n) => n.note.toLowerCase().includes(query))
                                            );
                                        }
                                        return true;
                                    })
                                    .sort((a, b) => {
                                        // Sort by most recent activity (touchpoint, note, or created_at)
                                        const getLastActivity = (c: Contact) => {
                                            const dates = [
                                                c.last_touchpoint,
                                                c.notes[0]?.created_at,
                                                c.created_at,
                                            ].filter(Boolean) as string[];
                                            return Math.max(...dates.map(d => new Date(d).getTime()));
                                        };
                                        return getLastActivity(b) - getLastActivity(a);
                                    })
                                    .map((contact) => {
                                        const isExpanded = expandedContact === contact.id;
                                        const isSelected = selectedContacts.has(contact.id);
                                        const xp = contact.x_profile;
                                        const li = contact.linkedin_profile;
                                        const lastNote = contact.notes[0];
                                        // Get profile image: prioritize custom, then X, then LinkedIn
                                        const profileImageUrl = contact.custom_profile_image_url || xp?.profile_image_url || li?.profile_image_url;

                                        return (
                                            <div key={contact.id} ref={isExpanded ? expandedRowRef : undefined} data-contact-id={contact.id}>
                                                {/* Row */}
                                                <div
                                                    className={`grid grid-cols-[1fr,auto] sm:grid-cols-[160px,1fr,100px,120px,1fr,40px] items-center px-4 py-3 cursor-pointer transition-colors select-none ${isSelected
                                                        ? "bg-amber-50 dark:bg-amber-900/20"
                                                        : selectedContactId === contact.id
                                                            ? "bg-amber-50/50 dark:bg-amber-900/10 border-l-2 border-amber-500"
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
                                                        {/* Avatar with optional camera overlay for image upload */}
                                                        <div
                                                            className="relative flex-shrink-0"
                                                            onMouseEnter={() => isExpanded && setHoveringAvatarFor(contact.id)}
                                                            onMouseLeave={() => setHoveringAvatarFor(null)}
                                                            onClick={(e) => {
                                                                if (isExpanded) {
                                                                    e.stopPropagation();
                                                                    imageInputRef.current?.click();
                                                                    // Store the contactId for when file is selected
                                                                    if (imageInputRef.current) {
                                                                        imageInputRef.current.dataset.contactId = contact.id.toString();
                                                                    }
                                                                }
                                                            }}
                                                        >
                                                            {profileImageUrl ? (
                                                                <Image
                                                                    src={contact.custom_profile_image_url || (xp?.profile_image_url?.replace("_normal", "_bigger") || li?.profile_image_url || "")}
                                                                    alt={contact.name}
                                                                    width={40}
                                                                    height={40}
                                                                    className="rounded-full"
                                                                />
                                                            ) : (
                                                                <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                                                                    <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                                                                        {contact.name.charAt(0).toUpperCase()}
                                                                    </span>
                                                                </div>
                                                            )}
                                                            {/* Camera overlay - only show when expanded and hovered or uploading */}
                                                            {isExpanded && (hoveringAvatarFor === contact.id || uploadingImageFor === contact.id) && (
                                                                <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center cursor-pointer">
                                                                    {uploadingImageFor === contact.id ? (
                                                                        <Loader2 className="h-4 w-4 text-white animate-spin" />
                                                                    ) : (
                                                                        <Camera className="h-4 w-4 text-white" />
                                                                    )}
                                                                </div>
                                                            )}
                                                            {/* Touchpoint indicator - subtle dot on bottom right of avatar */}
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleLogTouchpoint(contact.id);
                                                                }}
                                                                disabled={updatingTouchpointFor === contact.id}
                                                                className="absolute -bottom-0 -right-0 w-3 h-3 rounded-full border border-white dark:border-gray-900 bg-gray-400 dark:bg-gray-500 hover:bg-gray-500 dark:hover:bg-gray-400 flex items-center justify-center transition-all hover:scale-110"
                                                                title="Log a touchpoint"
                                                            >
                                                                {updatingTouchpointFor === contact.id && (
                                                                    <Loader2 className="h-1.5 w-1.5 text-white animate-spin" />
                                                                )}
                                                            </button>
                                                        </div>
                                                        {/* Name and handle */}
                                                        {xp ? (
                                                            <a
                                                                href={`https://x.com/${xp.username}`}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                onClick={(e) => e.stopPropagation()}
                                                                className="min-w-0 overflow-hidden hover:opacity-80 transition-opacity"
                                                            >
                                                                <p
                                                                    className="font-medium text-gray-900 dark:text-white truncate text-sm"
                                                                    title={contact.name}
                                                                >
                                                                    {contact.name}
                                                                </p>
                                                                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                                                    @{xp.username}
                                                                </p>
                                                            </a>
                                                        ) : li ? (
                                                            <a
                                                                href={li.linkedin_url}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                onClick={(e) => e.stopPropagation()}
                                                                className="min-w-0 overflow-hidden hover:opacity-80 transition-opacity"
                                                            >
                                                                <p
                                                                    className="font-medium text-gray-900 dark:text-white truncate text-sm"
                                                                    title={contact.name}
                                                                >
                                                                    {contact.name}
                                                                </p>
                                                            </a>
                                                        ) : (
                                                            <div className="min-w-0 overflow-hidden">
                                                                <p
                                                                    className="font-medium text-gray-900 dark:text-white truncate text-sm"
                                                                    title={contact.name}
                                                                >
                                                                    {contact.name}
                                                                </p>
                                                            </div>
                                                        )}
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
                                                                    style={{
                                                                        backgroundColor: `${list.color}20`,
                                                                        color: list.color,
                                                                    }}
                                                                >
                                                                    {list.name}
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
                                                        {selectedContactId === contact.id ? (
                                                            <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                                        ) : (
                                                            <ChevronRight className="h-4 w-4 text-gray-400" />
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Expanded Notes Panel */}
                                                {isExpanded && (
                                                    <div className="bg-gray-50/80 dark:bg-gray-900/40 border-t border-gray-100 dark:border-gray-800 px-4 py-4">
                                                        <div className="max-w-2xl ml-[52px] sm:ml-[52px]">
                                                            {/* Editable Name */}
                                                            <div className="mb-4" onClick={(e) => e.stopPropagation()}>
                                                                {editingNameFor === contact.id ? (
                                                                    <div className="flex items-center gap-2">
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
                                                                            className="flex-1 px-3 py-1.5 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                                                                        />
                                                                        <button
                                                                            onClick={() => handleUpdateName(contact.id)}
                                                                            disabled={!editName.trim() || editNameLoading}
                                                                            className="p-1.5 text-amber-600 hover:text-amber-700 disabled:text-gray-400"
                                                                        >
                                                                            {editNameLoading ? (
                                                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                                            ) : (
                                                                                <Check className="h-4 w-4" />
                                                                            )}
                                                                        </button>
                                                                        <button
                                                                            onClick={() => {
                                                                                setEditingNameFor(null);
                                                                                setEditName("");
                                                                            }}
                                                                            className="p-1.5 text-gray-400 hover:text-gray-600"
                                                                        >
                                                                            <X className="h-4 w-4" />
                                                                        </button>
                                                                    </div>
                                                                ) : (
                                                                    <button
                                                                        onClick={() => {
                                                                            setEditingNameFor(contact.id);
                                                                            setEditName(contact.name);
                                                                        }}
                                                                        className="group flex items-center gap-2 text-sm font-medium text-gray-900 dark:text-white hover:text-amber-600 dark:hover:text-amber-500"
                                                                    >
                                                                        {contact.name}
                                                                        <Pencil className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                                    </button>
                                                                )}
                                                            </div>

                                                            {/* Quick Info - Bio */}
                                                            <div className="mb-2" onClick={(e) => e.stopPropagation()}>
                                                                {editingBioFor === contact.id ? (
                                                                    <div className="flex flex-col gap-2">
                                                                        <textarea
                                                                            value={editBio}
                                                                            onChange={(e) => setEditBio(e.target.value)}
                                                                            onKeyDown={(e) => {
                                                                                if (e.key === "Enter" && !e.shiftKey) {
                                                                                    e.preventDefault();
                                                                                    handleUpdateBio(contact.id);
                                                                                } else if (e.key === "Escape") {
                                                                                    setEditingBioFor(null);
                                                                                    setEditBio("");
                                                                                }
                                                                            }}
                                                                            placeholder="Add a bio..."
                                                                            autoFocus
                                                                            rows={3}
                                                                            className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-none"
                                                                        />
                                                                        <div className="flex gap-2">
                                                                            <button
                                                                                onClick={() => handleUpdateBio(contact.id)}
                                                                                disabled={editBioLoading}
                                                                                className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 disabled:bg-gray-300 dark:disabled:bg-gray-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-1"
                                                                            >
                                                                                {editBioLoading ? (
                                                                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                                                ) : (
                                                                                    <Check className="h-3.5 w-3.5" />
                                                                                )}
                                                                                Save
                                                                            </button>
                                                                            <button
                                                                                onClick={() => {
                                                                                    setEditingBioFor(null);
                                                                                    setEditBio("");
                                                                                }}
                                                                                className="px-3 py-1.5 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 text-sm"
                                                                            >
                                                                                Cancel
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                ) : (
                                                                    <button
                                                                        onClick={() => {
                                                                            setEditBio(contact.custom_bio || xp?.bio || li?.headline || "");
                                                                            setEditingBioFor(contact.id);
                                                                        }}
                                                                        className="group text-left w-full"
                                                                    >
                                                                        {(contact.custom_bio || xp?.bio || li?.headline) ? (
                                                                            <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed flex items-start gap-1.5">
                                                                                <span className="flex-1">{contact.custom_bio || xp?.bio || li?.headline}</span>
                                                                                <Pencil className="h-3 w-3 opacity-0 group-hover:opacity-50 transition-opacity flex-shrink-0 mt-1" />
                                                                            </p>
                                                                        ) : (
                                                                            <p className="text-sm text-gray-400 dark:text-gray-500 italic flex items-center gap-1.5">
                                                                                <span>+ Add bio</span>
                                                                                <Pencil className="h-3 w-3 opacity-0 group-hover:opacity-50 transition-opacity" />
                                                                            </p>
                                                                        )}
                                                                    </button>
                                                                )}
                                                            </div>

                                                            {/* Location - editable */}
                                                            <div className="mb-2" onClick={(e) => e.stopPropagation()}>
                                                                {editingLocationFor === contact.id ? (
                                                                    <div className="flex flex-col gap-2">
                                                                        <div className="flex items-center gap-2 relative">
                                                                            <MapPin className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                                                                            <div className="flex-1 relative">
                                                                                <input
                                                                                    type="text"
                                                                                    value={editLocation}
                                                                                    onChange={(e) => {
                                                                                        setEditLocation(e.target.value);
                                                                                        setLocationSuggestionIndex(0);
                                                                                    }}
                                                                                    onKeyDown={(e) => {
                                                                                        const suggestions = allLocations.filter(loc =>
                                                                                            loc.toLowerCase().includes(editLocation.toLowerCase()) &&
                                                                                            loc.toLowerCase() !== editLocation.toLowerCase()
                                                                                        ).slice(0, 6);

                                                                                        if (e.key === "ArrowDown" && suggestions.length > 0) {
                                                                                            e.preventDefault();
                                                                                            setLocationSuggestionIndex(prev =>
                                                                                                prev < suggestions.length - 1 ? prev + 1 : 0
                                                                                            );
                                                                                        } else if (e.key === "ArrowUp" && suggestions.length > 0) {
                                                                                            e.preventDefault();
                                                                                            setLocationSuggestionIndex(prev =>
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
                                                                                    className="w-full px-2 py-1 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
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
                                                                                                        ? "bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300"
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
                                                                        <div className="flex gap-2 ml-5">
                                                                            <button
                                                                                onClick={() => handleUpdateLocation(contact.id)}
                                                                                disabled={editLocationLoading}
                                                                                className="px-3 py-1 bg-amber-500 hover:bg-amber-600 disabled:bg-gray-300 dark:disabled:bg-gray-700 text-white text-xs font-medium rounded transition-colors flex items-center gap-1"
                                                                            >
                                                                                {editLocationLoading ? (
                                                                                    <Loader2 className="h-3 w-3 animate-spin" />
                                                                                ) : (
                                                                                    <Check className="h-3 w-3" />
                                                                                )}
                                                                                Save
                                                                            </button>
                                                                            <button
                                                                                onClick={() => {
                                                                                    setEditingLocationFor(null);
                                                                                    setEditLocation("");
                                                                                    setLocationSuggestionIndex(0);
                                                                                }}
                                                                                className="px-3 py-1 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 text-xs"
                                                                            >
                                                                                Cancel
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                ) : (
                                                                    <button
                                                                        onClick={() => {
                                                                            setEditLocation(contact.custom_location || xp?.location || li?.location || "");
                                                                            setEditingLocationFor(contact.id);
                                                                        }}
                                                                        className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors group"
                                                                    >
                                                                        <MapPin className="h-3.5 w-3.5" />
                                                                        {(contact.custom_location || xp?.location || li?.location) ? (
                                                                            <span className="flex items-center gap-1">
                                                                                {contact.custom_location || xp?.location || li?.location}
                                                                                <Pencil className="h-3 w-3 opacity-0 group-hover:opacity-50 transition-opacity" />
                                                                            </span>
                                                                        ) : (
                                                                            <span className="text-gray-400 dark:text-gray-500 italic flex items-center gap-1">
                                                                                + Add location
                                                                                <Pencil className="h-3 w-3 opacity-0 group-hover:opacity-50 transition-opacity" />
                                                                            </span>
                                                                        )}
                                                                    </button>
                                                                )}
                                                            </div>

                                                            {/* Links section */}
                                                            <div className="mb-4 flex flex-wrap items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                                                {/* Show existing links */}
                                                                {xp && (
                                                                    <a
                                                                        href={`https://x.com/${xp.username}`}
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                                                                    >
                                                                        <AtSign className="h-3 w-3" />
                                                                        {xp.username}
                                                                    </a>
                                                                )}
                                                                {li && (
                                                                    <a
                                                                        href={li.linkedin_url}
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
                                                                    >
                                                                        <ExternalLink className="h-3 w-3" />
                                                                        LinkedIn
                                                                    </a>
                                                                )}
                                                                {contact.websites.map(website => (
                                                                    <div key={website.id} className="inline-flex items-center gap-0.5 group/website">
                                                                        <a
                                                                            href={website.url.startsWith("http") ? website.url : `https://${website.url}`}
                                                                            target="_blank"
                                                                            rel="noopener noreferrer"
                                                                            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-l-full hover:bg-green-100 dark:hover:bg-green-900/50 transition-colors"
                                                                        >
                                                                            <ExternalLink className="h-3 w-3" />
                                                                            {website.url.replace(/^https?:\/\//, "").replace(/\/$/, "").substring(0, 25)}{website.url.length > 30 ? "..." : ""}
                                                                        </a>
                                                                        <button
                                                                            onClick={async (e) => {
                                                                                e.stopPropagation();
                                                                                const res = await fetch(`/api/rolodex/websites?id=${website.id}`, {
                                                                                    method: "DELETE",
                                                                                    credentials: "include",
                                                                                });
                                                                                if (res.ok) {
                                                                                    setContacts((prev) =>
                                                                                        prev.map((c) =>
                                                                                            c.id === contact.id ? { ...c, websites: c.websites.filter(w => w.id !== website.id) } : c
                                                                                        )
                                                                                    );
                                                                                }
                                                                            }}
                                                                            className="px-1.5 py-1 text-xs bg-green-50 dark:bg-green-900/30 text-green-500 dark:text-green-400 rounded-r-full hover:bg-red-100 dark:hover:bg-red-900/30 hover:text-red-500 dark:hover:text-red-400 transition-colors opacity-0 group-hover/website:opacity-100"
                                                                            title="Remove website"
                                                                        >
                                                                            <X className="h-3 w-3" />
                                                                        </button>
                                                                    </div>
                                                                ))}

                                                                {/* Add link input or button */}
                                                                {addingLinkFor === contact.id ? (
                                                                    <div className="w-full mt-2">
                                                                        <div className="flex gap-2">
                                                                            <input
                                                                                type="text"
                                                                                value={linkInput}
                                                                                onChange={(e) => setLinkInput(e.target.value)}
                                                                                onKeyDown={(e) => {
                                                                                    if (e.key === "Enter" && linkInput.trim()) {
                                                                                        handleAddLink(contact.id);
                                                                                    } else if (e.key === "Escape") {
                                                                                        setAddingLinkFor(null);
                                                                                        setLinkInput("");
                                                                                        setLinkError(null);
                                                                                    }
                                                                                }}
                                                                                placeholder="@handle, linkedin.com/..., or website URL"
                                                                                autoFocus
                                                                                className="flex-1 px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                                                                            />
                                                                            <button
                                                                                onClick={() => handleAddLink(contact.id)}
                                                                                disabled={!linkInput.trim() || linkLoading}
                                                                                className="px-3 py-2 bg-amber-500 hover:bg-amber-600 disabled:bg-gray-300 dark:disabled:bg-gray-700 text-white text-sm font-medium rounded-lg transition-colors"
                                                                            >
                                                                                {linkLoading ? (
                                                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                                                ) : (
                                                                                    "Add"
                                                                                )}
                                                                            </button>
                                                                            <button
                                                                                onClick={() => {
                                                                                    setAddingLinkFor(null);
                                                                                    setLinkInput("");
                                                                                    setLinkError(null);
                                                                                }}
                                                                                className="px-3 py-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 text-sm"
                                                                            >
                                                                                Cancel
                                                                            </button>
                                                                        </div>
                                                                        {linkInput.trim() && (
                                                                            <p className="text-xs text-gray-400 mt-1">
                                                                                Detected: {detectLinkType(linkInput) === "x" ? "X/Twitter" : detectLinkType(linkInput) === "linkedin" ? "LinkedIn" : "Website"}
                                                                            </p>
                                                                        )}
                                                                        {linkError && (
                                                                            <p className="text-sm text-red-500 mt-1">{linkError}</p>
                                                                        )}
                                                                    </div>
                                                                ) : (
                                                                    <button
                                                                        onClick={() => setAddingLinkFor(contact.id)}
                                                                        className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
                                                                    >
                                                                        <Plus className="h-3 w-3" />
                                                                        Add link
                                                                    </button>
                                                                )}
                                                            </div>

                                                            {/* Add Note Input */}
                                                            <div className="relative flex gap-2 mb-4">
                                                                <div className="relative flex-1">
                                                                    {/* Styled overlay for mentions */}
                                                                    <div
                                                                        className="absolute inset-0 px-3 py-2 text-sm pointer-events-none overflow-hidden whitespace-pre-wrap break-words"
                                                                        aria-hidden="true"
                                                                    >
                                                                        {renderInputWithMentions(newNote)}
                                                                    </div>
                                                                    <textarea
                                                                        ref={noteInputRef}
                                                                        value={newNote}
                                                                        onChange={(e) => {
                                                                            handleNoteInputChange(e);
                                                                            // Auto-resize
                                                                            e.target.style.height = 'auto';
                                                                            e.target.style.height = Math.min(e.target.scrollHeight, 200) + 'px';
                                                                        }}
                                                                        onKeyDown={(e) => {
                                                                            // Submit on Enter without shift, allow new lines with Shift+Enter
                                                                            if (e.key === "Enter" && !e.shiftKey && !mentionQuery) {
                                                                                e.preventDefault();
                                                                                if (newNote.trim()) {
                                                                                    handleAddNote(contact.id);
                                                                                }
                                                                            } else {
                                                                                handleNoteKeyDown(e, contact.id);
                                                                            }
                                                                        }}
                                                                        onBlur={() => {
                                                                            // Delay to allow clicking on suggestions
                                                                            setTimeout(() => {
                                                                                setMentionQuery(null);
                                                                                setMentionPosition(null);
                                                                            }, 150);
                                                                        }}
                                                                        onClick={(e) => e.stopPropagation()}
                                                                        placeholder="Add a note... (use @ to mention)"
                                                                        rows={1}
                                                                        className="w-full min-h-[38px] px-3 py-2 text-sm bg-transparent border border-gray-200 dark:border-gray-700 rounded-lg text-transparent caret-black dark:caret-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent relative z-10 resize-none overflow-hidden"
                                                                    />
                                                                    {/* Mention Dropdown */}
                                                                    {mentionQuery !== null && mentionSuggestions.length > 0 && (
                                                                        <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 max-h-48 overflow-y-auto">
                                                                            {mentionSuggestions.map((c, idx) => (
                                                                                <button
                                                                                    key={c.id}
                                                                                    onClick={(e) => {
                                                                                        e.preventDefault();
                                                                                        e.stopPropagation();
                                                                                        insertMention(c);
                                                                                    }}
                                                                                    className={`w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${idx === mentionIndex ? "bg-gray-100 dark:bg-gray-700" : ""
                                                                                        }`}
                                                                                >
                                                                                    {(c.custom_profile_image_url || c.x_profile?.profile_image_url || c.linkedin_profile?.profile_image_url) ? (
                                                                                        <Image
                                                                                            src={c.custom_profile_image_url || c.x_profile?.profile_image_url || c.linkedin_profile?.profile_image_url || ""}
                                                                                            alt={c.name}
                                                                                            width={24}
                                                                                            height={24}
                                                                                            className="rounded-full"
                                                                                        />
                                                                                    ) : (
                                                                                        <div className="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center">
                                                                                            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                                                                                                {c.name.charAt(0).toUpperCase()}
                                                                                            </span>
                                                                                        </div>
                                                                                    )}
                                                                                    <div className="min-w-0">
                                                                                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                                                                            {c.name}
                                                                                        </p>
                                                                                        {c.x_profile?.username && (
                                                                                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                                                                                @{c.x_profile.username}
                                                                                            </p>
                                                                                        )}
                                                                                    </div>
                                                                                </button>
                                                                            ))}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        handleAddNote(contact.id);
                                                                    }}
                                                                    disabled={!newNote.trim() || addingNoteFor === contact.id}
                                                                    className="px-3 py-2 bg-amber-500 hover:bg-amber-600 disabled:bg-gray-300 dark:disabled:bg-gray-700 text-white text-sm font-medium rounded-lg transition-colors"
                                                                >
                                                                    {addingNoteFor === contact.id ? (
                                                                        <Loader2 className="h-4 w-4 animate-spin" />
                                                                    ) : (
                                                                        <Plus className="h-4 w-4" />
                                                                    )}
                                                                </button>
                                                            </div>

                                                            {/* All Notes */}
                                                            {contact.notes.length > 0 ? (
                                                                <div className="space-y-2">
                                                                    {contact.notes.map((note) => (
                                                                        <div
                                                                            key={note.id}
                                                                            className={`group flex items-start gap-3 p-3 rounded-lg border ${note.source_type === "website_analysis" ? "bg-violet-50 dark:bg-violet-900/20 border-violet-100 dark:border-violet-800/30" : "bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700"}`}
                                                                            onClick={(e) => e.stopPropagation()}
                                                                        >
                                                                            {editingNote?.noteId === note.id ? (
                                                                                <div className="flex-1 flex items-center gap-2">
                                                                                    <input
                                                                                        type="text"
                                                                                        value={editNoteText}
                                                                                        onChange={(e) => setEditNoteText(e.target.value)}
                                                                                        onKeyDown={(e) => {
                                                                                            if (e.key === "Enter" && editNoteText.trim()) {
                                                                                                handleEditNote(note.id, contact.id);
                                                                                            } else if (e.key === "Escape") {
                                                                                                setEditingNote(null);
                                                                                                setEditNoteText("");
                                                                                            }
                                                                                        }}
                                                                                        autoFocus
                                                                                        className="flex-1 px-2 py-1 text-sm bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-600 rounded text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                                                                                    />
                                                                                    <button
                                                                                        onClick={() => handleEditNote(note.id, contact.id)}
                                                                                        disabled={!editNoteText.trim() || editNoteLoading}
                                                                                        className="p-1 text-amber-600 hover:text-amber-700 disabled:text-gray-400"
                                                                                    >
                                                                                        {editNoteLoading ? (
                                                                                            <Loader2 className="h-4 w-4 animate-spin" />
                                                                                        ) : (
                                                                                            <Check className="h-4 w-4" />
                                                                                        )}
                                                                                    </button>
                                                                                    <button
                                                                                        onClick={() => {
                                                                                            setEditingNote(null);
                                                                                            setEditNoteText("");
                                                                                        }}
                                                                                        className="p-1 text-gray-400 hover:text-gray-600"
                                                                                    >
                                                                                        <X className="h-4 w-4" />
                                                                                    </button>
                                                                                </div>
                                                                            ) : (
                                                                                <>
                                                                                    <div
                                                                                        className="flex-1 text-sm text-gray-700 dark:text-gray-300 cursor-pointer hover:text-gray-900 dark:hover:text-white"
                                                                                        onClick={() => {
                                                                                            setEditingNote({ noteId: note.id, contactId: contact.id });
                                                                                            setEditNoteText(note.note);
                                                                                        }}
                                                                                    >
                                                                                        {renderNoteWithMentions(note.note)}
                                                                                    </div>
                                                                                    <div className="flex items-center gap-2 flex-shrink-0">
                                                                                        <span className="text-xs text-gray-400">
                                                                                            {formatTimeAgo(note.created_at)}
                                                                                        </span>
                                                                                        {note.source_type === "website_analysis" && (
                                                                                            <span className="text-[10px] font-medium text-violet-500 dark:text-violet-400 bg-violet-100 dark:bg-violet-900/40 px-1.5 py-0.5 rounded">auto</span>
                                                                                        )}
                                                                                        <button
                                                                                            onClick={() => {
                                                                                                setEditingNote({ noteId: note.id, contactId: contact.id });
                                                                                                setEditNoteText(note.note);
                                                                                            }}
                                                                                            className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-amber-500 transition-all"
                                                                                        >
                                                                                            <Pencil className="h-3.5 w-3.5" />
                                                                                        </button>
                                                                                        <button
                                                                                            onClick={() => handleDeleteNote(note.id, contact.id)}
                                                                                            className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 transition-all"
                                                                                        >
                                                                                            <Trash2 className="h-3.5 w-3.5" />
                                                                                        </button>
                                                                                    </div>
                                                                                </>
                                                                            )}
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            ) : null}

                                                            {/* Compliments Section */}
                                                            <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700" onClick={(e) => e.stopPropagation()}>
                                                                <div className="flex items-center justify-between mb-3">
                                                                    <div className="flex items-center gap-2">
                                                                        <Sparkles className="h-4 w-4 text-pink-500" />
                                                                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                                                            Compliments
                                                                        </span>
                                                                        {contact.compliments.length > 0 && (
                                                                            <span className="text-xs text-gray-400">
                                                                                ({contact.compliments.length})
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                    {showComplimentInput !== contact.id && (
                                                                        <button
                                                                            onClick={() => {
                                                                                setShowComplimentInput(contact.id);
                                                                                setNewCompliment("");
                                                                                setNewComplimentContext("");
                                                                            }}
                                                                            className="text-xs text-pink-500 hover:text-pink-600 dark:text-pink-400 dark:hover:text-pink-300 flex items-center gap-1"
                                                                        >
                                                                            <Plus className="h-3 w-3" />
                                                                            Add
                                                                        </button>
                                                                    )}
                                                                </div>

                                                                {/* Add Compliment Input */}
                                                                {showComplimentInput === contact.id && (
                                                                    <div className="mb-4 p-3 bg-gradient-to-r from-pink-50 to-rose-50 dark:from-pink-950/30 dark:to-rose-950/30 rounded-lg border border-pink-100 dark:border-pink-900/50">
                                                                        <textarea
                                                                            value={newCompliment}
                                                                            onChange={(e) => setNewCompliment(e.target.value)}
                                                                            placeholder="What nice thing did they say? ✨"
                                                                            rows={2}
                                                                            className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-pink-200 dark:border-pink-800 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent resize-none"
                                                                        />
                                                                        <input
                                                                            type="text"
                                                                            value={newComplimentContext}
                                                                            onChange={(e) => setNewComplimentContext(e.target.value)}
                                                                            placeholder="Context (optional): at coffee, on Twitter, in meeting..."
                                                                            className="w-full mt-2 px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-pink-200 dark:border-pink-800 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                                                                        />
                                                                        <div className="flex justify-end gap-2 mt-3">
                                                                            <button
                                                                                onClick={() => {
                                                                                    setShowComplimentInput(null);
                                                                                    setNewCompliment("");
                                                                                    setNewComplimentContext("");
                                                                                }}
                                                                                className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                                                                            >
                                                                                Cancel
                                                                            </button>
                                                                            <button
                                                                                onClick={() => handleAddCompliment(contact.id)}
                                                                                disabled={!newCompliment.trim() || addingComplimentFor === contact.id}
                                                                                className="px-4 py-1.5 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 disabled:from-gray-300 disabled:to-gray-300 dark:disabled:from-gray-700 dark:disabled:to-gray-700 text-white text-sm font-medium rounded-lg transition-all"
                                                                            >
                                                                                {addingComplimentFor === contact.id ? (
                                                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                                                ) : (
                                                                                    "Save"
                                                                                )}
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                )}

                                                                {/* Compliments List */}
                                                                {contact.compliments.length > 0 ? (
                                                                    <div className="space-y-2">
                                                                        {contact.compliments.map((comp) => (
                                                                            <div
                                                                                key={comp.id}
                                                                                className="group p-3 bg-gradient-to-r from-pink-50/50 to-rose-50/50 dark:from-pink-950/20 dark:to-rose-950/20 rounded-lg border border-pink-100 dark:border-pink-900/30"
                                                                            >
                                                                                {editingCompliment?.complimentId === comp.id ? (
                                                                                    <div className="space-y-2">
                                                                                        <textarea
                                                                                            value={editComplimentText}
                                                                                            onChange={(e) => setEditComplimentText(e.target.value)}
                                                                                            rows={2}
                                                                                            autoFocus
                                                                                            className="w-full px-2 py-1.5 text-sm bg-white dark:bg-gray-800 border border-pink-200 dark:border-pink-800 rounded text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-pink-500 resize-none"
                                                                                        />
                                                                                        <input
                                                                                            type="text"
                                                                                            value={editComplimentContext}
                                                                                            onChange={(e) => setEditComplimentContext(e.target.value)}
                                                                                            placeholder="Context (optional)"
                                                                                            className="w-full px-2 py-1.5 text-sm bg-white dark:bg-gray-800 border border-pink-200 dark:border-pink-800 rounded text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-pink-500"
                                                                                        />
                                                                                        <div className="flex justify-end gap-2">
                                                                                            <button
                                                                                                onClick={() => {
                                                                                                    setEditingCompliment(null);
                                                                                                    setEditComplimentText("");
                                                                                                    setEditComplimentContext("");
                                                                                                }}
                                                                                                className="p-1 text-gray-400 hover:text-gray-600"
                                                                                            >
                                                                                                <X className="h-4 w-4" />
                                                                                            </button>
                                                                                            <button
                                                                                                onClick={() => handleEditCompliment(comp.id, contact.id)}
                                                                                                disabled={!editComplimentText.trim() || editComplimentLoading}
                                                                                                className="p-1 text-pink-600 hover:text-pink-700 disabled:text-gray-400"
                                                                                            >
                                                                                                {editComplimentLoading ? (
                                                                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                                                                ) : (
                                                                                                    <Check className="h-4 w-4" />
                                                                                                )}
                                                                                            </button>
                                                                                        </div>
                                                                                    </div>
                                                                                ) : (
                                                                                    <>
                                                                                        <p className="text-sm text-gray-700 dark:text-gray-300 italic">
                                                                                            &ldquo;{comp.compliment}&rdquo;
                                                                                        </p>
                                                                                        <div className="flex items-center justify-between mt-2">
                                                                                            <div className="flex items-center gap-2 text-xs text-gray-400">
                                                                                                {comp.context && (
                                                                                                    <span className="text-pink-500/70 dark:text-pink-400/70">
                                                                                                        {comp.context}
                                                                                                    </span>
                                                                                                )}
                                                                                                {comp.context && <span>•</span>}
                                                                                                <span>{formatTimeAgo(comp.created_at)}</span>
                                                                                            </div>
                                                                                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                                                <button
                                                                                                    onClick={() => {
                                                                                                        setEditingCompliment({ complimentId: comp.id, contactId: contact.id });
                                                                                                        setEditComplimentText(comp.compliment);
                                                                                                        setEditComplimentContext(comp.context || "");
                                                                                                    }}
                                                                                                    className="p-1 text-gray-400 hover:text-pink-500 transition-colors"
                                                                                                >
                                                                                                    <Pencil className="h-3.5 w-3.5" />
                                                                                                </button>
                                                                                                <button
                                                                                                    onClick={() => handleDeleteCompliment(comp.id, contact.id)}
                                                                                                    className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                                                                                                >
                                                                                                    <Trash2 className="h-3.5 w-3.5" />
                                                                                                </button>
                                                                                            </div>
                                                                                        </div>
                                                                                    </>
                                                                                )}
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                ) : showComplimentInput !== contact.id ? (
                                                                    <p className="text-xs text-gray-400 dark:text-gray-500 italic">
                                                                        No compliments recorded yet. Add the nice things they&apos;ve said! 💝
                                                                    </p>
                                                                ) : null}
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                            </div>
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
        </div>
    );
}
