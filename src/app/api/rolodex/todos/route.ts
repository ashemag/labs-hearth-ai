import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET - Fetch all todos with contact names
export async function GET() {
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { data, error } = await supabase
            .from("rolodex_todos")
            .select(`
                id,
                people_id,
                task,
                due_date,
                completed,
                created_at,
                people:people_id (
                    name
                )
            `)
            .eq("user_id", user.id)
            .order("due_date", { ascending: true, nullsFirst: false })
            .order("created_at", { ascending: false });

        if (error) {
            console.error("Error fetching todos:", error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        // Transform to include contact name at top level
        const todos = data?.map(todo => {
            const people = todo.people as unknown as { name: string } | null;
            return {
                id: todo.id,
                contactId: todo.people_id,
                contactName: people?.name || "Unknown",
                task: todo.task,
                dueDate: todo.due_date || "",
                completed: todo.completed,
                createdAt: todo.created_at,
            };
        }) || [];

        return NextResponse.json({ todos });
    } catch (error) {
        console.error("Error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

// POST - Create a new todo
export async function POST(req: NextRequest) {
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await req.json();
        const { people_id, task, due_date } = body;

        if (!people_id || !task) {
            return NextResponse.json({ error: "people_id and task are required" }, { status: 400 });
        }

        const { data, error } = await supabase
            .from("rolodex_todos")
            .insert({
                user_id: user.id,
                people_id,
                task,
                due_date: due_date || null,
            })
            .select(`
                id,
                people_id,
                task,
                due_date,
                completed,
                created_at,
                people:people_id (
                    name
                )
            `)
            .single();

        if (error) {
            console.error("Error creating todo:", error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        const people = data.people as unknown as { name: string } | null;
        const todo = {
            id: data.id,
            contactId: data.people_id,
            contactName: people?.name || "Unknown",
            task: data.task,
            dueDate: data.due_date || "",
            completed: data.completed,
            createdAt: data.created_at,
        };

        return NextResponse.json({ todo });
    } catch (error) {
        console.error("Error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

// PATCH - Update a todo (toggle complete or update task)
export async function PATCH(req: NextRequest) {
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await req.json();
        const { id, completed, task, due_date } = body;

        if (!id) {
            return NextResponse.json({ error: "Todo ID is required" }, { status: 400 });
        }

        const updates: { completed?: boolean; task?: string; due_date?: string | null; updated_at?: string } = {
            updated_at: new Date().toISOString(),
        };

        if (typeof completed === "boolean") {
            updates.completed = completed;
        }
        if (task !== undefined) {
            updates.task = task;
        }
        if (due_date !== undefined) {
            updates.due_date = due_date || null;
        }

        const { data, error } = await supabase
            .from("rolodex_todos")
            .update(updates)
            .eq("id", id)
            .eq("user_id", user.id)
            .select(`
                id,
                people_id,
                task,
                due_date,
                completed,
                created_at,
                people:people_id (
                    name
                )
            `)
            .single();

        if (error) {
            console.error("Error updating todo:", error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        const people = data.people as unknown as { name: string } | null;
        const todo = {
            id: data.id,
            contactId: data.people_id,
            contactName: people?.name || "Unknown",
            task: data.task,
            dueDate: data.due_date || "",
            completed: data.completed,
            createdAt: data.created_at,
        };

        return NextResponse.json({ todo });
    } catch (error) {
        console.error("Error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

// DELETE - Remove a todo
export async function DELETE(req: NextRequest) {
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { searchParams } = new URL(req.url);
        const todoId = searchParams.get("id");

        if (!todoId) {
            return NextResponse.json({ error: "Todo ID is required" }, { status: 400 });
        }

        const { error } = await supabase
            .from("rolodex_todos")
            .delete()
            .eq("id", parseInt(todoId))
            .eq("user_id", user.id);

        if (error) {
            console.error("Error deleting todo:", error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

