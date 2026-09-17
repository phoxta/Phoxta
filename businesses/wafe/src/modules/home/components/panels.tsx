import { useState } from "react";
import { Link } from "react-router-dom";
import { Check, Clock } from "lucide-react";
import type { AgendaItem, AttentionItem, Member } from "@/data/core";
import { cn } from "@/lib/cn";
import { addDays, isoDate, time } from "@/lib/format";
import { MemberAvatar } from "@/components/shared";
import { Ring } from "@/components/ui/charts";
import { Button } from "@/components/ui/primitives";
import { ATTENTION_RULES, attentionKey, weekOf } from "../derive";
import type { PeekEvent } from "../peek";
import { attentionVerb, isRoutine, type Face } from "../select";
import { NextAction, Overflow, Widget } from "./bits";

const TONE: Record<AttentionItem["tone"], string> = {
    danger: "border-danger/30 bg-danger-soft text-danger-ink",
    warn: "border-peach/30 bg-peach-soft text-peach",
    info: "border-brand/20 bg-brand-soft text-brand-ink",
    celebrate: "border-live/30 bg-live-soft text-live-ink",
};

// ---------------------------------------------------------------------------
// The family's faces
// ---------------------------------------------------------------------------

/**
 * The photograph at the top of Home: everyone, with their own day drawn round
 * them and a mint dot when they have checked in. No progress bars, no status
 * sentences, no "11% done" — a family is not a completion rate.
 *
 * Tapping a face is the density release valve. It does not navigate: it
 * re-runs the same selection over that one person, in place, so sixty-three
 * things for six people becomes seven for one.
 */
export function FacesRow({ faces, total, lens, onLens }: { faces: Face[]; total: number; lens: string | null; onLens: (id: string | null) => void }) {
    if (!faces.length) return null;
    return (
        <ul className="rail pb-1 md:mx-0 md:flex-wrap md:overflow-visible md:px-0 md:pb-0">
            {faces.map((f) => {
                const on = lens === f.memberId;
                return (
                    <li key={f.memberId} className="w-[60px]">
                        <button
                            type="button"
                            onClick={() => onLens(on ? null : f.memberId)}
                            aria-pressed={on}
                            className="flex w-full flex-col items-center gap-1 rounded-lg py-0.5 transition-opacity hover:opacity-80"
                        >
                            <span className="relative">
                                <Ring pct={f.pct} size={44} stroke={2.5} label={`${f.name}: ${f.done} of ${f.total} done today`}>
                                    <MemberAvatar memberId={f.memberId} size="sm" />
                                </Ring>
                                {f.checkedIn && <span className="absolute bottom-0 right-0 size-3 rounded-full border-2 border-home-soft bg-mint" role="img" aria-label={`${f.name} has checked in`} />}
                            </span>
                            <span className={cn("w-full truncate text-center text-xs leading-4", on ? "font-bold text-brand" : "font-medium")}>{f.name}</span>
                        </button>
                    </li>
                );
            })}
            {total > faces.length && (
                <li className="w-[60px]">
                    <Link to="/family/members" className="flex w-full flex-col items-center gap-1 py-0.5">
                        <span className="grid size-11 place-items-center rounded-full bg-card text-sm font-semibold text-muted">+{total - faces.length}</span>
                        <span className="text-xs leading-4 text-muted">more</span>
                    </Link>
                </li>
            )}
        </ul>
    );
}

// ---------------------------------------------------------------------------
// Things
// ---------------------------------------------------------------------------

/**
 * The three rows that are the whole of "Today" on Home.
 *
 * The circle is a target, not a checkbox: `AgendaItem` carries `done` but the
 * contract gives Home no way to write it back, and Home may not reach into
 * another module's data. So the row deep-links to the record it came from and
 * the module does the write — which is also the only place a chore's photo
 * proof or a lesson's score can be captured.
 */
export function ThingsList({ items, big = false }: { items: AgendaItem[]; big?: boolean }) {
    return (
        <ul>
            {items.map((i) => (
                <li key={`${i.moduleId}:${i.id}`}>
                    <Link
                        to={i.href}
                        className={cn("flex items-center gap-3 rounded-lg px-2 transition-colors hover:bg-card/70", big ? "min-h-[56px] py-2 md:min-h-[52px]" : "min-h-[52px] py-2")}
                    >
                        <span className={cn("grid size-6 shrink-0 place-items-center rounded-full border", i.done ? "border-brand bg-brand text-white" : "border-line-strong text-transparent")} aria-hidden="true">
                            <Check size={13} strokeWidth={2.5} />
                        </span>
                        <span className="min-w-0 flex-1">
                            <span className={cn("block truncate font-semibold", big ? "text-lg" : "text-base", i.done && "text-muted line-through")}>{i.title}</span>
                            <span className="block truncate text-xs leading-4 text-caption">{i.meta}</span>
                        </span>
                        {i.memberId && <MemberAvatar memberId={i.memberId} size="xs" className="shrink-0" />}
                        {i.at && (
                            <span className="flex shrink-0 items-center gap-1 text-xs tabular-nums text-muted">
                                <Clock size={12} aria-hidden="true" /> {time(i.at)}
                            </span>
                        )}
                    </Link>
                </li>
            ))}
        </ul>
    );
}

// ---------------------------------------------------------------------------
// Needs you
// ---------------------------------------------------------------------------

/**
 * Three decisions, each with a verb.
 *
 * The rules that decide what lands here (ATTENTION_RULES) moved to /attention:
 * a family's morning is not the place to document a rules engine.
 */
export function NeedsYou({ items, total, onResolve, lensName }: { items: AttentionItem[]; total: number; onResolve: (key: string, resolved: boolean) => void; lensName?: string | null }) {
    return (
        <section className="rounded-xl bg-card p-4 md:p-5">
            <div className="mb-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <h2 className="font-display text-xl leading-6">Needs you</h2>
                {items.length > 0 ? (
                    <p className="min-w-0 flex-1 truncate text-sm text-muted">
                        {items.length} of {total}
                        {items[0] ? ` · worst: ${items[0].title}` : ""}
                    </p>
                ) : (
                    <p className="min-w-0 flex-1 text-sm text-muted">Nothing waiting</p>
                )}
                {total > 0 && (
                    <Link to="/attention" className="shrink-0 text-sm font-semibold text-brand underline-offset-4 hover:underline">
                        See all
                    </Link>
                )}
            </div>

            {items.length === 0 ? (
                <p className="rounded-lg bg-page px-4 py-4 text-md leading-6 text-muted">
                    {lensName ? `Nothing needs a decision about ${lensName} today.` : "Nothing is overdue, over budget or waiting on you. That is what a calm week looks like."}
                </p>
            ) : (
                <ul className="space-y-2">
                    {items.map((a) => (
                        <li key={attentionKey(a)} className={cn("flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border px-3.5 py-2.5", TONE[a.tone])}>
                            <span className="min-w-0 flex-1">
                                <span className="block truncate text-md font-semibold">{a.title}</span>
                                <span className="block truncate text-sm leading-5 opacity-90">{a.body}</span>
                            </span>
                            <Link to={a.href} className="inline-flex h-8 shrink-0 items-center rounded-full bg-card px-3.5 text-xs font-semibold text-ink hover:bg-page">
                                {attentionVerb(a)}
                            </Link>
                            <Button variant="ghost" size="sm" onClick={() => onResolve(attentionKey(a), true)} aria-label={`Mark "${a.title}" dealt with`}>
                                <Check size={14} aria-hidden="true" /> Done
                            </Button>
                        </li>
                    ))}
                </ul>
            )}
        </section>
    );
}

/** The whole queue, grouped by where it came from — the /attention page. */
export function AttentionList({ items, resolvedKeys, canResolve, onResolve }: { items: AttentionItem[]; resolvedKeys: string[]; canResolve: boolean; onResolve: (key: string, resolved: boolean) => void }) {
    const [showDealt, setShowDealt] = useState(false);
    const resolved = new Set(resolvedKeys);
    const open = items.filter((a) => !resolved.has(attentionKey(a)));
    const dealt = items.filter((a) => resolved.has(attentionKey(a)));

    const groups = new Map<string, AttentionItem[]>();
    for (const a of [...open].sort((x, y) => y.weight - x.weight)) groups.set(a.moduleId, [...(groups.get(a.moduleId) ?? []), a]);

    return (
        <div className="flex flex-col gap-4">
            {open.length === 0 && <NextAction line="Nothing is overdue, over budget or waiting on you. That is what a calm week looks like." to="/" cta="Back to Home" />}

            {[...groups.entries()].map(([moduleId, rows]) => (
                <section key={moduleId} className="rounded-xl bg-card p-4 md:p-5">
                    <h2 className="mb-3 text-2xs font-semibold uppercase tracking-[0.1em] text-caption">
                        {moduleId} · {rows.length}
                    </h2>
                    <ul className="space-y-2">
                        {rows.map((a) => (
                            <li key={attentionKey(a)} className={cn("flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border px-3.5 py-3", TONE[a.tone])}>
                                <Link to={a.href} className="min-w-0 flex-1">
                                    <span className="block text-md font-semibold">{a.title}</span>
                                    <span className="mt-0.5 block text-sm leading-5 opacity-90">{a.body}</span>
                                </Link>
                                {canResolve && (
                                    <Button variant="ghost" size="sm" onClick={() => onResolve(attentionKey(a), true)} aria-label={`Mark "${a.title}" dealt with`}>
                                        <Check size={14} aria-hidden="true" /> Done
                                    </Button>
                                )}
                            </li>
                        ))}
                    </ul>
                </section>
            ))}

            {dealt.length > 0 && (
                <div>
                    <button type="button" onClick={() => setShowDealt((v) => !v)} className="text-sm font-semibold text-brand underline underline-offset-4">
                        {showDealt ? "Hide" : `Show ${dealt.length} dealt with`}
                    </button>
                    {showDealt && (
                        <ul className="mt-2 space-y-1">
                            {dealt.map((a) => (
                                <li key={attentionKey(a)} className="flex items-center gap-2 text-sm text-muted">
                                    <Check size={13} className="shrink-0" aria-hidden="true" />
                                    <span className="min-w-0 flex-1 truncate line-through">{a.title}</span>
                                    {canResolve && (
                                        <button type="button" onClick={() => onResolve(attentionKey(a), false)} className="shrink-0 text-xs font-semibold text-brand underline underline-offset-4">
                                            Bring back
                                        </button>
                                    )}
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            )}

            <details className="rounded-xl bg-card p-4 text-sm text-muted md:p-5">
                <summary className="cursor-pointer font-semibold text-ink">What ends up in here?</summary>
                <ul className="mt-2 list-disc space-y-1 pl-4">
                    {ATTENTION_RULES.map((r) => (
                        <li key={r}>{r}</li>
                    ))}
                </ul>
            </details>
        </div>
    );
}

// ---------------------------------------------------------------------------
// The whole of today — /today
// ---------------------------------------------------------------------------

/**
 * Everything due, grouped the way a parent thinks: mine, theirs, ours.
 *
 * This is the list Home used to open with. It has not been thrown away; it is
 * one tap behind "and 53 more across the family", with a member filter and a
 * "Hide routines" toggle that starts ON — because six chores, three habits and
 * a wardrobe pick are somebody's rhythm, not the day.
 */
export function TodayList({ agenda, meId, members, letGo = 0 }: { agenda: AgendaItem[]; meId: string; members: Member[]; letGo?: number }) {
    const [only, setOnly] = useState<string | null>(null);
    const [hideRoutines, setHideRoutines] = useState(true);

    const filtered = agenda.filter((a) => (hideRoutines ? !isRoutine(a) : true)).filter((a) => (only ? a.memberId === only : true));
    const mine = filtered.filter((a) => a.memberId === meId);
    const family = filtered.filter((a) => a.memberId === null);
    const others = members
        .filter((m) => m.id !== meId)
        .map((m) => ({ member: m, items: filtered.filter((a) => a.memberId === m.id) }))
        .filter((g) => g.items.length > 0);
    const done = filtered.filter((a) => a.done).length;
    const hidden = agenda.length - filtered.length;

    return (
        <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-2">
                <button
                    type="button"
                    onClick={() => setOnly(null)}
                    aria-pressed={only === null}
                    className={cn("h-8 rounded-full border px-3.5 text-xs font-semibold", only === null ? "border-brand bg-brand text-white" : "border-line-strong bg-card hover:border-ink")}
                >
                    Everyone
                </button>
                {members
                    .filter((m) => m.role !== "guest")
                    .map((m) => (
                        <button
                            key={m.id}
                            type="button"
                            onClick={() => setOnly(only === m.id ? null : m.id)}
                            aria-pressed={only === m.id}
                            className={cn("h-8 rounded-full border px-3.5 text-xs font-semibold", only === m.id ? "border-brand bg-brand text-white" : "border-line-strong bg-card hover:border-ink")}
                        >
                            {m.name.split(" ")[0]}
                        </button>
                    ))}
                <label className="ml-auto inline-flex items-center gap-2 text-sm text-muted">
                    <input type="checkbox" checked={hideRoutines} onChange={(e) => setHideRoutines(e.target.checked)} className="size-4 accent-[var(--color-brand)]" />
                    Hide routines
                </label>
            </div>

            <Widget
                title="Today"
                sub={filtered.length ? `${done} of ${filtered.length} done` : undefined}
                isEmpty={filtered.length === 0}
                empty={{ line: hidden ? "Only routines are left today." : "Nothing is due today across the family.", to: "/execute/tasks", cta: "Add something to do" }}
            >
                <div className="space-y-4">
                    {mine.length > 0 && <Group label="Me" items={mine} />}
                    {others.map((g) => (
                        <Group key={g.member.id} label={g.member.name.split(" ")[0]} items={g.items} memberId={g.member.id} />
                    ))}
                    {family.length > 0 && <Group label="All of us" items={family} />}
                </div>
                {hidden > 0 && (
                    <p className="mt-3 text-xs text-caption">
                        {hidden} routine{hidden === 1 ? "" : "s"} (habits, verses, reading, outfits) {hidden === 1 ? "is" : "are"} hidden. They still count for the person whose rhythm they are.
                    </p>
                )}
                {letGo > 0 && (
                    <p className="mt-1.5 text-xs text-caption">
                        {letGo} thing{letGo === 1 ? "" : "s"} {letGo === 1 ? "was" : "were"} let go at the check-in and {letGo === 1 ? "is" : "are"} no longer on today&apos;s list.
                    </p>
                )}
            </Widget>
        </div>
    );
}

function Group({ label, items, memberId }: { label: string; items: AgendaItem[]; memberId?: string }) {
    return (
        <div>
            <div className="mb-1.5 flex items-center gap-2">
                {memberId && <MemberAvatar memberId={memberId} size="xs" />}
                <h3 className="text-2xs font-semibold uppercase tracking-[0.1em] text-caption">
                    {label} · {items.length}
                </h3>
            </div>
            <ThingsList items={items} />
        </div>
    );
}

// ---------------------------------------------------------------------------
// The week
// ---------------------------------------------------------------------------

/** Monday to Sunday, with what is booked on each day. */
export function WeekStrip({ today, events, compact = false }: { today: string; events: PeekEvent[]; compact?: boolean }) {
    const start = weekOf(today);
    const days = Array.from({ length: 7 }, (_, i) => isoDate(addDays(`${start}T12:00:00`, i)));
    const counts = new Map<string, number>();
    for (const e of events) counts.set(e.date, (counts.get(e.date) ?? 0) + 1);

    const strip = (
        <ul className="grid grid-cols-7 gap-1.5">
            {days.map((d) => {
                const n = counts.get(d) ?? 0;
                const isToday = d === today;
                return (
                    <li key={d}>
                        <Link
                            to="/execute/calendar"
                            className={cn("flex flex-col items-center gap-1 rounded-md py-2 transition-colors", isToday ? "bg-brand text-white" : "bg-page text-ink hover:bg-subtle")}
                            aria-label={`${new Date(`${d}T12:00:00`).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}: ${n} event${n === 1 ? "" : "s"}`}
                        >
                            <span className={cn("text-[10px] font-semibold uppercase tracking-[0.08em]", isToday ? "text-white/80" : "text-caption")}>
                                {new Date(`${d}T12:00:00`).toLocaleDateString("en-GB", { weekday: "short" }).slice(0, 1)}
                            </span>
                            <span className="text-base font-semibold tabular-nums">{Number(d.slice(8))}</span>
                            <span className="flex h-1.5 items-center gap-0.5" aria-hidden="true">
                                {Array.from({ length: Math.min(n, 3) }, (_, i) => (
                                    <i key={i} className={cn("block size-1.5 rounded-full", isToday ? "bg-white" : "bg-brand")} />
                                ))}
                            </span>
                        </Link>
                    </li>
                );
            })}
        </ul>
    );

    if (compact) return strip;
    return (
        <Widget title="This week" action={<Link to="/execute/calendar" className="text-sm font-semibold text-brand underline-offset-4 hover:underline">Calendar</Link>}>
            {strip}
            {events.length === 0 && <Overflow className="mt-2">Nothing is in the diary this week.</Overflow>}
        </Widget>
    );
}
