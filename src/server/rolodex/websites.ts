import { serverError, type ServerSupabaseClient } from "@/server/api/route";

export async function addWebsite(
    supabase: ServerSupabaseClient,
    userId: string,
    input: { peopleId: number; url: string }
) {
    const { data, error } = await supabase
        .from("people_websites")
        .insert({
            user_id: userId,
            people_id: input.peopleId,
            url: input.url,
        })
        .select()
        .single();

    if (error) {
        console.error("Error adding website:", error);
        serverError("Failed to add website");
    }

    return data;
}

export async function deleteWebsite(
    supabase: ServerSupabaseClient,
    userId: string,
    websiteId: number
) {
    const { error } = await supabase
        .from("people_websites")
        .delete()
        .eq("id", websiteId)
        .eq("user_id", userId);

    if (error) {
        console.error("Error deleting website:", error);
        serverError("Failed to delete website");
    }
}
