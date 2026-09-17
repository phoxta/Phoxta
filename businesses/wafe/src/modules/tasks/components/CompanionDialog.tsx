import { useState } from "react";
import { Sparkles } from "lucide-react";
import { useAi } from "@/lib/ai";
import { cn } from "@/lib/cn";
import { MemberAvatar, Notice } from "@/components/shared";
import { Dialog } from "@/components/ui/overlay";
import { Button, Field, Spinner } from "@/components/ui/primitives";
import { choresFor, isDone, isOverdue, sproutsBalance } from "../derive";
import type { NewTaskInput, TasksState } from "../types";
import { useTasks } from "./useTasks";

/**
 * The companion, doing the three things this module asked it for: break a goal
 * into tasks, turn Sunday's notes into tasks, and say out loud whether the
 * chores are landing fairly.
 *
 * It proposes; it never writes. Every suggestion arrives as a row with a
 * checkbox, and nothing reaches the family's list until a parent has ticked it
 * and pressed the button — which is the whole point of "proposes rather than
 * acts". The grounding it answers from is the family's own slice, so the panel
 * shows what it read.
 */

type Mode = "goal" | "notes" | "chores";

interface Suggestion {
    title: string;
    memberId: string | null;
    dueInDays: number;
    points?: number;
    note?: string;
}

const MODES: Array<{ id: Mode; label: string; blurb: string }> = [
    { id: "goal", label: "Suggest tasks for a goal", blurb: "Name the goal; you get five or six next steps, each with a person and a day." },
    { id: "notes", label: "Turn notes into tasks", blurb: "Paste what you wrote in the briefing or on Sunday and it comes back as jobs." },
    { id: "chores", label: "Balance this week's chores", blurb: "Who is carrying what, and what would be fairer. It suggests; you decide." },
];

function parseSuggestions(data: unknown): Suggestion[] {
    const raw = (data as { tasks?: unknown })?.tasks;
    if (!Array.isArray(raw)) return [];
    return raw
        .map((x) => x as Record<string, unknown>)
        .filter((x) => typeof x.title === "string" && x.title.trim())
        .slice(0, 8)
        .map((x) => ({
            title: String(x.title).trim().slice(0, 120),
            memberId: typeof x.memberId === "string" ? x.memberId : null,
            dueInDays: Math.max(0, Math.min(60, Math.round(Number(x.dueInDays ?? 3)) || 3)),
            points: typeof x.points === "number" ? Math.max(0, Math.round(x.points)) : undefined,
            note: typeof x.note === "string" ? x.note.slice(0, 200) : undefined,
        }));
}

export function CompanionDialog({ open, onClose, state, goalLabel }: { open: boolean; onClose: () => void; state: TasksState; goalLabel?: string }) {
    const { mutate, sp, toast } = useTasks();
    const { ask, busy, available } = useAi();
    const [mode, setMode] = useState<Mode>(goalLabel ? "goal" : "goal");
    const [prompt, setPrompt] = useState(goalLabel ?? "");
    const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
    const [chosen, setChosen] = useState<Set<number>>(new Set());
    const [answer, setAnswer] = useState("");
    const [note, setNote] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [adding, setAdding] = useState(false);

    const kids = sp.members.filter((m) => m.role === "child");
    const sources = [
        `${state.tasks.filter((t) => !isDone(t)).length} open tasks`,
        `${state.tasks.filter((t) => isOverdue(t, sp.today)).length} overdue`,
        `${state.rotas.length} rota${state.rotas.length === 1 ? "" : "s"}`,
        `Sprouts: ${kids.map((k) => `${k.name.split(" ")[0]} ${sproutsBalance(state, k.id)}`).join(", ") || "none yet"}`,
    ];

    const run = async () => {
        setError(null);
        setNote(null);
        setAnswer("");
        setSuggestions([]);
        setChosen(new Set());
        try {
            if (mode === "chores") {
                const load = kids
                    .map((k) => {
                        const mine = state.tasks.filter((t) => t.isChore && t.assigneeMemberIds.includes(k.id) && !isDone(t));
                        return `${k.name} (${k.ageBand}): ${mine.length} chores, ${mine.reduce((n, t) => n + t.sprouts, 0)} Sprouts on offer, today's: ${choresFor(state, k.id, sp.today).map((t) => t.title).join(", ") || "none"}`;
                    })
                    .join(" | ");
                const res = await ask({
                    action: "ask",
                    prompt: "Is this week's chore load fair between the children, given their ages? Say what you would swap and why, in four sentences or fewer. Do not invent chores we do not have.",
                    extraContext: `Chore load: ${load}. Rota: ${state.rotas.map((r) => r.name).join(", ") || "none"}.`,
                });
                if (res.unavailable) setNote(res.unavailable);
                else setAnswer(res.text.trim());
                return;
            }
            const res = await ask<{ tasks?: unknown }>({
                action: "suggest-tasks",
                prompt: mode === "goal" ? `Break this goal into next steps: ${prompt}` : `Turn these notes into tasks: ${prompt}`,
                payload: { members: sp.members.map((m) => ({ id: m.id, name: m.name, role: m.role, ageBand: m.ageBand })), today: sp.today },
            });
            if (res.unavailable) {
                setNote(res.unavailable);
                return;
            }
            const list = parseSuggestions(res.data);
            if (!list.length) {
                setNote("The companion didn't come back with anything usable. Try saying it another way.");
                return;
            }
            setSuggestions(list);
            setChosen(new Set(list.map((_, i) => i)));
        } catch (err) {
            setError(err instanceof Error ? err.message : "The companion couldn't answer just now.");
        }
    };

    const add = async () => {
        setAdding(true);
        setError(null);
        try {
            const picked = suggestions.filter((_, i) => chosen.has(i));
            for (const sgn of picked) {
                const due = new Date(`${sp.today}T09:00:00`);
                due.setDate(due.getDate() + sgn.dueInDays);
                const input: NewTaskInput = {
                    title: sgn.title,
                    notes: sgn.note ?? "",
                    assigneeMemberIds: sgn.memberId && sp.members.some((m) => m.id === sgn.memberId) ? [sgn.memberId] : [],
                    dueAt: due.toISOString(),
                    allDay: true,
                    goalLabel: mode === "goal" ? prompt.trim().slice(0, 60) : "",
                    sourceType: mode === "goal" ? "ai" : "briefing",
                };
                await mutate((r) => r.createTask(input));
            }
            toast(`${picked.length} task${picked.length === 1 ? "" : "s"} added`, "success");
            onClose();
            setSuggestions([]);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Couldn't add those.");
        } finally {
            setAdding(false);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} title="Ask the companion" wide>
            <div className="flex flex-wrap gap-2">
                {MODES.map((m) => (
                    <button
                        key={m.id}
                        type="button"
                        aria-pressed={mode === m.id}
                        onClick={() => {
                            setMode(m.id);
                            setSuggestions([]);
                            setAnswer("");
                            setNote(null);
                        }}
                        className={cn("rounded-full border px-3 py-1.5 text-xs font-semibold", mode === m.id ? "border-brand bg-brand-soft text-brand-ink" : "border-line-strong text-muted hover:text-ink")}
                    >
                        {m.label}
                    </button>
                ))}
            </div>
            <p className="mt-2 text-sm leading-5 text-muted">{MODES.find((m) => m.id === mode)?.blurb}</p>

            {mode !== "chores" && (
                <div className="mt-4">
                    {mode === "goal" ? (
                        <Field label="The goal" value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="Christmas in Lagos, sorted by the end of October" />
                    ) : (
                        <label className="flex flex-col gap-1.5">
                            <span className="text-xs font-medium uppercase tracking-[0.06em] text-muted">The notes</span>
                            <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={4} className="rounded-md border border-line-strong bg-card px-4 py-3 text-md outline-none focus:border-brand" placeholder="Passports before half term. Tobi's science fair on Thursday. Ask Bisi about the flat." />
                        </label>
                    )}
                </div>
            )}

            <div className="mt-4 flex items-center gap-2">
                <Button onClick={run} loading={busy} disabled={mode !== "chores" && !prompt.trim()}>
                    <Sparkles size={15} aria-hidden="true" /> {mode === "chores" ? "Have a look" : "Suggest"}
                </Button>
                {!available && <span className="text-xs text-caption">The companion needs the backend configured.</span>}
            </div>

            <p className="mt-3 text-xs leading-5 text-caption">I used: {sources.join(" · ")}.</p>

            {busy && (
                <p className="mt-4 flex items-center gap-2 text-sm text-muted">
                    <Spinner /> Thinking…
                </p>
            )}
            {note && <Notice className="mt-4">{note}</Notice>}
            {error && (
                <p className="mt-4 text-sm text-danger-ink" role="alert">
                    {error}
                </p>
            )}

            {answer && <div className="mt-4 whitespace-pre-wrap rounded-lg bg-page p-4 text-md leading-6">{answer}</div>}

            {suggestions.length > 0 && (
                <>
                    <ul className="mt-4 flex flex-col gap-1">
                        {suggestions.map((sgn, i) => (
                            <li key={`${sgn.title}-${i}`}>
                                <label className="flex cursor-pointer items-start gap-3 rounded-md px-2 py-2 hover:bg-page">
                                    <input
                                        type="checkbox"
                                        checked={chosen.has(i)}
                                        onChange={(e) => {
                                            const next = new Set(chosen);
                                            if (e.target.checked) next.add(i);
                                            else next.delete(i);
                                            setChosen(next);
                                        }}
                                        className="mt-1 size-4 accent-[var(--color-brand)]"
                                    />
                                    <span className="min-w-0 flex-1">
                                        <span className="block text-md font-medium">{sgn.title}</span>
                                        <span className="mt-0.5 block text-xs text-caption">
                                            in {sgn.dueInDays} day{sgn.dueInDays === 1 ? "" : "s"}
                                            {sgn.note ? ` · ${sgn.note}` : ""}
                                        </span>
                                    </span>
                                    {sgn.memberId && <MemberAvatar memberId={sgn.memberId} size="xs" />}
                                </label>
                            </li>
                        ))}
                    </ul>
                    <div className="mt-4 flex justify-end gap-2">
                        <Button variant="ghost" onClick={() => setSuggestions([])}>
                            Discard
                        </Button>
                        <Button loading={adding} disabled={!chosen.size} onClick={add}>
                            Add {chosen.size} to the list
                        </Button>
                    </div>
                </>
            )}
        </Dialog>
    );
}
