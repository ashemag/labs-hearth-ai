"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { createClient } from "@/lib/supabase/client";

interface TouchpointData {
    people_id: number;
    contact_name: string;
    timestamp: string;
    type: 'note' | 'imessage';
}

interface DayBreakdown {
    contact_name: string;
    types: Set<'note' | 'imessage'>;
}

interface ApiResponse {
    touchpoints: TouchpointData[];
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

// Helper to get local date string in YYYY-MM-DD format
function toLocalDateString(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

interface ContributionsGridProps {
    refreshKey?: number; // Increment this to trigger a refresh
}

export default function ContributionsGrid({ refreshKey = 0 }: ContributionsGridProps) {
    const [touchpoints, setTouchpoints] = useState<TouchpointData[]>([]);
    const [loading, setLoading] = useState(true);
    const [isDark, setIsDark] = useState(false);
    const [selectedDate, setSelectedDate] = useState<string | null>(null);

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
                const json: ApiResponse = await res.json();
                setTouchpoints(json.touchpoints || []);
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

    // Subscribe to notes and iMessages table changes
    useEffect(() => {
        const supabase = createClient();

        const channel = supabase
            .channel("contributions-changes")
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: "people_notes",
                },
                () => fetchContributions()
            )
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: "people_imessages",
                },
                () => fetchContributions()
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [fetchContributions]);

    // Process touchpoints into contributions grouped by LOCAL date
    // Deduplicate per contact per day (1 touchpoint per contact per day, regardless of notes + messages)
    const contributionMap = useMemo(() => {
        const byDate: Record<string, Set<number>> = {};
        
        touchpoints.forEach((tp) => {
            if (!tp.people_id) return; // Skip if no contact linked
            
            // Convert UTC timestamp to local date string
            const localDate = toLocalDateString(new Date(tp.timestamp));
            if (!byDate[localDate]) {
                byDate[localDate] = new Set();
            }
            // Add contact to the set for this date (Set automatically dedupes)
            byDate[localDate].add(tp.people_id);
        });

        // Convert Sets to counts (count = number of unique contacts touched that day)
        const map = new Map<string, number>();
        Object.entries(byDate).forEach(([date, peopleSet]) => {
            map.set(date, peopleSet.size);
        });
        return map;
    }, [touchpoints]);

    // Get breakdown for selected date
    const selectedDateBreakdown = useMemo(() => {
        if (!selectedDate) return null;
        
        const breakdown = new Map<number, DayBreakdown>();
        
        touchpoints.forEach((tp) => {
            if (!tp.people_id) return;
            const localDate = toLocalDateString(new Date(tp.timestamp));
            if (localDate !== selectedDate) return;
            
            if (!breakdown.has(tp.people_id)) {
                breakdown.set(tp.people_id, {
                    contact_name: tp.contact_name,
                    types: new Set([tp.type]),
                });
            } else {
                breakdown.get(tp.people_id)!.types.add(tp.type);
            }
        });
        
        return Array.from(breakdown.values()).sort((a, b) => 
            a.contact_name.localeCompare(b.contact_name)
        );
    }, [selectedDate, touchpoints]);

    // Generate the grid data for the last 52 weeks (364 days)
    const gridData = useMemo(() => {
        const weeks: { date: string; count: number }[][] = [];

        // Start from today and go back 52 weeks (use local dates)
        const today = new Date();
        const todayStr = toLocalDateString(today);
        const startDate = new Date(today);
        startDate.setDate(startDate.getDate() - 363); // 364 days including today

        // Adjust to start on a Sunday
        const dayOfWeek = startDate.getDay();
        startDate.setDate(startDate.getDate() - dayOfWeek);

        let currentWeek: { date: string; count: number }[] = [];
        const current = new Date(startDate);

        while (toLocalDateString(current) <= todayStr) {
            const dateStr = toLocalDateString(current);
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
    }, [contributionMap]);

    if (loading) {
        return (
            <div className="mb-5 animate-pulse">
                <div className="h-[28px] bg-gray-100 dark:bg-gray-800/30 rounded" />
            </div>
        );
    }

    const handleDateClick = (date: string, count: number) => {
        if (count === 0) {
            setSelectedDate(null);
            return;
        }
        setSelectedDate(selectedDate === date ? null : date);
    };

    return (
        <div className="mb-5 pt-1">
            <div className="flex gap-4 items-start">
                {/* Grid */}
                <TooltipProvider delayDuration={100}>
                    <div className="flex gap-[2px]">
                        {gridData.map((week, weekIndex) => (
                            <div key={weekIndex} className="flex flex-col gap-[2px]">
                                {week.map((day) => {
                                    const intensity = getIntensity(day.count);
                                    const isToday = day.date === toLocalDateString(new Date());
                                    const isSelected = day.date === selectedDate;
                                    const bgColor = isDark ? intensityStyles[intensity].darkBg : intensityStyles[intensity].bg;

                                    return (
                                        <Tooltip key={day.date}>
                                            <TooltipTrigger asChild>
                                                <div
                                                    onClick={() => handleDateClick(day.date, day.count)}
                                                    style={{ backgroundColor: bgColor }}
                                                    className={`w-[10px] h-[10px] rounded-[2px] cursor-pointer transition-all hover:ring-1 hover:ring-brand-orange/50 ${
                                                        isToday ? "ring-1 ring-brand-orange" : ""
                                                    } ${isSelected ? "ring-2 ring-brand-orange" : ""}`}
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

                {/* Breakdown panel */}
                {selectedDate && selectedDateBreakdown && selectedDateBreakdown.length > 0 && (
                    <div className="text-xs text-gray-500 dark:text-gray-400 min-w-[140px] pl-2 border-l border-gray-200 dark:border-gray-700">
                        <div className="font-medium text-gray-700 dark:text-gray-300 mb-1">
                            {formatDate(selectedDate)}
                        </div>
                        <div className="space-y-0.5">
                            {selectedDateBreakdown.map((item, idx) => (
                                <div key={idx} className="flex items-center gap-1.5">
                                    <span className="truncate max-w-[100px]">{item.contact_name}</span>
                                    <span className="text-gray-400 dark:text-gray-500">
                                        {Array.from(item.types).map(t => 
                                            t === 'note' ? '📝' : '💬'
                                        ).join('')}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

