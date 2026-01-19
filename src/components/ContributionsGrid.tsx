"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { createClient } from "@/lib/supabase/client";

interface ContributionDay {
    date: string;
    count: number;
}

interface ContributionsData {
    contributions: ContributionDay[];
    stats: {
        today: number;
        streak: number;
        weekTotal: number;
    };
}

// Get intensity level (0-10) based on count
function getIntensity(count: number): number {
    return Math.min(count, 10); // Cap at 10
}

// 11 shades: 0=empty, 1-5=lightest to brand orange, 6-10=brand orange to dark
// Tailwind brand-orange: lightest=#ede2df, lighter=#d3b8af, light=#c19b8f, DEFAULT=#a7715f, dark=#744f42
const intensityStyles = [
    { bg: "rgba(237, 226, 223, 0.4)", darkBg: "rgba(55, 65, 81, 0.4)" },   // 0 - empty
    { bg: "#ede2df", darkBg: "rgba(167, 113, 95, 0.2)" },                   // 1 - lightest
    { bg: "#e0ccc6", darkBg: "rgba(167, 113, 95, 0.35)" },                  // 2
    { bg: "#d3b8af", darkBg: "rgba(167, 113, 95, 0.5)" },                   // 3 - lighter
    { bg: "#c9a99e", darkBg: "rgba(167, 113, 95, 0.65)" },                  // 4
    { bg: "#a7715f", darkBg: "#a7715f" },                                   // 5 - brand orange (DEFAULT)
    { bg: "#9a6856", darkBg: "#9a6856" },                                   // 6
    { bg: "#8d5f4d", darkBg: "#8d5f4d" },                                   // 7
    { bg: "#805648", darkBg: "#805648" },                                   // 8
    { bg: "#744f42", darkBg: "#744f42" },                                   // 9 - dark
    { bg: "#5c3f35", darkBg: "#5c3f35" },                                   // 10 - darkest
];

function formatDate(dateStr: string): string {
    const date = new Date(dateStr + "T00:00:00");
    return date.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
    });
}

interface ContributionsGridProps {
    refreshKey?: number; // Increment this to trigger a refresh
}

export default function ContributionsGrid({ refreshKey = 0 }: ContributionsGridProps) {
    const [data, setData] = useState<ContributionsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [isDark, setIsDark] = useState(false);

    // Detect dark mode
    useEffect(() => {
        const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
        setIsDark(mediaQuery.matches);
        
        const handler = (e: MediaQueryListEvent) => setIsDark(e.matches);
        mediaQuery.addEventListener("change", handler);
        return () => mediaQuery.removeEventListener("change", handler);
    }, []);

    const fetchContributions = useCallback(async () => {
        try {
            const res = await fetch("/api/rolodex/contributions", {
                credentials: "include",
            });
            if (res.ok) {
                const json = await res.json();
                setData(json);
            }
        } catch (error) {
            console.error("Error fetching contributions:", error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchContributions();
    }, [fetchContributions, refreshKey]);

    // Subscribe to notes table changes
    useEffect(() => {
        const supabase = createClient();

        const channel = supabase
            .channel("contributions-notes-changes")
            .on(
                "postgres_changes",
                {
                    event: "*", // Listen for INSERT, UPDATE, DELETE
                    schema: "public",
                    table: "people_notes",
                },
                () => {
                    // Refetch contributions when notes change
                    fetchContributions();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [fetchContributions]);

    // Generate the grid data for the last 52 weeks (364 days)
    const gridData = useMemo(() => {
        const weeks: { date: string; count: number }[][] = [];
        const contributionMap = new Map<string, number>();

        // Build lookup map
        data?.contributions.forEach((c) => {
            contributionMap.set(c.date, c.count);
        });

        // Start from today and go back 52 weeks
        const today = new Date();
        const startDate = new Date(today);
        startDate.setDate(startDate.getDate() - 363); // 364 days including today

        // Adjust to start on a Sunday
        const dayOfWeek = startDate.getDay();
        startDate.setDate(startDate.getDate() - dayOfWeek);

        let currentWeek: { date: string; count: number }[] = [];
        const current = new Date(startDate);

        while (current <= today) {
            const dateStr = current.toISOString().split("T")[0];
            currentWeek.push({
                date: dateStr,
                count: contributionMap.get(dateStr) || 0,
            });

            if (currentWeek.length === 7) {
                weeks.push(currentWeek);
                currentWeek = [];
            }

            current.setDate(current.getDate() + 1);
        }

        // Push any remaining days
        if (currentWeek.length > 0) {
            weeks.push(currentWeek);
        }

        return weeks;
    }, [data]);

    if (loading) {
        return (
            <div className="mb-5 animate-pulse">
                <div className="h-[28px] bg-gray-100 dark:bg-gray-800/30 rounded" />
            </div>
        );
    }

    if (!data) {
        return null;
    }

    return (
        <div className="mb-5 pt-1">
            {/* Grid only - no background/border */}
            <TooltipProvider delayDuration={100}>
                <div className="flex gap-[2px]">
                    {gridData.map((week, weekIndex) => (
                        <div key={weekIndex} className="flex flex-col gap-[2px]">
                            {week.map((day) => {
                                const intensity = getIntensity(day.count);
                                // Use local date for "today" comparison
                                const now = new Date();
                                const todayLocal = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
                                const isToday = day.date === todayLocal;
                                const bgColor = isDark ? intensityStyles[intensity].darkBg : intensityStyles[intensity].bg;

                                return (
                                    <Tooltip key={day.date}>
                                        <TooltipTrigger asChild>
                                            <div
                                                style={{ backgroundColor: bgColor }}
                                                className={`w-[10px] h-[10px] rounded-[2px] cursor-pointer transition-all hover:ring-1 hover:ring-brand-orange/50 ${
                                                    isToday ? "ring-1 ring-brand-orange" : ""
                                                }`}
                                            />
                                        </TooltipTrigger>
                                        <TooltipContent
                                            side="top"
                                            className="text-xs bg-gray-900 text-white border-gray-800"
                                        >
                                            <div className="font-medium">
                                                {day.count === 0
                                                    ? "No activity"
                                                    : day.count === 1
                                                    ? "1 touchpoint"
                                                    : `${day.count} touchpoints`}
                                            </div>
                                            <div className="text-gray-400">{formatDate(day.date)}</div>
                                        </TooltipContent>
                                    </Tooltip>
                                );
                            })}
                        </div>
                    ))}
                </div>
            </TooltipProvider>
        </div>
    );
}

