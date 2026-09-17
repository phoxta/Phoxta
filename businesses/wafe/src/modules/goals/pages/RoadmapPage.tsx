import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Plus, Sparkles, Trash2 } from "lucide-react";
import { cn } from "@/lib/cn";
import { useAi } from "@/lib/ai";
import { shortDate } from "@/lib/format";
import { useSpace } from "@/state/space";
import { Confirm, EmptyModule, Notice, PageTitle, Section } from "@/components/shared";
import { Dialog } from "@/components/ui/overlay";
import { Button, EmptyState, Field, IconButton, ProgressBar, Spinner, Tag } from "@/components/ui/primitives";
import { goalPct, keyResultsOf, krPct, milestonesOf, okrPct, okrsForQuarter, quarterLabel, quarterOf, roadmapPillars, roadmapQuarters } from "../derive";
import { useGoals } from "../live";
import { reviewPrompt } from "../ai";
import type { Goal, Okr } from "../types";
import { PILLAR_SHORT } from "../types";
import { GoalsNav, MilestoneDots, PillarTag } from "../components/pieces";

/**
 * The roadmap.
 *
 * Quarters across, pillars down, this quarter marked — and every goal on it is
 * a link, so anything on the timeline is one click from its own page and two
 * from any milestone. Underneath: the quarter's objectives with their key
 * results, and the quarterly review the family writes at the end of it.
 */

export default function RoadmapPage() {
    const { state, mutate, loading, error } = useGoals();
    const { can, today, role } = useSpace();
    const [params, setParams] = useSearchParams();
    const { ask, busy: aiBusy, available: aiAvailable } = useAi();

    const [okrOpen, setOkrOpen] = useState(false);
    const [objective, setObjective] = useState("");
    const [picked, setPicked] = useState<string[]>([]);
    const [krText, setKrText] = useState("");
    const [krTarget, setKrTarget] = useState("");
    const [krFor, setKrFor] = useState<string | null>(null);
    const [removeOkr, setRemoveOkr] = useState<Okr | null>(null);
    const [reviewOpen, setReviewOpen] = useState(false);
    const [reviewText, setReviewText] = useState("");
    const [aiErr, setAiErr] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    const here = quarterOf(today);
    const quarters = useMemo(() => (state ? roadmapQuarters(state, today) : []), [state, today]);
    const selected = params.get("q") && quarters.includes(params.get("q") as string) ? (params.get("q") as string) : here;

    useEffect(() => {
        if (!reviewOpen || !state) return;
        setReviewText(state.reviews.find((r) => r.kind === "quarter" && r.period === selected)?.notes ?? "");
    }, [reviewOpen, state, selected]);

    if (loading && !state) return <p className="text-md text-muted">Drawing the roadmap…</p>;
    if (error) return <Notice tone="danger">{error}</Notice>;
    if (!state) return null;

    const parent = can("goals.manage");
    const pillars = roadmapPillars(state);
    const okrs = okrsForQuarter(state, selected);
    const review = state.reviews.find((r) => r.kind === "quarter" && r.period === selected);
    const active = state.goals.filter((g) => g.status !== "done");

    const cell = (pillarIndex: number, quarter: string): Goal[] =>
        state.goals.filter((g) => g.pillar === pillars[pillarIndex] && quarterOf(g.targetDate) === quarter);

    return (
        <div>
            <PageTitle
                title="The roadmap"
                sub="Quarters across, pillars down, and this quarter marked. Every goal here is one click from its own page."
                area="execute"
                actions={
                    parent ? (
                        <Button
                            onClick={() => {
                                setObjective("");
                                setPicked([]);
                                setOkrOpen(true);
                            }}
                        >
                            <Plus size={16} /> New objective
                        </Button>
                    ) : undefined
                }
            />
            {role !== "child" && <GoalsNav />}

            {state.goals.length === 0 ? (
                <EmptyModule title="Nothing on the timeline yet" body="Goals appear here as soon as they have a target date." />
            ) : (
                <Section title="Timeline">
                    <div className="overflow-x-auto rounded-xl bg-card p-4">
                        <div className="min-w-[720px]">
                            <div className="grid gap-2" style={{ gridTemplateColumns: `112px repeat(${quarters.length}, minmax(170px, 1fr))` }}>
                                <div />
                                {quarters.map((q) => (
                                    <button
                                        key={q}
                                        type="button"
                                        aria-pressed={q === selected}
                                        onClick={() => {
                                            params.set("q", q);
                                            setParams(params, { replace: true });
                                        }}
                                        className={cn(
                                            "rounded-md px-3 py-2 text-left transition-colors",
                                            q === here ? "bg-execute-soft" : "bg-page",
                                            q === selected && "ring-2 ring-brand",
                                        )}
                                    >
                                        <span className="block text-sm font-semibold">{quarterLabel(q)}</span>
                                        <span className={cn("block text-2xs", q === here ? "font-semibold text-execute-ink" : "text-caption")}>{q === here ? "This quarter" : q}</span>
                                    </button>
                                ))}

                                {pillars.map((p, pi) => (
                                    <div key={p} className="contents">
                                        <div className="flex items-center py-1">
                                            <PillarTag pillar={p} />
                                        </div>
                                        {quarters.map((q) => {
                                            const items = cell(pi, q);
                                            return (
                                                <div
                                                    key={`${p}-${q}`}
                                                    className={cn(
                                                        "flex min-h-[58px] flex-col gap-1.5 rounded-md border border-dashed p-1.5",
                                                        q === here ? "border-execute/40 bg-execute-soft/40" : "border-line",
                                                    )}
                                                >
                                                    {items.map((g) => (
                                                        <Link
                                                            key={g.id}
                                                            to={`/execute/goals/${g.id}`}
                                                            title={`${g.title} — ${goalPct(state, g)}%`}
                                                            className={cn("block rounded-sm bg-card px-2.5 py-2 shadow-hover/0 transition-shadow hover:shadow-hover", g.status === "done" && "opacity-60")}
                                                        >
                                                            <span className="block truncate text-xs font-semibold leading-4">{g.title}</span>
                                                            <span className="mt-1 flex items-center gap-2">
                                                                <MilestoneDots milestones={milestonesOf(state, g.id)} />
                                                                <span className="text-2xs tabular-nums text-caption">{goalPct(state, g)}%</span>
                                                            </span>
                                                        </Link>
                                                    ))}
                                                </div>
                                            );
                                        })}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                    <p className="mt-2 text-xs text-caption">
                        Rows are the pillars this family actually has goals in ({pillars.map((p) => PILLAR_SHORT[p]).join(" · ")}). Tap a quarter to see its objectives.
                    </p>
                </Section>
            )}

            <Section title={`Objectives · ${quarterLabel(selected)}`} action={<Tag tone={selected === here ? "execute" : "neutral"}>{selected}</Tag>}>
                {okrs.length ? (
                    <ul className="grid grid-cols-[minmax(0,1fr)] gap-3 lg:grid-cols-2">
                        {okrs.map((o) => {
                            const krs = keyResultsOf(state, o.id);
                            const linked = o.goalIds.map((id) => state.goals.find((g) => g.id === id)).filter(Boolean) as Goal[];
                            return (
                                <li key={o.id} className="rounded-xl bg-card p-5">
                                    <div className="flex items-start justify-between gap-3">
                                        <h3 className="font-display text-[19px] leading-7">{o.objective}</h3>
                                        {parent && (
                                            <IconButton label={`Remove ${o.objective}`} size="md" onClick={() => setRemoveOkr(o)}>
                                                <Trash2 size={14} />
                                            </IconButton>
                                        )}
                                    </div>
                                    <p className="mt-1 text-xs tabular-nums text-caption">{okrPct(state, o)}% of its key results</p>

                                    <ul className="mt-4 flex flex-col gap-3">
                                        {krs.map((k) => (
                                            <li key={k.id}>
                                                <div className="flex items-baseline justify-between gap-3">
                                                    <span className="min-w-0 flex-1 text-md">{k.text}</span>
                                                    <span className="shrink-0 text-xs tabular-nums text-caption">
                                                        {k.current}/{k.target}
                                                        {k.unit}
                                                    </span>
                                                </div>
                                                <ProgressBar value={krPct(k)} className="mt-1.5" label={k.text} />
                                                {parent && (
                                                    <form
                                                        className="mt-2 flex items-center gap-2"
                                                        onSubmit={async (e) => {
                                                            e.preventDefault();
                                                            const input = (e.currentTarget.elements.namedItem("v") as HTMLInputElement | null)?.value;
                                                            const v = Number(input);
                                                            if (!Number.isFinite(v)) return;
                                                            await mutate((r) => r.updateKeyResult(k.id, { current: v }));
                                                            if (input !== undefined) (e.currentTarget.elements.namedItem("v") as HTMLInputElement).value = "";
                                                        }}
                                                    >
                                                        <input
                                                            name="v"
                                                            type="number"
                                                            step="any"
                                                            min="0"
                                                            placeholder={String(k.current)}
                                                            aria-label={`Update ${k.text}`}
                                                            className="h-8 w-24 rounded-full border border-line-strong bg-card px-3 text-xs outline-none focus:border-brand"
                                                        />
                                                        <Button type="submit" size="sm" variant="outline">
                                                            Update
                                                        </Button>
                                                    </form>
                                                )}
                                            </li>
                                        ))}
                                    </ul>

                                    {parent && (
                                        <div className="mt-3">
                                            {krFor === o.id ? (
                                                <form
                                                    className="flex flex-wrap items-end gap-2"
                                                    onSubmit={async (e) => {
                                                        e.preventDefault();
                                                        if (!krText.trim()) return;
                                                        await mutate((r) => r.addKeyResult(o.id, krText, Number(krTarget) || 1, ""));
                                                        setKrText("");
                                                        setKrTarget("");
                                                        setKrFor(null);
                                                    }}
                                                >
                                                    <Field className="min-w-0 flex-1" label="Key result" value={krText} onChange={(e) => setKrText(e.target.value)} placeholder="Out of the door by 08:10" />
                                                    <Field className="w-28" label="Target" type="number" min="1" value={krTarget} onChange={(e) => setKrTarget(e.target.value)} />
                                                    <Button type="submit" size="md" className="mb-1">
                                                        Add
                                                    </Button>
                                                </form>
                                            ) : (
                                                <Button variant="ghost" size="sm" className="-ml-3" onClick={() => setKrFor(o.id)}>
                                                    <Plus size={14} /> Key result
                                                </Button>
                                            )}
                                        </div>
                                    )}

                                    {linked.length > 0 && (
                                        <ul className="mt-4 flex flex-wrap gap-2 border-t border-line pt-3">
                                            {linked.map((g) => (
                                                <li key={g.id}>
                                                    <Link to={`/execute/goals/${g.id}`} className="inline-flex items-center gap-2 rounded-full bg-page px-3 py-1.5 text-xs font-medium hover:bg-subtle">
                                                        {g.title}
                                                        <span className="tabular-nums text-caption">{goalPct(state, g)}%</span>
                                                    </Link>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </li>
                            );
                        })}
                    </ul>
                ) : (
                    <EmptyState
                        title={`No objectives for ${quarterLabel(selected)}`}
                        body="One objective, three key results. More than that and it stops being a quarter and starts being a wish list."
                        action={parent ? <Button onClick={() => setOkrOpen(true)}>New objective</Button> : undefined}
                    />
                )}
            </Section>

            {parent && (
                <Section title={`Review · ${quarterLabel(selected)}`}>
                    <div className="rounded-xl bg-card p-5">
                        {review ? (
                            <>
                                <p className="whitespace-pre-line text-md leading-6">{review.notes}</p>
                                <p className="mt-3 text-xs text-caption">Written {shortDate(review.createdAt)}</p>
                            </>
                        ) : (
                            <p className="text-md text-muted">Nothing written for this quarter yet. Fifteen minutes at the end of it is worth more than the planning at the start.</p>
                        )}
                        <div className="mt-4 flex flex-wrap gap-2">
                            <Button variant="outline" size="md" onClick={() => setReviewOpen(true)}>
                                {review ? "Rewrite it" : "Write the review"}
                            </Button>
                            <Button
                                variant="ghost"
                                size="md"
                                disabled={!aiAvailable || aiBusy}
                                onClick={async () => {
                                    setAiErr(null);
                                    try {
                                        const r = await ask({ action: "ask", prompt: reviewPrompt(state, selected) });
                                        if (r.unavailable) {
                                            setAiErr(r.unavailable);
                                            return;
                                        }
                                        setReviewText(r.text);
                                        setReviewOpen(true);
                                    } catch (e) {
                                        setAiErr(e instanceof Error ? e.message : "The companion couldn't answer.");
                                    }
                                }}
                            >
                                {aiBusy ? <Spinner /> : <Sparkles size={15} />} Draft it with the companion
                            </Button>
                        </div>
                        {aiErr && <p className="mt-3 text-sm text-danger-ink">{aiErr}</p>}
                    </div>
                </Section>
            )}

            {/* ---- New objective ------------------------------------------- */}
            <Dialog open={okrOpen} onClose={() => setOkrOpen(false)} title={`An objective for ${quarterLabel(selected)}`} wide>
                <form
                    className="flex flex-col gap-4"
                    onSubmit={async (e) => {
                        e.preventDefault();
                        if (!objective.trim()) return;
                        setBusy(true);
                        try {
                            await mutate((r) => r.addOkr(selected, objective, picked));
                            setOkrOpen(false);
                        } finally {
                            setBusy(false);
                        }
                    }}
                >
                    <Field label="The objective" value={objective} onChange={(e) => setObjective(e.target.value)} placeholder="Settle the new school rhythm" required />
                    <fieldset>
                        <legend className="mb-1.5 block text-xs font-medium text-muted">Which goals it pulls on</legend>
                        <ul className="flex flex-col gap-2">
                            {active.map((g) => {
                                const on = picked.includes(g.id);
                                return (
                                    <li key={g.id}>
                                        <button
                                            type="button"
                                            aria-pressed={on}
                                            onClick={() => setPicked(on ? picked.filter((x) => x !== g.id) : [...picked, g.id])}
                                            className={cn("flex w-full items-center gap-3 rounded-sm border px-3 py-2.5 text-left", on ? "border-brand bg-brand-soft" : "border-line-strong hover:border-line")}
                                        >
                                            <span className="min-w-0 flex-1 truncate text-md font-medium">{g.title}</span>
                                            <span className="text-xs tabular-nums text-caption">{goalPct(state, g)}%</span>
                                        </button>
                                    </li>
                                );
                            })}
                        </ul>
                    </fieldset>
                    <div className="flex justify-end gap-2">
                        <Button variant="ghost" onClick={() => setOkrOpen(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" loading={busy}>
                            Add the objective
                        </Button>
                    </div>
                </form>
            </Dialog>

            {/* ---- The quarterly review ------------------------------------ */}
            <Dialog open={reviewOpen} onClose={() => setReviewOpen(false)} title={`Review of ${quarterLabel(selected)}`} wide>
                <form
                    className="flex flex-col gap-4"
                    onSubmit={async (e) => {
                        e.preventDefault();
                        setBusy(true);
                        try {
                            await mutate((r) => r.saveReview({ kind: "quarter", period: selected, notes: reviewText, focusGoalIds: okrs.flatMap((o) => o.goalIds) }));
                            setReviewOpen(false);
                        } finally {
                            setBusy(false);
                        }
                    }}
                >
                    <label className="block">
                        <span className="mb-1.5 block text-xs font-medium text-muted">What actually happened</span>
                        <textarea value={reviewText} onChange={(e) => setReviewText(e.target.value)} rows={10} className="w-full rounded-md border border-line-strong bg-card px-3 py-2.5 text-md leading-6 outline-none focus:border-brand" placeholder="What moved, what didn't and why that is fair, and the one thing next quarter is for." />
                    </label>
                    <p className="text-xs text-caption">The companion can draft this, but the family signs it. Edit freely before saving.</p>
                    <div className="flex justify-end gap-2">
                        <Button variant="ghost" onClick={() => setReviewOpen(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" loading={busy}>
                            Save the review
                        </Button>
                    </div>
                </form>
            </Dialog>

            <Confirm
                open={Boolean(removeOkr)}
                title="Remove this objective?"
                body={removeOkr ? `"${removeOkr.objective}" and its key results.` : undefined}
                confirmLabel="Remove"
                danger
                onClose={() => setRemoveOkr(null)}
                onConfirm={async () => {
                    if (removeOkr) await mutate((r) => r.removeOkr(removeOkr.id));
                }}
            />
        </div>
    );
}
