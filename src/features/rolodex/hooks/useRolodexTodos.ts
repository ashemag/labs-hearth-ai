"use client";

import { useMemo, useRef, useState } from "react";
import type { Todo } from "../types";

type TodoDueDateFilter = "all" | "overdue" | "today" | "week" | "two-weeks" | "month" | "no-date";

interface TodoContactFilter {
    id: number;
    name: string;
    profileImage: string | null;
}

interface AddTodoContact {
    id: number;
    name: string;
}

interface UseRolodexTodosInput {
    todos: Todo[];
    setTodos: React.Dispatch<React.SetStateAction<Todo[]>>;
}

function sortTodosByDueDate(todos: Todo[]) {
    return [...todos].sort((a, b) => {
        if (!a.dueDate && !b.dueDate) return 0;
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    });
}

export function formatDueDate(dateStr: string) {
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
}

export function isDueOverdue(dateStr: string) {
    if (!dateStr) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDate = new Date(dateStr);
    dueDate.setHours(0, 0, 0, 0);
    return dueDate < today;
}

export function useRolodexTodos({ todos, setTodos }: UseRolodexTodosInput) {
    const [completedTodosExpanded, setCompletedTodosExpanded] = useState(false);
    const [todoNameFilter, setTodoNameFilter] = useState<TodoContactFilter | null>(null);
    const [todoNameSearch, setTodoNameSearch] = useState("");
    const [showTodoNameDropdown, setShowTodoNameDropdown] = useState(false);
    const [todoDueDateFilter, setTodoDueDateFilter] = useState<TodoDueDateFilter>("all");
    const [editingTodoId, setEditingTodoId] = useState<number | null>(null);
    const [editingTodoDueDate, setEditingTodoDueDate] = useState("");
    const todoNameSearchRef = useRef<HTMLDivElement>(null);
    const [showAddTodoModal, setShowAddTodoModal] = useState(false);
    const [addTodoForContact, setAddTodoForContact] = useState<AddTodoContact | null>(null);
    const [newTodoTask, setNewTodoTask] = useState("");
    const [newTodoDueDate, setNewTodoDueDate] = useState("");

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
                setTodos((prev) => sortTodosByDueDate([...prev, data.todo]));
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
        const todo = todos.find((todo) => todo.id === todoId);
        if (!todo) return;

        setTodos((prev) =>
            prev.map((item) => (item.id === todoId ? { ...item, completed: !item.completed } : item))
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
                setTodos((prev) =>
                    prev.map((item) => (item.id === todoId ? { ...item, completed: todo.completed } : item))
                );
            }
        } catch (error) {
            console.error("Error toggling todo:", error);
            setTodos((prev) =>
                prev.map((item) => (item.id === todoId ? { ...item, completed: todo.completed } : item))
            );
        }
    };

    const deleteTodo = async (todoId: number) => {
        const todoToDelete = todos.find((todo) => todo.id === todoId);

        setTodos((prev) => prev.filter((todo) => todo.id !== todoId));

        try {
            const res = await fetch(`/api/rolodex/todos?id=${todoId}`, {
                method: "DELETE",
                credentials: "include",
            });

            if (!res.ok && todoToDelete) {
                setTodos((prev) => [...prev, todoToDelete]);
            }
        } catch (error) {
            console.error("Error deleting todo:", error);
            if (todoToDelete) {
                setTodos((prev) => [...prev, todoToDelete]);
            }
        }
    };

    const updateTodoDueDate = async (todoId: number, newDueDate: string) => {
        const todo = todos.find((todo) => todo.id === todoId);
        if (!todo) return;

        const oldDueDate = todo.dueDate;

        setTodos((prev) => sortTodosByDueDate(
            prev.map((item) => (item.id === todoId ? { ...item, dueDate: newDueDate } : item))
        ));
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
                setTodos((prev) =>
                    prev.map((item) => (item.id === todoId ? { ...item, dueDate: oldDueDate } : item))
                );
            }
        } catch (error) {
            console.error("Error updating todo:", error);
            setTodos((prev) =>
                prev.map((item) => (item.id === todoId ? { ...item, dueDate: oldDueDate } : item))
            );
        }
    };

    const filteredTodos = useMemo(() => todos.filter((todo) => {
        if (todoNameFilter && todo.contactId !== todoNameFilter.id) {
            return false;
        }

        if (todoDueDateFilter !== "all") {
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            if (todoDueDateFilter === "no-date") {
                return !todo.dueDate;
            }

            if (!todo.dueDate) {
                return false;
            }

            const [year, month, day] = todo.dueDate.split("-").map(Number);
            const dueDate = new Date(year, month - 1, day);

            if (todoDueDateFilter === "overdue") {
                return dueDate < today && !todo.completed;
            }

            if (todoDueDateFilter === "today") {
                return dueDate.getTime() === today.getTime();
            }

            if (todoDueDateFilter === "week") {
                const endDate = new Date(today);
                endDate.setDate(endDate.getDate() + 6);
                return dueDate >= today && dueDate <= endDate;
            }

            if (todoDueDateFilter === "two-weeks") {
                const endDate = new Date(today);
                endDate.setDate(endDate.getDate() + 13);
                return dueDate >= today && dueDate <= endDate;
            }

            if (todoDueDateFilter === "month") {
                const endDate = new Date(today);
                endDate.setDate(endDate.getDate() + 29);
                return dueDate >= today && dueDate <= endDate;
            }
        }

        return true;
    }), [todoDueDateFilter, todoNameFilter, todos]);

    const activeTodos = useMemo(() => filteredTodos.filter((todo) => !todo.completed), [filteredTodos]);
    const completedTodos = useMemo(() => filteredTodos.filter((todo) => todo.completed), [filteredTodos]);

    return {
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
    };
}
