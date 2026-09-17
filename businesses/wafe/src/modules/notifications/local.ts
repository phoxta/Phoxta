import type { Member, RepoContext } from "@/data/core";
import { uid } from "@/lib/format";
import { inboxesFor, mergeRules, planRaise, prefsFor, visibleTo } from "./derive";
import { DEFAULT_RULES, seedBlob, type NotificationsBlob } from "./seed";
import type { NotifItem, NotifPrefs, NotificationsRepo, NotificationsState, RaiseInput, RaiseResult, RuleOverride } from "./types";

/**
 * The demo's notification centre, in this browser.
 *
 * Every write is real and lands in localStorage: reading, snoozing, acting,
 * changing a member's channels, switching a rule off, and raising a nudge
 * through the engine — which applies exactly the plan `planRaise` returns, the
 * same one the live repo applies. `load()` hands back only what the current
 * member may see, so switching "view as" to Tobi genuinely shrinks the inbox
 * rather than hiding rows in the UI.
 */

const KEY = "wafe:demo:notifications:v2";

const now = (): string => new Date().toISOString();

function isBlob(v: unknown): v is NotificationsBlob {
    if (!v || typeof v !== "object") return false;
    const b = v as Partial<NotificationsBlob>;
    return Array.isArray(b.items) && Array.isArray(b.prefs) && Array.isArray(b.history);
}

export class LocalNotificationsRepo implements NotificationsRepo {
    private ctx: RepoContext;
    private cache: NotificationsBlob | null = null;
    private listeners = new Set<() => void>();

    constructor(ctx: RepoContext) {
        this.ctx = ctx;
    }

    // -----------------------------------------------------------------------
    // Storage
    // -----------------------------------------------------------------------

    private get(): NotificationsBlob {
        if (this.cache) return this.cache;
        try {
            const raw = localStorage.getItem(KEY);
            const parsed: unknown = raw ? JSON.parse(raw) : null;
            this.cache = isBlob(parsed) ? { ...parsed, marks: parsed.marks ?? [], overrides: parsed.overrides ?? [] } : this.fresh();
        } catch {
            this.cache = this.fresh();
        }
        return this.cache;
    }

    private fresh(): NotificationsBlob {
        // The seed needs the SeedContext helpers; rebuild them from this ctx.
        const base = new Date(`${this.ctx.today}T00:00:00`);
        const at = (days: number, hhmm = "09:00"): string => {
            const d = new Date(base);
            d.setDate(d.getDate() + days);
            const [h, m] = hhmm.split(":").map(Number);
            d.setHours(h, m, 0, 0);
            return d.toISOString();
        };
        const counters: Record<string, number> = {};
        return seedBlob({
            space: this.ctx.space,
            members: this.ctx.members,
            parents: this.ctx.members.filter((m) => m.role === "parent"),
            kids: this.ctx.members.filter((m) => m.role === "child"),
            guests: this.ctx.members.filter((m) => m.role === "guest"),
            today: this.ctx.today,
            at,
            day: (days: number) => at(days, "00:00").slice(0, 10),
            uid: (prefix: string) => `${prefix}-${(counters[prefix] = (counters[prefix] ?? 0) + 1)}`,
            img: (name: string) => `/images/${name}.jpg`,
        });
    }

    private set(next: NotificationsBlob): void {
        this.cache = next;
        try {
            localStorage.setItem(KEY, JSON.stringify(next));
        } catch {
            /* private mode: the session still works, it just won't persist */
        }
        this.listeners.forEach((fn) => fn());
    }

    private write(mutate: (b: NotificationsBlob) => void): void {
        const next = structuredClone(this.get());
        mutate(next);
        this.set(next);
    }

    private full(): NotificationsState {
        const b = this.get();
        return { items: b.items, marks: b.marks, prefs: b.prefs, rules: mergeRules(DEFAULT_RULES, b.overrides), history: b.history };
    }

    private member(id: string): Member | undefined {
        return this.ctx.members.find((m) => m.id === id);
    }

    /** The inboxes this member may touch: their own, plus their children's. */
    private mayTouch(memberId: string): boolean {
        return inboxesFor(this.ctx).some((m) => m.id === memberId);
    }

    private parentOnly(): void {
        if (this.ctx.role !== "parent") throw new Error("Not allowed");
    }

    // -----------------------------------------------------------------------
    // Read
    // -----------------------------------------------------------------------

    async load(): Promise<NotificationsState> {
        return visibleTo(this.full(), this.ctx);
    }

    subscribe(onChange: () => void): () => void {
        this.listeners.add(onChange);
        const onStorage = (e: StorageEvent) => {
            if (e.key === KEY) {
                this.cache = null;
                onChange();
            }
        };
        try {
            window.addEventListener("storage", onStorage);
        } catch {
            /* no window (tests) */
        }
        return () => {
            this.listeners.delete(onChange);
            try {
                window.removeEventListener("storage", onStorage);
            } catch {
                /* fine */
            }
        };
    }

    // -----------------------------------------------------------------------
    // The engine
    // -----------------------------------------------------------------------

    async raise(input: RaiseInput): Promise<RaiseResult> {
        const state = this.full();
        const recipient = this.member(input.memberId);
        const rule = state.rules.find((r) => r.ruleKey === input.ruleKey);
        const prefs = prefsFor(state, input.memberId, this.ctx.space.timezone);
        const plan = planRaise({ input, rule, recipient, prefs, items: state.items, history: state.history, now: now() });

        let itemId: string | null = null;
        this.write((b) => {
            if (plan.outcome === "parked" && plan.parkItemId) {
                const it = b.items.find((x) => x.id === plan.parkItemId);
                if (it) {
                    it.needsAttention = true;
                    // Parking means "this now wants a decision, not another
                    // reminder", so the row leaves the digest, the quiet-hours
                    // queue and any snooze. Left inside a collapsed digest it
                    // would stop nudging AND stop being seen.
                    it.digestFor = null;
                    it.deferredUntil = null;
                    it.snoozedUntil = null;
                }
                itemId = plan.parkItemId;
            } else if (plan.outcome === "delivered" || plan.outcome === "held" || plan.outcome === "digest") {
                const item: NotifItem = {
                    id: uid("ntfi"),
                    spaceId: this.ctx.space.id,
                    memberId: input.memberId,
                    ruleKey: input.ruleKey,
                    kind: rule?.kind ?? "family",
                    sensitivity: rule?.sensitivity ?? "general",
                    recordType: input.recordType ?? null,
                    recordId: input.recordId ?? null,
                    recordTitle: input.recordTitle ?? null,
                    title: input.title,
                    body: input.body,
                    href: input.href ?? null,
                    channel: plan.channel,
                    idempotencyKey: plan.idempotencyKey,
                    reminderNumber: plan.reminderNumber,
                    needsAttention: false,
                    action: input.action ?? null,
                    actionOutcome: null,
                    readAt: null,
                    snoozedUntil: null,
                    actedAt: null,
                    deferredUntil: plan.deferredUntil,
                    digestFor: plan.digestFor,
                    isTest: input.isTest ?? false,
                    createdAt: plan.at,
                };
                b.items.unshift(item);
                itemId = item.id;
            }
            b.history.unshift({
                id: uid("nudge"),
                ruleKey: input.ruleKey,
                recordId: input.recordId ?? null,
                memberId: input.memberId,
                reminderNumber: plan.reminderNumber,
                outcome: plan.outcome,
                note: plan.note,
                sentAt: plan.at,
            });
        });
        return { outcome: plan.outcome, note: plan.note, itemId };
    }

    // -----------------------------------------------------------------------
    // The inbox
    // -----------------------------------------------------------------------

    async markRead(ids: string[]): Promise<void> {
        if (!ids.length) return;
        const only = new Set(ids);
        this.write((b) => {
            const at = now();
            for (const i of b.items) {
                if (!only.has(i.id) || i.readAt) continue;
                if (!this.mayTouch(i.memberId)) throw new Error("Not allowed");
                i.readAt = at;
            }
        });
    }

    async markAllRead(memberId: string): Promise<void> {
        if (!this.mayTouch(memberId)) throw new Error("Not allowed");
        this.write((b) => {
            const at = now();
            for (const i of b.items) if (i.memberId === memberId && !i.readAt) i.readAt = at;
        });
    }

    async snooze(id: string, until: string | null, memberId: string): Promise<void> {
        if (!this.mayTouch(memberId)) throw new Error("Not allowed");
        this.write((b) => {
            const item = b.items.find((x) => x.id === id);
            if (item) {
                item.snoozedUntil = until;
                // Snoozing is a decision, so it counts as seen.
                if (until && !item.readAt) item.readAt = now();
                return;
            }
            // A shell notification: keep the overlay instead.
            const mark = b.marks.find((m) => m.notificationId === id);
            if (mark) mark.snoozedUntil = until;
            else b.marks.push({ notificationId: id, memberId, snoozedUntil: until, actedAt: null });
        });
    }

    async act(id: string, outcome: string, memberId: string): Promise<void> {
        if (!this.mayTouch(memberId)) throw new Error("Not allowed");
        this.write((b) => {
            const at = now();
            const item = b.items.find((x) => x.id === id);
            if (item) {
                item.actedAt = at;
                item.actionOutcome = outcome;
                item.readAt = item.readAt ?? at;
                item.needsAttention = false;
                item.snoozedUntil = null;
                return;
            }
            const mark = b.marks.find((m) => m.notificationId === id);
            if (mark) mark.actedAt = at;
            else b.marks.push({ notificationId: id, memberId, snoozedUntil: null, actedAt: at });
        });
    }

    async remove(id: string): Promise<void> {
        this.write((b) => {
            const item = b.items.find((x) => x.id === id);
            if (item && !this.mayTouch(item.memberId)) throw new Error("Not allowed");
            b.items = b.items.filter((x) => x.id !== id);
            b.marks = b.marks.filter((m) => m.notificationId !== id);
        });
    }

    async clearTests(): Promise<void> {
        this.parentOnly();
        this.write((b) => {
            b.items = b.items.filter((i) => !i.isTest);
        });
    }

    // -----------------------------------------------------------------------
    // Preferences and rules
    // -----------------------------------------------------------------------

    async setPrefs(memberId: string, patch: Partial<Omit<NotifPrefs, "memberId">>): Promise<void> {
        if (memberId !== this.ctx.me.id && this.ctx.role !== "parent") throw new Error("Not allowed");
        if (!this.mayTouch(memberId)) throw new Error("Not allowed");
        const child = this.member(memberId)?.role === "child";
        this.write((b) => {
            const existing = b.prefs.find((p) => p.memberId === memberId);
            const next: NotifPrefs = {
                ...(existing ?? { memberId, inApp: true, email: false, push: false, quietStart: "21:30", quietEnd: "07:00", digestMode: "auto", digestAt: "18:00", mutedKinds: [], timezone: this.ctx.space.timezone }),
                ...patch,
                memberId,
                inApp: true,
            };
            // Children are in-app only, whatever anyone ticks.
            if (child) {
                next.email = false;
                next.push = false;
            }
            if (existing) Object.assign(existing, next);
            else b.prefs.push(next);
        });
    }

    async setRule(ruleKey: string, patch: RuleOverride): Promise<void> {
        this.parentOnly();
        if (!DEFAULT_RULES.some((r) => r.ruleKey === ruleKey)) throw new Error("No such rule");
        this.write((b) => {
            const existing = b.overrides.find((o) => o.ruleKey === ruleKey);
            if (existing) Object.assign(existing, patch, { ruleKey });
            else b.overrides.push({ ...patch, ruleKey });
        });
    }

    async resetRules(): Promise<void> {
        this.parentOnly();
        this.write((b) => {
            b.overrides = [];
        });
    }
}
