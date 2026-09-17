import type { RepoContext } from "@/data/core";
import { isoDate, uid } from "@/lib/format";
import { supabase } from "@/lib/supabase";
import { approvalsFor, dayInMonth, monthOf, pendingAlerts, requiredApprovals, summaryFromTotals, visibleTo } from "./derive";
import { NEEDS_REAUTH, dedupeKey } from "./local";
import type {
    Account,
    AccountKind,
    Bill,
    BillPayment,
    BudgetAlert,
    BudgetCategory,
    BuyTask,
    Envelope,
    EntryKind,
    FinanceRepo,
    FinanceSettings,
    FinanceState,
    ImportResult,
    ImportRow,
    LedgerEntry,
    LockState,
    NewBill,
    NewEntry,
    NewWish,
    SavingsGoal,
    WishApproval,
    WishDecision,
    WishDecisionResult,
    WishItem,
    WishPriority,
    WishStatus,
} from "./types";

/**
 * The same money, live, under row-level security.
 *
 * The database is the real guard here — `sql/finance.sql` gives every finance
 * table a `wf_is_parent(space_id)` policy, so a child's session does not read
 * a single ledger row no matter what this file asks for. Two deliberate
 * exceptions, both of them things that genuinely belong to the person:
 * a member reads and writes their OWN wishes, and a young adult reads the
 * ledger rows tagged with their OWN envelope.
 *
 * The slice is still run through the same `visibleTo()` the demo uses, so the
 * two modes cannot drift, and snake_case ↔ camelCase mapping lives in this
 * file and nowhere else. No query here touches another module's tables.
 */

type Row = Record<string, unknown>;

const s = (v: unknown, d = ""): string => (typeof v === "string" ? v : d);
const n = (v: unknown, d = 0): number => (typeof v === "number" ? v : Number(v ?? d) || d);
const b = (v: unknown): boolean => v === true;
const iso = (v: unknown): string => (v ? new Date(v as string).toISOString() : new Date().toISOString());
const date = (v: unknown, d = ""): string => (typeof v === "string" && v ? v.slice(0, 10) : d);
const nul = (v: unknown): string | null => (typeof v === "string" && v ? v : null);

function fail(where: string, error: { message: string } | null | undefined): void {
    if (error) throw new Error(`${where}: ${error.message}`);
}

const rates = (v: unknown): Record<string, number> => {
    if (!v || typeof v !== "object") return {};
    const out: Record<string, number> = {};
    for (const [k, val] of Object.entries(v as Record<string, unknown>)) if (typeof val === "number") out[k] = val;
    return out;
};

// ---------------------------------------------------------------------------
// Row → entity
// ---------------------------------------------------------------------------

const mapAccount = (r: Row): Account => ({
    id: s(r.id),
    spaceId: s(r.space_id),
    name: s(r.name),
    kind: s(r.kind, "bank") as AccountKind,
    currency: s(r.currency, "GBP"),
    openingBalanceCents: n(r.opening_balance_cents),
    active: r.active !== false,
    createdAt: iso(r.created_at),
});

const mapCategory = (r: Row): BudgetCategory => ({
    id: s(r.id),
    spaceId: s(r.space_id),
    name: s(r.name),
    kind: s(r.kind, "expense") === "income" ? "income" : "expense",
    monthlyBudgetCents: n(r.monthly_budget_cents),
    isGiving: b(r.is_giving),
    isFood: b(r.is_food),
    isSavings: b(r.is_savings),
    colour: s(r.colour, "sage") as BudgetCategory["colour"],
    order: n(r.sort_order),
    active: r.active !== false,
});

const mapEntry = (r: Row): LedgerEntry => ({
    id: s(r.id),
    spaceId: s(r.space_id),
    date: date(r.entry_date),
    kind: s(r.kind, "expense") === "income" ? "income" : "expense",
    amountCents: n(r.amount_cents),
    currency: s(r.currency, "GBP"),
    fxRate: n(r.fx_rate, 1) || 1,
    amountHomeCents: n(r.amount_home_cents),
    categoryId: s(r.category_id),
    accountId: s(r.account_id),
    memberId: nul(r.member_id),
    valueId: nul(r.value_id),
    payee: s(r.payee),
    note: s(r.note),
    receiptUrl: nul(r.receipt_url),
    recipient: s(r.recipient),
    billId: nul(r.bill_id),
    envelopeId: nul(r.envelope_id),
    wishId: nul(r.wish_id),
    savingsGoalId: nul(r.savings_goal_id),
    createdBy: s(r.created_by),
    createdAt: iso(r.created_at),
});

const mapBill = (r: Row): Bill => ({
    id: s(r.id),
    spaceId: s(r.space_id),
    name: s(r.name),
    amountCents: n(r.amount_cents),
    categoryId: s(r.category_id),
    accountId: s(r.account_id),
    dueDay: n(r.due_day, 1),
    freq: s(r.freq, "monthly") as Bill["freq"],
    autopay: b(r.autopay),
    active: r.active !== false,
    remindersSent: n(r.reminders_sent),
    note: s(r.note),
    createdAt: iso(r.created_at),
    dueDate: "",
    paid: false,
    parked: false,
});

const mapPayment = (r: Row): BillPayment => ({
    id: s(r.id),
    spaceId: s(r.space_id),
    billId: s(r.bill_id),
    month: s(r.month),
    paidAt: iso(r.paid_at),
    ledgerEntryId: nul(r.ledger_entry_id),
});

const mapAlert = (r: Row): BudgetAlert => ({
    id: s(r.id),
    spaceId: s(r.space_id),
    categoryId: s(r.category_id),
    month: s(r.month),
    threshold: n(r.threshold, 80) >= 100 ? 100 : 80,
    spentCents: n(r.spent_cents),
    budgetCents: n(r.budget_cents),
    firedAt: iso(r.fired_at),
    seenAt: nul(r.seen_at) ? iso(r.seen_at) : null,
});

const mapWish = (r: Row): WishItem => ({
    id: s(r.id),
    spaceId: s(r.space_id),
    name: s(r.name),
    link: s(r.link),
    priceCents: n(r.price_cents),
    requestedBy: s(r.requested_by),
    reason: s(r.reason),
    categoryId: s(r.category_id, "other"),
    status: s(r.status, "requested") as WishStatus,
    priority: s(r.priority, "normal") as WishPriority,
    plannedMonth: nul(r.planned_month),
    decisionComment: s(r.decision_comment),
    buyTaskId: nul(r.buy_task_id),
    ledgerEntryId: nul(r.ledger_entry_id),
    imageUrl: nul(r.image_url),
    sourceType: s(r.source_type, "manual") as WishItem["sourceType"],
    sourceId: nul(r.source_id),
    createdAt: iso(r.created_at),
    decidedAt: nul(r.decided_at) ? iso(r.decided_at) : null,
    boughtAt: nul(r.bought_at) ? iso(r.bought_at) : null,
});

const mapApproval = (r: Row): WishApproval => ({
    id: s(r.id),
    spaceId: s(r.space_id),
    wishId: s(r.wish_id),
    parentMemberId: s(r.parent_member_id),
    decision: s(r.decision, "approve") as WishDecision,
    comment: s(r.comment),
    at: iso(r.decided_at),
});

const mapBuyTask = (r: Row): BuyTask => ({
    id: s(r.id),
    spaceId: s(r.space_id),
    wishId: s(r.wish_id),
    title: s(r.title),
    assigneeMemberId: s(r.assignee_member_id),
    dueDate: date(r.due_date),
    done: b(r.done),
    createdBy: s(r.created_by),
    createdAt: iso(r.created_at),
    doneAt: nul(r.done_at) ? iso(r.done_at) : null,
});

const mapEnvelope = (r: Row): Envelope => ({
    id: s(r.id),
    spaceId: s(r.space_id),
    memberId: s(r.member_id),
    monthlyAmountCents: n(r.monthly_amount_cents),
    balanceCents: n(r.balance_cents),
    grantedBy: s(r.granted_by),
    note: s(r.note),
    lastToppedUp: s(r.last_topped_up),
    createdAt: iso(r.created_at),
});

const mapSavings = (r: Row): SavingsGoal => ({
    id: s(r.id),
    spaceId: s(r.space_id),
    name: s(r.name),
    goalId: nul(r.goal_id),
    goalLabel: s(r.goal_label),
    targetCents: n(r.target_cents),
    currentCents: n(r.current_cents),
    accountId: s(r.account_id),
    note: s(r.note),
    createdAt: iso(r.created_at),
});

const DEFAULT_SETTINGS = (spaceId: string, currency: string): FinanceSettings => ({
    spaceId,
    currency,
    approvalThresholdCents: 30000,
    reauthMinutes: 15,
    reauthPin: "",
    fxRates: { [currency]: 1 },
    tithePct: 10,
    note: "",
});

const UNLOCK_KEY = "wafe:finance:unlocked";

export class SupabaseFinanceRepo implements FinanceRepo {
    private settings: FinanceSettings;

    constructor(private ctx: RepoContext) {
        this.settings = DEFAULT_SETTINGS(ctx.space.id, ctx.space.currency);
    }

    private get space(): string {
        return this.ctx.space.id;
    }

    private get org(): string {
        return this.ctx.orgId ?? "";
    }

    private get today(): string {
        return this.ctx.today || isoDate();
    }

    private get isParent(): boolean {
        return this.ctx.role === "parent";
    }

    private deny(): never {
        throw new Error("Not allowed");
    }

    private parentOnly(): void {
        if (!this.isParent) this.deny();
    }

    private base(): { organization_id: string; space_id: string } {
        return { organization_id: this.org, space_id: this.space };
    }

    // -- the fifteen-minute rule ---------------------------------------------

    private readUnlock(): number {
        try {
            return Number(sessionStorage.getItem(UNLOCK_KEY) || 0);
        } catch {
            return 0;
        }
    }

    private writeUnlock(at: number): void {
        try {
            sessionStorage.setItem(UNLOCK_KEY, String(at));
        } catch {
            /* the guard simply asks again */
        }
    }

    lockState(): LockState {
        const minutes = this.settings.reauthMinutes || 15;
        let at = this.readUnlock();
        if (!at) {
            at = Date.now();
            this.writeUnlock(at);
        }
        const expiresAt = at + minutes * 60_000;
        return { unlocked: Date.now() < expiresAt, expiresAt: Date.now() < expiresAt ? expiresAt : 0, minutes };
    }

    /** Live re-authentication is the account password, checked by Supabase. */
    async unlock(secret: string): Promise<void> {
        const { data } = await supabase.auth.getUser();
        const email = data.user?.email;
        if (!email) throw new Error("You need to sign in again.");
        const { error } = await supabase.auth.signInWithPassword({ email, password: secret });
        if (error) throw new Error("That password isn't right.");
        this.writeUnlock(Date.now());
    }

    lock(): void {
        this.writeUnlock(1);
    }

    private touch(): void {
        if (!this.lockState().unlocked) throw new Error(NEEDS_REAUTH);
        this.writeUnlock(Date.now());
    }

    // -- load -----------------------------------------------------------------

    async load(): Promise<FinanceState> {
        const empty: FinanceState = {
            visible: false,
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
            settings: this.settings,
            summary: { month: monthOf(this.today), label: "", incomeCents: 0, spentCents: 0, budgetCents: 0, leftCents: 0, savedCents: 0, givingCents: 0, givingPct: 0, categories: [] },
            mine: { wishes: [], envelope: null, envelopeEntries: [], canViewBudget: false },
        };
        if (!this.org) return empty;

        const q = (table: string, cols = "*") => supabase.from(table).select(cols).eq("space_id", this.space);

        // Everything the policies will allow. A child's session simply gets
        // empty arrays back for the parents-only tables — no error, no leak.
        const [accounts, categories, entries, bills, payments, alerts, wishes, approvals, buyTasks, envelopes, savingsGoals, settings] = await Promise.all([
            q("wf_finance_accounts"),
            q("wf_finance_categories"),
            q("wf_finance_entries").order("entry_date", { ascending: false }).limit(4000),
            q("wf_finance_bills"),
            q("wf_finance_bill_payments"),
            q("wf_finance_alerts"),
            q("wf_finance_wishes"),
            q("wf_finance_wish_approvals"),
            q("wf_finance_buy_tasks"),
            q("wf_finance_envelopes"),
            q("wf_finance_savings_goals"),
            q("wf_finance_settings").maybeSingle(),
        ]);
        fail("finance", entries.error ?? categories.error ?? bills.error);

        const settingsRow = (settings.data ?? null) as Row | null;
        this.settings = settingsRow
            ? {
                  spaceId: this.space,
                  currency: s(settingsRow.currency, this.ctx.space.currency),
                  approvalThresholdCents: n(settingsRow.approval_threshold_cents, 30000),
                  reauthMinutes: n(settingsRow.reauth_minutes, 15),
                  reauthPin: "",
                  fxRates: { [this.ctx.space.currency]: 1, ...rates(settingsRow.fx_rates) },
                  tithePct: n(settingsRow.tithe_pct, 10),
                  note: s(settingsRow.note),
              }
            : DEFAULT_SETTINGS(this.space, this.ctx.space.currency);

        const full: FinanceState = {
            ...empty,
            visible: this.isParent,
            accounts: ((accounts.data ?? []) as unknown as Row[]).map(mapAccount),
            budgets: ((categories.data ?? []) as unknown as Row[]).map(mapCategory).sort((a, c) => a.order - c.order),
            entries: ((entries.data ?? []) as unknown as Row[]).map(mapEntry),
            bills: ((bills.data ?? []) as unknown as Row[]).map(mapBill),
            billPayments: ((payments.data ?? []) as unknown as Row[]).map(mapPayment),
            alerts: ((alerts.data ?? []) as unknown as Row[]).map(mapAlert),
            wishes: ((wishes.data ?? []) as unknown as Row[]).map(mapWish),
            approvals: ((approvals.data ?? []) as unknown as Row[]).map(mapApproval),
            buyTasks: ((buyTasks.data ?? []) as unknown as Row[]).map(mapBuyTask),
            envelopes: ((envelopes.data ?? []) as unknown as Row[]).map(mapEnvelope),
            savingsGoals: ((savingsGoals.data ?? []) as unknown as Row[]).map(mapSavings),
            settings: this.settings,
        };
        const view = visibleTo(full, this.ctx);

        // A member with only `finance.view` never receives a ledger row, so the
        // totals cannot be summed on the client the way the demo sums them.
        // Postgres does it instead, behind a security-definer function that
        // checks the same grant: one number per category, no rows.
        if (!this.isParent && view.mine.canViewBudget) {
            const month = monthOf(this.today);
            const { data, error } = await supabase.rpc("wf_finance_month_summary", { p_space: this.space, p_month: month });
            if (!error && Array.isArray(data)) {
                const totals = (data as unknown as Row[]).map((r) => ({ categoryId: s(r.category_id, "other"), spentCents: n(r.spent_cents), incomeCents: n(r.income_cents) }));
                return { ...view, summary: summaryFromTotals(view.budgets, totals, month) };
            }
        }
        return view;
    }

    private async fullState(): Promise<FinanceState> {
        const st = await this.load();
        return st;
    }

    // -- ledger ---------------------------------------------------------------

    private entryRow(input: NewEntry, id?: string): Row {
        const currency = input.currency ?? this.settings.currency;
        const fxRate = currency === this.settings.currency ? 1 : (input.fxRate ?? this.settings.fxRates[currency] ?? 1);
        const amountCents = Math.max(0, Math.round(input.amountCents));
        return {
            ...(id ? { id } : {}),
            ...this.base(),
            entry_date: input.date || this.today,
            kind: input.kind as EntryKind,
            amount_cents: amountCents,
            currency,
            fx_rate: fxRate,
            amount_home_cents: Math.round(amountCents * fxRate),
            category_id: input.categoryId,
            account_id: input.accountId,
            member_id: input.memberId ?? null,
            value_id: input.valueId ?? null,
            payee: (input.payee ?? "").trim(),
            note: (input.note ?? "").trim(),
            receipt_url: input.receiptUrl ?? null,
            recipient: (input.recipient ?? "").trim(),
            bill_id: input.billId ?? null,
            envelope_id: input.envelopeId ?? null,
            wish_id: input.wishId ?? null,
            savings_goal_id: input.savingsGoalId ?? null,
            created_by: this.ctx.me.id,
        };
    }

    async addEntry(input: NewEntry): Promise<LedgerEntry> {
        this.parentOnly();
        this.touch();
        const { data, error } = await supabase.from("wf_finance_entries").insert(this.entryRow(input)).select().single();
        fail("addEntry", error);
        const entry = mapEntry(data as Row);
        await this.runBudgetAlerts(monthOf(entry.date));
        return entry;
    }

    async updateEntry(id: string, patch: Partial<NewEntry>): Promise<void> {
        this.parentOnly();
        this.touch();
        const row: Row = {};
        if (patch.date) row.entry_date = patch.date;
        if (patch.kind) row.kind = patch.kind;
        if (patch.categoryId) row.category_id = patch.categoryId;
        if (patch.accountId) row.account_id = patch.accountId;
        if (patch.memberId !== undefined) row.member_id = patch.memberId;
        if (patch.valueId !== undefined) row.value_id = patch.valueId;
        if (patch.payee !== undefined) row.payee = patch.payee.trim();
        if (patch.note !== undefined) row.note = patch.note.trim();
        if (patch.recipient !== undefined) row.recipient = patch.recipient.trim();
        if (patch.receiptUrl !== undefined) row.receipt_url = patch.receiptUrl;
        if (patch.amountCents !== undefined || patch.currency || patch.fxRate !== undefined) {
            const currency = patch.currency ?? this.settings.currency;
            const fxRate = currency === this.settings.currency ? 1 : (patch.fxRate ?? this.settings.fxRates[currency] ?? 1);
            const amountCents = Math.max(0, Math.round(patch.amountCents ?? 0));
            row.currency = currency;
            row.fx_rate = fxRate;
            row.amount_cents = amountCents;
            row.amount_home_cents = Math.round(amountCents * fxRate);
        }
        const { error } = await supabase.from("wf_finance_entries").update(row).eq("id", id).eq("space_id", this.space);
        fail("updateEntry", error);
    }

    async removeEntry(id: string): Promise<void> {
        this.parentOnly();
        this.touch();
        const { error } = await supabase.from("wf_finance_entries").delete().eq("id", id).eq("space_id", this.space);
        fail("removeEntry", error);
    }

    async importEntries(rows: ImportRow[], accountId: string): Promise<ImportResult> {
        this.parentOnly();
        this.touch();
        const state = await this.fullState();
        const seen = new Set(state.entries.map((e) => dedupeKey(e.date, e.amountHomeCents, e.note || e.payee)));
        const result: ImportResult = { imported: 0, duplicates: 0, skipped: 0, duplicateNotes: [] };
        const payload: Row[] = [];
        for (const r of rows) {
            if (!r.date || !r.amountCents) {
                result.skipped += 1;
                continue;
            }
            const note = (r.note || r.payee || "").trim();
            const key = dedupeKey(r.date, Math.round(r.amountCents), note);
            if (seen.has(key)) {
                result.duplicates += 1;
                if (result.duplicateNotes.length < 6) result.duplicateNotes.push(`${r.date} · ${note || "no description"}`);
                continue;
            }
            seen.add(key);
            payload.push(this.entryRow({ date: r.date, kind: r.kind, amountCents: r.amountCents, categoryId: r.categoryId || "other", accountId, payee: r.payee, note: r.note }));
            result.imported += 1;
        }
        if (payload.length) {
            const { error } = await supabase.from("wf_finance_entries").insert(payload);
            fail("importEntries", error);
        }
        return result;
    }

    // -- budgets --------------------------------------------------------------

    async setBudget(categoryId: string, monthlyBudgetCents: number): Promise<void> {
        this.parentOnly();
        this.touch();
        const { error } = await supabase
            .from("wf_finance_categories")
            .update({ monthly_budget_cents: Math.max(0, Math.round(monthlyBudgetCents)) })
            .eq("id", categoryId)
            .eq("space_id", this.space);
        fail("setBudget", error);
    }

    async addCategory(input: { name: string; monthlyBudgetCents: number; isGiving?: boolean; isFood?: boolean; isSavings?: boolean; colour?: BudgetCategory["colour"] }): Promise<BudgetCategory> {
        this.parentOnly();
        this.touch();
        const { data, error } = await supabase
            .from("wf_finance_categories")
            .insert({
                ...this.base(),
                id: uid("cat"),
                name: input.name.trim() || "New budget",
                kind: "expense",
                monthly_budget_cents: Math.max(0, Math.round(input.monthlyBudgetCents)),
                is_giving: input.isGiving ?? false,
                is_food: input.isFood ?? false,
                is_savings: input.isSavings ?? false,
                colour: input.colour ?? "sage",
                sort_order: 99,
            })
            .select()
            .single();
        fail("addCategory", error);
        return mapCategory(data as Row);
    }

    async removeCategory(id: string): Promise<void> {
        this.parentOnly();
        this.touch();
        await supabase.from("wf_finance_entries").update({ category_id: "other" }).eq("category_id", id).eq("space_id", this.space);
        const { error } = await supabase.from("wf_finance_categories").delete().eq("id", id).eq("space_id", this.space);
        fail("removeCategory", error);
    }

    /** Insert exactly the alerts that are due and have not fired (AC 1). The
     *  unique index on (space, category, month, threshold) is the backstop. */
    async runBudgetAlerts(month: string): Promise<BudgetAlert[]> {
        if (!this.isParent) return [];
        const state = await this.fullState();
        const due = pendingAlerts(state, month);
        if (!due.length) return [];
        const { data, error } = await supabase
            .from("wf_finance_alerts")
            .upsert(
                due.map((p) => ({ ...this.base(), category_id: p.categoryId, month, threshold: p.threshold, spent_cents: p.spentCents, budget_cents: p.budgetCents })),
                { onConflict: "space_id,category_id,month,threshold", ignoreDuplicates: true },
            )
            .select();
        fail("runBudgetAlerts", error);
        return ((data ?? []) as Row[]).map(mapAlert);
    }

    async dismissAlert(id: string): Promise<void> {
        this.parentOnly();
        const { error } = await supabase.from("wf_finance_alerts").update({ seen_at: new Date().toISOString() }).eq("id", id).eq("space_id", this.space);
        fail("dismissAlert", error);
    }

    // -- bills ----------------------------------------------------------------

    async addBill(input: NewBill): Promise<Bill> {
        this.parentOnly();
        this.touch();
        const { data, error } = await supabase
            .from("wf_finance_bills")
            .insert({
                ...this.base(),
                name: input.name.trim() || "New bill",
                amount_cents: Math.max(0, Math.round(input.amountCents)),
                category_id: input.categoryId,
                account_id: input.accountId,
                due_day: Math.min(28, Math.max(1, Math.round(input.dueDay))),
                freq: input.freq ?? "monthly",
                autopay: input.autopay ?? false,
                note: (input.note ?? "").trim(),
            })
            .select()
            .single();
        fail("addBill", error);
        return mapBill(data as Row);
    }

    async updateBill(id: string, patch: Partial<NewBill> & { active?: boolean }): Promise<void> {
        this.parentOnly();
        this.touch();
        const row: Row = {};
        if (patch.name !== undefined) row.name = patch.name.trim();
        if (patch.amountCents !== undefined) row.amount_cents = Math.max(0, Math.round(patch.amountCents));
        if (patch.categoryId) row.category_id = patch.categoryId;
        if (patch.accountId) row.account_id = patch.accountId;
        if (patch.dueDay !== undefined) row.due_day = Math.min(28, Math.max(1, Math.round(patch.dueDay)));
        if (patch.freq) row.freq = patch.freq;
        if (patch.autopay !== undefined) row.autopay = patch.autopay;
        if (patch.note !== undefined) row.note = patch.note.trim();
        if (patch.active !== undefined) row.active = patch.active;
        const { error } = await supabase.from("wf_finance_bills").update(row).eq("id", id).eq("space_id", this.space);
        fail("updateBill", error);
    }

    async removeBill(id: string): Promise<void> {
        this.parentOnly();
        this.touch();
        const { error } = await supabase.from("wf_finance_bills").delete().eq("id", id).eq("space_id", this.space);
        fail("removeBill", error);
    }

    async payBill(id: string, month: string, when?: string): Promise<LedgerEntry> {
        this.parentOnly();
        this.touch();
        const state = await this.fullState();
        const bill = state.bills.find((x) => x.id === id);
        if (!bill) throw new Error("That bill is gone.");
        if (state.billPayments.some((p) => p.billId === id && p.month === month)) throw new Error(`${bill.name} is already marked paid for that month.`);
        const { data, error } = await supabase
            .from("wf_finance_entries")
            .insert(this.entryRow({ date: when || this.today, kind: "expense", amountCents: bill.amountCents, categoryId: bill.categoryId, accountId: bill.accountId, payee: bill.name, note: "Bill paid", billId: bill.id }))
            .select()
            .single();
        fail("payBill", error);
        const entry = mapEntry(data as Row);
        const { error: payErr } = await supabase.from("wf_finance_bill_payments").insert({ ...this.base(), bill_id: id, month, paid_at: new Date().toISOString(), ledger_entry_id: entry.id });
        fail("payBill", payErr);
        await supabase.from("wf_finance_bills").update({ reminders_sent: 0 }).eq("id", id).eq("space_id", this.space);
        await this.runBudgetAlerts(monthOf(entry.date));
        return entry;
    }

    async unpayBill(id: string, month: string): Promise<void> {
        this.parentOnly();
        this.touch();
        const state = await this.fullState();
        const payment = state.billPayments.find((p) => p.billId === id && p.month === month);
        if (payment?.ledgerEntryId) await supabase.from("wf_finance_entries").delete().eq("id", payment.ledgerEntryId).eq("space_id", this.space);
        const { error } = await supabase.from("wf_finance_bill_payments").delete().eq("bill_id", id).eq("month", month).eq("space_id", this.space);
        fail("unpayBill", error);
    }

    async remindBill(id: string): Promise<void> {
        this.parentOnly();
        const state = await this.fullState();
        const bill = state.bills.find((x) => x.id === id);
        if (!bill) return;
        const { error } = await supabase.from("wf_finance_bills").update({ reminders_sent: bill.remindersSent + 1 }).eq("id", id).eq("space_id", this.space);
        fail("remindBill", error);
    }

    // -- the pipeline ---------------------------------------------------------

    async createWish(input: NewWish): Promise<WishItem> {
        if (this.ctx.role === "guest") this.deny();
        const requestedBy = this.isParent ? (input.requestedBy ?? this.ctx.me.id) : this.ctx.me.id;
        const { data, error } = await supabase
            .from("wf_finance_wishes")
            .insert({
                ...this.base(),
                name: input.name.trim() || "Something",
                link: (input.link ?? "").trim(),
                price_cents: Math.max(0, Math.round(input.priceCents)),
                requested_by: requestedBy,
                reason: (input.reason ?? "").trim(),
                category_id: input.categoryId || "other",
                status: "requested",
                priority: input.priority ?? "normal",
                image_url: input.imageUrl ?? null,
                source_type: input.sourceType ?? (this.isParent ? "manual" : "child-wish"),
                source_id: input.sourceId ?? null,
            })
            .select()
            .single();
        fail("createWish", error);
        return mapWish(data as Row);
    }

    async decideWish(id: string, decision: WishDecision, comment = "", plannedMonth: string | null = null): Promise<WishDecisionResult> {
        this.parentOnly();
        this.touch();
        const before = await this.fullState();
        const wish = before.wishes.find((w) => w.id === id);
        if (!wish) throw new Error("That request is gone.");

        // One parent, one vote.
        await supabase.from("wf_finance_wish_approvals").delete().eq("wish_id", id).eq("parent_member_id", this.ctx.me.id).eq("space_id", this.space);
        const { error: appErr } = await supabase
            .from("wf_finance_wish_approvals")
            .insert({ ...this.base(), wish_id: id, parent_member_id: this.ctx.me.id, decision, comment: comment.trim(), decided_at: new Date().toISOString() });
        fail("decideWish", appErr);

        const after = await this.fullState();
        const given = approvalsFor(after, id);
        const required = requiredApprovals(after, wish);
        let status: WishStatus = wish.status;
        let buyTaskId = wish.buyTaskId;
        let buyTaskTitle = "";

        if (decision === "decline") status = "declined";
        else if (decision === "defer") status = "deferred";
        else if (given.length >= required) {
            status = "approved";
            if (!buyTaskId) {
                const requester = this.ctx.members.find((m) => m.id === wish.requestedBy);
                const assignee = requester && requester.role === "parent" ? requester.id : this.ctx.me.id;
                buyTaskTitle = `Buy ${wish.name.charAt(0).toLowerCase()}${wish.name.slice(1)}`;
                const { data, error } = await supabase
                    .from("wf_finance_buy_tasks")
                    .insert({
                        ...this.base(),
                        wish_id: id,
                        title: buyTaskTitle,
                        assignee_member_id: assignee,
                        due_date: dayInMonth(monthOf(this.today), Math.min(28, Number(this.today.slice(8)) + 7)),
                        created_by: this.ctx.me.id,
                    })
                    .select()
                    .single();
                fail("decideWish", error);
                buyTaskId = s((data as Row).id);
            }
        }

        const { error } = await supabase
            .from("wf_finance_wishes")
            .update({
                status,
                buy_task_id: buyTaskId,
                decision_comment: comment.trim() || wish.decisionComment,
                planned_month: decision === "defer" ? (plannedMonth ?? wish.plannedMonth) : wish.plannedMonth,
                decided_at: new Date().toISOString(),
            })
            .eq("id", id)
            .eq("space_id", this.space);
        fail("decideWish", error);
        return { wishId: id, status, approvals: given.length, required, buyTaskId: status === "approved" ? buyTaskId : null, buyTaskTitle };
    }

    async setWishAssignee(id: string, memberId: string): Promise<void> {
        this.parentOnly();
        this.touch();
        const { error } = await supabase.from("wf_finance_buy_tasks").update({ assignee_member_id: memberId }).eq("wish_id", id).eq("space_id", this.space);
        fail("setWishAssignee", error);
    }

    async markWishBought(id: string, input: { amountCents: number; accountId: string; date?: string; note?: string }): Promise<LedgerEntry> {
        this.parentOnly();
        this.touch();
        const state = await this.fullState();
        const wish = state.wishes.find((w) => w.id === id);
        if (!wish) throw new Error("That request is gone.");
        if (wish.status === "declined") throw new Error("That one was declined — approve it first.");
        const { data, error } = await supabase
            .from("wf_finance_entries")
            .insert(
                this.entryRow({
                    date: input.date || this.today,
                    kind: "expense",
                    amountCents: input.amountCents,
                    categoryId: wish.categoryId,
                    accountId: input.accountId,
                    payee: wish.name,
                    note: (input.note ?? "").trim() || `Bought: ${wish.name}`,
                    wishId: wish.id,
                    memberId: wish.requestedBy,
                }),
            )
            .select()
            .single();
        fail("markWishBought", error);
        const entry = mapEntry(data as Row);
        await supabase.from("wf_finance_wishes").update({ status: "bought", ledger_entry_id: entry.id, bought_at: new Date().toISOString() }).eq("id", id).eq("space_id", this.space);
        await supabase.from("wf_finance_buy_tasks").update({ done: true, done_at: new Date().toISOString() }).eq("wish_id", id).eq("space_id", this.space);
        await this.runBudgetAlerts(monthOf(entry.date));
        return entry;
    }

    async removeWish(id: string): Promise<void> {
        const { error } = await supabase.from("wf_finance_wishes").delete().eq("id", id).eq("space_id", this.space);
        fail("removeWish", error);
    }

    // -- envelopes ------------------------------------------------------------

    async setEnvelope(memberId: string, monthlyAmountCents: number): Promise<Envelope> {
        this.parentOnly();
        this.touch();
        const amount = Math.max(0, Math.round(monthlyAmountCents));
        const state = await this.fullState();
        const existing = state.envelopes.find((e) => e.memberId === memberId);
        if (existing) {
            const { error } = await supabase.from("wf_finance_envelopes").update({ monthly_amount_cents: amount }).eq("id", existing.id).eq("space_id", this.space);
            fail("setEnvelope", error);
            return { ...existing, monthlyAmountCents: amount };
        }
        const { data, error } = await supabase
            .from("wf_finance_envelopes")
            .insert({ ...this.base(), member_id: memberId, monthly_amount_cents: amount, balance_cents: amount, granted_by: this.ctx.me.id, last_topped_up: monthOf(this.today) })
            .select()
            .single();
        fail("setEnvelope", error);
        return mapEnvelope(data as Row);
    }

    async topUpEnvelope(id: string, month: string): Promise<void> {
        this.parentOnly();
        this.touch();
        const state = await this.fullState();
        const env = state.envelopes.find((e) => e.id === id);
        if (!env) throw new Error("That envelope is gone.");
        if (env.lastToppedUp === month) throw new Error("It has already been topped up this month.");
        const { error } = await supabase
            .from("wf_finance_envelopes")
            .update({ balance_cents: env.balanceCents + env.monthlyAmountCents, last_topped_up: month })
            .eq("id", id)
            .eq("space_id", this.space);
        fail("topUpEnvelope", error);
    }

    async spendFromEnvelope(id: string, input: { amountCents: number; note: string; categoryId?: string; date?: string }): Promise<LedgerEntry> {
        const state = await this.fullState();
        const env = state.envelopes.find((e) => e.id === id) ?? state.mine.envelope;
        if (!env || env.id !== id) throw new Error("That envelope is gone.");
        if (!this.isParent && env.memberId !== this.ctx.me.id) this.deny();
        const amount = Math.max(0, Math.round(input.amountCents));
        if (amount > env.balanceCents) throw new Error("That's more than is left in the envelope.");
        const accountId = state.accounts[0]?.id ?? "";
        const { data, error } = await supabase
            .from("wf_finance_entries")
            .insert(this.entryRow({ date: input.date || this.today, kind: "expense", amountCents: amount, categoryId: input.categoryId || "fun", accountId, payee: input.note.trim(), memberId: env.memberId, envelopeId: env.id }))
            .select()
            .single();
        fail("spendFromEnvelope", error);
        const { error: balErr } = await supabase.from("wf_finance_envelopes").update({ balance_cents: env.balanceCents - amount }).eq("id", id).eq("space_id", this.space);
        fail("spendFromEnvelope", balErr);
        return mapEntry(data as Row);
    }

    async removeEnvelope(id: string): Promise<void> {
        this.parentOnly();
        this.touch();
        const { error } = await supabase.from("wf_finance_envelopes").delete().eq("id", id).eq("space_id", this.space);
        fail("removeEnvelope", error);
    }

    // -- pots -----------------------------------------------------------------

    async addSavingsGoal(input: { name: string; targetCents: number; accountId: string; goalId?: string | null; goalLabel?: string }): Promise<SavingsGoal> {
        this.parentOnly();
        this.touch();
        const { data, error } = await supabase
            .from("wf_finance_savings_goals")
            .insert({ ...this.base(), name: input.name.trim() || "New pot", target_cents: Math.max(0, Math.round(input.targetCents)), current_cents: 0, account_id: input.accountId, goal_id: input.goalId ?? null, goal_label: (input.goalLabel ?? "").trim() })
            .select()
            .single();
        fail("addSavingsGoal", error);
        return mapSavings(data as Row);
    }

    async contributeToSavings(id: string, cents: number, when?: string): Promise<LedgerEntry> {
        this.parentOnly();
        this.touch();
        const state = await this.fullState();
        const pot = state.savingsGoals.find((g) => g.id === id);
        if (!pot) throw new Error("That pot is gone.");
        const amount = Math.max(0, Math.round(cents));
        const { data, error } = await supabase
            .from("wf_finance_entries")
            .insert(this.entryRow({ date: when || this.today, kind: "expense", amountCents: amount, categoryId: "savings", accountId: pot.accountId, payee: pot.name, note: "Into the pot", savingsGoalId: pot.id }))
            .select()
            .single();
        fail("contributeToSavings", error);
        const { error: potErr } = await supabase.from("wf_finance_savings_goals").update({ current_cents: pot.currentCents + amount }).eq("id", id).eq("space_id", this.space);
        fail("contributeToSavings", potErr);
        return mapEntry(data as Row);
    }

    async linkSavingsGoal(id: string, goalId: string | null, goalLabel: string): Promise<void> {
        this.parentOnly();
        this.touch();
        const { error } = await supabase.from("wf_finance_savings_goals").update({ goal_id: goalId, goal_label: goalLabel.trim() }).eq("id", id).eq("space_id", this.space);
        fail("linkSavingsGoal", error);
    }

    async removeSavingsGoal(id: string): Promise<void> {
        this.parentOnly();
        this.touch();
        const { error } = await supabase.from("wf_finance_savings_goals").delete().eq("id", id).eq("space_id", this.space);
        fail("removeSavingsGoal", error);
    }

    // -- settings -------------------------------------------------------------

    async updateSettings(patch: Partial<FinanceSettings>): Promise<void> {
        this.parentOnly();
        this.touch();
        const row: Row = { ...this.base() };
        if (patch.approvalThresholdCents !== undefined) row.approval_threshold_cents = Math.max(0, Math.round(patch.approvalThresholdCents));
        if (patch.reauthMinutes !== undefined) row.reauth_minutes = Math.max(1, Math.round(patch.reauthMinutes));
        if (patch.tithePct !== undefined) row.tithe_pct = patch.tithePct;
        if (patch.note !== undefined) row.note = patch.note.trim();
        if (patch.fxRates !== undefined) row.fx_rates = patch.fxRates;
        const { error } = await supabase.from("wf_finance_settings").upsert(row, { onConflict: "space_id" });
        fail("updateSettings", error);
    }
}
