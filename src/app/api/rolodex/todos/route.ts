import { NextResponse } from "next/server";
import {
    optionalString,
    readJsonObject,
    requiredNumber,
    requiredString,
    withUser,
} from "@/server/api/route";
import { createTodo, deleteTodo, listTodos, updateTodo } from "@/server/rolodex/todos";

// GET - Fetch all todos with contact names
export const GET = withUser(async (_req, { supabase, user }) => {
    const todos = await listTodos(supabase, user.id);
    return NextResponse.json({ todos });
});

// POST - Create a new todo
export const POST = withUser(async (req, { supabase, user }) => {
    const body = await readJsonObject(req);
    const peopleId = requiredNumber(body.people_id, "people_id");
    const task = requiredString(body.task, "task");
    const dueDate = optionalString(body.due_date);

    const todo = await createTodo(supabase, user.id, { peopleId, task, dueDate });
    return NextResponse.json({ todo });
});

// PATCH - Update a todo
export const PATCH = withUser(async (req, { supabase, user }) => {
    const body = await readJsonObject(req);
    const id = requiredNumber(body.id, "Todo ID");
    const task = body.task === undefined ? undefined : requiredString(body.task, "task");
    const dueDate = optionalString(body.due_date);
    const completed = typeof body.completed === "boolean" ? body.completed : undefined;

    const todo = await updateTodo(supabase, user.id, { id, completed, task, dueDate });
    return NextResponse.json({ todo });
});

// DELETE - Remove a todo
export const DELETE = withUser(async (req, { supabase, user }) => {
    const { searchParams } = new URL(req.url);
    const todoId = requiredNumber(searchParams.get("id"), "Todo ID");

    await deleteTodo(supabase, user.id, todoId);
    return NextResponse.json({ success: true });
});
