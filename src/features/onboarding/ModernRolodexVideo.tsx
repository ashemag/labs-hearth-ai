"use client";

import { useMemo } from "react";
import {
    AbsoluteFill,
    Easing,
    Img,
    interpolate,
    spring,
    useCurrentFrame,
    useVideoConfig,
} from "remotion";

// Tailwind gray scale + brand accents, matching the real rolodex components
const G = {
    50: "#f9fafb",
    100: "#f3f4f6",
    200: "#e5e7eb",
    300: "#d1d5db",
    400: "#9ca3af",
    500: "#6b7280",
    600: "#4b5563",
    700: "#374151",
    900: "#111827",
    950: "#030712",
};
const ORANGE = "#a7715f";

// Contribution grid ramp from ContributionsGrid.tsx
const CONTRIB = [
    "rgba(237, 226, 223, 0.4)",
    "#ede2df",
    "#e0ccc6",
    "#d3b8af",
    "#c9a99e",
    "#a7715f",
];

const FONT =
    "var(--font-inter), -apple-system, BlinkMacSystemFont, 'Helvetica Neue', Arial, sans-serif";

export const ONBOARDING_VIDEO_DURATION = 600;

// Scene timeline (frames @ 30fps)
const T = {
    rows: 0,
    search: 140,
    searchTypeStart: 172,
    searchResults: 230,
    searchOut: 262,
    profile: 280,
    reminder: 408,
    reminderCheck: 472,
    closing: 524,
};

const LIST_COLORS: Record<string, string> = {
    Founders: "#8b5cf6",
    Investors: "#0ea5e9",
    "New York": "#10b981",
};

const CONTACTS = [
    {
        name: "Maya Chen",
        handle: "@mayachen",
        bio: "Building climate infrastructure at Terraform",
        location: "New York",
        touch: "3d ago",
        lists: ["Founders"],
        match: true,
    },
    {
        name: "Jon Bell",
        handle: "@jonbell",
        bio: "Partner at Meridian Capital",
        location: "London",
        touch: "2w ago",
        lists: ["Investors"],
        match: false,
    },
    {
        name: "Priya Shah",
        handle: "@priyashah",
        bio: "Founder & CEO at Loop Health",
        location: "New York",
        touch: "5d ago",
        lists: ["Founders"],
        match: true,
    },
    {
        name: "Noah Reed",
        handle: "@noahreed",
        bio: "Design lead — previously at Linear",
        location: "Austin",
        touch: "1w ago",
        lists: [],
        match: false,
    },
    {
        name: "Lena Park",
        handle: "@lenapark",
        bio: "Operator. Scaling things at Ramp",
        location: "Seattle",
        touch: "1mo ago",
        lists: [],
        match: false,
    },
];

const QUERY = "founders in new york";

const CAPTIONS = [
    { from: T.rows, to: T.search, label: "All your people, in one place" },
    { from: T.search, to: T.profile, label: "Search the way you think \u2014 \u2318K" },
    { from: T.profile, to: T.reminder, label: "Hearth remembers every detail" },
    { from: T.reminder, to: T.closing, label: "Gentle nudges, so you never lose touch" },
];

function ease(frame: number, start: number, duration: number) {
    return interpolate(frame, [start, start + duration], [0, 1], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
        easing: Easing.bezier(0.22, 1, 0.36, 1),
    });
}

// ---------------------------------------------------------------------------
// Minimal lucide-style icons
// ---------------------------------------------------------------------------
function Icon({
    path,
    size = 17,
    color = G[400],
}: {
    path: React.ReactNode;
    size?: number;
    color?: string;
}) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            stroke={color}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            {path}
        </svg>
    );
}

const sparklesPath = (
    <path d="M12 3l1.9 5.8a1 1 0 0 0 .6.6L20 11.3l-5.5 1.9a1 1 0 0 0-.6.6L12 19.6l-1.9-5.8a1 1 0 0 0-.6-.6L4 11.3l5.5-1.9a1 1 0 0 0 .6-.6L12 3z" />
);
const usersPath = (
    <>
        <circle cx="9" cy="7" r="4" />
        <path d="M3 21v-2a6 6 0 0 1 12 0v2" />
        <path d="M16 3.5a4 4 0 0 1 0 7" />
        <path d="M21 21v-2a6 6 0 0 0-4-5.4" />
    </>
);
const clipboardPath = (
    <>
        <rect x="6" y="4" width="12" height="17" rx="2" />
        <path d="M9 4a2 2 0 0 1 6 0" />
        <path d="M9.5 12h5M9.5 16h5" />
    </>
);
const searchPath = (
    <>
        <circle cx="11" cy="11" r="7" />
        <path d="M21 21l-4.3-4.3" />
    </>
);
const plusPath = <path d="M12 5v14M5 12h14" />;

// ---------------------------------------------------------------------------
// Header bar (mirrors RolodexPage header)
// ---------------------------------------------------------------------------
function HeaderBar() {
    return (
        <div
            style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                height: 58,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "0 36px",
                borderBottom: `1px solid ${G[100]}`,
                background: "#fff",
            }}
        >
            <Img src="/brand/logo_square_new.png" style={{ width: 34, height: 34 }} />
            <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
                <Icon path={clipboardPath} size={19} />
                <Icon path={sparklesPath} size={19} />
                <div
                    style={{
                        width: 34,
                        height: 34,
                        borderRadius: 99,
                        background: `linear-gradient(135deg, ${G[700]}, ${G[900]})`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#fff",
                        fontSize: 15,
                        fontWeight: 600,
                        boxShadow: "0 1px 2px rgba(0,0,0,0.1)",
                    }}
                >
                    A
                </div>
            </div>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Contributions grid (mirrors ContributionsGrid)
// ---------------------------------------------------------------------------
const GRID_COLS = 88;

function ContributionsStrip() {
    const frame = useCurrentFrame();
    const reveal = ease(frame, 0, 18);

    const cells = useMemo(() => {
        const out: React.ReactNode[] = [];
        for (let c = 0; c < GRID_COLS; c++) {
            for (let r = 0; r < 7; r++) {
                const i = c * 7 + r;
                const v = Math.sin(i * 12.9898 + 4.1414) * 43758.5453;
                const f = v - Math.floor(v);
                const level = f < 0.52 ? 0 : f < 0.7 ? 1 : f < 0.82 ? 2 : f < 0.9 ? 3 : f < 0.96 ? 4 : 5;
                out.push(
                    <div
                        key={i}
                        style={{
                            position: "absolute",
                            left: c * 13,
                            top: r * 13,
                            width: 10,
                            height: 10,
                            borderRadius: 3,
                            background: CONTRIB[level],
                        }}
                    />,
                );
            }
        }
        return out;
    }, []);

    return (
        <div
            style={{
                position: "absolute",
                left: 64,
                top: 80,
                width: GRID_COLS * 13 - 3,
                height: 88,
                opacity: reveal,
            }}
        >
            {cells}
        </div>
    );
}

// ---------------------------------------------------------------------------
// Lists sidebar (mirrors ListsSidebar)
// ---------------------------------------------------------------------------
function SidebarItem({
    icon,
    dotColor,
    label,
    count,
    active,
    muted,
}: {
    icon?: React.ReactNode;
    dotColor?: string;
    label: string;
    count?: string;
    active?: boolean;
    muted?: boolean;
}) {
    return (
        <div
            style={{
                display: "flex",
                alignItems: "center",
                gap: 13,
                padding: "11px 17px",
                borderRadius: 13,
                background: active ? G[900] : "transparent",
                color: active ? "#fff" : muted ? G[400] : G[600],
                fontSize: 16,
                fontWeight: 500,
            }}
        >
            {icon}
            {dotColor && (
                <div style={{ width: 11, height: 11, borderRadius: 99, background: dotColor }} />
            )}
            <span style={{ flex: 1 }}>{label}</span>
            {count && <span style={{ fontSize: 13, opacity: 0.6 }}>{count}</span>}
        </div>
    );
}

function ListsSidebarMock() {
    return (
        <div style={{ position: "absolute", left: 64, top: 192, width: 222 }}>
            <SidebarItem
                icon={<Icon path={sparklesPath} size={17} color={G[600]} />}
                label="Curated"
                count="38"
            />
            <SidebarItem
                icon={<Icon path={usersPath} size={17} color="#fff" />}
                label="All"
                count="412"
                active
            />
            <div style={{ borderTop: `1px solid ${G[200]}`, margin: "13px 0" }} />
            <SidebarItem dotColor={LIST_COLORS.Founders} label="Founders" count="36" />
            <SidebarItem dotColor={LIST_COLORS.Investors} label="Investors" count="18" />
            <SidebarItem dotColor={LIST_COLORS["New York"]} label="New York" count="54" />
            <div style={{ borderTop: `1px solid ${G[200]}`, margin: "13px 0" }} />
            <SidebarItem
                icon={<Icon path={plusPath} size={17} color={G[400]} />}
                label="New List"
                muted
            />
        </div>
    );
}

// ---------------------------------------------------------------------------
// Contacts table (mirrors ContactsTable)
// ---------------------------------------------------------------------------
function InitialAvatar({ name, size }: { name: string; size: number }) {
    return (
        <div
            style={{
                width: size,
                height: size,
                borderRadius: 99,
                background: G[200],
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                color: G[500],
                fontSize: size * 0.36,
                fontWeight: 500,
            }}
        >
            {name.charAt(0)}
        </div>
    );
}

function ContactRow({ index }: { index: number }) {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();
    const contact = CONTACTS[index];

    const entrance = spring({
        frame: frame - (T.rows + index * 3),
        fps,
        config: { damping: 200, stiffness: 260 },
    });

    // Dim non-matching rows while search results land
    const searchOn = ease(frame, T.searchResults, 12) * (1 - ease(frame, T.searchOut + 4, 12));
    const dim = contact.match ? 0 : searchOn * 0.6;

    // Maya stays selected once her profile opens (real selected = bg-gray-50 + dot)
    const selected =
        index === 0 ? ease(frame, T.profile - 6, 12) * (1 - ease(frame, T.closing, 14)) : 0;
    const rowBg = Math.max(contact.match ? searchOn * 0.7 : 0, selected);

    return (
        <div
            style={{
                display: "flex",
                alignItems: "center",
                gap: 18,
                height: 84,
                padding: "0 24px",
                borderBottom: index < CONTACTS.length - 1 ? `1px solid ${G[100]}` : "none",
                opacity: entrance * (1 - dim),
                transform: `translateY(${(1 - entrance) * 26}px)`,
                background: `rgba(249,250,251,${rowBg})`,
            }}
        >
            <InitialAvatar name={contact.name} size={52} />
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 9 }}>
                    <span style={{ fontSize: 18.5, fontWeight: 600, color: G[950] }}>
                        {contact.name}
                    </span>
                    <span style={{ fontSize: 15.5, fontWeight: 500, color: G[500] }}>
                        {contact.handle}
                    </span>
                </div>
                <div style={{ marginTop: 4, fontSize: 15.5, color: G[600] }}>{contact.bio}</div>
                <div style={{ marginTop: 6, display: "flex", gap: 14, fontSize: 13, color: G[400] }}>
                    <span>{contact.location}</span>
                    <span>{contact.touch}</span>
                </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                {contact.lists.map((list) => (
                    <span
                        key={list}
                        style={{
                            fontSize: 12.5,
                            fontWeight: 500,
                            padding: "4px 11px",
                            borderRadius: 99,
                            background: `${LIST_COLORS[list]}18`,
                            color: LIST_COLORS[list],
                        }}
                    >
                        {list}
                    </span>
                ))}
            </div>
            <div style={{ width: 10, display: "flex", justifyContent: "flex-end" }}>
                <div
                    style={{
                        width: 9,
                        height: 9,
                        borderRadius: 99,
                        background: G[900],
                        opacity: selected,
                    }}
                />
            </div>
        </div>
    );
}

function ContactsTableMock() {
    return (
        <div
            style={{
                position: "absolute",
                left: 318,
                top: 192,
                width: 898,
                borderRadius: 16,
                border: `1px solid rgba(229,231,235,0.8)`,
                background: "#fff",
                boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
                overflow: "hidden",
            }}
        >
            {CONTACTS.map((_, index) => (
                <ContactRow key={index} index={index} />
            ))}
        </div>
    );
}

// ---------------------------------------------------------------------------
// Command search modal (mirrors CommandSearchModal)
// ---------------------------------------------------------------------------
function CommandSearch() {
    const frame = useCurrentFrame();
    const show = ease(frame, T.search, 16) * (1 - ease(frame, T.searchOut, 12));
    if (show <= 0.01) return null;

    const typed = QUERY.slice(0, Math.max(0, Math.floor((frame - T.searchTypeStart) / 2.4)));
    const done = typed.length >= QUERY.length;
    const results = CONTACTS.filter((c) => c.match);
    const resultsIn = ease(frame, T.searchResults - 6, 12);

    return (
        <AbsoluteFill style={{ opacity: show }}>
            <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)" }} />
            <div
                style={{
                    position: "absolute",
                    left: "50%",
                    top: 110,
                    width: 590,
                    transform: `translateX(-50%) translateY(${(1 - show) * 14}px)`,
                    borderRadius: 16,
                    background: "#fff",
                    border: `1px solid ${G[200]}`,
                    boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)",
                    overflow: "hidden",
                }}
            >
                {/* Input row */}
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 14,
                        padding: "15px 18px",
                        borderBottom: `1px solid ${G[200]}`,
                    }}
                >
                    <Icon path={searchPath} size={21} color={G[400]} />
                    <span style={{ flex: 1, fontSize: 18, color: typed ? G[900] : G[400] }}>
                        {typed || "Search contacts... (q: for notes)"}
                        {typed && (
                            <span
                                style={{
                                    color: G[900],
                                    opacity: frame % 22 < 11 ? 1 : 0,
                                    marginLeft: 1,
                                }}
                            >
                                │
                            </span>
                        )}
                    </span>
                    <span
                        style={{
                            fontSize: 12,
                            color: G[400],
                            background: G[100],
                            border: `1px solid ${G[200]}`,
                            borderRadius: 5,
                            padding: "2px 7px",
                            fontFamily: "ui-monospace, monospace",
                        }}
                    >
                        esc
                    </span>
                </div>

                {/* Results */}
                <div style={{ minHeight: 150, padding: "8px 0" }}>
                    {done ? (
                        results.map((contact, index) => (
                            <div
                                key={contact.name}
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 13,
                                    padding: "11px 18px",
                                    background: index === 0 ? G[50] : "transparent",
                                    opacity: resultsIn,
                                    transform: `translateY(${(1 - resultsIn) * 8}px)`,
                                }}
                            >
                                <InitialAvatar name={contact.name} size={40} />
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: 16, fontWeight: 500, color: G[900] }}>
                                        {contact.name}
                                    </div>
                                    <div style={{ fontSize: 13.5, color: G[500], marginTop: 2 }}>
                                        {contact.bio}
                                    </div>
                                </div>
                                {index === 0 && (
                                    <span
                                        style={{
                                            fontSize: 12,
                                            color: G[400],
                                            background: G[100],
                                            border: `1px solid ${G[200]}`,
                                            borderRadius: 5,
                                            padding: "2px 7px",
                                            fontFamily: "ui-monospace, monospace",
                                        }}
                                    >
                                        ↵
                                    </span>
                                )}
                            </div>
                        ))
                    ) : (
                        <div
                            style={{
                                padding: "34px 18px",
                                textAlign: "center",
                                fontSize: 14.5,
                                color: G[500],
                            }}
                        >
                            Type a name, a city, or how you met
                        </div>
                    )}
                </div>
            </div>
        </AbsoluteFill>
    );
}

// ---------------------------------------------------------------------------
// Profile panel (mirrors ProfilePanel styling)
// ---------------------------------------------------------------------------
const NOTES = [
    { text: "Met at the climate dinner downtown", when: "Mar 12" },
    { text: "Intro'd you to Jon Bell", when: "Apr 2" },
    { text: "Raising a seed round this fall", when: "May 28" },
];

function ProfilePanelMock() {
    const frame = useCurrentFrame();
    const reveal = ease(frame, T.profile, 20) * (1 - ease(frame, T.closing + 4, 14));
    if (reveal <= 0.01) return null;

    const tabs = ["Notes", "Messages", "Info"];

    return (
        <div
            style={{
                position: "absolute",
                top: 58,
                right: 0,
                bottom: 0,
                width: 396,
                background: "#fff",
                borderLeft: `1px solid ${G[200]}`,
                boxShadow: "-20px 0 50px rgba(0,0,0,0.07)",
                transform: `translateX(${(1 - reveal) * 100}%)`,
                padding: "30px 30px 0",
            }}
        >
            <div style={{ display: "flex", alignItems: "center", gap: 17 }}>
                <InitialAvatar name="Maya Chen" size={66} />
                <div>
                    <div style={{ fontSize: 24, fontWeight: 600, color: G[950] }}>Maya Chen</div>
                    <div style={{ fontSize: 14.5, color: G[500], marginTop: 3 }}>
                        @mayachen · New York
                    </div>
                </div>
            </div>

            {/* Tabs with gray-900 underline, like the real panel */}
            <div
                style={{
                    display: "flex",
                    gap: 26,
                    marginTop: 24,
                    borderBottom: `1px solid ${G[100]}`,
                }}
            >
                {tabs.map((tab, index) => (
                    <div
                        key={tab}
                        style={{
                            position: "relative",
                            paddingBottom: 11,
                            fontSize: 15,
                            fontWeight: 500,
                            color: index === 0 ? G[900] : G[400],
                        }}
                    >
                        {tab}
                        {index === 0 && (
                            <div
                                style={{
                                    position: "absolute",
                                    bottom: 0,
                                    left: 0,
                                    right: 0,
                                    height: 2,
                                    borderRadius: 99,
                                    background: G[900],
                                }}
                            />
                        )}
                    </div>
                ))}
            </div>

            {/* AI summary */}
            <div
                style={{
                    marginTop: 20,
                    borderRadius: 13,
                    background: G[50],
                    border: `1px solid ${G[100]}`,
                    padding: "14px 16px",
                    opacity: ease(frame, T.profile + 16, 16),
                }}
            >
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        fontSize: 12,
                        fontWeight: 500,
                        letterSpacing: 1.2,
                        color: G[500],
                        marginBottom: 8,
                    }}
                >
                    <Icon path={sparklesPath} size={13} color={G[500]} /> SUMMARY
                </div>
                <div style={{ fontSize: 14.5, lineHeight: 1.55, color: G[600] }}>
                    Climate-tech founder you met in March. She intro'd you to Jon and is
                    raising this fall — worth a check-in.
                </div>
            </div>

            {/* Notes timeline with vertical rail, like the real panel */}
            <div style={{ position: "relative", marginTop: 24, paddingLeft: 2 }}>
                <div
                    style={{
                        position: "absolute",
                        left: 8,
                        top: 10,
                        bottom: 10,
                        width: 1,
                        background: G[200],
                    }}
                />
                <div style={{ display: "grid", gap: 19 }}>
                    {NOTES.map((note, index) => {
                        const item = ease(frame, T.profile + 28 + index * 12, 16);
                        return (
                            <div
                                key={note.text}
                                style={{
                                    display: "grid",
                                    gridTemplateColumns: "17px 1fr",
                                    gap: 13,
                                    opacity: item,
                                    transform: `translateY(${(1 - item) * 10}px)`,
                                }}
                            >
                                <div
                                    style={{
                                        width: 9,
                                        height: 9,
                                        borderRadius: 99,
                                        marginTop: 6,
                                        background: G[300],
                                        boxShadow: "0 0 0 3px #fff",
                                        position: "relative",
                                        left: 4,
                                    }}
                                />
                                <div>
                                    <div style={{ fontSize: 15, color: G[700] }}>{note.text}</div>
                                    <div style={{ fontSize: 12.5, color: G[400], marginTop: 3 }}>
                                        {note.when}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Follow-up reminder (styled like the real todo rows / toasts)
// ---------------------------------------------------------------------------
function ReminderCard() {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();
    const pop = spring({
        frame: frame - T.reminder,
        fps,
        config: { damping: 16, stiffness: 140 },
    });
    const out = ease(frame, T.closing + 2, 12);
    if (frame < T.reminder || out >= 0.99) return null;

    const checked = ease(frame, T.reminderCheck, 10);

    return (
        <div
            style={{
                position: "absolute",
                left: 318,
                top: 540,
                width: 360,
                borderRadius: 14,
                background: "#fff",
                border: `1px solid ${G[200]}`,
                boxShadow: "0 20px 45px -10px rgba(0,0,0,0.18)",
                padding: "15px 17px",
                display: "flex",
                alignItems: "center",
                gap: 14,
                opacity: pop * (1 - out),
                transform: `translateY(${(1 - pop) * 36}px)`,
            }}
        >
            <div
                style={{
                    width: 23,
                    height: 23,
                    flexShrink: 0,
                    borderRadius: 7,
                    border: `1.5px solid ${checked > 0.5 ? G[900] : G[300]}`,
                    background: checked > 0.5 ? G[900] : "transparent",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                }}
            >
                <svg width="13" height="13" viewBox="0 0 12 12" style={{ opacity: checked }}>
                    <path
                        d="M2.5 6.2 5 8.7l4.5-5"
                        stroke="#fff"
                        strokeWidth="1.8"
                        fill="none"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                </svg>
            </div>
            <div>
                <div
                    style={{
                        fontSize: 15.5,
                        fontWeight: 500,
                        color: G[900],
                        opacity: 1 - checked * 0.45,
                        textDecoration: checked > 0.5 ? "line-through" : "none",
                    }}
                >
                    Follow up with Maya Chen
                </div>
                <div style={{ fontSize: 13, color: G[500], marginTop: 3 }}>
                    It's been 3 weeks — say hello
                </div>
            </div>
            <div
                style={{
                    marginLeft: "auto",
                    width: 9,
                    height: 9,
                    borderRadius: 99,
                    background: ORANGE,
                    opacity: (1 - checked) * (0.6 + Math.sin(frame / 9) * 0.4),
                }}
            />
        </div>
    );
}

// ---------------------------------------------------------------------------
// Caption pill + chapter progress
// ---------------------------------------------------------------------------
function CaptionBar() {
    const frame = useCurrentFrame();
    const barIn = ease(frame, T.rows, 18);
    const barOut = ease(frame, T.closing, 14);
    if (barIn <= 0.01 || barOut >= 0.99) return null;

    const activeIndex = CAPTIONS.findIndex((c) => frame >= c.from && frame < c.to);
    const active = CAPTIONS[Math.max(0, activeIndex === -1 ? CAPTIONS.length - 1 : activeIndex)];
    const captionFade = Math.max(
        0,
        Math.min(ease(frame, active.from + 4, 12), 1 - ease(frame, active.to - 12, 12)),
    );

    return (
        <div
            style={{
                position: "absolute",
                left: 0,
                right: 0,
                bottom: 20,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 13,
                opacity: barIn * (1 - barOut),
            }}
        >
            <div
                style={{
                    display: "flex",
                    alignItems: "baseline",
                    gap: 13,
                    background: "rgba(255,255,255,0.96)",
                    border: `1px solid ${G[200]}`,
                    borderRadius: 99,
                    padding: "11px 26px",
                    boxShadow: "0 12px 32px -8px rgba(0,0,0,0.14)",
                    opacity: captionFade,
                    transform: `translateY(${(1 - captionFade) * 6}px)`,
                }}
            >
                <span style={{ color: ORANGE, fontSize: 13.5, fontWeight: 500, letterSpacing: 1 }}>
                    {String(activeIndex === -1 ? CAPTIONS.length : activeIndex + 1).padStart(2, "0")}
                </span>
                <span style={{ color: G[900], fontSize: 20, fontWeight: 500, letterSpacing: -0.2 }}>
                    {active.label}
                </span>
            </div>
            <div style={{ display: "flex", gap: 7 }}>
                {CAPTIONS.map((c, index) => {
                    const progress = interpolate(frame, [c.from, c.to], [0, 1], {
                        extrapolateLeft: "clamp",
                        extrapolateRight: "clamp",
                    });
                    return (
                        <div
                            key={index}
                            style={{
                                width: 44,
                                height: 3,
                                borderRadius: 99,
                                background: G[200],
                                overflow: "hidden",
                            }}
                        >
                            <div
                                style={{
                                    width: `${progress * 100}%`,
                                    height: "100%",
                                    borderRadius: 99,
                                    background: ORANGE,
                                }}
                            />
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Closing card
// ---------------------------------------------------------------------------
function ClosingFrame() {
    const frame = useCurrentFrame();
    const reveal = ease(frame, T.closing, 26);
    if (reveal <= 0.01) return null;

    return (
        <AbsoluteFill
            style={{
                alignItems: "center",
                justifyContent: "center",
                background: `rgba(255,255,255,${reveal})`,
                opacity: reveal,
            }}
        >
            <Img src="/brand/logo_square_new.png" style={{ width: 72, height: 72 }} />
            <div
                style={{
                    marginTop: 24,
                    fontSize: 36,
                    fontWeight: 600,
                    color: G[950],
                    letterSpacing: -0.8,
                }}
            >
                Hearth
            </div>
            <div style={{ marginTop: 8, fontSize: 16.5, color: G[500] }}>
                Your second brain for your people
            </div>
        </AbsoluteFill>
    );
}

// ---------------------------------------------------------------------------
// Composition
// ---------------------------------------------------------------------------
export function ModernRolodexVideo() {
    return (
        <AbsoluteFill style={{ background: "#fff", overflow: "hidden", fontFamily: FONT }}>
            <HeaderBar />
            <ContributionsStrip />
            <ListsSidebarMock />
            <ContactsTableMock />
            <ProfilePanelMock />
            <ReminderCard />
            <CommandSearch />
            <CaptionBar />
            <ClosingFrame />
        </AbsoluteFill>
    );
}
