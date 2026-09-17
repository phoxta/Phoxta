import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Activity, CalendarDays, Check, Dumbbell, Flag, HeartPulse, ShoppingBasket, Sparkles, Stethoscope, Trophy, Utensils } from "lucide-react";
import { cn } from "@/lib/cn";
import { Confirm, MemberAvatar, Notice, PageTitle, Points, Section, Stat } from "@/components/shared";
import { Ring } from "@/components/ui/charts";
import { Button, Card, EmptyState, ProgressBar, Skeleton, Tag } from "@/components/ui/primitives";
import {
    BASE,
    challengePct,
    dayLabel,
    dayNumber,
    dinnerOn,
    habitEmoji,
    habitStats,
    habitsFor,
    isKept,
    isRestDay,
    isWorkoutDone,
    liveChallenges,
    closableChallenges,
    goalPct,
    planForWeek,
    recipeById,
    standings,
    targetLabel,
    upcomingWorkouts,
    weekOf,
    weekScore,
    workoutsOn,
} from "../derive";
import type { Challenge, Habit, WellnessState } from "../types";
import { METRIC_LABEL } from "../types";
import { Celebration, StreakStrip } from "../components/pieces";
import { useWellness } from "../components/useWellness";

/**
 * The overview: what my body owes today, what the family is keeping, what is
 * for dinner and which challenge is running.
 *
 * It is also where the dashboards' one-tap cards land (AC 5): a child taps
 * "Read for twenty minutes" on their own dashboard, arrives here with
 * `?tap=<habit>`, and the habit is already ticked and the Sprouts already
 * credited by the time the page paints.
 */

const DOORS = [
    { to: `${BASE}/habits`, label: "Habits", body: "Streaks, rest days and the weekly freeze.", icon: Activity, cap: "any" as const },
    { to: `${BASE}/workouts`, label: "Workouts", body: "Routines, the schedule and what you have logged.", icon: Dumbbell, cap: "any" as const },
    { to: `${BASE}/meals`, label: "Meals", body: "The week's plan, the cook rota and our recipes.", icon: Utensils, cap: "any" as const },
    { to: `${BASE}/grocery`, label: "The shop", body: "Priced against the food envelope.", icon: ShoppingBasket, cap: "parent" as const },
    { to: `${BASE}/health`, label: "Health notes", body: "Allergies, medicines, appointments, growth.", icon: Stethoscope, cap: "parent" as const },
    { to: `${BASE}/planning`, label: "Sunday planning", body: "Next week's meals and the shop, in one screen.", icon: CalendarDays, cap: "parent" as const },
];

export default function WellnessPage() {
    const w = useWellness();
    const { state, loading, error, sp, child, run, logHabit, logWorkout, closeChallenge, celebration, clearCelebration } = w;
    const [params, setParams] = useSearchParams();
    const [closing, setClosing] = useState<Challenge | null>(null);
    const handled = useRef<Set<string>>(new Set());

    const tap = params.get("tap");
    const tapWorkout = params.get("tapWorkout");

    // The one-tap path. Guarded by a ref so a re-render never logs twice, and
    // the query string is cleared the moment it has been acted on.
    useEffect(() => {
        if (loading || !state?.visible) return;
        const key = `${tap ?? ""}|${tapWorkout ?? ""}`;
        if (key === "|" || handled.current.has(key)) return;
        handled.current.add(key);
        const habit = tap ? state.habits.find((h) => h.id === tap) : undefined;
        const workout = tapWorkout ? state.workouts.find((x) => x.id === tapWorkout) : undefined;
        void (async () => {
            if (habit && !isKept(state, habit, sp.today)) await logHabit(habit);
            if (workout && !isWorkoutDone(state, workout.id)) await logWorkout(workout.id, { durationMin: workout.durationMin });
            const next = new URLSearchParams(params);
            next.delete("tap");
            next.delete("tapWorkout");
            setParams(next, { replace: true });
        })();
        // The ref is the guard; re-running on every param object would re-log.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [loading, state, tap, tapWorkout]);

    if (loading) return <Skeleton className="h-96" />;
    if (error) return <Notice tone="danger">{error}</Notice>;
    if (!state?.visible) {
        return (
            <div>
                <PageTitle title="Health, habits, fitness & food" area="live" />
                <EmptyState icon={<HeartPulse size={20} aria-hidden="true" />} title="This one is just for the family" body="Habits, health and what is on the table are not things we share with guests." />
            </div>
        );
    }

    const today = sp.today;
    const mine = habitsFor(state, sp.me.id);
    const dueToday = mine.filter((h) => !isRestDay(h, today));
    const restingToday = mine.filter((h) => isRestDay(h, today));
    const myWeek = weekScore(state, sp.me.id, today);
    const myWorkouts = workoutsOn(state, today, sp.me.id);
    const dinner = dinnerOn(state, today);
    const dinnerRecipe = recipeById(state, dinner?.recipeId ?? null);
    const running = liveChallenges(state, today);
    const closable = closableChallenges(state, today);
    const plan = planForWeek(state, weekOf(today));
    const household = sp.members.filter((m) => m.role !== "guest");
    const nextSessions = upcomingWorkouts(state, today, 10, child ? sp.me.id : undefined).slice(0, 5);

    return (
        <div>
            {celebration && <Celebration sprouts={celebration.sprouts} title={celebration.title} streak={celebration.streak} onDone={clearCelebration} />}

            <PageTitle
                title={child ? "Your body, your day" : "Health, habits, fitness & food"}
                sub={child ? "Tick off what you have done. Rest days are meant to be rested." : "Habits that rest on purpose, sessions on real dates, and the week's food priced before it is bought."}
                area="live"
                actions={
                    !child && (
                        <>
                            <Link to={`${BASE}/planning`} className="inline-flex h-11 items-center gap-2 rounded-full border border-line-strong bg-card px-5 text-md font-semibold hover:border-ink">
                                <CalendarDays size={16} aria-hidden="true" /> Sunday planning
                            </Link>
                            <Link to={`${BASE}/habits`} className="inline-flex h-11 items-center gap-2 rounded-full bg-brand px-5 text-md font-semibold text-white hover:bg-brand-hover">
                                <Activity size={16} aria-hidden="true" /> Habits
                            </Link>
                        </>
                    )
                }
            />

            {/* -- Today ------------------------------------------------------ */}
            <Section title={child ? "Today" : "What you owe today"} action={<span className="text-xs text-caption">{dayLabel(today)} {dayNumber(today)}</span>}>
                {dueToday.length === 0 && restingToday.length === 0 ? (
                    <EmptyState
                        icon={<Activity size={20} aria-hidden="true" />}
                        title="No habits of your own yet"
                        body="A habit is one small thing you want to be true of you. Start with water, sleep or twenty minutes of reading."
                        action={
                            <Link to={`${BASE}/habits`} className="inline-flex h-11 items-center gap-2 rounded-full bg-brand px-5 text-md font-semibold text-white hover:bg-brand-hover">
                                Set one up
                            </Link>
                        }
                    />
                ) : (
                    <ul className={cn("grid gap-3", child ? "grid-cols-[minmax(0,1fr)] sm:grid-cols-2" : "grid-cols-[minmax(0,1fr)] sm:grid-cols-2 xl:grid-cols-3")}>
                        {dueToday.map((h) => (
                            <TodayHabit key={h.id} habit={h} today={today} state={state} child={child} onLog={() => void logHabit(h)} />
                        ))}
                        {restingToday.map((h) => (
                            <li key={h.id} className="rounded-xl border border-dashed border-line-strong px-4 py-3.5">
                                <p className="text-base font-semibold">
                                    <span aria-hidden="true">🌙</span> {h.name}
                                </p>
                                <p className="mt-0.5 text-sm text-muted">Resting today — the streak keeps going.</p>
                            </li>
                        ))}
                    </ul>
                )}
            </Section>

            {/* -- Sessions and dinner ----------------------------------------- */}
            <div className="mb-8 grid grid-cols-[minmax(0,1fr)] gap-3 lg:grid-cols-2">
                <Card className="flex flex-col">
                    <h2 className="mb-3 font-display text-2xl leading-7">{child ? "Moving today" : "Your sessions"}</h2>
                    {myWorkouts.length === 0 && nextSessions.length === 0 ? (
                        <p className="text-md text-muted">
                            Nothing scheduled.{" "}
                            <Link to={`${BASE}/workouts`} className="font-semibold text-brand underline underline-offset-2">
                                Start a routine
                            </Link>{" "}
                            and it will put sessions on real dates.
                        </p>
                    ) : (
                        <ul className="flex flex-col gap-2">
                            {myWorkouts.map((x) => {
                                const done = isWorkoutDone(state, x.id);
                                return (
                                    <li key={x.id} className="flex items-center gap-3 rounded-md bg-page px-3 py-2.5">
                                        <span className="min-w-0 flex-1">
                                            <span className="block truncate text-md font-medium">{x.title}</span>
                                            <span className="block text-xs text-caption">Today · {x.durationMin} min</span>
                                        </span>
                                        <Button size="sm" variant={done ? "outline" : "brand"} disabled={done} onClick={() => void logWorkout(x.id, { durationMin: x.durationMin })}>
                                            {done ? "Done" : "I did it"}
                                        </Button>
                                    </li>
                                );
                            })}
                            {nextSessions
                                .filter((x) => x.date !== today)
                                .slice(0, 3)
                                .map((x) => (
                                    <li key={x.id} className="flex items-center gap-3 px-3 py-1.5">
                                        <span className="min-w-0 flex-1 truncate text-sm text-muted">{x.title}</span>
                                        <span className="shrink-0 text-xs text-caption">
                                            {dayLabel(x.date)} · {x.durationMin} min
                                        </span>
                                    </li>
                                ))}
                        </ul>
                    )}
                    <Link to={`${BASE}/workouts`} className="mt-3 text-sm font-semibold text-brand underline-offset-4 hover:underline">
                        The whole schedule
                    </Link>
                </Card>

                <Card className="flex flex-col">
                    <h2 className="mb-3 font-display text-2xl leading-7">Tonight&apos;s dinner</h2>
                    {dinner?.title ? (
                        <div className="flex gap-4">
                            {dinnerRecipe?.imageUrl && <img src={dinnerRecipe.imageUrl} alt="" width={96} height={96} loading="lazy" className="size-24 shrink-0 rounded-md object-cover" />}
                            <div className="min-w-0">
                                <p className="font-display text-3xl leading-7">{dinner.title}</p>
                                <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted">
                                    {dinner.cookMemberId ? (
                                        <span className="inline-flex items-center gap-1.5">
                                            <MemberAvatar memberId={dinner.cookMemberId} size="xs" showName /> is cooking
                                        </span>
                                    ) : (
                                        <span>Nobody&apos;s name on it yet</span>
                                    )}
                                    {dinnerRecipe && (
                                        <span>
                                            · {dinnerRecipe.minutes} min · serves {dinnerRecipe.servings}
                                        </span>
                                    )}
                                </p>
                                {dinner.note && <p className="mt-2 text-sm leading-5 text-muted">{dinner.note}</p>}
                            </div>
                        </div>
                    ) : (
                        <p className="text-md text-muted">Nothing down for tonight yet.</p>
                    )}
                    <Link to={`${BASE}/meals`} className="mt-auto pt-3 text-sm font-semibold text-brand underline-offset-4 hover:underline">
                        The week&apos;s meals
                    </Link>
                </Card>
            </div>

            {/* -- The family this week ---------------------------------------- */}
            {!child && (
                <Section title="The family this week" action={<Link to={`${BASE}/habits`} className="text-sm font-semibold text-brand underline-offset-4 hover:underline">All habits</Link>}>
                    <ul className="grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-2 xl:grid-cols-3">
                        {household.map((m) => {
                            const score = weekScore(state, m.id, today);
                            const habits = habitsFor(state, m.id);
                            const best = habits.map((h) => habitStats(state, h, today)).sort((a, b) => b.current - a.current)[0];
                            return (
                                <li key={m.id}>
                                    <Card className="flex h-full items-center gap-4">
                                        <Ring pct={score.pct} size={64} stroke={3} label={`${m.name}: ${score.pct}% of habits kept this week`}>
                                            <span className="text-sm font-semibold tabular-nums">{score.pct}%</span>
                                        </Ring>
                                        <div className="min-w-0 flex-1">
                                            <p className="flex items-center gap-2 text-base font-semibold">
                                                <MemberAvatar member={m} size="xs" /> {m.name.split(" ")[0]}
                                            </p>
                                            <p className="mt-0.5 text-xs text-muted">
                                                {habits.length} habit{habits.length === 1 ? "" : "s"} · {score.kept} of {score.expected} days kept
                                            </p>
                                            {best && best.current > 0 && (
                                                <p className="mt-1 text-xs text-caption">
                                                    Longest run: {best.current} days
                                                </p>
                                            )}
                                        </div>
                                    </Card>
                                </li>
                            );
                        })}
                    </ul>
                </Section>
            )}

            {/* -- Challenges --------------------------------------------------- */}
            <Section title="Family challenges">
                {running.length === 0 && closable.length === 0 ? (
                    <EmptyState icon={<Trophy size={20} aria-hidden="true" />} title="No challenge running" body="A week of something, together — steps, glasses of water, minutes outside. The children earn Sprouts when they reach it." />
                ) : (
                    <ul className="grid grid-cols-[minmax(0,1fr)] gap-3 lg:grid-cols-2">
                        {[...running, ...closable].map((c) => (
                            <ChallengeCard
                                key={c.id}
                                challenge={c}
                                state={state}
                                today={today}
                                meId={sp.me.id}
                                canClose={!child && !c.completedAt}
                                highlighted={params.get("challenge") === c.id}
                                onLog={(value) => void run((r) => r.logChallenge(c.id, sp.me.id, value), "Counted")}
                                onClose={() => setClosing(c)}
                            />
                        ))}
                    </ul>
                )}
            </Section>

            {/* -- Wellness goals ----------------------------------------------- */}
            {state.wellnessGoals.length > 0 && (
                <Section title="What we are working towards">
                    <ul className="grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-2 xl:grid-cols-3">
                        {state.wellnessGoals.map((g) => (
                            <li key={g.id}>
                                <Card className="h-full">
                                    <div className="flex items-start justify-between gap-2">
                                        <p className="text-base font-semibold leading-5">{g.name}</p>
                                        <MemberAvatar memberId={g.memberId} size="xs" />
                                    </div>
                                    {g.goalLabel && (
                                        <Tag tone="grow" className="mt-2">
                                            <Flag size={11} aria-hidden="true" /> {g.goalLabel}
                                        </Tag>
                                    )}
                                    <p className="mt-3 text-sm tabular-nums text-muted">
                                        {g.current} of {g.target} {g.unit}
                                        {g.dueDate ? ` · by ${dayNumber(g.dueDate)}` : ""}
                                    </p>
                                    <ProgressBar value={goalPct(g)} className="mt-2" label={g.name} />
                                    {g.note && <p className="mt-2 text-xs leading-4 text-caption">{g.note}</p>}
                                </Card>
                            </li>
                        ))}
                    </ul>
                </Section>
            )}

            {/* -- Numbers and doors -------------------------------------------- */}
            {!child && (
                <Section title="Where to go">
                    <div className="mb-3 grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-3">
                        <Stat label="Your week" value={`${myWeek.pct}%`} sub={`${myWeek.kept} of ${myWeek.expected} days kept`} tone="live" />
                        <Stat label="Sessions logged" value={state.workoutLogs.length} sub="Across every plan" />
                        <Stat label="This week's meals" value={plan ? `${state.slots.filter((s) => s.planId === plan.id && s.title).length}/21` : "0/21"} sub={plan ? "Named and rota'd" : "No plan yet"} />
                    </div>
                    <ul className="grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-2 xl:grid-cols-3">
                        {DOORS.filter((d) => d.cap === "any" || !child).map((d) => (
                            <li key={d.to}>
                                <Link to={d.to} className="flex h-full items-start gap-3 rounded-xl bg-card p-4 transition-shadow hover:shadow-hover">
                                    <span className="grid size-10 shrink-0 place-items-center rounded-full bg-live text-white">
                                        <d.icon size={18} strokeWidth={1.8} aria-hidden="true" />
                                    </span>
                                    <span className="min-w-0">
                                        <span className="block text-base font-semibold">{d.label}</span>
                                        <span className="mt-0.5 block text-sm leading-5 text-muted">{d.body}</span>
                                    </span>
                                </Link>
                            </li>
                        ))}
                    </ul>
                </Section>
            )}

            <Confirm
                open={Boolean(closing)}
                title="Close this challenge?"
                body={closing ? `Everyone who reached ${closing.target} ${METRIC_LABEL[closing.metric]} keeps their ${closing.sprouts} Sprouts, and the challenge stops counting.` : undefined}
                confirmLabel="Close it"
                onConfirm={async () => {
                    if (closing) await closeChallenge(closing);
                }}
                onClose={() => setClosing(null)}
            />
        </div>
    );
}

/** A single habit for today, sized for the member who is looking at it. */
function TodayHabit({ habit, today, state, child, onLog }: { habit: Habit; today: string; state: WellnessState; child: boolean; onLog: () => void }) {
    const stats = habitStats(state, habit, today);
    const done = stats.todayState === "kept";
    return (
        <li>
            <div className={cn("flex h-full flex-col rounded-xl bg-card p-4", done && "opacity-80")}>
                <div className="flex items-start gap-3">
                    <span className={cn("shrink-0 leading-none", child ? "text-7xl" : "text-3xl")} aria-hidden="true">
                        {habitEmoji(habit)}
                    </span>
                    <div className="min-w-0 flex-1">
                        <p className={cn("font-semibold leading-5", child ? "text-[17px]" : "text-base")}>{habit.name}</p>
                        <p className="mt-0.5 text-xs text-caption">
                            {targetLabel(habit)} · by {habit.checkinTime}
                            {habit.sprouts > 0 && <> · {habit.sprouts} Sprouts</>}
                        </p>
                    </div>
                    {stats.current > 0 && (
                        <span className="shrink-0 rounded-full bg-live-soft px-2 py-1 text-2xs font-semibold tabular-nums text-live-ink" title="Days running">
                            {stats.current}d
                        </span>
                    )}
                </div>
                <StreakStrip days={stats.strip.slice(-10)} className="mt-3" />
                <div className="mt-3 flex items-center gap-2">
                    <Button size={child ? "lg" : "md"} block variant={done ? "outline" : "brand"} disabled={done} onClick={onLog}>
                        {done ? (
                            <>
                                <Check size={15} aria-hidden="true" /> Done today
                            </>
                        ) : (
                            <>
                                <Sparkles size={15} aria-hidden="true" /> {habit.target > 1 ? `Log ${targetLabel(habit)}` : "Tick it off"}
                            </>
                        )}
                    </Button>
                </div>
            </div>
        </li>
    );
}

function ChallengeCard({
    challenge,
    state,
    today,
    meId,
    canClose,
    highlighted,
    onLog,
    onClose,
}: {
    challenge: Challenge;
    state: WellnessState;
    today: string;
    meId: string;
    canClose: boolean;
    highlighted: boolean;
    onLog: (value: number) => void;
    onClose: () => void;
}) {
    const [value, setValue] = useState("");
    const rows = standings(state, challenge);
    const finished = challenge.end <= today;
    return (
        <li>
            <Card className={cn("h-full", highlighted && "outline-2 outline-brand")} id={`challenge-${challenge.id}`}>
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <h3 className="font-display text-2xl leading-7">{challenge.name}</h3>
                        <p className="mt-0.5 text-xs text-caption">
                            {challenge.target.toLocaleString("en-GB")} {METRIC_LABEL[challenge.metric]} each · {dayNumber(challenge.start)} – {dayNumber(challenge.end)}
                        </p>
                    </div>
                    <Points n={challenge.sprouts} />
                </div>
                {challenge.blurb && <p className="mt-2 text-sm leading-5 text-muted">{challenge.blurb}</p>}

                <ProgressBar value={challengePct(state, challenge)} className="mt-3" label={`${challenge.name} overall`} />

                <ul className="mt-3 flex flex-col gap-1.5">
                    {rows.map((row) => (
                        <li key={row.memberId} className="flex items-center gap-2.5">
                            <MemberAvatar memberId={row.memberId} size="xs" />
                            <span className="min-w-0 flex-1">
                                <ProgressBar value={Math.min(100, row.pct)} label={`${row.memberId} progress`} />
                            </span>
                            <span className={cn("w-24 shrink-0 text-right text-xs tabular-nums", row.hit ? "font-semibold text-mint" : "text-caption")}>
                                {row.total.toLocaleString("en-GB")} {row.hit ? "✓" : ""}
                            </span>
                        </li>
                    ))}
                </ul>

                <div className="mt-4 flex flex-wrap items-end gap-2">
                    {challenge.memberIds.includes(meId) && !challenge.completedAt && (
                        <form
                            className="flex items-end gap-2"
                            onSubmit={(e) => {
                                e.preventDefault();
                                const n = Number(value);
                                if (!Number.isFinite(n) || n <= 0) return;
                                onLog(n);
                                setValue("");
                            }}
                        >
                            <label className="block">
                                <span className="mb-1 block text-2xs font-medium uppercase tracking-[0.06em] text-muted">Today&apos;s {METRIC_LABEL[challenge.metric]}</span>
                                <input
                                    value={value}
                                    onChange={(e) => setValue(e.target.value)}
                                    inputMode="numeric"
                                    placeholder="0"
                                    className="h-10 w-28 rounded-sm border border-line-strong bg-card px-3 text-md tabular-nums outline-none focus:border-brand"
                                />
                            </label>
                            <Button type="submit" size="md" variant="outline">
                                Count it
                            </Button>
                        </form>
                    )}
                    {canClose && (
                        <Button size="md" variant={finished ? "brand" : "ghost"} onClick={onClose} className="ml-auto">
                            <Trophy size={15} aria-hidden="true" /> {finished ? "Close and credit Sprouts" : "Close it early"}
                        </Button>
                    )}
                </div>
            </Card>
        </li>
    );
}
