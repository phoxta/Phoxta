import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Gift, PiggyBank, Plus, Receipt, Sparkles, Wallet } from "lucide-react";
import { cn } from "@/lib/cn";
import { useAi } from "@/lib/ai";
import { money } from "@/lib/format";
import { useModule, useModuleState } from "@/state/data";
import { useSpace } from "@/state/space";
import { useToast } from "@/state/toast";
import { MemberAvatar, Money, MoreLink, Notice, PageTitle, Section, Stat } from "@/components/shared";
import { Ring } from "@/components/ui/charts";
import { Button, EmptyState, Spinner, Tag } from "@/components/ui/primitives";
import financeModule from "../module";
import {
    BASE,
    approvalsFor,
    billsDueWithin,
    billsOverdue,
    daysLeftInMonth,
    givingYear,
    monthLabel,
    monthOf,
    monthSeries,
    monthSummary,
    requiredApprovals,
} from "../derive";
import { BudgetBar, CategoryChart, FinanceNav, InOutChart, MoneyIsPrivate, MonthPicker, WishStatusTag } from "../components/pieces";
import { LockStrip, ReauthDialog, useMoneyGuard } from "../components/reauth";
import { EntryDialog } from "../components/EntryDialog";

/**
 * The month at a glance.
 *
 * Ordered the way a parent actually asks the questions: what came in and what
 * is left, then anything that needs a decision, then where it went, then what
 * we are building towards. A member with only `finance.view` (Dami, fifteen)
 * gets the top half and nothing else — budgets and pots, never a ledger row.
 */

interface LinkedGoal {
    id: string;
    title?: string;
}

export default function FinancePage() {
    const { state, repo, mutate, loading, error } = useModule(financeModule);
    const { me, role, space, today } = useSpace();
    const { toast } = useToast();
    const goalsSlice = useModuleState<{ goals?: LinkedGoal[] }>("goals");
    const guard = useMoneyGuard(repo);
    const [month, setMonth] = useState(() => monthOf(today));
    const [addOpen, setAddOpen] = useState(false);
    const [tick, setTick] = useState(0);
    const [answer, setAnswer] = useState<{ q: string; text: string } | null>(null);
    const [aiErr, setAiErr] = useState<string | null>(null);
    const { ask, busy: aiBusy, available: aiAvailable } = useAi();
    const checked = useRef(false);

    const parent = role === "parent";

    // The month's alerts are checked once per visit: firing is idempotent, so a
    // second visit adds nothing (AC 1).
    useEffect(() => {
        if (!state?.visible || !parent || checked.current) return;
        checked.current = true;
        void mutate((r) => r.runBudgetAlerts(monthOf(today))).catch(() => {
            /* an alert that fails to store is never worth an error on screen */
        });
    }, [state?.visible, parent, mutate, today]);

    // A read-only viewer receives totals, not entries: her month is the one the
    // repo summarised, and nothing here recomputes it from a ledger she has not
    // been given.
    const summary = useMemo(() => (state ? (state.visible ? monthSummary(state, month) : state.summary) : null), [state, month]);
    const series = useMemo(() => (state ? monthSeries(state, monthOf(today), 6) : []), [state, today]);

    if (loading && !state) return <p className="text-md text-muted">Opening the family&rsquo;s accounts…</p>;
    if (error) return <Notice tone="danger">{error}</Notice>;
    if (!state || !summary) return null;

    // ---- Nobody else's business --------------------------------------------
    if (!state.visible && !state.mine.canViewBudget) return <MoneyIsPrivate mine={state.mine.wishes.length} />;

    const year = givingYear(state, today);
    const readOnly = !state.visible;
    const isThisMonth = month === monthOf(today);
    const overdue = billsOverdue(state.bills, today);
    const soon = billsDueWithin(state.bills, today, 7);
    const waiting = state.wishes.filter((w) => w.status === "requested");

    const askCompanion = async (q: string) => {
        setAiErr(null);
        setAnswer(null);
        try {
            const r = await ask({
                action: "ask",
                prompt: q,
                extraContext: `Ledger month ${summary.label}: in ${money(summary.incomeCents, space.currency)}, out ${money(summary.spentCents, space.currency)}, plan ${money(summary.budgetCents, space.currency)}. ${summary.categories
                    .filter((c) => c.budgetCents > 0)
                    .map((c) => `${c.name} ${money(c.spentCents, space.currency)}/${money(c.budgetCents, space.currency)}`)
                    .join("; ")}.`,
            });
            if (r.unavailable) setAiErr(r.unavailable);
            else setAnswer({ q, text: r.text });
        } catch {
            setAiErr("The companion couldn't answer just now.");
        }
    };

    return (
        <div>
            <PageTitle
                title="Household finances"
                sub={
                    readOnly
                        ? "The family budget, read-only — what we plan and what we've spent. The detail behind it stays with Mum and Dad."
                        : "What came in, what went out, what we gave and what we put away. Every number here is added up from the ledger, never typed."
                }
                area="live"
                actions={
                    parent ? (
                        <Button onClick={() => setAddOpen(true)}>
                            <Plus size={16} aria-hidden="true" /> Add an entry
                        </Button>
                    ) : undefined
                }
            />

            <FinanceNav readOnly={readOnly} />
            {parent && <LockStrip repo={repo} onLock={() => setTick(tick + 1)} />}

            <div className="mb-5 mt-5 flex flex-wrap items-center justify-between gap-3">
                <MonthPicker month={month} onChange={setMonth} today={today} />
                {isThisMonth && <span className="text-xs text-caption">{daysLeftInMonth(today)} days left in the month</span>}
            </div>

            <div className="mb-8 grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Stat label="Came in" value={<Money cents={summary.incomeCents} />} sub={monthLabel(month, false)} tone="ok" />
                <Stat label="Went out" value={<Money cents={summary.spentCents} />} sub={`of a ${money(summary.budgetCents, space.currency)} plan`} />
                <Stat
                    label="Left in the plan"
                    value={<Money cents={Math.max(0, summary.leftCents)} />}
                    sub={summary.leftCents < 0 ? `${money(-summary.leftCents, space.currency)} over` : "still unspent"}
                    tone={summary.leftCents < 0 ? "danger" : "neutral"}
                />
                <Stat label="Given" value={<Money cents={summary.givingCents} />} sub={`${summary.givingPct}% of what came in`} tone="live" />
            </div>

            {!readOnly && (overdue.length > 0 || waiting.length > 0) && (
                <Section title="Needs a decision">
                    <ul className="grid grid-cols-[minmax(0,1fr)] gap-3 md:grid-cols-2">
                        {overdue.map((b) => (
                            <li key={b.id}>
                                <Link
                                    to={`${BASE}/bills`}
                                    className={cn("flex h-full items-start gap-3 rounded-lg border px-4 py-3.5 transition-shadow hover:shadow-hover", b.parked ? "border-danger/30 bg-danger-soft text-danger-ink" : "border-peach/30 bg-peach-soft text-peach")}
                                >
                                    <Receipt size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
                                    <span className="min-w-0">
                                        <span className="block text-md font-semibold">
                                            {b.parked ? "Parked: " : ""}
                                            {b.name} — {money(b.amountCents, space.currency)}
                                        </span>
                                        <span className="mt-0.5 block text-sm leading-5 opacity-90">
                                            {b.parked ? "Three reminders have gone out. It needs a decision, not a fourth." : `Was due on the ${Number(b.dueDate.slice(8))}.`}
                                        </span>
                                    </span>
                                </Link>
                            </li>
                        ))}
                        {waiting.map((w) => {
                            const given = approvalsFor(state, w.id).length;
                            const need = requiredApprovals(state, w);
                            return (
                                <li key={w.id}>
                                    <Link to={`${BASE}/purchases`} className="flex h-full items-start gap-3 rounded-lg border border-brand/20 bg-brand-soft px-4 py-3.5 text-brand-ink transition-shadow hover:shadow-hover">
                                        <Sparkles size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
                                        <span className="min-w-0">
                                            <span className="block text-md font-semibold">
                                                {w.name} — {money(w.priceCents, space.currency)}
                                            </span>
                                            <span className="mt-0.5 block text-sm leading-5 opacity-90">
                                                {need === 2 ? `Over ${money(state.settings.approvalThresholdCents, space.currency)} — ${given} of 2 approvals.` : "Waiting on a parent."}
                                            </span>
                                        </span>
                                    </Link>
                                </li>
                            );
                        })}
                    </ul>
                </Section>
            )}

            <Section title="Budgets" action={<MoreLink to={`${BASE}/budgets`} />}>
                <ul className="grid grid-cols-[minmax(0,1fr)] gap-3 md:grid-cols-2">
                    {summary.categories
                        .filter((c) => c.budgetCents > 0)
                        .sort((a, b) => b.pct - a.pct)
                        .slice(0, 6)
                        .map((c) => (
                            <BudgetBar key={c.categoryId} c={c} />
                        ))}
                </ul>
            </Section>

            {state.savingsGoals.length > 0 && (
                <Section title="What we're putting away">
                    <ul className="grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {state.savingsGoals.map((g) => {
                            const linked = g.goalId ? goalsSlice?.goals?.find((x) => x.id === g.goalId) : undefined;
                            const pctOf = g.targetCents > 0 ? Math.round((g.currentCents / g.targetCents) * 100) : 0;
                            return (
                                <li key={g.id} className="flex items-center gap-4 rounded-xl bg-card p-4">
                                    <Ring pct={pctOf} size={64} stroke={3} label={`${g.name}: ${pctOf}%`}>
                                        <span className="text-sm font-semibold tabular-nums">{pctOf}%</span>
                                    </Ring>
                                    <div className="min-w-0">
                                        <p className="truncate text-md font-semibold">{g.name}</p>
                                        <p className="text-xs text-muted">
                                            <Money cents={g.currentCents} /> of <Money cents={g.targetCents} />
                                        </p>
                                        {(linked?.title || g.goalLabel) && (
                                            <p className="mt-1 truncate text-2xs text-caption">
                                                Measures <Link to="/execute/goals" className="underline underline-offset-2">{linked?.title ?? g.goalLabel}</Link>
                                            </p>
                                        )}
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                </Section>
            )}

            {!readOnly && (
                <>
                    <div className="mb-8 grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-2">
                        <section>
                            <h2 className="mb-3 font-display text-2xl leading-7">Where it went</h2>
                            <CategoryChart categories={summary.categories} />
                        </section>
                        <section>
                            <h2 className="mb-3 font-display text-2xl leading-7">Six months, in and out</h2>
                            <InOutChart points={series} />
                        </section>
                    </div>

                    {soon.length > 0 && (
                        <Section title="Coming out soon" action={<MoreLink to={`${BASE}/bills`} />}>
                            <ul className="rounded-xl bg-card p-1.5">
                                {soon.map((b) => (
                                    <li key={b.id} className="flex items-center gap-3 rounded-md px-3 py-2.5">
                                        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-live-soft text-live-ink">
                                            <Receipt size={16} aria-hidden="true" />
                                        </span>
                                        <span className="min-w-0 flex-1">
                                            <span className="block truncate text-md font-medium">{b.name}</span>
                                            <span className="block text-xs text-caption">
                                                The {Number(b.dueDate.slice(8))}
                                                {b.autopay ? " · goes out on its own" : ""}
                                            </span>
                                        </span>
                                        <Money cents={b.amountCents} className="text-md font-semibold" />
                                    </li>
                                ))}
                            </ul>
                        </Section>
                    )}

                    <Section title="Ask the companion">
                        <div className="rounded-xl bg-card p-4">
                            <div className="flex flex-wrap gap-2">
                                <Button size="md" variant="outline" onClick={() => void askCompanion("Where are we against budget this month?")} disabled={aiBusy || !aiAvailable}>
                                    Where are we against budget this month?
                                </Button>
                                <Button size="md" variant="outline" onClick={() => void askCompanion("What could we cut to reach the house deposit sooner?")} disabled={aiBusy || !aiAvailable}>
                                    What could we cut to reach the deposit sooner?
                                </Button>
                            </div>
                            {aiBusy && (
                                <p className="mt-3 flex items-center gap-2 text-sm text-muted">
                                    <Spinner /> Reading this month&rsquo;s ledger…
                                </p>
                            )}
                            {aiErr && (
                                <Notice tone="info" className="mt-3">
                                    {aiErr}
                                </Notice>
                            )}
                            {!aiAvailable && !aiErr && <p className="mt-3 text-xs text-caption">The companion needs the backend configured in this build. Everything else on this page works.</p>}
                            {answer && (
                                <div className="mt-4 rounded-lg bg-page p-4">
                                    <p className="text-xs font-semibold uppercase tracking-[0.06em] text-caption">{answer.q}</p>
                                    <p className="mt-2 whitespace-pre-wrap text-md leading-6">{answer.text}</p>
                                    <p className="mt-3 text-2xs text-caption">Answered from this family&rsquo;s own ledger — {summary.label}, {state.entries.length} entries.</p>
                                </div>
                            )}
                        </div>
                    </Section>

                    <Section title="Giving" action={<MoreLink to={`${BASE}/giving`} />}>
                        <div className="flex flex-wrap items-center gap-4 rounded-xl bg-live-soft p-5 text-live-ink">
                            <span className="grid size-11 shrink-0 place-items-center rounded-full bg-live text-white">
                                <Gift size={20} aria-hidden="true" />
                            </span>
                            <div className="min-w-0 flex-1">
                                <p className="font-display text-3xl leading-7">
                                    {money(year.givingCents, space.currency)} given so far in {year.year}
                                </p>
                                <p className="mt-0.5 text-sm">That is {year.pct}% of everything that came in. Generous with what we have.</p>
                            </div>
                            <Link to={`${BASE}/giving`} className="inline-flex items-center gap-1.5 text-sm font-semibold underline-offset-4 hover:underline">
                                The record <ArrowRight size={15} aria-hidden="true" />
                            </Link>
                        </div>
                    </Section>
                </>
            )}

            {readOnly && (
                <Section title="Yours">
                    {state.mine.envelope ? (
                        <div className="flex flex-wrap items-center gap-4 rounded-xl bg-card p-5">
                            <span className="grid size-11 shrink-0 place-items-center rounded-full bg-brand-soft text-brand">
                                <Wallet size={20} aria-hidden="true" />
                            </span>
                            <div className="min-w-0 flex-1">
                                <p className="text-lg font-semibold">
                                    <Money cents={state.mine.envelope.balanceCents} /> left in your envelope
                                </p>
                                <p className="text-sm text-muted">
                                    <Money cents={state.mine.envelope.monthlyAmountCents} /> a month, and {state.mine.envelope.balanceCents === 0 ? "it's all spent" : "yours to decide"}.
                                </p>
                            </div>
                            <Link to={`${BASE}/wish`} className="text-sm font-semibold text-brand underline-offset-4 hover:underline">
                                Open
                            </Link>
                        </div>
                    ) : (
                        <EmptyState icon={<PiggyBank size={20} aria-hidden="true" />} title="No envelope yet" body="A parent can set one up from the Purchases screen." />
                    )}
                    {state.mine.wishes.length > 0 && (
                        <ul className="mt-3 grid gap-2">
                            {state.mine.wishes.slice(0, 4).map((w) => (
                                <li key={w.id} className="flex items-center gap-3 rounded-lg bg-card px-4 py-3">
                                    <MemberAvatar memberId={me.id} size="xs" />
                                    <span className="min-w-0 flex-1 truncate text-md">{w.name}</span>
                                    <Money cents={w.priceCents} className="text-sm text-muted" />
                                    <WishStatusTag status={w.status} />
                                </li>
                            ))}
                        </ul>
                    )}
                </Section>
            )}

            {parent && (
                <>
                    <EntryDialog
                        open={addOpen}
                        onClose={() => setAddOpen(false)}
                        state={state}
                        onSave={async (input) => {
                            const ok = await guard.run(() => mutate((r) => r.addEntry(input)));
                            if (ok) toast("Added to the ledger.", "success");
                            return ok;
                        }}
                    />
                    <ReauthDialog open={guard.asking} busy={guard.busy} onConfirm={guard.confirm} onClose={guard.cancel} />
                </>
            )}
            {parent && state.alerts.filter((a) => a.month === monthOf(today) && !a.seenAt).length > 0 && (
                <p className="mt-8 text-xs text-caption">
                    <Tag tone="warn" className="mr-2">
                        {state.alerts.filter((a) => a.month === monthOf(today) && !a.seenAt).length} open alerts
                    </Tag>
                    Budget alerts fire once per category per threshold per month. <Link to={`${BASE}/budgets`} className="underline underline-offset-2">See them all</Link>.
                </p>
            )}
        </div>
    );
}
