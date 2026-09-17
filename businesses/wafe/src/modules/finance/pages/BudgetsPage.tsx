import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { BellRing, Check, PiggyBank, Plus, Sparkles, Utensils } from "lucide-react";
import { useAi } from "@/lib/ai";
import { money } from "@/lib/format";
import { useModule, useModuleState } from "@/state/data";
import { useSpace } from "@/state/space";
import { useToast } from "@/state/toast";
import { Confirm, Money, Notice, PageTitle, Section, Stat } from "@/components/shared";
import { Dialog } from "@/components/ui/overlay";
import { Ring } from "@/components/ui/charts";
import { Button, EmptyState, Field, Spinner, Tag } from "@/components/ui/primitives";
import financeModule from "../module";
import { alertsFor, categoryName, foodBudget, monthLabel, monthOf, monthSummary } from "../derive";
import { AmountField, BAR_FILL, BudgetBar, CategoryChart, FinanceNav, MoneyIsPrivate, MonthPicker } from "../components/pieces";
import { LockStrip, ReauthDialog, useMoneyGuard } from "../components/reauth";
import type { CategoryColour, CategorySpend, SavingsGoal } from "../types";

/**
 * The plan, and how the month is going against it.
 *
 * A budget in Wàfè is just a category with a monthly limit, so this screen is
 * the one place those limits are set — and the place the 80% and 100% alerts
 * are visible as ROWS rather than as feelings. An alert exists once per
 * category, per threshold, per month: "Check now" can be pressed all afternoon
 * and the second press raises nothing, which is exactly the promise.
 *
 * Two lines are shown but never alerted on: giving and saving. A family should
 * not be told off for being generous or for putting money away.
 *
 * A member with only `finance.view` (Dami, fifteen) reads this page: the
 * totals travel with her slice, the ledger rows behind them do not.
 */

const COLOURS: CategoryColour[] = ["brand", "live", "terra", "ochre", "plum", "sage", "mint"];

interface LinkedGoal {
    id: string;
    title?: string;
}

export default function BudgetsPage() {
    const { state, repo, mutate, loading, error } = useModule(financeModule);
    const { role, today, space } = useSpace();
    const { toast } = useToast();
    const goalsSlice = useModuleState<{ goals?: LinkedGoal[] }>("goals");
    const guard = useMoneyGuard(repo);
    const [month, setMonth] = useState(() => monthOf(today));
    const [editing, setEditing] = useState<CategorySpend | null>(null);
    const [limit, setLimit] = useState(0);
    const [adding, setAdding] = useState(false);
    const [removing, setRemoving] = useState<CategorySpend | null>(null);
    const [potOpen, setPotOpen] = useState(false);
    const [contributing, setContributing] = useState<SavingsGoal | null>(null);
    const [removingPot, setRemovingPot] = useState<SavingsGoal | null>(null);
    const [tick, setTick] = useState(0);
    const { ask, busy: aiBusy, available: aiAvailable } = useAi();
    const [answer, setAnswer] = useState<{ q: string; text: string; named: CategorySpend[] } | null>(null);

    const parent = role === "parent";
    const readOnly = !state?.visible;

    // A read-only viewer holds totals, not entries — so her month is the month
    // the repo summarised, and nothing here recomputes it from a ledger she
    // does not have.
    const summary = useMemo(() => {
        if (!state) return null;
        return readOnly ? state.summary : monthSummary(state, month);
    }, [state, month, readOnly]);
    const food = useMemo(() => (state && !readOnly ? foodBudget(state, month) : null), [state, month, readOnly]);

    if (loading && !state) return <p className="text-md text-muted">Opening the plan…</p>;
    if (error) return <Notice tone="danger">{error}</Notice>;
    if (!state || !summary) return null;
    if (!state.visible && !state.mine.canViewBudget) return <MoneyIsPrivate mine={state.mine.wishes.length} />;

    const alerts = alertsFor(state, summary.month);
    const open = alerts.filter((a) => !a.seenAt);
    const spendable = summary.categories.filter((c) => !c.isGiving && !c.isSavings);
    const setGiving = summary.categories.filter((c) => c.isGiving || c.isSavings);

    const checkAlerts = async () => {
        let fired = 0;
        await mutate(async (r) => {
            fired = (await r.runBudgetAlerts(summary.month)).length;
        });
        toast(fired ? `${fired} new alert${fired === 1 ? "" : "s"} raised for ${monthLabel(summary.month, false)}.` : `Nothing new — every alert for ${monthLabel(summary.month, false)} has already been raised.`);
    };

    /**
     * The companion proposes; a parent decides. It is given this month's lines
     * and answers in words — and any budget it names comes back as a button
     * that opens the same limit dialog a parent would have opened anyway. It
     * cannot move a single number on its own, and the note under the answer
     * says so out loud.
     */
    const askCompanion = async (q: string) => {
        setAnswer(null);
        const lines = summary.categories
            .filter((c) => c.budgetCents > 0)
            .map((c) => `${c.name} ${money(c.spentCents, space.currency)} of ${money(c.budgetCents, space.currency)} (${c.pct}%)`)
            .join("; ");
        try {
            const r = await ask({
                action: "ask",
                prompt: q,
                extraContext: `${monthLabel(summary.month)} budgets: ${lines}. Planned ${money(summary.budgetCents, space.currency)}, spent ${money(summary.spentCents, space.currency)}, ${money(summary.leftCents, space.currency)} left. Name the categories you would change and by how much; do not invent categories.`,
            });
            if (r.unavailable) {
                toast(r.unavailable);
                return;
            }
            const named = summary.categories.filter((c) => r.text.toLowerCase().includes(c.name.toLowerCase()));
            setAnswer({ q, text: r.text.trim(), named });
        } catch {
            toast("The companion couldn't answer just now.", "danger");
        }
    };

    const saveLimit = async () => {
        if (!editing) return;
        const ok = await guard.run(() => mutate((r) => r.setBudget(editing.categoryId, limit)));
        if (ok) {
            toast(`${editing.name} is now ${money(limit, space.currency)} a month.`, "success");
            setEditing(null);
        }
    };

    return (
        <div>
            <PageTitle
                title="Budgets"
                sub={
                    readOnly
                        ? "What the family plans to spend each month, and how this one is going. The entries behind these totals stay with Mum and Dad."
                        : "One limit per category, per month. The bars fill from the ledger — nothing here is typed twice."
                }
                area="live"
                actions={
                    parent ? (
                        <>
                            <Button variant="outline" onClick={() => void checkAlerts()}>
                                <BellRing size={16} aria-hidden="true" /> Check alerts
                            </Button>
                            <Button onClick={() => setAdding(true)}>
                                <Plus size={16} aria-hidden="true" /> New budget
                            </Button>
                        </>
                    ) : undefined
                }
            />

            <FinanceNav readOnly={readOnly} />
            {parent && <LockStrip repo={repo} onLock={() => setTick(tick + 1)} />}

            <div className="mb-5 mt-5 flex flex-wrap items-center justify-between gap-3">
                {readOnly ? <span className="text-sm font-semibold">{monthLabel(summary.month)}</span> : <MonthPicker month={month} onChange={setMonth} today={today} />}
                <span className="text-xs text-caption">
                    {summary.categories.filter((c) => c.budgetCents > 0).length} budgets · {money(summary.budgetCents, space.currency)} planned
                </span>
            </div>

            <div className="mb-8 grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Stat label="The plan" value={<Money cents={summary.budgetCents} />} sub={`for ${monthLabel(summary.month, false)}`} />
                <Stat label="Spent" value={<Money cents={summary.spentCents} />} sub={`${summary.budgetCents ? Math.round((summary.spentCents / summary.budgetCents) * 100) : 0}% of the plan`} />
                <Stat
                    label="Left"
                    value={<Money cents={Math.max(0, summary.leftCents)} />}
                    sub={summary.leftCents < 0 ? `${money(-summary.leftCents, space.currency)} over` : "unspent so far"}
                    tone={summary.leftCents < 0 ? "danger" : "ok"}
                />
                <Stat label="Put away" value={<Money cents={summary.savedCents} />} sub="into the pots" tone="live" />
            </div>

            {parent && open.length > 0 && (
                <Section title="Alerts">
                    <ul className="grid grid-cols-[minmax(0,1fr)] gap-3 md:grid-cols-2">
                        {open.map((a) => (
                            <li key={a.id} className={`flex items-start gap-3 rounded-lg px-4 py-3.5 ${a.threshold === 100 ? "bg-danger-soft text-danger-ink" : "bg-peach-soft text-peach"}`}>
                                <BellRing size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
                                <div className="min-w-0 flex-1">
                                    <p className="text-md font-semibold">
                                        {categoryName(state, a.categoryId)} {a.threshold === 100 ? "went over budget" : "passed 80%"}
                                    </p>
                                    <p className="mt-0.5 text-sm leading-5">
                                        {money(a.spentCents, space.currency)} of {money(a.budgetCents, space.currency)} in {monthLabel(a.month, false)}.
                                    </p>
                                </div>
                                <button type="button" onClick={() => void mutate((r) => r.dismissAlert(a.id))} className="shrink-0 text-xs font-semibold underline-offset-4 hover:underline">
                                    Seen
                                </button>
                            </li>
                        ))}
                    </ul>
                    <p className="mt-2 text-xs text-caption">
                        Each category raises each threshold once a month — {alerts.length} raised in {monthLabel(summary.month, false)} so far, and pressing Check alerts again adds nothing.
                    </p>
                </Section>
            )}

            <Section title="What we spend on">
                {spendable.length === 0 ? (
                    <EmptyState title="No budgets yet" body="Give a category a monthly limit and the bar fills itself from the ledger." action={parent ? <Button onClick={() => setAdding(true)}>Set the first one</Button> : undefined} />
                ) : (
                    <ul className="grid grid-cols-[minmax(0,1fr)] gap-3 md:grid-cols-2">
                        {spendable
                            .slice()
                            .sort((a, b) => b.pct - a.pct || b.budgetCents - a.budgetCents)
                            .map((c) => (
                                <BudgetBar
                                    key={c.categoryId}
                                    c={c}
                                    action={
                                        parent ? (
                                            <span className="flex items-center gap-3">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setEditing(c);
                                                        setLimit(c.budgetCents);
                                                    }}
                                                    className="font-semibold text-brand underline-offset-4 hover:underline"
                                                >
                                                    Change
                                                </button>
                                                <button type="button" onClick={() => setRemoving(c)} className="text-caption underline-offset-4 hover:text-danger-ink hover:underline">
                                                    Remove
                                                </button>
                                            </span>
                                        ) : undefined
                                    }
                                />
                            ))}
                    </ul>
                )}
            </Section>

            {setGiving.length > 0 && (
                <Section title="Giving and saving">
                    <p className="mb-3 text-sm text-muted">These two are shown, never alerted on. A family should not be told off for being generous or for putting money away.</p>
                    <ul className="grid grid-cols-[minmax(0,1fr)] gap-3 md:grid-cols-2">
                        {setGiving.map((c) => (
                            <BudgetBar
                                key={c.categoryId}
                                c={c}
                                action={
                                    parent ? (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setEditing(c);
                                                setLimit(c.budgetCents);
                                            }}
                                            className="font-semibold text-brand underline-offset-4 hover:underline"
                                        >
                                            Change
                                        </button>
                                    ) : undefined
                                }
                            />
                        ))}
                    </ul>
                </Section>
            )}

            {food && (
                <div className="mb-8 flex flex-wrap items-center gap-4 rounded-xl bg-mint-soft p-5 text-mint">
                    <span className="grid size-11 shrink-0 place-items-center rounded-full bg-mint text-white">
                        <Utensils size={20} aria-hidden="true" />
                    </span>
                    <div className="min-w-0 flex-1">
                        <p className="font-display text-2xl leading-7">{money(food.leftCents, space.currency)} left for food this month</p>
                        <p className="mt-0.5 text-sm">
                            {money(food.spentCents, space.currency)} of {money(food.budgetCents, space.currency)}. This is the number Wellness plans meals against — change the limit here and the meal plan follows.
                        </p>
                    </div>
                    <Link to="/live/wellness" className="text-sm font-semibold underline-offset-4 hover:underline">
                        Meal planning
                    </Link>
                </div>
            )}

            {!readOnly && (
                <Section title="Where it went">
                    <CategoryChart categories={summary.categories} />
                </Section>
            )}

            {parent && (
                <Section title="Ask the companion">
                    <div className="rounded-xl bg-card p-4">
                        <div className="flex flex-wrap gap-2">
                            <Button size="md" variant="outline" onClick={() => void askCompanion("Where are we against budget this month?")} disabled={aiBusy || !aiAvailable}>
                                Where are we against budget this month?
                            </Button>
                            <Button size="md" variant="outline" onClick={() => void askCompanion("Propose a budget change for next month that would get us to the house deposit sooner.")} disabled={aiBusy || !aiAvailable}>
                                Propose a budget change
                            </Button>
                        </div>
                        {aiBusy && (
                            <p className="mt-3 flex items-center gap-2 text-sm text-muted">
                                <Spinner /> Reading this month&rsquo;s lines…
                            </p>
                        )}
                        {!aiAvailable && <p className="mt-3 text-xs text-caption">The companion needs the backend configured in this build. Everything else on this page works.</p>}
                        {answer && (
                            <div className="mt-4 rounded-lg bg-page p-4">
                                <p className="text-xs font-semibold uppercase tracking-[0.06em] text-caption">{answer.q}</p>
                                <p className="mt-2 whitespace-pre-wrap text-md leading-6">{answer.text}</p>
                                {answer.named.length > 0 && (
                                    <p className="mt-3 flex flex-wrap items-center gap-2">
                                        {answer.named.map((c) => (
                                            <Button
                                                key={c.categoryId}
                                                size="sm"
                                                variant="outline"
                                                onClick={() => {
                                                    setEditing(c);
                                                    setLimit(c.budgetCents);
                                                }}
                                            >
                                                <Sparkles size={13} aria-hidden="true" /> Change {c.name}
                                            </Button>
                                        ))}
                                    </p>
                                )}
                                <p className="mt-3 text-2xs text-caption">A proposal, from {summary.categories.length} of your own budget lines. Nothing moves until you set a limit yourself.</p>
                            </div>
                        )}
                    </div>
                </Section>
            )}

            <Section
                title="What we're putting away"
                action={
                    parent ? (
                        <Button size="md" variant="outline" onClick={() => setPotOpen(true)}>
                            <Plus size={15} aria-hidden="true" /> New pot
                        </Button>
                    ) : undefined
                }
            >
                {state.savingsGoals.length === 0 ? (
                    <EmptyState icon={<PiggyBank size={20} aria-hidden="true" />} title="No pots yet" body="A pot is a named target — a deposit, an emergency fund, Christmas in Lagos — that a family goal can measure itself against." />
                ) : (
                    <ul className="grid grid-cols-[minmax(0,1fr)] gap-3 md:grid-cols-2">
                        {state.savingsGoals.map((g) => {
                            const linked = g.goalId ? goalsSlice?.goals?.find((x) => x.id === g.goalId) : undefined;
                            const p = g.targetCents > 0 ? Math.round((g.currentCents / g.targetCents) * 100) : 0;
                            return (
                                <li key={g.id} className="flex items-start gap-4 rounded-xl bg-card p-4">
                                    <Ring pct={p} size={64} stroke={3} label={`${g.name}: ${p}%`}>
                                        <span className="text-sm font-semibold tabular-nums">{p}%</span>
                                    </Ring>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-md font-semibold">{g.name}</p>
                                        <p className="text-sm text-muted">
                                            <Money cents={g.currentCents} /> of <Money cents={g.targetCents} />
                                        </p>
                                        {g.note && <p className="mt-1 text-xs leading-5 text-caption">{g.note}</p>}
                                        {(linked?.title || g.goalLabel) && (
                                            <p className="mt-1.5 text-2xs text-caption">
                                                Measures{" "}
                                                <Link to="/execute/goals" className="underline underline-offset-2">
                                                    {linked?.title ?? g.goalLabel}
                                                </Link>
                                            </p>
                                        )}
                                        {parent && (
                                            <p className="mt-2 flex flex-wrap items-center gap-3 text-xs">
                                                <button type="button" onClick={() => setContributing(g)} className="font-semibold text-brand underline-offset-4 hover:underline">
                                                    Pay in
                                                </button>
                                                <button type="button" onClick={() => setRemovingPot(g)} className="text-caption underline-offset-4 hover:text-danger-ink hover:underline">
                                                    Remove
                                                </button>
                                            </p>
                                        )}
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </Section>

            {/* -- Change a limit --------------------------------------------- */}
            <Dialog open={Boolean(editing)} onClose={() => setEditing(null)} title={editing ? `${editing.name} — monthly limit` : ""}>
                {editing && (
                    <form
                        onSubmit={(e) => {
                            e.preventDefault();
                            void saveLimit();
                        }}
                    >
                        <AmountField id="budget-limit" label="A month" value={limit} onChange={setLimit} hint={`${money(editing.spentCents, space.currency)} has already gone out of this one in ${monthLabel(summary.month, false)}.`} />
                        <div className="mt-5 flex justify-end gap-2">
                            <Button type="button" variant="ghost" onClick={() => setEditing(null)}>
                                Cancel
                            </Button>
                            <Button type="submit">Save the limit</Button>
                        </div>
                    </form>
                )}
            </Dialog>

            {/* -- A new budget ------------------------------------------------ */}
            <NewCategoryDialog
                open={adding}
                onClose={() => setAdding(false)}
                onSave={async (input) => {
                    const ok = await guard.run(() => mutate((r) => r.addCategory(input)));
                    if (ok) toast(`${input.name} is now budgeted.`, "success");
                    return ok;
                }}
            />

            <Confirm
                open={Boolean(removing)}
                title={removing ? `Remove ${removing.name}?` : ""}
                body="Nothing is deleted from the ledger — anything spent against it moves to Everything else, so the month still adds up."
                confirmLabel="Remove the budget"
                danger
                onConfirm={async () => {
                    if (!removing) return;
                    const ok = await guard.run(() => mutate((r) => r.removeCategory(removing.categoryId)));
                    if (ok) toast(`${removing.name} removed.`);
                }}
                onClose={() => setRemoving(null)}
            />

            {/* -- Pots --------------------------------------------------------- */}
            <NewPotDialog
                open={potOpen}
                onClose={() => setPotOpen(false)}
                goals={goalsSlice?.goals ?? []}
                accounts={state.accounts.map((a) => ({ id: a.id, name: a.name }))}
                onSave={async (input) => {
                    const ok = await guard.run(() => mutate((r) => r.addSavingsGoal(input)));
                    if (ok) toast(`${input.name} started.`, "success");
                    return ok;
                }}
            />

            <PayInDialog
                pot={contributing}
                onClose={() => setContributing(null)}
                onSave={async (cents) => {
                    if (!contributing) return false;
                    const ok = await guard.run(() => mutate((r) => r.contributeToSavings(contributing.id, cents)));
                    if (ok) toast(`${money(cents, space.currency)} into ${contributing.name} — and onto the ledger.`, "success");
                    return ok;
                }}
            />

            <Confirm
                open={Boolean(removingPot)}
                title={removingPot ? `Close ${removingPot.name}?` : ""}
                body="The money already paid in stays on the ledger; only the target goes."
                confirmLabel="Close the pot"
                danger
                onConfirm={async () => {
                    if (!removingPot) return;
                    const ok = await guard.run(() => mutate((r) => r.removeSavingsGoal(removingPot.id)));
                    if (ok) toast("Closed.");
                }}
                onClose={() => setRemovingPot(null)}
            />

            {parent && <ReauthDialog open={guard.asking} busy={guard.busy} onConfirm={guard.confirm} onClose={guard.cancel} />}

            {readOnly && (
                <p className="mt-8 flex items-center gap-2 text-xs text-caption">
                    <Check size={13} aria-hidden="true" /> You can see the plan because a parent chose to show it to you. The entries behind it, the bills and the giving record stay with them.
                </p>
            )}
        </div>
    );
}

// ---------------------------------------------------------------------------
// Dialogs
// ---------------------------------------------------------------------------

function NewCategoryDialog({
    open,
    onClose,
    onSave,
}: {
    open: boolean;
    onClose: () => void;
    onSave: (input: { name: string; monthlyBudgetCents: number; isGiving?: boolean; isFood?: boolean; isSavings?: boolean; colour?: CategoryColour }) => Promise<boolean>;
}) {
    const [name, setName] = useState("");
    const [amount, setAmount] = useState(0);
    const [colour, setColour] = useState<CategoryColour>("sage");
    const [isFood, setFood] = useState(false);
    const [isGiving, setGiving] = useState(false);
    const [isSavings, setSavings] = useState(false);
    const [busy, setBusy] = useState(false);

    const reset = () => {
        setName("");
        setAmount(0);
        setColour("sage");
        setFood(false);
        setGiving(false);
        setSavings(false);
    };

    return (
        <Dialog
            open={open}
            onClose={() => {
                reset();
                onClose();
            }}
            title="A new budget"
        >
            <form
                onSubmit={async (e) => {
                    e.preventDefault();
                    if (!name.trim()) return;
                    setBusy(true);
                    try {
                        const ok = await onSave({ name, monthlyBudgetCents: amount, colour, isFood, isGiving, isSavings });
                        if (ok) {
                            reset();
                            onClose();
                        }
                    } finally {
                        setBusy(false);
                    }
                }}
            >
                <Field label="What is it for" value={name} onChange={(e) => setName(e.target.value)} placeholder="Music lessons" required />
                <AmountField id="new-cat-amount" label="A month" value={amount} onChange={setAmount} className="mt-4" />
                <fieldset className="mt-4">
                    <legend className="mb-2 text-xs font-medium uppercase tracking-[0.06em] text-muted">Colour</legend>
                    <div className="flex flex-wrap gap-2">
                        {COLOURS.map((c) => (
                            <button
                                key={c}
                                type="button"
                                aria-pressed={colour === c}
                                aria-label={c}
                                onClick={() => setColour(c)}
                                className={`size-8 rounded-full ${BAR_FILL[c]} ${colour === c ? "ring-2 ring-ink ring-offset-2" : ""}`}
                            />
                        ))}
                    </div>
                </fieldset>
                <fieldset className="mt-4">
                    <legend className="mb-2 text-xs font-medium uppercase tracking-[0.06em] text-muted">Treat it as</legend>
                    <div className="flex flex-wrap gap-2">
                        {[
                            { on: isFood, set: setFood, label: "Food — Wellness plans meals against it" },
                            { on: isGiving, set: setGiving, label: "Giving — counts in the giving record" },
                            { on: isSavings, set: setSavings, label: "Saving — never alerted on" },
                        ].map((o) => (
                            <button
                                key={o.label}
                                type="button"
                                aria-pressed={o.on}
                                onClick={() => o.set(!o.on)}
                                className={`rounded-full border px-3 py-1.5 text-xs font-medium ${o.on ? "border-brand bg-brand-soft text-brand-ink" : "border-line-strong text-muted"}`}
                            >
                                {o.label}
                            </button>
                        ))}
                    </div>
                </fieldset>
                <div className="mt-5 flex justify-end gap-2">
                    <Button type="button" variant="ghost" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button type="submit" loading={busy} disabled={!name.trim()}>
                        Add the budget
                    </Button>
                </div>
            </form>
        </Dialog>
    );
}

function NewPotDialog({
    open,
    onClose,
    goals,
    accounts,
    onSave,
}: {
    open: boolean;
    onClose: () => void;
    goals: LinkedGoal[];
    accounts: Array<{ id: string; name: string }>;
    onSave: (input: { name: string; targetCents: number; accountId: string; goalId?: string | null; goalLabel?: string }) => Promise<boolean>;
}) {
    const [name, setName] = useState("");
    const [target, setTarget] = useState(0);
    const [accountId, setAccount] = useState(accounts[0]?.id ?? "");
    const [goalId, setGoalId] = useState("");
    const [busy, setBusy] = useState(false);

    return (
        <Dialog open={open} onClose={onClose} title="A new pot">
            <form
                onSubmit={async (e) => {
                    e.preventDefault();
                    if (!name.trim()) return;
                    setBusy(true);
                    try {
                        const goal = goals.find((g) => g.id === goalId);
                        const ok = await onSave({ name, targetCents: target, accountId: accountId || accounts[0]?.id || "", goalId: goalId || null, goalLabel: goal?.title ?? "" });
                        if (ok) {
                            setName("");
                            setTarget(0);
                            setGoalId("");
                            onClose();
                        }
                    } finally {
                        setBusy(false);
                    }
                }}
            >
                <Field label="What we're saving for" value={name} onChange={(e) => setName(e.target.value)} placeholder="A new boiler" required />
                <AmountField id="pot-target" label="Target" value={target} onChange={setTarget} className="mt-4" />
                <label htmlFor="pot-account" className="mt-4 block">
                    <span className="mb-1.5 block text-xs font-medium uppercase tracking-[0.06em] text-muted">Where it sits</span>
                    <select id="pot-account" value={accountId} onChange={(e) => setAccount(e.target.value)} className="h-11 w-full rounded-sm border border-line-strong bg-card px-3 text-md outline-none focus:border-brand">
                        {accounts.map((a) => (
                            <option key={a.id} value={a.id}>
                                {a.name}
                            </option>
                        ))}
                    </select>
                </label>
                <label htmlFor="pot-goal" className="mt-4 block">
                    <span className="mb-1.5 block text-xs font-medium uppercase tracking-[0.06em] text-muted">A goal it measures</span>
                    <select id="pot-goal" value={goalId} onChange={(e) => setGoalId(e.target.value)} className="h-11 w-full rounded-sm border border-line-strong bg-card px-3 text-md outline-none focus:border-brand">
                        <option value="">Not linked to a goal</option>
                        {goals.map((g) => (
                            <option key={g.id} value={g.id}>
                                {g.title ?? g.id}
                            </option>
                        ))}
                    </select>
                    <span className="mt-1.5 block text-xs text-caption">A linked pot publishes its number to Goals, so the goal&rsquo;s progress moves when money goes in.</span>
                </label>
                <div className="mt-5 flex justify-end gap-2">
                    <Button type="button" variant="ghost" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button type="submit" loading={busy} disabled={!name.trim()}>
                        Start the pot
                    </Button>
                </div>
            </form>
        </Dialog>
    );
}

function PayInDialog({ pot, onClose, onSave }: { pot: SavingsGoal | null; onClose: () => void; onSave: (cents: number) => Promise<boolean> }) {
    const [amount, setAmount] = useState(0);
    const [busy, setBusy] = useState(false);
    return (
        <Dialog open={Boolean(pot)} onClose={onClose} title={pot ? `Pay into ${pot.name}` : ""}>
            {pot && (
                <form
                    onSubmit={async (e) => {
                        e.preventDefault();
                        if (!amount) return;
                        setBusy(true);
                        try {
                            const ok = await onSave(amount);
                            if (ok) {
                                setAmount(0);
                                onClose();
                            }
                        } finally {
                            setBusy(false);
                        }
                    }}
                >
                    <p className="text-sm leading-6 text-muted">
                        It goes on the ledger under Savings as well as into the pot, so the month&rsquo;s plan stays honest.{" "}
                        {pot.goalLabel ? (
                            <>
                                This pot measures <strong className="font-semibold text-ink">{pot.goalLabel}</strong>.
                            </>
                        ) : null}
                    </p>
                    <AmountField id="pot-amount" label="How much" value={amount} onChange={setAmount} className="mt-4" />
                    <p className="mt-2 text-xs text-caption">
                        <Tag tone="ok">After this</Tag>{" "}
                        <span className="ml-2">
                            <Money cents={pot.currentCents + amount} /> of <Money cents={pot.targetCents} />
                        </span>
                    </p>
                    <div className="mt-5 flex justify-end gap-2">
                        <Button type="button" variant="ghost" onClick={onClose}>
                            Cancel
                        </Button>
                        <Button type="submit" loading={busy} disabled={!amount}>
                            Pay in
                        </Button>
                    </div>
                </form>
            )}
        </Dialog>
    );
}
