import { useState, type FormEvent } from "react";
import type { Visibility } from "@/data/core";
import { isoDate } from "@/lib/format";
import { MemberMultiPicker, VisibilityPicker } from "@/components/shared";
import { Dialog } from "@/components/ui/overlay";
import { Button, Field } from "@/components/ui/primitives";
import type { NewTaskInput, RecurRule, TaskKind, TaskPriority, TasksState } from "../types";
import { KIND_LABEL, PRIORITY_LABEL } from "../types";
import { useTasks } from "./useTasks";

/**
 * New task — the one form the whole module writes through.
 *
 * A parent sees everything: who it is for, what it repeats, whether it is a
 * chore and what it is worth, which goal and value it serves. A child sees a
 * quarter of it — a name, a day, a note — because the only task a child may
 * create is their own (AC 11), and the form should not offer what the repo
 * will refuse.
 */

const REPEATS: Array<{ id: string; label: string; rule: RecurRule | null }> = [
    { id: "none", label: "Doesn't repeat", rule: null },
    { id: "daily", label: "Every day", rule: { freq: "daily", interval: 1, weekday: null, monthDay: null } },
    { id: "weekdays", label: "Every 2 days", rule: { freq: "daily", interval: 2, weekday: null, monthDay: null } },
    { id: "weekly", label: "Every week", rule: { freq: "weekly", interval: 1, weekday: null, monthDay: null } },
    { id: "fortnightly", label: "Every 2 weeks", rule: { freq: "weekly", interval: 2, weekday: null, monthDay: null } },
    { id: "monthly", label: "Every month", rule: { freq: "monthly", interval: 1, weekday: null, monthDay: null } },
];

export function TaskDialog({ open, onClose, state, defaults }: { open: boolean; onClose: () => void; state: TasksState; defaults?: Partial<NewTaskInput> }) {
    const { mutate, sp, toast } = useTasks();
    const manage = sp.can("tasks.manage");
    const child = sp.role === "child" && !manage;

    const [title, setTitle] = useState("");
    const [notes, setNotes] = useState("");
    const [who, setWho] = useState<string[]>(defaults?.assigneeMemberIds ?? (child ? [sp.me.id] : []));
    const [date, setDate] = useState(defaults?.dueAt ? isoDate(defaults.dueAt) : sp.today);
    const [clock, setClock] = useState("");
    const [priority, setPriority] = useState<TaskPriority>("normal");
    const [kind, setKind] = useState<TaskKind>(defaults?.kind ?? "task");
    const [repeat, setRepeat] = useState("none");
    const [isChore, setIsChore] = useState(Boolean(defaults?.isChore));
    const [sprouts, setSprouts] = useState(10);
    const [needsProof, setNeedsProof] = useState(false);
    const [goalId, setGoalId] = useState(defaults?.goalId ?? "");
    const [valueId, setValueId] = useState("");
    const [visibility, setVisibility] = useState<Visibility>("family");
    const [sharedWith, setSharedWith] = useState<string[]>([]);
    const [checklist, setChecklist] = useState("");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const reset = () => {
        setTitle("");
        setNotes("");
        setChecklist("");
        setWho(child ? [sp.me.id] : []);
    };

    const submit = async (e: FormEvent) => {
        e.preventDefault();
        setBusy(true);
        setError(null);
        try {
            const goal = state.goalProgress.find((g) => g.goalId === goalId);
            const input: NewTaskInput = {
                title,
                notes,
                assigneeMemberIds: child ? [sp.me.id] : who,
                dueAt: date ? new Date(`${date}T${clock || "09:00"}`).toISOString() : null,
                allDay: !clock,
                priority,
                kind: isChore ? "chore" : kind,
                scope: child ? "me" : who.length === 1 ? "me" : "family",
                rrule: REPEATS.find((r) => r.id === repeat)?.rule ?? null,
                isChore: manage ? isChore : false,
                sprouts: isChore ? sprouts : 0,
                needsProof: isChore ? needsProof : false,
                goalId: goalId || null,
                goalLabel: goal?.label ?? "",
                valueId: valueId || null,
                visibility: child ? "child" : visibility,
                sharedWith,
                childSafe: child || isChore,
                checklist: checklist.split("\n").map((x) => x.trim()).filter(Boolean),
                sourceType: "manual",
                // Opened from a board column, the task starts in that column
                // rather than always in To do.
                ...(defaults?.status ? { status: defaults.status } : {}),
            };
            await mutate((r) => r.createTask(input));
            toast(`"${title.trim()}" added`, "success");
            reset();
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Couldn't add that.");
        } finally {
            setBusy(false);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} title={child ? "Add a job for me" : "New task"} wide>
            <form onSubmit={submit} className="flex flex-col gap-4">
                <Field label="What needs doing" value={title} onChange={(e) => setTitle(e.target.value)} required placeholder={child ? "Tidy my desk" : "Renew the car insurance"} />
                <label className="flex flex-col gap-1.5">
                    <span className="text-xs font-medium uppercase tracking-[0.06em] text-muted">Notes</span>
                    <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="rounded-md border border-line-strong bg-card px-4 py-3 text-md outline-none focus:border-brand" placeholder="Anything the person doing it should know" />
                </label>

                <div className="grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-2">
                    <Field label="Day" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                    <Field label="Time (optional)" type="time" value={clock} onChange={(e) => setClock(e.target.value)} hint="Leave it empty for any time that day" />
                </div>

                {!child && <MemberMultiPicker value={who} onChange={setWho} label="Who's doing it" />}

                <div className="grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-3">
                    <label className="flex flex-col gap-1.5">
                        <span className="text-xs font-medium uppercase tracking-[0.06em] text-muted">Kind</span>
                        <select value={kind} onChange={(e) => setKind(e.target.value as TaskKind)} disabled={isChore} className="h-11 rounded-sm border border-line-strong bg-card px-3 text-md outline-none focus:border-brand disabled:opacity-50">
                            {Object.entries(KIND_LABEL).map(([k, label]) => (
                                <option key={k} value={k}>
                                    {label}
                                </option>
                            ))}
                        </select>
                    </label>
                    <label className="flex flex-col gap-1.5">
                        <span className="text-xs font-medium uppercase tracking-[0.06em] text-muted">Priority</span>
                        <select value={priority} onChange={(e) => setPriority(e.target.value as TaskPriority)} className="h-11 rounded-sm border border-line-strong bg-card px-3 text-md outline-none focus:border-brand">
                            {Object.entries(PRIORITY_LABEL).map(([k, label]) => (
                                <option key={k} value={k}>
                                    {label}
                                </option>
                            ))}
                        </select>
                    </label>
                    <label className="flex flex-col gap-1.5">
                        <span className="text-xs font-medium uppercase tracking-[0.06em] text-muted">Repeats</span>
                        <select value={repeat} onChange={(e) => setRepeat(e.target.value)} className="h-11 rounded-sm border border-line-strong bg-card px-3 text-md outline-none focus:border-brand">
                            {REPEATS.map((r) => (
                                <option key={r.id} value={r.id}>
                                    {r.label}
                                </option>
                            ))}
                        </select>
                    </label>
                </div>

                {!child && (
                    <div className="grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-2">
                        <label className="flex flex-col gap-1.5">
                            <span className="text-xs font-medium uppercase tracking-[0.06em] text-muted">Towards a goal</span>
                            <select value={goalId} onChange={(e) => setGoalId(e.target.value)} className="h-11 rounded-sm border border-line-strong bg-card px-3 text-md outline-none focus:border-brand">
                                <option value="">Nothing in particular</option>
                                {state.goalProgress.map((g) => (
                                    <option key={g.goalId} value={g.goalId}>
                                        {g.label}
                                    </option>
                                ))}
                            </select>
                        </label>
                        <label className="flex flex-col gap-1.5">
                            <span className="text-xs font-medium uppercase tracking-[0.06em] text-muted">A value it serves</span>
                            <select value={valueId} onChange={(e) => setValueId(e.target.value)} className="h-11 rounded-sm border border-line-strong bg-card px-3 text-md outline-none focus:border-brand">
                                <option value="">None in particular</option>
                                {sp.space.values.map((v) => (
                                    <option key={v} value={v}>
                                        {v}
                                    </option>
                                ))}
                            </select>
                        </label>
                    </div>
                )}

                {manage && (
                    <div className="rounded-lg bg-page p-3">
                        <label className="flex items-center gap-3 text-sm font-semibold leading-5">
                            <input type="checkbox" checked={isChore} onChange={(e) => setIsChore(e.target.checked)} className="size-4 accent-[var(--color-brand)]" />
                            This is a chore, worth Sprouts
                        </label>
                        {isChore && (
                            <div className="mt-3 grid grid-cols-[minmax(0,1fr)] gap-3 pl-7 sm:grid-cols-2">
                                <Field label="Sprouts" type="number" min={0} step={5} value={sprouts} onChange={(e) => setSprouts(Number(e.target.value))} />
                                <label className="flex items-center gap-3 text-sm leading-5 sm:mt-6">
                                    <input type="checkbox" checked={needsProof} onChange={(e) => setNeedsProof(e.target.checked)} className="size-4 accent-[var(--color-brand)]" />
                                    Ask for a photo before the Sprouts count
                                </label>
                            </div>
                        )}
                    </div>
                )}

                {!child && <VisibilityPicker value={visibility} onChange={setVisibility} sharedWith={sharedWith} onSharedWith={setSharedWith} />}

                <label className="flex flex-col gap-1.5">
                    <span className="text-xs font-medium uppercase tracking-[0.06em] text-muted">Steps (one per line)</span>
                    <textarea value={checklist} onChange={(e) => setChecklist(e.target.value)} rows={3} className="rounded-md border border-line-strong bg-card px-4 py-3 text-md outline-none focus:border-brand" placeholder={"Compare two quotes\nRing the insurer"} />
                </label>

                {error && (
                    <p className="text-sm text-danger-ink" role="alert">
                        {error}
                    </p>
                )}
                <div className="flex justify-end gap-2">
                    <Button variant="ghost" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button type="submit" loading={busy} disabled={!title.trim()}>
                        Add it
                    </Button>
                </div>
            </form>
        </Dialog>
    );
}
