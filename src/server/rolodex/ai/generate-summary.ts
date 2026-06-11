import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { decrypt } from "@/lib/crypto";
import { generateEmbedding, formatEmbeddingForSupabase } from "@/lib/embeddings";
import Anthropic from "@anthropic-ai/sdk";

// Generate a conversation summary for a contact on-demand
// Called when opening a contact's side panel

const SUMMARY_PROMPT = `You are summarizing a text message conversation for a personal CRM. The user is reviewing their conversation with a contact.

IMPORTANT: In the conversation, "You" = the user who owns this CRM (the person reading this summary). The contact's name indicates messages FROM the contact TO the user.

Generate a brief, useful note (2-4 sentences) about THE CONTACT (not the user). Focus on:
- What the CONTACT said, shared, or mentioned
- The contact's plans, updates, or news
- Any commitments the CONTACT made
- The contact's emotional state or tone

Write about the contact in third person (e.g., "[Contact name] mentioned...", "They said...", "They're planning...").
Do NOT summarize what the user said or did - only summarize information ABOUT the contact.
Do NOT include greetings, sign-offs, or filler. Just the substance about the contact.

If the contact didn't share anything notable (the conversation is mostly the user talking, or just "ok", "thanks", emojis), respond with exactly: SKIP`;

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const peopleId = parseInt(id, 10);

    if (isNaN(peopleId)) {
        return NextResponse.json({ error: "Invalid contact ID" }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user's AI settings
    const { data: settings } = await supabase
        .from("user_ai_settings")
        .select("provider, api_key_encrypted")
        .eq("user_id", user.id)
        .single();

    if (!settings?.api_key_encrypted) {
        // No AI configured - silently skip
        return NextResponse.json({ skipped: true, reason: "no_ai_configured" });
    }

    // Check if we already have a recent auto_summary (within last 24 hours)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: existingSummary } = await supabase
        .from("people_notes")
        .select("id, created_at")
        .eq("user_id", user.id)
        .eq("people_id", peopleId)
        .eq("source_type", "auto_summary")
        .gte("created_at", oneDayAgo)
        .limit(1);

    if (existingSummary && existingSummary.length > 0) {
        // Already have a recent summary
        return NextResponse.json({ skipped: true, reason: "recent_summary_exists" });
    }

    // Get contact name
    const { data: contact } = await supabase
        .from("people")
        .select("name")
        .eq("id", peopleId)
        .eq("user_id", user.id)
        .single();

    if (!contact) {
        return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    }

    // Get messages from the last 24 hours
    const { data: recentMessages } = await supabase
        .from("people_imessages")
        .select("message_text, is_from_me, message_date")
        .eq("user_id", user.id)
        .eq("people_id", peopleId)
        .gte("message_date", oneDayAgo)
        .order("message_date", { ascending: true });

    if (!recentMessages || recentMessages.length < 3) {
        // Not enough messages to summarize
        return NextResponse.json({ skipped: true, reason: "insufficient_messages" });
    }

    // Check if total text is substantial enough
    const totalText = recentMessages.map(m => m.message_text).join(" ");
    if (totalText.length < 50) {
        return NextResponse.json({ skipped: true, reason: "messages_too_short" });
    }

    try {
        const apiKey = decrypt(settings.api_key_encrypted);

        const summary = await generateConversationSummary(
            apiKey,
            settings.provider,
            contact.name,
            recentMessages
        );

        if (!summary || summary === "SKIP") {
            return NextResponse.json({ skipped: true, reason: "content_not_summarizable" });
        }

        // Delete old auto_summary notes for this contact (keep things clean)
        await supabase
            .from("people_notes")
            .delete()
            .eq("user_id", user.id)
            .eq("people_id", peopleId)
            .eq("source_type", "auto_summary");

        // Generate embedding for the note
        const embedding = await generateEmbedding(summary);

        // Insert the new auto-generated note
        const { data: newNote, error: insertError } = await supabase
            .from("people_notes")
            .insert({
                user_id: user.id,
                people_id: peopleId,
                note: summary,
                source_type: "auto_summary",
                embedding: formatEmbeddingForSupabase(embedding),
                created_at: new Date().toISOString()
            })
            .select("id, note, source_type, created_at")
            .single();

        if (insertError) {
            throw insertError;
        }

        return NextResponse.json({
            generated: true,
            note: newNote
        });

    } catch (err) {
        console.error("Failed to generate summary:", err);
        return NextResponse.json({
            skipped: true,
            reason: "generation_failed",
            error: err instanceof Error ? err.message : "Unknown error"
        });
    }
}

async function generateConversationSummary(
    apiKey: string,
    provider: string,
    contactName: string,
    messages: { message_text: string; is_from_me: boolean; message_date: string }[]
): Promise<string | null> {
    // Format conversation for the prompt
    // "You" = the user reading this CRM, contact name = messages from the contact
    const conversationText = messages
        .map(m => `${m.is_from_me ? "You" : contactName}: ${m.message_text}`)
        .join("\n");

    const userPrompt = `Contact name: ${contactName}\n\nRecent conversation (You = the CRM owner, ${contactName} = the contact):\n${conversationText}`;

    if (provider === "anthropic") {
        const client = new Anthropic({ apiKey });
        const response = await client.messages.create({
            model: "claude-sonnet-4-20250514",
            max_tokens: 256,
            system: SUMMARY_PROMPT,
            messages: [{ role: "user", content: userPrompt }]
        });

        const textBlock = response.content.find(b => b.type === "text");
        return textBlock?.text?.trim() || null;
    } else {
        // OpenAI-compatible providers
        const baseUrls: Record<string, string> = {
            openai: "https://api.openai.com/v1",
            google: "https://generativelanguage.googleapis.com/v1beta/openai",
            mistral: "https://api.mistral.ai/v1",
            groq: "https://api.groq.com/openai/v1",
            openrouter: "https://openrouter.ai/api/v1",
        };
        const models: Record<string, string> = {
            openai: "gpt-4o-mini",
            google: "gemini-2.0-flash",
            mistral: "mistral-small-latest",
            groq: "llama-3.1-8b-instant",
            openrouter: "anthropic/claude-3-haiku",
        };

        const response = await fetch(`${baseUrls[provider]}/chat/completions`, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: models[provider] || "gpt-4o-mini",
                max_tokens: 256,
                messages: [
                    { role: "system", content: SUMMARY_PROMPT },
                    { role: "user", content: userPrompt }
                ]
            })
        });

        const data = await response.json();
        return data.choices?.[0]?.message?.content?.trim() || null;
    }
}
