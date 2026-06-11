import { badRequest, serverError, type ServerSupabaseClient } from "@/server/api/route";

type ListMemberRow = {
    people_id: number;
};

type ListRow = {
    id: number;
    name: string;
    color: string;
    emoji: string | null;
    pinned: boolean | null;
    created_at: string;
    rolodex_list_members?: ListMemberRow[] | null;
};

function toList(list: ListRow) {
    const members = list.rolodex_list_members || [];

    return {
        id: list.id,
        name: list.name,
        color: list.color,
        emoji: list.emoji || null,
        pinned: list.pinned ?? true,
        created_at: list.created_at,
        member_count: members.length,
        member_ids: members.map((member) => member.people_id),
    };
}

export function uniquePositiveIds(value: unknown) {
    if (!Array.isArray(value)) {
        return [];
    }

    return Array.from(new Set(
        value
            .map((id) => Number(id))
            .filter((id) => Number.isInteger(id) && id > 0)
    ));
}

async function validateOwnedPeopleIds(
    supabase: ServerSupabaseClient,
    userId: string,
    requestedPeopleIds: number[]
) {
    if (requestedPeopleIds.length === 0) {
        return [];
    }

    const { data, error } = await supabase
        .from("people")
        .select("id")
        .eq("user_id", userId)
        .in("id", requestedPeopleIds);

    if (error) {
        console.error("Error validating list members:", error);
        serverError("Failed to validate list members");
    }

    return (data || []).map((person) => person.id);
}

export async function listRolodexLists(supabase: ServerSupabaseClient, userId: string) {
    const { data: lists, error } = await supabase
        .from("rolodex_lists")
        .select(`
            id,
            name,
            color,
            emoji,
            pinned,
            created_at,
            rolodex_list_members (
                people_id
            )
        `)
        .eq("user_id", userId)
        .order("name", { ascending: true });

    if (error) {
        console.error("Error fetching lists:", error);
        serverError("Failed to fetch lists");
    }

    return ((lists || []) as ListRow[]).map(toList);
}

export async function createRolodexList(
    supabase: ServerSupabaseClient,
    userId: string,
    input: { name: string; color?: string; peopleIds?: number[] }
) {
    const memberIds = await validateOwnedPeopleIds(supabase, userId, input.peopleIds || []);

    const { data, error } = await supabase
        .from("rolodex_lists")
        .insert({
            user_id: userId,
            name: input.name,
            color: input.color || "#7BDFF2",
        })
        .select()
        .single();

    if (error) {
        console.error("Error creating list:", error);
        serverError("Failed to create list");
    }

    if (memberIds.length > 0) {
        const { error: membersError } = await supabase
            .from("rolodex_list_members")
            .insert(memberIds.map((peopleId) => ({
                user_id: userId,
                list_id: data.id,
                people_id: peopleId,
            })));

        if (membersError) {
            console.error("Error adding initial list members:", membersError);
            serverError("Failed to add contacts to list");
        }
    }

    return {
        ...data,
        pinned: data.pinned ?? true,
        member_count: memberIds.length,
        member_ids: memberIds,
    };
}

export async function updateRolodexList(
    supabase: ServerSupabaseClient,
    userId: string,
    input: {
        id: number;
        pinned?: boolean;
        name?: string;
        color?: string;
        emoji?: string | null;
    }
) {
    const updates: Record<string, unknown> = {};

    if (typeof input.pinned === "boolean") updates.pinned = input.pinned;
    if (input.name !== undefined) updates.name = input.name;
    if (input.color !== undefined) updates.color = input.color;
    if (input.emoji !== undefined) updates.emoji = input.emoji || null;

    if (Object.keys(updates).length === 0) {
        badRequest("No updates provided");
    }

    const { data, error } = await supabase
        .from("rolodex_lists")
        .update(updates)
        .eq("id", input.id)
        .eq("user_id", userId)
        .select()
        .single();

    if (error) {
        console.error("Error updating list:", error);
        serverError("Failed to update list");
    }

    return data;
}

export async function deleteRolodexList(
    supabase: ServerSupabaseClient,
    userId: string,
    listId: number
) {
    const { error } = await supabase
        .from("rolodex_lists")
        .delete()
        .eq("id", listId)
        .eq("user_id", userId);

    if (error) {
        console.error("Error deleting list:", error);
        serverError("Failed to delete list");
    }
}
