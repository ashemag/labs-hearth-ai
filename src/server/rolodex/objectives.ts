import { badRequest, serverError, type ServerSupabaseClient } from "@/server/api/route";

const defaultStages = [
    { name: "Phone calls", color: "#a8a29e", position: 0, rules: ["call", "intro", "interview", "meeting"] },
    { name: "Agency link sent", color: "#d6a15d", position: 1, rules: ["agency link", "sent link", "ashe.ai/agency", "proposal"] },
    { name: "Second calls", color: "#c47d62", position: 2, rules: ["second call", "2nd call", "follow-up call", "next call"] },
    { name: "Clients", color: "#6f9f83", position: 3, rules: ["client", "converted", "signed", "retainer", "paid"] },
];

type RuleRow = {
    id: number;
    rule_text: string;
};

type MemberRow = {
    people_id: number;
};

type ExcludedMemberRow = {
    people_id: number;
};

type StageRow = {
    id: number;
    name: string;
    color: string;
    position: number;
    network_objective_stage_rules?: RuleRow[] | null;
    network_objective_stage_members?: MemberRow[] | null;
};

type ObjectiveRow = {
    id: number;
    name: string;
    active: boolean;
    created_at: string;
    updated_at: string;
    network_objective_stages?: StageRow[] | null;
    network_objective_excluded_members?: ExcludedMemberRow[] | null;
};

function toObjective(row: ObjectiveRow) {
    return {
        id: row.id,
        name: row.name,
        active: row.active,
        created_at: row.created_at,
        updated_at: row.updated_at,
        excluded_member_ids: (row.network_objective_excluded_members || []).map((member) => member.people_id),
        stages: (row.network_objective_stages || [])
            .sort((a, b) => a.position - b.position)
            .map((stage) => ({
                id: stage.id,
                name: stage.name,
                color: stage.color,
                position: stage.position,
                rules: (stage.network_objective_stage_rules || []).map((rule) => ({
                    id: rule.id,
                    rule_text: rule.rule_text,
                })),
                member_ids: (stage.network_objective_stage_members || []).map((member) => member.people_id),
            })),
    };
}

async function fetchActiveObjective(supabase: ServerSupabaseClient, userId: string) {
    const { data, error } = await supabase
        .from("network_objectives")
        .select(`
            id,
            name,
            active,
            created_at,
            updated_at,
            network_objective_stages (
                id,
                name,
                color,
                position,
                network_objective_stage_rules (
                    id,
                    rule_text
                ),
                network_objective_stage_members (
                    people_id
                )
            ),
            network_objective_excluded_members (
                people_id
            )
        `)
        .eq("user_id", userId)
        .eq("active", true)
        .order("created_at", { ascending: true })
        .maybeSingle();

    if (error) {
        console.error("Error fetching active objective:", error);
        serverError("Failed to fetch objective");
    }

    return data as ObjectiveRow | null;
}

async function createDefaultObjective(supabase: ServerSupabaseClient, userId: string) {
    const { data: objective, error } = await supabase
        .from("network_objectives")
        .insert({ user_id: userId, name: "Agency Pipeline", active: true })
        .select("id")
        .single();

    if (error) {
        console.error("Error creating default objective:", error);
        serverError("Failed to create objective");
    }

    const { data: stages, error: stagesError } = await supabase
        .from("network_objective_stages")
        .insert(defaultStages.map((stage) => ({
            user_id: userId,
            objective_id: objective.id,
            name: stage.name,
            color: stage.color,
            position: stage.position,
        })))
        .select("id, position");

    if (stagesError || !stages) {
        console.error("Error creating default objective stages:", stagesError);
        serverError("Failed to create objective stages");
    }

    const ruleRows = stages.flatMap((stage) => {
        const stageDefaults = defaultStages.find((item) => item.position === stage.position);
        return (stageDefaults?.rules || []).map((rule) => ({
            user_id: userId,
            objective_id: objective.id,
            stage_id: stage.id,
            rule_text: rule,
        }));
    });

    if (ruleRows.length > 0) {
        const { error: rulesError } = await supabase
            .from("network_objective_stage_rules")
            .insert(ruleRows);

        if (rulesError) {
            console.error("Error creating default objective rules:", rulesError);
            serverError("Failed to create objective rules");
        }
    }
}

export async function getActiveObjective(supabase: ServerSupabaseClient, userId: string) {
    let objective = await fetchActiveObjective(supabase, userId);

    if (!objective) {
        await createDefaultObjective(supabase, userId);
        objective = await fetchActiveObjective(supabase, userId);
    }

    if (!objective) {
        serverError("Failed to load objective");
    }

    return toObjective(objective);
}

export async function updateObjective(
    supabase: ServerSupabaseClient,
    userId: string,
    input: { objectiveId: number; name: string }
) {
    const { error } = await supabase
        .from("network_objectives")
        .update({ name: input.name })
        .eq("id", input.objectiveId)
        .eq("user_id", userId);

    if (error) {
        console.error("Error updating objective:", error);
        serverError("Failed to update objective");
    }

    return getActiveObjective(supabase, userId);
}

export async function addObjectiveStage(
    supabase: ServerSupabaseClient,
    userId: string,
    input: { objectiveId: number; name: string; color?: string }
) {
    const objective = await getActiveObjective(supabase, userId);
    if (objective.id !== input.objectiveId) {
        badRequest("Objective not found");
    }

    const nextPosition = objective.stages.length === 0
        ? 0
        : Math.max(...objective.stages.map((stage) => stage.position)) + 1;

    const { error } = await supabase
        .from("network_objective_stages")
        .insert({
            user_id: userId,
            objective_id: input.objectiveId,
            name: input.name,
            color: input.color || "#a7715f",
            position: nextPosition,
        });

    if (error) {
        console.error("Error adding objective stage:", error);
        serverError("Failed to add stage");
    }

    return getActiveObjective(supabase, userId);
}

export async function updateObjectiveStage(
    supabase: ServerSupabaseClient,
    userId: string,
    input: { stageId: number; name?: string; color?: string }
) {
    const updates: Record<string, string> = {};
    if (input.name !== undefined) updates.name = input.name;
    if (input.color !== undefined) updates.color = input.color;

    if (Object.keys(updates).length === 0) {
        badRequest("No stage updates provided");
    }

    const { error } = await supabase
        .from("network_objective_stages")
        .update(updates)
        .eq("id", input.stageId)
        .eq("user_id", userId);

    if (error) {
        console.error("Error updating objective stage:", error);
        serverError("Failed to update stage");
    }

    return getActiveObjective(supabase, userId);
}

export async function addObjectiveRule(
    supabase: ServerSupabaseClient,
    userId: string,
    input: { objectiveId: number; stageId: number; ruleText: string }
) {
    const { data: stage, error: stageError } = await supabase
        .from("network_objective_stages")
        .select("id")
        .eq("id", input.stageId)
        .eq("objective_id", input.objectiveId)
        .eq("user_id", userId)
        .single();

    if (stageError || !stage) {
        badRequest("Stage not found");
    }

    const { error } = await supabase
        .from("network_objective_stage_rules")
        .insert({
            user_id: userId,
            objective_id: input.objectiveId,
            stage_id: input.stageId,
            rule_text: input.ruleText,
        });

    if (error) {
        console.error("Error adding objective rule:", error);
        serverError("Failed to add rule");
    }

    return getActiveObjective(supabase, userId);
}

export async function deleteObjectiveRule(
    supabase: ServerSupabaseClient,
    userId: string,
    ruleId: number
) {
    const { error } = await supabase
        .from("network_objective_stage_rules")
        .delete()
        .eq("id", ruleId)
        .eq("user_id", userId);

    if (error) {
        console.error("Error deleting objective rule:", error);
        serverError("Failed to delete rule");
    }

    return getActiveObjective(supabase, userId);
}

export async function setObjectiveMemberStage(
    supabase: ServerSupabaseClient,
    userId: string,
    input: { objectiveId: number; stageId: number; peopleId: number }
) {
    const { data: stage, error: stageError } = await supabase
        .from("network_objective_stages")
        .select("id")
        .eq("id", input.stageId)
        .eq("objective_id", input.objectiveId)
        .eq("user_id", userId)
        .single();

    if (stageError || !stage) {
        badRequest("Stage not found");
    }

    const { data: person, error: personError } = await supabase
        .from("people")
        .select("id")
        .eq("id", input.peopleId)
        .eq("user_id", userId)
        .single();

    if (personError || !person) {
        badRequest("Contact not found");
    }

    const { error } = await supabase
        .from("network_objective_stage_members")
        .upsert({
            user_id: userId,
            objective_id: input.objectiveId,
            stage_id: input.stageId,
            people_id: input.peopleId,
        }, {
            onConflict: "objective_id,people_id",
        });

    if (error) {
        console.error("Error assigning objective member:", error);
        serverError("Failed to assign contact");
    }

    const { error: exclusionError } = await supabase
        .from("network_objective_excluded_members")
        .delete()
        .eq("objective_id", input.objectiveId)
        .eq("people_id", input.peopleId)
        .eq("user_id", userId);

    if (exclusionError) {
        console.error("Error clearing objective exclusion:", exclusionError);
        serverError("Failed to restore contact to objective");
    }

    return getActiveObjective(supabase, userId);
}

export async function removeObjectiveMember(
    supabase: ServerSupabaseClient,
    userId: string,
    input: { objectiveId: number; peopleId: number }
) {
    const { data: objective, error: objectiveError } = await supabase
        .from("network_objectives")
        .select("id")
        .eq("id", input.objectiveId)
        .eq("user_id", userId)
        .single();

    if (objectiveError || !objective) {
        badRequest("Objective not found");
    }

    const { data: person, error: personError } = await supabase
        .from("people")
        .select("id")
        .eq("id", input.peopleId)
        .eq("user_id", userId)
        .single();

    if (personError || !person) {
        badRequest("Contact not found");
    }

    const { error } = await supabase
        .from("network_objective_stage_members")
        .delete()
        .eq("objective_id", input.objectiveId)
        .eq("people_id", input.peopleId)
        .eq("user_id", userId);

    if (error) {
        console.error("Error removing objective member:", error);
        serverError("Failed to remove contact from objective");
    }

    const { error: exclusionError } = await supabase
        .from("network_objective_excluded_members")
        .upsert({
            user_id: userId,
            objective_id: input.objectiveId,
            people_id: input.peopleId,
        }, {
            onConflict: "objective_id,people_id",
        });

    if (exclusionError) {
        console.error("Error excluding objective member:", exclusionError);
        serverError("Failed to exclude contact from objective");
    }

    return getActiveObjective(supabase, userId);
}
