import { serverError, type ServerSupabaseClient } from "@/server/api/route";

const todoSelect = `
    id,
    people_id,
    task,
    due_date,
    completed,
    created_at,
    people:people_id (
        name
    )
`;

interface TodoRecord {
    id: number;
    people_id: number;
    task: string;
    due_date: string | null;
    completed: boolean;
    created_at: string;
    people: { name: string } | { name: string }[] | null;
}

function contactName(people: TodoRecord["people"]) {
    if (Array.isArray(people)) {
        return people[0]?.name || "Unknown";
    }

    return people?.name || "Unknown";
}

function toTodo(todo: TodoRecord) {
    return {
        id: todo.id,
        contactId: todo.people_id,
        contactName: contactName(todo.people),
        task: todo.task,
        dueDate: todo.due_date || "",
        completed: todo.completed,
        createdAt: todo.created_at,
    };
}

export async function listTodos(supabase: ServerSupabaseClient, userId: string) {
    const { data, error } = await supabase
        .from("rolodex_todos")
        .select(todoSelect)
        .eq("user_id", userId)
        .order("due_date", { ascending: true, nullsFirst: false })
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Error fetching todos:", error);
        serverError("Failed to fetch todos");
    }

    return (data || []).map((todo) => toTodo(todo as unknown as TodoRecord));
}

export async function createTodo(
    supabase: ServerSupabaseClient,
    userId: string,
    input: { peopleId: number; task: string; dueDate?: string }
) {
    const { data, error } = await supabase
        .from("rolodex_todos")
        .insert({
            user_id: userId,
            people_id: input.peopleId,
            task: input.task,
            due_date: input.dueDate || null,
        })
        .select(todoSelect)
        .single();

    if (error) {
        console.error("Error creating todo:", error);
        serverError("Failed to create todo");
    }

    return toTodo(data as unknown as TodoRecord);
}

export async function updateTodo(
    supabase: ServerSupabaseClient,
    userId: string,
    input: { id: number; completed?: boolean; task?: string; dueDate?: string | null }
) {
    const updates: { completed?: boolean; task?: string; due_date?: string | null; updated_at: string } = {
        updated_at: new Date().toISOString(),
    };

    if (typeof input.completed === "boolean") {
        updates.completed = input.completed;
    }
    if (input.task !== undefined) {
        updates.task = input.task;
    }
    if (input.dueDate !== undefined) {
        updates.due_date = input.dueDate || null;
    }

    const { data, error } = await supabase
        .from("rolodex_todos")
        .update(updates)
        .eq("id", input.id)
        .eq("user_id", userId)
        .select(todoSelect)
        .single();

    if (error) {
        console.error("Error updating todo:", error);
        serverError("Failed to update todo");
    }

    return toTodo(data as unknown as TodoRecord);
}

export async function deleteTodo(supabase: ServerSupabaseClient, userId: string, todoId: number) {
    const { error } = await supabase
        .from("rolodex_todos")
        .delete()
        .eq("id", todoId)
        .eq("user_id", userId);

    if (error) {
        console.error("Error deleting todo:", error);
        serverError("Failed to delete todo");
    }
}
