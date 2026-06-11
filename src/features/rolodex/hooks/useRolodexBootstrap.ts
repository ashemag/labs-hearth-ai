"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Contact, RolodexList, StandaloneCompliment, Todo, UserProfile } from "../types";

export function useRolodexBootstrap() {
    const [authLoading, setAuthLoading] = useState(true);
    const [authenticated, setAuthenticated] = useState(false);
    const [user, setUser] = useState<UserProfile | null>(null);
    const [showUserMenu, setShowUserMenu] = useState(false);
    const userMenuRef = useRef<HTMLDivElement>(null);

    const [contacts, setContacts] = useState<Contact[]>([]);
    const [loading, setLoading] = useState(true);
    const [lists, setLists] = useState<RolodexList[]>([]);
    const [todos, setTodos] = useState<Todo[]>([]);
    const [allLocations, setAllLocations] = useState<string[]>([]);
    const [standaloneCompliments, setStandaloneCompliments] = useState<StandaloneCompliment[]>([]);

    useEffect(() => {
        async function fetchUser() {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                let customAvatarUrl: string | null = null;
                try {
                    const profileRes = await fetch("/api/user/profile", { credentials: "include" });
                    if (profileRes.ok) {
                        const { profile } = await profileRes.json();
                        customAvatarUrl = profile?.avatar_url || null;
                    }
                } catch (e) {
                    console.error("Error fetching user profile:", e);
                }

                setUser({
                    id: user.id,
                    email: user.email || "",
                    avatarUrl: user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
                    fullName: user.user_metadata?.full_name || user.user_metadata?.name || null,
                    customAvatarUrl,
                });
                setAuthenticated(true);
            }
            setAuthLoading(false);
        }
        fetchUser();
    }, []);

    useEffect(() => {
        if (!showUserMenu) return;
        const handleClick = (e: MouseEvent) => {
            if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
                setShowUserMenu(false);
            }
        };
        document.addEventListener("mousedown", handleClick);
        return () => document.removeEventListener("mousedown", handleClick);
    }, [showUserMenu]);

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

    const fetchStandaloneCompliments = useCallback(async () => {
        try {
            const res = await fetch("/api/rolodex/compliments", {
                credentials: "include",
            });
            if (res.ok) {
                const data = await res.json();
                setStandaloneCompliments(data.compliments || []);
            }
        } catch (error) {
            console.error("Error fetching standalone compliments:", error);
        }
    }, []);

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
            fetchStandaloneCompliments();
        }
    }, [authenticated, fetchContacts, fetchLists, fetchTodos, fetchLocations, fetchStandaloneCompliments]);

    useEffect(() => {
        if (!authenticated || !user?.id) return;

        const supabase = createClient();

        console.log("[Realtime] Setting up subscriptions for user:", user.id);

        supabase.auth.getSession().then(({ data: { session } }) => {
            if (!session) {
                console.warn("[Realtime] No active session for realtime");
            } else {
                console.log("[Realtime] Session active:", session.user.id);
            }
        });

        const peopleChannel = supabase
            .channel("rolodex-people-changes")
            .on(
                "postgres_changes",
                { event: "*", schema: "public", table: "people", filter: `user_id=eq.${user.id}` },
                (payload) => {
                    console.log("[Realtime] people change:", payload);
                    fetchContacts();
                    fetchLocations();
                }
            )
            .on(
                "postgres_changes",
                { event: "*", schema: "public", table: "people_x_profiles", filter: `user_id=eq.${user.id}` },
                (payload) => {
                    console.log("[Realtime] people_x_profiles change:", payload);
                    fetchContacts();
                }
            )
            .on(
                "postgres_changes",
                { event: "*", schema: "public", table: "people_linkedin_profiles", filter: `user_id=eq.${user.id}` },
                (payload) => {
                    console.log("[Realtime] people_linkedin_profiles change:", payload);
                    fetchContacts();
                }
            )
            .on(
                "postgres_changes",
                { event: "*", schema: "public", table: "people_notes", filter: `user_id=eq.${user.id}` },
                (payload) => {
                    console.log("[Realtime] people_notes change:", payload);
                    fetchContacts();
                }
            )
            .on(
                "postgres_changes",
                { event: "*", schema: "public", table: "people_touchpoints", filter: `user_id=eq.${user.id}` },
                (payload) => {
                    console.log("[Realtime] people_touchpoints change:", payload);
                    fetchContacts();
                }
            )
            .on(
                "postgres_changes",
                { event: "*", schema: "public", table: "people_websites", filter: `user_id=eq.${user.id}` },
                (payload) => {
                    console.log("[Realtime] people_websites change:", payload);
                    fetchContacts();
                }
            )
            .on(
                "postgres_changes",
                { event: "*", schema: "public", table: "people_compliments", filter: `user_id=eq.${user.id}` },
                (payload) => {
                    console.log("[Realtime] people_compliments change:", payload);
                    fetchContacts();
                    fetchStandaloneCompliments();
                }
            )
            .on(
                "postgres_changes",
                { event: "*", schema: "public", table: "people_contact_info", filter: `user_id=eq.${user.id}` },
                (payload) => {
                    console.log("[Realtime] people_contact_info change:", payload);
                    fetchContacts();
                }
            )
            .subscribe((status, err) => {
                console.log("[Realtime] people channel status:", status);
                if (err) console.error("[Realtime] people channel error:", err);
            });

        const listsChannel = supabase
            .channel("rolodex-lists-changes")
            .on(
                "postgres_changes",
                { event: "*", schema: "public", table: "rolodex_lists", filter: `user_id=eq.${user.id}` },
                (payload) => {
                    console.log("[Realtime] rolodex_lists change:", payload);
                    fetchLists();
                }
            )
            .on(
                "postgres_changes",
                { event: "*", schema: "public", table: "rolodex_list_members", filter: `user_id=eq.${user.id}` },
                (payload) => {
                    console.log("[Realtime] rolodex_list_members change:", payload);
                    fetchLists();
                }
            )
            .subscribe((status, err) => {
                console.log("[Realtime] lists channel status:", status);
                if (err) console.error("[Realtime] lists channel error:", err);
            });

        const todosChannel = supabase
            .channel("rolodex-todos-changes")
            .on(
                "postgres_changes",
                { event: "*", schema: "public", table: "rolodex_todos", filter: `user_id=eq.${user.id}` },
                (payload) => {
                    console.log("[Realtime] rolodex_todos change:", payload);
                    fetchTodos();
                }
            )
            .subscribe((status, err) => {
                console.log("[Realtime] todos channel status:", status);
                if (err) console.error("[Realtime] todos channel error:", err);
            });

        return () => {
            console.log("[Realtime] Cleaning up subscriptions");
            supabase.removeChannel(peopleChannel);
            supabase.removeChannel(listsChannel);
            supabase.removeChannel(todosChannel);
        };
    }, [
        authenticated,
        user?.id,
        fetchContacts,
        fetchLists,
        fetchTodos,
        fetchLocations,
        fetchStandaloneCompliments,
    ]);

    return {
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
    };
}
