import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// GET - Get last sync timestamp for incremental syncing
export async function GET(req: NextRequest) {
    // Check for Bearer token auth (from Electron app)
    const authHeader = req.headers.get('Authorization');
    let user;
    let supabase;
    
    if (authHeader?.startsWith('Bearer ')) {
        const token = authHeader.slice(7);
        supabase = createSupabaseClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                global: {
                    headers: { Authorization: `Bearer ${token}` }
                }
            }
        );
        const { data, error } = await supabase.auth.getUser(token);
        if (error || !data.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        user = data.user;
    } else {
        supabase = await createClient();
        const { data: { user: cookieUser }, error: authError } = await supabase.auth.getUser();
        if (authError || !cookieUser) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        user = cookieUser;
    }

    // Get the maximum imessage_id (ROWID) from this user's synced messages
    // Since imessage_id is TEXT, we need to fetch and find max in JS
    const { data, error } = await supabase
        .from("people_imessages")
        .select("imessage_id")
        .eq("user_id", user.id)
        .not("imessage_id", "is", null);

    if (error) {
        console.error("[iMessage Sync] Error fetching last sync:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Find the maximum imessage_id (as integer)
    let maxId: number | null = null;
    if (data && data.length > 0) {
        maxId = Math.max(...data.map(d => parseInt(d.imessage_id) || 0));
    }

    return NextResponse.json({
        lastMessageId: maxId
    });
}

interface MessageData {
    message_id: number;
    text: string;
    is_from_me: boolean;
    date: string;
}

interface ContactMessages {
    handle_id: string;
    contact_name: string | null;
    service: string;
    messages: MessageData[];
    last_message_date: string;
}

interface SyncRequest {
    messages: ContactMessages[];
}

// Normalize phone number for matching
function normalizePhone(phone: string): string {
    // Remove all non-digit characters
    const digits = phone.replace(/\D/g, '');
    // If it starts with 1 and is 11 digits, remove the 1
    if (digits.length === 11 && digits.startsWith('1')) {
        return digits.slice(1);
    }
    return digits;
}

// Normalize email for matching
function normalizeEmail(email: string): string {
    return email.toLowerCase().trim();
}

// Extract identifier type from iMessage handle
function parseHandle(handle: string): { type: 'phone' | 'email'; value: string } {
    if (handle.includes('@')) {
        return { type: 'email', value: normalizeEmail(handle) };
    }
    return { type: 'phone', value: normalizePhone(handle) };
}

// Fuzzy match score for names (returns 0-1, higher is better)
function fuzzyNameMatch(name1: string | null, name2: string): number {
    if (!name1) return 0;
    
    const n1 = name1.toLowerCase().trim();
    const n2 = name2.toLowerCase().trim();
    
    // Exact match
    if (n1 === n2) return 1;
    
    // One contains the other
    if (n1.includes(n2) || n2.includes(n1)) return 0.8;
    
    // Check if first/last names match
    const parts1 = n1.split(/\s+/);
    const parts2 = n2.split(/\s+/);
    
    let matchingParts = 0;
    for (const p1 of parts1) {
        for (const p2 of parts2) {
            if (p1 === p2 && p1.length > 1) matchingParts++;
        }
    }
    
    if (matchingParts > 0) {
        return 0.5 + (0.3 * matchingParts / Math.max(parts1.length, parts2.length));
    }
    
    return 0;
}

// POST - Sync iMessages to contacts
export async function POST(req: NextRequest) {
    // Check for Bearer token auth (from Electron app)
    const authHeader = req.headers.get('Authorization');
    let user;
    let supabase;
    
    if (authHeader?.startsWith('Bearer ')) {
        const token = authHeader.slice(7);
        // Create a client with the provided access token
        supabase = createSupabaseClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                global: {
                    headers: { Authorization: `Bearer ${token}` }
                }
            }
        );
        const { data, error } = await supabase.auth.getUser(token);
        if (error || !data.user) {
            console.error("[iMessage Sync] Bearer token auth failed:", error);
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        user = data.user;
    } else {
        // Fall back to cookie-based auth
        supabase = await createClient();
        const { data: { user: cookieUser }, error: authError } = await supabase.auth.getUser();
        if (authError || !cookieUser) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        user = cookieUser;
    }

    try {
        const body: SyncRequest = await req.json();
        const { messages } = body;

        if (!messages || !Array.isArray(messages)) {
            return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
        }

        console.log(`[iMessage Sync] Processing ${messages.length} conversations for user ${user.id}`);

        // Get all contacts for this user with their phone/email identifiers
        const { data: contacts, error: contactsError } = await supabase
            .from("people")
            .select(`
                id,
                name,
                people_contact_info (
                    type,
                    value
                )
            `)
            .eq("user_id", user.id);

        if (contactsError) {
            console.error("[iMessage Sync] Error fetching contacts:", contactsError);
            return NextResponse.json({ error: contactsError.message }, { status: 500 });
        }

        // Build lookup maps for phone and email
        const phoneToContact = new Map<string, number>();
        const emailToContact = new Map<string, number>();
        const contactsList = contacts || [];

        for (const contact of contactsList) {
            const contactInfo = contact.people_contact_info || [];
            for (const info of contactInfo) {
                if (info.type === 'phone') {
                    phoneToContact.set(normalizePhone(info.value), contact.id);
                } else if (info.type === 'email') {
                    emailToContact.set(normalizeEmail(info.value), contact.id);
                }
            }
        }

        let syncedCount = 0;
        let matchedContacts = 0;
        let totalMessages = 0;
        const matchedContactIds = new Set<number>();

        // Process each conversation
        for (const conversation of messages) {
            const { handle_id, contact_name, messages: convMessages, last_message_date } = conversation;

            if (!handle_id || !convMessages || convMessages.length === 0) continue;

            // Parse the handle to get phone/email
            const { type, value } = parseHandle(handle_id);

            // Try to match to a contact by phone/email first
            let contactId: number | undefined;
            if (type === 'phone') {
                contactId = phoneToContact.get(value);
            } else {
                contactId = emailToContact.get(value);
            }

            // If no direct match, try fuzzy name matching
            if (!contactId && contact_name) {
                let bestMatch: { id: number; score: number; name: string } | null = null;
                
                console.log(`[iMessage Sync] Trying to match iMessage contact: "${contact_name}"`);
                
                for (const contact of contactsList) {
                    const score = fuzzyNameMatch(contact_name, contact.name);
                    if (score > 0) {
                        console.log(`[iMessage Sync]   - "${contact.name}" score: ${score.toFixed(2)}`);
                    }
                    if (score >= 0.5 && (!bestMatch || score > bestMatch.score)) {
                        bestMatch = { id: contact.id, score, name: contact.name };
                    }
                }
                
                if (bestMatch) {
                    contactId = bestMatch.id;
                    console.log(`[iMessage Sync] ✓ Matched "${contact_name}" → "${bestMatch.name}" (score: ${bestMatch.score.toFixed(2)})`);
                } else {
                    console.log(`[iMessage Sync] ✗ No match found for "${contact_name}"`);
                }
            } else if (!contactId && !contact_name) {
                console.log(`[iMessage Sync] No contact name for ${handle_id}, skipping name match`);
            }

            // Store all raw messages (even if no contact match, for later matching)
            // Log sample messages to debug
            if (convMessages.length > 0) {
                const sample = convMessages.slice(0, 3).map(m => ({ text: m.text?.slice(0, 50), is_from_me: m.is_from_me }));
                console.log(`[iMessage Sync] Sample messages for ${contact_name || handle_id}:`, JSON.stringify(sample));
            }
            
            const messagesToInsert = convMessages.map(msg => ({
                user_id: user.id,
                people_id: contactId || null,
                handle_id: handle_id,
                contact_name: contact_name,
                message_text: msg.text || '',
                is_from_me: msg.is_from_me,
                message_date: msg.date,
                imessage_id: String(msg.message_id),
            }));

            // Insert or update messages
            let insertedCount = 0;
            let updatedCount = 0;
            for (const msg of messagesToInsert) {
                const { error: insertError } = await supabase
                    .from("people_imessages")
                    .insert(msg);
                
                if (insertError) {
                    // If duplicate (23505), update existing message with new contact info
                    if (insertError.code === '23505') {
                        // Update existing message with contact_name, people_id, and message_text
                        const updateData: Record<string, unknown> = { 
                            contact_name: msg.contact_name,
                            people_id: msg.people_id,
                        };
                        // Only update message_text if we have actual text
                        if (msg.message_text && msg.message_text.trim()) {
                            updateData.message_text = msg.message_text;
                        }
                        
                        const { error: updateError } = await supabase
                            .from("people_imessages")
                            .update(updateData)
                            .eq("user_id", msg.user_id)
                            .eq("handle_id", msg.handle_id)
                            .eq("imessage_id", msg.imessage_id);
                        
                        if (updateError) {
                            console.error(`[iMessage Sync] Error updating message:`, updateError);
                        } else {
                            updatedCount++;
                        }
                    } else {
                        console.error(`[iMessage Sync] Error inserting message:`, insertError);
                    }
                } else {
                    insertedCount++;
                }
            }

            if (insertedCount === 0 && updatedCount === 0 && messagesToInsert.length > 0) {
                console.log(`[iMessage Sync] No changes for ${messagesToInsert.length} messages from ${handle_id}`);
            } else {
                totalMessages += insertedCount;
                if (updatedCount > 0) {
                    console.log(`[iMessage Sync] Updated ${updatedCount} messages for ${contact_name || handle_id}`);
                }
            }

            // If we have a contact match, update the touchpoint (no notes created)
            if (contactId) {
                matchedContactIds.add(contactId);

                // Update last_touchpoint on the contact
                // First try updating if current touchpoint is older
                const { data: updated } = await supabase
                    .from("people")
                    .update({ last_touchpoint: last_message_date })
                    .eq("id", contactId)
                    .or(`last_touchpoint.is.null,last_touchpoint.lt.${last_message_date}`)
                    .select("id");

                if (updated && updated.length > 0) {
                    console.log(`[iMessage Sync] Updated touchpoint for contact ${contactId} to ${last_message_date}`);
                }

                syncedCount++;
            }
        }

        matchedContacts = matchedContactIds.size;

        console.log(`[iMessage Sync] Stored ${totalMessages} messages, synced ${syncedCount} conversations to ${matchedContacts} contacts`);

        return NextResponse.json({
            success: true,
            synced: syncedCount,
            matched: matchedContacts,
            totalMessages,
        });

    } catch (error) {
        console.error("[iMessage Sync] Error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
