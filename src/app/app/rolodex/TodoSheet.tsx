import React from "react";
import Image from "next/image";
import {
    X,
    Search,
    Calendar,
    CheckCircle2,
    ChevronRight,
    Check,
    PanelRightClose,
} from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/Sheet";
import type { Todo, Contact } from "./types";

interface TodoSheetProps {
    showTodoSheet: boolean;
    setShowTodoSheet: (show: boolean) => void;
    loading: boolean;
    todos: Todo[];
    contacts: Contact[];
    todoNameSearch: string;
    setTodoNameSearch: (search: string) => void;
    showTodoNameDropdown: boolean;
    setShowTodoNameDropdown: (show: boolean) => void;
    todoNameFilter: { id: number; name: string; profileImage: string | null } | null;
    setTodoNameFilter: (filter: { id: number; name: string; profileImage: string | null } | null) => void;
    todoDueDateFilter: "all" | "overdue" | "today" | "week" | "two-weeks" | "month" | "no-date";
    setTodoDueDateFilter: (filter: "all" | "overdue" | "today" | "week" | "two-weeks" | "month" | "no-date") => void;
    editingTodoId: number | null;
    setEditingTodoId: (id: number | null) => void;
    editingTodoDueDate: string;
    setEditingTodoDueDate: (date: string) => void;
    completedTodosExpanded: boolean;
    setCompletedTodosExpanded: (expanded: boolean) => void;
    todoNameSearchRef: React.RefObject<HTMLDivElement>;
    onToggleTodoComplete: (todoId: number) => void;
    onDeleteTodo: (todoId: number) => void;
    onUpdateTodoDueDate: (todoId: number, newDueDate: string) => void;
    onNavigateToContact: (contactId: number) => void;
    filteredTodos: Todo[];
    activeTodos: Todo[];
    completedTodos: Todo[];
    formatDueDate: (dateStr: string) => string;
    isDueOverdue: (dateStr: string) => boolean;
}

export default function TodoSheet({
    showTodoSheet,
    setShowTodoSheet,
    loading,
    todos,
    contacts,
    todoNameSearch,
    setTodoNameSearch,
    showTodoNameDropdown,
    setShowTodoNameDropdown,
    todoNameFilter,
    setTodoNameFilter,
    todoDueDateFilter,
    setTodoDueDateFilter,
    editingTodoId,
    setEditingTodoId,
    editingTodoDueDate,
    setEditingTodoDueDate,
    completedTodosExpanded,
    setCompletedTodosExpanded,
    todoNameSearchRef,
    onToggleTodoComplete,
    onDeleteTodo,
    onUpdateTodoDueDate,
    onNavigateToContact,
    filteredTodos,
    activeTodos,
    completedTodos,
    formatDueDate,
    isDueOverdue,
}: TodoSheetProps) {
    return (
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
                                className="w-full pl-9 pr-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-600/50 focus:border-transparent"
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
                                <div className="inline-flex items-center gap-1.5 pl-1 pr-2 py-1 bg-gray-100 dark:bg-gray-800/40 text-gray-700 dark:text-gray-300 rounded-full text-xs font-medium">
                                    {todoNameFilter.profileImage ? (
                                        <Image
                                            src={todoNameFilter.profileImage}
                                            alt={todoNameFilter.name}
                                            width={18}
                                            height={18}
                                            className="rounded-full flex-shrink-0"
                                        />
                                    ) : (
                                        <div className="w-[18px] h-[18px] rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
                                            <span className="text-[9px] font-semibold text-gray-700 dark:text-gray-300">
                                                {todoNameFilter.name.charAt(0).toUpperCase()}
                                            </span>
                                        </div>
                                    )}
                                    <span className="truncate max-w-[120px]">{todoNameFilter.name}</span>
                                    <button
                                        onClick={() => setTodoNameFilter(null)}
                                        className="p-0.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors"
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
                                            : "bg-gray-100 dark:bg-gray-800/40 text-gray-700 dark:text-gray-300"
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
                                    className="text-gray-700 dark:text-gray-400 hover:underline"
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
                            className="text-xs text-gray-700 dark:text-gray-400 hover:underline mt-1"
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
                                className="group flex items-start gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-800/20 border border-gray-100 dark:border-gray-800 hover:border-gray-200 dark:hover:border-gray-700/50 transition-colors"
                            >
                                <button
                                    onClick={() => onToggleTodoComplete(todo.id)}
                                    className="flex-shrink-0 mt-0.5 text-gray-700 dark:text-gray-400 hover:text-green-600 dark:hover:text-green-500 transition-colors"
                                >
                                    <div className="h-5 w-5 rounded-full border-2 border-current" />
                                </button>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm text-gray-900 dark:text-gray-100">
                                        {todo.task}
                                    </p>
                                    <div className="flex items-center gap-2 mt-1.5">
                                        <button
                                            onClick={() => onNavigateToContact(todo.contactId)}
                                            className="flex items-center gap-1.5 text-xs text-gray-700 dark:text-gray-400 hover:underline truncate font-medium"
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
                                                    className="text-xs px-2 py-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gray-600/50"
                                                    autoFocus
                                                />
                                                <button
                                                    onClick={() => onUpdateTodoDueDate(todo.id, editingTodoDueDate)}
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
                                    onClick={() => onDeleteTodo(todo.id)}
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
                                                    onClick={() => onToggleTodoComplete(todo.id)}
                                                    className="flex-shrink-0 mt-0.5 text-green-600 dark:text-green-500 hover:text-gray-700 dark:hover:text-gray-400 transition-colors"
                                                >
                                                    <CheckCircle2 className="h-5 w-5" />
                                                </button>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm text-gray-500 dark:text-gray-400 line-through">
                                                        {todo.task}
                                                    </p>
                                                    <div className="flex items-center gap-2 mt-1.5">
                                                        <button
                                                            onClick={() => onNavigateToContact(todo.contactId)}
                                                            className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-400 hover:underline truncate"
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
                                                    onClick={() => onDeleteTodo(todo.id)}
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
    );
}
