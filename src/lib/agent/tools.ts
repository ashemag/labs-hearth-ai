// lib/agent/tools.ts
// Tool definitions for the Hearth chat agent

import Anthropic from "@anthropic-ai/sdk";

export const AGENT_TOOLS: Anthropic.Tool[] = [
    {
        name: "search_notes",
        description: "Semantic search across all notes about contacts. Use this to find information based on meaning, not just keywords. Good for questions like 'What do I know about X?' or 'Who is interested in Y?'",
        input_schema: {
            type: "object" as const,
            properties: {
                query: {
                    type: "string",
                    description: "Natural language search query"
                },
                limit: {
                    type: "number",
                    description: "Maximum number of results (default 10, max 20)"
                }
            },
            required: ["query"]
        }
    },
    {
        name: "search_messages",
        description: "Search iMessage conversation history. Use this to find specific messages or conversations. Can search by contact name and/or message content.",
        input_schema: {
            type: "object" as const,
            properties: {
                contact_name: {
                    type: "string",
                    description: "Name of the contact to search messages for (optional if searching all)"
                },
                query: {
                    type: "string",
                    description: "Text to search for in messages (optional)"
                },
                limit: {
                    type: "number",
                    description: "Maximum number of messages to return (default 20, max 50)"
                }
            },
            required: []
        }
    },
    {
        name: "get_contact",
        description: "Get detailed information about a specific contact by name. Returns profile info, bio, location, social profiles, recent notes, and more.",
        input_schema: {
            type: "object" as const,
            properties: {
                name: {
                    type: "string",
                    description: "Name of the contact to look up (partial match supported)"
                }
            },
            required: ["name"]
        }
    },
    {
        name: "get_recent_messages",
        description: "Get the most recent iMessage conversation with a specific contact. Use this when asked about recent conversations or 'last time I talked to X'.",
        input_schema: {
            type: "object" as const,
            properties: {
                contact_name: {
                    type: "string",
                    description: "Name of the contact"
                },
                limit: {
                    type: "number",
                    description: "Number of recent messages to return (default 20, max 50)"
                }
            },
            required: ["contact_name"]
        }
    },
    {
        name: "get_todos",
        description: "Get tasks/todos associated with contacts. Can filter by contact name or get all pending todos.",
        input_schema: {
            type: "object" as const,
            properties: {
                contact_name: {
                    type: "string",
                    description: "Name of contact to get todos for (optional, omit for all todos)"
                },
                include_completed: {
                    type: "boolean",
                    description: "Whether to include completed todos (default false)"
                }
            },
            required: []
        }
    },
    {
        name: "get_list_members",
        description: "Get all contacts in a specific list/category. Use when asked about groups like 'investors', 'team', 'family', etc.",
        input_schema: {
            type: "object" as const,
            properties: {
                list_name: {
                    type: "string",
                    description: "Name of the list to get members from"
                }
            },
            required: ["list_name"]
        }
    },
    {
        name: "get_all_lists",
        description: "Get all lists/categories the user has created. Use this to see how contacts are organized.",
        input_schema: {
            type: "object" as const,
            properties: {},
            required: []
        }
    },
    {
        name: "get_compliments",
        description: "Get compliments/positive notes about contacts. Can filter by contact name.",
        input_schema: {
            type: "object" as const,
            properties: {
                contact_name: {
                    type: "string",
                    description: "Name of contact to get compliments for (optional)"
                }
            },
            required: []
        }
    },
    {
        name: "search_contacts",
        description: "Search for contacts matching criteria. Searches across names, bios, locations, and social profile data.",
        input_schema: {
            type: "object" as const,
            properties: {
                query: {
                    type: "string",
                    description: "Search query - matches against name, bio, location, X bio, LinkedIn headline"
                }
            },
            required: ["query"]
        }
    },
    {
        name: "get_contact_stats",
        description: "Get statistics about a contact - message count, last interaction, number of notes, etc.",
        input_schema: {
            type: "object" as const,
            properties: {
                contact_name: {
                    type: "string",
                    description: "Name of the contact"
                }
            },
            required: ["contact_name"]
        }
    }
];

// Tool name type for type safety
export type ToolName =
    | "search_notes"
    | "search_messages"
    | "get_contact"
    | "get_recent_messages"
    | "get_todos"
    | "get_list_members"
    | "get_all_lists"
    | "get_compliments"
    | "search_contacts"
    | "get_contact_stats";
