"use client";

import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
    ArrowLeft,
    MessageSquare,
    Search,
    Check,
    X,
    Loader2,
    Link2,
    Phone,
    Mail,
    ChevronDown,
    UserPlus,
    Bot,
    Eye,
    EyeOff,
    Trash2,
    Sparkles,
    Calendar,
    RefreshCw,
    Plus,
    Camera,
    User,
    ArrowRight,
    Wand2,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { smartCropImageToSquare } from "@/lib/smart-image-crop";

type SettingsTab = "profile" | "ai" | "imessage" | "calendar";


interface PreviewMessage {
    message_text: string;
    is_from_me: boolean;
    message_date: string;
}

interface UnmatchedHandle {
    handle_id: string;
    contact_name: string | null;
    message_count: number;
}

interface RolodexContact {
    id: number;
    name: string;
    custom_profile_image_url: string | null;
    x_profile: { profile_image_url: string | null; username: string } | null;
    linkedin_profile: { profile_image_url: string | null } | null;
    last_touchpoint: string | null;
}

interface GoogleAccount {
    id: number;
    google_email: string;
    google_name: string | null;
    last_sync_at: string | null;
    created_at: string;
}

interface CalendarWatch {
    id: number;
    google_oauth_id: number;
    expiration: string;
}

interface UnmatchedCalendarAttendee {
    attendee_email: string;
    attendee_name: string | null;
    event_count: number;
    latest_event: string;
}

interface CalendarMatchSuggestion {
    attendee_email: string;
    attendee_name: string | null;
    event_count: number;
    action: "match" | "create" | "skip" | "me";
    matched_contact_id?: number;
    matched_contact_name?: string;
    confidence: "high" | "medium" | "low";
    reason: string;
    suggested_name?: string;
}

export default function SettingsPage() {
    const [unmatched, setUnmatched] = useState<UnmatchedHandle[]>([]);
    const [contacts, setContacts] = useState<RolodexContact[]>([]);
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<{ email?: string; fullName?: string; avatarUrl?: string | null; customAvatarUrl?: string | null } | null>(null);

    // Profile/Avatar state
    const [uploadingAvatar, setUploadingAvatar] = useState(false);
    const avatarInputRef = useRef<HTMLInputElement>(null);

    // Linked emails state
    const [linkedEmails, setLinkedEmails] = useState<string[]>([]);
    const [newLinkedEmail, setNewLinkedEmail] = useState("");
    const [linkedEmailsSaving, setLinkedEmailsSaving] = useState(false);

    // Apple contact images: handle_id -> data URI
    const [appleImages, setAppleImages] = useState<Record<string, string>>({});

    // Per-row matching state
    const [activeMatch, setActiveMatch] = useState<string | null>(null);
    const [matchSearch, setMatchSearch] = useState("");
    const [matchLoading, setMatchLoading] = useState<string | null>(null);
    const [recentlyLinked, setRecentlyLinked] = useState<Set<string>>(new Set());

    // Create new contact state
    const [creatingFor, setCreatingFor] = useState<string | null>(null);
    const [newContactName, setNewContactName] = useState("");
    const [createLoading, setCreateLoading] = useState(false);

    // Message preview state
    const [expandedHandle, setExpandedHandle] = useState<string | null>(null);
    const [previewMessages, setPreviewMessages] = useState<PreviewMessage[]>([]);
    const [previewLoading, setPreviewLoading] = useState(false);

    // AI Provider settings state
    const [aiProvider, setAiProvider] = useState<string>("anthropic");
    const [aiApiKey, setAiApiKey] = useState("");
    const [aiMaskedKey, setAiMaskedKey] = useState<string | null>(null);
    const [aiHasKey, setAiHasKey] = useState(false);
    const [aiShowKey, setAiShowKey] = useState(false);
    const [aiSaving, setAiSaving] = useState(false);
    const [aiSaved, setAiSaved] = useState(false);
    const [aiLoadingSettings, setAiLoadingSettings] = useState(true);

    // Active settings tab
    const searchParams = useSearchParams();
    const [activeTab, setActiveTab] = useState<SettingsTab>(() => {
        const tab = searchParams.get("tab");
        if (tab === "profile" || tab === "calendar" || tab === "imessage" || tab === "ai") {
            return tab;
        }
        return "profile";
    });

    // Google Calendar state
    const [googleAccounts, setGoogleAccounts] = useState<GoogleAccount[]>([]);
    const [calendarLoading, setCalendarLoading] = useState(true);
    const [calendarSyncing, setCalendarSyncing] = useState<number | null>(null);
    const [calendarConnecting, setCalendarConnecting] = useState(false);
    const [unmatchedCalendar, setUnmatchedCalendar] = useState<UnmatchedCalendarAttendee[]>([]);
    const [activeCalendarMatch, setActiveCalendarMatch] = useState<string | null>(null);
    const [calendarMatchSearch, setCalendarMatchSearch] = useState("");
    const [calendarMatchLoading, setCalendarMatchLoading] = useState<{ email: string; contactId: number } | null>(null);
    const [calendarRecentlyLinked, setCalendarRecentlyLinked] = useState<Set<string>>(new Set());
    const [calendarCreatingFor, setCalendarCreatingFor] = useState<string | null>(null);
    const [calendarNewContactName, setCalendarNewContactName] = useState("");
    const [calendarCreateLoading, setCalendarCreateLoading] = useState(false);
    const [calendarWatches, setCalendarWatches] = useState<CalendarWatch[]>([]);

    // LLM suggestion state
    const [calendarSuggestions, setCalendarSuggestions] = useState<CalendarMatchSuggestion[]>([]);
    const [suggestionsLoading, setSuggestionsLoading] = useState(false);
    const [suggestionsError, setSuggestionsError] = useState<string | null>(null);
    const [acceptingEmail, setAcceptingEmail] = useState<string | null>(null);

    const autoSuggestRef = useRef(false);

    const dropdownRef = useRef<HTMLDivElement>(null);
    const calendarDropdownRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);
    const createInputRef = useRef<HTMLInputElement>(null);
    const previewScrollRef = useRef<HTMLDivElement>(null);

    const fetchData = useCallback(async () => {
        try {
            const [unmatchedRes, contactsRes] = await Promise.all([
                fetch("/api/rolodex/imessage-unmatched", { credentials: "include" }),
                fetch("/api/rolodex/contacts", { credentials: "include" }),
            ]);
            const unmatchedData = await unmatchedRes.json();
            const contactsData = await contactsRes.json();

            if (unmatchedData.unmatched) setUnmatched(unmatchedData.unmatched);
            if (contactsData.contacts) setContacts(contactsData.contacts);

            // Use server-side handle images (uploaded by Electron during sync)
            if (unmatchedData.handleImages) {
                setAppleImages(unmatchedData.handleImages);
            }
        } catch (err) {
            console.error("Failed to fetch data:", err);
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchAiSettings = useCallback(async () => {
        try {
            const res = await fetch("/api/user/ai-settings", { credentials: "include" });
            const data = await res.json();
            if (data.provider) setAiProvider(data.provider);
            if (data.hasApiKey) setAiHasKey(true);
            if (data.maskedKey) setAiMaskedKey(data.maskedKey);
        } catch (err) {
            console.error("Failed to fetch AI settings:", err);
        } finally {
            setAiLoadingSettings(false);
        }
    }, []);

    const fetchCalendarData = useCallback(async () => {
        try {
            const [accountsRes, unmatchedRes, watchesRes] = await Promise.all([
                fetch("/api/google-calendar/accounts", { credentials: "include" }),
                fetch("/api/google-calendar/unmatched", { credentials: "include" }),
                fetch("/api/google-calendar/watch", { credentials: "include" }),
            ]);
            const accountsData = await accountsRes.json();
            const unmatchedData = await unmatchedRes.json();
            const watchesData = await watchesRes.json();
            if (accountsData.accounts) {
                setGoogleAccounts(accountsData.accounts);
                // Auto-add connected calendar emails to linked emails
                const calendarEmails = (accountsData.accounts as GoogleAccount[])
                    .map((a: GoogleAccount) => a.google_email.toLowerCase().trim())
                    .filter(Boolean);
                if (calendarEmails.length > 0) {
                    setLinkedEmails(prev => {
                        const combined = [...new Set([...prev, ...calendarEmails])];
                        if (combined.length > prev.length) {
                            // Save the new list (fire and forget)
                            fetch("/api/user/profile", {
                                method: "PATCH",
                                headers: { "Content-Type": "application/json" },
                                credentials: "include",
                                body: JSON.stringify({ linked_emails: combined }),
                            }).catch(() => {});
                            return combined;
                        }
                        return prev;
                    });
                }
            }
            if (unmatchedData.unmatched) {
                setUnmatchedCalendar(unmatchedData.unmatched);
                // Auto-trigger AI matching if there are unmatched attendees
                if (unmatchedData.unmatched.length > 0) {
                    autoSuggestRef.current = true;
                }
            }
            if (watchesData.watches) setCalendarWatches(watchesData.watches);
        } catch (err) {
            console.error("Failed to fetch calendar data:", err);
        } finally {
            setCalendarLoading(false);
        }
    }, []);

    const handleConnectGoogle = async () => {
        setCalendarConnecting(true);
        try {
            const res = await fetch("/api/google-calendar/auth", { credentials: "include" });
            const data = await res.json();
            if (data.authUrl) {
                window.location.href = data.authUrl;
            } else {
                console.error("No auth URL returned:", data);
                setCalendarConnecting(false);
            }
        } catch (err) {
            console.error("Failed to initiate Google auth:", err);
            setCalendarConnecting(false);
        }
    };

    const handleDisconnectGoogle = async (accountId: number) => {
        try {
            const res = await fetch(`/api/google-calendar/accounts?id=${accountId}`, {
                method: "DELETE",
                credentials: "include",
            });
            if (res.ok) {
                setGoogleAccounts(prev => prev.filter(a => a.id !== accountId));
                fetchCalendarData();  // Refresh unmatched
            }
        } catch (err) {
            console.error("Failed to disconnect Google:", err);
        }
    };

    const handleSyncCalendar = async (accountId: number) => {
        setCalendarSyncing(accountId);
        try {
            const res = await fetch("/api/google-calendar/sync", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ accountId }),
            });
            const data = await res.json();
            if (data.retry) {
                // Sync token expired, retry
                await handleSyncCalendar(accountId);
                return;
            }
            if (res.ok) {
                // Refresh accounts to update last_sync_at
                fetchCalendarData();
            }
        } catch (err) {
            console.error("Failed to sync calendar:", err);
        } finally {
            setCalendarSyncing(null);
        }
    };

    const handleCalendarLink = async (attendeeEmail: string, peopleId: number) => {
        setCalendarMatchLoading({ email: attendeeEmail, contactId: peopleId });
        try {
            const res = await fetch("/api/google-calendar/unmatched", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ attendee_email: attendeeEmail, people_id: peopleId }),
            });
            if (res.ok) {
                setCalendarRecentlyLinked(prev => new Set(prev).add(attendeeEmail));
                setTimeout(() => {
                    setUnmatchedCalendar(prev => prev.filter(u => u.attendee_email !== attendeeEmail));
                    setCalendarRecentlyLinked(prev => {
                        const next = new Set(prev);
                        next.delete(attendeeEmail);
                        return next;
                    });
                }, 600);
            }
        } catch (err) {
            console.error("Failed to link calendar attendee:", err);
        } finally {
            setCalendarMatchLoading(null);
            setActiveCalendarMatch(null);
            setCalendarMatchSearch("");
        }
    };

    const handleCalendarCreateAndLink = async (attendeeEmail: string) => {
        if (!calendarNewContactName.trim()) return;
        setCalendarCreateLoading(true);
        try {
            const res = await fetch("/api/google-calendar/unmatched", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ attendee_email: attendeeEmail, name: calendarNewContactName.trim() }),
            });
            if (res.ok) {
                setCalendarRecentlyLinked(prev => new Set(prev).add(attendeeEmail));
                setTimeout(() => {
                    setUnmatchedCalendar(prev => prev.filter(u => u.attendee_email !== attendeeEmail));
                    setCalendarRecentlyLinked(prev => {
                        const next = new Set(prev);
                        next.delete(attendeeEmail);
                        return next;
                    });
                }, 600);
            }
        } catch (err) {
            console.error("Failed to create and link:", err);
        } finally {
            setCalendarCreateLoading(false);
            setCalendarCreatingFor(null);
            setCalendarNewContactName("");
        }
    };

    const handleSuggestMatches = async () => {
        setSuggestionsLoading(true);
        setSuggestionsError(null);
        setCalendarSuggestions([]);
        try {
            const res = await fetch("/api/google-calendar/unmatched/suggest", {
                method: "POST",
                credentials: "include",
            });
            const data = await res.json();
            if (data.error) {
                setSuggestionsError(data.error);
            } else if (data.suggestions) {
                setCalendarSuggestions(data.suggestions);
            }
        } catch (err) {
            console.error("Failed to get suggestions:", err);
            setSuggestionsError("Failed to generate suggestions");
        } finally {
            setSuggestionsLoading(false);
        }
    };

    const handleAcceptSuggestion = async (suggestion: CalendarMatchSuggestion) => {
        setAcceptingEmail(suggestion.attendee_email);
        try {
            if (suggestion.action === "me") {
                // Mark as user's own email
                await handleMarkAsMe(suggestion.attendee_email);
            } else if (suggestion.action === "match" && suggestion.matched_contact_id) {
                // Link to existing contact
                await handleCalendarLink(suggestion.attendee_email, suggestion.matched_contact_id);
            } else if (suggestion.action === "create" && suggestion.suggested_name) {
                // Create new contact and link
                const res = await fetch("/api/google-calendar/unmatched", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    credentials: "include",
                    body: JSON.stringify({
                        attendee_email: suggestion.attendee_email,
                        name: suggestion.suggested_name,
                    }),
                });
                if (res.ok) {
                    setCalendarRecentlyLinked(prev => new Set(prev).add(suggestion.attendee_email));
                    setTimeout(() => {
                        setUnmatchedCalendar(prev => prev.filter(u => u.attendee_email !== suggestion.attendee_email));
                        setCalendarRecentlyLinked(prev => {
                            const next = new Set(prev);
                            next.delete(suggestion.attendee_email);
                            return next;
                        });
                    }, 600);
                }
            }
            // Remove from suggestions
            setCalendarSuggestions(prev => prev.filter(s => s.attendee_email !== suggestion.attendee_email));
        } catch (err) {
            console.error("Failed to accept suggestion:", err);
        } finally {
            setAcceptingEmail(null);
        }
    };

    const handleDismissSuggestion = (email: string) => {
        setCalendarSuggestions(prev => prev.filter(s => s.attendee_email !== email));
    };

    const handleAcceptAllSuggestions = async () => {
        const actionable = calendarSuggestions.filter(s => s.action !== "skip");
        for (const suggestion of actionable) {
            await handleAcceptSuggestion(suggestion);
        }
        // Clear remaining skips
        setCalendarSuggestions([]);
    };

    const handleSaveAiSettings = async () => {
        setAiSaving(true);
        setAiSaved(false);
        try {
            const body: Record<string, string> = { provider: aiProvider };
            if (aiApiKey.trim()) body.apiKey = aiApiKey.trim();
            const res = await fetch("/api/user/ai-settings", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify(body),
            });
            if (res.ok) {
                setAiSaved(true);
                setAiHasKey(true);
                if (aiApiKey.trim()) {
                    setAiMaskedKey("••••••••" + aiApiKey.trim().slice(-4));
                    setAiApiKey("");
                }
                setTimeout(() => setAiSaved(false), 2000);
            }
        } catch (err) {
            console.error("Failed to save AI settings:", err);
        } finally {
            setAiSaving(false);
        }
    };

    const handleDeleteAiSettings = async () => {
        try {
            const res = await fetch("/api/user/ai-settings", { method: "DELETE", credentials: "include" });
            if (res.ok) {
                setAiProvider("anthropic");
                setAiApiKey("");
                setAiMaskedKey(null);
                setAiHasKey(false);
            }
        } catch (err) {
            console.error("Failed to delete AI settings:", err);
        }
    };

    const handleAvatarUpload = async (file: File) => {
        setUploadingAvatar(true);

        try {
            const croppedFile = await smartCropImageToSquare(file);
            const formData = new FormData();
            formData.append("file", croppedFile);

            const res = await fetch("/api/user/profile", {
                method: "POST",
                credentials: "include",
                body: formData,
            });

            const data = await res.json();

            if (!res.ok) {
                console.error("Error uploading avatar:", data.error);
                alert(`Failed to upload avatar: ${data.error}`);
                return;
            }

            // Update local state with the new avatar URL
            setUser((prev) => prev ? { ...prev, customAvatarUrl: data.avatarUrl } : null);
        } catch (error) {
            console.error("Error uploading avatar:", error);
            alert("Failed to upload avatar. Please try again.");
        } finally {
            setUploadingAvatar(false);
        }
    };

    const saveLinkedEmails = async (emails: string[]) => {
        setLinkedEmailsSaving(true);
        try {
            const res = await fetch("/api/user/profile", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ linked_emails: emails }),
            });
            if (res.ok) {
                setLinkedEmails(emails);
            }
        } catch (err) {
            console.error("Failed to save linked emails:", err);
        } finally {
            setLinkedEmailsSaving(false);
        }
    };

    const handleAddLinkedEmail = () => {
        const email = newLinkedEmail.toLowerCase().trim();
        if (!email || !email.includes("@")) return;
        if (linkedEmails.includes(email)) { setNewLinkedEmail(""); return; }
        const updated = [...linkedEmails, email];
        setNewLinkedEmail("");
        saveLinkedEmails(updated);
    };

    const handleRemoveLinkedEmail = (email: string) => {
        saveLinkedEmails(linkedEmails.filter(e => e !== email));
    };

    const handleMarkAsMe = async (email: string) => {
        const normalized = email.toLowerCase().trim();
        if (linkedEmails.includes(normalized)) return;
        await saveLinkedEmails([...linkedEmails, normalized]);
        // Remove from unmatched list and suggestions
        setUnmatchedCalendar(prev => prev.filter(u => u.attendee_email.toLowerCase() !== normalized));
        setCalendarSuggestions(prev => prev.filter(s => s.attendee_email.toLowerCase() !== normalized));
    };

    useEffect(() => {
        const supabase = createClient();
        supabase.auth.getUser().then(async ({ data }) => {
            if (data.user) {
                // Fetch custom profile avatar
                let customAvatarUrl: string | null = null;
                try {
                    const profileRes = await fetch("/api/user/profile", { credentials: "include" });
                    if (profileRes.ok) {
                        const { profile } = await profileRes.json();
                        customAvatarUrl = profile?.avatar_url || null;
                        // Seed linked emails with auth email + any saved ones
                        const saved = profile?.linked_emails || [];
                        const authEmail = data.user.email?.toLowerCase().trim();
                        if (authEmail && !saved.includes(authEmail)) {
                            const withAuth = [authEmail, ...saved];
                            setLinkedEmails(withAuth);
                            // Persist
                            fetch("/api/user/profile", {
                                method: "PATCH",
                                headers: { "Content-Type": "application/json" },
                                credentials: "include",
                                body: JSON.stringify({ linked_emails: withAuth }),
                            }).catch(() => {});
                        } else {
                            setLinkedEmails(saved);
                        }
                    }
                } catch (e) {
                    console.error("Error fetching user profile:", e);
                }

                setUser({
                    email: data.user.email,
                    fullName: data.user.user_metadata?.full_name,
                    avatarUrl: data.user.user_metadata?.avatar_url || data.user.user_metadata?.picture || null,
                    customAvatarUrl,
                });
            }
        });
        fetchData();
        fetchAiSettings();
        fetchCalendarData();
    }, [fetchData, fetchAiSettings, fetchCalendarData]);

    // Close dropdown on outside click
    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setActiveMatch(null);
                setMatchSearch("");
            }
        };
        document.addEventListener("mousedown", handleClick);
        return () => document.removeEventListener("mousedown", handleClick);
    }, []);

    // Focus search when dropdown opens
    useEffect(() => {
        if (activeMatch && searchInputRef.current) {
            searchInputRef.current.focus();
        }
    }, [activeMatch]);

    // Focus name input when creating
    useEffect(() => {
        if (creatingFor && createInputRef.current) {
            createInputRef.current.focus();
        }
    }, [creatingFor]);

    // Auto-trigger AI suggestions when calendar data loads with unmatched attendees
    useEffect(() => {
        if (!calendarLoading && autoSuggestRef.current) {
            autoSuggestRef.current = false;
            handleSuggestMatches();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [calendarLoading]);

    const handleLink = async (handleId: string, peopleId: number) => {
        if (matchLoading) return; // Prevent double-click
        setMatchLoading(handleId);
        try {
            const body: Record<string, unknown> = { handle_id: handleId, people_id: peopleId };

            const res = await fetch("/api/rolodex/imessage-unmatched", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify(body),
            });
            if (res.ok) {
                if (expandedHandle === handleId) { setExpandedHandle(null); setPreviewMessages([]); }
                markLinked(handleId);
            }
        } catch (err) {
            console.error("Failed to link:", err);
        } finally {
            setMatchLoading(null);
            setActiveMatch(null);
            setMatchSearch("");
        }
    };

    const handleCreateAndLink = async (handleId: string) => {
        if (!newContactName.trim() || createLoading) return; // Prevent double-click
        setCreateLoading(true);
        try {
            const body: Record<string, unknown> = {
                handle_id: handleId,
                name: newContactName.trim(),
            };

            const res = await fetch("/api/rolodex/imessage-unmatched", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify(body),
            });
            if (res.ok) {
                if (expandedHandle === handleId) { setExpandedHandle(null); setPreviewMessages([]); }
                markLinked(handleId);
            }
        } catch (err) {
            console.error("Failed to create:", err);
        } finally {
            setCreateLoading(false);
            setCreatingFor(null);
            setNewContactName("");
        }
    };

    const markLinked = (handleId: string) => {
        setRecentlyLinked(prev => new Set(prev).add(handleId));
        setTimeout(() => {
            setUnmatched(prev => prev.filter(u => u.handle_id !== handleId));
            setRecentlyLinked(prev => {
                const next = new Set(prev);
                next.delete(handleId);
                return next;
            });
        }, 600);
    };

    const handleDismiss = (handleId: string) => {
        setRecentlyLinked(prev => new Set(prev).add(handleId));
        setTimeout(() => {
            setUnmatched(prev => prev.filter(u => u.handle_id !== handleId));
            setRecentlyLinked(prev => {
                const next = new Set(prev);
                next.delete(handleId);
                return next;
            });
        }, 300);
    };

    const togglePreview = async (handleId: string) => {
        if (expandedHandle === handleId) {
            setExpandedHandle(null);
            setPreviewMessages([]);
            return;
        }
        setExpandedHandle(handleId);
        setPreviewLoading(true);
        setPreviewMessages([]);
        try {
            const res = await fetch(`/api/rolodex/imessage-preview?handle_id=${encodeURIComponent(handleId)}`, {
                credentials: "include",
            });
            if (res.ok) {
                const data = await res.json();
                setPreviewMessages(data.messages || []);
            }
        } catch (err) {
            console.error("Failed to fetch message preview:", err);
        } finally {
            setPreviewLoading(false);
        }
    };

    // Scroll preview to bottom when messages load
    useEffect(() => {
        if (previewMessages.length > 0 && previewScrollRef.current) {
            previewScrollRef.current.scrollTop = previewScrollRef.current.scrollHeight;
        }
    }, [previewMessages]);

    const formatHandle = (handle: string) => {
        if (handle.includes("@")) return handle;
        const cleaned = handle.replace(/[^+\d]/g, "");
        return cleaned.replace(/^\+?1?(\d{3})(\d{3})(\d{4})$/, "+1 ($1) $2-$3")
            .replace(/^\+(\d{1,3})(\d{3})(\d{3})(\d{4})$/, "+$1 ($2) $3-$4");
    };

    const isPhone = (handle: string) => !handle.includes("@");

    const filteredContacts = useMemo(() => {
        const sorted = [...contacts].sort((a, b) => {
            if (!a.last_touchpoint && !b.last_touchpoint) return 0;
            if (!a.last_touchpoint) return 1;
            if (!b.last_touchpoint) return -1;
            return new Date(b.last_touchpoint).getTime() - new Date(a.last_touchpoint).getTime();
        });
        return matchSearch
            ? sorted.filter(c => c.name.toLowerCase().includes(matchSearch.toLowerCase()))
            : sorted;
    }, [matchSearch, contacts]);

    return (
        <div className="min-h-screen bg-white dark:bg-black">
            {/* Header */}
            <header className="sticky top-0 z-40 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800">
                <div className="flex items-center gap-4 px-4 sm:px-8 py-3">
                    <Link
                        href="/app/rolodex"
                        className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Back to Rolodex
                    </Link>
                </div>
            </header>

            <div className="flex min-h-[calc(100vh-57px)]">
                {/* Left Sidebar - Full height, fixed to left */}
                <nav className="w-56 flex-shrink-0 border-r border-gray-100 dark:border-gray-800 px-4 py-6 space-y-1">
                    <button
                        onClick={() => setActiveTab("profile")}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                            activeTab === "profile"
                                ? "bg-gray-900 dark:bg-white text-white dark:text-gray-900"
                                : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                        }`}
                    >
                        <User className="h-4 w-4" />
                        Profile
                    </button>
                    <button
                        onClick={() => setActiveTab("ai")}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                            activeTab === "ai"
                                ? "bg-gray-900 dark:bg-white text-white dark:text-gray-900"
                                : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                        }`}
                    >
                        <Sparkles className="h-4 w-4" />
                        AI Agent
                    </button>
                    <button
                        onClick={() => setActiveTab("imessage")}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                            activeTab === "imessage"
                                ? "bg-gray-900 dark:bg-white text-white dark:text-gray-900"
                                : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                        }`}
                    >
                        <MessageSquare className="h-4 w-4" />
                        iMessage
                    </button>
                    <button
                        onClick={() => setActiveTab("calendar")}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                            activeTab === "calendar"
                                ? "bg-gray-900 dark:bg-white text-white dark:text-gray-900"
                                : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                        }`}
                    >
                        <Calendar className="h-4 w-4" />
                        Calendar
                    </button>
                </nav>

                {/* Content Area */}
                <div className="flex-1 min-w-0 px-8 py-6">
                        {/* Profile Settings */}
                        {activeTab === "profile" && (
                            <section>
                                <div className="mb-6">
                                    <h2 className="text-lg font-medium text-gray-900 dark:text-white">
                                        Profile
                                    </h2>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                        Manage your account profile and avatar.
                                    </p>
                                </div>

                                <div className="space-y-6">
                                    {/* Avatar Upload */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                                            Profile Photo
                                        </label>
                                        <div className="flex items-center gap-6">
                                            {/* Avatar Preview */}
                                            <div className="relative group">
                                                <div className="w-24 h-24 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                                                    {(user?.customAvatarUrl || user?.avatarUrl) ? (
                                                        <Image
                                                            src={user.customAvatarUrl || user.avatarUrl || ""}
                                                            alt={user?.fullName || "Profile"}
                                                            width={96}
                                                            height={96}
                                                            unoptimized
                                                            className="w-full h-full object-cover"
                                                        />
                                                    ) : (
                                                        <span className="text-2xl font-medium text-gray-400 dark:text-gray-500">
                                                            {user?.fullName?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || "?"}
                                                        </span>
                                                    )}
                                                </div>
                                                {uploadingAvatar && (
                                                    <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
                                                        <Loader2 className="h-6 w-6 animate-spin text-white" />
                                                    </div>
                                                )}
                                            </div>

                                            {/* Upload Button */}
                                            <div>
                                                <input
                                                    ref={avatarInputRef}
                                                    type="file"
                                                    accept="image/jpeg,image/png,image/webp,image/gif"
                                                    className="hidden"
                                                    onChange={(e) => {
                                                        const file = e.target.files?.[0];
                                                        if (file) {
                                                            handleAvatarUpload(file);
                                                        }
                                                    }}
                                                />
                                                <button
                                                    onClick={() => avatarInputRef.current?.click()}
                                                    disabled={uploadingAvatar}
                                                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
                                                >
                                                    <Camera className="h-4 w-4" />
                                                    {uploadingAvatar ? "Uploading..." : "Change photo"}
                                                </button>
                                                <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                                                    JPG, PNG or GIF. Max 5MB.
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Account Info (read-only) */}
                                    <div className="pt-4 border-t border-gray-100 dark:border-gray-800">
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                                            Account
                                        </label>
                                        <div className="space-y-3">
                                            {user?.fullName && (
                                                <div>
                                                    <p className="text-xs text-gray-400 dark:text-gray-500">Name</p>
                                                    <p className="text-sm text-gray-900 dark:text-white">{user.fullName}</p>
                                                </div>
                                            )}
                                            {user?.email && (
                                                <div>
                                                    <p className="text-xs text-gray-400 dark:text-gray-500">Email</p>
                                                    <p className="text-sm text-gray-900 dark:text-white">{user.email}</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Linked Emails */}
                                    <div className="pt-4 border-t border-gray-100 dark:border-gray-800">
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            My Email Addresses
                                        </label>
                                        <p className="text-xs text-gray-400 dark:text-gray-500 mb-3">
                                            Add your other email addresses. These will be excluded from calendar matching.
                                        </p>

                                        {linkedEmails.length > 0 && (
                                            <div className="space-y-1.5 mb-3">
                                                {linkedEmails.map((email) => (
                                                    <div
                                                        key={email}
                                                        className="flex items-center justify-between gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-900/50 rounded-lg"
                                                    >
                                                        <div className="flex items-center gap-2 min-w-0">
                                                            <Mail className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                                                            <span className="text-sm text-gray-900 dark:text-white truncate">{email}</span>
                                                        </div>
                                                        <button
                                                            onClick={() => handleRemoveLinkedEmail(email)}
                                                            disabled={linkedEmailsSaving}
                                                            className="p-1 text-gray-400 hover:text-red-500 transition-colors flex-shrink-0 disabled:opacity-50"
                                                        >
                                                            <X className="h-3.5 w-3.5" />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        <div className="flex items-center gap-2">
                                            <input
                                                type="email"
                                                value={newLinkedEmail}
                                                onChange={(e) => setNewLinkedEmail(e.target.value)}
                                                onKeyDown={(e) => { if (e.key === "Enter") handleAddLinkedEmail(); }}
                                                placeholder="Add email address..."
                                                className="flex-1 px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-400"
                                            />
                                            <button
                                                onClick={handleAddLinkedEmail}
                                                disabled={!newLinkedEmail.trim() || linkedEmailsSaving}
                                                className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
                                            >
                                                {linkedEmailsSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                                                Add
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </section>
                        )}

                        {/* AI Provider Settings */}
                        {activeTab === "ai" && (
                            <section>
                                <div className="mb-6">
                                    <h2 className="text-lg font-medium text-gray-900 dark:text-white">
                                        AI Agent
                                    </h2>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                        Configure your model provider and API key for the chat agent.
                                    </p>
                                </div>

                                {aiLoadingSettings ? (
                                    <div className="flex items-center justify-center py-10">
                                        <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                                    </div>
                                ) : (
                                    <div className="space-y-5">
                                        {/* Provider Select */}
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                                Model Provider
                                            </label>
                                            <select
                                                value={aiProvider}
                                                onChange={(e) => setAiProvider(e.target.value)}
                                                className="w-full max-w-sm px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gray-400"
                                            >
                                                <option value="anthropic">Anthropic (Claude)</option>
                                                <option value="openai">OpenAI (GPT)</option>
                                                <option value="google">Google (Gemini)</option>
                                                <option value="mistral">Mistral</option>
                                                <option value="groq">Groq</option>
                                                <option value="openrouter">OpenRouter</option>
                                            </select>
                                        </div>

                                        {/* API Key */}
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                                API Key
                                            </label>
                                            {aiHasKey && !aiApiKey && (
                                                <p className="text-xs text-gray-400 dark:text-gray-500 mb-2">
                                                    Current key: <span className="font-mono">{aiMaskedKey}</span>
                                                </p>
                                            )}
                                            <div className="relative max-w-sm">
                                                <input
                                                    type={aiShowKey ? "text" : "password"}
                                                    value={aiApiKey}
                                                    onChange={(e) => setAiApiKey(e.target.value)}
                                                    placeholder={aiHasKey ? "Enter new key to replace" : "sk-..."}
                                                    className="w-full px-3 py-2 pr-10 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-400 font-mono"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setAiShowKey(!aiShowKey)}
                                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                                >
                                                    {aiShowKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                                </button>
                                            </div>
                                            <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1.5">
                                                Your key is encrypted before storage. It is only used server-side for agent chat.
                                            </p>
                                        </div>

                                        {/* Actions */}
                                        <div className="flex items-center gap-3 pt-2">
                                            <button
                                                onClick={handleSaveAiSettings}
                                                disabled={aiSaving || (!aiApiKey.trim() && !aiHasKey)}
                                                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-gray-700 hover:bg-gray-800 disabled:bg-gray-300 dark:disabled:bg-gray-700 rounded-lg transition-colors"
                                            >
                                                {aiSaving ? (
                                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                ) : aiSaved ? (
                                                    <Check className="h-3.5 w-3.5" />
                                                ) : null}
                                                {aiSaved ? "Saved" : "Save"}
                                            </button>
                                            {aiHasKey && (
                                                <button
                                                    onClick={handleDeleteAiSettings}
                                                    className="inline-flex items-center gap-1.5 px-3 py-2 text-sm text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 transition-colors"
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                    Remove
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </section>
                        )}

                        {/* iMessage Matching Section */}
                        {activeTab === "imessage" && (
                            <section>
                                <div className="mb-6">
                                    <h2 className="text-lg font-medium text-gray-900 dark:text-white">
                                        iMessage Matching
                                    </h2>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                        Link unmatched iMessage contacts to people in your Rolodex.
                                    </p>
                                </div>

                                {loading ? (
                                    <div className="flex items-center justify-center py-16">
                                        <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                                    </div>
                                ) : unmatched.length === 0 ? (
                                    <div className="text-center py-16 border border-dashed border-gray-200 dark:border-gray-800 rounded-xl">
                                        <Check className="h-8 w-8 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                                            All iMessage contacts are matched
                                        </p>
                                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                                            New unmatched contacts will appear here after syncing.
                                        </p>
                                    </div>
                                ) : (
                                    <div className="space-y-1">
                            {unmatched.map((item) => {
                                const isLinked = recentlyLinked.has(item.handle_id);
                                const isLoading = matchLoading === item.handle_id;
                                const isActive = activeMatch === item.handle_id;
                                const isCreating = creatingFor === item.handle_id;
                                const appleImg = appleImages[item.handle_id];

                                return (
                                    <div key={item.handle_id} className={`rounded-lg transition-all duration-300 ${
                                        isLinked
                                            ? "bg-green-50 dark:bg-green-900/20 opacity-0 scale-95"
                                            : expandedHandle === item.handle_id
                                                ? "bg-gray-50 dark:bg-gray-900/30"
                                                : ""
                                    }`}>
                                    <div
                                        className={`group relative flex items-center justify-between gap-4 px-4 py-3 rounded-lg transition-all duration-300 ${
                                            !isLinked && expandedHandle !== item.handle_id ? "hover:bg-gray-50 dark:hover:bg-gray-900/30" : ""
                                        }`}
                                    >
                                        {/* Left: Contact info with Apple photo */}
                                        <button
                                            onClick={() => togglePreview(item.handle_id)}
                                            className="flex items-center gap-3 min-w-0 flex-1 text-left"
                                        >
                                            <div className="flex-shrink-0 w-9 h-9 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center overflow-hidden">
                                                {appleImg ? (
                                                    // eslint-disable-next-line @next/next/no-img-element
                                                    <img
                                                        src={appleImg}
                                                        alt={item.contact_name || "Contact"}
                                                        className="w-9 h-9 rounded-full object-cover"
                                                    />
                                                ) : isPhone(item.handle_id) ? (
                                                    <Phone className="h-3.5 w-3.5 text-gray-400" />
                                                ) : (
                                                    <Mail className="h-3.5 w-3.5 text-gray-400" />
                                                )}
                                            </div>
                                            <div className="min-w-0">
                                                {item.contact_name ? (
                                                    <>
                                                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                                            {item.contact_name}
                                                        </p>
                                                        <p className="text-xs text-gray-400 dark:text-gray-500 truncate">
                                                            {formatHandle(item.handle_id)}
                                                        </p>
                                                    </>
                                                ) : (
                                                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                                        {formatHandle(item.handle_id)}
                                                    </p>
                                                )}
                                                <p className="text-[11px] text-gray-300 dark:text-gray-600">
                                                    {item.message_count} message{item.message_count !== 1 ? "s" : ""}
                                                </p>
                                            </div>
                                        </button>

                                        {/* Right: Actions */}
                                        <div className="flex items-center gap-1.5 flex-shrink-0" ref={isActive ? dropdownRef : undefined}>
                                            {isLinked ? (
                                                <div className="flex items-center gap-1.5 text-green-600 dark:text-green-400">
                                                    <Check className="h-4 w-4" />
                                                    <span className="text-xs font-medium">Linked</span>
                                                </div>
                                            ) : isCreating ? (
                                                /* Create new contact inline */
                                                <div className="flex items-center gap-2">
                                                    <input
                                                        ref={createInputRef}
                                                        type="text"
                                                        value={newContactName}
                                                        onChange={(e) => setNewContactName(e.target.value)}
                                                        onKeyDown={(e) => {
                                                            if (e.key === "Enter" && newContactName.trim()) handleCreateAndLink(item.handle_id);
                                                            else if (e.key === "Escape") { setCreatingFor(null); setNewContactName(""); }
                                                        }}
                                                        placeholder={item.contact_name || "Contact name"}
                                                        className="px-2.5 py-1.5 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-400 w-40"
                                                    />
                                                    <button
                                                        onClick={() => handleCreateAndLink(item.handle_id)}
                                                        disabled={!newContactName.trim() || createLoading}
                                                        className="p-1.5 text-gray-700 hover:text-gray-900 disabled:text-gray-300 transition-colors"
                                                    >
                                                        {createLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                                                    </button>
                                                    <button
                                                        onClick={() => { setCreatingFor(null); setNewContactName(""); }}
                                                        className="p-1.5 text-gray-400 hover:text-gray-600 transition-colors"
                                                    >
                                                        <X className="h-3.5 w-3.5" />
                                                    </button>
                                                </div>
                                            ) : isActive ? (
                                                <div className="relative">
                                                    <div className="w-64 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 shadow-xl shadow-gray-200/50 dark:shadow-black/50 overflow-hidden">
                                                        {/* Search */}
                                                        <div className="p-2 border-b border-gray-100 dark:border-gray-800">
                                                            <div className="flex items-center gap-2 px-2">
                                                                <Search className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                                                                <input
                                                                    ref={searchInputRef}
                                                                    type="text"
                                                                    value={matchSearch}
                                                                    onChange={(e) => setMatchSearch(e.target.value)}
                                                                    placeholder="Search contacts..."
                                                                    className="w-full text-sm bg-transparent text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none"
                                                                />
                                                                <button
                                                                    onClick={() => { setActiveMatch(null); setMatchSearch(""); }}
                                                                    className="p-0.5 text-gray-400 hover:text-gray-600"
                                                                >
                                                                    <X className="h-3.5 w-3.5" />
                                                                </button>
                                                            </div>
                                                        </div>

                                                        {/* Contact list */}
                                                        <div className="max-h-48 overflow-y-auto py-1">
                                                            {filteredContacts.length === 0 && matchSearch ? (
                                                                <p className="text-xs text-gray-400 text-center py-4">No contacts found</p>
                                                            ) : (
                                                                filteredContacts.slice(0, 20).map((c) => {
                                                                    const img = c.custom_profile_image_url || c.x_profile?.profile_image_url || c.linkedin_profile?.profile_image_url;
                                                                    return (
                                                                        <button
                                                                            key={c.id}
                                                                            onClick={() => handleLink(item.handle_id, c.id)}
                                                                            disabled={isLoading}
                                                                            className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                                                                        >
                                                                            {img ? (
                                                                                <Image
                                                                                    src={img}
                                                                                    alt={c.name}
                                                                                    width={24}
                                                                                    height={24}
                                                                                    unoptimized
                                                                                    className="rounded-full flex-shrink-0"
                                                                                />
                                                                            ) : (
                                                                                <div className="w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
                                                                                    <span className="text-[10px] font-medium text-gray-500 dark:text-gray-400">
                                                                                        {c.name.charAt(0).toUpperCase()}
                                                                                    </span>
                                                                                </div>
                                                                            )}
                                                                            <span className="text-sm text-gray-900 dark:text-white truncate">
                                                                                {c.name}
                                                                            </span>
                                                                            {isLoading && (
                                                                                <Loader2 className="h-3 w-3 animate-spin text-gray-400 ml-auto" />
                                                                            )}
                                                                        </button>
                                                                    );
                                                                })
                                                            )}
                                                        </div>

                                                        {/* Create new contact option */}
                                                        <div className="border-t border-gray-100 dark:border-gray-800 py-1">
                                                            <button
                                                                onClick={() => {
                                                                    setActiveMatch(null);
                                                                    setMatchSearch("");
                                                                    setCreatingFor(item.handle_id);
                                                                    setNewContactName(item.contact_name || "");
                                                                }}
                                                                className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-gray-500 dark:text-gray-400"
                                                            >
                                                                <UserPlus className="h-4 w-4 flex-shrink-0" />
                                                                <span className="text-sm">Create new contact</span>
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            ) : (
                                                <>
                                                    <button
                                                        onClick={() => setActiveMatch(item.handle_id)}
                                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
                                                    >
                                                        <Link2 className="h-3 w-3" />
                                                        Match
                                                        <ChevronDown className="h-3 w-3" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDismiss(item.handle_id)}
                                                        className="p-1.5 text-gray-300 dark:text-gray-600 hover:text-gray-500 dark:hover:text-gray-400 opacity-0 group-hover:opacity-100 transition-all"
                                                        title="Dismiss"
                                                    >
                                                        <X className="h-3.5 w-3.5" />
                                                    </button>
                                                </>
                                            )}
                                                </div>
                                            </div>

                                        {/* Message preview */}
                                        {expandedHandle === item.handle_id && (
                                            <div className="px-4 pb-3">
                                                <div ref={previewScrollRef} className="ml-12 max-h-64 overflow-y-auto space-y-1.5 pr-2">
                                                    {previewLoading ? (
                                                        <div className="flex items-center justify-center py-4">
                                                            <Loader2 className="h-3.5 w-3.5 animate-spin text-gray-400" />
                                                        </div>
                                                    ) : previewMessages.length === 0 ? (
                                                        <p className="text-xs text-gray-400 text-center py-3">No messages found</p>
                                                    ) : (
                                                        previewMessages.map((msg, idx) => (
                                                            <div
                                                                key={idx}
                                                                className={`flex ${msg.is_from_me ? "justify-end" : "justify-start"}`}
                                                            >
                                                                <div
                                                                    className={`max-w-[80%] px-3 py-1.5 rounded-2xl text-xs leading-relaxed ${
                                                                        msg.is_from_me
                                                                            ? "bg-blue-500 text-white rounded-br-md"
                                                                            : "bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-bl-md"
                                                                    }`}
                                                                >
                                                                    {msg.message_text}
                                                                </div>
                                                            </div>
                                                        ))
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                        </div>
                                        );
                                    })}
                                    </div>
                                )}
                            </section>
                        )}

                        {/* Google Calendar Settings */}
                        {activeTab === "calendar" && (
                            <section>
                                <div className="mb-6">
                                    <h2 className="text-lg font-medium text-gray-900 dark:text-white">
                                        Google Calendar
                                    </h2>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                        Connect your Google Calendar to track meetings with contacts.
                                    </p>
                                </div>

                                {calendarLoading ? (
                                    <div className="flex items-center justify-center py-16">
                                        <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                                    </div>
                                ) : (
                                    <div className="space-y-8">
                                        {/* Connected Accounts */}
                                        <div>
                                            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                                                Connected Accounts
                                            </h3>
                                            {googleAccounts.length === 0 ? (
                                                <div className="border border-dashed border-gray-200 dark:border-gray-800 rounded-xl p-6 text-center">
                                                    <Calendar className="h-8 w-8 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                                                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                                                        No Google accounts connected
                                                    </p>
                                                    <button
                                                        onClick={handleConnectGoogle}
                                                        disabled={calendarConnecting}
                                                        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-gray-900 dark:bg-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
                                                    >
                                                        {calendarConnecting ? (
                                                            <Loader2 className="h-4 w-4 animate-spin" />
                                                        ) : (
                                                            <Plus className="h-4 w-4" />
                                                        )}
                                                        Connect Google Account
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="space-y-2">
                                                    {googleAccounts.map((account) => {
                                                        const hasActiveWatch = calendarWatches.some(
                                                            w => w.google_oauth_id === account.id && new Date(w.expiration) > new Date()
                                                        );
                                                        return (
                                                        <div
                                                            key={account.id}
                                                            className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl"
                                                        >
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-9 h-9 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center">
                                                                    <Mail className="h-4 w-4 text-gray-500" />
                                                                </div>
                                                                <div>
                                                                    <div className="flex items-center gap-2">
                                                                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                                                                            {account.google_email}
                                                                        </p>
                                                                        {hasActiveWatch && (
                                                                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium text-green-700 dark:text-green-400 bg-green-100 dark:bg-green-900/30 rounded-full">
                                                                                <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                                                                                Live
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                    <p className="text-xs text-gray-400 dark:text-gray-500">
                                                                        {account.last_sync_at
                                                                            ? `Synced ${new Date(account.last_sync_at).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}`
                                                                            : "Waiting for first sync"}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                            <button
                                                                onClick={() => handleDisconnectGoogle(account.id)}
                                                                className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
                                                                title="Disconnect"
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </button>
                                                        </div>
                                                        );
                                                    })}
                                                    <button
                                                        onClick={handleConnectGoogle}
                                                        disabled={calendarConnecting}
                                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                                                    >
                                                        <Plus className="h-3 w-3" />
                                                        Add another account
                                                    </button>
                                                </div>
                                            )}
                                        </div>

                                        {/* Unmatched Attendees */}
                                        {unmatchedCalendar.length > 0 && (
                                            <div>
                                                <div className="flex items-center justify-between mb-3">
                                                    <div>
                                                        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                                            Unmatched Calendar Attendees
                                                        </h3>
                                                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                                                            {unmatchedCalendar.length} people from your calendar aren&apos;t linked to contacts yet.
                                                        </p>
                                                    </div>
                                                    <button
                                                        onClick={handleSuggestMatches}
                                                        disabled={suggestionsLoading}
                                                        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-gray-900 dark:bg-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
                                                    >
                                                        {suggestionsLoading ? (
                                                            <Loader2 className="h-4 w-4 animate-spin" />
                                                        ) : (
                                                            <Wand2 className="h-4 w-4" />
                                                        )}
                                                        {suggestionsLoading ? "Analyzing..." : "Auto-Match with AI"}
                                                    </button>
                                                </div>

                                                {suggestionsError && (
                                                    <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-lg">
                                                        <p className="text-xs text-red-600 dark:text-red-400">{suggestionsError}</p>
                                                    </div>
                                                )}

                                                {/* LLM Suggestions */}
                                                {calendarSuggestions.length > 0 && (
                                                    <div className="mb-6">
                                                        <div className="flex items-center justify-between mb-3">
                                                            <p className="text-xs font-medium text-purple-600 dark:text-purple-400 uppercase tracking-wider">
                                                                AI Suggestions
                                                            </p>
                                                            {calendarSuggestions.filter(s => s.action !== "skip").length > 0 && (
                                                                <button
                                                                    onClick={handleAcceptAllSuggestions}
                                                                    className="text-xs font-medium text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 transition-colors"
                                                                >
                                                                    Accept all matches
                                                                </button>
                                                            )}
                                                        </div>
                                                        <div className="space-y-1.5">
                                                            {calendarSuggestions.map((suggestion) => {
                                                                const isAccepting = acceptingEmail === suggestion.attendee_email;
                                                                const confidenceColors = {
                                                                    high: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400",
                                                                    medium: "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400",
                                                                    low: "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400",
                                                                };
                                                                const actionLabels: Record<string, string> = {
                                                                    match: "Link to existing",
                                                                    create: "Create new contact",
                                                                    skip: "Skip (generic email)",
                                                                    me: "This is you",
                                                                };

                                                                return (
                                                                    <div
                                                                        key={suggestion.attendee_email}
                                                                        className={`relative rounded-xl border transition-all ${
                                                                            suggestion.action === "skip"
                                                                                ? "border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/20 opacity-60"
                                                                                : suggestion.action === "me"
                                                                                    ? "border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-900/10"
                                                                                    : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/50"
                                                                        }`}
                                                                    >
                                                                        <div className="px-4 py-3">
                                                                            <div className="flex items-start justify-between gap-3">
                                                                                <div className="flex items-center gap-3 min-w-0 flex-1">
                                                                                    <div className="flex-shrink-0 w-9 h-9 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                                                                                        <Mail className="h-3.5 w-3.5 text-gray-400" />
                                                                                    </div>
                                                                                    <div className="min-w-0 flex-1">
                                                                                        <div className="flex items-center gap-2 flex-wrap">
                                                                                            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                                                                                {suggestion.attendee_name || suggestion.attendee_email}
                                                                                            </p>
                                                                                            <span className={`inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium rounded-full ${confidenceColors[suggestion.confidence]}`}>
                                                                                                {suggestion.confidence}
                                                                                            </span>
                                                                                        </div>
                                                                                        {suggestion.attendee_name && (
                                                                                            <p className="text-xs text-gray-400 dark:text-gray-500 truncate">
                                                                                                {suggestion.attendee_email}
                                                                                            </p>
                                                                                        )}
                                                                                        <div className="flex items-center gap-2 mt-1">
                                                                                            <span className="text-[11px] text-gray-400 dark:text-gray-500">
                                                                                                {suggestion.event_count} event{suggestion.event_count !== 1 ? "s" : ""}
                                                                                            </span>
                                                                                            <span className="text-[11px] text-gray-300 dark:text-gray-600">|</span>
                                                                                            <span className="text-[11px] text-gray-400 dark:text-gray-500">
                                                                                                {actionLabels[suggestion.action]}
                                                                                            </span>
                                                                                        </div>
                                                                                        {suggestion.action === "match" && suggestion.matched_contact_name && (
                                                                                            <div className="flex items-center gap-1.5 mt-1.5">
                                                                                                <ArrowRight className="h-3 w-3 text-purple-400" />
                                                                                                <span className="text-xs font-medium text-purple-600 dark:text-purple-400">
                                                                                                    {suggestion.matched_contact_name}
                                                                                                </span>
                                                                                            </div>
                                                                                        )}
                                                                                        {suggestion.action === "create" && suggestion.suggested_name && (
                                                                                            <div className="flex items-center gap-1.5 mt-1.5">
                                                                                                <UserPlus className="h-3 w-3 text-blue-400" />
                                                                                                <span className="text-xs font-medium text-blue-600 dark:text-blue-400">
                                                                                                    New: {suggestion.suggested_name}
                                                                                                </span>
                                                                                            </div>
                                                                                        )}
                                                                                        {suggestion.action === "me" && (
                                                                                            <div className="flex items-center gap-1.5 mt-1.5">
                                                                                                <User className="h-3 w-3 text-blue-500" />
                                                                                                <span className="text-xs font-medium text-blue-600 dark:text-blue-400">
                                                                                                    Your email - will be added to linked emails
                                                                                                </span>
                                                                                            </div>
                                                                                        )}
                                                                                        <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1 italic">
                                                                                            {suggestion.reason}
                                                                                        </p>
                                                                                    </div>
                                                                                </div>

                                                                                <div className="flex items-center gap-1 flex-shrink-0">
                                                                                    {suggestion.action !== "skip" && (
                                                                                        <button
                                                                                            onClick={() => handleAcceptSuggestion(suggestion)}
                                                                                            disabled={isAccepting}
                                                                                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-white bg-gray-900 dark:bg-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
                                                                                        >
                                                                                            {isAccepting ? (
                                                                                                <Loader2 className="h-3 w-3 animate-spin" />
                                                                                            ) : (
                                                                                                <Check className="h-3 w-3" />
                                                                                            )}
                                                                                            Accept
                                                                                        </button>
                                                                                    )}
                                                                                    <button
                                                                                        onClick={() => handleMarkAsMe(suggestion.attendee_email)}
                                                                                        disabled={linkedEmailsSaving}
                                                                                        className="inline-flex items-center gap-1 px-2 py-1.5 text-xs text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors disabled:opacity-50"
                                                                                        title="This is my email"
                                                                                    >
                                                                                        <User className="h-3 w-3" />
                                                                                        Me
                                                                                    </button>
                                                                                    <button
                                                                                        onClick={() => handleDismissSuggestion(suggestion.attendee_email)}
                                                                                        className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                                                                                        title="Dismiss"
                                                                                    >
                                                                                        <X className="h-3.5 w-3.5" />
                                                                                    </button>
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Manual matching fallback list */}
                                                {calendarSuggestions.length === 0 && (
                                                    <div className="space-y-1">
                                                        {(() => {
                                                            const filteredCalendarContacts = calendarMatchSearch
                                                                ? contacts.filter(c => c.name.toLowerCase().includes(calendarMatchSearch.toLowerCase()))
                                                                : contacts;
                                                            return unmatchedCalendar.map((item) => {
                                                            const isLinked = calendarRecentlyLinked.has(item.attendee_email);
                                                            const isRowLoading = calendarMatchLoading?.email === item.attendee_email;
                                                            const isActive = activeCalendarMatch === item.attendee_email;
                                                            const isCreating = calendarCreatingFor === item.attendee_email;

                                                            return (
                                                                <div
                                                                    key={item.attendee_email}
                                                                    className={`group relative flex items-center justify-between gap-4 px-4 py-3 rounded-lg transition-all duration-300 ${
                                                                        isLinked
                                                                            ? "bg-green-50 dark:bg-green-900/20 opacity-0 scale-95"
                                                                            : "hover:bg-gray-50 dark:hover:bg-gray-900/30"
                                                                    }`}
                                                                >
                                                                    <div className="flex items-center gap-3 min-w-0 flex-1">
                                                                        <div className="flex-shrink-0 w-9 h-9 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                                                                            <Mail className="h-3.5 w-3.5 text-gray-400" />
                                                                        </div>
                                                                        <div className="min-w-0">
                                                                            {item.attendee_name ? (
                                                                                <>
                                                                                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                                                                        {item.attendee_name}
                                                                                    </p>
                                                                                    <p className="text-xs text-gray-400 dark:text-gray-500 truncate">
                                                                                        {item.attendee_email}
                                                                                    </p>
                                                                                </>
                                                                            ) : (
                                                                                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                                                                    {item.attendee_email}
                                                                                </p>
                                                                            )}
                                                                            <p className="text-[11px] text-gray-300 dark:text-gray-600">
                                                                                {item.event_count} event{item.event_count !== 1 ? "s" : ""}
                                                                            </p>
                                                                        </div>
                                                                    </div>

                                                                    <div className="flex items-center gap-1.5 flex-shrink-0" ref={isActive ? calendarDropdownRef : undefined}>
                                                                        {isLinked ? (
                                                                            <div className="flex items-center gap-1.5 text-green-600 dark:text-green-400">
                                                                                <Check className="h-4 w-4" />
                                                                                <span className="text-xs font-medium">Linked</span>
                                                                            </div>
                                                                        ) : isCreating ? (
                                                                            <div className="flex items-center gap-2">
                                                                                <input
                                                                                    type="text"
                                                                                    value={calendarNewContactName}
                                                                                    onChange={(e) => setCalendarNewContactName(e.target.value)}
                                                                                    onKeyDown={(e) => {
                                                                                        if (e.key === "Enter" && calendarNewContactName.trim()) handleCalendarCreateAndLink(item.attendee_email);
                                                                                        else if (e.key === "Escape") { setCalendarCreatingFor(null); setCalendarNewContactName(""); }
                                                                                    }}
                                                                                    placeholder={item.attendee_name || "Contact name"}
                                                                                    autoFocus
                                                                                    className="px-2.5 py-1.5 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-400 w-40"
                                                                                />
                                                                                <button
                                                                                    onClick={() => handleCalendarCreateAndLink(item.attendee_email)}
                                                                                    disabled={!calendarNewContactName.trim() || calendarCreateLoading}
                                                                                    className="p-1.5 text-gray-700 hover:text-gray-900 disabled:text-gray-300 transition-colors"
                                                                                >
                                                                                    {calendarCreateLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                                                                                </button>
                                                                                <button
                                                                                    onClick={() => { setCalendarCreatingFor(null); setCalendarNewContactName(""); }}
                                                                                    className="p-1.5 text-gray-400 hover:text-gray-600 transition-colors"
                                                                                >
                                                                                    <X className="h-3.5 w-3.5" />
                                                                                </button>
                                                                            </div>
                                                                        ) : isActive ? (
                                                                            <div className="relative">
                                                                                <div className="w-64 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 shadow-xl shadow-gray-200/50 dark:shadow-black/50 overflow-hidden">
                                                                                    <div className="p-2 border-b border-gray-100 dark:border-gray-800">
                                                                                        <div className="flex items-center gap-2 px-2">
                                                                                            <Search className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                                                                                            <input
                                                                                                type="text"
                                                                                                value={calendarMatchSearch}
                                                                                                onChange={(e) => setCalendarMatchSearch(e.target.value)}
                                                                                                placeholder="Search contacts..."
                                                                                                autoFocus
                                                                                                className="w-full text-sm bg-transparent text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none"
                                                                                            />
                                                                                            <button
                                                                                                onClick={() => { setActiveCalendarMatch(null); setCalendarMatchSearch(""); }}
                                                                                                className="p-0.5 text-gray-400 hover:text-gray-600"
                                                                                            >
                                                                                                <X className="h-3.5 w-3.5" />
                                                                                            </button>
                                                                                        </div>
                                                                                    </div>

                                                                                    <div className="max-h-48 overflow-y-auto py-1">
                                                                                        {filteredCalendarContacts.length === 0 && calendarMatchSearch ? (
                                                                                            <p className="text-xs text-gray-400 text-center py-4">No contacts found</p>
                                                                                        ) : (
                                                                                            filteredCalendarContacts.slice(0, 20).map((c) => {
                                                                                                const img = c.custom_profile_image_url || c.x_profile?.profile_image_url || c.linkedin_profile?.profile_image_url;
                                                                                                return (
                                                                                                    <button
                                                                                                        key={c.id}
                                                                                                        onClick={() => handleCalendarLink(item.attendee_email, c.id)}
                                                                                                        disabled={isRowLoading}
                                                                                                        className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                                                                                                    >
                                                                                                        {img ? (
                                                                                                            <Image
                                                                                                                src={img}
                                                                                                                alt={c.name}
                                                                                                                width={24}
                                                                                                                height={24}
                                                                                                                unoptimized
                                                                                                                className="rounded-full flex-shrink-0"
                                                                                                            />
                                                                                                        ) : (
                                                                                                            <div className="w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
                                                                                                                <span className="text-[10px] font-medium text-gray-500 dark:text-gray-400">
                                                                                                                    {c.name.charAt(0).toUpperCase()}
                                                                                                                </span>
                                                                                                            </div>
                                                                                                        )}
                                                                                                        <span className="text-sm text-gray-900 dark:text-white truncate">
                                                                                                            {c.name}
                                                                                                        </span>
                                                                                                        {calendarMatchLoading?.email === item.attendee_email && calendarMatchLoading?.contactId === c.id && (
                                                                                                            <Loader2 className="h-3 w-3 animate-spin text-gray-400 ml-auto" />
                                                                                                        )}
                                                                                                    </button>
                                                                                                );
                                                                                            })
                                                                                        )}
                                                                                    </div>

                                                                                    <div className="border-t border-gray-100 dark:border-gray-800 py-1">
                                                                                        <button
                                                                                            onClick={() => {
                                                                                                setActiveCalendarMatch(null);
                                                                                                setCalendarMatchSearch("");
                                                                                                setCalendarCreatingFor(item.attendee_email);
                                                                                                setCalendarNewContactName(item.attendee_name || "");
                                                                                            }}
                                                                                            className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-gray-500 dark:text-gray-400"
                                                                                        >
                                                                                            <UserPlus className="h-4 w-4 flex-shrink-0" />
                                                                                            <span className="text-sm">Create new contact</span>
                                                                                        </button>
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                        ) : (
                                                                            <div className="flex items-center gap-1">
                                                                                <button
                                                                                    onClick={() => handleMarkAsMe(item.attendee_email)}
                                                                                    disabled={linkedEmailsSaving}
                                                                                    className="inline-flex items-center gap-1 px-2 py-1.5 text-xs text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors disabled:opacity-50"
                                                                                    title="This is my email"
                                                                                >
                                                                                    <User className="h-3 w-3" />
                                                                                    Me
                                                                                </button>
                                                                                <button
                                                                                    onClick={() => setActiveCalendarMatch(item.attendee_email)}
                                                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
                                                                                >
                                                                                    <Link2 className="h-3 w-3" />
                                                                                    Match
                                                                                    <ChevronDown className="h-3 w-3" />
                                                                                </button>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            );
                                                        });
                                                        })()}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </section>
                        )}
                    </div>
                </div>
            </div>
        );
    }
