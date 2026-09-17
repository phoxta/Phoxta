import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Link2, Sparkles } from "lucide-react";
import { cn } from "@/lib/cn";
import { shortDate } from "@/lib/format";
import { useAi } from "@/lib/ai";
import { useSpace } from "@/state/space";
import { Dialog } from "@/components/ui/overlay";
import { Button, EmptyState, Spinner } from "@/components/ui/primitives";
import type { ConnectionSample, Goal, GoalReview, GoalsState } from "../types";
import { goalPct, stalledGoals } from "../derive";
import { stallPrompt } from "../ai";

/** The panels the Goals index is made of, kept out of the page's own file. */

// ---------------------------------------------------------------------------
// Sunday planning: this week's three
// ---------------------------------------------------------------------------

export function SundayPanel({
    state,
    review,
    isPlanningDay,
    canEdit,
    onSave,
}: {
    state: GoalsState;
    review: GoalReview | undefined;
    isPlanningDay: boolean;
    canEdit: boolean;
    onSave: (notes: string, focusGoalIds: string[]) => Promise<void>;
}) {
    const [open, setOpen] = useState(false);
    const [notes, setNotes] = useState("");
    const [picked, setPicked] = useState<string[]>([]);
    const [busy, setBusy] = useState(false);
    const choices = state.goals.filter((g) => g.status === "active");

    useEffect(() => {
        if (!open) return;
        setNotes(review?.notes ?? "");
        setPicked(review?.focusGoalIds ?? []);
    }, [open, review]);

    const focus = (review?.focusGoalIds ?? []).map((id) => state.goals.find((g) => g.id === id)).filter(Boolean) as Goal[];

    return (
        <div className={cn("rounded-xl p-5", isPlanningDay ? "bg-execute-soft" : "bg-card")}>
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <h2 className="font-display text-2xl leading-7">{isPlanningDay ? "Sunday planning — this week's three" : "This week's three"}</h2>
                    <p className="mt-1 text-sm text-muted">{review ? `Set ${shortDate(review.period)}` : "Nothing set yet. Three is the number, because five is a wish list."}</p>
                </div>
                {canEdit && (
                    <Button variant={isPlanningDay ? "brand" : "outline"} size="md" onClick={() => setOpen(true)}>
                        {review ? "Change them" : "Set this week's three"}
                    </Button>
                )}
            </div>

            {focus.length > 0 ? (
                <ol className="mt-4 flex flex-col gap-2">
                    {focus.map((g, i) => (
                        <li key={g.id}>
                            <Link to={`/execute/goals/${g.id}`} className="flex items-center gap-3 rounded-md bg-card/70 px-3 py-2.5 transition-colors hover:bg-card">
                                <span className="grid size-6 shrink-0 place-items-center rounded-full bg-brand text-xs font-semibold text-white">{i + 1}</span>
                                <span className="min-w-0 flex-1 truncate text-md font-medium">{g.title}</span>
                                <span className="text-xs tabular-nums text-caption">{goalPct(state, g)}%</span>
                            </Link>
                        </li>
                    ))}
                </ol>
            ) : null}

            {review?.notes && <p className="mt-3 text-sm leading-5 text-muted">{review.notes}</p>}

            <Dialog open={open} onClose={() => setOpen(false)} title="This week's three" wide>
                <form
                    onSubmit={async (e) => {
                        e.preventDefault();
                        setBusy(true);
                        try {
                            await onSave(notes, picked.slice(0, 3));
                            setOpen(false);
                        } finally {
                            setBusy(false);
                        }
                    }}
                    className="flex flex-col gap-4"
                >
                    <fieldset>
                        <legend className="mb-1.5 block text-xs font-medium text-muted">Pick up to three</legend>
                        <ul className="flex flex-col gap-2">
                            {choices.map((g) => {
                                const on = picked.includes(g.id);
                                return (
                                    <li key={g.id}>
                                        <button
                                            type="button"
                                            aria-pressed={on}
                                            onClick={() => setPicked(on ? picked.filter((x) => x !== g.id) : picked.length >= 3 ? picked : [...picked, g.id])}
                                            disabled={!on && picked.length >= 3}
                                            className={cn("flex w-full items-center gap-3 rounded-sm border px-3 py-2.5 text-left disabled:opacity-45", on ? "border-brand bg-brand-soft" : "border-line-strong hover:border-line")}
                                        >
                                            <span className="min-w-0 flex-1 truncate text-md font-medium">{g.title}</span>
                                            <span className="text-xs tabular-nums text-caption">{goalPct(state, g)}%</span>
                                        </button>
                                    </li>
                                );
                            })}
                        </ul>
                    </fieldset>
                    <label className="block">
                        <span className="mb-1.5 block text-xs font-medium text-muted">A line for the week</span>
                        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className="w-full rounded-md border border-line-strong bg-card px-3 py-2.5 text-md leading-6 outline-none focus:border-brand" placeholder="The medical forms, the passports, and one evening with no laptops." />
                    </label>
                    <div className="flex justify-end gap-2">
                        <Button variant="ghost" onClick={() => setOpen(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" loading={busy}>
                            Save the week
                        </Button>
                    </div>
                </form>
            </Dialog>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Connection metrics — parents only
// ---------------------------------------------------------------------------

function MiniBars({ data, label, tone }: { data: number[]; label: string; tone: "brand" | "sage" }) {
    return (
        <div>
            <div className="flex h-14 items-end gap-[3px]" role="img" aria-label={`${label}: ${data.map((d) => `${d}%`).join(", ")}`}>
                {data.map((v, i) => (
                    <span key={i} className={cn("min-w-0 flex-1 rounded-t-[3px]", tone === "brand" ? "bg-brand" : "bg-brand-glow")} style={{ height: `${Math.max(4, v)}%` }} />
                ))}
            </div>
            <p className="mt-2 text-xs text-caption">{label}</p>
        </div>
    );
}

export function ConnectionPanel({ series, today }: { series: ConnectionSample[]; today: ConnectionSample | null }) {
    const latest = today ?? series.at(-1);
    if (!series.length && !latest) return null;
    return (
        <div className="rounded-xl bg-card p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <h2 className="flex items-center gap-2 font-display text-2xl leading-7">
                        <Link2 size={16} className="text-muted" aria-hidden="true" /> Are we joined up?
                    </h2>
                    <p className="mt-1 max-w-md text-sm leading-5 text-muted">Stored every night: how much of what the house actually does is attached to something you said mattered.</p>
                </div>
                {latest && (
                    <div className="flex gap-6">
                        <div>
                            <div className="font-display text-5xl leading-8 tabular-nums">{latest.tasksWithGoalPct}%</div>
                            <div className="text-xs text-caption">tasks with a goal</div>
                        </div>
                        <div>
                            <div className="font-display text-5xl leading-8 tabular-nums">{latest.goalsWithMilestonePct}%</div>
                            <div className="text-xs text-caption">goals with a milestone</div>
                        </div>
                    </div>
                )}
            </div>
            {series.length > 1 && (
                <div className="mt-5 grid grid-cols-[minmax(0,1fr)] gap-5 sm:grid-cols-2">
                    <MiniBars data={series.map((s) => s.tasksWithGoalPct)} label={`Tasks carrying a goal · last ${series.length} nights`} tone="brand" />
                    <MiniBars data={series.map((s) => s.goalsWithMilestonePct)} label={`Goals with at least one milestone · last ${series.length} nights`} tone="sage" />
                </div>
            )}
        </div>
    );
}

// ---------------------------------------------------------------------------
// "Which goals are stalling?"
// ---------------------------------------------------------------------------

export function StallPanel({ state }: { state: GoalsState }) {
    const { today } = useSpace();
    const { ask, busy, available } = useAi();
    const [answer, setAnswer] = useState<string | null>(null);
    const [err, setErr] = useState<string | null>(null);
    const stalled = stalledGoals(state, today);

    return (
        <div className="rounded-xl bg-card p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <h2 className="font-display text-2xl leading-7">Stalling</h2>
                    <p className="mt-1 text-sm text-muted">{stalled.length ? `${stalled.length} goal${stalled.length === 1 ? " has" : "s have"} not moved in three weeks.` : "Nothing has been still for three weeks. That is rarer than it sounds."}</p>
                </div>
                <Button
                    variant="outline"
                    size="md"
                    disabled={!available || busy}
                    onClick={async () => {
                        setErr(null);
                        try {
                            const r = await ask({ action: "ask", prompt: stallPrompt(state, today) });
                            setAnswer(r.unavailable || r.text || "The companion had nothing to add.");
                        } catch (e) {
                            setErr(e instanceof Error ? e.message : "The companion couldn't answer.");
                        }
                    }}
                >
                    {busy ? <Spinner /> : <Sparkles size={15} />} Ask the companion
                </Button>
            </div>
            {stalled.length > 0 && (
                <ul className="mt-4 flex flex-col gap-2">
                    {stalled.map((g) => (
                        <li key={g.id}>
                            <Link to={`/execute/goals/${g.id}`} className="flex items-center gap-3 rounded-md bg-peach-soft px-3 py-2.5 text-peach transition-opacity hover:opacity-90">
                                <span className="min-w-0 flex-1 truncate text-md font-medium">{g.title}</span>
                                <span className="text-xs tabular-nums">{goalPct(state, g)}%</span>
                            </Link>
                        </li>
                    ))}
                </ul>
            )}
            {answer && <p className="mt-4 whitespace-pre-line rounded-lg bg-page p-4 text-md leading-6">{answer}</p>}
            {err && <p className="mt-3 text-sm text-danger-ink">{err}</p>}
            {!available && <p className="mt-3 text-xs text-caption">The companion needs the backend configured for this build.</p>}
        </div>
    );
}

// ---------------------------------------------------------------------------
// The celebrate archive
// ---------------------------------------------------------------------------

export function CelebrationList({ state, onShare }: { state: GoalsState; onShare: (id: string) => void }) {
    if (!state.celebrations.length) {
        return <EmptyState title="Nothing to celebrate yet" body="Finish a goal and this becomes the family's shelf of small victories." />;
    }
    return (
        <ul className="grid grid-cols-[minmax(0,1fr)] gap-3 md:grid-cols-2">
            {state.celebrations.map((c) => {
                const goal = state.goals.find((g) => g.id === c.goalId);
                return (
                    <li key={c.id} className="overflow-hidden rounded-xl bg-card">
                        {c.photoUrl && <img src={c.photoUrl} alt="" width={640} height={200} loading="lazy" className="h-32 w-full object-cover" />}
                        <div className="p-4">
                            <p className="font-display text-xl leading-6">{c.cardLine}</p>
                            <p className="mt-1.5 text-xs text-caption">
                                {goal?.title ?? "A goal"} · {shortDate(c.date)}
                            </p>
                            {c.reflection && <p className="mt-2.5 text-sm leading-5 text-muted">{c.reflection}</p>}
                            <Button variant="ghost" size="sm" className="mt-3 -ml-3" onClick={() => onShare(c.id)}>
                                Make a card
                            </Button>
                        </div>
                    </li>
                );
            })}
        </ul>
    );
}
