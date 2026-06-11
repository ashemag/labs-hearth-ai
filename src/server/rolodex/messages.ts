import { serverError, type ServerSupabaseClient } from "@/server/api/route";

export async function listContactMessages(
    supabase: ServerSupabaseClient,
    userId: string,
    input: { peopleId: number; limit: number }
) {
    const { data: messages, error } = await supabase
        .from("people_imessages")
        .select("id, message_text, is_from_me, message_date, handle_id, contact_name")
        .eq("user_id", userId)
        .eq("people_id", input.peopleId)
        .order("message_date", { ascending: false })
        .limit(input.limit);

    if (error) {
        console.error("Error fetching iMessages:", error);
        serverError("Failed to fetch messages");
    }

    return messages || [];
}

export async function listHandlePreviewMessages(
    supabase: ServerSupabaseClient,
    userId: string,
    handleId: string
) {
    const { data: messages, error } = await supabase
        .from("people_imessages")
        .select("message_text, is_from_me, message_date")
        .eq("user_id", userId)
        .eq("handle_id", handleId)
        .order("message_date", { ascending: false })
        .limit(15);

    if (error) {
        serverError("Failed to fetch messages");
    }

    return (messages || []).reverse();
}
