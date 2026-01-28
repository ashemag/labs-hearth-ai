"use client";

import { useEffect, useState, useRef, useCallback } from "react";
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
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type SettingsTab = "ai" | "imessage";


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
}

export default function SettingsPage() {
    const [unmatched, setUnmatched] = useState<UnmatchedHandle[]>([]);
    const [contacts, setContacts] = useState<RolodexContact[]>([]);
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<{ email?: string; fullName?: string } | null>(null);

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
    const [activeTab, setActiveTab] = useState<SettingsTab>("ai");

    const dropdownRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);
    const createInputRef = useRef<HTMLInputElement>(null);

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

    useEffect(() => {
        const supabase = createClient();
        supabase.auth.getUser().then(({ data }) => {
            if (data.user) {
                setUser({
                    email: data.user.email,
                    fullName: data.user.user_metadata?.full_name,
                });
            }
        });
        fetchData();
        fetchAiSettings();
    }, [fetchData, fetchAiSettings]);

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

    const handleLink = async (handleId: string, peopleId: number) => {
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
        if (!newContactName.trim()) return;
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

    const formatHandle = (handle: string) => {
        if (handle.includes("@")) return handle;
        const cleaned = handle.replace(/[^+\d]/g, "");
        return cleaned.replace(/^\+?1?(\d{3})(\d{3})(\d{4})$/, "+1 ($1) $2-$3")
            .replace(/^\+(\d{1,3})(\d{3})(\d{3})(\d{4})$/, "+$1 ($2) $3-$4");
    };

    const isPhone = (handle: string) => !handle.includes("@");

    const filteredContacts = matchSearch
        ? contacts.filter(c => c.name.toLowerCase().includes(matchSearch.toLowerCase()))
        : contacts;

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
                </nav>

                {/* Content Area */}
                <div className="flex-1 min-w-0 px-8 py-6">
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
                                    <div
                                        key={item.handle_id}
                                        className={`group relative flex items-center justify-between gap-4 px-4 py-3 rounded-lg transition-all duration-300 ${
                                            isLinked
                                                ? "bg-green-50 dark:bg-green-900/20 opacity-0 scale-95"
                                                : "hover:bg-gray-50 dark:hover:bg-gray-900/30"
                                        }`}
                                    >
                                        {/* Left: Contact info with Apple photo */}
                                        <div className="flex items-center gap-3 min-w-0 flex-1">
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
                                        </div>

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
                                        );
                                    })}
                                    </div>
                                )}
                            </section>
                        )}
                    </div>
                </div>
            </div>
        );
    }
