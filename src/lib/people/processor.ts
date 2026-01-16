// lib/people/processor.ts
// OpenAI agent for processing people-related messages (user-scoped)

import OpenAI from "openai";
import {
  addPersonNote,
  addPersonCompliment,
  addPersonTodo,
  findPersonByName,
  getAllPeople,
  createPerson,
  findPeopleByPartialName,
} from "./index";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// ============================================================================
// TOOL DEFINITIONS
// ============================================================================

const tools: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "add_person_by_name",
      description: "Add a person to the contacts database using their name. Use this when someone mentions a person who isn't in the database yet.",
      parameters: {
        type: "object",
        properties: {
          name: {
            type: "string",
            description: "The person's full name (e.g., 'Grace Stayner', 'John Smith')",
          },
        },
        required: ["name"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "add_note_about_person",
      description: "Add a note about a person. The person can be identified by their name.",
      parameters: {
        type: "object",
        properties: {
          person_identifier: {
            type: "string",
            description: "The person's name (full or partial)",
          },
          note: {
            type: "string",
            description: "The note to add about this person",
          },
        },
        required: ["person_identifier", "note"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "add_compliment_from_person",
      description: "Record a compliment or kind words that someone said about the user. Use this when the user mentions something nice someone said about them.",
      parameters: {
        type: "object",
        properties: {
          person_identifier: {
            type: "string",
            description: "The person's name (who gave the compliment)",
          },
          compliment: {
            type: "string",
            description: "The actual compliment or kind words they said",
          },
          context: {
            type: "string",
            description: "Optional context for where/when the compliment was given",
          },
        },
        required: ["person_identifier", "compliment"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "add_todo_for_person",
      description: "Add a to-do/task related to a person. Use this when the user mentions something they need to do for or regarding someone.",
      parameters: {
        type: "object",
        properties: {
          person_identifier: {
            type: "string",
            description: "The person's name (who the todo is about)",
          },
          task: {
            type: "string",
            description: "The task or action to be done",
          },
          due_date: {
            type: "string",
            description: "Optional due date in YYYY-MM-DD format",
          },
        },
        required: ["person_identifier", "task"],
      },
    },
  },
];

// ============================================================================
// TOOL EXECUTION
// ============================================================================

interface ToolExecutionResult {
  success: boolean;
  message: string;
  data?: unknown;
}

async function executeAddPersonByName(userId: string, name: string): Promise<ToolExecutionResult> {
  console.log("👤 [PEOPLE AGENT] Executing add_person_by_name for:", name);
  try {
    // Check if person already exists
    const existingPerson = await findPersonByName(userId, name);

    if (existingPerson) {
      console.log("👤 [PEOPLE AGENT] Person already exists:", existingPerson.name);
      return {
        success: true,
        message: `${existingPerson.name} is already in your contacts.`,
        data: { person: existingPerson, isNew: false },
      };
    }

    // Create new person
    const person = await createPerson(userId, name);
    console.log("👤 [PEOPLE AGENT] Successfully created person:", person.name);

    return {
      success: true,
      message: `Successfully added ${person.name} to contacts!`,
      data: { person, isNew: true },
    };
  } catch (error) {
    console.error("❌ [PEOPLE AGENT] Failed to add person by name:", error);
    return {
      success: false,
      message: `Failed to add person: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}

async function executeAddNoteAboutPerson(
  userId: string,
  personIdentifier: string,
  note: string,
  sourceMessageTs?: string,
  sourceChannel?: string
): Promise<ToolExecutionResult> {
  try {
    const person = await findPersonByName(userId, personIdentifier);

    if (!person) {
      const partialMatches = await findPeopleByPartialName(userId, personIdentifier);

      if (partialMatches.length > 1) {
        const nameList = partialMatches.map(p => `• ${p.name}`).join('\n');
        return {
          success: false,
          message: `The name "${personIdentifier}" matches multiple people. Please be more specific:\n${nameList}`,
        };
      }

      return {
        success: false,
        message: `Could not find person: ${personIdentifier}. Please add them first.`,
      };
    }

    const personNote = await addPersonNote(userId, person.id, note, {
      sourceType: "slack",
      sourceMessageTs,
      sourceChannel,
    });

    return {
      success: true,
      message: `Added note about ${person.name}`,
      data: { person, note: personNote },
    };
  } catch (error) {
    console.error("❌ [PEOPLE AGENT] Failed to add note:", error);
    return {
      success: false,
      message: `Failed to add note: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}

async function executeAddComplimentFromPerson(
  userId: string,
  personIdentifier: string,
  compliment: string,
  context?: string
): Promise<ToolExecutionResult> {
  try {
    const person = await findPersonByName(userId, personIdentifier);

    if (!person) {
      const partialMatches = await findPeopleByPartialName(userId, personIdentifier);

      if (partialMatches.length > 1) {
        const nameList = partialMatches.map(p => `• ${p.name}`).join('\n');
        return {
          success: false,
          message: `The name "${personIdentifier}" matches multiple people. Please be more specific:\n${nameList}`,
        };
      }

      return {
        success: false,
        message: `Could not find person: ${personIdentifier}. Please add them first.`,
      };
    }

    const personCompliment = await addPersonCompliment(userId, person.id, compliment, context);

    return {
      success: true,
      message: `💝 Saved compliment from ${person.name}!`,
      data: { person, compliment: personCompliment },
    };
  } catch (error) {
    console.error("❌ [PEOPLE AGENT] Failed to add compliment:", error);
    return {
      success: false,
      message: `Failed to add compliment: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}

async function executeAddTodoForPerson(
  userId: string,
  personIdentifier: string,
  task: string,
  dueDate?: string
): Promise<ToolExecutionResult> {
  try {
    const person = await findPersonByName(userId, personIdentifier);

    if (!person) {
      const partialMatches = await findPeopleByPartialName(userId, personIdentifier);

      if (partialMatches.length > 1) {
        const nameList = partialMatches.map(p => `• ${p.name}`).join('\n');
        return {
          success: false,
          message: `The name "${personIdentifier}" matches multiple people. Please be more specific:\n${nameList}`,
        };
      }

      return {
        success: false,
        message: `Could not find person: ${personIdentifier}. Please add them first.`,
      };
    }

    const todo = await addPersonTodo(userId, person.id, task, dueDate);

    const dueDateMsg = dueDate ? ` (due: ${dueDate})` : "";
    return {
      success: true,
      message: `✅ Added todo for ${person.name}: "${task}"${dueDateMsg}`,
      data: { person, todo },
    };
  } catch (error) {
    console.error("❌ [PEOPLE AGENT] Failed to add todo:", error);
    return {
      success: false,
      message: `Failed to add todo: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}

// ============================================================================
// MESSAGE PROCESSING
// ============================================================================

export interface ProcessPeopleMessageParams {
  userId: string;
  text: string;
  messageTs?: string;
  channelId?: string;
  parentMessage?: string;
}

export interface ProcessPeopleMessageResult {
  shouldRespond: boolean;
  response?: string;
  toolsExecuted: string[];
}

/**
 * Process a message using OpenAI agent (user-scoped)
 */
export async function processPeopleMessage(
  params: ProcessPeopleMessageParams
): Promise<ProcessPeopleMessageResult> {
  console.log("👤 [PEOPLE AGENT] Processing message for user:", params.userId);
  console.log("👤 [PEOPLE AGENT] Message:", params.text);

  // Load all people for context
  const allPeople = await getAllPeople(params.userId);
  const peopleList = allPeople.length > 0
    ? `\n\nPeople in your contacts database:\n${allPeople.map(p => `- ${p.name} (ID: ${p.id})`).join('\n')}`
    : "\n\nNo people in your contacts database yet.";

  console.log(`👤 [PEOPLE AGENT] Loaded ${allPeople.length} people for context`);

  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    {
      role: "system",
      content: `You are a helpful assistant that manages a contacts database for tracking people and relationships.

Your capabilities:
1. When someone mentions a person by name who isn't in the database yet, use the add_person_by_name tool to add them
2. When you see notes or information about people, use the add_note_about_person tool to save it
3. When someone shares a compliment or kind words they received from another person, use the add_compliment_from_person tool to save it
4. When someone mentions something they need to do for or about a person, use the add_todo_for_person tool to create a task

Guidelines:
- If you see a person's name who isn't in the contacts database, add them automatically using add_person_by_name
- Extract useful information about people and save it as notes
- Be concise and friendly in your responses
- If someone mentions information about a person (e.g., "John works at Google"), save that as a note
- When responding to a thread, use the parent message as context
- When someone lists touchpoints/interactions with people (e.g., "Called Austin, emailed Sarah, met with John"), save each interaction as a separate note for each person

COMPLIMENTS:
- When the user shares something nice someone said about them, use add_compliment_from_person
- Compliments are praise, kind words, positive feedback, or recognition someone gave TO the user
- Examples: "Sarah said I'm a great engineer", "John complimented my presentation"

TODOS:
- When the user mentions something they need to do for or about a person, use add_todo_for_person
- Look for phrases like "need to", "remind me to", "follow up with", "should", "have to"
- Examples: "need to email John about the project", "remind me to call Sarah"

PARTIAL NAME MATCHING:
- You can use partial names! If someone says "Grace" and only one person has "Grace" in their name, it will match
- If multiple people match, the system will ask for clarification

IMPORTANT: Format your responses using Slack markdown:
- Use *text* for bold (not **text**)
- Use _text_ for italic
- Use • for bullet points

${peopleList}`,
    },
  ];

  // If this is a thread reply, add parent context
  if (params.parentMessage) {
    messages.push({
      role: "user",
      content: `[Context from parent message]: ${params.parentMessage}`,
    });
    messages.push({
      role: "assistant",
      content: "I'll use this context to understand your next message.",
    });
  }

  messages.push({
    role: "user",
    content: params.text,
  });

  const toolsExecuted: string[] = [];
  let finalResponse = "";

  try {
    console.log("👤 [PEOPLE AGENT] Calling OpenAI API...");

    let response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages,
      tools,
      tool_choice: "auto",
    });

    console.log("👤 [PEOPLE AGENT] OpenAI response received, finish_reason:", response.choices[0].finish_reason);

    let iterations = 0;
    const maxIterations = 5;

    // Tool calling loop
    while (response.choices[0].finish_reason === "tool_calls" && iterations < maxIterations) {
      iterations++;
      const toolCalls = response.choices[0].message.tool_calls;

      if (!toolCalls) break;

      messages.push(response.choices[0].message);

      for (const toolCall of toolCalls) {
        if (toolCall.type !== "function") continue;

        const functionName = toolCall.function.name;
        const functionArgs = JSON.parse(toolCall.function.arguments);

        console.log(`   🔧 Executing tool: ${functionName}`, functionArgs);
        toolsExecuted.push(functionName);

        let result: ToolExecutionResult;

        if (functionName === "add_person_by_name") {
          result = await executeAddPersonByName(params.userId, functionArgs.name);
        } else if (functionName === "add_note_about_person") {
          result = await executeAddNoteAboutPerson(
            params.userId,
            functionArgs.person_identifier,
            functionArgs.note,
            params.messageTs,
            params.channelId
          );
        } else if (functionName === "add_compliment_from_person") {
          result = await executeAddComplimentFromPerson(
            params.userId,
            functionArgs.person_identifier,
            functionArgs.compliment,
            functionArgs.context
          );
        } else if (functionName === "add_todo_for_person") {
          result = await executeAddTodoForPerson(
            params.userId,
            functionArgs.person_identifier,
            functionArgs.task,
            functionArgs.due_date
          );
        } else {
          result = { success: false, message: `Unknown function: ${functionName}` };
        }

        messages.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: JSON.stringify(result),
        });
      }

      response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages,
        tools,
        tool_choice: "auto",
      });
    }

    finalResponse = response.choices[0].message.content || "";
    console.log(`   ✓ Agent response: ${finalResponse}`);

  } catch (error) {
    console.error("❌ [PEOPLE AGENT] Error processing message:", error);
    return {
      shouldRespond: true,
      response: "Sorry, I encountered an error processing your message.",
      toolsExecuted,
    };
  }

  return {
    shouldRespond: toolsExecuted.length > 0 || finalResponse.length > 0,
    response: finalResponse || undefined,
    toolsExecuted,
  };
}


