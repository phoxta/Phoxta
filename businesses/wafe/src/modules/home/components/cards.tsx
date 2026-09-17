import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { X } from "lucide-react";
import type { AgendaItem, AttentionItem } from "@/data/core";
import { cn } from "@/lib/cn";
import { longDate, money, time } from "@/lib/format";
import { MemberAvatar } from "@/components/shared";
import { Ring } from "@/components/ui/charts";
import { Button } from "@/components/ui/primitives";
import { moodEmoji, moodLabel, yearsSince } from "../derive";
import type { PeekBudget, PeekEvent, PeekMoment, PeekPrayer, PeekVerse } from "../peek";
import type { Face, PickedRings } from "../select";
import type { CheckIn, WeeklyReview } from "../types";
import { MoodHearts, NextAction, Overflow } from "./bits";
import { FacesRow, ThingsList, WeekStrip } from "./panels";

/**
 * The six sections a parent's Home is made of.
 *
 * Twelve cards became six because Home is not the family's data, it is the
 * family's day: their faces, one sentence, three things and the way in. Every
 * number that used to be a card is now one tap behind a link, and every
 * section that caps its list prints the true total beside the cap.
 */

// ---------------------------------------------------------------------------
// 2. THE DAY
// ---------------------------------------------------------------------------

export function DayCard({
    celebration,
    faces,
    facesTotal,
    lens,
    lensName,
    onLens,
    briefing,
    verse,
    prayers,
    things,
    open,
    emptyLine,
    moreSuffix = "across the family",
    summary,
}: {
    celebration?: AttentionItem | null;
    faces: Face[];
    facesTotal: number;
    lens: string | null;
    lensName: string | null;
    onLens: (id: string | null) => void;
    briefing: ReactNode;
    verse: PeekVerse | null;
    prayers: PeekPrayer[];
    things: AgendaItem[];
    /** How many are open in total, behind the three. */
    open: number;
    emptyLine?: string;
    /** "across the family" for a parent, "on your list" for a member. */
    moreSuffix?: string;
    /**
     * What a member who is not a parent gets instead of the faces row.
     * Six named siblings with completion rings is a leaderboard, and a
     * member's view of himself is not a parent's view of the family.
     */
    summary?: string;
}) {
    const more = Math.max(0, open - things.length);
    return (
        <section className="paper flex flex-col gap-3 rounded-xl bg-home-soft p-5 md:p-6">
            {/* a. The only place a celebration may appear: a birthday is not a problem. */}
            {celebration && (
                <p className="text-base font-semibold leading-6 text-live-ink">
                    <span aria-hidden="true">🎉 </span>
                    {celebration.title}
                </p>
            )}

            {/* b. The photograph of the family. */}
            <FacesRow faces={faces} total={facesTotal} lens={lens} onLens={onLens} />
            {summary && <p className="text-sm text-muted">{summary}</p>}

            {/* c. The sentence. */}
            {briefing}

            {/* d. Two lines of faith, not a five-row card. */}
            {(verse || prayers.length > 0) && (
                <p className="text-sm leading-5">
                    {verse && (
                        <Link to="/grow/bible" className="font-display text-md italic hover:underline">
                            {verse.reference} — &ldquo;{verse.text}&rdquo;
                        </Link>
                    )}
                    {prayers.length > 0 && (
                        <span className="text-muted">
                            {verse ? " · " : ""}
                            Praying for {prayers.map((p) => p.title).join(" and ")} ·{" "}
                            <Link to="/grow/bible" className="font-semibold text-brand underline underline-offset-4">
                                Prayer wall
                            </Link>
                        </span>
                    )}
                </p>
            )}

            {/* e. Three things — or one person's whole day, under the lens. */}
            <div>
                <div className="mb-1 flex items-center gap-2">
                    <h2 className="flex-1 text-2xs font-semibold uppercase tracking-[0.1em] text-caption">{lens && lensName ? `${lensName}'s day` : "Three things"}</h2>
                    {lens && (
                        <button type="button" onClick={() => onLens(null)} className="inline-flex items-center gap-1 rounded-full bg-card px-2.5 py-1 text-xs font-semibold">
                            {lensName} <X size={12} aria-hidden="true" />
                            <span className="sr-only">Show the whole family again</span>
                        </button>
                    )}
                </div>
                {things.length > 0 ? (
                    <ThingsList items={things} big />
                ) : (
                    <div className="rounded-lg bg-card/70 px-4 py-3.5">
                        <p className="text-md leading-6 text-muted">{emptyLine ?? "Nothing is due today. That is allowed."}</p>
                        <Link to="/execute/tasks" className="mt-1 inline-block text-sm font-semibold text-brand underline underline-offset-4">
                            Add something
                        </Link>
                    </div>
                )}
            </div>

            {/* f. The honest line. */}
            {more > 0 && (
                <Overflow to="/today" cta="see today">
                    and {more} more {lens ? "of theirs" : moreSuffix} —
                </Overflow>
            )}
        </section>
    );
}

// ---------------------------------------------------------------------------
// 3b. Money — one honest line, permanently
// ---------------------------------------------------------------------------

/**
 * Spending is one of the seven questions Home must answer without navigating,
 * so it is never silent — but it is never a card either. A card that says
 * "everything is fine" every morning is how a family learns to stop reading
 * the page; one line, louder when it needs to be, is not.
 */
export function MoneyLine({ budget, currency }: { budget: PeekBudget | null; currency: string }) {
    if (!budget) {
        return (
            <p className="px-1 text-sm text-muted">
                Money · nothing is budgeted yet ·{" "}
                <Link to="/live/finance" className="font-semibold text-brand underline underline-offset-4">
                    Set a budget
                </Link>
            </p>
        );
    }
    const over = budget.pct >= 100;
    return (
        <p className="px-1 text-sm text-muted">
            Money ·{" "}
            <span className={cn("font-semibold", over ? "text-danger-ink" : budget.pct >= 90 ? "text-peach" : "text-ink")}>
                {budget.label} {budget.pct}%
            </span>{" "}
            of {money(budget.limitCents, currency)}
            {over ? ` — ${money(budget.spentCents, currency)} spent` : ""} ·{" "}
            <Link to="/live/finance" className="font-semibold text-brand underline underline-offset-4">
                Finances
            </Link>
        </p>
    );
}

// ---------------------------------------------------------------------------
// 4. THIS WEEK
// ---------------------------------------------------------------------------

export function WeekCard({
    today,
    events,
    review,
    isThisWeek,
    canPlan,
    planLabel,
}: {
    today: string;
    events: PeekEvent[];
    review?: WeeklyReview;
    isThisWeek: boolean;
    canPlan: boolean;
    planLabel: string;
}) {
    const priorities = review?.priorities ?? [];
    const next = events.find((e) => e.at >= new Date().toISOString()) ?? events[0];
    return (
        <section className="rounded-xl bg-card p-4 md:p-5">
            <div className="mb-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <h2 className="font-display text-xl leading-6">This week</h2>
                <p className="min-w-0 flex-1 truncate text-sm text-muted">
                    {next ? `next: ${next.title} ${time(next.at)}` : "nothing in the diary"}
                    {events.length > 0 ? ` · ${events.length} event${events.length === 1 ? "" : "s"}` : ""}
                </p>
                <Link to="/execute/calendar" className="shrink-0 text-sm font-semibold text-brand underline-offset-4 hover:underline">
                    Calendar
                </Link>
            </div>

            <div className="grid grid-cols-[minmax(0,1fr)] gap-4 md:grid-cols-2">
                <WeekStrip today={today} events={events} compact />
                <div className="min-w-0">
                    {priorities.length > 0 ? (
                        <>
                            <h3 className="mb-1.5 text-2xs font-semibold uppercase tracking-[0.1em] text-caption">
                                Our focus{review && !isThisWeek ? ` · set ${longDate(review.completedAt ?? `${review.weekStart}T12:00:00`)}` : ""}
                            </h3>
                            <ol className="space-y-1">
                                {priorities.map((p, i) => (
                                    <li key={p} className="flex items-start gap-2.5 text-md leading-6">
                                        <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-brand-soft text-2xs font-bold text-brand-ink">{i + 1}</span>
                                        <span className="min-w-0">{p}</span>
                                    </li>
                                ))}
                            </ol>
                            {canPlan && (
                                <Link to="/planning" className="mt-2 inline-block text-sm font-semibold text-brand underline underline-offset-4">
                                    Planning
                                </Link>
                            )}
                        </>
                    ) : (
                        <NextAction line="No focus is set for this week — Sunday planning takes 25 minutes." to="/planning" cta="Run Sunday planning" />
                    )}
                </div>
            </div>

            {canPlan && priorities.length > 0 && (
                <Link to="/planning" className="mt-4 flex h-11 w-full items-center justify-center rounded-full border border-line-strong bg-page text-md font-semibold md:hidden">
                    {planLabel}
                </Link>
            )}
        </section>
    );
}

// ---------------------------------------------------------------------------
// 5. WHAT WE'RE BUILDING
// ---------------------------------------------------------------------------

export function BuildingCard({ rings, title = "What we're building", seeAll = "/execute/goals" }: { rings: PickedRings; title?: string; seeAll?: string }) {
    return (
        <section className="rounded-xl bg-card p-4 md:p-5">
            <div className="mb-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <h2 className="font-display text-xl leading-6">{title}</h2>
                {rings.shown.length >= 3 && (
                    <span className="min-w-0 flex-1 text-sm text-muted">
                        Our Future — <strong className="font-display text-[19px] text-brand tabular-nums">{rings.average}%</strong>
                    </span>
                )}
                {rings.total > rings.shown.length && (
                    <Link to={seeAll} className="shrink-0 text-sm font-semibold text-brand underline-offset-4 hover:underline">
                        See all {rings.total}
                    </Link>
                )}
            </div>
            {rings.shown.length === 0 ? (
                <NextAction line="One goal, with a date on it, is enough to start." to="/execute/goals" cta="Set a family goal" />
            ) : (
                <ul className="grid grid-cols-[minmax(0,1fr)] gap-2.5 md:grid-cols-3">
                    {rings.shown.map((r) => (
                        <li key={`${r.moduleId}:${r.id}`}>
                            <Link to={r.href} className="flex h-full items-center gap-3 rounded-lg bg-page p-3 transition-shadow hover:shadow-hover">
                                <Ring pct={r.pct} size={48} stroke={3} label={`${r.label}: ${r.pct}%`}>
                                    <span className="text-2xs font-semibold tabular-nums">{r.pct}%</span>
                                </Ring>
                                <span className="min-w-0">
                                    <span className="block truncate text-md font-semibold">{r.label}</span>
                                    <span className="block truncate text-xs text-muted">{r.sub}</span>
                                </span>
                            </Link>
                        </li>
                    ))}
                </ul>
            )}
        </section>
    );
}

// ---------------------------------------------------------------------------
// 6. TONIGHT
// ---------------------------------------------------------------------------

/** "Handed to Oluwafemi" reading mid-sentence, without lowercasing a person's name. */
const uncapitalise = (s: string): string => (s ? s.charAt(0).toLowerCase() + s.slice(1) : s);

/**
 * The evening, in one card and one thumb.
 *
 * The five hearts are ON Home: tapping one opens the check-in already at
 * gratitude with that mood set, which is the 21:00 ritual reduced to a single
 * tap. Mood on a shared family screen is fine; gratitude and prayer stay
 * behind the dialog.
 *
 * "What we did" comes first, because a day should be acknowledged before it is
 * triaged.
 */
export function TonightCard({
    checkIn,
    streak,
    did,
    doneTotal,
    openCount,
    rows,
    onOpen,
    onMood,
    memberId,
}: {
    checkIn?: CheckIn;
    streak: number;
    did: AgendaItem[];
    doneTotal: number;
    openCount: number;
    rows?: Array<{ memberId: string; name: string; checkIn?: CheckIn }>;
    onOpen: () => void;
    onMood: (mood: number) => void;
    memberId: string;
}) {
    const answered = rows?.filter((r) => r.checkIn).length ?? 0;
    return (
        <section className="rounded-xl bg-card p-4 md:p-5">
            <div className="mb-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <h2 className="font-display text-xl leading-6">Tonight</h2>
                <p className="min-w-0 flex-1 text-sm text-muted">
                    {checkIn ? moodLabel(checkIn.mood).toLowerCase() : "not checked in yet"}
                    {rows ? ` · ${answered} of ${rows.length} checked in` : ""}
                    {streak > 0 ? ` · ${streak} evening${streak === 1 ? "" : "s"} in a row` : ""}
                </p>
                <Link to={`/${memberId}/reflections`} className="shrink-0 text-sm font-semibold text-brand underline-offset-4 hover:underline">
                    All check-ins
                </Link>
            </div>

            {doneTotal > 0 && (
                <div className="mb-3 rounded-lg bg-page px-3.5 py-3">
                    <p className="text-sm font-semibold">
                        What we did — {doneTotal} finished
                        {openCount > 0 && (
                            <>
                                ,{" "}
                                <Link to="/today" className="font-semibold text-brand underline underline-offset-4">
                                    {openCount} left
                                </Link>
                            </>
                        )}
                    </p>
                    <ul className="mt-1 space-y-0.5 text-sm leading-5 text-muted">
                        {did.map((a) => (
                            <li key={`${a.moduleId}:${a.id}`} className="truncate line-through">
                                {a.title}
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {checkIn ? (
                <div className="rounded-lg bg-page px-3.5 py-3">
                    <div className="flex items-center gap-2">
                        <span className="text-2xl leading-none" aria-hidden="true">
                            {moodEmoji(checkIn.mood)}
                        </span>
                        <span className="text-md font-semibold">{moodLabel(checkIn.mood)}</span>
                        <Button variant="ghost" size="sm" className="ml-auto" onClick={onOpen}>
                            Update
                        </Button>
                    </div>
                    {checkIn.gratitude && <p className="mt-1 text-md leading-6">Grateful for {checkIn.gratitude}.</p>}
                    {checkIn.decisions.length > 0 && (
                        <ul className="mt-1 space-y-0.5 text-sm text-muted">
                            {checkIn.decisions.map((d) => (
                                <li key={d.taskId}>
                                    {d.title} — {uncapitalise(d.note)}
                                    {d.applied ? "" : " (recorded here only)"}
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            ) : (
                <div className="rounded-lg bg-page px-3.5 py-3">
                    <p className="text-md leading-6">How was today?</p>
                    <div className="mt-2">
                        <MoodHearts value={0} onChange={onMood} />
                    </div>
                    <button type="button" onClick={onOpen} className="mt-2 text-sm font-semibold text-brand underline underline-offset-4">
                        Or open the whole check-in
                    </button>
                </div>
            )}

            {rows && rows.length > 0 && (
                <ul className="mt-3 space-y-0.5">
                    {rows.map((r) => (
                        <li key={r.memberId} className="flex h-8 items-center gap-2.5">
                            <MemberAvatar memberId={r.memberId} size="xs" />
                            <span className="text-sm font-medium">{r.name}</span>
                            {r.checkIn ? (
                                <>
                                    <span className="text-md leading-none" aria-hidden="true">
                                        {moodEmoji(r.checkIn.mood)}
                                    </span>
                                    <span className="min-w-0 flex-1 truncate text-xs text-muted">{r.checkIn.gratitude ? `Grateful for ${r.checkIn.gratitude}` : moodLabel(r.checkIn.mood)}</span>
                                    <Link to={`/${r.memberId}/reflections`} className="shrink-0 text-xs font-semibold text-brand underline underline-offset-4">
                                        Read
                                    </Link>
                                </>
                            ) : (
                                <span className="min-w-0 flex-1 truncate text-xs text-caption">Not yet tonight</span>
                            )}
                        </li>
                    ))}
                </ul>
            )}
        </section>
    );
}

// ---------------------------------------------------------------------------
// 7. ON THIS DAY
// ---------------------------------------------------------------------------

/**
 * Two moments, the one with a photograph first — the page's only large image.
 * Never rendered empty: a blank warmth card is worse than no card at all, so
 * the caller omits the section entirely when there is nothing from this date.
 */
export function MomentsCard({ items, today }: { items: PeekMoment[]; today: string }) {
    if (!items.length) return null;
    return (
        <section className="rounded-xl bg-card p-4 md:p-5">
            <div className="mb-3 flex items-baseline gap-3">
                <h2 className="flex-1 font-display text-xl leading-6">On this day</h2>
                <Link to="/create/memories/timeline" className="text-sm font-semibold text-brand underline-offset-4 hover:underline">
                    Timeline
                </Link>
            </div>
            <ul className="grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-2">
                {items.map((m, idx) => {
                    const years = yearsSince(m.date, today);
                    return (
                        <li key={m.id} className={cn(idx > 0 && "max-sm:hidden")}>
                            <Link to={m.href} className="flex h-full flex-col overflow-hidden rounded-lg bg-page transition-shadow hover:shadow-hover">
                                {m.photoUrl && <img src={m.photoUrl} alt="" width={400} height={220} loading="lazy" className="h-28 w-full object-cover" />}
                                <span className="flex flex-1 flex-col p-3.5">
                                    <span className="text-2xs font-semibold uppercase tracking-[0.08em] text-caption">
                                        {years} year{years === 1 ? "" : "s"} ago
                                    </span>
                                    <span className="mt-1 text-md font-semibold leading-5">{m.title}</span>
                                    {m.body && <span className="clamp-2 mt-1 text-sm leading-5 text-muted">{m.body}</span>}
                                </span>
                            </Link>
                        </li>
                    );
                })}
            </ul>
            {items.length > 1 && (
                <Overflow className="mt-2 sm:hidden" to="/create/memories/timeline" cta="see the timeline">
                    More from this date —
                </Overflow>
            )}
        </section>
    );
}

// ---------------------------------------------------------------------------
// Children's pieces
// ---------------------------------------------------------------------------

/** The memory verse, at a size a child can read across a kitchen table. */
export function VerseCard({ verse, big, onRead }: { verse: PeekVerse | null; big: boolean; onRead: () => void }) {
    if (!verse) {
        return (
            <section className="rounded-xl bg-grow-soft p-4 md:p-5">
                <NextAction line="No verse is set for this week yet." to="/grow/bible" cta="Open the Bible" />
            </section>
        );
    }
    return (
        <section className="rounded-xl bg-grow-soft p-4 md:p-5">
            <blockquote>
                <p className={cn("font-display", big ? "text-3xl leading-9" : "text-[19px] leading-8")}>&ldquo;{verse.text}&rdquo;</p>
                <cite className="mt-2 block text-sm font-semibold not-italic text-muted">{verse.reference}</cite>
            </blockquote>
            <div className="mt-3 flex flex-wrap gap-2">
                <Button variant="outline" size="md" onClick={onRead}>
                    Read it to me
                </Button>
                {!big && (
                    <Link to="/grow/bible" className="inline-flex h-9 items-center rounded-full bg-brand px-4 text-sm font-semibold text-white">
                        Practise
                    </Link>
                )}
            </div>
        </section>
    );
}

const STAGES = [
    { at: 0, emoji: "🌱", label: "seed" },
    { at: 50, emoji: "🌿", label: "sprout" },
    { at: 100, emoji: "🍃", label: "leaf" },
    { at: 150, emoji: "🌸", label: "bloom" },
    { at: 200, emoji: "🌳", label: "tree" },
];

/** My Garden — Sprouts, the sprig they have grown, and what is next. */
export function GardenCard({ points }: { points: number }) {
    const stage = [...STAGES].reverse().find((s) => points >= s.at) ?? STAGES[0];
    const next = STAGES.find((s) => s.at > points);
    return (
        <Link to="/execute/tasks" className="flex items-center gap-4 rounded-xl bg-grow-soft p-4 transition-shadow hover:shadow-hover md:p-5">
            <span className="text-[44px] leading-none" aria-hidden="true">
                {stage.emoji}
            </span>
            <span className="min-w-0">
                <span className="block font-display text-2xl leading-7">My Garden</span>
                <span className="block text-base text-muted">
                    {points} Sprouts · a {stage.label}
                    {next ? ` · ${next.at - points} to your next ${next.label}` : " — fully grown"}
                </span>
            </span>
        </Link>
    );
}
