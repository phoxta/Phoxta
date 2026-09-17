import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Flag, Plus, Sparkles } from "lucide-react";
import { cn } from "@/lib/cn";
import { useAi } from "@/lib/ai";
import { useData } from "@/state/data";
import { useSpace } from "@/state/space";
import { EmptyModule, MoreLink, Notice, PageTitle, Section } from "@/components/shared";
import { Ring } from "@/components/ui/charts";
import { Button, EmptyState, Spinner, Tag } from "@/components/ui/primitives";
import { activeGoals, byPillar, connectionSample, connectionSeries, familyGoals, goalsFor, ourFuturePct, quarterOf } from "../derive";
import { useGoals, useLinkedTasks } from "../live";
import { firstGoalsPrompt, guessPillar, parseGoalTitles } from "../ai";
import type { GoalScope, GoalStatus, NewGoal, Pillar } from "../types";
import { PILLARS, PILLAR_LABEL, SCOPE_LABEL } from "../types";
import { ChildGoalCard, GoalCard, GoalsNav, PillarBars } from "../components/pieces";
import { GoalDialog } from "../components/GoalDialog";
import { ShareCardDialog } from "../components/Celebrate";
import { CelebrationList, ConnectionPanel, StallPanel, SundayPanel } from "../components/Panels";

/**
 * Goals — the family's own list.
 *
 * A parent gets the whole thing: "Our Future" and the roll-up by pillar, the
 * week's three from Sunday planning, everything active, what has stalled, the
 * nightly connection metrics and the celebrate archive. A child gets their own
 * goals in full and the family's in the family's child-safe words. A guest sees
 * only what a parent granted, read-only.
 */

const STATUSES: Array<{ v: GoalStatus | "all"; label: string }> = [
    { v: "active", label: "Active" },
    { v: "all", label: "Everything" },
    { v: "done", label: "Finished" },
    { v: "paused", label: "Paused" },
];

export default function GoalsPage() {
    const { state, mutate, loading, error } = useGoals();
    const { ctx } = useData();
    const { me, role, can, space, today } = useSpace();
    const tasks = useLinkedTasks();

    const [status, setStatus] = useState<GoalStatus | "all">("active");
    const [scope, setScope] = useState<GoalScope | "all">("all");
    const [pillar, setPillar] = useState<Pillar | "all">("all");
    const [addOpen, setAddOpen] = useState(false);
    const [addDefaults, setAddDefaults] = useState<Partial<NewGoal> | undefined>(undefined);
    const [shareId, setShareId] = useState<string | null>(null);
    const [firstGoals, setFirstGoals] = useState<string[]>([]);
    const [aiErr, setAiErr] = useState<string | null>(null);
    const { ask, busy: aiBusy, available: aiAvailable } = useAi();

    const parent = can("goals.manage");
    const child = role === "child";
    const guest = role === "guest";

    // The "nightly" connection snapshot. In the demo this is the nightly job:
    // once a day, when the Tasks slice is loaded, a parent's session stores it.
    const recorded = useRef<string | null>(null);
    useEffect(() => {
        if (!state || !parent || recorded.current === today) return;
        if (state.connection.some((c) => c.date === today)) {
            recorded.current = today;
            return;
        }
        recorded.current = today;
        const sample = connectionSample(state, tasks, today);
        void mutate((r) => r.recordConnection(sample)).catch(() => {
            /* a metric that fails to store is never worth an error on screen */
        });
    }, [state, parent, today, tasks, mutate]);

    const filtered = useMemo(() => {
        if (!state) return [];
        return state.goals
            .filter((g) => (status === "all" ? true : g.status === status))
            .filter((g) => (scope === "all" ? true : g.scope === scope))
            .filter((g) => (pillar === "all" ? true : g.pillar === pillar))
            .sort((a, b) => {
                const rank = { active: 0, paused: 1, done: 2 } as const;
                return rank[a.status] - rank[b.status] || a.targetDate.localeCompare(b.targetDate);
            });
    }, [state, status, scope, pillar]);

    if (loading && !state) return <p className="text-md text-muted">Opening the family's goals…</p>;
    if (error) return <Notice tone="danger">{error}</Notice>;
    if (!state) return null;

    const share = state.celebrations.find((c) => c.id === shareId) ?? null;
    const shareGoal = share ? state.goals.find((g) => g.id === share.goalId) : undefined;

    // ---- Guest: only what was granted, read-only ----------------------------
    if (guest) {
        return (
            <div>
                <PageTitle title="What this family is working towards" sub="Shared with you by the family. You can see how far along things are — nothing else in here is yours to open." area="execute" />
                {state.goals.length ? (
                    <ul className="grid grid-cols-[minmax(0,1fr)] gap-3 md:grid-cols-2">
                        {state.goals.map((g) => (
                            <GoalCard key={g.id} state={state} goal={g} />
                        ))}
                    </ul>
                ) : (
                    <EmptyState icon={<Flag size={20} aria-hidden="true" />} title="Nothing has been shared with you" body="Goals are private to the family unless a parent chooses otherwise." />
                )}
                {state.celebrations.length > 0 && (
                    <Section title="Worth celebrating" className="mt-8">
                        <CelebrationList state={state} onShare={setShareId} />
                    </Section>
                )}
                <ShareCardDialog open={Boolean(share)} onClose={() => setShareId(null)} celebration={share} goalTitle={shareGoal?.title ?? "A family goal"} />
            </div>
        );
    }

    // ---- Child: mine, then ours, in the family's own words ------------------
    if (child) {
        const mine = goalsFor(state, me.id);
        const family = familyGoals(state).filter((g) => g.status === "active");
        const canAdd = me.ageBand === "teen" || me.ageBand === "young-adult";
        return (
            <div>
                <PageTitle
                    title="Your goals"
                    sub={canAdd ? "Yours to set and yours to finish. The family's goals are here too, in a line you can read." : "What you're working on, and what the family is working on together."}
                    area="execute"
                    actions={
                        canAdd ? (
                            <Button
                                onClick={() => {
                                    setAddDefaults({ scope: "me", ownerMemberId: me.id, visibility: "shared", sharedWith: ctx.members.filter((m) => m.role === "parent").map((m) => m.id) });
                                    setAddOpen(true);
                                }}
                            >
                                <Plus size={16} /> A goal of my own
                            </Button>
                        ) : undefined
                    }
                />
                <Section title="Mine">
                    {mine.length ? (
                        <ul className="grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-2">
                            {mine.map((g) => (
                                <ChildGoalCard key={g.id} state={state} goal={g} mine />
                            ))}
                        </ul>
                    ) : (
                        <EmptyState
                            icon={<Flag size={20} aria-hidden="true" />}
                            title="No goals of your own yet"
                            body={canAdd ? "Pick one thing you want to be true by Christmas, and give it three steps." : "A parent will set one with you."}
                        />
                    )}
                </Section>
                {family.length > 0 && (
                    <Section title="What we're doing together">
                        <ul className="grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-2">
                            {family.map((g) => (
                                <ChildGoalCard key={g.id} state={state} goal={g} mine={false} />
                            ))}
                        </ul>
                    </Section>
                )}
                {state.celebrations.length > 0 && (
                    <Section title="Things we finished">
                        <CelebrationList state={state} onShare={setShareId} />
                    </Section>
                )}
                <GoalDialog
                    open={addOpen}
                    onClose={() => setAddOpen(false)}
                    state={state}
                    defaults={addDefaults}
                    onSave={async (input) => {
                        await mutate((r) => r.addGoal(input));
                    }}
                />
                <ShareCardDialog open={Boolean(share)} onClose={() => setShareId(null)} celebration={share} goalTitle={shareGoal?.title ?? "A family goal"} />
            </div>
        );
    }

    // ---- Parent -------------------------------------------------------------
    const future = ourFuturePct(state);
    const rollup = byPillar(state);
    const sunday = state.reviews.filter((r) => r.kind === "sunday").sort((a, b) => b.period.localeCompare(a.period))[0];
    const isPlanningDay = new Date(`${today}T00:00:00`).getDay() === space.planningDay % 7;
    const series = connectionSeries(state, 14);
    const todaySample = state.connection.find((c) => c.date === today) ?? (tasks.length ? connectionSample(state, tasks, today) : null);
    const empty = state.goals.length === 0;

    return (
        <div>
            <PageTitle
                title="Goals & vision"
                sub="What we said mattered, and what is actually moving. Progress here is counted or measured — almost never typed."
                area="execute"
                actions={
                    <>
                        <Link
                            to="/execute/goals/roadmap"
                            className="inline-flex h-11 items-center justify-center rounded-full border border-line-strong bg-card px-5 text-md font-semibold transition-colors hover:border-ink max-sm:hidden"
                        >
                            The roadmap
                        </Link>
                        <Button
                            onClick={() => {
                                setAddDefaults(undefined);
                                setAddOpen(true);
                            }}
                        >
                            <Plus size={16} /> New goal
                        </Button>
                    </>
                }
            />
            <GoalsNav />

            {empty ? (
                <div className="rounded-xl bg-execute-soft p-6">
                    <h2 className="font-display text-4xl leading-8 text-execute-ink">Start from what you already believe</h2>
                    <p className="mt-2 max-w-xl text-md leading-6 text-muted">
                        Your values are {space.values.join(", ")}. The companion can propose three first goals drawn from them — you keep the ones that are true and bin the rest.
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2">
                        <Button
                            disabled={!aiAvailable || aiBusy}
                            onClick={async () => {
                                setAiErr(null);
                                try {
                                    const r = await ask({ action: "ask", prompt: firstGoalsPrompt(space.values, space.mission) });
                                    if (r.unavailable) {
                                        setAiErr(r.unavailable);
                                        return;
                                    }
                                    setFirstGoals(parseGoalTitles(r));
                                } catch (e) {
                                    setAiErr(e instanceof Error ? e.message : "The companion couldn't answer.");
                                }
                            }}
                        >
                            {aiBusy ? <Spinner /> : <Sparkles size={16} />} Suggest three from our values
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() => {
                                setAddDefaults(undefined);
                                setAddOpen(true);
                            }}
                        >
                            Write one myself
                        </Button>
                    </div>
                    {aiErr && <p className="mt-3 text-sm text-danger-ink">{aiErr}</p>}
                    {firstGoals.length > 0 && (
                        <ul className="mt-4 flex flex-col gap-2">
                            {firstGoals.map((t) => (
                                <li key={t} className="flex items-center gap-3 rounded-md bg-card px-3 py-2.5">
                                    <span className="min-w-0 flex-1 text-md">{t}</span>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => {
                                            setAddDefaults({ title: t, pillar: guessPillar(t), scope: "family", horizon: "year" });
                                            setAddOpen(true);
                                        }}
                                    >
                                        Use it
                                    </Button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            ) : (
                <>
                    <section className="mb-8 grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-[minmax(0,320px)_1fr]">
                        <div className="paper flex items-center gap-5 rounded-xl bg-execute-soft p-5">
                            <Ring pct={future} size={104} stroke={3} label={`Our Future: ${future}%`}>
                                <span className="font-display text-4xl tabular-nums">{future}%</span>
                            </Ring>
                            <div className="min-w-0">
                                <h2 className="font-display text-2xl leading-7 text-execute-ink">Our Future</h2>
                                <p className="mt-1 text-sm leading-5 text-muted">
                                    {activeGoals(state).length} goals in play across {rollup.length} pillars.
                                </p>
                                <MoreLink to="/execute/goals/blueprint">Read the blueprint</MoreLink>
                            </div>
                        </div>
                        <div className="rounded-xl bg-card p-5">
                            <h2 className="mb-4 font-display text-2xl leading-7">By pillar</h2>
                            {rollup.length ? <PillarBars rows={rollup} /> : <p className="text-sm text-muted">Nothing active yet.</p>}
                        </div>
                    </section>

                    <div className="mb-8">
                        <SundayPanel
                            state={state}
                            review={sunday}
                            isPlanningDay={isPlanningDay}
                            canEdit={parent}
                            onSave={async (notes, ids) => {
                                await mutate((r) => r.saveReview({ kind: "sunday", period: today, notes, focusGoalIds: ids }));
                            }}
                        />
                    </div>

                    <Section
                        title="Every goal"
                        action={
                            <Link to="/execute/goals/roadmap" className="text-sm font-semibold text-brand underline-offset-4 hover:underline">
                                {quarterOf(today)} roadmap
                            </Link>
                        }
                    >
                        <div className="no-scrollbar -mx-5 mb-4 flex gap-2 overflow-x-auto px-5 md:mx-0 md:px-0">
                            {STATUSES.map((s) => (
                                <button
                                    key={s.v}
                                    type="button"
                                    aria-pressed={status === s.v}
                                    onClick={() => setStatus(s.v)}
                                    className={cn("shrink-0 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors", status === s.v ? "border-ink bg-ink text-white" : "border-line-strong text-muted hover:text-ink")}
                                >
                                    {s.label}
                                </button>
                            ))}
                            <span className="w-px shrink-0 bg-line" aria-hidden="true" />
                            <select value={scope} onChange={(e) => setScope(e.target.value as GoalScope | "all")} className="h-8 shrink-0 rounded-full border border-line-strong bg-card px-3 text-sm outline-none focus:border-brand" aria-label="Whose goals">
                                <option value="all">Everyone's</option>
                                {(["family", "us", "me"] as GoalScope[]).map((v) => (
                                    <option key={v} value={v}>
                                        {SCOPE_LABEL[v]}
                                    </option>
                                ))}
                            </select>
                            <select value={pillar} onChange={(e) => setPillar(e.target.value as Pillar | "all")} className="h-8 shrink-0 rounded-full border border-line-strong bg-card px-3 text-sm outline-none focus:border-brand" aria-label="Pillar">
                                <option value="all">Every pillar</option>
                                {PILLARS.map((p) => (
                                    <option key={p} value={p}>
                                        {PILLAR_LABEL[p]}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {filtered.length ? (
                            <ul className="grid grid-cols-[minmax(0,1fr)] gap-3 md:grid-cols-2 xl:grid-cols-3">
                                {filtered.map((g) => (
                                    <GoalCard key={g.id} state={state} goal={g} />
                                ))}
                            </ul>
                        ) : (
                            <EmptyModule title="Nothing under that filter" body="Try 'Everything', or start a new goal." action={<Button onClick={() => setAddOpen(true)}>New goal</Button>} />
                        )}
                    </Section>

                    <div className="mb-8 grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-2">
                        <StallPanel state={state} />
                        <ConnectionPanel series={series} today={todaySample} />
                    </div>

                    <Section title="Worth celebrating" action={<Tag tone="ok">{state.celebrations.length}</Tag>}>
                        <CelebrationList state={state} onShare={setShareId} />
                    </Section>
                </>
            )}

            <GoalDialog
                open={addOpen}
                onClose={() => setAddOpen(false)}
                state={state}
                defaults={addDefaults}
                onSave={async (input) => {
                    await mutate((r) => r.addGoal(input));
                }}
            />
            <ShareCardDialog open={Boolean(share)} onClose={() => setShareId(null)} celebration={share} goalTitle={shareGoal?.title ?? "A family goal"} />
        </div>
    );
}
