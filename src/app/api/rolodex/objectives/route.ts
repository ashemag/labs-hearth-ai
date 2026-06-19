import { NextResponse } from "next/server";
import {
    optionalString,
    readJsonObject,
    requiredEnum,
    requiredNumber,
    requiredString,
    withUser,
} from "@/server/api/route";
import {
    addObjectiveRule,
    addObjectiveStage,
    deleteObjectiveRule,
    getActiveObjective,
    removeObjectiveMember,
    setObjectiveMemberStage,
    updateObjective,
    updateObjectiveStage,
} from "@/server/rolodex/objectives";

const actions = [
    "update_objective",
    "add_stage",
    "update_stage",
    "add_rule",
    "delete_rule",
    "set_member_stage",
    "remove_member",
] as const;

export const GET = withUser(async (_req, { supabase, user }) => {
    const objective = await getActiveObjective(supabase, user.id);
    return NextResponse.json({ objective });
});

export const PATCH = withUser(async (req, { supabase, user }) => {
    const body = await readJsonObject(req);
    const action = requiredEnum(body.action, actions, "action");

    if (action === "update_objective") {
        const objectiveId = requiredNumber(body.objective_id, "objective_id");
        const name = requiredString(body.name, "name");
        const objective = await updateObjective(supabase, user.id, { objectiveId, name });
        return NextResponse.json({ objective });
    }

    if (action === "add_stage") {
        const objectiveId = requiredNumber(body.objective_id, "objective_id");
        const name = requiredString(body.name, "name");
        const color = optionalString(body.color);
        const objective = await addObjectiveStage(supabase, user.id, { objectiveId, name, color });
        return NextResponse.json({ objective });
    }

    if (action === "update_stage") {
        const stageId = requiredNumber(body.stage_id, "stage_id");
        const name = body.name === undefined ? undefined : requiredString(body.name, "name");
        const color = optionalString(body.color);
        const objective = await updateObjectiveStage(supabase, user.id, { stageId, name, color });
        return NextResponse.json({ objective });
    }

    if (action === "add_rule") {
        const objectiveId = requiredNumber(body.objective_id, "objective_id");
        const stageId = requiredNumber(body.stage_id, "stage_id");
        const ruleText = requiredString(body.rule_text, "rule_text");
        const objective = await addObjectiveRule(supabase, user.id, { objectiveId, stageId, ruleText });
        return NextResponse.json({ objective });
    }

    if (action === "delete_rule") {
        const ruleId = requiredNumber(body.rule_id, "rule_id");
        const objective = await deleteObjectiveRule(supabase, user.id, ruleId);
        return NextResponse.json({ objective });
    }

    if (action === "set_member_stage") {
        const objectiveId = requiredNumber(body.objective_id, "objective_id");
        const stageId = requiredNumber(body.stage_id, "stage_id");
        const peopleId = requiredNumber(body.people_id, "people_id");
        const objective = await setObjectiveMemberStage(supabase, user.id, { objectiveId, stageId, peopleId });
        return NextResponse.json({ objective });
    }

    const objectiveId = requiredNumber(body.objective_id, "objective_id");
    const peopleId = requiredNumber(body.people_id, "people_id");
    const objective = await removeObjectiveMember(supabase, user.id, { objectiveId, peopleId });
    return NextResponse.json({ objective });
});
