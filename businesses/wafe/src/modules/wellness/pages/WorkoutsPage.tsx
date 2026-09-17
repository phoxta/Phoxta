import { useMemo, useState, type FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import { CalendarDays, Check, Dumbbell, Play, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/cn";
import { Confirm, MemberAvatar, MemberPicker, Notice, PageTitle, Section } from "@/components/shared";
import { Dialog } from "@/components/ui/overlay";
import { Button, Card, EmptyState, Field, IconButton, ProgressBar, Skeleton, Tag } from "@/components/ui/primitives";
import { dayLabel, dayNumber, isWorkoutDone, logForWorkout, planProgress, recentLogs, shiftDay, upcomingWorkouts, workoutMinutes } from "../derive";
import { WORKOUT_TEMPLATES } from "../templates";
import type { Workout, WorkoutPlan, WorkoutTemplate, WellnessRepo, WellnessState } from "../types";
import { FEEL_LABEL } from "../types";
import { FocusTag } from "../components/pieces";
import { useWellness } from "../components/useWellness";

/**
 * Workouts: the named catalogue, the plans running from it, and — the part
 * that makes a plan real — a SCHEDULE. Starting "Couch to 5k" writes dated
 * sessions, so the next fortnight is a list of days with something on them
 * rather than a promise, and the same rows are what a calendar overlays.
 */

export default function WorkoutsPage() {
    const { state, loading, error, sp, child, run, logWorkout } = useWellness();
    const [params, setParams] = useSearchParams();
    const [starting, setStarting] = useState<WorkoutTemplate | null>(null);
    const [logging, setLogging] = useState<Workout | null>(null);
    const [removingPlan, setRemovingPlan] = useState<WorkoutPlan | null>(null);
    const [addingOwn, setAddingOwn] = useState(false);

    const focusPlan = params.get("plan");
    const focusWorkout = params.get("workout");

    const templates = useMemo(() => (child ? WORKOUT_TEMPLATES.filter((t) => t.band === "child" || t.band === "family") : WORKOUT_TEMPLATES), [child]);

    if (loading) return <Skeleton className="h-96" />;
    if (error) return <Notice tone="danger">{error}</Notice>;
    if (!state?.visible) return <EmptyState title="Nothing here for you" body="Training plans belong to the people who live here." />;

    const today = sp.today;
    const upcoming = upcomingWorkouts(state, today, 14, child ? sp.me.id : undefined);
    const byDate = new Map<string, Workout[]>();
    for (const w of upcoming) byDate.set(w.date, [...(byDate.get(w.date) ?? []), w]);
    const minutes = workoutMinutes(state, sp.me.id, shiftDay(today, -6), today);
    const logs = recentLogs(state, child ? sp.me.id : undefined, 8);

    const clearFocus = () => {
        const next = new URLSearchParams(params);
        next.delete("plan");
        next.delete("workout");
        setParams(next, { replace: true });
    };

    return (
        <div>
            <PageTitle
                title="Workouts"
                sub="Start a routine and it puts real sessions on real dates. Log what you did and how it felt — that is the whole record."
                area="live"
                actions={
                    <Button variant="outline" onClick={() => setAddingOwn(true)}>
                        <Plus size={16} aria-hidden="true" /> One-off session
                    </Button>
                }
            />

            <div className="mb-8 grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-3">
                <Card>
                    <p className="text-xs font-medium uppercase tracking-[0.06em] text-muted">Your last seven days</p>
                    <p className="mt-1 font-display text-5xl leading-8">{minutes} min</p>
                </Card>
                <Card>
                    <p className="text-xs font-medium uppercase tracking-[0.06em] text-muted">Plans running</p>
                    <p className="mt-1 font-display text-5xl leading-8">{state.plans.filter((p) => p.active).length}</p>
                </Card>
                <Card>
                    <p className="text-xs font-medium uppercase tracking-[0.06em] text-muted">Next fortnight</p>
                    <p className="mt-1 font-display text-5xl leading-8">{upcoming.length} sessions</p>
                </Card>
            </div>

            {/* -- The schedule ------------------------------------------------ */}
            <Section title="The schedule" action={<span className="text-xs text-caption">Next fourteen days</span>}>
                {byDate.size === 0 ? (
                    <EmptyState icon={<CalendarDays size={20} aria-hidden="true" />} title="Nothing on the calendar" body="Start one of the routines below and its sessions land on dates you can plan around." />
                ) : (
                    <ul className="flex flex-col gap-2">
                        {[...byDate.entries()].map(([date, items]) => (
                            <li key={date} className="rounded-xl bg-card p-3">
                                <p className="mb-2 px-1 text-sm font-semibold">
                                    {dayLabel(date)} <span className="font-normal text-caption">{date === today ? "· today" : `· ${dayNumber(date)}`}</span>
                                </p>
                                <ul className="flex flex-col gap-1.5">
                                    {items.map((wk) => {
                                        const done = isWorkoutDone(state, wk.id);
                                        const record = logForWorkout(state, wk.id);
                                        return (
                                            <li key={wk.id} className={cn("flex flex-wrap items-center gap-2.5 rounded-md bg-page px-3 py-2.5", focusWorkout === wk.id && "outline-2 outline-brand")}>
                                                <MemberAvatar memberId={wk.memberId} size="xs" />
                                                <span className="min-w-0 flex-1">
                                                    <span className={cn("block truncate text-md font-medium", done && "text-muted")}>{wk.title}</span>
                                                    <span className="block text-xs text-caption">
                                                        {wk.durationMin} min · week {wk.week}
                                                        {record ? ` · logged ${record.durationMin} min, ${FEEL_LABEL[record.feel].toLowerCase()}` : ""}
                                                    </span>
                                                </span>
                                                <FocusTag focus={wk.focus} />
                                                <Button
                                                    size="sm"
                                                    variant={done ? "outline" : "brand"}
                                                    disabled={done}
                                                    onClick={() => {
                                                        clearFocus();
                                                        setLogging(wk);
                                                    }}
                                                >
                                                    {done ? <Check size={13} aria-hidden="true" /> : <Play size={13} aria-hidden="true" />} {done ? "Done" : "Log it"}
                                                </Button>
                                            </li>
                                        );
                                    })}
                                </ul>
                            </li>
                        ))}
                    </ul>
                )}
            </Section>

            {/* -- Plans -------------------------------------------------------- */}
            <Section title="Plans running">
                {state.plans.length === 0 ? (
                    <EmptyState icon={<Dumbbell size={20} aria-hidden="true" />} title="No plan yet" body="Pick a routine below. Eight weeks of strength, nine of running, or ten minutes that gets a nine-year-old off the sofa." />
                ) : (
                    <ul className="grid grid-cols-[minmax(0,1fr)] gap-3 lg:grid-cols-2">
                        {state.plans.map((plan) => {
                            const pr = planProgress(state, plan, today);
                            return (
                                <li key={plan.id}>
                                    <Card className={cn("h-full", focusPlan === plan.id && "outline-2 outline-brand")}>
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0">
                                                <h3 className="font-display text-2xl leading-7">{plan.name}</h3>
                                                <p className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-caption">
                                                    <MemberAvatar memberId={plan.memberId} size="xs" />
                                                    <span>
                                                        Week {pr.week} of {plan.weeks} · started {dayNumber(plan.startDate)}
                                                    </span>
                                                </p>
                                            </div>
                                            <IconButton label={`Remove ${plan.name}`} size="sm" onClick={() => setRemovingPlan(plan)}>
                                                <Trash2 size={13} aria-hidden="true" />
                                            </IconButton>
                                        </div>
                                        <div className="mt-3 flex flex-wrap items-center gap-2">
                                            <FocusTag focus={plan.focus} />
                                            {plan.goalLabel && <Tag tone="grow">{plan.goalLabel}</Tag>}
                                        </div>
                                        <p className="mt-3 text-sm tabular-nums text-muted">
                                            {pr.done} of {pr.total} sessions logged
                                        </p>
                                        <ProgressBar value={pr.pct} className="mt-2" label={plan.name} />
                                        {plan.note && <p className="mt-2 text-xs leading-4 text-caption">{plan.note}</p>}
                                    </Card>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </Section>

            {/* -- The catalogue ------------------------------------------------ */}
            <Section title="Routines to start">
                <ul className="grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {templates.map((t) => (
                        <li key={t.id}>
                            <div className="flex h-full flex-col overflow-hidden rounded-xl bg-card">
                                <img src={t.imageUrl} alt="" width={480} height={220} loading="lazy" className="h-32 w-full object-cover" />
                                <div className="flex flex-1 flex-col p-4">
                                    <div className="mb-2 flex items-center gap-2">
                                        <FocusTag focus={t.focus} />
                                        <span className="text-xs text-caption">{t.weeks} weeks · {t.sessions.length}×/week</span>
                                    </div>
                                    <h3 className="text-lg font-semibold leading-5">{t.name}</h3>
                                    <p className="mt-1.5 flex-1 text-sm leading-5 text-muted">{t.blurb}</p>
                                    <Button className="mt-3" variant="outline" size="md" onClick={() => setStarting(t)}>
                                        <Play size={14} aria-hidden="true" /> Start this
                                    </Button>
                                </div>
                            </div>
                        </li>
                    ))}
                </ul>
            </Section>

            {/* -- What has been done ------------------------------------------- */}
            {logs.length > 0 && (
                <Section title="Recently logged">
                    <ul className="divide-y divide-line rounded-xl bg-card">
                        {logs.map((l) => (
                            <li key={l.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                                <MemberAvatar memberId={l.memberId} size="xs" />
                                <span className="min-w-0 flex-1">
                                    <span className="block truncate text-md font-medium">{l.title}</span>
                                    <span className="block text-xs text-caption">
                                        {dayLabel(l.date)} {dayNumber(l.date)} · {l.durationMin} min · {FEEL_LABEL[l.feel]}
                                        {l.notes ? ` · ${l.notes}` : ""}
                                    </span>
                                </span>
                            </li>
                        ))}
                    </ul>
                </Section>
            )}

            {starting && <StartDialog template={starting} meId={sp.me.id} canPickMember={!child} today={today} onClose={() => setStarting(null)} run={run} />}
            {logging && <LogDialog workout={logging} state={state} onClose={() => setLogging(null)} onSave={(input) => logWorkout(logging.id, input)} />}
            {addingOwn && <OneOffDialog meId={sp.me.id} canPickMember={!child} today={today} onClose={() => setAddingOwn(false)} run={run} />}

            <Confirm
                open={Boolean(removingPlan)}
                title="Remove this plan?"
                body={removingPlan ? `"${removingPlan.name}" and every session it scheduled come off the calendar. What you have already logged for it goes too.` : undefined}
                confirmLabel="Remove it"
                danger
                onConfirm={async () => {
                    if (removingPlan) await run((r) => r.removePlan(removingPlan.id), "Removed");
                }}
                onClose={() => setRemovingPlan(null)}
            />
        </div>
    );
}

function StartDialog({
    template,
    meId,
    canPickMember,
    today,
    onClose,
    run,
}: {
    template: WorkoutTemplate;
    meId: string;
    canPickMember: boolean;
    today: string;
    onClose: () => void;
    run: (fn: (r: WellnessRepo) => Promise<unknown>, ok?: string) => Promise<boolean>;
}) {
    const [memberId, setMemberId] = useState<string | null>(template.band === "family" ? null : meId);
    const [weeks, setWeeks] = useState(String(template.weeks));
    const [startDate, setStartDate] = useState(today);
    const [goalLabel, setGoalLabel] = useState("");
    const [busy, setBusy] = useState(false);

    const submit = async (e: FormEvent) => {
        e.preventDefault();
        setBusy(true);
        const ok = await run((r) => r.startPlan(template.id, { memberId, startDate, weeks: Number(weeks) || template.weeks, goalLabel }), `${template.name} started`);
        setBusy(false);
        if (ok) onClose();
    };

    return (
        <Dialog open onClose={onClose} title={template.name} wide>
            <form onSubmit={submit}>
                <p className="text-md leading-6 text-muted">{template.blurb}</p>

                <ul className="mt-4 flex flex-col gap-2">
                    {template.sessions.map((session, i) => (
                        <li key={i} className="rounded-md bg-page px-3 py-2.5">
                            <p className="text-md font-semibold">
                                {session.title} <span className="font-normal text-caption">· {session.durationMin} min</span>
                            </p>
                            <p className="mt-1 text-xs leading-5 text-muted">
                                {session.exercises.map((x) => `${x.name}${x.sets ? ` ${x.sets}×${x.reps}` : x.minutes ? ` ${x.minutes} min` : ""}`).join(" · ")}
                            </p>
                        </li>
                    ))}
                </ul>

                {canPickMember && <MemberPicker value={memberId} onChange={setMemberId} allowFamily roles={["parent", "child"]} label="Who is doing it" className="mt-4" />}

                <div className="mt-4 grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-2">
                    <label className="block">
                        <span className="mb-1.5 block text-xs font-medium tracking-[0.06em] text-muted uppercase">Starting</span>
                        <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="h-[46px] w-full rounded-md border border-line-strong bg-card px-3 text-md outline-none focus:border-brand" />
                    </label>
                    <Field label="For how many weeks" value={weeks} onChange={(e) => setWeeks(e.target.value)} inputMode="numeric" />
                </div>

                <Field label="Towards which goal" value={goalLabel} onChange={(e) => setGoalLabel(e.target.value)} placeholder="Ride to Brighton in June" className="mt-4" hint="Optional. It shows on the plan so the sessions have a reason." />

                <div className="mt-5 flex justify-end gap-2">
                    <Button variant="ghost" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button type="submit" loading={busy}>
                        Start it
                    </Button>
                </div>
            </form>
        </Dialog>
    );
}

function LogDialog({ workout, state, onClose, onSave }: { workout: Workout; state: WellnessState; onClose: () => void; onSave: (input: { durationMin: number; sets: string[]; feel: "easy" | "good" | "tough"; notes: string; date: string }) => Promise<boolean> }) {
    const existing = logForWorkout(state, workout.id);
    const [durationMin, setDurationMin] = useState(String(existing?.durationMin ?? workout.durationMin));
    const [feel, setFeel] = useState<"easy" | "good" | "tough">(existing?.feel ?? "good");
    const [notes, setNotes] = useState(existing?.notes ?? "");
    const [sets, setSets] = useState<string[]>(existing?.sets.length ? existing.sets : workout.exercises.map((x) => `${x.name}${x.sets ? ` ${x.sets}×${x.reps}` : ""}`));
    const [busy, setBusy] = useState(false);

    const submit = async (e: FormEvent) => {
        e.preventDefault();
        setBusy(true);
        const ok = await onSave({ durationMin: Number(durationMin) || workout.durationMin, sets: sets.filter((x) => x.trim()), feel, notes, date: workout.date });
        setBusy(false);
        if (ok) onClose();
    };

    return (
        <Dialog open onClose={onClose} title={workout.title} wide>
            <form onSubmit={submit}>
                <p className="text-sm text-caption">
                    {dayLabel(workout.date)} {dayNumber(workout.date)} · planned {workout.durationMin} min
                </p>

                <Field label="How long it took (min)" value={durationMin} onChange={(e) => setDurationMin(e.target.value)} inputMode="numeric" className="mt-4" />

                <fieldset className="mt-4">
                    <legend className="mb-1.5 text-xs font-medium uppercase tracking-[0.06em] text-muted">How it felt</legend>
                    <div className="flex gap-2">
                        {(["easy", "good", "tough"] as const).map((f) => (
                            <button
                                key={f}
                                type="button"
                                aria-pressed={feel === f}
                                onClick={() => setFeel(f)}
                                className={cn("h-10 flex-1 rounded-sm border text-sm font-medium", feel === f ? "border-brand bg-brand-soft text-brand-ink" : "border-line-strong text-muted hover:text-ink")}
                            >
                                {FEEL_LABEL[f]}
                            </button>
                        ))}
                    </div>
                </fieldset>

                {sets.length > 0 && (
                    <div className="mt-4">
                        <span className="mb-1.5 block text-xs font-medium uppercase tracking-[0.06em] text-muted">What you actually did</span>
                        <ul className="flex flex-col gap-2">
                            {sets.map((line, i) => (
                                <li key={i}>
                                    <input
                                        value={line}
                                        onChange={(e) => setSets(sets.map((x, j) => (j === i ? e.target.value : x)))}
                                        aria-label={`Set ${i + 1}`}
                                        className="h-10 w-full rounded-sm border border-line-strong bg-card px-3 text-md outline-none focus:border-brand"
                                    />
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                <Field label="Anything worth remembering" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Six up Church Way. Regretted the sixth." className="mt-4" />

                <div className="mt-5 flex justify-end gap-2">
                    <Button variant="ghost" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button type="submit" loading={busy}>
                        <Check size={15} aria-hidden="true" /> Log it
                    </Button>
                </div>
            </form>
        </Dialog>
    );
}

function OneOffDialog({ meId, canPickMember, today, onClose, run }: { meId: string; canPickMember: boolean; today: string; onClose: () => void; run: (fn: (r: WellnessRepo) => Promise<unknown>, ok?: string) => Promise<boolean> }) {
    const [memberId, setMemberId] = useState<string | null>(meId);
    const [title, setTitle] = useState("");
    const [date, setDate] = useState(today);
    const [durationMin, setDurationMin] = useState("30");
    const [busy, setBusy] = useState(false);

    const submit = async (e: FormEvent) => {
        e.preventDefault();
        if (!title.trim()) return;
        setBusy(true);
        const ok = await run((r) => r.addWorkout({ memberId, date, title, durationMin: Number(durationMin) || 30, focus: "cardio" }), "On the schedule");
        setBusy(false);
        if (ok) onClose();
    };

    return (
        <Dialog open onClose={onClose} title="A one-off session">
            <form onSubmit={submit}>
                <Field label="What is it" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Swim at Croydon Sports Arena" />
                {canPickMember && <MemberPicker value={memberId} onChange={setMemberId} allowFamily roles={["parent", "child"]} label="Who" className="mt-4" />}
                <div className="mt-4 grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-2">
                    <label className="block">
                        <span className="mb-1.5 block text-xs font-medium tracking-[0.06em] text-muted uppercase">When</span>
                        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-[46px] w-full rounded-md border border-line-strong bg-card px-3 text-md outline-none focus:border-brand" />
                    </label>
                    <Field label="Minutes" value={durationMin} onChange={(e) => setDurationMin(e.target.value)} inputMode="numeric" />
                </div>
                <div className="mt-5 flex justify-end gap-2">
                    <Button variant="ghost" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button type="submit" loading={busy} disabled={!title.trim()}>
                        <Plus size={15} aria-hidden="true" /> Add it
                    </Button>
                </div>
            </form>
        </Dialog>
    );
}
