"use client";

import { useEffect } from "react";
import type { Contact, ContextMenuState } from "../types";

interface UseRolodexPageEffectsInput {
    selectedContactId: number | null;
    noteInputRef: React.RefObject<HTMLTextAreaElement>;
    setGeneratingSummaryFor: React.Dispatch<React.SetStateAction<number | null>>;
    setContacts: React.Dispatch<React.SetStateAction<Contact[]>>;
    setContextMenu: React.Dispatch<React.SetStateAction<ContextMenuState | null>>;
    setListContextMenu: React.Dispatch<React.SetStateAction<{ x: number; y: number; listId: number } | null>>;
    setShowListSubmenu: React.Dispatch<React.SetStateAction<boolean>>;
    setSelectedContacts: React.Dispatch<React.SetStateAction<Set<number>>>;
    showTodoSheet: boolean;
    showTodoNameDropdown: boolean;
    todoNameSearchRef: React.RefObject<HTMLDivElement>;
    setShowTodoNameDropdown: React.Dispatch<React.SetStateAction<boolean>>;
    showListsDropdown: boolean;
    listsDropdownRef: React.RefObject<HTMLDivElement>;
    setShowListsDropdown: React.Dispatch<React.SetStateAction<boolean>>;
    showListDropdownFor: number | null;
    setShowListDropdownFor: React.Dispatch<React.SetStateAction<number | null>>;
}

export function useRolodexPageEffects({
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
}: UseRolodexPageEffectsInput) {
    useEffect(() => {
        if (!selectedContactId) return;

        const timer = setTimeout(() => {
            noteInputRef.current?.focus();
        }, 350);

        setGeneratingSummaryFor(selectedContactId);
        fetch(`/api/rolodex/contacts/${selectedContactId}/generate-summary`, {
            method: "POST",
            credentials: "include",
        })
            .then((res) => res.json())
            .then((data) => {
                if (data.generated && data.note) {
                    setContacts((prev) => prev.map((contact) => {
                        if (contact.id !== selectedContactId) return contact;

                        const noteExists = contact.notes.some((note) => note.id === data.note.id);
                        if (noteExists) return contact;

                        return {
                            ...contact,
                            notes: [data.note, ...contact.notes.filter((note) => note.source_type !== "auto_summary")],
                        };
                    }));
                }
            })
            .catch((err) => console.error("Failed to generate summary:", err))
            .finally(() => setGeneratingSummaryFor(null));

        return () => clearTimeout(timer);
    }, [noteInputRef, selectedContactId, setContacts, setGeneratingSummaryFor]);

    useEffect(() => {
        const handleClick = () => {
            setContextMenu(null);
            setListContextMenu(null);
            setShowListSubmenu(false);
        };
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                setContextMenu(null);
                setListContextMenu(null);
                setShowListSubmenu(false);
                setSelectedContacts(new Set());
            }
        };

        document.addEventListener("click", handleClick);
        document.addEventListener("keydown", handleKeyDown);
        return () => {
            document.removeEventListener("click", handleClick);
            document.removeEventListener("keydown", handleKeyDown);
        };
    }, [setContextMenu, setListContextMenu, setSelectedContacts, setShowListSubmenu]);

    useEffect(() => {
        localStorage.setItem("rolodex-todo-sheet-open", showTodoSheet ? "true" : "false");
    }, [showTodoSheet]);

    useEffect(() => {
        if (!showTodoNameDropdown) return;

        const handleClickOutside = (e: MouseEvent) => {
            if (todoNameSearchRef.current && !todoNameSearchRef.current.contains(e.target as Node)) {
                setShowTodoNameDropdown(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [setShowTodoNameDropdown, showTodoNameDropdown, todoNameSearchRef]);

    useEffect(() => {
        if (!showListsDropdown) return;

        const handleClickOutside = (e: MouseEvent) => {
            if (listsDropdownRef.current && !listsDropdownRef.current.contains(e.target as Node)) {
                setShowListsDropdown(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [listsDropdownRef, setShowListsDropdown, showListsDropdown]);

    useEffect(() => {
        if (!showListDropdownFor) return;

        const handleClickOutside = (e: MouseEvent) => {
            const dropdown = document.querySelector('[data-list-dropdown="true"]');
            if (dropdown && dropdown.contains(e.target as Node)) return;
            setShowListDropdownFor(null);
        };

        const timeoutId = setTimeout(() => {
            document.addEventListener("mousedown", handleClickOutside);
        }, 0);

        return () => {
            clearTimeout(timeoutId);
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [setShowListDropdownFor, showListDropdownFor]);
}
