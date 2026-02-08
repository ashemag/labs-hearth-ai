import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import OpenAI from "openai";

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

interface MatchSuggestion {
    attendee_email: string;
    attendee_name: string | null;
    event_count: number;
    action: "match" | "create" | "skip" | "me";
    // For "match" action
    matched_contact_id?: number;
    matched_contact_name?: string;
    confidence: "high" | "medium" | "low";
    reason: string;
    // For "create" action
    suggested_name?: string;
}

// POST - Use LLM to suggest matches for all unmatched calendar attendees
export async function POST() {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!process.env.OPENAI_API_KEY) {
        return NextResponse.json({ error: "OpenAI not configured" }, { status: 500 });
    }

    // Get user's profile info (linked emails, display name)
    const { data: userProfile } = await supabase
        .from("user_profiles")
        .select("linked_emails, display_name")
        .eq("id", user.id)
        .single();
    const linkedEmailsSet = new Set(
        (userProfile?.linked_emails || []).map((e: string) => e.toLowerCase().trim())
    );

    // User identity for the LLM
    const userName = user.user_metadata?.full_name || userProfile?.display_name || null;
    const userEmail = user.email || null;

    // 1. Get all unmatched attendees with their event info
    const { data: unmatchedEvents, error: unmatchedError } = await supabase
        .from("people_calendar_events")
        .select("attendee_email, attendee_name, event_title, event_start")
        .eq("user_id", user.id)
        .is("people_id", null)
        .order("event_start", { ascending: false });

    if (unmatchedError) {
        console.error("Error fetching unmatched:", unmatchedError);
        return NextResponse.json({ error: "Failed to fetch unmatched attendees" }, { status: 500 });
    }

    if (!unmatchedEvents || unmatchedEvents.length === 0) {
        return NextResponse.json({ suggestions: [] });
    }

    // Group unmatched by email, collecting event titles
    const unmatchedMap = new Map<string, {
        email: string;
        name: string | null;
        event_count: number;
        event_titles: string[];
    }>();

    for (const event of unmatchedEvents) {
        const email = event.attendee_email.toLowerCase();
        if (linkedEmailsSet.has(email)) continue;
        if (!unmatchedMap.has(email)) {
            unmatchedMap.set(email, {
                email: event.attendee_email,
                name: event.attendee_name,
                event_count: 1,
                event_titles: event.event_title ? [event.event_title] : [],
            });
        } else {
            const existing = unmatchedMap.get(email)!;
            existing.event_count++;
            if (!existing.name && event.attendee_name) {
                existing.name = event.attendee_name;
            }
            if (event.event_title && !existing.event_titles.includes(event.event_title)) {
                existing.event_titles.push(event.event_title);
            }
        }
    }

    const unmatchedList = Array.from(unmatchedMap.values())
        .sort((a, b) => b.event_count - a.event_count);

    // 2. Get all existing contacts with their contact info
    const { data: contacts, error: contactsError } = await supabase
        .from("people")
        .select(`
            id,
            name,
            people_contact_info (type, value)
        `)
        .eq("user_id", user.id)
        .order("name");

    if (contactsError) {
        console.error("Error fetching contacts:", contactsError);
        return NextResponse.json({ error: "Failed to fetch contacts" }, { status: 500 });
    }

    // Format contacts for the LLM
    const contactsList = (contacts || []).map(c => {
        const info = (c as { people_contact_info?: Array<{ type: string; value: string }> }).people_contact_info || [];
        const emails = info.filter(i => i.type === "email").map(i => i.value);
        const phones = info.filter(i => i.type === "phone").map(i => i.value);
        return {
            id: c.id,
            name: c.name,
            emails,
            phones,
        };
    });

    // 3. Build the LLM prompt
    const userIdentity = [
        userName ? `Name: ${userName}` : null,
        userEmail ? `Primary email: ${userEmail}` : null,
        linkedEmailsSet.size > 0 ? `Known emails: ${[...linkedEmailsSet].join(", ")}` : null,
    ].filter(Boolean).join("\n");

    const systemPrompt = `You are a contact matching assistant for a personal Rolodex. You will be given:
1. The OWNER's identity (name, emails)
2. A list of UNMATCHED calendar attendees (people from Google Calendar events that haven't been linked to contacts yet)
3. A list of EXISTING CONTACTS in the user's Rolodex (with their names, emails, phone numbers)

Your job is to propose matches between unmatched attendees and existing contacts, identify which attendees are actually the owner themselves, or suggest creating new contacts.

THE OWNER:
${userIdentity}

MATCHING RULES:
- If an attendee's name or email looks like it belongs to the owner (same name, nickname, alternate email, work email, etc.), use action "me"
- Match if the attendee's email domain + name matches a contact (e.g., "john.smith@company.com" likely matches "John Smith")
- Match if the attendee's display name is clearly the same person as an existing contact (accounting for nicknames, initials, name variations)
- Match if the attendee's email prefix clearly maps to a contact name (e.g., "jsmith@..." matches "John Smith")
- DO NOT match generic/group emails like "team@", "info@", "noreply@", "support@", "hello@", "admin@" to any contact
- For generic/group emails, suggest "skip"
- For attendees that don't match any existing contact and aren't the owner, suggest "create" with a clean display name

CONFIDENCE LEVELS:
- "high": Email exact match, or name is clearly identical
- "medium": Name is very similar or email prefix strongly suggests the person
- "low": Partial name match or educated guess

Return a JSON array of objects, one per unmatched attendee. Each object must have:
{
  "attendee_email": "the email",
  "action": "match" | "create" | "skip" | "me",
  "matched_contact_id": <number, only for "match">,
  "matched_contact_name": "<string, only for "match">",
  "confidence": "high" | "medium" | "low",
  "reason": "<brief explanation>",
  "suggested_name": "<clean display name, only for 'create'>"
}

Only return valid JSON array. No markdown, no explanation outside the array.`;

    const unmatchedForPrompt = unmatchedList.map(u => ({
        email: u.email,
        display_name: u.name,
        event_count: u.event_count,
        recent_event_titles: u.event_titles.slice(0, 5),
    }));

    const contactsForPrompt = contactsList.map(c => ({
        id: c.id,
        name: c.name,
        emails: c.emails,
    }));

    const userPrompt = `UNMATCHED CALENDAR ATTENDEES (${unmatchedForPrompt.length} people):
${JSON.stringify(unmatchedForPrompt, null, 2)}

EXISTING CONTACTS (${contactsForPrompt.length} contacts):
${JSON.stringify(contactsForPrompt, null, 2)}

Propose matches for each unmatched attendee. Return only a JSON array.`;

    try {
        const response = await openai.chat.completions.create({
            model: "gpt-5-mini-2025-08-07",
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt },
            ],
            max_completion_tokens: 4096,
        });

        const content = response.choices?.[0]?.message?.content?.trim();

        if (!content) {
            return NextResponse.json({ suggestions: [] });
        }

        // Parse JSON from response (handle potential markdown wrapping)
        let parsed: MatchSuggestion[];
        try {
            const jsonMatch = content.match(/\[[\s\S]*\]/);
            if (!jsonMatch) {
                console.error("[Calendar Suggest] No JSON array found in response:", content);
                return NextResponse.json({ suggestions: [] });
            }
            parsed = JSON.parse(jsonMatch[0]);
        } catch (parseErr) {
            console.error("[Calendar Suggest] Failed to parse LLM response:", content);
            return NextResponse.json({ suggestions: [] });
        }

        // Enrich suggestions with attendee info from our data
        const suggestions: MatchSuggestion[] = parsed.map(s => {
            const attendeeData = unmatchedMap.get(s.attendee_email.toLowerCase());
            return {
                attendee_email: s.attendee_email,
                attendee_name: attendeeData?.name || s.attendee_email,
                event_count: attendeeData?.event_count || 0,
                action: s.action,
                matched_contact_id: s.action === "match" ? s.matched_contact_id : undefined,
                matched_contact_name: s.action === "match" ? s.matched_contact_name : undefined,
                confidence: s.confidence || "low",
                reason: s.reason || "",
                suggested_name: s.action === "create" ? (s.suggested_name || attendeeData?.name || s.attendee_email) : undefined,
            };
        });

        // Sort: matches first (high > medium > low), then creates, then skips
        const actionOrder = { match: 0, create: 1, skip: 2 };
        const confidenceOrder = { high: 0, medium: 1, low: 2 };
        suggestions.sort((a, b) => {
            const actionDiff = actionOrder[a.action] - actionOrder[b.action];
            if (actionDiff !== 0) return actionDiff;
            return confidenceOrder[a.confidence] - confidenceOrder[b.confidence];
        });

        console.log(`[Calendar Suggest] Generated ${suggestions.length} suggestions (${suggestions.filter(s => s.action === "match").length} matches, ${suggestions.filter(s => s.action === "create").length} creates, ${suggestions.filter(s => s.action === "skip").length} skips)`);

        return NextResponse.json({ suggestions });

    } catch (err) {
        console.error("[Calendar Suggest] LLM error:", err);
        return NextResponse.json({
            error: err instanceof Error ? err.message : "Failed to generate suggestions",
        }, { status: 500 });
    }
}
