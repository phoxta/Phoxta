import type { AgendaItem, AttentionItem, ChildCard, DashboardContribution, Nudge, ProgressRing, RepoContext } from "@/data/core";
import { clamp, isoDate, money, pct } from "@/lib/format";
import type {
    Bill,
    BillPayment,
    BuyTask,
    BudgetAlert,
    BudgetCategory,
    CategorySpend,
    Envelope,
    FinanceState,
    GivingLine,
    GoalFund,
    LedgerEntry,
    MonthPoint,
    MonthSummary,
    SavingsGoal,
    WishItem,
} from "./types";
import { REMINDERS_BEFORE_PARK } from "./types";

/**
 * Every number the finance screens show, as a pure function of state.
 *
 * Two rules run through the whole file:
 *
 *  · REPORTING IS ALWAYS IN THE HOME CURRENCY. Nothing here ever adds
 *    `amountCents`; it adds `amountHomeCents`, which the repos computed once
 *    at the rate that applied on the day. A ₦450,000 deposit on the Lagos
 *    house and a £12 grocery top-up therefore land in the same column, and
 *    the giving percentage and every budget threshold stay honest.
 *
 *  · WHAT A MEMBER MAY SEE IS DECIDED IN ONE PLACE. `visibleTo()` is used by
 *    the demo repo and the live repo alike, so the two modes cannot drift: a
 *    child's slice has no ledger in it to leak.
 */

export const BASE = "/live/finance";

// ---------------------------------------------------------------------------
// Dates and months
// ---------------------------------------------------------------------------

/** "2026-09-06" → "2026-09". */
export const monthOf = (iso: string): string => iso.slice(0, 7);

export function addMonths(month: string, n: number): string {
    const [y, m] = month.split("-").map(Number);
    const d = new Date(y, m - 1 + n, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function monthLabel(month: string, withYear = true): string {
    const [y, m] = month.split("-").map(Number);
    return new Date(y, m - 1, 1).toLocaleDateString("en-GB", { month: "long", ...(withYear ? { year: "numeric" } : {}) });
}

export const shortMonth = (month: string): string => {
    const [y, m] = month.split("-").map(Number);
    return new Date(y, m - 1, 1).toLocaleDateString("en-GB", { month: "short" });
};

/** The nth day of a month as an ISO date, clamped to the month's length. */
export function dayInMonth(month: string, day: number): string {
    const [y, m] = month.split("-").map(Number);
    const last = new Date(y, m, 0).getDate();
    return `${month}-${String(clamp(day, 1, last)).padStart(2, "0")}`;
}

/** The last `count` months ending at `month`, oldest first. */
export function monthsBack(month: string, count: number): string[] {
    return Array.from({ length: count }, (_, i) => addMonths(month, i - (count - 1)));
}

/** Whole days left after today in today's month. */
export function daysLeftInMonth(today: string): number {
    const [y, m, d] = today.split("-").map(Number);
    return new Date(y, m, 0).getDate() - d;
}

export const daysBetween = (a: string, b: string): number => Math.round((new Date(`${b}T00:00:00`).getTime() - new Date(`${a}T00:00:00`).getTime()) / 86400000);

// ---------------------------------------------------------------------------
// Categories and spend
// ---------------------------------------------------------------------------

export const categoryById = (state: FinanceState, id: string): BudgetCategory | undefined => state.budgets.find((c) => c.id === id);

export const categoryName = (state: FinanceState, id: string): string => categoryById(state, id)?.name ?? "Uncategorised";

export const expenseCategories = (state: FinanceState): BudgetCategory[] => state.budgets.filter((c) => c.kind === "expense" && c.active).sort((a, b) => a.order - b.order);

export const incomeCategories = (state: FinanceState): BudgetCategory[] => state.budgets.filter((c) => c.kind === "income" && c.active).sort((a, b) => a.order - b.order);

export const entriesInMonth = (entries: LedgerEntry[], month: string): LedgerEntry[] => entries.filter((e) => e.date.startsWith(month));

export const sumHome = (entries: LedgerEntry[]): number => entries.reduce((t, e) => t + e.amountHomeCents, 0);

export const incomeIn = (entries: LedgerEntry[]): number => sumHome(entries.filter((e) => e.kind === "income"));

export const expenseIn = (entries: LedgerEntry[]): number => sumHome(entries.filter((e) => e.kind === "expense"));

/** Spent against one category in one month, in the home currency. */
export function spentInCategory(state: FinanceState, categoryId: string, month: string): number {
    return expenseIn(entriesInMonth(state.entries, month).filter((e) => e.categoryId === categoryId));
}

/** Every expense category with its limit, its spend and how close it is. */
export function categorySpend(state: FinanceState, month: string): CategorySpend[] {
    const inMonth = entriesInMonth(state.entries, month);
    return expenseCategories(state).map((c) => {
        const spentCents = expenseIn(inMonth.filter((e) => e.categoryId === c.id));
        const budgetCents = c.monthlyBudgetCents;
        const p = budgetCents > 0 ? Math.round((spentCents / budgetCents) * 100) : 0;
        return {
            categoryId: c.id,
            name: c.name,
            colour: c.colour,
            budgetCents,
            spentCents,
            pct: p,
            over: budgetCents > 0 && spentCents > budgetCents,
            near: budgetCents > 0 && p >= 80 && spentCents <= budgetCents,
            isGiving: c.isGiving,
            isFood: c.isFood,
            isSavings: c.isSavings,
        };
    });
}

/** The one number Wellness asks us for: what is left in the food budget. */
export function foodBudget(state: FinanceState, month: string): { budgetCents: number; spentCents: number; leftCents: number } {
    const food = categorySpend(state, month).filter((c) => c.isFood);
    const budgetCents = food.reduce((t, c) => t + c.budgetCents, 0);
    const spentCents = food.reduce((t, c) => t + c.spentCents, 0);
    return { budgetCents, spentCents, leftCents: budgetCents - spentCents };
}

export function monthSummary(state: FinanceState, month: string): MonthSummary {
    const inMonth = entriesInMonth(state.entries, month);
    const categories = categorySpend(state, month);
    const incomeCents = incomeIn(inMonth);
    const spentCents = expenseIn(inMonth);
    const budgetCents = categories.reduce((t, c) => t + c.budgetCents, 0);
    const givingCents = categories.filter((c) => c.isGiving).reduce((t, c) => t + c.spentCents, 0);
    const savedCents = categories.filter((c) => c.isSavings).reduce((t, c) => t + c.spentCents, 0);
    return {
        month,
        label: monthLabel(month),
        incomeCents,
        spentCents,
        budgetCents,
        leftCents: budgetCents - spentCents,
        savedCents,
        givingCents,
        givingPct: incomeCents > 0 ? Math.round((givingCents / incomeCents) * 1000) / 10 : 0,
        categories,
    };
}

/**
 * The same summary, built from TOTALS rather than from rows.
 *
 * This is what a member with only `finance.view` gets in live mode: Postgres
 * aggregates the ledger behind a security-definer function and hands back one
 * number per category, so the budget overview is real without a single ledger
 * row ever leaving the database. The demo's `visibleTo` reaches the identical
 * shape by summing in memory — the two modes agree, which is the point.
 */
export function summaryFromTotals(budgets: BudgetCategory[], totals: Array<{ categoryId: string; spentCents: number; incomeCents: number }>, month: string): MonthSummary {
    const by = new Map(totals.map((t) => [t.categoryId, t]));
    const categories: CategorySpend[] = budgets
        .filter((c) => c.kind === "expense" && c.active)
        .sort((a, b) => a.order - b.order)
        .map((c) => {
            const spentCents = by.get(c.id)?.spentCents ?? 0;
            const budgetCents = c.monthlyBudgetCents;
            const p = budgetCents > 0 ? Math.round((spentCents / budgetCents) * 100) : 0;
            return {
                categoryId: c.id,
                name: c.name,
                colour: c.colour,
                budgetCents,
                spentCents,
                pct: p,
                over: budgetCents > 0 && spentCents > budgetCents,
                near: budgetCents > 0 && p >= 80 && spentCents <= budgetCents,
                isGiving: c.isGiving,
                isFood: c.isFood,
                isSavings: c.isSavings,
            };
        });
    const incomeCents = totals.reduce((t, x) => t + x.incomeCents, 0);
    const spentCents = categories.reduce((t, c) => t + c.spentCents, 0);
    const budgetCents = categories.reduce((t, c) => t + c.budgetCents, 0);
    const givingCents = categories.filter((c) => c.isGiving).reduce((t, c) => t + c.spentCents, 0);
    return {
        month,
        label: monthLabel(month),
        incomeCents,
        spentCents,
        budgetCents,
        leftCents: budgetCents - spentCents,
        savedCents: categories.filter((c) => c.isSavings).reduce((t, c) => t + c.spentCents, 0),
        givingCents,
        givingPct: incomeCents > 0 ? Math.round((givingCents / incomeCents) * 1000) / 10 : 0,
        categories,
    };
}

export function monthSeries(state: FinanceState, month: string, count = 6): MonthPoint[] {
    return monthsBack(month, count).map((m) => {
        const inMonth = entriesInMonth(state.entries, m);
        return { month: m, label: shortMonth(m), incomeCents: incomeIn(inMonth), spentCents: expenseIn(inMonth) };
    });
}

// ---------------------------------------------------------------------------
// Giving (AC 5)
// ---------------------------------------------------------------------------

export const givingCategoryIds = (state: FinanceState): string[] => state.budgets.filter((c) => c.isGiving).map((c) => c.id);

/** The sum of every entry in a giving category, in the home currency (AC 5). */
export function givingTotal(state: FinanceState, from?: string, to?: string): number {
    const ids = new Set(givingCategoryIds(state));
    return sumHome(state.entries.filter((e) => e.kind === "expense" && ids.has(e.categoryId) && (!from || e.date >= from) && (!to || e.date <= to)));
}

export function givingYear(state: FinanceState, today: string): { year: string; givingCents: number; incomeCents: number; pct: number } {
    const year = today.slice(0, 4);
    const from = `${year}-01-01`;
    const givingCents = givingTotal(state, from, today);
    const incomeCents = sumHome(state.entries.filter((e) => e.kind === "income" && e.date >= from && e.date <= today));
    return { year, givingCents, incomeCents, pct: incomeCents > 0 ? Math.round((givingCents / incomeCents) * 1000) / 10 : 0 };
}

export function givingByRecipient(state: FinanceState, from?: string, to?: string): GivingLine[] {
    const ids = new Set(givingCategoryIds(state));
    const map = new Map<string, GivingLine>();
    for (const e of state.entries) {
        if (e.kind !== "expense" || !ids.has(e.categoryId)) continue;
        if ((from && e.date < from) || (to && e.date > to)) continue;
        const key = e.recipient || e.payee || "Unnamed";
        const line = map.get(key) ?? { recipient: key, cents: 0, count: 0, lastAt: e.date };
        line.cents += e.amountHomeCents;
        line.count += 1;
        if (e.date > line.lastAt) line.lastAt = e.date;
        map.set(key, line);
    }
    return [...map.values()].sort((a, b) => b.cents - a.cents);
}

// ---------------------------------------------------------------------------
// Bills
// ---------------------------------------------------------------------------

const monthsForFreq = (freq: Bill["freq"]): number => (freq === "monthly" ? 1 : freq === "quarterly" ? 3 : 12);

export const billPaidFor = (payments: BillPayment[], billId: string, month: string): BillPayment | undefined => payments.find((p) => p.billId === billId && p.month === month);

/**
 * The occurrence a screen cares about: the earliest unpaid one, looking back
 * up to a year so an unpaid council tax from the 1st stays visible rather than
 * quietly rolling forward.
 */
export function nextDue(bill: Bill, payments: BillPayment[], today: string): { month: string; date: string; paid: boolean } {
    const step = monthsForFreq(bill.freq);
    const cur = monthOf(today);
    // One period back first, so an unpaid council tax from the 1st keeps
    // showing rather than quietly rolling on to next month.
    for (let i = -step; i <= 0; i += step) {
        const m = addMonths(cur, i);
        if (!billPaidFor(payments, bill.id, m)) return { month: m, date: dayInMonth(m, bill.dueDay), paid: false };
    }
    return { month: cur, date: dayInMonth(cur, bill.dueDay), paid: true };
}

/** Stamp `dueDate`, `paid` and `parked` so the calendar can read our slice. */
export function stampBills(bills: Bill[], payments: BillPayment[], today: string): Bill[] {
    return bills.map((b) => {
        const due = nextDue(b, payments, today);
        const overdue = !due.paid && due.date < today;
        return { ...b, dueDate: due.date, paid: due.paid, parked: overdue && b.remindersSent >= REMINDERS_BEFORE_PARK };
    });
}

export const billsDueWithin = (bills: Bill[], today: string, days: number): Bill[] =>
    bills.filter((b) => b.active && !b.paid && b.dueDate >= today && daysBetween(today, b.dueDate) <= days).sort((a, b) => a.dueDate.localeCompare(b.dueDate));

export const billsOverdue = (bills: Bill[], today: string): Bill[] => bills.filter((b) => b.active && !b.paid && b.dueDate < today).sort((a, b) => a.dueDate.localeCompare(b.dueDate));

export const billsMonthlyTotal = (bills: Bill[]): number => bills.filter((b) => b.active).reduce((t, b) => t + Math.round(b.amountCents / monthsForFreq(b.freq)), 0);

// ---------------------------------------------------------------------------
// Alerts (AC 1)
// ---------------------------------------------------------------------------

/**
 * The alerts that SHOULD exist for this month and do not yet. The repos insert
 * exactly these, which is what makes "once per category per threshold per
 * month" true rather than hopeful: the row is the memory.
 *
 * Two calm rules keep this from becoming noise, and both are deliberate:
 *
 *  · a family is never told off for GIVING or SAVING — those lines are shown,
 *    never alerted, whatever they reach;
 *  · a category whose spend is mostly fixed BILLS (housing, the utilities)
 *    raises no 80% warning, because "the mortgage went out" is not news. It
 *    still raises the 100% one, because that means something unplanned landed.
 */
export function pendingAlerts(state: FinanceState, month: string): Array<{ categoryId: string; threshold: 80 | 100; spentCents: number; budgetCents: number }> {
    const have = new Set(state.alerts.filter((a) => a.month === month).map((a) => `${a.categoryId}:${a.threshold}`));
    const inMonth = entriesInMonth(state.entries, month);
    const out: Array<{ categoryId: string; threshold: 80 | 100; spentCents: number; budgetCents: number }> = [];
    for (const c of categorySpend(state, month)) {
        if (c.budgetCents <= 0 || c.isGiving || c.isSavings) continue;
        const fromBills = sumHome(inMonth.filter((e) => e.categoryId === c.categoryId && e.billId));
        const billDominated = c.spentCents > 0 && fromBills / c.spentCents >= 0.7;
        for (const threshold of [80, 100] as const) {
            if (c.pct < threshold) continue;
            if (threshold === 80 && billDominated) continue;
            if (have.has(`${c.categoryId}:${threshold}`)) continue;
            out.push({ categoryId: c.categoryId, threshold, spentCents: c.spentCents, budgetCents: c.budgetCents });
        }
    }
    return out;
}

export const alertsFor = (state: FinanceState, month: string): BudgetAlert[] => state.alerts.filter((a) => a.month === month).sort((a, b) => b.threshold - a.threshold || a.categoryId.localeCompare(b.categoryId));

export const openAlerts = (state: FinanceState, month: string): BudgetAlert[] => alertsFor(state, month).filter((a) => !a.seenAt);

// ---------------------------------------------------------------------------
// The pipeline (AC 2, 3, 4)
// ---------------------------------------------------------------------------

/** Two parents above the family's threshold, one below it. */
export function requiredApprovals(state: FinanceState, wish: Pick<WishItem, "priceCents">): number {
    return wish.priceCents > state.settings.approvalThresholdCents ? 2 : 1;
}

/** Distinct parents who have said yes — the same person twice is still one yes. */
export function approvalsFor(state: FinanceState, wishId: string): string[] {
    return [...new Set(state.approvals.filter((a) => a.wishId === wishId && a.decision === "approve").map((a) => a.parentMemberId))];
}

export const wishesByStatus = (state: FinanceState, status: WishItem["status"]): WishItem[] => state.wishes.filter((w) => w.status === status).sort((a, b) => b.createdAt.localeCompare(a.createdAt));

export const wishesAwaiting = (state: FinanceState): WishItem[] => wishesByStatus(state, "requested");

export const openWishTotal = (state: FinanceState): number => state.wishes.filter((w) => w.status === "approved" || w.status === "planned").reduce((t, w) => t + w.priceCents, 0);

export const buyTasksFor = (state: FinanceState, memberId?: string): BuyTask[] =>
    state.buyTasks.filter((t) => !t.done && (!memberId || t.assigneeMemberId === memberId)).sort((a, b) => a.dueDate.localeCompare(b.dueDate));

// ---------------------------------------------------------------------------
// Envelopes and pots
// ---------------------------------------------------------------------------

export const envelopeFor = (state: FinanceState, memberId: string): Envelope | undefined => state.envelopes.find((e) => e.memberId === memberId);

export const envelopeEntries = (entries: LedgerEntry[], envelopeId: string): LedgerEntry[] => entries.filter((e) => e.envelopeId === envelopeId).sort((a, b) => b.date.localeCompare(a.date));

export const envelopeSpentThisMonth = (entries: LedgerEntry[], envelopeId: string, month: string): number => sumHome(entriesInMonth(envelopeEntries(entries, envelopeId), month));

export function goalFundsFrom(goals: SavingsGoal[]): GoalFund[] {
    return goals.map((g) => ({
        id: g.id,
        label: g.name,
        goalId: g.goalId,
        savedCents: g.currentCents,
        targetCents: g.targetCents,
        pct: pct(g.currentCents, g.targetCents),
    }));
}

// ---------------------------------------------------------------------------
// Who sees what — the one gate both repos use
// ---------------------------------------------------------------------------

const EMPTY_SUMMARY = (month: string): MonthSummary => ({
    month,
    label: monthLabel(month),
    incomeCents: 0,
    spentCents: 0,
    budgetCents: 0,
    leftCents: 0,
    savedCents: 0,
    givingCents: 0,
    givingPct: 0,
    categories: [],
});

/**
 * The slice this member is allowed to hold.
 *
 *  · a parent gets everything;
 *  · a member granted `finance.view` (Dami, 15) gets the budget totals, the
 *    pots and their own envelope — and NO ledger, so there is nothing in the
 *    slice to leak;
 *  · every other child gets their own wishes and nothing else;
 *  · a guest gets nothing at all.
 */
export function visibleTo(state: FinanceState, ctx: RepoContext): FinanceState {
    const today = ctx.today || isoDate();
    const month = monthOf(today);
    const parent = ctx.role === "parent";
    const bills = stampBills(state.bills, state.billPayments, today);
    const full: FinanceState = { ...state, bills, goalFunds: goalFundsFrom(state.savingsGoals) };

    if (parent) {
        return {
            ...full,
            visible: true,
            summary: monthSummary(full, month),
            mine: { wishes: full.wishes.filter((w) => w.requestedBy === ctx.me.id), envelope: envelopeFor(full, ctx.me.id) ?? null, envelopeEntries: [], canViewBudget: true },
        };
    }

    if (ctx.role === "guest") {
        return {
            ...state,
            visible: false,
            // The demo passcode is a parent's, so it does not travel either.
            settings: { ...state.settings, reauthPin: "" },
            accounts: [],
            budgets: [],
            entries: [],
            bills: [],
            billPayments: [],
            alerts: [],
            wishes: [],
            approvals: [],
            buyTasks: [],
            envelopes: [],
            savingsGoals: [],
            goalFunds: [],
            summary: EMPTY_SUMMARY(month),
            mine: { wishes: [], envelope: null, envelopeEntries: [], canViewBudget: false },
        };
    }

    // A child: their own wishes, their own envelope, and — only with the grant —
    // the budget totals, computed here so no ledger row travels with them.
    const canViewBudget = ctx.can("finance.view");
    const envelope = envelopeFor(full, ctx.me.id) ?? null;
    const mineEntries = envelope ? envelopeEntries(full.entries, envelope.id) : [];
    return {
        ...state,
        visible: false,
        settings: { ...state.settings, reauthPin: "" },
        accounts: [],
        budgets: canViewBudget ? full.budgets : [],
        entries: [],
        bills: [],
        billPayments: [],
        alerts: [],
        wishes: [],
        approvals: [],
        buyTasks: [],
        envelopes: envelope ? [envelope] : [],
        savingsGoals: canViewBudget ? full.savingsGoals : [],
        goalFunds: canViewBudget ? goalFundsFrom(full.savingsGoals) : [],
        summary: canViewBudget ? monthSummary(full, month) : EMPTY_SUMMARY(month),
        mine: {
            wishes: full.wishes.filter((w) => w.requestedBy === ctx.me.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
            envelope,
            envelopeEntries: mineEntries,
            canViewBudget,
        },
    };
}

// ---------------------------------------------------------------------------
// The shared surfaces
// ---------------------------------------------------------------------------

export function dashboard(state: FinanceState, ctx: RepoContext): DashboardContribution {
    const today = ctx.today || isoDate();
    const agenda: AgendaItem[] = [];
    const attention: AttentionItem[] = [];
    const rings: ProgressRing[] = [];
    const childCards: ChildCard[] = [];
    const cur = ctx.space.currency;

    // -- a child: only their own wishes ---------------------------------------
    if (!state.visible) {
        const mine = state.mine.wishes;
        if (mine.length) {
            const waiting = mine.filter((w) => w.status === "requested").length;
            const approved = mine.filter((w) => w.status === "approved" || w.status === "planned").length;
            childCards.push({
                id: "my-wishes",
                moduleId: "finance",
                area: "live",
                title: "My wishes",
                body: waiting ? `${waiting} waiting on a parent${approved ? ` · ${approved} said yes` : ""}` : approved ? `${approved} approved — coming soon` : "Everything you asked for has an answer.",
                emoji: "✨",
                href: `${BASE}/wish`,
                done: waiting === 0,
            });
        } else if (ctx.role === "child") {
            childCards.push({
                id: "make-a-wish",
                moduleId: "finance",
                area: "live",
                title: "Ask for something",
                body: "Tell Mum and Dad what you'd like and why. They'll answer here.",
                emoji: "🎁",
                href: `${BASE}/wish`,
            });
        }
        const env = state.mine.envelope;
        if (env) {
            childCards.push({
                id: "my-envelope",
                moduleId: "finance",
                area: "live",
                title: "My money",
                body: `${money(env.balanceCents, cur)} left of ${money(env.monthlyAmountCents, cur)} this month.`,
                emoji: "👛",
                href: `${BASE}/wish`,
                pct: pct(env.balanceCents, env.monthlyAmountCents),
            });
        }
        return { agenda, attention, rings, childCards };
    }

    // -- a parent --------------------------------------------------------------
    const month = monthOf(today);
    const summary = state.summary.month === month ? state.summary : monthSummary(state, month);

    const billCategoryIds = new Set(state.bills.filter((b) => b.active).map((b) => b.categoryId));
    for (const c of summary.categories) {
        if (c.isGiving || c.isSavings) continue;
        if (c.over) {
            attention.push({
                id: `over-${c.categoryId}`,
                moduleId: "finance",
                area: "live",
                tone: "danger",
                title: `${c.name} is over budget`,
                body: `${money(c.spentCents, cur)} spent against ${money(c.budgetCents, cur)} — ${money(c.spentCents - c.budgetCents, cur)} over, with ${daysLeftInMonth(today)} days of the month to go.`,
                href: `${BASE}/budgets`,
                weight: 82,
            });
        } else if (c.near && !billCategoryIds.has(c.categoryId)) {
            attention.push({
                id: `near-${c.categoryId}`,
                moduleId: "finance",
                area: "live",
                tone: "warn",
                title: `${c.name} at ${c.pct}% of budget`,
                body: `${money(c.budgetCents - c.spentCents, cur)} left for the rest of ${monthLabel(month, false)}.`,
                href: `${BASE}/budgets`,
                weight: 62,
            });
        }
    }

    for (const b of billsOverdue(state.bills, today)) {
        attention.push({
            id: `bill-late-${b.id}`,
            moduleId: "finance",
            area: "live",
            tone: b.parked ? "danger" : "warn",
            title: b.parked ? `Parked: ${b.name} is still unpaid` : `${b.name} was due on ${b.dueDate.slice(8)} ${monthLabel(monthOf(b.dueDate), false)}`,
            body: b.parked
                ? `${money(b.amountCents, cur)} · three reminders have gone out. It needs a decision, not another reminder.`
                : `${money(b.amountCents, cur)} · ${b.remindersSent} of ${REMINDERS_BEFORE_PARK} reminders sent.`,
            href: `${BASE}/bills`,
            weight: b.parked ? 90 : 74,
        });
    }

    for (const b of billsDueWithin(state.bills, today, 3)) {
        agenda.push({
            id: `bill-${b.id}`,
            moduleId: "finance",
            area: "live",
            title: `${b.name} — ${money(b.amountCents, cur)}`,
            meta: b.autopay ? "Bill · goes out automatically" : `Bill · due ${b.dueDate === today ? "today" : `in ${daysBetween(today, b.dueDate)} days`}`,
            memberId: null,
            at: null,
            done: false,
            href: `${BASE}/bills`,
            sort: 720 + daysBetween(today, b.dueDate),
        });
    }

    const waiting = wishesAwaiting(state);
    for (const w of waiting) {
        const prog = approvalsFor(state, w.id);
        const need = requiredApprovals(state, w);
        const mineAlready = prog.includes(ctx.me.id);
        attention.push({
            id: `wish-${w.id}`,
            moduleId: "finance",
            area: "live",
            tone: "info",
            title: `${w.name} — ${money(w.priceCents, cur)}`,
            body:
                need === 2
                    ? `Above ${money(state.settings.approvalThresholdCents, cur)}, so it needs both of you. ${prog.length} of 2 so far${mineAlready ? " (yours is in)" : ""}.`
                    : `${ctx.members.find((m) => m.id === w.requestedBy)?.name.split(" ")[0] ?? "Someone"} asked for this.`,
            href: `${BASE}/purchases`,
            weight: 56,
        });
    }

    for (const t of buyTasksFor(state)) {
        agenda.push({
            id: `buy-${t.id}`,
            moduleId: "finance",
            area: "live",
            title: t.title,
            meta: "From an approved purchase",
            memberId: t.assigneeMemberId,
            at: null,
            done: false,
            href: `${BASE}/purchases`,
            sort: 740 + Math.max(0, daysBetween(today, t.dueDate)),
        });
    }

    for (const g of state.savingsGoals) {
        rings.push({
            id: `fund-${g.id}`,
            moduleId: "finance",
            area: "live",
            label: g.name,
            pct: pct(g.currentCents, g.targetCents),
            sub: `${money(g.currentCents, cur)} of ${money(g.targetCents, cur)}`,
            href: `${BASE}`,
        });
    }

    const year = givingYear(state, today);
    if (year.givingCents > 0) {
        rings.push({
            id: "giving-ytd",
            moduleId: "finance",
            area: "live",
            label: "Given this year",
            pct: Math.min(100, Math.round((year.pct / 15) * 100)),
            sub: `${money(year.givingCents, cur)} · ${year.pct}% of what came in`,
            href: `${BASE}/giving`,
        });
    }

    return { agenda, attention, rings, childCards };
}

export function nudges(state: FinanceState, ctx: RepoContext): Nudge[] {
    if (!state.visible) return [];
    const today = ctx.today || isoDate();
    const parents = ctx.members.filter((m) => m.role === "parent").map((m) => m.id);
    const cur = ctx.space.currency;
    const out: Nudge[] = [];

    for (const b of state.bills) {
        if (!b.active || b.paid) continue;
        const late = b.dueDate < today;
        const soon = !late && daysBetween(today, b.dueDate) <= 3;
        if (!late && !soon) continue;
        // Rule 12: three reminders, then it parks in Needs attention rather
        // than nagging a fourth time.
        if (late && b.remindersSent >= REMINDERS_BEFORE_PARK) continue;
        out.push({
            key: `finance-bill-due-${b.id}-${monthOf(b.dueDate)}-${Math.min(b.remindersSent, REMINDERS_BEFORE_PARK)}`,
            moduleId: "finance",
            kind: "finance",
            title: late ? `${b.name} is unpaid` : `${b.name} is due ${b.dueDate === today ? "today" : `on the ${Number(b.dueDate.slice(8))}`}`,
            body: `${money(b.amountCents, cur)}${b.autopay ? " — it should go out on its own, worth a glance." : ""}`,
            href: `${BASE}/bills`,
            memberIds: parents,
        });
    }

    for (const a of openAlerts(state, monthOf(today))) {
        out.push({
            key: `finance-alert-${a.categoryId}-${a.month}-${a.threshold}`,
            moduleId: "finance",
            kind: "finance",
            title: a.threshold === 100 ? `${categoryName(state, a.categoryId)} is over budget` : `${categoryName(state, a.categoryId)} at ${a.threshold}% of budget`,
            body: `${money(a.spentCents, cur)} of ${money(a.budgetCents, cur)} in ${monthLabel(a.month, false)}.`,
            href: `${BASE}/budgets`,
            memberIds: parents,
        });
    }

    for (const w of wishesAwaiting(state)) {
        const given = approvalsFor(state, w.id);
        const need = requiredApprovals(state, w);
        const outstanding = parents.filter((p) => !given.includes(p));
        if (!outstanding.length || given.length >= need) continue;
        out.push({
            key: `finance-wish-${w.id}-${given.length}`,
            moduleId: "finance",
            kind: "finance",
            title: `${w.name} needs a decision`,
            body: `${money(w.priceCents, cur)} · ${need === 2 ? `${given.length} of 2 approvals so far` : "asked for and waiting"}.`,
            href: `${BASE}/purchases`,
            memberIds: outstanding,
        });
    }

    return out;
}

export function aiContext(state: FinanceState, ctx: RepoContext): string {
    // Money is parents-only: a child's or guest's grounding must not contain it.
    if (!state.visible || ctx.role !== "parent") return "";
    const today = ctx.today || isoDate();
    const month = monthOf(today);
    const cur = ctx.space.currency;
    const s = state.summary.month === month ? state.summary : monthSummary(state, month);
    const lines: string[] = [];

    lines.push(
        `${monthLabel(month)}: ${money(s.incomeCents, cur)} in, ${money(s.spentCents, cur)} spent against a ${money(s.budgetCents, cur)} plan (${money(s.leftCents, cur)} left), ${money(s.savedCents, cur)} saved.`,
    );

    const notable = s.categories
        .filter((c) => c.budgetCents > 0)
        .sort((a, b) => b.pct - a.pct)
        .slice(0, 7)
        .map((c) => `${c.name} ${money(c.spentCents, cur)}/${money(c.budgetCents, cur)} (${c.pct}%)`);
    if (notable.length) lines.push(`Budgets: ${notable.join("; ")}.`);

    const year = givingYear(state, today);
    lines.push(`Giving ${year.year} to date: ${money(year.givingCents, cur)} = ${year.pct}% of income. Recipients: ${givingByRecipient(state, `${year.year}-01-01`, today).slice(0, 4).map((g) => g.recipient).join(", ") || "none"}.`);

    const late = billsOverdue(state.bills, today);
    const soon = billsDueWithin(state.bills, today, 7);
    if (late.length) lines.push(`Unpaid bills: ${late.map((b) => `${b.name} ${money(b.amountCents, cur)} (due ${b.dueDate}${b.parked ? ", parked after 3 reminders" : ""})`).join("; ")}.`);
    if (soon.length) lines.push(`Due within a week: ${soon.map((b) => `${b.name} ${money(b.amountCents, cur)} on ${b.dueDate}`).join("; ")}.`);

    const waiting = wishesAwaiting(state);
    if (waiting.length) {
        lines.push(
            `Purchases waiting: ${waiting.map((w) => `${w.name} ${money(w.priceCents, cur)} (${approvalsFor(state, w.id).length}/${requiredApprovals(state, w)} approvals)`).join("; ")}. Threshold for two parents: ${money(state.settings.approvalThresholdCents, cur)}.`,
        );
    }
    const deferred = state.wishes.filter((w) => w.status === "deferred");
    if (deferred.length) lines.push(`Deferred: ${deferred.map((w) => `${w.name} ${money(w.priceCents, cur)}${w.plannedMonth ? ` to ${monthLabel(w.plannedMonth)}` : ""}`).join("; ")}.`);

    if (state.savingsGoals.length) {
        lines.push(`Pots: ${state.savingsGoals.map((g) => `${g.name} ${money(g.currentCents, cur)}/${money(g.targetCents, cur)}`).join("; ")}.`);
    }
    const foreign = state.entries.filter((e) => e.currency !== cur);
    if (foreign.length) lines.push(`${foreign.length} entries in another currency, converted at the rate on the day; every total above is in ${cur}.`);

    return lines.join(" ").slice(0, 1500);
}

const WISH_LABEL: Record<WishItem["status"], string> = {
    requested: "waiting on a parent",
    approved: "approved",
    deferred: "not yet",
    declined: "declined",
    planned: "planned",
    bought: "bought",
};

export function search(state: FinanceState, q: string): Array<{ title: string; meta: string; href: string }> {
    const needle = q.toLowerCase();
    const hits: Array<{ title: string; meta: string; href: string }> = [];

    for (const w of state.visible ? state.wishes : state.mine.wishes) {
        if (`${w.name} ${w.reason}`.toLowerCase().includes(needle)) {
            hits.push({ title: w.name, meta: `Purchase · ${WISH_LABEL[w.status]}`, href: state.visible ? `${BASE}/purchases` : `${BASE}/wish` });
        }
    }
    if (!state.visible) return hits.slice(0, 8);

    for (const b of state.bills) {
        if (`${b.name} ${b.note}`.toLowerCase().includes(needle)) hits.push({ title: b.name, meta: `Bill · the ${b.dueDay}${b.dueDay === 1 ? "st" : b.dueDay === 2 ? "nd" : b.dueDay === 3 ? "rd" : "th"} of the month`, href: `${BASE}/bills` });
    }
    for (const c of state.budgets) {
        if (c.name.toLowerCase().includes(needle)) hits.push({ title: c.name, meta: "Budget", href: `${BASE}/budgets` });
    }
    for (const g of state.savingsGoals) {
        if (`${g.name} ${g.goalLabel}`.toLowerCase().includes(needle)) hits.push({ title: g.name, meta: "Savings pot", href: BASE });
    }
    for (const e of state.entries) {
        if (`${e.payee} ${e.note} ${e.recipient}`.toLowerCase().includes(needle)) {
            hits.push({ title: e.payee || e.note || "Entry", meta: `${e.kind === "income" ? "Income" : "Spend"} · ${e.date}`, href: `${BASE}/ledger` });
        }
    }
    return hits.slice(0, 8);
}
