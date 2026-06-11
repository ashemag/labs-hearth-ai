import { ApiError, serverError, type ServerSupabaseClient } from "@/server/api/route";

export async function addListMember(
    supabase: ServerSupabaseClient,
    userId: string,
    input: { listId: number; peopleId: number }
) {
    const { error } = await supabase
        .from("rolodex_list_members")
        .insert({
            user_id: userId,
            list_id: input.listId,
            people_id: input.peopleId,
        });

    if (error) {
        if (error.code === "23505") {
            throw new ApiError("Already a member", 409);
        }

        console.error("Error adding to list:", error);
        serverError("Failed to add contact to list");
    }
}

export async function deleteListMember(
    supabase: ServerSupabaseClient,
    userId: string,
    input: { listId: number; peopleId: number }
) {
    const { error } = await supabase
        .from("rolodex_list_members")
        .delete()
        .eq("list_id", input.listId)
        .eq("people_id", input.peopleId)
        .eq("user_id", userId);

    if (error) {
        console.error("Error removing from list:", error);
        serverError("Failed to remove contact from list");
    }
}
