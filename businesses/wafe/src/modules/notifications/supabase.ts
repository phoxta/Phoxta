import type { Member, NotificationKind, RepoContext } from "@/data/core";
import { supabase } from "@/lib/supabase";
import { inboxesFor, mergeRules, planRaise, prefsFor, visibleTo } from "./derive";
import { DEFAULT_RULES } from "./seed";
import type { Channel, DigestMode, FollowUpRule, InlineAction, NotifItem, NotifMark, NotifPrefs, NotificationsRepo, NotificationsState, NudgeEntry, Outcome, RaiseInput, RaiseResult, RecipientRole, RuleOverride, Sensitivity } from "./types";

/**
 * The live notification centre, under row-level security.
 *
 * The engine is the same code as the demo's — `planRaise` decides, this file
 * only writes what it decided. The database is the second line: a child's
 * session cannot select a financial row and a parent's session can read their
 * children's inbox, both enforced by policy in sql/notifications.sql, so a
 * mistake here cannot leak anything the policies forbid.
 *
 * Column names are snake_case in Postgres and camelCase in the app; the
 * mapping lives in this file and nowhere else.
 */

type Row = Record<string, unknown>;

const s = (v: unknown, d = ""): string => (typeof v === "string" ? v : d);
const n = (v: unknown, d = 0): number => (typeof v === "number" ? v : Number(v ?? d) || d);
const b = (v: unknown, d = false): boolean => (typeof v === "boolean" ? v : d);
const nul = (v: unknown): string | null => (typeof v === "string" && v ? new Date(v).toISOString() : null);
const iso = (v: unknown): string => nul(v) ?? new Date().toISOString();
const strs = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);
/** Postgres `time` comes back as "21:30:00"; the app speaks "21:30". */
const clock = (v: unknown, d: string): string => (typeof v === "string" && v.length >= 4 ? v.slice(0, 5) : d);

function fail(where: string, error: { message: string } | null | undefined): void {
    if (error) throw new Error(`${where}: ${error.message}`);
}

const mapItem = (r: Row): NotifItem => ({
    id: s(r.id),
    spaceId: s(r.space_id),
    memberId: s(r.member_id),
    ruleKey: s(r.rule_key) || null,
    kind: s(r.kind, "family") as NotificationKind,
    sensitivity: s(r.sensitivity, "general") as Sensitivity,
    recordType: s(r.record_type) || null,
    recordId: s(r.record_id) || null,
    recordTitle: s(r.record_title) || null,
    title: s(r.title),
    body: s(r.body),
    href: s(r.href) || null,
    channel: s(r.channel, "in-app") as Channel,
    idempotencyKey: s(r.idempotency_key),
    reminderNumber: n(r.reminder_number, 1),
    needsAttention: b(r.needs_attention),
    action: r.action && typeof r.action === "object" ? (r.action as InlineAction) : null,
    actionOutcome: s(r.action_outcome) || null,
    readAt: nul(r.read_at),
    snoozedUntil: nul(r.snoozed_until),
    actedAt: nul(r.acted_at),
    deferredUntil: nul(r.deferred_until),
    digestFor: s(r.digest_for) ? s(r.digest_for).slice(0, 10) : null,
    isTest: b(r.is_test),
    createdAt: iso(r.created_at),
});

const mapMark = (r: Row): NotifMark => ({
    notificationId: s(r.notification_id),
    memberId: s(r.member_id),
    snoozedUntil: nul(r.snoozed_until),
    actedAt: nul(r.acted_at),
});

const mapPrefs = (r: Row): NotifPrefs => ({
    memberId: s(r.member_id),
    inApp: true,
    email: b(r.channel_email),
    push: b(r.channel_push),
    quietStart: clock(r.quiet_start, "21:30"),
    quietEnd: clock(r.quiet_end, "07:00"),
    digestMode: s(r.digest_mode, "auto") as DigestMode,
    digestAt: clock(r.digest_at, "18:00"),
    mutedKinds: strs(r.muted_categories) as NotificationKind[],
    timezone: s(r.timezone, "Europe/London"),
});

const mapCatalogue = (r: Row): FollowUpRule => ({
    ruleKey: s(r.rule_key),
    label: s(r.label),
    trigger: s(r.trigger_text),
    moduleId: s(r.module_id),
    kind: s(r.kind, "family") as NotificationKind,
    sensitivity: s(r.sensitivity, "general") as Sensitivity,
    recipientRole: s(r.recipient_role, "parents") as RecipientRole,
    job: s(r.job, "daily-07:00") as FollowUpRule["job"],
    windowUnit: s(r.window_unit, "day") as FollowUpRule["windowUnit"],
    maxReminders: n(r.max_reminders, 1),
    escalateTo: (s(r.escalate_to) || null) as RecipientRole | null,
    enabled: b(r.enabled, true),
});

const mapOverride = (r: Row): RuleOverride => ({
    ruleKey: s(r.rule_key),
    enabled: typeof r.enabled === "boolean" ? r.enabled : undefined,
    maxReminders: typeof r.max_reminders === "number" ? r.max_reminders : undefined,
    recipientRole: (s(r.recipient_role) || undefined) as RecipientRole | undefined,
});

const mapHistory = (r: Row): NudgeEntry => ({
    id: s(r.id),
    ruleKey: s(r.rule_key),
    recordId: s(r.record_id) || null,
    memberId: s(r.member_id),
    reminderNumber: n(r.reminder_number, 1),
    outcome: s(r.outcome, "delivered") as Outcome,
    note: s(r.note),
    sentAt: iso(r.sent_at),
});

export class SupabaseNotificationsRepo implements NotificationsRepo {
    private ctx: RepoContext;

    constructor(ctx: RepoContext) {
        this.ctx = ctx;
    }

    private get org(): string | null {
        return this.ctx.orgId;
    }

    private t(table: string) {
        return supabase.from(table).select("*").eq("space_id", this.ctx.space.id);
    }

    private scope(): Row {
        return { organization_id: this.org, space_id: this.ctx.space.id };
    }

    private member(id: string): Member | undefined {
        return this.ctx.members.find((m) => m.id === id);
    }

    private mayTouch(memberId: string): boolean {
        return inboxesFor(this.ctx).some((m) => m.id === memberId);
    }

    private parentOnly(): void {
        if (this.ctx.role !== "parent") throw new Error("Not allowed");
    }

    // -----------------------------------------------------------------------
    // Read
    // -----------------------------------------------------------------------

    private async fullState(): Promise<NotificationsState> {
        const [items, marks, prefs, overrides, history, catalogue] = await Promise.all([
            this.t("wf_notification_items").order("created_at", { ascending: false }).limit(400),
            this.t("wf_notification_marks"),
            this.t("wf_notification_prefs"),
            this.t("wf_follow_up_rules"),
            this.t("wf_nudge_history").order("sent_at", { ascending: false }).limit(200),
            supabase.from("wf_catalog_follow_up_rules").select("*").eq("organization_id", this.org ?? "").order("sort"),
        ]);
        fail("notifications", items.error);
        fail("marks", marks.error);
        fail("preferences", prefs.error);
        fail("rules", overrides.error);
        fail("history", history.error);
        // The catalogue is pre-loaded content; if provisioning has not run yet
        // the shipped defaults stand in, so the engine is never ruleless.
        const cat = ((catalogue.data as Row[] | null) ?? []).map(mapCatalogue);
        return {
            items: ((items.data as Row[] | null) ?? []).map(mapItem),
            marks: ((marks.data as Row[] | null) ?? []).map(mapMark),
            prefs: ((prefs.data as Row[] | null) ?? []).map(mapPrefs),
            rules: mergeRules(cat.length ? cat : DEFAULT_RULES, ((overrides.data as Row[] | null) ?? []).map(mapOverride)),
            history: ((history.data as Row[] | null) ?? []).map(mapHistory),
        };
    }

    async load(): Promise<NotificationsState> {
        return visibleTo(await this.fullState(), this.ctx);
    }

    /** The unread count in the nav has to move without a refresh. */
    subscribe(onChange: () => void): () => void {
        const ch = supabase
            .channel(`wf-notifications-${this.ctx.space.id}-${this.ctx.me.id}`)
            .on("postgres_changes", { event: "*", schema: "public", table: "wf_notification_items", filter: `space_id=eq.${this.ctx.space.id}` }, onChange)
            .subscribe();
        return () => {
            void supabase.removeChannel(ch);
        };
    }

    // -----------------------------------------------------------------------
    // The engine
    // -----------------------------------------------------------------------

    async raise(input: RaiseInput): Promise<RaiseResult> {
        const state = await this.fullState();
        const recipient = this.member(input.memberId);
        const rule = state.rules.find((r) => r.ruleKey === input.ruleKey);
        const prefs = prefsFor(state, input.memberId, this.ctx.space.timezone);
        const plan = planRaise({ input, rule, recipient, prefs, items: state.items, history: state.history, now: new Date().toISOString() });

        let itemId: string | null = null;
        if (plan.outcome === "parked" && plan.parkItemId) {
            // Parking surfaces the row for a decision, so it also leaves the
            // digest, the quiet-hours queue and any snooze (see local.ts).
            const upd = await supabase
                .from("wf_notification_items")
                .update({ needs_attention: true, digest_for: null, deferred_until: null, snoozed_until: null })
                .eq("id", plan.parkItemId)
                .eq("space_id", this.ctx.space.id);
            fail("park", upd.error);
            itemId = plan.parkItemId;
        } else if (plan.outcome === "delivered" || plan.outcome === "held" || plan.outcome === "digest") {
            const ins = await supabase
                .from("wf_notification_items")
                .insert({
                    ...this.scope(),
                    member_id: input.memberId,
                    rule_key: input.ruleKey,
                    kind: rule?.kind ?? "family",
                    sensitivity: rule?.sensitivity ?? "general",
                    record_type: input.recordType ?? null,
                    record_id: input.recordId ?? null,
                    record_title: input.recordTitle ?? null,
                    title: input.title,
                    body: input.body,
                    href: input.href ?? null,
                    channel: plan.channel,
                    idempotency_key: plan.idempotencyKey,
                    reminder_number: plan.reminderNumber,
                    action: input.action ?? null,
                    deferred_until: plan.deferredUntil,
                    digest_for: plan.digestFor,
                    is_test: input.isTest ?? false,
                    created_at: plan.at,
                })
                .select("id")
                .single();
            // The unique index on the key is the real guarantee: two tabs racing
            // the same rule cannot both win.
            if (ins.error?.code === "23505") {
                await this.logHistory(input, plan.reminderNumber, "duplicate", "Already sent in this window.", plan.at);
                return { outcome: "duplicate", note: "Already sent in this window.", itemId: null };
            }
            fail("raise", ins.error);
            itemId = s((ins.data as Row).id);
        }
        await this.logHistory(input, plan.reminderNumber, plan.outcome, plan.note, plan.at);
        return { outcome: plan.outcome, note: plan.note, itemId };
    }

    private async logHistory(input: RaiseInput, reminderNumber: number, outcome: Outcome, note: string, sentAt: string): Promise<void> {
        const { error } = await supabase.from("wf_nudge_history").insert({
            ...this.scope(),
            rule_key: input.ruleKey,
            record_id: input.recordId ?? null,
            member_id: input.memberId,
            reminder_number: reminderNumber,
            outcome,
            note,
            sent_at: sentAt,
        });
        // A missing audit line must not lose the notification itself.
        if (error) console.warn("[wafe] nudge history:", error.message);
    }

    // -----------------------------------------------------------------------
    // The inbox
    // -----------------------------------------------------------------------

    async markRead(ids: string[]): Promise<void> {
        if (!ids.length) return;
        const { error } = await supabase.from("wf_notification_items").update({ read_at: new Date().toISOString() }).in("id", ids).is("read_at", null).eq("space_id", this.ctx.space.id);
        fail("mark read", error);
    }

    async markAllRead(memberId: string): Promise<void> {
        if (!this.mayTouch(memberId)) throw new Error("Not allowed");
        const { error } = await supabase.from("wf_notification_items").update({ read_at: new Date().toISOString() }).eq("member_id", memberId).is("read_at", null).eq("space_id", this.ctx.space.id);
        fail("mark read", error);
    }

    async snooze(id: string, until: string | null, memberId: string): Promise<void> {
        if (!this.mayTouch(memberId)) throw new Error("Not allowed");
        const patch: Row = { snoozed_until: until };
        if (until) patch.read_at = new Date().toISOString();
        const item = await supabase.from("wf_notification_items").update(patch).eq("id", id).eq("space_id", this.ctx.space.id).select("id");
        fail("snooze", item.error);
        if (((item.data as Row[] | null) ?? []).length) return;
        // Not one of ours: it is a shell notification, so keep the overlay.
        const mark = await supabase.from("wf_notification_marks").upsert({ ...this.scope(), notification_id: id, member_id: memberId, snoozed_until: until }, { onConflict: "notification_id" });
        fail("snooze", mark.error);
    }

    async act(id: string, outcome: string, memberId: string): Promise<void> {
        if (!this.mayTouch(memberId)) throw new Error("Not allowed");
        const at = new Date().toISOString();
        const item = await supabase
            .from("wf_notification_items")
            .update({ acted_at: at, action_outcome: outcome, read_at: at, needs_attention: false, snoozed_until: null })
            .eq("id", id)
            .eq("space_id", this.ctx.space.id)
            .select("id");
        fail("act", item.error);
        if (((item.data as Row[] | null) ?? []).length) return;
        const mark = await supabase.from("wf_notification_marks").upsert({ ...this.scope(), notification_id: id, member_id: memberId, acted_at: at }, { onConflict: "notification_id" });
        fail("act", mark.error);
    }

    async remove(id: string): Promise<void> {
        const item = await supabase.from("wf_notification_items").delete().eq("id", id).eq("space_id", this.ctx.space.id);
        fail("remove", item.error);
        const mark = await supabase.from("wf_notification_marks").delete().eq("notification_id", id).eq("space_id", this.ctx.space.id);
        fail("remove", mark.error);
    }

    async clearTests(): Promise<void> {
        this.parentOnly();
        const { error } = await supabase.from("wf_notification_items").delete().eq("space_id", this.ctx.space.id).eq("is_test", true);
        fail("clear tests", error);
    }

    // -----------------------------------------------------------------------
    // Preferences and rules
    // -----------------------------------------------------------------------

    async setPrefs(memberId: string, patch: Partial<Omit<NotifPrefs, "memberId">>): Promise<void> {
        if (memberId !== this.ctx.me.id && this.ctx.role !== "parent") throw new Error("Not allowed");
        if (!this.mayTouch(memberId)) throw new Error("Not allowed");
        const child = this.member(memberId)?.role === "child";
        const row: Row = { ...this.scope(), member_id: memberId, channel_in_app: true };
        if (patch.email !== undefined) row.channel_email = child ? false : patch.email;
        if (patch.push !== undefined) row.channel_push = child ? false : patch.push;
        if (patch.quietStart !== undefined) row.quiet_start = patch.quietStart;
        if (patch.quietEnd !== undefined) row.quiet_end = patch.quietEnd;
        if (patch.digestMode !== undefined) row.digest_mode = patch.digestMode;
        if (patch.digestAt !== undefined) row.digest_at = patch.digestAt;
        if (patch.mutedKinds !== undefined) row.muted_categories = patch.mutedKinds;
        if (patch.timezone !== undefined) row.timezone = patch.timezone;
        const { error } = await supabase.from("wf_notification_prefs").upsert(row, { onConflict: "member_id" });
        fail("preferences", error);
    }

    async setRule(ruleKey: string, patch: RuleOverride): Promise<void> {
        this.parentOnly();
        const row: Row = { ...this.scope(), rule_key: ruleKey };
        if (patch.enabled !== undefined) row.enabled = patch.enabled;
        if (patch.maxReminders !== undefined) row.max_reminders = patch.maxReminders;
        if (patch.recipientRole !== undefined) row.recipient_role = patch.recipientRole;
        const { error } = await supabase.from("wf_follow_up_rules").upsert(row, { onConflict: "space_id,rule_key" });
        fail("rule", error);
    }

    async resetRules(): Promise<void> {
        this.parentOnly();
        const { error } = await supabase.from("wf_follow_up_rules").delete().eq("space_id", this.ctx.space.id);
        fail("rules", error);
    }
}
