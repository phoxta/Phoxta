import { useEffect, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, Check, Pencil, Plus, Sparkles, Trash2, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { useAi } from "@/lib/ai";
import { isoDate, money, shortDate } from "@/lib/format";
import { useData } from "@/state/data";
import { useSpace } from "@/state/space";
import { Confirm, DateText, MemberAvatar, Notice, PageTitle, Section } from "@/components/shared";
import { Ring } from "@/components/ui/charts";
import { Button, EmptyState, Field, IconButton, Spinner, Tag } from "@/components/ui/primitives";
import {
    canCreateGoal,
    canEditGoal,
    celebrationsOf,
    effectiveMode,
    fundForGoal,
    goalPct,
    lastProgressAt,
    metricFor,
    metricHistory,
    metricText,
    milestonesOf,
    newTaskHref,
    okrsForGoal,
    okrPct,
    quarterLabel,
    tasksForGoal,
} from "../derive";
import { useGoals, useLinkedTasks } from "../live";
import { breakDownPrompt, dueFrom, existingTitles, goalContext, parseSuggestions, type Suggestion } from "../ai";
import type { GoalStatus, Milestone } from "../types";
import { HORIZON_LABEL, MODE_LABEL, STATUS_LABEL } from "../types";
import { MilestoneDots, PillarTag, ScopeLine, StatusTag } from "../components/pieces";
import { GoalDialog } from "../components/GoalDialog";
import { CelebrateDialog, ShareCardDialog } from "../components/Celebrate";

/**
 * One goal, in full.
 *
 * The page's job is to make the loop obvious: the milestones are the progress,
 * the tasks underneath them are the work, the number (where there is one) is
 * the truth, and finishing is an event rather than a status change — tick the
 * last milestone and the celebration dialog opens on its own.
 */

const STATUSES: GoalStatus[] = ["active", "paused", "done"];

export default function GoalPage() {
    const { id = "" } = useParams();
    const [params, setParams] = useSearchParams();
    const navigate = useNavigate();
    const { state, mutate, loading, error, funds } = useGoals();
    const { ctx } = useData();
    const { space, role, today, mutateCore } = useSpace();
    const tasks = useLinkedTasks();
    const { ask, busy: aiBusy, available: aiAvailable } = useAi();

    const [newStep, setNewStep] = useState("");
    const [newDue, setNewDue] = useState("");
    const [editing, setEditing] = useState<Milestone | null>(null);
    const [editTitle, setEditTitle] = useState("");
    const [removeStep, setRemoveStep] = useState<Milestone | null>(null);
    const [removeGoal, setRemoveGoal] = useState(false);
    const [editOpen, setEditOpen] = useState(false);
    const [celebrateOpen, setCelebrateOpen] = useState(false);
    const [shareId, setShareId] = useState<string | null>(null);
    const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
    const [aiErr, setAiErr] = useState<string | null>(null);
    const [reading, setReading] = useState("");
    const [busyStep, setBusyStep] = useState<string | null>(null);
    const [typed, setTyped] = useState<number | null>(null);
    const [savingPct, setSavingPct] = useState(false);

    const goal = state?.goals.find((g) => g.id === id);

    // A nudge or the dashboard can send us straight here to celebrate.
    useEffect(() => {
        if (params.get("celebrate") === "1" && goal && goal.status === "done") setCelebrateOpen(true);
    }, [params, goal]);

    if (loading && !state) return <p className="text-md text-muted">Opening this goal…</p>;
    if (error) return <Notice tone="danger">{error}</Notice>;
    if (!state) return null;

    if (!goal) {
        return (
            <div>
                <PageTitle title="That goal isn't here" sub="It may have been finished and tidied away, or it may never have been yours to see." area="execute" />
                <Button onClick={() => navigate("/execute/goals")}>
                    <ArrowLeft size={16} /> Back to goals
                </Button>
            </div>
        );
    }

    // `mine` is "may I move this" — ticking a milestone, recording the number.
    // `author` is "may I change what it IS" — a Little or Junior child works a
    // goal a parent set for them; they do not rewrite or delete it.
    const mine = canEditGoal(goal, ctx);
    const author = mine && canCreateGoal(ctx);
    const child = role === "child";
    const ms = milestonesOf(state, goal.id);
    const pct = goalPct(state, goal);
    const mode = effectiveMode(state, goal);
    const metric = metricFor(state, goal.metricRef);
    const history = metricHistory(state, goal.metricRef);
    // A pot in Finance behind this goal: then the number is read, never typed.
    const fund = metric?.source === "finance-fund" ? fundForGoal(goal, funds) : undefined;
    const linked = tasksForGoal(tasks, goal, ms.map((m) => m.id));
    const okrs = okrsForGoal(state, goal.id);
    const cels = celebrationsOf(state, goal.id);
    const share = cels.find((c) => c.id === shareId) ?? null;
    const known = existingTitles(ms);

    const closeCelebrate = () => {
        setCelebrateOpen(false);
        if (params.get("celebrate")) {
            params.delete("celebrate");
            setParams(params, { replace: true });
        }
    };

    /**
     * Ticking the last one finishes the goal — the repo does that — and then
     * the celebration dialog opens, because a family memory that nobody wrote
     * down is not a family memory.
     */
    const toggle = async (m: Milestone) => {
        const wasLast = !m.done && ms.filter((x) => !x.done).length === 1;
        setBusyStep(m.id);
        try {
            await mutate((r) => r.toggleMilestone(m.id, !m.done));
            if (wasLast) setCelebrateOpen(true);
        } finally {
            setBusyStep(null);
        }
    };

    return (
        <div>
            <Link to="/execute/goals" className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-ink">
                <ArrowLeft size={14} aria-hidden="true" /> All goals
            </Link>

            <PageTitle
                title={goal.title}
                sub={goal.description || undefined}
                area="execute"
                actions={
                    author ? (
                        <>
                            <Button variant="outline" size="md" onClick={() => setEditOpen(true)}>
                                <Pencil size={14} /> Edit
                            </Button>
                            {goal.status === "done" && (
                                <Button size="md" onClick={() => setCelebrateOpen(true)}>
                                    Celebrate it
                                </Button>
                            )}
                        </>
                    ) : undefined
                }
            />

            <div className="mb-8 grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-[minmax(0,300px)_1fr]">
                <div className="paper flex items-center gap-5 rounded-xl bg-execute-soft p-5">
                    <Ring pct={pct} size={104} stroke={3} label={`${goal.title}: ${pct}%`}>
                        <span className="font-display text-4xl tabular-nums">{pct}%</span>
                    </Ring>
                    <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5">
                            <PillarTag pillar={goal.pillar} />
                            <StatusTag goal={goal} />
                        </div>
                        <p className="mt-2 text-sm leading-5 text-muted">{MODE_LABEL[mode]}</p>
                        {mode !== "manual" && <p className="mt-0.5 text-xs text-caption">Nobody types this number.</p>}
                    </div>
                </div>

                <dl className="grid grid-cols-2 gap-x-4 gap-y-4 rounded-xl bg-card p-5 sm:grid-cols-4">
                    <div>
                        <dt className="text-xs uppercase tracking-[0.06em] text-caption">Target</dt>
                        <dd className="mt-1 text-md font-medium">
                            <DateText iso={goal.targetDate} />
                        </dd>
                    </div>
                    <div>
                        <dt className="text-xs uppercase tracking-[0.06em] text-caption">Horizon</dt>
                        <dd className="mt-1 text-md font-medium">{HORIZON_LABEL[goal.horizon]}</dd>
                    </div>
                    <div>
                        <dt className="text-xs uppercase tracking-[0.06em] text-caption">Carried by</dt>
                        <dd className="mt-1 flex items-center gap-2 text-md font-medium">
                            <MemberAvatar memberId={goal.ownerMemberId} size="xs" showName />
                        </dd>
                    </div>
                    <div>
                        <dt className="text-xs uppercase tracking-[0.06em] text-caption">Value</dt>
                        <dd className="mt-1 text-md font-medium">{goal.valueLabel || "—"}</dd>
                    </div>
                    <div className="col-span-2 sm:col-span-4">
                        <dt className="text-xs uppercase tracking-[0.06em] text-caption">Who can see it</dt>
                        <dd className="mt-1">
                            <ScopeLine goal={goal} />
                        </dd>
                    </div>
                </dl>
            </div>

            {goal.why && (
                <div className="mb-8 rounded-xl bg-card p-5">
                    <h2 className="mb-1.5 text-xs font-medium uppercase tracking-[0.06em] text-muted">Why it matters</h2>
                    <p className="font-display text-[19px] leading-7">{goal.why}</p>
                </div>
            )}

            {!child && goal.childSafeSummary && goal.scope !== "me" && (
                <p className="mb-8 rounded-lg bg-page px-4 py-3 text-sm leading-5 text-muted">
                    The children see this as <span className="font-semibold text-ink">“{goal.childSafeSummary}”</span> and a percentage — never the title, never the numbers.
                </p>
            )}

            {/* ---- Milestones ------------------------------------------------ */}
            <Section title="Milestones" action={<MilestoneDots milestones={ms} />}>
                {mode === "metric" && ms.length > 0 && (
                    <p className="mb-3 rounded-lg bg-page px-4 py-3 text-sm leading-5 text-muted">
                        These are the steps that move the number. The percentage still comes from {metric?.label ?? "the number"} — adding a step here does not reset it.
                    </p>
                )}
                {ms.length ? (
                    <ul className="rounded-xl bg-card p-1.5">
                        {ms.map((m) => (
                            <li key={m.id} className="flex items-center gap-3 rounded-md px-3 py-2.5 hover:bg-page">
                                <button
                                    type="button"
                                    aria-pressed={m.done}
                                    aria-label={m.done ? `Undo ${m.title}` : `Mark ${m.title} done`}
                                    disabled={!mine || busyStep === m.id}
                                    onClick={() => toggle(m)}
                                    className={cn("grid size-6 shrink-0 place-items-center rounded-full border transition-colors", m.done ? "border-brand bg-brand text-white" : "border-line-strong text-transparent hover:border-ink", !mine && "cursor-default")}
                                >
                                    {busyStep === m.id ? <Spinner className="size-3" /> : <Check size={13} strokeWidth={2.5} />}
                                </button>
                                {editing?.id === m.id ? (
                                    <form
                                        className="flex min-w-0 flex-1 items-center gap-2"
                                        onSubmit={async (e) => {
                                            e.preventDefault();
                                            await mutate((r) => r.updateMilestone(m.id, { title: editTitle.trim() || m.title }));
                                            setEditing(null);
                                        }}
                                    >
                                        <input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="h-9 min-w-0 flex-1 rounded-sm border border-line-strong bg-card px-3 text-md outline-none focus:border-brand" aria-label="Milestone" />
                                        <Button type="submit" size="sm">
                                            Save
                                        </Button>
                                        <IconButton label="Cancel" size="sm" onClick={() => setEditing(null)}>
                                            <X size={14} />
                                        </IconButton>
                                    </form>
                                ) : (
                                    <>
                                        <span className="min-w-0 flex-1">
                                            <span className={cn("block truncate text-md font-medium", m.done && "text-muted line-through")}>{m.title}</span>
                                            <span className="block text-xs text-caption">
                                                {m.done && m.doneAt ? `Done ${shortDate(m.doneAt)}` : m.due ? `Due ${shortDate(m.due)}` : "No date"}
                                            </span>
                                        </span>
                                        {!m.done && (
                                            <Link to={newTaskHref(m.title, goal.id, m.id)} className="shrink-0 text-xs font-semibold text-brand underline-offset-4 hover:underline max-sm:hidden">
                                                Make it a task
                                            </Link>
                                        )}
                                        {author && (
                                            <>
                                                <IconButton
                                                    label={`Rename ${m.title}`}
                                                    size="sm"
                                                    onClick={() => {
                                                        setEditing(m);
                                                        setEditTitle(m.title);
                                                    }}
                                                >
                                                    <Pencil size={13} />
                                                </IconButton>
                                                <IconButton label={`Remove ${m.title}`} size="sm" onClick={() => setRemoveStep(m)}>
                                                    <Trash2 size={13} />
                                                </IconButton>
                                            </>
                                        )}
                                    </>
                                )}
                            </li>
                        ))}
                    </ul>
                ) : (
                    <EmptyState title="No milestones yet" body={author ? "Three or four is usually right. They are what turns a wish into progress." : "A parent hasn't broken this one down yet."} />
                )}

                {author && (
                    <form
                        className="mt-3 flex flex-wrap items-end gap-2"
                        onSubmit={async (e) => {
                            e.preventDefault();
                            if (!newStep.trim()) return;
                            await mutate((r) => r.addMilestone(goal.id, newStep, newDue || null));
                            setNewStep("");
                            setNewDue("");
                        }}
                    >
                        <Field className="min-w-0 flex-1" label="Add a milestone" value={newStep} onChange={(e) => setNewStep(e.target.value)} placeholder="Complete the medical forms" />
                        <Field className="w-44" label="By" type="date" value={newDue} onChange={(e) => setNewDue(e.target.value)} />
                        <Button type="submit" className="mb-0.5">
                            <Plus size={16} /> Add
                        </Button>
                    </form>
                )}

                {author && !child && (
                    <div className="mt-4 rounded-xl bg-card p-5">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                                <h3 className="font-display text-xl leading-6">Break it down</h3>
                                <p className="mt-1 max-w-md text-sm leading-5 text-muted">The companion proposes the next steps. You add the ones that are true — it never writes anything itself.</p>
                            </div>
                            <Button
                                variant="outline"
                                size="md"
                                disabled={!aiAvailable || aiBusy}
                                onClick={async () => {
                                    setAiErr(null);
                                    try {
                                        const r = await ask<{ tasks?: Array<{ title?: unknown; dueInDays?: unknown; note?: unknown }> }>({
                                            action: "suggest-tasks",
                                            prompt: breakDownPrompt(goal),
                                            payload: { goalId: goal.id, goalTitle: goal.title, targetDate: goal.targetDate },
                                            extraContext: goalContext(state, goal),
                                        });
                                        if (r.unavailable) {
                                            setAiErr(r.unavailable);
                                            return;
                                        }
                                        setSuggestions(parseSuggestions(r).filter((sug) => !known.has(sug.title.toLowerCase())));
                                    } catch (e) {
                                        setAiErr(e instanceof Error ? e.message : "The companion couldn't answer.");
                                    }
                                }}
                            >
                                {aiBusy ? <Spinner /> : <Sparkles size={15} />} Suggest steps
                            </Button>
                        </div>
                        {aiErr && <p className="mt-3 text-sm text-danger-ink">{aiErr}</p>}
                        {suggestions.length > 0 && (
                            <ul className="mt-4 flex flex-col gap-2">
                                {suggestions.map((sug, i) => (
                                    <li key={`${sug.title}-${i}`} className="flex flex-wrap items-center gap-2 rounded-md bg-page px-3 py-2.5">
                                        <span className="min-w-0 flex-1 text-md">
                                            {sug.title}
                                            {sug.inDays != null && <span className="ml-2 text-xs text-caption">in {sug.inDays} days</span>}
                                        </span>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={async () => {
                                                await mutate((r) => r.addMilestone(goal.id, sug.title, dueFrom(today, sug.inDays, 14)));
                                                setSuggestions(suggestions.filter((_, n) => n !== i));
                                            }}
                                        >
                                            Add as milestone
                                        </Button>
                                        <Link to={newTaskHref(sug.title, goal.id)} className="text-xs font-semibold text-brand underline-offset-4 hover:underline">
                                            Make it a task
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        )}
                        {!aiAvailable && <p className="mt-3 text-xs text-caption">The companion needs the backend configured for this build.</p>}
                    </div>
                )}
            </Section>

            {/* ---- The measured number --------------------------------------- */}
            {metric && (
                <Section title="The number">
                    <div className="rounded-xl bg-card p-5">
                        <div className="flex flex-wrap items-end justify-between gap-4">
                            <div>
                                <p className="text-xs uppercase tracking-[0.06em] text-caption">{metric.label}</p>
                                <p className="mt-1 font-display text-6xl leading-9">{metricText(metric, space.currency)}</p>
                                <p className="mt-0.5 text-xs text-caption">Last read {shortDate(metric.at)} · from {metric.source === "finance-fund" ? "Finance" : metric.source === "books" ? "the shelf" : "here"}</p>
                            </div>
                            {fund && (
                                <div className="max-w-xs">
                                    <p className="text-sm leading-5 text-muted">
                                        Read straight from <span className="font-semibold text-ink">{fund.label || fund.name || "the pot"}</span> in Finance. Move money into the pot and this moves with it — nobody types it here.
                                    </p>
                                    <Link to="/live/finance/budgets" className="mt-1.5 inline-block text-sm font-semibold text-brand underline-offset-4 hover:underline">
                                        Open the pot in Finance
                                    </Link>
                                </div>
                            )}
                            {mine && !fund && (
                                <form
                                    className="flex items-end gap-2"
                                    onSubmit={async (e) => {
                                        e.preventDefault();
                                        const raw = Number(reading);
                                        if (!Number.isFinite(raw)) return;
                                        await mutate((r) => r.recordMetric(metric.ref, metric.unit === "cents" ? Math.round(raw * 100) : raw));
                                        setReading("");
                                    }}
                                >
                                    <Field
                                        className="w-44"
                                        label={metric.unit === "cents" ? `New total (${space.currency})` : "New total"}
                                        type="number"
                                        step="any"
                                        min="0"
                                        value={reading}
                                        onChange={(e) => setReading(e.target.value)}
                                        placeholder={metric.unit === "cents" ? String(Math.round(metric.current / 100)) : String(metric.current)}
                                    />
                                    <Button type="submit" className="mb-0.5">
                                        Record it
                                    </Button>
                                </form>
                            )}
                        </div>
                        {history.length > 1 && (
                            <ul className="mt-5 flex items-end gap-1.5" aria-label="How the number has moved">
                                {history.slice(-12).map((h) => (
                                    <li key={h.id} className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
                                        <span
                                            className="w-full rounded-t-[3px] bg-brand"
                                            style={{ height: `${Math.max(4, Math.round((h.current / Math.max(1, h.target)) * 64))}px` }}
                                            title={`${shortDate(h.at)}: ${h.unit === "cents" ? money(h.current, space.currency) : h.current}`}
                                        />
                                        <span className="w-full truncate text-center text-[10px] text-caption">{shortDate(h.at)}</span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </Section>
            )}

            {/* ---- Typed progress, when there is nothing to count or measure -- */}
            {mode === "manual" && mine && goal.status !== "done" && (
                <Section title="How far along">
                    <form
                        className="rounded-xl bg-card p-5"
                        onSubmit={async (e) => {
                            e.preventDefault();
                            setSavingPct(true);
                            try {
                                await mutate((r) => r.setManualPct(goal.id, typed ?? pct));
                                setTyped(null);
                            } finally {
                                setSavingPct(false);
                            }
                        }}
                    >
                        <p className="max-w-lg text-sm leading-5 text-muted">
                            Nothing to count and nothing to measure on this one, so it is yours to say. Add a milestone or link a number and this box goes away — the percentage counts itself from then on.
                        </p>
                        <div className="mt-4 flex flex-wrap items-center gap-4">
                            <input
                                type="range"
                                min={0}
                                max={100}
                                step={5}
                                value={typed ?? pct}
                                aria-label={`How far along ${goal.title} is, as a percentage`}
                                onChange={(e) => setTyped(Number(e.target.value))}
                                className="h-2 min-w-[200px] flex-1 cursor-pointer appearance-none rounded-full bg-page accent-brand"
                            />
                            <span className="w-14 shrink-0 text-right font-display text-3xl tabular-nums">{typed ?? pct}%</span>
                            <Button type="submit" loading={savingPct} disabled={(typed ?? pct) === pct}>
                                Save it
                            </Button>
                        </div>
                    </form>
                </Section>
            )}

            {/* ---- Linked work ----------------------------------------------- */}
            <Section
                title="The work underneath"
                action={
                    <Link to={newTaskHref(goal.title, goal.id)} className="text-sm font-semibold text-brand underline-offset-4 hover:underline">
                        Add a task
                    </Link>
                }
            >
                {linked.length ? (
                    <ul className="rounded-xl bg-card p-1.5">
                        {linked.slice(0, 12).map((t) => (
                            <li key={t.id} className="flex items-center gap-3 rounded-md px-3 py-2.5">
                                <span className={cn("grid size-6 shrink-0 place-items-center rounded-full border", t.done || t.status === "done" ? "border-brand bg-brand text-white" : "border-line-strong text-transparent")} aria-hidden="true">
                                    <Check size={13} strokeWidth={2.5} />
                                </span>
                                <span className="min-w-0 flex-1">
                                    <span className={cn("block truncate text-md font-medium", (t.done || t.status === "done") && "text-muted line-through")}>{t.title}</span>
                                    {t.dueAt && <span className="block text-xs text-caption">Due {shortDate(t.dueAt)}</span>}
                                </span>
                                <MemberAvatar memberId={t.assigneeMemberId ?? t.memberId ?? null} size="xs" />
                            </li>
                        ))}
                    </ul>
                ) : (
                    <EmptyState title="No tasks point at this goal yet" body="A goal with no tasks under it is a wish. Add one and it shows up on somebody's day." />
                )}
            </Section>

            {/* ---- The quarter ----------------------------------------------- */}
            {okrs.length > 0 && (
                <Section title="On the roadmap">
                    <ul className="grid grid-cols-[minmax(0,1fr)] gap-3 md:grid-cols-2">
                        {okrs.map((o) => (
                            <li key={o.id}>
                                <Link to={`/execute/goals/roadmap?q=${o.quarter}`} className="flex h-full flex-col rounded-xl bg-card p-4 transition-shadow hover:shadow-hover">
                                    <Tag tone="execute">{quarterLabel(o.quarter)}</Tag>
                                    <span className="mt-2 text-base font-semibold leading-5">{o.objective}</span>
                                    <span className="mt-1 text-xs tabular-nums text-caption">{okrPct(state, o)}% of its key results</span>
                                </Link>
                            </li>
                        ))}
                    </ul>
                </Section>
            )}

            {/* ---- Celebrations ---------------------------------------------- */}
            {cels.length > 0 && (
                <Section title="How it felt">
                    <ul className="grid grid-cols-[minmax(0,1fr)] gap-3 md:grid-cols-2">
                        {cels.map((c) => (
                            <li key={c.id} className="overflow-hidden rounded-xl bg-card">
                                {c.photoUrl && <img src={c.photoUrl} alt="" width={640} height={200} loading="lazy" className="h-36 w-full object-cover" />}
                                <div className="p-4">
                                    <p className="font-display text-xl leading-6">{c.cardLine}</p>
                                    <p className="mt-1.5 text-xs text-caption">{shortDate(c.date)}</p>
                                    {c.reflection && <p className="mt-2.5 text-sm leading-5 text-muted">{c.reflection}</p>}
                                    <Button variant="ghost" size="sm" className="mt-3 -ml-3" onClick={() => setShareId(c.id)}>
                                        Make a card
                                    </Button>
                                </div>
                            </li>
                        ))}
                    </ul>
                </Section>
            )}

            {/* ---- Status and danger ----------------------------------------- */}
            {author && (
                <Section title="This goal">
                    <div className="flex flex-wrap items-center gap-2 rounded-xl bg-card p-4">
                        {STATUSES.map((s) => (
                            <button
                                key={s}
                                type="button"
                                aria-pressed={goal.status === s}
                                onClick={() => mutate((r) => r.setStatus(goal.id, s))}
                                className={cn("rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors", goal.status === s ? "border-ink bg-ink text-white" : "border-line-strong text-muted hover:text-ink")}
                            >
                                {STATUS_LABEL[s]}
                            </button>
                        ))}
                        <span className="ml-auto text-xs text-caption">Last moved {shortDate(isoDate(lastProgressAt(state, goal)))}</span>
                        <Button variant="danger" size="md" onClick={() => setRemoveGoal(true)}>
                            <Trash2 size={14} /> Delete
                        </Button>
                    </div>
                </Section>
            )}

            <GoalDialog
                open={editOpen}
                onClose={() => setEditOpen(false)}
                state={state}
                goal={goal}
                onSave={async (input) => {
                    await mutate((r) =>
                        r.updateGoal(goal.id, {
                            title: input.title,
                            childSafeSummary: input.childSafeSummary,
                            scope: input.scope,
                            ownerMemberId: input.ownerMemberId,
                            pillar: input.pillar,
                            valueLabel: input.valueLabel,
                            horizon: input.horizon,
                            targetDate: input.targetDate,
                            description: input.description,
                            why: input.why,
                            progressMode: input.progressMode,
                            metricRef: input.metricRef ?? null,
                            visibility: input.visibility,
                            sharedWith: input.sharedWith ?? [],
                        }),
                    );
                }}
            />

            <CelebrateDialog
                open={celebrateOpen}
                onClose={closeCelebrate}
                goal={goal}
                onSave={async (input) => {
                    await mutate((r) => r.celebrate(goal.id, input));
                    // The family timeline: everyone who was part of it hears about it.
                    await mutateCore(async (core) => {
                        for (const memberId of input.memberIds) {
                            await core.notify({
                                memberId,
                                kind: "celebrate",
                                title: `${goal.title} — done`,
                                body: input.cardLine,
                                href: `/execute/goals/${goal.id}`,
                            });
                        }
                    });
                }}
            />

            <ShareCardDialog open={Boolean(share)} onClose={() => setShareId(null)} celebration={share} goalTitle={goal.title} />

            <Confirm
                open={Boolean(removeStep)}
                title="Remove this milestone?"
                body={removeStep?.title}
                confirmLabel="Remove"
                danger
                onClose={() => setRemoveStep(null)}
                onConfirm={async () => {
                    if (removeStep) await mutate((r) => r.removeMilestone(removeStep.id));
                }}
            />

            <Confirm
                open={removeGoal}
                title="Delete this goal?"
                body="Its milestones and celebrations go with it. There is no undo."
                confirmLabel="Delete"
                danger
                onClose={() => setRemoveGoal(false)}
                onConfirm={async () => {
                    await mutate((r) => r.removeGoal(goal.id));
                    navigate("/execute/goals");
                }}
            />
        </div>
    );
}
