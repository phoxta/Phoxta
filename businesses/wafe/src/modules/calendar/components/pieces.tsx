import { useMemo, useState, type CSSProperties, type FormEvent } from "react";
import { Link, NavLink } from "react-router-dom";
import { AlertTriangle, Copy, Download, Link2, MapPin, Plus, Repeat, Sparkles, Trash2 } from "lucide-react";
import type { Area, Member, Visibility } from "@/data/core";
import { cn } from "@/lib/cn";
import { useAi } from "@/lib/ai";
import { isoDate, shortDate, time, type Hue } from "@/lib/format";
import { useSpace } from "@/state/space";
import { useToast } from "@/state/toast";
import { Confirm, MemberAvatar, MemberMultiPicker, MemberPicker, VisibilityPicker } from "@/components/shared";
import { Button, Card, EmptyState, IconButton, Tag } from "@/components/ui/primitives";
import { Dialog } from "@/components/ui/overlay";
import {
    HREF,
    buildIcs,
    canEditEvent,
    canRsvp,
    dayLabel,
    feedFor,
    feedPath,
    freeEvenings,
    icsFilename,
    nameList,
    rsvpFor,
    rsvpSummary,
    shortName,
    whenLabel,
    type Conflict,
    type Entry,
    type EntrySource,
} from "../derive";
import { EVENT_TEMPLATES } from "../templates";
import { EVENT_KIND, EVENT_KINDS, RECUR_LABEL, REMINDER_CHOICES, RSVP_LABEL, type CalEvent, type CalendarRepo, type CalendarState, type EventAttendee, type EventKind, type NewEventInput, type RecurFreq, type RsvpResponse } from "../types";

/**
 * The calendar's shared furniture: the view switcher, the member filter, the
 * blocks that draw an entry in a grid or a list, the event form, the feed
 * manager and the companion panel. Every view is built from these, so a week
 * block and an agenda row are the same thing wearing different clothes.
 */

// ---------------------------------------------------------------------------
// Colour
// ---------------------------------------------------------------------------

const AREA_CHIP: Record<Area, string> = {
    home: "bg-home-soft text-home-ink",
    family: "bg-family-soft text-family-ink",
    grow: "bg-grow-soft text-grow-ink",
    execute: "bg-execute-soft text-execute-ink",
    live: "bg-live-soft text-live-ink",
    create: "bg-create-soft text-create-ink",
};

const HUE_CHIP: Record<Hue, string> = {
    lilac: "bg-lilac-soft text-lilac",
    sky: "bg-sky-soft text-sky",
    peach: "bg-peach-soft text-peach",
    rose: "bg-rose-soft text-rose",
    mint: "bg-mint-soft text-mint",
    plum: "bg-plum-soft text-plum",
};

/** A block wears its person's colour when it has one, its area's otherwise. */
export function entryTone(entry: Entry, members: Member[]): string {
    const id = entry.colourMemberId ?? (entry.memberIds.length === 1 ? entry.memberIds[0] : null);
    const m = id ? members.find((x) => x.id === id) : undefined;
    return m ? HUE_CHIP[m.hue] : AREA_CHIP[entry.area];
}

// ---------------------------------------------------------------------------
// Chrome
// ---------------------------------------------------------------------------

export function ViewTabs({ className }: { className?: string }) {
    const tabs = [
        { to: HREF, label: "Agenda", end: true },
        { to: `${HREF}/day`, label: "Day" },
        { to: `${HREF}/week`, label: "Week" },
        { to: `${HREF}/month`, label: "Month" },
    ];
    return (
        <div className={cn("inline-flex rounded-full border border-line-strong bg-card p-1", className)} role="tablist" aria-label="Calendar view">
            {tabs.map((t) => (
                <NavLink
                    key={t.to}
                    to={t.to}
                    end={t.end}
                    role="tab"
                    className={({ isActive }) => cn("rounded-full px-3.5 py-1.5 text-sm font-semibold transition-colors", isActive ? "bg-brand text-white" : "text-muted hover:text-ink")}
                >
                    {t.label}
                </NavLink>
            ))}
        </div>
    );
}

export function MemberFilterChips({ picked, onToggle, onClear }: { picked: string[]; onToggle: (id: string) => void; onClear: () => void }) {
    const { members } = useSpace();
    return (
        <div className="flex flex-wrap items-center gap-2">
            <button
                type="button"
                onClick={onClear}
                aria-pressed={picked.length === 0}
                className={cn("h-9 rounded-full border px-3 text-sm font-medium", picked.length === 0 ? "border-brand bg-brand-soft text-brand-ink" : "border-line-strong text-muted hover:text-ink")}
            >
                Everyone
            </button>
            {members.map((m) => {
                const on = picked.includes(m.id);
                return (
                    <button
                        key={m.id}
                        type="button"
                        aria-pressed={on}
                        onClick={() => onToggle(m.id)}
                        className={cn("inline-flex h-9 items-center gap-2 rounded-full border pl-1 pr-3 text-sm font-medium", on ? "border-brand bg-brand-soft text-brand-ink" : "border-line-strong text-muted hover:text-ink")}
                    >
                        <MemberAvatar member={m} size="xs" />
                        {m.name.split(" ")[0]}
                    </button>
                );
            })}
        </div>
    );
}

const SOURCES: Array<{ id: EntrySource; label: string }> = [
    { id: "tasks", label: "Task deadlines" },
    { id: "goals", label: "Milestones" },
    { id: "curricula", label: "Assignments" },
    { id: "finance", label: "Bills" },
    { id: "travel", label: "Trips" },
    { id: "people", label: "Birthdays" },
];

/** The overlays are live references; this only decides whether they are drawn. */
export function OverlayToggles({ hidden, onToggle }: { hidden: EntrySource[]; onToggle: (s: EntrySource) => void }) {
    return (
        <fieldset className="flex flex-wrap items-center gap-2">
            <legend className="sr-only">Overlays</legend>
            {SOURCES.map((s) => {
                const on = !hidden.includes(s.id);
                return (
                    <button
                        key={s.id}
                        type="button"
                        aria-pressed={on}
                        onClick={() => onToggle(s.id)}
                        className={cn("inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-xs font-medium", on ? "border-line-strong bg-card text-ink" : "border-line text-caption")}
                    >
                        <span className={cn("size-2 rounded-full", on ? "bg-brand" : "bg-line-strong")} aria-hidden="true" />
                        {s.label}
                    </button>
                );
            })}
        </fieldset>
    );
}

// ---------------------------------------------------------------------------
// Entries
// ---------------------------------------------------------------------------

export function EntryRow({ entry, clash }: { entry: Entry; clash?: boolean }) {
    const { members } = useSpace();
    return (
        <li>
            <Link to={entry.href} className="flex items-start gap-3 rounded-md px-3 py-2.5 transition-colors hover:bg-page">
                <span className={cn("mt-0.5 grid size-8 shrink-0 place-items-center rounded-full text-md", entryTone(entry, members))} aria-hidden="true">
                    {EVENT_KIND[entry.kind].emoji}
                </span>
                <span className="min-w-0 flex-1">
                    <span className={cn("block truncate text-md font-semibold", entry.done && "text-muted line-through")}>{entry.title}</span>
                    <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-caption">
                        <span>{whenLabel(entry)}</span>
                        {entry.location && (
                            <span className="inline-flex items-center gap-1">
                                <MapPin size={11} aria-hidden="true" /> {entry.location}
                            </span>
                        )}
                        <span>· {entry.meta}</span>
                        {entry.readOnly && <span className="rounded-xs bg-page px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.04em]">Linked</span>}
                    </span>
                </span>
                {clash && (
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-peach-soft px-2 py-1 text-2xs font-semibold text-peach">
                        <AlertTriangle size={11} aria-hidden="true" /> Clash
                    </span>
                )}
                <span className="flex shrink-0 -space-x-1.5">
                    {entry.memberIds.slice(0, 3).map((id) => (
                        <MemberAvatar key={id} memberId={id} size="xs" />
                    ))}
                </span>
            </Link>
        </li>
    );
}

/** The little block a grid cell draws. */
export function EntryPill({ entry, clash, className, style, compact }: { entry: Entry; clash?: boolean; className?: string; style?: CSSProperties; compact?: boolean }) {
    const { members } = useSpace();
    return (
        <Link
            to={entry.href}
            style={style}
            title={`${entry.title} · ${whenLabel(entry)}`}
            className={cn(
                "block overflow-hidden rounded-sm px-2 py-1 text-left text-2xs leading-4 transition-shadow hover:shadow-hover",
                entryTone(entry, members),
                clash && "ring-2 ring-peach",
                entry.done && "opacity-60",
                className,
            )}
        >
            <span className="block truncate font-semibold">{entry.title}</span>
            {!compact && <span className="block truncate opacity-80">{entry.allDay ? "All day" : time(entry.startAt)}</span>}
        </Link>
    );
}

export function ClashNotice({ clashes }: { clashes: Conflict[] }) {
    const { members } = useSpace();
    if (!clashes.length) return null;
    const name = (id: string): string => shortName(members.find((m) => m.id === id)?.name ?? "someone");
    return (
        <div className="mb-4 rounded-lg bg-peach-soft px-4 py-3 text-sm leading-5 text-peach" role="status">
            <div className="flex items-center gap-2 font-semibold">
                <AlertTriangle size={15} aria-hidden="true" /> {clashes.length === 1 ? "One clash" : `${clashes.length} clashes`}
            </div>
            <ul className="mt-1.5 space-y-1">
                {clashes.slice(0, 4).map((c) => (
                    <li key={c.key}>
                        <span className="font-medium">{c.a.title}</span> ({whenLabel(c.a)}) overlaps <span className="font-medium">{c.b.title}</span> ({whenLabel(c.b)}) — {nameList(c.memberIds.slice(0, 3).map(name))}
                        {c.memberIds.length > 3 ? " and others" : ""} on {shortDate(c.a.startAt)}.
                    </li>
                ))}
            </ul>
        </div>
    );
}

// ---------------------------------------------------------------------------
// The event form
// ---------------------------------------------------------------------------

const labelCls = "mb-1.5 block text-xs font-medium text-muted";
const inputCls = "h-11 w-full rounded-sm border border-line-strong bg-card px-3 text-md outline-none focus:border-brand";

interface FormState {
    title: string;
    kind: EventKind;
    date: string;
    endDate: string;
    start: string;
    end: string;
    allDay: boolean;
    location: string;
    attendees: EventAttendee[];
    colourMemberId: string | null;
    freq: RecurFreq | "none";
    reminderMinutes: number | null;
    visibility: Visibility;
    sharedWith: string[];
    childSafe: boolean;
    notes: string;
}

const hhmm = (iso: string): string => {
    const d = new Date(iso);
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

function initialForm(ev: CalEvent | null, date: string, me: Member, startTime = "09:00"): FormState {
    if (ev) {
        return {
            title: ev.title,
            kind: ev.kind,
            date: isoDate(ev.startAt),
            endDate: isoDate(ev.endAt),
            start: hhmm(ev.startAt),
            end: hhmm(ev.endAt),
            allDay: ev.allDay,
            location: ev.location,
            attendees: ev.attendees,
            colourMemberId: ev.colourMemberId,
            freq: ev.rrule?.freq ?? "none",
            reminderMinutes: ev.reminderMinutes,
            visibility: ev.visibility,
            sharedWith: ev.sharedWith,
            childSafe: ev.childSafe,
            notes: ev.notes,
        };
    }
    return {
        title: "",
        kind: "event",
        date,
        endDate: date,
        start: startTime,
        end: `${String((Number(startTime.slice(0, 2)) + 1) % 24).padStart(2, "0")}:${startTime.slice(3, 5)}`,
        allDay: false,
        location: "",
        attendees: me.role === "child" ? [{ memberId: me.id, required: true }] : [],
        colourMemberId: null,
        freq: "none",
        reminderMinutes: 60,
        visibility: "family",
        sharedWith: [],
        childSafe: true,
        notes: "",
    };
}

export function EventDialog({
    open,
    onClose,
    event,
    defaultDate,
    defaultStart = "09:00",
    mutate,
}: {
    open: boolean;
    onClose: () => void;
    event: CalEvent | null;
    defaultDate: string;
    defaultStart?: string;
    mutate: (fn: (repo: CalendarRepo) => Promise<unknown>) => Promise<void>;
}) {
    const sp = useSpace();
    const { toast } = useToast();
    const [form, setForm] = useState<FormState>(() => initialForm(event, defaultDate, sp.me, defaultStart));
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [key, setKey] = useState("");

    // Re-seed the form whenever the dialog is opened on a different thing.
    const seedKey = `${event?.id ?? "new"}:${defaultDate}:${defaultStart}:${open}`;
    if (key !== seedKey) {
        setKey(seedKey);
        setForm(initialForm(event, defaultDate, sp.me, defaultStart));
        setError(null);
    }

    const simple = sp.role === "child" && !sp.can("calendar.manage");
    const set = <K extends keyof FormState>(k: K, v: FormState[K]): void => setForm((f) => ({ ...f, [k]: v }));

    const applyTemplate = (slug: string): void => {
        const t = EVENT_TEMPLATES.find((x) => x.slug === slug);
        if (!t) return;
        const [h, m] = t.start.split(":").map(Number);
        const endMins = h * 60 + m + t.minutes;
        setForm((f) => ({
            ...f,
            title: t.title,
            kind: t.kind,
            start: t.start,
            end: `${String(Math.floor(endMins / 60) % 24).padStart(2, "0")}:${String(endMins % 60).padStart(2, "0")}`,
            freq: t.freq ?? "none",
        }));
    };

    const submit = async (e: FormEvent): Promise<void> => {
        e.preventDefault();
        if (!form.title.trim()) {
            setError("Give it a name so everyone knows what it is.");
            return;
        }
        setBusy(true);
        setError(null);
        try {
            const startAt = form.allDay ? new Date(`${form.date}T00:00:00`).toISOString() : new Date(`${form.date}T${form.start}:00`).toISOString();
            const endAt = form.allDay ? new Date(`${form.endDate || form.date}T23:59:00`).toISOString() : new Date(`${form.date}T${form.end}:00`).toISOString();
            const payload: NewEventInput = {
                title: form.title,
                notes: form.notes,
                startAt,
                endAt,
                allDay: form.allDay,
                location: form.location,
                kind: form.kind,
                attendees: form.attendees,
                colourMemberId: form.colourMemberId,
                rrule: form.freq === "none" ? null : { freq: form.freq, weekday: new Date(`${form.date}T00:00:00`).getDay(), monthDay: null, until: null },
                reminderMinutes: form.reminderMinutes,
                visibility: form.visibility,
                sharedWith: form.sharedWith,
                childSafe: form.childSafe,
            };
            if (event) {
                await mutate((r) => r.updateEvent(event.id, payload));
                toast("Saved");
            } else {
                await mutate((r) => r.createEvent(payload));
                toast("In the diary");
            }
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : "That didn't save.");
        } finally {
            setBusy(false);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} title={event ? "Edit event" : "Add to the calendar"} wide>
            <form onSubmit={submit} className="space-y-4">
                <div>
                    <label className={labelCls} htmlFor="ev-title">
                        What is it?
                    </label>
                    <input id="ev-title" className={inputCls} value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="Swimming lesson" required />
                </div>

                {!event && !simple && (
                    <div>
                        <label className={labelCls} htmlFor="ev-template">
                            Or start from a rhythm
                        </label>
                        <select id="ev-template" className={inputCls} value="" onChange={(e) => applyTemplate(e.target.value)}>
                            <option value="">Choose one…</option>
                            {EVENT_TEMPLATES.map((t) => (
                                <option key={t.slug} value={t.slug}>
                                    {t.title} · {t.start}
                                </option>
                            ))}
                        </select>
                    </div>
                )}

                <div className="grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-2">
                    <div>
                        <label className={labelCls} htmlFor="ev-date">
                            Date
                        </label>
                        <input id="ev-date" type="date" className={inputCls} value={form.date} onChange={(e) => set("date", e.target.value)} required />
                    </div>
                    {form.allDay ? (
                        <div>
                            <label className={labelCls} htmlFor="ev-enddate">
                                Until
                            </label>
                            <input id="ev-enddate" type="date" className={inputCls} value={form.endDate} min={form.date} onChange={(e) => set("endDate", e.target.value)} />
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className={labelCls} htmlFor="ev-start">
                                    From
                                </label>
                                <input id="ev-start" type="time" className={inputCls} value={form.start} onChange={(e) => set("start", e.target.value)} required />
                            </div>
                            <div>
                                <label className={labelCls} htmlFor="ev-end">
                                    To
                                </label>
                                <input id="ev-end" type="time" className={inputCls} value={form.end} onChange={(e) => set("end", e.target.value)} required />
                            </div>
                        </div>
                    )}
                </div>

                <label className="flex items-center gap-2 text-md">
                    <input type="checkbox" checked={form.allDay} onChange={(e) => set("allDay", e.target.checked)} className="size-4 accent-[var(--color-brand)]" />
                    All day (or several days)
                </label>

                <div className="grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-2">
                    <div>
                        <label className={labelCls} htmlFor="ev-where">
                            Where
                        </label>
                        <input id="ev-where" className={inputCls} value={form.location} onChange={(e) => set("location", e.target.value)} placeholder="Croydon Sports Arena" />
                    </div>
                    <div>
                        <label className={labelCls} htmlFor="ev-kind">
                            Kind
                        </label>
                        <select id="ev-kind" className={inputCls} value={form.kind} onChange={(e) => set("kind", e.target.value as EventKind)}>
                            {EVENT_KINDS.map((k) => (
                                <option key={k} value={k}>
                                    {EVENT_KIND[k].emoji} {EVENT_KIND[k].label}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                {!simple && (
                    <>
                        <MemberMultiPicker
                            label="Who is it for (nobody = the whole family)"
                            value={form.attendees.map((a) => a.memberId)}
                            onChange={(ids) => set("attendees", ids.map((id) => ({ memberId: id, required: form.attendees.find((a) => a.memberId === id)?.required ?? true })))}
                        />
                        {form.attendees.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                                {form.attendees.map((a) => {
                                    const m = sp.members.find((x) => x.id === a.memberId);
                                    return (
                                        <button
                                            key={a.memberId}
                                            type="button"
                                            aria-pressed={a.required}
                                            onClick={() => set("attendees", form.attendees.map((x) => (x.memberId === a.memberId ? { ...x, required: !x.required } : x)))}
                                            className={cn("rounded-full border px-3 py-1 text-xs font-medium", a.required ? "border-brand bg-brand-soft text-brand-ink" : "border-line-strong text-caption")}
                                        >
                                            {m?.name.split(" ")[0] ?? "Member"} · {a.required ? "must be there" : "optional"}
                                        </button>
                                    );
                                })}
                            </div>
                        )}

                        <div className="grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-3">
                            <MemberPicker label="Colour" value={form.colourMemberId} onChange={(id) => set("colourMemberId", id)} allowFamily />
                            <div>
                                <label className={labelCls} htmlFor="ev-repeat">
                                    Repeats
                                </label>
                                <select id="ev-repeat" className={inputCls} value={form.freq} onChange={(e) => set("freq", e.target.value as RecurFreq | "none")}>
                                    <option value="none">Just once</option>
                                    {(["weekly", "fortnightly", "monthly"] as RecurFreq[]).map((f) => (
                                        <option key={f} value={f}>
                                            {RECUR_LABEL[f]}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className={labelCls} htmlFor="ev-remind">
                                    Reminder
                                </label>
                                <select id="ev-remind" className={inputCls} value={String(form.reminderMinutes ?? "")} onChange={(e) => set("reminderMinutes", e.target.value === "" ? null : Number(e.target.value))}>
                                    {REMINDER_CHOICES.map((r) => (
                                        <option key={r.label} value={r.minutes ?? ""}>
                                            {r.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <VisibilityPicker value={form.visibility} onChange={(v) => set("visibility", v)} sharedWith={form.sharedWith} onSharedWith={(ids) => set("sharedWith", ids)} />
                        {form.visibility === "family" && (
                            <label className="flex items-center gap-2 text-sm text-muted">
                                <input type="checkbox" checked={form.childSafe} onChange={(e) => set("childSafe", e.target.checked)} className="size-4 accent-[var(--color-brand)]" />
                                The children may see this on their calendar
                            </label>
                        )}
                    </>
                )}

                <div>
                    <label className={labelCls} htmlFor="ev-notes">
                        Notes
                    </label>
                    <textarea id="ev-notes" className="min-h-20 w-full rounded-sm border border-line-strong bg-card p-3 text-md outline-none focus:border-brand" value={form.notes} onChange={(e) => set("notes", e.target.value)} />
                </div>

                {error && <p className="text-sm text-danger-ink">{error}</p>}

                <div className="flex justify-end gap-2 pt-1">
                    <Button variant="ghost" onClick={onClose} type="button">
                        Cancel
                    </Button>
                    <Button type="submit" loading={busy}>
                        {event ? "Save" : "Add it"}
                    </Button>
                </div>
            </form>
        </Dialog>
    );
}

// ---------------------------------------------------------------------------
// Feeds (ICS)
// ---------------------------------------------------------------------------

function download(name: string, ics: string): void {
    const a = document.createElement("a");
    a.href = `data:text/calendar;charset=utf-8,${encodeURIComponent(ics)}`;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
}

export function FeedsDialog({
    open,
    onClose,
    state,
    entries,
    mutate,
}: {
    open: boolean;
    onClose: () => void;
    state: CalendarState;
    entries: Entry[];
    mutate: (fn: (repo: CalendarRepo) => Promise<unknown>) => Promise<void>;
}) {
    const sp = useSpace();
    const { toast } = useToast();
    const [revoking, setRevoking] = useState<string | null>(null);
    const [tested, setTested] = useState<Record<string, string>>({});
    const [newFor, setNewFor] = useState<string>(sp.role === "parent" ? "space" : sp.me.id);

    const copy = async (text: string): Promise<void> => {
        try {
            await navigator.clipboard.writeText(text);
            toast("Link copied");
        } catch {
            toast("Copy it from the box above", "danger");
        }
    };

    // What a subscriber's client gets if it asks right now — the same function
    // the server runs, so "reflects changes within five minutes" is something
    // you can watch happen rather than a promise in a help page.
    const test = (token: string): void => {
        const result = feedFor(state, token, entries, sp.space.name);
        setTested((t) => ({ ...t, [token]: `HTTP ${result.status} at ${time(new Date().toISOString())} · ${result.reason}` }));
    };

    return (
        // The confirmation is a SIBLING of this dialog, never a child of it: a
        // <dialog> inside a <dialog> hands its close up to the one around it,
        // and closing the confirmation would take the whole feed manager with
        // it — so you would never see the link you just revoked turn grey.
        <>
            <Dialog open={open} onClose={onClose} title="Subscribe to this calendar" wide>
                <p className="text-md leading-6 text-muted">
                    A feed is a link your phone's calendar checks for itself. It is built fresh every time it is asked for and carries a five-minute refresh hint, so a change here shows up there within
                    minutes. Revoking a link stops it on the spot.
                </p>

                <ul className="mt-4 space-y-3">
                    {state.tokens.map((t) => {
                        const result = feedFor(state, t.token, entries, sp.space.name);
                        const url = feedPath(t);
                        return (
                            <li key={t.id} className={cn("rounded-lg border p-3.5", t.revokedAt ? "border-line bg-page" : "border-line-strong bg-card")}>
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className="text-md font-semibold">{t.label}</span>
                                    <Tag tone={t.revokedAt ? "danger" : "ok"}>{t.revokedAt ? "Revoked" : "Live"}</Tag>
                                    <span className="ml-auto text-xs text-caption">
                                        {t.revokedAt ? `Stopped ${shortDate(t.revokedAt)}` : t.lastSyncedAt ? `Last pulled ${shortDate(t.lastSyncedAt)}` : "Not pulled yet"}
                                    </span>
                                </div>
                                <p className="mt-1.5 truncate rounded-xs bg-page px-2 py-1 font-mono text-2xs text-caption">{url}</p>
                                <p className={cn("mt-1.5 text-xs", result.ok ? "text-muted" : "text-danger-ink")}>{result.reason}</p>
                                <div className="mt-2.5 flex flex-wrap gap-2">
                                    <Button size="sm" variant="outline" onClick={() => void copy(url)}>
                                        <Copy size={13} aria-hidden="true" /> Copy link
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        disabled={!result.ok}
                                        onClick={() => {
                                            if (!result.ics) return;
                                            download(icsFilename(t.label), result.ics);
                                            void mutate((r) => r.touchToken(t.id));
                                        }}
                                    >
                                        <Download size={13} aria-hidden="true" /> Download .ics
                                    </Button>
                                    <Button size="sm" variant="ghost" onClick={() => test(t.token)}>
                                        Fetch it now
                                    </Button>
                                    {!t.revokedAt && (sp.role === "parent" || t.memberId === sp.me.id) && (
                                        <Button size="sm" variant="danger" onClick={() => setRevoking(t.id)}>
                                            <Trash2 size={13} aria-hidden="true" /> Revoke
                                        </Button>
                                    )}
                                </div>
                                {tested[t.token] && <p className={cn("mt-2 text-xs font-medium", result.ok ? "text-mint" : "text-danger-ink")}>{tested[t.token]}</p>}
                            </li>
                        );
                    })}
                </ul>

                {!state.tokens.length && <EmptyState icon={<Link2 size={20} aria-hidden="true" />} title="No feeds yet" body="Make one and paste it into your phone's calendar app." />}

                <div className="mt-5 rounded-lg bg-page p-3.5">
                    <label className={labelCls} htmlFor="feed-for">
                        New feed for
                    </label>
                    <div className="flex flex-wrap gap-2">
                        <select id="feed-for" className={cn(inputCls, "max-w-xs")} value={newFor} onChange={(e) => setNewFor(e.target.value)}>
                            {sp.role === "parent" && <option value="space">The whole family</option>}
                            {sp.members
                                .filter((m) => sp.role === "parent" || m.id === sp.me.id)
                                .map((m) => (
                                    <option key={m.id} value={m.id}>
                                        {m.name}
                                    </option>
                                ))}
                        </select>
                        <Button
                            onClick={async () => {
                                const scope = newFor === "space" ? "space" : "member";
                                const memberId = newFor === "space" ? null : newFor;
                                await mutate((r) => r.createToken(scope, memberId, memberId ? sp.members.find((m) => m.id === memberId)?.name : "The whole family"));
                                toast("Feed created");
                            }}
                        >
                            <Plus size={15} aria-hidden="true" /> Create feed
                        </Button>
                    </div>
                    <p className="mt-2 text-xs text-caption">Anyone with the link can read that calendar, so share it the way you would share a key.</p>
                </div>
            </Dialog>

            <Confirm
                open={Boolean(revoking)}
                title="Revoke this feed?"
                body="The link stops working immediately. Anyone subscribed will see the calendar stop updating, and nothing further is served."
                confirmLabel="Revoke it"
                danger
                onClose={() => setRevoking(null)}
                onConfirm={async () => {
                    if (!revoking) return;
                    await mutate((r) => r.revokeToken(revoking));
                    toast("Feed revoked");
                }}
            />
        </>
    );
}

/** One event, as a file you can hand to any calendar app. */
export function AddToCalendarButton({ entry }: { entry: Entry }) {
    const sp = useSpace();
    return (
        <Button
            variant="outline"
            size="md"
            onClick={() => download(icsFilename(entry.title), buildIcs([entry], { calendarName: sp.space.name }))}
        >
            <Download size={14} aria-hidden="true" /> Add to my calendar
        </Button>
    );
}

// ---------------------------------------------------------------------------
// The companion
// ---------------------------------------------------------------------------

const PRESETS = ["What do we have planned this weekend?", "Find an evening this week for all five of us", "What am I forgetting before Thursday?"];

export function AskCalendar({ entries, today }: { entries: Entry[]; today: string }) {
    const sp = useSpace();
    const { ask, busy, available } = useAi();
    const [q, setQ] = useState("");
    const [answer, setAnswer] = useState<string | null>(null);
    const [note, setNote] = useState<string | null>(null);

    const free = useMemo(() => freeEvenings(entries, [], today, 7, sp.members.map((m) => m.id)), [entries, today, sp.members]);

    const run = async (prompt: string): Promise<void> => {
        setAnswer(null);
        setNote(null);
        try {
            const r = await ask({
                action: "ask",
                prompt,
                extraContext: `Free evenings 18:00–21:00: ${free.map((f) => `${f.label} (${shortDate(f.date)})`).join(", ") || "none"}.`,
            });
            if (r.unavailable) setNote(r.unavailable);
            else setAnswer(r.text);
        } catch {
            setNote("The companion couldn't answer just now — the calendar below is what it would have read.");
        }
    };

    return (
        <Card className="bg-brand-soft">
            <div className="flex items-center gap-2 text-md font-semibold text-brand-ink">
                <Sparkles size={16} aria-hidden="true" /> Ask about the diary
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
                {PRESETS.map((p) => (
                    <Button key={p} size="sm" variant="outline" onClick={() => void run(p)} disabled={busy}>
                        {p}
                    </Button>
                ))}
            </div>
            <form
                className="mt-3 flex gap-2"
                onSubmit={(e) => {
                    e.preventDefault();
                    if (q.trim()) void run(q.trim());
                }}
            >
                <input className={cn(inputCls, "flex-1")} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ask anything about the week…" aria-label="Ask about the calendar" />
                <Button type="submit" loading={busy}>
                    Ask
                </Button>
            </form>
            {!available && <p className="mt-2 text-xs text-muted">The companion needs the backend for this build — the free evenings below are computed from the calendar itself.</p>}
            {note && <p className="mt-2 text-sm text-muted">{note}</p>}
            {answer && <p className="mt-3 whitespace-pre-wrap rounded-md bg-card p-3 text-md leading-6">{answer}</p>}
            <div className="mt-3 rounded-md bg-card p-3">
                <div className="text-xs font-semibold uppercase tracking-[0.06em] text-muted">Free evenings this week</div>
                <p className="mt-1 text-md">{free.length ? free.map((f) => `${f.label} (${shortDate(f.date)})`).join(" · ") : "Every evening has something in it."}</p>
            </div>
        </Card>
    );
}

// ---------------------------------------------------------------------------
// Small shared bits
// ---------------------------------------------------------------------------

export function DayHeading({ date, today, count }: { date: string; today: string; count: number }) {
    const isToday = date === today;
    return (
        <div className="mb-2 flex items-baseline gap-2">
            <h3 className={cn("text-md font-semibold", isToday && "text-brand")}>{dayLabel(date, today)}</h3>
            <span className="text-xs text-caption">
                {shortDate(date)} · {count === 1 ? "1 thing" : `${count} things`}
            </span>
        </div>
    );
}

export function AddButton({ onClick, label = "Add event" }: { onClick: () => void; label?: string }) {
    return (
        <Button onClick={onClick}>
            <Plus size={16} aria-hidden="true" /> {label}
        </Button>
    );
}

export function FeedsButton({ onClick }: { onClick: () => void }) {
    return (
        <Button variant="outline" onClick={onClick}>
            <Link2 size={15} aria-hidden="true" /> Feeds
        </Button>
    );
}

export function EditControls({ event, onEdit, onDelete }: { event: CalEvent; onEdit: () => void; onDelete: () => void }) {
    const sp = useSpace();
    if (!canEditEvent(event, sp)) {
        return <p className="text-xs text-caption">This one belongs to whoever added it — they or a parent can change it.</p>;
    }
    return (
        <div className="flex gap-2">
            <Button variant="outline" size="md" onClick={onEdit}>
                Edit
            </Button>
            <IconButton label="Delete event" size="md" onClick={onDelete}>
                <Trash2 size={15} />
            </IconButton>
        </div>
    );
}

export function RepeatTag({ freq }: { freq: RecurFreq }) {
    return (
        <Tag tone="neutral" icon={<Repeat size={11} aria-hidden="true" />}>
            {RECUR_LABEL[freq]}
        </Tag>
    );
}

// ---------------------------------------------------------------------------
// RSVP — the guest's one write
// ---------------------------------------------------------------------------

const RESPONSES: RsvpResponse[] = ["yes", "maybe", "no"];

export function RsvpControl({
    event,
    state,
    mutate,
    memberId,
    compact,
}: {
    event: CalEvent;
    state: CalendarState;
    mutate: (fn: (repo: CalendarRepo) => Promise<unknown>) => Promise<void>;
    memberId?: string;
    compact?: boolean;
}) {
    const sp = useSpace();
    const { toast } = useToast();
    const who = memberId ?? sp.me.id;
    const mine = rsvpFor(state, event.id, who);
    if (!canRsvp(event, sp, who)) return null;
    return (
        <div className="flex flex-wrap items-center gap-2">
            {!compact && <span className="text-xs font-medium text-muted">Can you come?</span>}
            {RESPONSES.map((r) => (
                <Button
                    key={r}
                    size="sm"
                    variant={mine?.response === r ? "brand" : "outline"}
                    onClick={async () => {
                        await mutate((repo) => repo.setRsvp(event.id, r, who));
                        toast(r === "yes" ? "Marked as going" : r === "no" ? "They know you can't" : "Marked as maybe");
                    }}
                >
                    {RSVP_LABEL[r]}
                </Button>
            ))}
            {mine && (
                <button
                    type="button"
                    className="text-xs text-caption underline underline-offset-2"
                    onClick={() => void mutate((repo) => repo.clearRsvp(event.id, who))}
                >
                    Clear
                </button>
            )}
        </div>
    );
}

/** Who said what, for the event page. */
export function RsvpSummaryList({ event, state }: { event: CalEvent; state: CalendarState }) {
    const summary = rsvpSummary(state, event);
    const rows: Array<{ label: string; ids: string[]; tone: "ok" | "warn" | "danger" | "neutral" }> = [
        { label: "Going", ids: summary.yes, tone: "ok" },
        { label: "Maybe", ids: summary.maybe, tone: "warn" },
        { label: "Can't", ids: summary.no, tone: "danger" },
        { label: "No answer yet", ids: summary.pending, tone: "neutral" },
    ];
    if (!event.attendees.length) return <p className="text-sm text-muted">This one is for the whole family.</p>;
    return (
        <ul className="space-y-2">
            {rows
                .filter((r) => r.ids.length)
                .map((r) => (
                    <li key={r.label} className="flex flex-wrap items-center gap-2">
                        <Tag tone={r.tone}>{r.label}</Tag>
                        {r.ids.map((id) => (
                            <MemberAvatar key={id} memberId={id} size="xs" showName />
                        ))}
                    </li>
                ))}
        </ul>
    );
}
