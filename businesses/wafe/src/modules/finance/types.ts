import type { ModuleRepo } from "@/data/core";

/**
 * Household finances — what we earn, spend, give and save.
 *
 * This is the most private module in Wàfè, and its shape says so: the state a
 * child or a guest receives is EMPTY except for the two things that are
 * genuinely theirs — the wishes they asked for and, for a young adult, their
 * own envelope. Everything else (the ledger, the bills, the giving record, the
 * pipeline, the pots) exists only in a parent's slice, and the live policies
 * in `sql/finance.sql` enforce the same line at the API.
 *
 * Three ideas carry the whole module:
 *
 *  1. ONE LEDGER. Every movement of money is a `LedgerEntry` — a salary, a
 *     grocery shop, a tithe, a transfer into the deposit pot, a bill payment,
 *     a purchase from the pipeline, a fiver from Dami's envelope. What changes
 *     between them is which links are set, never the shape. Reporting always
 *     reads `amountHomeCents`, so a ₦450,000 deposit on the Lagos house counts
 *     in the same column as a £12 grocery top-up.
 *
 *  2. BUDGETS ARE CATEGORIES. A category with a monthly limit is a budget.
 *     The ids are stable across the product ("groceries", "tithes", …) because
 *     other modules name them: Wellness plans meals against "groceries",
 *     Projects books spend against "home".
 *
 *  3. NOTHING SPENDS ITSELF. A wish becomes a purchase only through a decision
 *     a person made, recorded with their name on it; above the family's
 *     threshold it takes two parents. Marking it bought is what writes money.
 */

// ---------------------------------------------------------------------------
// Money, currency and the reporting rule
// ---------------------------------------------------------------------------

/**
 * Rates are quoted as "one unit of this currency in the space's currency", so
 * `amountHomeCents = round(amountCents * fxRate)`. The home currency is always
 * exactly 1. Kept on the entry as well as in settings, because a rate that
 * changes next month must not silently rewrite last month's accounts.
 */
export type FxRates = Record<string, number>;

export type AccountKind = "cash" | "bank" | "savings" | "mobile_money";

export const ACCOUNT_KIND_LABEL: Record<AccountKind, string> = {
    cash: "Cash",
    bank: "Bank",
    savings: "Savings",
    mobile_money: "Mobile money",
};

export interface Account {
    id: string;
    spaceId: string;
    name: string;
    kind: AccountKind;
    currency: string;
    openingBalanceCents: number;
    active: boolean;
    createdAt: string;
}

// ---------------------------------------------------------------------------
// Categories = budgets
// ---------------------------------------------------------------------------

/** The tint a category wears on bars and chips. */
export type CategoryColour = "brand" | "live" | "terra" | "ochre" | "plum" | "sage" | "mint";

export interface BudgetCategory {
    id: string;
    spaceId: string;
    name: string;
    /** Income categories are budgeted too — that is the plan for what arrives. */
    kind: "income" | "expense";
    monthlyBudgetCents: number;
    isGiving: boolean;
    isFood: boolean;
    isSavings: boolean;
    colour: CategoryColour;
    order: number;
    active: boolean;
}

/** The category keys the rest of the product may name. */
export const CORE_CATEGORY_IDS = [
    "groceries",
    "tithes",
    "giving",
    "savings",
    "education",
    "housing",
    "transport",
    "fun",
    "health",
    "home",
    "holidays",
    "other",
] as const;

// ---------------------------------------------------------------------------
// The ledger
// ---------------------------------------------------------------------------

export type EntryKind = "income" | "expense";

export interface LedgerEntry {
    id: string;
    spaceId: string;
    /** YYYY-MM-DD. */
    date: string;
    kind: EntryKind;
    /** Always positive, in `currency`. */
    amountCents: number;
    currency: string;
    /** `amountCents` converted at `fxRate` into the space's currency. */
    fxRate: number;
    amountHomeCents: number;
    categoryId: string;
    accountId: string;
    /** Whose spend it was, when that matters (a child's envelope, a parent's own). */
    memberId: string | null;
    /** One of the space's values, by name ("Generosity"). */
    valueId: string | null;
    payee: string;
    note: string;
    receiptUrl: string | null;
    /** Who received the gift, for giving entries ("Grace Chapel", "Aunty Bisi"). */
    recipient: string;
    /** Links back to whatever caused this money to move. */
    billId: string | null;
    envelopeId: string | null;
    wishId: string | null;
    savingsGoalId: string | null;
    createdBy: string;
    createdAt: string;
}

// ---------------------------------------------------------------------------
// Bills
// ---------------------------------------------------------------------------

export type BillFreq = "monthly" | "quarterly" | "yearly";

export const BILL_FREQ_LABEL: Record<BillFreq, string> = { monthly: "Every month", quarterly: "Every quarter", yearly: "Once a year" };

/**
 * `dueDate` and `paid` are stamped by the repos (from `billPayments`) so the
 * calendar can overlay bills straight off our slice without importing our
 * arithmetic — the same trick Tasks uses for `goalLabel`.
 */
export interface Bill {
    id: string;
    spaceId: string;
    name: string;
    amountCents: number;
    categoryId: string;
    accountId: string;
    /** 1–28, so every month has one. */
    dueDay: number;
    freq: BillFreq;
    autopay: boolean;
    active: boolean;
    /** Manual reminders a parent has sent this month; three parks it (rule 12). */
    remindersSent: number;
    note: string;
    createdAt: string;

    // -- stamped, not stored --------------------------------------------------
    /** The occurrence this screen cares about: the next unpaid one. */
    dueDate: string;
    paid: boolean;
    /** Unpaid, past its day, and out of reminders. */
    parked: boolean;
}

export interface BillPayment {
    id: string;
    spaceId: string;
    billId: string;
    /** YYYY-MM. */
    month: string;
    paidAt: string;
    ledgerEntryId: string | null;
}

// ---------------------------------------------------------------------------
// Alerts
// ---------------------------------------------------------------------------

export type AlertThreshold = 80 | 100;

/** One row per category per threshold per month — that is what "fires once" means. */
export interface BudgetAlert {
    id: string;
    spaceId: string;
    categoryId: string;
    /** YYYY-MM. */
    month: string;
    threshold: AlertThreshold;
    spentCents: number;
    budgetCents: number;
    firedAt: string;
    seenAt: string | null;
}

// ---------------------------------------------------------------------------
// The purchase pipeline
// ---------------------------------------------------------------------------

export type WishStatus = "requested" | "approved" | "deferred" | "declined" | "planned" | "bought";

export const WISH_STATUS_LABEL: Record<WishStatus, string> = {
    requested: "Waiting on a parent",
    approved: "Approved",
    deferred: "Not yet",
    declined: "Declined",
    planned: "Planned",
    bought: "Bought",
};

export const WISH_STATUS_ORDER: WishStatus[] = ["requested", "approved", "planned", "deferred", "declined", "bought"];

export type WishDecision = "approve" | "defer" | "decline";

export type WishPriority = "low" | "normal" | "high";

export interface WishItem {
    id: string;
    spaceId: string;
    name: string;
    link: string;
    priceCents: number;
    requestedBy: string;
    reason: string;
    categoryId: string;
    status: WishStatus;
    priority: WishPriority;
    /** YYYY-MM for "not this month, but November". */
    plannedMonth: string | null;
    decisionComment: string;
    /** The "Buy X" job this wish created when it was approved. */
    buyTaskId: string | null;
    ledgerEntryId: string | null;
    imageUrl: string | null;
    /** Where it came from: a wardrobe gap, a project, a plain ask. */
    sourceType: "manual" | "child-wish" | "wardrobe" | "project" | "travel";
    sourceId: string | null;
    createdAt: string;
    decidedAt: string | null;
    boughtAt: string | null;
}

export interface WishApproval {
    id: string;
    spaceId: string;
    wishId: string;
    parentMemberId: string;
    decision: WishDecision;
    comment: string;
    at: string;
}

/**
 * The job approving a wish creates. It lives here rather than in Tasks because
 * a module never writes another module's rows; the dashboard puts it on the
 * assignee's Today, which is where a task is felt.
 */
export interface BuyTask {
    id: string;
    spaceId: string;
    wishId: string;
    title: string;
    assigneeMemberId: string;
    dueDate: string;
    done: boolean;
    createdBy: string;
    createdAt: string;
    doneAt: string | null;
}

// ---------------------------------------------------------------------------
// Envelopes and pots
// ---------------------------------------------------------------------------

/** A young adult's own money: topped up monthly, spent by them, seen by them. */
export interface Envelope {
    id: string;
    spaceId: string;
    memberId: string;
    monthlyAmountCents: number;
    balanceCents: number;
    grantedBy: string;
    note: string;
    /** YYYY-MM of the last top-up, so a month is never credited twice. */
    lastToppedUp: string;
    createdAt: string;
}

export interface SavingsGoal {
    id: string;
    spaceId: string;
    name: string;
    /** The Goals module's goal this pot measures, when there is one. */
    goalId: string | null;
    goalLabel: string;
    targetCents: number;
    currentCents: number;
    accountId: string;
    note: string;
    createdAt: string;
}

/**
 * What Goals reads off our slice (its `LinkedFund`): a savings pot as a number
 * with a target, keyed by a ref stable across modules ("fund-home-deposit").
 * Goals never reads our tables — it reads this.
 */
export interface GoalFund {
    id: string;
    label: string;
    goalId: string | null;
    savedCents: number;
    targetCents: number;
    pct: number;
}

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------

export interface FinanceSettings {
    spaceId: string;
    currency: string;
    /** Above this, a purchase needs two different parents to say yes. */
    approvalThresholdCents: number;
    /** Minutes of idle before a write asks "is it still you?". */
    reauthMinutes: number;
    /** Demo only: the passcode the re-auth dialog accepts (live uses the password). */
    reauthPin: string;
    fxRates: FxRates;
    /** The tithe percentage the family gives off every pound that arrives. */
    tithePct: number;
    note: string;
}

export const REMINDERS_BEFORE_PARK = 3;

// ---------------------------------------------------------------------------
// Derived shapes the screens read
// ---------------------------------------------------------------------------

export interface CategorySpend {
    categoryId: string;
    name: string;
    colour: CategoryColour;
    budgetCents: number;
    spentCents: number;
    pct: number;
    over: boolean;
    near: boolean;
    isGiving: boolean;
    isFood: boolean;
    isSavings: boolean;
}

export interface MonthSummary {
    /** YYYY-MM. */
    month: string;
    label: string;
    incomeCents: number;
    spentCents: number;
    budgetCents: number;
    leftCents: number;
    savedCents: number;
    givingCents: number;
    givingPct: number;
    categories: CategorySpend[];
}

export interface GivingLine {
    recipient: string;
    cents: number;
    count: number;
    lastAt: string;
}

export interface MonthPoint {
    month: string;
    label: string;
    incomeCents: number;
    spentCents: number;
}

/** The slice a child or a young adult gets: only what is theirs. */
export interface MineSlice {
    wishes: WishItem[];
    envelope: Envelope | null;
    envelopeEntries: LedgerEntry[];
    /** True when this member may see the read-only budget overview. */
    canViewBudget: boolean;
}

export interface FinanceState {
    /** False for anyone who may not see the family's money — the screens branch on it. */
    visible: boolean;
    accounts: Account[];
    budgets: BudgetCategory[];
    entries: LedgerEntry[];
    bills: Bill[];
    billPayments: BillPayment[];
    alerts: BudgetAlert[];
    wishes: WishItem[];
    approvals: WishApproval[];
    buyTasks: BuyTask[];
    envelopes: Envelope[];
    savingsGoals: SavingsGoal[];
    /** Cross-module read-out for Goals. */
    goalFunds: GoalFund[];
    settings: FinanceSettings;
    /** This month, already totalled — so a read-only viewer needs no ledger. */
    summary: MonthSummary;
    mine: MineSlice;
}

// ---------------------------------------------------------------------------
// Writes
// ---------------------------------------------------------------------------

export interface NewEntry {
    date: string;
    kind: EntryKind;
    amountCents: number;
    currency?: string;
    fxRate?: number;
    categoryId: string;
    accountId: string;
    memberId?: string | null;
    valueId?: string | null;
    payee?: string;
    note?: string;
    receiptUrl?: string | null;
    recipient?: string;
    billId?: string | null;
    envelopeId?: string | null;
    wishId?: string | null;
    savingsGoalId?: string | null;
}

export interface NewWish {
    name: string;
    priceCents: number;
    reason?: string;
    link?: string;
    categoryId?: string;
    priority?: WishPriority;
    imageUrl?: string | null;
    requestedBy?: string;
    sourceType?: WishItem["sourceType"];
    sourceId?: string | null;
}

export interface NewBill {
    name: string;
    amountCents: number;
    categoryId: string;
    accountId: string;
    dueDay: number;
    freq?: BillFreq;
    autopay?: boolean;
    note?: string;
}

/** What a decision did, so the page can say it out loud. */
export interface WishDecisionResult {
    wishId: string;
    status: WishStatus;
    /** Distinct parents who have said yes. */
    approvals: number;
    /** How many this wish needs (2 above the threshold). */
    required: number;
    /** Set when this decision was the one that tipped it. */
    buyTaskId: string | null;
    buyTaskTitle: string;
}

export interface ImportRow {
    date: string;
    amountCents: number;
    kind: EntryKind;
    note: string;
    payee: string;
    categoryId: string;
}

export interface ImportResult {
    imported: number;
    duplicates: number;
    skipped: number;
    /** The de-duplication key that matched, for the "we already had these" list. */
    duplicateNotes: string[];
}

/** The 15-minute idle rule, as the pages see it. */
export interface LockState {
    unlocked: boolean;
    /** Epoch ms the unlock lapses; 0 when locked. */
    expiresAt: number;
    minutes: number;
}

export interface FinanceRepo extends ModuleRepo<FinanceState> {
    // -- the 15-minute rule ---------------------------------------------------
    lockState(): LockState;
    /** Demo: the family passcode. Live: the account password. */
    unlock(secret: string): Promise<void>;
    lock(): void;

    // -- ledger ---------------------------------------------------------------
    addEntry(input: NewEntry): Promise<LedgerEntry>;
    updateEntry(id: string, patch: Partial<NewEntry>): Promise<void>;
    removeEntry(id: string): Promise<void>;
    importEntries(rows: ImportRow[], accountId: string): Promise<ImportResult>;

    // -- budgets --------------------------------------------------------------
    setBudget(categoryId: string, monthlyBudgetCents: number): Promise<void>;
    addCategory(input: { name: string; monthlyBudgetCents: number; isGiving?: boolean; isFood?: boolean; isSavings?: boolean; colour?: CategoryColour }): Promise<BudgetCategory>;
    removeCategory(id: string): Promise<void>;
    /** Fire any 80%/100% alert that has not fired yet this month (AC 1). */
    runBudgetAlerts(month: string): Promise<BudgetAlert[]>;
    dismissAlert(id: string): Promise<void>;

    // -- bills ----------------------------------------------------------------
    addBill(input: NewBill): Promise<Bill>;
    updateBill(id: string, patch: Partial<NewBill> & { active?: boolean }): Promise<void>;
    removeBill(id: string): Promise<void>;
    payBill(id: string, month: string, date?: string): Promise<LedgerEntry>;
    unpayBill(id: string, month: string): Promise<void>;
    remindBill(id: string): Promise<void>;

    // -- the pipeline ---------------------------------------------------------
    createWish(input: NewWish): Promise<WishItem>;
    decideWish(id: string, decision: WishDecision, comment?: string, plannedMonth?: string | null): Promise<WishDecisionResult>;
    setWishAssignee(id: string, memberId: string): Promise<void>;
    markWishBought(id: string, input: { amountCents: number; accountId: string; date?: string; note?: string }): Promise<LedgerEntry>;
    removeWish(id: string): Promise<void>;

    // -- envelopes and pots ---------------------------------------------------
    setEnvelope(memberId: string, monthlyAmountCents: number): Promise<Envelope>;
    topUpEnvelope(id: string, month: string): Promise<void>;
    spendFromEnvelope(id: string, input: { amountCents: number; note: string; categoryId?: string; date?: string }): Promise<LedgerEntry>;
    removeEnvelope(id: string): Promise<void>;

    addSavingsGoal(input: { name: string; targetCents: number; accountId: string; goalId?: string | null; goalLabel?: string }): Promise<SavingsGoal>;
    contributeToSavings(id: string, cents: number, date?: string): Promise<LedgerEntry>;
    linkSavingsGoal(id: string, goalId: string | null, goalLabel: string): Promise<void>;
    removeSavingsGoal(id: string): Promise<void>;

    // -- settings -------------------------------------------------------------
    updateSettings(patch: Partial<Pick<FinanceSettings, "approvalThresholdCents" | "reauthMinutes" | "tithePct" | "note" | "fxRates">>): Promise<void>;
}
