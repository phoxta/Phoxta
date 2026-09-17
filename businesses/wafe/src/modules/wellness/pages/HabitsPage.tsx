import { useMemo, useState, type FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import { Check, Flame, Pencil, Plus, Snowflake, Trash2, Undo2 } from "lucide-react";
import { cn } from "@/lib/cn";
import { Confirm, MemberAvatar, MemberPicker, Notice, PageTitle, Points, Section } from "@/components/shared";
import { Dialog } from "@/components/ui/overlay";
import { Button, Card, EmptyState, Field, IconButton, Skeleton, Tag } from "@/components/ui/primitives";
import { dayNumber, habitEmoji, habitStats, habitsFor, isRestDay, targetLabel, weekScore } from "../derive";
import type { Habit, HabitKind, HabitStats, Weekday, WellnessRepo, WellnessState } from "../types";
import { HABIT_KIND_LABEL, WEEKDAY_LABEL } from "../types";
import { Celebration, StreakPill, StreakStrip, WeekMeter } from "../components/pieces";
import { useWellness } from "../components/useWellness";

/**
 * Habits, by the person they belong to.
 *
 * Everything the module promises about streaks is visible here: the fortnight
 * strip, the rest days drawn as a decision rather than a hole, the freeze that
 * can be spent once a week, and the "why" under the number — a streak that
 * survives a grace day is the point, not a bug (AC 2). A parent sees the
 * household; anyone else sees only their own row, because that is all the repo
 * hands them.
 */

const KINDS: HabitKind[] = ["water", "exercise", "sleep", "nutrition", "reading", "screens", "prayer", "custom"];
const DAYS: Weekday[] = [1, 2, 3, 4, 5, 6, 7];

export default function HabitsPage() {
    const { state, loading, error, sp, child, run, logHabit, undoHabit, celebration, clearCelebration } = useWellness();
    const [params, setParams] = useSearchParams();
    const [editing, setEditing] = useState<Habit | null>(null);
    const [adding, setAdding] = useState(false);
    const [removing, setRemoving] = useState<Habit | null>(null);
    const [freezing, setFreezing] = useState<{ habit: Habit; date: string } | null>(null);

    const focus = params.get("habit");
    const members = useMemo(() => sp.members.filter((m) => m.role !== "guest"), [sp.members]);

    if (loading) return <Skeleton className="h-96" />;
    if (error) return <Notice tone="danger">{error}</Notice>;
    if (!state?.visible) return <EmptyState title="Nothing here for you" body="Habits belong to the people who live here." />;

    const today = sp.today;
    const shown = child ? members.filter((m) => m.id === sp.me.id) : members;

    return (
        <div>
            {celebration && <Celebration sprouts={celebration.sprouts} title={celebration.title} streak={celebration.streak} onDone={clearCelebration} />}

            <PageTitle
                title="Habits"
                sub="One small thing, most days. Rest days are written into the habit, and every week carries a freeze — neither of them breaks a streak."
                area="live"
                actions={
                    <Button onClick={() => setAdding(true)}>
                        <Plus size={16} aria-hidden="true" /> New habit
                    </Button>
                }
            />

            {shown.map((member) => {
                const habits = habitsFor(state, member.id);
                const score = weekScore(state, member.id, today);
                if (!habits.length && member.id !== sp.me.id) return null;
                return (
                    <Section
                        key={member.id}
                        title={member.id === sp.me.id ? "Yours" : member.name.split(" ")[0]}
                        action={
                            <span className="flex items-center gap-3">
                                <MemberAvatar member={member} size="xs" />
                                <span className="text-xs tabular-nums text-caption">
                                    {score.kept}/{score.expected} this week
                                </span>
                            </span>
                        }
                    >
                        {habits.length === 0 ? (
                            <EmptyState
                                title={member.id === sp.me.id ? "No habits of your own yet" : `Nothing set up for ${member.name.split(" ")[0]}`}
                                body="Water, sleep, twenty minutes of reading, a screen-free evening. Start with one."
                                action={<Button onClick={() => setAdding(true)}>Set one up</Button>}
                            />
                        ) : (
                            <ul className="grid grid-cols-[minmax(0,1fr)] gap-3 lg:grid-cols-2">
                                {habits.map((habit) => (
                                    <HabitRow
                                        key={habit.id}
                                        habit={habit}
                                        state={state}
                                        today={today}
                                        highlighted={focus === habit.id}
                                        onLog={(value, date) => void logHabit(habit, value, date)}
                                        onUndo={(date) => void undoHabit(habit, date)}
                                        onFreeze={(date) => setFreezing({ habit, date })}
                                        onEdit={() => setEditing(habit)}
                                        onRemove={() => setRemoving(habit)}
                                        onClearFocus={() => {
                                            const next = new URLSearchParams(params);
                                            next.delete("habit");
                                            setParams(next, { replace: true });
                                        }}
                                    />
                                ))}
                            </ul>
                        )}
                    </Section>
                );
            })}

            {(adding || editing) && (
                <HabitDialog
                    habit={editing}
                    members={members}
                    meId={sp.me.id}
                    canPickMember={!child}
                    onClose={() => {
                        setAdding(false);
                        setEditing(null);
                    }}
                    run={run}
                />
            )}

            <Confirm
                open={Boolean(removing)}
                title="Delete this habit?"
                body={removing ? `"${removing.name}" and its record go with it. The streak cannot be recovered.` : undefined}
                confirmLabel="Delete it"
                danger
                onConfirm={async () => {
                    if (removing) await run((r) => r.removeHabit(removing.id), "Deleted");
                }}
                onClose={() => setRemoving(null)}
            />

            <Confirm
                open={Boolean(freezing)}
                title="Use this week's freeze?"
                body={freezing ? `${dayNumber(freezing.date)} stops counting for "${freezing.habit.name}" — the streak walks over it. One freeze a week, and this is it.` : undefined}
                confirmLabel="Freeze that day"
                onConfirm={async () => {
                    if (freezing) await run((r) => r.useFreeze(freezing.habit.id, freezing.date, "Life happened"), "Frozen — the streak holds");
                }}
                onClose={() => setFreezing(null)}
            />
        </div>
    );
}

function HabitRow({
    habit,
    state,
    today,
    highlighted,
    onLog,
    onUndo,
    onFreeze,
    onEdit,
    onRemove,
    onClearFocus,
}: {
    habit: Habit;
    state: WellnessState;
    today: string;
    highlighted: boolean;
    onLog: (value?: number, date?: string) => void;
    onUndo: (date: string) => void;
    onFreeze: (date: string) => void;
    onEdit: () => void;
    onRemove: () => void;
    onClearFocus: () => void;
}) {
    const stats: HabitStats = habitStats(state, habit, today);
    const [amount, setAmount] = useState("");
    const rest = isRestDay(habit, today);
    const done = stats.todayState === "kept";

    return (
        <li>
            <Card className={cn("h-full", highlighted && "outline-2 outline-brand")}>
                <div className="flex items-start gap-3">
                    <span className="shrink-0 text-4xl leading-none" aria-hidden="true">
                        {habitEmoji(habit)}
                    </span>
                    <div className="min-w-0 flex-1">
                        <h3 className="text-lg font-semibold leading-5">{habit.name}</h3>
                        <p className="mt-0.5 text-xs text-caption">
                            {HABIT_KIND_LABEL[habit.kind]} · {targetLabel(habit)} · by {habit.checkinTime}
                        </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                        <IconButton label={`Edit ${habit.name}`} size="sm" onClick={onEdit}>
                            <Pencil size={13} aria-hidden="true" />
                        </IconButton>
                        <IconButton label={`Delete ${habit.name}`} size="sm" onClick={onRemove}>
                            <Trash2 size={13} aria-hidden="true" />
                        </IconButton>
                    </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                    <StreakPill stats={stats} />
                    {habit.graceDays.length > 0 && (
                        <Tag tone="neutral">Rests {habit.graceDays.map((d) => WEEKDAY_LABEL[d]).join(" · ")}</Tag>
                    )}
                    {habit.valueId && <Tag tone="grow">{habit.valueId}</Tag>}
                    {habit.sprouts > 0 && <Points n={habit.sprouts} />}
                </div>

                <StreakStrip
                    days={stats.strip}
                    className="mt-3"
                    onPick={(d) => {
                        onClearFocus();
                        if (d.rest || d.frozen) return;
                        if (d.kept) onUndo(d.date);
                        else onLog(undefined, d.date);
                    }}
                />
                <p className="mt-1.5 text-2xs text-caption">A fortnight, oldest first. Tap a day to change it. Hollow days are rest days.</p>

                <WeekMeter kept={stats.weekKept} expected={stats.weekExpected} pct={stats.weekPct} className="mt-3" />

                <div className="mt-4 flex flex-wrap items-end gap-2">
                    {rest ? (
                        <p className="text-sm font-medium text-muted">Resting today. Nothing owed, nothing lost.</p>
                    ) : done ? (
                        <Button variant="outline" size="md" onClick={() => onUndo(today)}>
                            <Undo2 size={14} aria-hidden="true" /> Undo today
                        </Button>
                    ) : habit.target > 1 ? (
                        <form
                            className="flex items-end gap-2"
                            onSubmit={(e) => {
                                e.preventDefault();
                                const n = Number(amount);
                                onLog(Number.isFinite(n) && n > 0 ? n : undefined);
                                setAmount("");
                            }}
                        >
                            <label className="block">
                                <span className="mb-1 block text-2xs font-medium uppercase tracking-[0.06em] text-muted">{habit.unit || "How many"}</span>
                                <input
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    inputMode="numeric"
                                    placeholder={String(habit.target)}
                                    className="h-10 w-24 rounded-sm border border-line-strong bg-card px-3 text-md tabular-nums outline-none focus:border-brand"
                                />
                            </label>
                            <Button type="submit" size="md">
                                <Check size={14} aria-hidden="true" /> Log it
                            </Button>
                        </form>
                    ) : (
                        <Button size="md" onClick={() => onLog()}>
                            <Check size={14} aria-hidden="true" /> Tick it off
                        </Button>
                    )}

                    {!rest && !done && (
                        <Button variant="ghost" size="md" disabled={!stats.freezeAvailable} onClick={() => onFreeze(today)} title={stats.freezeAvailable ? "One freeze a week" : "This week's freeze is used"}>
                            <Snowflake size={14} aria-hidden="true" /> {stats.freezeAvailable ? "Use the freeze" : "Freeze used"}
                        </Button>
                    )}
                </div>

                {stats.todayValue > 0 && !done && (
                    <p className="mt-2 text-xs text-muted">
                        <Flame size={11} className="inline" aria-hidden="true" /> {stats.todayValue} of {habit.target} {habit.unit} so far today.
                    </p>
                )}
                {habit.note && <p className="mt-2 text-xs leading-4 text-caption">{habit.note}</p>}
            </Card>
        </li>
    );
}

function HabitDialog({
    habit,
    members,
    meId,
    canPickMember,
    onClose,
    run,
}: {
    habit: Habit | null;
    members: Array<{ id: string; name: string; role: string }>;
    meId: string;
    canPickMember: boolean;
    onClose: () => void;
    run: (fn: (r: WellnessRepo) => Promise<unknown>, ok?: string) => Promise<boolean>;
}) {
    const [memberId, setMemberId] = useState<string | null>(habit?.memberId ?? meId);
    const [name, setName] = useState(habit?.name ?? "");
    const [kind, setKind] = useState<HabitKind>(habit?.kind ?? "custom");
    const [target, setTarget] = useState(String(habit?.target ?? 1));
    const [unit, setUnit] = useState(habit?.unit ?? "");
    const [checkinTime, setCheckinTime] = useState(habit?.checkinTime ?? "20:00");
    const [grace, setGrace] = useState<Weekday[]>(habit?.graceDays ?? []);
    const [sprouts, setSprouts] = useState(String(habit?.sprouts ?? 0));
    const [note, setNote] = useState(habit?.note ?? "");
    const [busy, setBusy] = useState(false);

    const isChildRow = members.find((m) => m.id === memberId)?.role === "child";

    const submit = async (e: FormEvent) => {
        e.preventDefault();
        if (!name.trim() || !memberId) return;
        setBusy(true);
        const patch = {
            name: name.trim(),
            kind,
            target: Math.max(1, Number(target) || 1),
            unit: unit.trim(),
            checkinTime,
            graceDays: grace,
            sprouts: Math.max(0, Number(sprouts) || 0),
            note: note.trim(),
        };
        const ok = habit
            ? await run((r) => r.updateHabit(habit.id, patch), "Saved")
            : await run((r) => r.addHabit({ memberId, ...patch }), "Habit added");
        setBusy(false);
        if (ok) onClose();
    };

    return (
        <Dialog open onClose={onClose} title={habit ? "Edit habit" : "A new habit"} wide>
            <form onSubmit={submit}>
                {canPickMember && !habit && <MemberPicker value={memberId} onChange={setMemberId} roles={["parent", "child"]} label="Whose habit" className="mb-4" />}

                <Field label="What is it" value={name} onChange={(e) => setName(e.target.value)} placeholder="Eight glasses of water" />

                <div className="mt-4 grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-2">
                    <label className="block">
                        <span className="mb-1.5 block text-xs font-medium tracking-[0.06em] text-muted uppercase">Kind</span>
                        <select value={kind} onChange={(e) => setKind(e.target.value as HabitKind)} className="h-[46px] w-full rounded-md border border-line-strong bg-card px-3 text-md outline-none focus:border-brand">
                            {KINDS.map((k) => (
                                <option key={k} value={k}>
                                    {HABIT_KIND_LABEL[k]}
                                </option>
                            ))}
                        </select>
                    </label>
                    <label className="block">
                        <span className="mb-1.5 block text-xs font-medium tracking-[0.06em] text-muted uppercase">Check in by</span>
                        <input type="time" value={checkinTime} onChange={(e) => setCheckinTime(e.target.value)} className="h-[46px] w-full rounded-md border border-line-strong bg-card px-3 text-md outline-none focus:border-brand" />
                    </label>
                    <Field label="A kept day is" value={target} onChange={(e) => setTarget(e.target.value)} inputMode="numeric" hint="1 means 'did you or didn't you'." />
                    <Field label="Measured in" value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="glasses, min, h" />
                </div>

                <fieldset className="mt-4">
                    <legend className="mb-1.5 text-xs font-medium uppercase tracking-[0.06em] text-muted">Rest days</legend>
                    <div className="flex flex-wrap gap-2">
                        {DAYS.map((d) => {
                            const on = grace.includes(d);
                            return (
                                <button
                                    key={d}
                                    type="button"
                                    aria-pressed={on}
                                    onClick={() => setGrace(on ? grace.filter((x) => x !== d) : [...grace, d].sort())}
                                    className={cn("h-9 rounded-full border px-3.5 text-sm font-medium", on ? "border-brand bg-brand-soft text-brand-ink" : "border-line-strong text-muted hover:text-ink")}
                                >
                                    {WEEKDAY_LABEL[d]}
                                </button>
                            );
                        })}
                    </div>
                    <p className="mt-1.5 text-xs text-caption">A rest day never breaks the streak, never counts towards it, and never raises a nudge.</p>
                </fieldset>

                {isChildRow && <Field label="Sprouts a kept day earns" value={sprouts} onChange={(e) => setSprouts(e.target.value)} inputMode="numeric" className="mt-4" />}

                <Field label="Note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Rested on Sundays — church, then a proper roast." className="mt-4" />

                <div className="mt-5 flex justify-end gap-2">
                    <Button variant="ghost" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button type="submit" loading={busy} disabled={!name.trim()}>
                        {habit ? "Save" : "Add the habit"}
                    </Button>
                </div>
            </form>
        </Dialog>
    );
}
