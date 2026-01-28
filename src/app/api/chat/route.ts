import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { decrypt } from "@/lib/crypto";
import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { AGENT_TOOLS, ToolName } from "@/lib/agent/tools";
import { executeTool } from "@/lib/agent/executor";

interface ChatMessage {
    role: "user" | "assistant";
    content: string;
}

// Default models per provider
const DEFAULT_MODELS: Record<string, string> = {
    anthropic: "claude-sonnet-4-20250514",
    openai: "gpt-4o",
    google: "gemini-2.0-flash",
    mistral: "mistral-large-latest",
    groq: "llama-3.3-70b-versatile",
    openrouter: "anthropic/claude-sonnet-4",
};

// Base URLs for OpenAI-compatible providers
const PROVIDER_BASE_URLS: Record<string, string> = {
    openai: "https://api.openai.com/v1",
    google: "https://generativelanguage.googleapis.com/v1beta/openai",
    mistral: "https://api.mistral.ai/v1",
    groq: "https://api.groq.com/openai/v1",
    openrouter: "https://openrouter.ai/api/v1",
};

const SYSTEM_PROMPT = `You are a helpful assistant for Hearth, a personal CRM / rolodex app. You help users understand and navigate their relationships and contacts.

You have access to tools that let you search and retrieve information about the user's:
- Contacts and their profiles (Twitter/X, LinkedIn)
- Notes about contacts
- iMessage conversation history
- Tasks/todos for contacts
- Lists/categories of contacts
- Compliments and positive notes

IMPORTANT GUIDELINES:
1. Use tools proactively to answer questions - don't guess or make up information
2. For questions about specific people, use get_contact first, then search_notes or get_recent_messages as needed
3. For broad questions like "who do I know that...", use search_notes or search_contacts
4. For questions about conversations, use search_messages or get_recent_messages
5. Be concise and direct in your responses
6. Reference specific data you found (names, dates, quotes from messages/notes)
7. If you can't find information, say so honestly
8. Protect privacy - only share what's in the data, don't speculate`;

// Maximum tool calls per request to prevent infinite loops
const MAX_TOOL_CALLS = 8;

async function runAnthropicAgent(
    apiKey: string,
    messages: ChatMessage[],
    supabase: Awaited<ReturnType<typeof createClient>>,
    userId: string
): Promise<string> {
    const client = new Anthropic({ apiKey });

    // Convert messages to Anthropic format
    const anthropicMessages: Anthropic.MessageParam[] = messages.map(m => ({
        role: m.role,
        content: m.content
    }));

    let toolCallCount = 0;

    // Agent loop - keep calling until we get a final response
    while (toolCallCount < MAX_TOOL_CALLS) {
        const response = await client.messages.create({
            model: DEFAULT_MODELS.anthropic,
            max_tokens: 2048,
            system: SYSTEM_PROMPT,
            tools: AGENT_TOOLS,
            messages: anthropicMessages,
        });

        // Check if we have tool calls
        const toolUseBlocks = response.content.filter(
            (block): block is Anthropic.ToolUseBlock => block.type === "tool_use"
        );

        // If no tool calls, extract the text response and return
        if (toolUseBlocks.length === 0) {
            const textBlock = response.content.find(
                (block): block is Anthropic.TextBlock => block.type === "text"
            );
            return textBlock?.text || "I couldn't generate a response.";
        }

        // Process tool calls
        toolCallCount += toolUseBlocks.length;

        // Add assistant message with tool use
        anthropicMessages.push({
            role: "assistant",
            content: response.content
        });

        // Execute each tool and collect results
        const toolResults: Anthropic.ToolResultBlockParam[] = [];
        for (const toolUse of toolUseBlocks) {
            const result = await executeTool(
                toolUse.name as ToolName,
                toolUse.input as Record<string, unknown>,
                { supabase, userId }
            );
            toolResults.push({
                type: "tool_result",
                tool_use_id: toolUse.id,
                content: result
            });
        }

        // Add tool results
        anthropicMessages.push({
            role: "user",
            content: toolResults
        });

        // Check stop reason - if end_turn, we're done after processing
        if (response.stop_reason === "end_turn") {
            const textBlock = response.content.find(
                (block): block is Anthropic.TextBlock => block.type === "text"
            );
            if (textBlock?.text) {
                return textBlock.text;
            }
        }
    }

    return "I made too many tool calls trying to answer your question. Please try a more specific question.";
}

async function runOpenAIAgent(
    apiKey: string,
    provider: string,
    messages: ChatMessage[],
    supabase: Awaited<ReturnType<typeof createClient>>,
    userId: string
): Promise<string> {
    const baseURL = PROVIDER_BASE_URLS[provider];
    if (!baseURL) throw new Error(`Unknown provider: ${provider}`);

    const client = new OpenAI({ apiKey, baseURL });

    // Convert tools to OpenAI format
    const openaiTools: OpenAI.ChatCompletionTool[] = AGENT_TOOLS.map(tool => ({
        type: "function" as const,
        function: {
            name: tool.name,
            description: tool.description,
            parameters: tool.input_schema as Record<string, unknown>
        }
    }));

    // Build messages
    const openaiMessages: OpenAI.ChatCompletionMessageParam[] = [
        { role: "system", content: SYSTEM_PROMPT },
        ...messages.map(m => ({
            role: m.role as "user" | "assistant",
            content: m.content
        }))
    ];

    let toolCallCount = 0;

    while (toolCallCount < MAX_TOOL_CALLS) {
        const response = await client.chat.completions.create({
            model: DEFAULT_MODELS[provider],
            max_tokens: 2048,
            messages: openaiMessages,
            tools: openaiTools,
        });

        const choice = response.choices[0];
        const message = choice.message;

        // If no tool calls, return the response
        if (!message.tool_calls || message.tool_calls.length === 0) {
            return message.content || "I couldn't generate a response.";
        }

        // Process tool calls
        toolCallCount += message.tool_calls.length;

        // Add assistant message
        openaiMessages.push(message);

        // Execute each tool
        for (const toolCall of message.tool_calls) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const tc = toolCall as any;
            const args = JSON.parse(tc.function.arguments);
            const result = await executeTool(
                tc.function.name as ToolName,
                args,
                { supabase, userId }
            );

            openaiMessages.push({
                role: "tool",
                tool_call_id: tc.id,
                content: result
            });
        }

        // If finish reason is stop, we're done
        if (choice.finish_reason === "stop") {
            return message.content || "I couldn't generate a response.";
        }
    }

    return "I made too many tool calls trying to answer your question. Please try a more specific question.";
}

export async function POST(req: NextRequest) {
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
        return NextResponse.json(
            { error: "No AI provider configured. Go to Settings to add your API key." },
            { status: 400 }
        );
    }

    let apiKey: string;
    try {
        apiKey = decrypt(settings.api_key_encrypted);
    } catch {
        return NextResponse.json({ error: "Failed to decrypt API key. Try re-saving it in Settings." }, { status: 500 });
    }

    const body = await req.json();
    const { messages } = body as { messages: ChatMessage[] };

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
        return NextResponse.json({ error: "Messages are required" }, { status: 400 });
    }

    try {
        let reply: string;
        if (settings.provider === "anthropic") {
            reply = await runAnthropicAgent(apiKey, messages, supabase, user.id);
        } else {
            reply = await runOpenAIAgent(apiKey, settings.provider, messages, supabase, user.id);
        }

        return NextResponse.json({ reply });
    } catch (err: unknown) {
        console.error("Chat API error:", err);
        const message = err instanceof Error ? err.message : "Failed to generate response";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
