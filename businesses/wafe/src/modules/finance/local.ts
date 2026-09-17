import type { RepoContext } from "@/data/core";
import { seedContext } from "@/data/coreSeed";
import { isoDate, uid } from "@/lib/format";
import { approvalsFor, dayInMonth, monthOf, pendingAlerts, requiredApprovals, visibleTo } from "./derive";
import { seed } from "./seed";
import type {
    Bill,
    BudgetAlert,
    BudgetCategory,
    Envelope,
    FinanceRepo,
    FinanceState,
    ImportResult,
    ImportRow,
    LedgerEntry,
    LockState,
    NewBill,
    NewEntry,
    NewWish,
    SavingsGoal,
    WishDecision,
    WishDecisionResult,
    WishItem,
} from "./types";

/**
 * The family's money in the browser — every write real.
 *
 * Three guards run here exactly as the live policies run in Postgres, so
 * "Not allowed" means the same thing in both modes:
 *
 *  1. MONEY IS PARENTS-ONLY. Every method below except `createWish` and a
 *     young adult's own `spendFromEnvelope` refuses anyone who is not a
 *     parent — and `load()` hands a child a slice with no ledger in it, so
 *     there is nothing to refuse access to in the first place.
 *  2. THE FIFTEEN-MINUTE RULE. A parent's money write after fifteen idle
 *     minutes throws `NEEDS_REAUTH`; the screens catch it, ask "is it still
 *     you?", and replay the write. Every successful write is activity and
 *     resets the clock.
 *  3. NOTHING SPENDS ITSELF. A wish becomes money only through `decideWish`
 *     (two parents above the threshold) and then `markWishBought`, which is
 *     the single place a purchase writes a ledger entry.
 */

const KEY = "wafe:demo:finance:v2";
const UNLOCK_KEY = "wafe:demo:finance:unlocked";

/** Thrown when a write needs the person to prove it is still them. */
export const NEEDS_REAUTH = "NEEDS_REAUTH";

function isState(v: unknown): v is FinanceState {
    if (!v || typeof v !== "object") return false;
    const s = v as Partial<FinanceState>;
    return Array.isArray(s.entries) && Array.isArray(s.budgets) && Array.isArray(s.bills) && Array.isArray(s.wishes) && Boolean(s.settings);
}

const now = (): string => new Date().toISOString();
const clean = (v: string | undefined, d = ""): string => (v ?? d).trim();

/** The de-duplication key for an import: date + amount + note (AC 11). */
export const dedupeKey = (date: string, amountCents: number, note: string): string => `${date}|${amountCents}|${note.trim().toLowerCase()}`;

export class LocalFinanceRepo implements FinanceRepo {
    private cache: FinanceState | null = null;

    constructor(private ctx: RepoContext) {}

    // -- storage -------------------------------------------------------------

    private all(): FinanceState {
        if (this.cache) return this.cache;
        try {
            const raw = localStorage.getItem(KEY);
            const parsed: unknown = raw ? JSON.parse(raw) : null;
            if (isState(parsed)) {
                this.cache = parsed;
                return parsed;
            }
        } catch {
            /* a stale or foreign blob must never break the demo */
        }
        const fresh = seed(seedContext(this.ctx.space, this.ctx.members, this.ctx.today));
        this.save(fresh);
        return fresh;
    }

    private save(s: FinanceState): void {
        this.cache = s;
        try {
            localStorage.setItem(KEY, JSON.stringify(s));
        } catch {
            /* private browsing: the session still works, it just won't persist */
        }
    }

    private write<T>(fn: (s: FinanceState) => T): T {
        const s = { ...this.all() };
        const out = fn(s);
        this.save(s);
        return out;
    }

    async load(): Promise<FinanceState> {
        return visibleTo(this.all(), this.ctx);
    }

    // -- guards --------------------------------------------------------------

    private deny(): never {
        throw new Error("Not allowed");
    }

    private get isParent(): boolean {
        return this.ctx.role === "parent";
    }

    private parentOnly(): void {
        if (!this.isParent) this.deny();
    }

    private get today(): string {
        return this.ctx.today || isoDate();
    }

    // -- the fifteen-minute rule (AC 8) --------------------------------------

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
            /* fine — the guard simply asks again */
        }
    }

    lockState(): LockState {
        const minutes = this.all().settings.reauthMinutes;
        let at = this.readUnlock();
        // Signing in IS the first authentication: the clock starts now.
        if (!at) {
            at = Date.now();
            this.writeUnlock(at);
        }
        const expiresAt = at + minutes * 60_000;
        return { unlocked: Date.now() < expiresAt, expiresAt: Date.now() < expiresAt ? expiresAt : 0, minutes };
    }

    async unlock(secret: string): Promise<void> {
        const pin = this.all().settings.reauthPin;
        if (clean(secret) !== pin) throw new Error("That passcode isn't right.");
        this.writeUnlock(Date.now());
    }

    lock(): void {
        this.writeUnlock(1);
    }

    /** Every money write goes through here. Success is activity: the clock resets. */
    private touch(): void {
        if (!this.lockState().unlocked) throw new Error(NEEDS_REAUTH);
        this.writeUnlock(Date.now());
    }

    // -- ledger ---------------------------------------------------------------

    private makeEntry(s: FinanceState, input: NewEntry, createdBy: string): LedgerEntry {
        const currency = input.currency ?? s.settings.currency;
        const fxRate = currency === s.settings.currency ? 1 : (input.fxRate ?? s.settings.fxRates[currency] ?? 1);
        const amountCents = Math.max(0, Math.round(input.amountCents));
        return {
            id: uid("fin"),
            spaceId: this.ctx.space.id,
            date: input.date || this.today,
            kind: input.kind,
            amountCents,
            currency,
            fxRate,
            amountHomeCents: Math.round(amountCents * fxRate),
            categoryId: input.categoryId,
            accountId: input.accountId,
            memberId: input.memberId ?? null,
            valueId: input.valueId ?? null,
            payee: clean(input.payee),
            note: clean(input.note),
            receiptUrl: input.receiptUrl ?? null,
            recipient: clean(input.recipient),
            billId: input.billId ?? null,
            envelopeId: input.envelopeId ?? null,
            wishId: input.wishId ?? null,
            savingsGoalId: input.savingsGoalId ?? null,
            createdBy,
            createdAt: now(),
        };
    }

    async addEntry(input: NewEntry): Promise<LedgerEntry> {
        this.parentOnly();
        this.touch();
        return this.write((s) => {
            const e = this.makeEntry(s, input, this.ctx.me.id);
            s.entries = [e, ...s.entries];
            this.fireAlerts(s, monthOf(e.date));
            return e;
        });
    }

    async updateEntry(id: string, patch: Partial<NewEntry>): Promise<void> {
        this.parentOnly();
        this.touch();
        this.write((s) => {
            s.entries = s.entries.map((e) => {
                if (e.id !== id) return e;
                const currency = patch.currency ?? e.currency;
                const fxRate = currency === s.settings.currency ? 1 : (patch.fxRate ?? (currency === e.currency ? e.fxRate : (s.settings.fxRates[currency] ?? 1)));
                const amountCents = patch.amountCents === undefined ? e.amountCents : Math.max(0, Math.round(patch.amountCents));
                return {
                    ...e,
                    ...patch,
                    payee: patch.payee === undefined ? e.payee : clean(patch.payee),
                    note: patch.note === undefined ? e.note : clean(patch.note),
                    recipient: patch.recipient === undefined ? e.recipient : clean(patch.recipient),
                    currency,
                    fxRate,
                    amountCents,
                    amountHomeCents: Math.round(amountCents * fxRate),
                };
            });
            this.fireAlerts(s, monthOf(this.today));
        });
    }

    async removeEntry(id: string): Promise<void> {
        this.parentOnly();
        this.touch();
        this.write((s) => {
            const gone = s.entries.find((e) => e.id === id);
            s.entries = s.entries.filter((e) => e.id !== id);
            // A payment removed is a bill unpaid again.
            if (gone?.billId) s.billPayments = s.billPayments.filter((p) => p.ledgerEntryId !== id);
            if (gone?.wishId) s.wishes = s.wishes.map((w) => (w.ledgerEntryId === id ? { ...w, status: "approved", ledgerEntryId: null, boughtAt: null } : w));
        });
    }

    /** Map, then de-duplicate on date + amount + note (AC 11). */
    async importEntries(rows: ImportRow[], accountId: string): Promise<ImportResult> {
        this.parentOnly();
        this.touch();
        return this.write((s) => {
            const seen = new Set(s.entries.map((e) => dedupeKey(e.date, e.amountHomeCents, e.note || e.payee)));
            const result: ImportResult = { imported: 0, duplicates: 0, skipped: 0, duplicateNotes: [] };
            const fresh: LedgerEntry[] = [];
            for (const r of rows) {
                if (!r.date || !r.amountCents) {
                    result.skipped += 1;
                    continue;
                }
                const note = clean(r.note) || clean(r.payee);
                const key = dedupeKey(r.date, Math.round(r.amountCents), note);
                if (seen.has(key)) {
                    result.duplicates += 1;
                    if (result.duplicateNotes.length < 6) result.duplicateNotes.push(`${r.date} · ${note || "no description"}`);
                    continue;
                }
                seen.add(key);
                fresh.push(
                    this.makeEntry(
                        s,
                        { date: r.date, kind: r.kind, amountCents: r.amountCents, categoryId: r.categoryId || "other", accountId, payee: r.payee, note: r.note },
                        this.ctx.me.id,
                    ),
                );
                result.imported += 1;
            }
            s.entries = [...fresh, ...s.entries];
            this.fireAlerts(s, monthOf(this.today));
            return result;
        });
    }

    // -- budgets --------------------------------------------------------------

    async setBudget(categoryId: string, monthlyBudgetCents: number): Promise<void> {
        this.parentOnly();
        this.touch();
        this.write((s) => {
            s.budgets = s.budgets.map((c) => (c.id === categoryId ? { ...c, monthlyBudgetCents: Math.max(0, Math.round(monthlyBudgetCents)) } : c));
        });
    }

    async addCategory(input: { name: string; monthlyBudgetCents: number; isGiving?: boolean; isFood?: boolean; isSavings?: boolean; colour?: BudgetCategory["colour"] }): Promise<BudgetCategory> {
        this.parentOnly();
        this.touch();
        return this.write((s) => {
            const c: BudgetCategory = {
                id: uid("cat"),
                spaceId: this.ctx.space.id,
                name: clean(input.name) || "New budget",
                kind: "expense",
                monthlyBudgetCents: Math.max(0, Math.round(input.monthlyBudgetCents)),
                isGiving: input.isGiving ?? false,
                isFood: input.isFood ?? false,
                isSavings: input.isSavings ?? false,
                colour: input.colour ?? "sage",
                order: s.budgets.length,
                active: true,
            };
            s.budgets = [...s.budgets, c];
            return c;
        });
    }

    async removeCategory(id: string): Promise<void> {
        this.parentOnly();
        this.touch();
        this.write((s) => {
            // Never orphan money: the entries move to "Everything else".
            s.entries = s.entries.map((e) => (e.categoryId === id ? { ...e, categoryId: "other" } : e));
            s.budgets = s.budgets.filter((c) => c.id !== id);
        });
    }

    /** Insert every alert that is due and has not fired this month (AC 1). */
    private fireAlerts(s: FinanceState, month: string): BudgetAlert[] {
        const fresh = pendingAlerts(s, month).map<BudgetAlert>((p) => ({
            id: uid("alert"),
            spaceId: this.ctx.space.id,
            categoryId: p.categoryId,
            month,
            threshold: p.threshold,
            spentCents: p.spentCents,
            budgetCents: p.budgetCents,
            firedAt: now(),
            seenAt: null,
        }));
        if (fresh.length) s.alerts = [...s.alerts, ...fresh];
        return fresh;
    }

    async runBudgetAlerts(month: string): Promise<BudgetAlert[]> {
        if (!this.isParent) return [];
        return this.write((s) => this.fireAlerts(s, month));
    }

    async dismissAlert(id: string): Promise<void> {
        this.parentOnly();
        this.write((s) => {
            s.alerts = s.alerts.map((a) => (a.id === id ? { ...a, seenAt: now() } : a));
        });
    }

    // -- bills ----------------------------------------------------------------

    async addBill(input: NewBill): Promise<Bill> {
        this.parentOnly();
        this.touch();
        return this.write((s) => {
            const b: Bill = {
                id: uid("bill"),
                spaceId: this.ctx.space.id,
                name: clean(input.name) || "New bill",
                amountCents: Math.max(0, Math.round(input.amountCents)),
                categoryId: input.categoryId,
                accountId: input.accountId,
                dueDay: Math.min(28, Math.max(1, Math.round(input.dueDay))),
                freq: input.freq ?? "monthly",
                autopay: input.autopay ?? false,
                active: true,
                remindersSent: 0,
                note: clean(input.note),
                createdAt: now(),
                dueDate: dayInMonth(monthOf(this.today), Math.min(28, Math.max(1, Math.round(input.dueDay)))),
                paid: false,
                parked: false,
            };
            s.bills = [...s.bills, b];
            return b;
        });
    }

    async updateBill(id: string, patch: Partial<NewBill> & { active?: boolean }): Promise<void> {
        this.parentOnly();
        this.touch();
        this.write((s) => {
            s.bills = s.bills.map((b) =>
                b.id === id
                    ? {
                          ...b,
                          ...patch,
                          name: patch.name === undefined ? b.name : clean(patch.name) || b.name,
                          note: patch.note === undefined ? b.note : clean(patch.note),
                          amountCents: patch.amountCents === undefined ? b.amountCents : Math.max(0, Math.round(patch.amountCents)),
                          dueDay: patch.dueDay === undefined ? b.dueDay : Math.min(28, Math.max(1, Math.round(patch.dueDay))),
                      }
                    : b,
            );
        });
    }

    async removeBill(id: string): Promise<void> {
        this.parentOnly();
        this.touch();
        this.write((s) => {
            s.bills = s.bills.filter((b) => b.id !== id);
            s.billPayments = s.billPayments.filter((p) => p.billId !== id);
        });
    }

    async payBill(id: string, month: string, date?: string): Promise<LedgerEntry> {
        this.parentOnly();
        this.touch();
        return this.write((s) => {
            const b = s.bills.find((x) => x.id === id);
            if (!b) throw new Error("That bill is gone.");
            if (s.billPayments.some((p) => p.billId === id && p.month === month)) throw new Error(`${b.name} is already marked paid for that month.`);
            const e = this.makeEntry(
                s,
                { date: date || this.today, kind: "expense", amountCents: b.amountCents, categoryId: b.categoryId, accountId: b.accountId, payee: b.name, note: "Bill paid", billId: b.id },
                this.ctx.me.id,
            );
            s.entries = [e, ...s.entries];
            s.billPayments = [...s.billPayments, { id: uid("bp"), spaceId: this.ctx.space.id, billId: id, month, paidAt: now(), ledgerEntryId: e.id }];
            s.bills = s.bills.map((x) => (x.id === id ? { ...x, remindersSent: 0 } : x));
            this.fireAlerts(s, monthOf(e.date));
            return e;
        });
    }

    async unpayBill(id: string, month: string): Promise<void> {
        this.parentOnly();
        this.touch();
        this.write((s) => {
            const p = s.billPayments.find((x) => x.billId === id && x.month === month);
            s.billPayments = s.billPayments.filter((x) => !(x.billId === id && x.month === month));
            if (p?.ledgerEntryId) s.entries = s.entries.filter((e) => e.id !== p.ledgerEntryId);
        });
    }

    /** A parent's nudge. Three of them and the bill parks itself (rule 12, AC 9). */
    async remindBill(id: string): Promise<void> {
        this.parentOnly();
        this.write((s) => {
            s.bills = s.bills.map((b) => (b.id === id ? { ...b, remindersSent: b.remindersSent + 1 } : b));
        });
    }

    // -- the pipeline ---------------------------------------------------------

    /** Anyone in the family may ask — that is the whole point of the wish form. */
    async createWish(input: NewWish): Promise<WishItem> {
        if (this.ctx.role === "guest") this.deny();
        const requestedBy = this.isParent ? (input.requestedBy ?? this.ctx.me.id) : this.ctx.me.id;
        return this.write((s) => {
            const w: WishItem = {
                id: uid("purchase"),
                spaceId: this.ctx.space.id,
                name: clean(input.name) || "Something",
                link: clean(input.link),
                priceCents: Math.max(0, Math.round(input.priceCents)),
                requestedBy,
                reason: clean(input.reason),
                categoryId: input.categoryId || "other",
                status: "requested",
                priority: input.priority ?? "normal",
                plannedMonth: null,
                decisionComment: "",
                buyTaskId: null,
                ledgerEntryId: null,
                imageUrl: input.imageUrl ?? null,
                sourceType: input.sourceType ?? (this.isParent ? "manual" : "child-wish"),
                sourceId: input.sourceId ?? null,
                createdAt: now(),
                decidedAt: null,
                boughtAt: null,
            };
            s.wishes = [w, ...s.wishes];
            return w;
        });
    }

    async decideWish(id: string, decision: WishDecision, comment = "", plannedMonth: string | null = null): Promise<WishDecisionResult> {
        this.parentOnly();
        this.touch();
        return this.write((s) => {
            const w = s.wishes.find((x) => x.id === id);
            if (!w) throw new Error("That request is gone.");

            // One parent, one vote: a second opinion from the same person replaces the first.
            s.approvals = [
                ...s.approvals.filter((a) => !(a.wishId === id && a.parentMemberId === this.ctx.me.id)),
                { id: uid("app"), spaceId: this.ctx.space.id, wishId: id, parentMemberId: this.ctx.me.id, decision, comment: clean(comment), at: now() },
            ];

            const given = approvalsFor(s, id);
            const required = requiredApprovals(s, w);
            let status = w.status;
            let buyTaskId: string | null = w.buyTaskId;
            let buyTaskTitle = "";

            if (decision === "decline") {
                status = "declined";
            } else if (decision === "defer") {
                status = "deferred";
            } else if (given.length >= required) {
                status = "approved";
                // Approving creates the job (AC 3): somebody has to actually buy it.
                if (!buyTaskId) {
                    const requester = this.ctx.members.find((m) => m.id === w.requestedBy);
                    const assignee = requester && requester.role === "parent" ? requester.id : this.ctx.me.id;
                    buyTaskTitle = `Buy ${w.name.charAt(0).toLowerCase()}${w.name.slice(1)}`;
                    buyTaskId = uid("buy");
                    s.buyTasks = [
                        ...s.buyTasks,
                        {
                            id: buyTaskId,
                            spaceId: this.ctx.space.id,
                            wishId: id,
                            title: buyTaskTitle,
                            assigneeMemberId: assignee,
                            dueDate: dayInMonth(monthOf(this.today), Math.min(28, Number(this.today.slice(8)) + 7)),
                            done: false,
                            createdBy: this.ctx.me.id,
                            createdAt: now(),
                            doneAt: null,
                        },
                    ];
                }
            }

            s.wishes = s.wishes.map((x) =>
                x.id === id
                    ? { ...x, status, buyTaskId, decisionComment: clean(comment) || x.decisionComment, plannedMonth: decision === "defer" ? (plannedMonth ?? x.plannedMonth) : x.plannedMonth, decidedAt: now() }
                    : x,
            );

            return { wishId: id, status, approvals: given.length, required, buyTaskId: status === "approved" ? buyTaskId : null, buyTaskTitle };
        });
    }

    async setWishAssignee(id: string, memberId: string): Promise<void> {
        this.parentOnly();
        this.touch();
        this.write((s) => {
            s.buyTasks = s.buyTasks.map((t) => (t.wishId === id ? { ...t, assigneeMemberId: memberId } : t));
        });
    }

    /** The one place a purchase becomes money (AC 4). */
    async markWishBought(id: string, input: { amountCents: number; accountId: string; date?: string; note?: string }): Promise<LedgerEntry> {
        this.parentOnly();
        this.touch();
        return this.write((s) => {
            const w = s.wishes.find((x) => x.id === id);
            if (!w) throw new Error("That request is gone.");
            if (w.status === "declined") throw new Error("That one was declined — approve it first.");
            const e = this.makeEntry(
                s,
                {
                    date: input.date || this.today,
                    kind: "expense",
                    amountCents: input.amountCents,
                    categoryId: w.categoryId,
                    accountId: input.accountId,
                    payee: w.name,
                    note: clean(input.note) || `Bought: ${w.name}`,
                    wishId: w.id,
                    memberId: w.requestedBy,
                },
                this.ctx.me.id,
            );
            s.entries = [e, ...s.entries];
            s.wishes = s.wishes.map((x) => (x.id === id ? { ...x, status: "bought", ledgerEntryId: e.id, boughtAt: now() } : x));
            s.buyTasks = s.buyTasks.map((t) => (t.wishId === id && !t.done ? { ...t, done: true, doneAt: now() } : t));
            this.fireAlerts(s, monthOf(e.date));
            return e;
        });
    }

    async removeWish(id: string): Promise<void> {
        const w = this.all().wishes.find((x) => x.id === id);
        if (!w) return;
        // A child may withdraw their own ask; only a parent removes anyone else's.
        if (!this.isParent && w.requestedBy !== this.ctx.me.id) this.deny();
        if (this.isParent) this.touch();
        this.write((s) => {
            s.wishes = s.wishes.filter((x) => x.id !== id);
            s.approvals = s.approvals.filter((a) => a.wishId !== id);
            s.buyTasks = s.buyTasks.filter((t) => t.wishId !== id);
        });
    }

    // -- envelopes ------------------------------------------------------------

    async setEnvelope(memberId: string, monthlyAmountCents: number): Promise<Envelope> {
        this.parentOnly();
        this.touch();
        return this.write((s) => {
            const amount = Math.max(0, Math.round(monthlyAmountCents));
            const existing = s.envelopes.find((e) => e.memberId === memberId);
            if (existing) {
                const next = { ...existing, monthlyAmountCents: amount };
                s.envelopes = s.envelopes.map((e) => (e.id === existing.id ? next : e));
                return next;
            }
            const env: Envelope = {
                id: uid("env"),
                spaceId: this.ctx.space.id,
                memberId,
                monthlyAmountCents: amount,
                balanceCents: amount,
                grantedBy: this.ctx.me.id,
                note: "",
                lastToppedUp: monthOf(this.today),
                createdAt: now(),
            };
            s.envelopes = [...s.envelopes, env];
            return env;
        });
    }

    async topUpEnvelope(id: string, month: string): Promise<void> {
        this.parentOnly();
        this.touch();
        this.write((s) => {
            const env = s.envelopes.find((e) => e.id === id);
            if (!env) throw new Error("That envelope is gone.");
            if (env.lastToppedUp === month) throw new Error("It has already been topped up this month.");
            s.envelopes = s.envelopes.map((e) => (e.id === id ? { ...e, balanceCents: e.balanceCents + e.monthlyAmountCents, lastToppedUp: month } : e));
        });
    }

    /** A young adult spending their own money: no parent, no re-auth, their own row. */
    async spendFromEnvelope(id: string, input: { amountCents: number; note: string; categoryId?: string; date?: string }): Promise<LedgerEntry> {
        const env = this.all().envelopes.find((e) => e.id === id);
        if (!env) throw new Error("That envelope is gone.");
        if (!this.isParent && env.memberId !== this.ctx.me.id) this.deny();
        const amount = Math.max(0, Math.round(input.amountCents));
        if (amount > env.balanceCents) throw new Error("That's more than is left in the envelope.");
        return this.write((s) => {
            const e = this.makeEntry(
                s,
                { date: input.date || this.today, kind: "expense", amountCents: amount, categoryId: input.categoryId || "fun", accountId: "acc-current", payee: clean(input.note), note: "", memberId: env.memberId, envelopeId: env.id },
                this.ctx.me.id,
            );
            s.entries = [e, ...s.entries];
            s.envelopes = s.envelopes.map((x) => (x.id === id ? { ...x, balanceCents: x.balanceCents - amount } : x));
            return e;
        });
    }

    async removeEnvelope(id: string): Promise<void> {
        this.parentOnly();
        this.touch();
        this.write((s) => {
            s.envelopes = s.envelopes.filter((e) => e.id !== id);
        });
    }

    // -- pots -----------------------------------------------------------------

    async addSavingsGoal(input: { name: string; targetCents: number; accountId: string; goalId?: string | null; goalLabel?: string }): Promise<SavingsGoal> {
        this.parentOnly();
        this.touch();
        return this.write((s) => {
            const g: SavingsGoal = {
                id: uid("fund"),
                spaceId: this.ctx.space.id,
                name: clean(input.name) || "New pot",
                goalId: input.goalId ?? null,
                goalLabel: clean(input.goalLabel),
                targetCents: Math.max(0, Math.round(input.targetCents)),
                currentCents: 0,
                accountId: input.accountId,
                note: "",
                createdAt: now(),
            };
            s.savingsGoals = [...s.savingsGoals, g];
            return g;
        });
    }

    /** Paying into a pot moves the goal it is linked to (AC 10). */
    async contributeToSavings(id: string, cents: number, date?: string): Promise<LedgerEntry> {
        this.parentOnly();
        this.touch();
        return this.write((s) => {
            const g = s.savingsGoals.find((x) => x.id === id);
            if (!g) throw new Error("That pot is gone.");
            const amount = Math.max(0, Math.round(cents));
            const e = this.makeEntry(
                s,
                { date: date || this.today, kind: "expense", amountCents: amount, categoryId: "savings", accountId: g.accountId, payee: g.name, note: "Into the pot", savingsGoalId: g.id },
                this.ctx.me.id,
            );
            s.entries = [e, ...s.entries];
            s.savingsGoals = s.savingsGoals.map((x) => (x.id === id ? { ...x, currentCents: x.currentCents + amount } : x));
            this.fireAlerts(s, monthOf(e.date));
            return e;
        });
    }

    async linkSavingsGoal(id: string, goalId: string | null, goalLabel: string): Promise<void> {
        this.parentOnly();
        this.touch();
        this.write((s) => {
            s.savingsGoals = s.savingsGoals.map((g) => (g.id === id ? { ...g, goalId, goalLabel: clean(goalLabel) } : g));
        });
    }

    async removeSavingsGoal(id: string): Promise<void> {
        this.parentOnly();
        this.touch();
        this.write((s) => {
            s.savingsGoals = s.savingsGoals.filter((g) => g.id !== id);
        });
    }

    // -- settings -------------------------------------------------------------

    async updateSettings(patch: Partial<FinanceState["settings"]>): Promise<void> {
        this.parentOnly();
        this.touch();
        this.write((s) => {
            s.settings = { ...s.settings, ...patch };
        });
    }
}
