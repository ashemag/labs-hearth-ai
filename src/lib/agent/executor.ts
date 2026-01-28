// lib/agent/executor.ts
// Executes tools called by the agent

import { SupabaseClient } from "@supabase/supabase-js";
import { generateEmbedding, formatEmbeddingForSupabase } from "@/lib/embeddings";
import { ToolName } from "./tools";

interface ToolContext {
    supabase: SupabaseClient;
    userId: string;
}

// Helper to find contact by name (fuzzy match)
async function findContactByName(ctx: ToolContext, name: string) {
    const { data } = await ctx.supabase
        .from("people")
        .select("id, name")
        .eq("user_id", ctx.userId)
        .ilike("name", `%${name}%`)
        .limit(5);
    return data || [];
}

// Tool implementations
export async function executeTool(
    toolName: ToolName,
    input: Record<string, unknown>,
    ctx: ToolContext
): Promise<string> {
    try {
        switch (toolName) {
            case "search_notes":
                return await searchNotes(ctx, input);
            case "search_messages":
                return await searchMessages(ctx, input);
            case "get_contact":
                return await getContact(ctx, input);
            case "get_recent_messages":
                return await getRecentMessages(ctx, input);
            case "get_todos":
                return await getTodos(ctx, input);
            case "get_list_members":
                return await getListMembers(ctx, input);
            case "get_all_lists":
                return await getAllLists(ctx);
            case "get_compliments":
                return await getCompliments(ctx, input);
            case "search_contacts":
                return await searchContacts(ctx, input);
            case "get_contact_stats":
                return await getContactStats(ctx, input);
            default:
                return JSON.stringify({ error: `Unknown tool: ${toolName}` });
        }
    } catch (error) {
        console.error(`Tool execution error (${toolName}):`, error);
        return JSON.stringify({ error: `Failed to execute ${toolName}` });
    }
}

// --- Tool Implementations ---

async function searchNotes(ctx: ToolContext, input: Record<string, unknown>): Promise<string> {
    const query = input.query as string;
    const limit = Math.min((input.limit as number) || 10, 20);

    const queryEmbedding = await generateEmbedding(query);
    const { data: results } = await ctx.supabase.rpc("search_notes_by_embedding", {
        search_embedding: formatEmbeddingForSupabase(queryEmbedding),
        search_user_id: ctx.userId,
        match_threshold: 0.3,
        match_count: limit,
    });

    if (!results || results.length === 0) {
        return JSON.stringify({ results: [], message: "No matching notes found" });
    }

    // Enrich with contact names
    const peopleIds = [...new Set(results.map((r: { people_id: number }) => r.people_id))];
    const { data: people } = await ctx.supabase
        .from("people")
        .select("id, name")
        .in("id", peopleIds);

    const nameMap = new Map(people?.map((p: { id: number; name: string }) => [p.id, p.name]) || []);

    const enriched = results.map((r: { people_id: number; note: string; source_type: string; created_at: string; similarity: number }) => ({
        contact: nameMap.get(r.people_id) || "Unknown",
        note: r.note,
        source: r.source_type,
        date: r.created_at,
        relevance: Math.round(r.similarity * 100) + "%"
    }));

    return JSON.stringify({ results: enriched });
}

async function searchMessages(ctx: ToolContext, input: Record<string, unknown>): Promise<string> {
    const contactName = input.contact_name as string | undefined;
    const query = input.query as string | undefined;
    const limit = Math.min((input.limit as number) || 20, 50);

    let dbQuery = ctx.supabase
        .from("people_imessages")
        .select(`
            message_text,
            is_from_me,
            message_date,
            contact_name,
            people:people_id (name)
        `)
        .eq("user_id", ctx.userId)
        .order("message_date", { ascending: false })
        .limit(limit);

    if (contactName) {
        // Find contact first
        const contacts = await findContactByName(ctx, contactName);
        if (contacts.length > 0) {
            dbQuery = dbQuery.in("people_id", contacts.map(c => c.id));
        } else {
            // Try matching by contact_name in imessages
            dbQuery = dbQuery.ilike("contact_name", `%${contactName}%`);
        }
    }

    if (query) {
        dbQuery = dbQuery.ilike("message_text", `%${query}%`);
    }

    const { data: messages } = await dbQuery;

    if (!messages || messages.length === 0) {
        return JSON.stringify({ results: [], message: "No messages found" });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const formatted = messages.map((m: any) => ({
        contact: m.people?.name || m.contact_name || "Unknown",
        message: m.message_text,
        direction: m.is_from_me ? "sent" : "received",
        date: m.message_date
    }));

    return JSON.stringify({ results: formatted });
}

async function getContact(ctx: ToolContext, input: Record<string, unknown>): Promise<string> {
    const name = input.name as string;

    const { data: contacts } = await ctx.supabase
        .from("people")
        .select(`
            id, name, custom_bio, custom_location, website_url, last_touchpoint, created_at,
            x_profile:people_x_profiles (username, display_name, bio, location, followers_count, verified),
            linkedin_profile:people_linkedin_profiles (linkedin_url, headline, location)
        `)
        .eq("user_id", ctx.userId)
        .ilike("name", `%${name}%`)
        .limit(3);

    if (!contacts || contacts.length === 0) {
        return JSON.stringify({ error: `No contact found matching "${name}"` });
    }

    // Get recent notes for the first match
    const contact = contacts[0];
    const { data: notes } = await ctx.supabase
        .from("people_notes")
        .select("note, source_type, created_at")
        .eq("people_id", contact.id)
        .order("created_at", { ascending: false })
        .limit(5);

    // Get lists this contact is in
    const { data: listMemberships } = await ctx.supabase
        .from("rolodex_list_members")
        .select("list:rolodex_lists (name, emoji)")
        .eq("people_id", contact.id);

    return JSON.stringify({
        contact: {
            name: contact.name,
            bio: contact.custom_bio,
            location: contact.custom_location,
            website: contact.website_url,
            lastInteraction: contact.last_touchpoint,
            addedOn: contact.created_at,
            twitter: contact.x_profile?.[0] || null,
            linkedin: contact.linkedin_profile?.[0] || null,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            lists: listMemberships?.map((m: any) => m.list) || [],
            recentNotes: notes || []
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        otherMatches: contacts.slice(1).map((c: any) => c.name)
    });
}

async function getRecentMessages(ctx: ToolContext, input: Record<string, unknown>): Promise<string> {
    const contactName = input.contact_name as string;
    const limit = Math.min((input.limit as number) || 20, 50);

    const contacts = await findContactByName(ctx, contactName);
    if (contacts.length === 0) {
        return JSON.stringify({ error: `No contact found matching "${contactName}"` });
    }

    const { data: messages } = await ctx.supabase
        .from("people_imessages")
        .select("message_text, is_from_me, message_date")
        .eq("user_id", ctx.userId)
        .eq("people_id", contacts[0].id)
        .order("message_date", { ascending: false })
        .limit(limit);

    if (!messages || messages.length === 0) {
        return JSON.stringify({ contact: contacts[0].name, messages: [], message: "No messages found" });
    }

    // Reverse to show chronological order
    const chronological = messages.reverse().map((m: { message_text: string; is_from_me: boolean; message_date: string }) => ({
        message: m.message_text,
        direction: m.is_from_me ? "sent" : "received",
        date: m.message_date
    }));

    return JSON.stringify({ contact: contacts[0].name, messages: chronological });
}

async function getTodos(ctx: ToolContext, input: Record<string, unknown>): Promise<string> {
    const contactName = input.contact_name as string | undefined;
    const includeCompleted = input.include_completed as boolean || false;

    let dbQuery = ctx.supabase
        .from("rolodex_todos")
        .select(`
            task, due_date, completed, created_at,
            people:people_id (name)
        `)
        .eq("user_id", ctx.userId)
        .order("due_date", { ascending: true, nullsFirst: false });

    if (!includeCompleted) {
        dbQuery = dbQuery.eq("completed", false);
    }

    if (contactName) {
        const contacts = await findContactByName(ctx, contactName);
        if (contacts.length > 0) {
            dbQuery = dbQuery.in("people_id", contacts.map(c => c.id));
        }
    }

    const { data: todos } = await dbQuery;

    if (!todos || todos.length === 0) {
        return JSON.stringify({ todos: [], message: "No todos found" });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const formatted = todos.map((t: any) => ({
        task: t.task,
        contact: t.people?.name || "Unknown",
        dueDate: t.due_date,
        completed: t.completed
    }));

    return JSON.stringify({ todos: formatted });
}

async function getListMembers(ctx: ToolContext, input: Record<string, unknown>): Promise<string> {
    const listName = input.list_name as string;

    // Find the list
    const { data: lists } = await ctx.supabase
        .from("rolodex_lists")
        .select("id, name, emoji, color")
        .eq("user_id", ctx.userId)
        .ilike("name", `%${listName}%`)
        .limit(1);

    if (!lists || lists.length === 0) {
        return JSON.stringify({ error: `No list found matching "${listName}"` });
    }

    const list = lists[0];

    // Get members
    const { data: members } = await ctx.supabase
        .from("rolodex_list_members")
        .select("people:people_id (id, name, custom_bio)")
        .eq("list_id", list.id);

    return JSON.stringify({
        list: { name: list.name, emoji: list.emoji },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        members: members?.map((m: any) => ({
            name: m.people?.name,
            bio: m.people?.custom_bio
        })) || []
    });
}

async function getAllLists(ctx: ToolContext): Promise<string> {
    const { data: lists } = await ctx.supabase
        .from("rolodex_lists")
        .select("name, emoji, color")
        .eq("user_id", ctx.userId)
        .order("pinned", { ascending: false })
        .order("name", { ascending: true });

    return JSON.stringify({ lists: lists || [] });
}

async function getCompliments(ctx: ToolContext, input: Record<string, unknown>): Promise<string> {
    const contactName = input.contact_name as string | undefined;

    let dbQuery = ctx.supabase
        .from("people_compliments")
        .select(`
            compliment, context, received_at,
            people:people_id (name)
        `)
        .eq("user_id", ctx.userId)
        .order("received_at", { ascending: false, nullsFirst: false });

    if (contactName) {
        const contacts = await findContactByName(ctx, contactName);
        if (contacts.length > 0) {
            dbQuery = dbQuery.in("people_id", contacts.map(c => c.id));
        }
    }

    const { data: compliments } = await dbQuery.limit(20);

    if (!compliments || compliments.length === 0) {
        return JSON.stringify({ compliments: [], message: "No compliments found" });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const formatted = compliments.map((c: any) => ({
        contact: c.people?.name || "Unknown",
        compliment: c.compliment,
        context: c.context,
        date: c.received_at
    }));

    return JSON.stringify({ compliments: formatted });
}

async function searchContacts(ctx: ToolContext, input: Record<string, unknown>): Promise<string> {
    const query = input.query as string;
    const searchTerm = `%${query}%`;

    // Search across multiple fields
    const { data: contacts } = await ctx.supabase
        .from("people")
        .select(`
            name, custom_bio, custom_location,
            x_profile:people_x_profiles (bio, location),
            linkedin_profile:people_linkedin_profiles (headline, location)
        `)
        .eq("user_id", ctx.userId)
        .or(`name.ilike.${searchTerm},custom_bio.ilike.${searchTerm},custom_location.ilike.${searchTerm}`)
        .limit(15);

    if (!contacts || contacts.length === 0) {
        return JSON.stringify({ results: [], message: "No contacts found matching your search" });
    }

    const formatted = contacts.map((c: { name: string; custom_bio: string; custom_location: string; x_profile: { bio: string }[]; linkedin_profile: { headline: string }[] }) => ({
        name: c.name,
        bio: c.custom_bio,
        location: c.custom_location,
        twitterBio: c.x_profile?.[0]?.bio,
        linkedinHeadline: c.linkedin_profile?.[0]?.headline
    }));

    return JSON.stringify({ results: formatted });
}

async function getContactStats(ctx: ToolContext, input: Record<string, unknown>): Promise<string> {
    const contactName = input.contact_name as string;

    const contacts = await findContactByName(ctx, contactName);
    if (contacts.length === 0) {
        return JSON.stringify({ error: `No contact found matching "${contactName}"` });
    }

    const contact = contacts[0];

    // Get counts in parallel
    const [messagesRes, notesRes, todosRes, complimentsRes] = await Promise.all([
        ctx.supabase
            .from("people_imessages")
            .select("id", { count: "exact", head: true })
            .eq("people_id", contact.id),
        ctx.supabase
            .from("people_notes")
            .select("id", { count: "exact", head: true })
            .eq("people_id", contact.id),
        ctx.supabase
            .from("rolodex_todos")
            .select("id", { count: "exact", head: true })
            .eq("people_id", contact.id)
            .eq("completed", false),
        ctx.supabase
            .from("people_compliments")
            .select("id", { count: "exact", head: true })
            .eq("people_id", contact.id)
    ]);

    // Get last message date
    const { data: lastMessage } = await ctx.supabase
        .from("people_imessages")
        .select("message_date")
        .eq("people_id", contact.id)
        .order("message_date", { ascending: false })
        .limit(1);

    return JSON.stringify({
        contact: contact.name,
        stats: {
            messageCount: messagesRes.count || 0,
            noteCount: notesRes.count || 0,
            pendingTodos: todosRes.count || 0,
            complimentCount: complimentsRes.count || 0,
            lastMessageDate: lastMessage?.[0]?.message_date || null
        }
    });
}
