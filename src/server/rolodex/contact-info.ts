import { ApiError, serverError, type ServerSupabaseClient } from "@/server/api/route";

export type ContactInfoType = "phone" | "email";

function normalizePhone(phone: string): string {
    const digits = phone.replace(/\D/g, "");
    if (digits.length === 11 && digits.startsWith("1")) {
        return digits.slice(1);
    }
    return digits;
}

function normalizeContactInfoValue(type: ContactInfoType, value: string) {
    return type === "phone" ? normalizePhone(value) : value.toLowerCase().trim();
}

export async function listContactInfo(
    supabase: ServerSupabaseClient,
    userId: string,
    peopleId: number
) {
    const { data, error } = await supabase
        .from("people_contact_info")
        .select("*")
        .eq("user_id", userId)
        .eq("people_id", peopleId)
        .order("created_at", { ascending: true });

    if (error) {
        serverError("Failed to fetch contact info");
    }

    return data || [];
}

export async function addContactInfo(
    supabase: ServerSupabaseClient,
    userId: string,
    input: { peopleId: number; type: ContactInfoType; value: string }
) {
    const { data, error } = await supabase
        .from("people_contact_info")
        .insert({
            user_id: userId,
            people_id: input.peopleId,
            type: input.type,
            value: normalizeContactInfoValue(input.type, input.value),
        })
        .select()
        .single();

    if (error) {
        if (error.code === "23505") {
            throw new ApiError("This contact info already exists", 409);
        }

        serverError("Failed to add contact info");
    }

    return data;
}

export async function deleteContactInfo(
    supabase: ServerSupabaseClient,
    userId: string,
    contactInfoId: number
) {
    const { error } = await supabase
        .from("people_contact_info")
        .delete()
        .eq("id", contactInfoId)
        .eq("user_id", userId);

    if (error) {
        serverError("Failed to delete contact info");
    }
}
