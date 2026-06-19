"use client";

import { useEffect, useMemo, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { Loader2, Plus, Settings2, X } from "lucide-react";
import { toast } from "sonner";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { Contact, NetworkObjective, ObjectiveStage } from "../types";

interface StageContact {
    contact: Contact;
    stageId: number;
    lastActivityAt: number;
    source: "manual" | "rule";
}

interface FunnelStageDatum {
    stage: ObjectiveStage;
    currentContacts: StageContact[];
    cumulativeContacts: StageContact[];
    droppedFromPrevious: number;
    conversionFromPrevious: number | null;
    visualWidth: number;
}

const fallbackColors = ["#a8a29e", "#d6a15d", "#c47d62", "#6f9f83", "#8b8fc7", "#a7715f"];

function hexToRgba(hex: string, alpha: number) {
    const normalized = hex.replace("#", "");
    if (!/^[0-9a-f]{6}$/i.test(normalized)) return `rgba(167, 113, 95, ${alpha})`;
    const value = parseInt(normalized, 16);
    const r = (value >> 16) & 255;
    const g = (value >> 8) & 255;
    const b = value & 255;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function shortLabel(name: string) {
    const words = name.split(/\s+/).filter(Boolean);
    if (words.length === 0) return "Stage";
    if (words.length === 1) return words[0].slice(0, 8);
    return words.slice(0, 2).join(" ").slice(0, 10);
}

function contactText(contact: Contact) {
    return [
        contact.name,
        contact.custom_bio,
        contact.custom_location,
        ...contact.notes.map((note) => note.note),
        ...contact.calendar_events.map((event) => event.event_title || ""),
    ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
}

function getLastActivityAt(contact: Contact) {
    const dates = [
        contact.last_touchpoint,
        contact.created_at,
        ...contact.notes.map((note) => note.created_at),
        ...contact.touchpoints.map((touchpoint) => touchpoint.created_at),
        ...contact.calendar_events.map((event) => event.event_start),
    ]
        .filter(Boolean)
        .map((value) => new Date(value as string).getTime())
        .filter((value) => Number.isFinite(value));

    return dates.length ? Math.max(...dates) : 0;
}

function ruleMatches(contact: Contact, stage: ObjectiveStage) {
    const text = contactText(contact);
    return stage.rules.some((rule) => {
        const query = rule.rule_text.trim().toLowerCase();
        return query.length > 0 && text.includes(query);
    });
}

function FunnelTooltip({
    datum,
}: {
    datum: FunnelStageDatum;
}) {
    const { stage, cumulativeContacts } = datum;

    return (
        <div className="w-52">
            <div className="mb-2 flex items-center justify-between gap-3">
                <div>
                    <div className="text-sm font-medium text-white">{stage.name}</div>
                    <div className="text-xs text-gray-400">
                        {cumulativeContacts.length} people
                    </div>
                </div>
                <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: stage.color }} />
            </div>

            {cumulativeContacts.length > 0 ? (
                <div className="space-y-1">
                    {cumulativeContacts.slice(0, 7).map((item) => (
                        <div key={item.contact.id} className="truncate text-xs text-gray-200">
                            {item.contact.name}
                        </div>
                    ))}
                    {cumulativeContacts.length > 7 && (
                        <div className="pt-1 text-xs text-gray-500">+{cumulativeContacts.length - 7} more</div>
                    )}
                </div>
            ) : (
                <div className="text-xs text-gray-500">No one here yet</div>
            )}
        </div>
    );
}

export default function ObjectiveMomentumPanel({
    contacts,
    objective,
    objectiveLoading,
    setObjective,
    onSaveAction,
}: {
    contacts: Contact[];
    objective: NetworkObjective | null;
    objectiveLoading: boolean;
    setObjective: Dispatch<SetStateAction<NetworkObjective | null>>;
    onSaveAction: (body: Record<string, unknown>) => Promise<NetworkObjective | null>;
}) {
    const [saving, setSaving] = useState(false);
    const [managing, setManaging] = useState(false);
    const [objectiveName, setObjectiveName] = useState("");
    const [newStageName, setNewStageName] = useState("");
    const [newRuleByStage, setNewRuleByStage] = useState<Record<number, string>>({});

    useEffect(() => {
        setObjectiveName(objective?.name || "");
    }, [objective?.name]);

    const saveAction = async (body: Record<string, unknown>) => {
        setSaving(true);
        try {
            const nextObjective = await onSaveAction(body);
            setObjectiveName(nextObjective?.name || "");
        } catch (error) {
            console.error("Failed to update objective:", error);
        } finally {
            setSaving(false);
        }
    };

    const visibleContacts = useMemo(
        () => contacts.filter((contact) => !contact.hidden),
        [contacts]
    );

    const stageContacts = useMemo(() => {
        if (!objective) return [];

        const stages = [...objective.stages].sort((a, b) => a.position - b.position);
        const manualStageByPerson = new Map<number, number>();
        const excludedPeople = new Set(objective.excluded_member_ids || []);
        stages.forEach((stage) => {
            stage.member_ids.forEach((peopleId) => manualStageByPerson.set(peopleId, stage.id));
        });

        return visibleContacts
            .map((contact): StageContact | null => {
                const manualStageId = manualStageByPerson.get(contact.id);
                if (manualStageId) {
                    return {
                        contact,
                        stageId: manualStageId,
                        lastActivityAt: getLastActivityAt(contact),
                        source: "manual",
                    };
                }

                if (excludedPeople.has(contact.id)) return null;

                const matchedStage = [...stages].reverse().find((stage) => ruleMatches(contact, stage));
                if (!matchedStage) return null;

                return {
                    contact,
                    stageId: matchedStage.id,
                    lastActivityAt: getLastActivityAt(contact),
                    source: "rule",
                };
            })
            .filter(Boolean) as StageContact[];
    }, [objective, visibleContacts]);

    const grouped = useMemo(() => {
        if (!objective) return [];
        return [...objective.stages]
            .sort((a, b) => a.position - b.position)
            .map((stage) => ({
                stage,
                contacts: stageContacts
                    .filter((item) => item.stageId === stage.id)
                    .sort((a, b) => b.lastActivityAt - a.lastActivityAt),
            }));
    }, [objective, stageContacts]);

    const funnelStages = useMemo(() => {
        if (!objective) return [];

        const sortedStages = [...objective.stages].sort((a, b) => a.position - b.position);
        const stageIndexById = new Map(sortedStages.map((stage, index) => [stage.id, index]));
        const contactsWithStageIndex = stageContacts.map((item) => ({
            ...item,
            stageIndex: stageIndexById.get(item.stageId) ?? 0,
        }));
        const topCount = contactsWithStageIndex.length;
        const bottomEnvelope = 58;

        return sortedStages.map((stage, index): FunnelStageDatum => {
            const currentContacts = contactsWithStageIndex
                .filter((item) => item.stageId === stage.id)
                .sort((a, b) => b.lastActivityAt - a.lastActivityAt);
            const cumulativeContacts = contactsWithStageIndex
                .filter((item) => item.stageIndex >= index)
                .sort((a, b) => b.lastActivityAt - a.lastActivityAt);
            const previousCount = index === 0
                ? cumulativeContacts.length
                : contactsWithStageIndex.filter((item) => item.stageIndex >= index - 1).length;
            const conversionFromPrevious = index === 0
                ? null
                : previousCount > 0 ? cumulativeContacts.length / previousCount : 0;
            const stageEnvelope = sortedStages.length <= 1
                ? 100
                : 100 - ((100 - bottomEnvelope) * index) / (sortedStages.length - 1);
            const countWidth = topCount > 0
                ? (cumulativeContacts.length / topCount) * 100
                : stageEnvelope;
            const visualWidth = Math.max(48, Math.round(Math.min(stageEnvelope, countWidth)));

            return {
                stage,
                currentContacts,
                cumulativeContacts,
                droppedFromPrevious: Math.max(0, previousCount - cumulativeContacts.length),
                conversionFromPrevious,
                visualWidth,
            };
        });
    }, [objective, stageContacts]);

    const visibleFunnelStages = useMemo(
        () => funnelStages.filter((datum) => datum.cumulativeContacts.length > 0),
        [funnelStages]
    );

    const handleAddRule = async (stageId: number) => {
        if (!objective) return;
        const ruleText = (newRuleByStage[stageId] || "").trim();
        if (!ruleText) return;
        await saveAction({
            action: "add_rule",
            objective_id: objective.id,
            stage_id: stageId,
            rule_text: ruleText,
        });
        setNewRuleByStage((prev) => ({ ...prev, [stageId]: "" }));
    };

    const handleRemovePerson = (item: StageContact) => {
        if (!objective) return;

        const previousObjective = objective;
        const objectiveId = objective.id;
        const peopleId = item.contact.id;
        const originalStageId = item.stageId;
        let undone = false;

        setObjective({
            ...objective,
            excluded_member_ids: Array.from(new Set([...(objective.excluded_member_ids || []), peopleId])),
            stages: objective.stages.map((stage) => ({
                ...stage,
                member_ids: stage.member_ids.filter((memberId) => memberId !== peopleId),
            })),
        });

        toast.success(`${item.contact.name} removed`, {
            description: previousObjective.name,
            duration: 5000,
            position: "top-right",
            action: {
                label: "Undo",
                onClick: () => {
                    undone = true;
                    saveAction({
                        action: "set_member_stage",
                        objective_id: objectiveId,
                        stage_id: originalStageId,
                        people_id: peopleId,
                    });
                },
            },
        });

        fetch("/api/rolodex/objectives", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({
                action: "remove_member",
                objective_id: objectiveId,
                people_id: peopleId,
            }),
        })
            .then(async (res) => {
                if (!res.ok) {
                    throw new Error("Failed to remove person");
                }
                const data = await res.json();
                if (!undone) {
                    setObjective(data.objective);
                    setObjectiveName(data.objective?.name || "");
                }
            })
            .catch((error) => {
                console.error("Failed to remove objective member:", error);
                if (!undone) {
                    setObjective(previousObjective);
                    setObjectiveName(previousObjective.name);
                    toast.error("Could not remove person");
                }
            });
    };

    if (objectiveLoading) {
        return (
            <aside className="mb-5 flex h-[177px] items-center justify-center rounded-xl border border-gray-100 bg-white dark:border-gray-800 dark:bg-gray-950">
                <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
            </aside>
        );
    }

    if (!objective) return null;

    return (
        <aside className="mb-5 rounded-xl border border-gray-100 bg-white p-4 shadow-sm shadow-gray-200/40 dark:border-gray-800 dark:bg-gray-950 dark:shadow-none">
            <div className="mb-5 flex items-start justify-between gap-4">
                <div className="min-w-0">
                    <div className="text-[11px] font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">
                        Objective
                    </div>
                    <h2 className="mt-1 truncate text-sm font-semibold text-gray-900 dark:text-white">
                        {objective.name}
                    </h2>
                </div>
                <button
                    type="button"
                    onClick={() => setManaging((value) => !value)}
                    className="rounded-md p-1.5 text-gray-400 transition-colors hover:bg-gray-50 hover:text-gray-700 dark:hover:bg-gray-900 dark:hover:text-gray-200"
                    title="Manage objective"
                >
                    <Settings2 className="h-4 w-4" />
                </button>
            </div>

            <TooltipProvider delayDuration={80}>
                <div className="relative mx-auto flex max-w-[286px] flex-col items-center gap-1.5 py-0.5">
                    {visibleFunnelStages.map((datum) => {
                        const { stage, cumulativeContacts, visualWidth } = datum;
                        const isEmpty = cumulativeContacts.length === 0;
                        return (
                            <Tooltip key={stage.id}>
                                <TooltipTrigger asChild>
                                    <button
                                        type="button"
                                        className="group relative h-[30px] overflow-hidden rounded-md border border-gray-100/80 bg-gray-50 outline-none transition-all hover:-translate-y-px hover:border-gray-200 hover:shadow-sm focus-visible:ring-2 focus-visible:ring-brand-orange/30 dark:border-gray-800 dark:bg-gray-900/70 dark:hover:border-gray-700"
                                        style={{
                                            width: `${visualWidth}%`,
                                            minWidth: 148,
                                            backgroundColor: hexToRgba(stage.color, isEmpty ? 0.04 : 0.08),
                                        }}
                                        aria-label={`${stage.name}: ${cumulativeContacts.length} people`}
                                    >
                                        <span
                                            className="absolute inset-y-0 left-0 w-1 rounded-l-md"
                                            style={{ backgroundColor: stage.color, opacity: isEmpty ? 0.28 : 0.72 }}
                                        />
                                        <span
                                            className="absolute inset-0 opacity-0 transition-opacity group-hover:opacity-100"
                                            style={{ backgroundColor: hexToRgba(stage.color, 0.08) }}
                                        />
                                        <span className="relative flex h-full items-center justify-between gap-2 px-3 pl-4 text-center">
                                            <span className="min-w-0 truncate text-[11px] font-medium text-gray-600 dark:text-gray-300">
                                                {stage.name}
                                            </span>
                                            <span className="text-[11px] font-semibold tabular-nums text-gray-500 dark:text-gray-400">
                                                {cumulativeContacts.length}
                                            </span>
                                        </span>
                                    </button>
                                </TooltipTrigger>
                                <TooltipContent side="left" className="border-gray-800 bg-gray-950 text-white">
                                    <FunnelTooltip datum={datum} />
                                </TooltipContent>
                            </Tooltip>
                        );
                    })}
                </div>
            </TooltipProvider>

            {managing && (
                <div className="mt-4 space-y-4 border-t border-gray-100 pt-4 dark:border-gray-800">
                    <div className="flex items-center gap-2">
                        <input
                            value={objectiveName}
                            onChange={(e) => setObjectiveName(e.target.value)}
                            className="min-w-0 flex-1 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-brand-orange/30 dark:border-gray-800 dark:bg-gray-900 dark:text-white"
                        />
                        <button
                            type="button"
                            disabled={saving || !objectiveName.trim() || objectiveName === objective.name}
                            onClick={() => saveAction({ action: "update_objective", objective_id: objective.id, name: objectiveName.trim() })}
                            className="rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-gray-800 disabled:opacity-40 dark:bg-white dark:text-gray-900"
                        >
                            Save
                        </button>
                    </div>

                    <div className="space-y-3">
                        {objective.stages.map((stage) => {
                            const stagePeople = grouped.find((item) => item.stage.id === stage.id)?.contacts || [];
                            return (
                                <div key={stage.id} className="rounded-lg bg-gray-50 p-3 dark:bg-gray-900/70">
                                    <div className="mb-2 flex items-center justify-between gap-2">
                                        <div className="flex min-w-0 items-center gap-2">
                                            <span className="h-2.5 w-2.5 flex-shrink-0 rounded-full" style={{ backgroundColor: stage.color }} />
                                            <input
                                                defaultValue={stage.name}
                                                onBlur={(e) => {
                                                    const name = e.target.value.trim();
                                                    if (name && name !== stage.name) {
                                                        saveAction({ action: "update_stage", stage_id: stage.id, name });
                                                    }
                                                }}
                                                className="min-w-0 bg-transparent text-sm font-medium text-gray-900 outline-none dark:text-white"
                                            />
                                        </div>
                                        <div className="text-[11px] text-gray-400">
                                            {stagePeople.length} in {shortLabel(stage.name)}
                                        </div>
                                    </div>

                                    <div className="mb-2 flex flex-wrap gap-1">
                                        {stage.rules.map((rule) => (
                                            <button
                                                key={rule.id}
                                                type="button"
                                                onClick={() => saveAction({ action: "delete_rule", rule_id: rule.id })}
                                                className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-1 text-[11px] text-gray-500 transition-colors hover:text-red-500 dark:bg-gray-950 dark:text-gray-400"
                                            >
                                                {rule.rule_text}
                                                <X className="h-3 w-3" />
                                            </button>
                                        ))}
                                    </div>

                                    <div className="grid gap-2">
                                        {stagePeople.length > 0 && (
                                            <div className="space-y-1">
                                                {stagePeople.slice(0, 8).map((item) => (
                                                    <div
                                                        key={item.contact.id}
                                                        className="flex items-center gap-2 rounded-md bg-white px-2 py-1.5 dark:bg-gray-950"
                                                    >
                                                        <div className="min-w-0 flex-1">
                                                            <div className="truncate text-xs font-medium text-gray-800 dark:text-gray-100">
                                                                {item.contact.name}
                                                            </div>
                                                            <div className="text-[10px] text-gray-400">
                                                                {item.source === "manual" ? "manual" : "matched by rule"}
                                                            </div>
                                                        </div>
                                                        <select
                                                            value={stage.id}
                                                            onChange={(e) => {
                                                                const nextStageId = Number(e.target.value);
                                                                if (nextStageId && nextStageId !== stage.id) {
                                                                    saveAction({
                                                                        action: "set_member_stage",
                                                                        objective_id: objective.id,
                                                                        stage_id: nextStageId,
                                                                        people_id: item.contact.id,
                                                                    });
                                                                }
                                                            }}
                                                            className="w-24 rounded-md border border-gray-200 bg-white px-1.5 py-1 text-[11px] text-gray-600 outline-none dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300"
                                                        >
                                                            {objective.stages.map((option) => (
                                                                <option key={option.id} value={option.id}>
                                                                    {shortLabel(option.name)}
                                                                </option>
                                                            ))}
                                                        </select>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleRemovePerson(item)}
                                                            className="rounded-md p-1 text-gray-400 transition-colors hover:bg-gray-50 hover:text-red-500 dark:hover:bg-gray-900"
                                                            title="Remove from objective"
                                                        >
                                                            <X className="h-3.5 w-3.5" />
                                                        </button>
                                                    </div>
                                                ))}
                                                {stagePeople.length > 8 && (
                                                    <div className="px-2 text-[11px] text-gray-400">
                                                        +{stagePeople.length - 8} more people in this stage
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        <div className="flex items-center gap-2">
                                            <input
                                                value={newRuleByStage[stage.id] || ""}
                                                onChange={(e) => setNewRuleByStage((prev) => ({ ...prev, [stage.id]: e.target.value }))}
                                                onKeyDown={(e) => {
                                                    if (e.key === "Enter") handleAddRule(stage.id);
                                                }}
                                                placeholder="Add matching text..."
                                                className="min-w-0 flex-1 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs text-gray-900 outline-none focus:ring-2 focus:ring-brand-orange/30 dark:border-gray-800 dark:bg-gray-950 dark:text-white"
                                            />
                                            <button
                                                type="button"
                                                disabled={saving || !(newRuleByStage[stage.id] || "").trim()}
                                                onClick={() => handleAddRule(stage.id)}
                                                className="rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-white hover:text-gray-900 disabled:opacity-40 dark:hover:bg-gray-950 dark:hover:text-white"
                                                title="Add rule"
                                            >
                                                <Plus className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <div className="flex items-center gap-2">
                        <input
                            value={newStageName}
                            onChange={(e) => setNewStageName(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter" && newStageName.trim()) {
                                    const color = fallbackColors[objective.stages.length % fallbackColors.length];
                                    saveAction({ action: "add_stage", objective_id: objective.id, name: newStageName.trim(), color });
                                    setNewStageName("");
                                }
                            }}
                            placeholder="Add stage..."
                            className="min-w-0 flex-1 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-brand-orange/30 dark:border-gray-800 dark:bg-gray-900 dark:text-white"
                        />
                        <button
                            type="button"
                            disabled={saving || !newStageName.trim()}
                            onClick={() => {
                                const color = fallbackColors[objective.stages.length % fallbackColors.length];
                                saveAction({ action: "add_stage", objective_id: objective.id, name: newStageName.trim(), color });
                                setNewStageName("");
                            }}
                            className="rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-gray-800 disabled:opacity-40 dark:bg-white dark:text-gray-900"
                        >
                            Add
                        </button>
                    </div>
                </div>
            )}
        </aside>
    );
}
