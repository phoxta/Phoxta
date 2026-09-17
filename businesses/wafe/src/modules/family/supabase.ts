import type { Capability, RepoContext } from "@/data/core";
import { supabase } from "@/lib/supabase";
import { visibleTo } from "./derive";
import type { AuditAction, AuditEntry, ExportJob, FamilyRepo, FamilySettings, FamilyState, FamilyValue, GuestTag, Handover, MissionVersion, NewShare, ObjectShare, PlanId, ShareLevel, ShareObjectType, ValueLink } from "./types";

/**
 * The same module, live, under row-level security.
 *
 * The database is the real boundary here: a child's session cannot read
 * `wf_family_audit`, `wf_family_secrets` or another member's row of
 * `wf_family_shares`, whatever this file asks for. `visibleTo()` still runs on
 * the way out so the screens receive exactly the shape they receive in the
 * demo.
 *
 * snake_case ↔ camelCase mapping lives in this file and nowhere else.
 */

type Row = Record<string, unknown>;
const s = (v: unknown, d = ""): string => (typeof v === "string" ? v : d);
const n = (v: unknown, d = 0): number => (typeof v === "number" ? v : Number(v ?? d) || d);
const iso = (v: unknown): string => (v ? new Date(v as string).toISOString() : new Date().toISOString());
const optIso = (v: unknown): string | null => (v ? new Date(v as string).toISOString() : null);
const nums = (v: unknown): number[] => (Array.isArray(v) ? v.map((x) => Number(x)).filter((x) => Number.isFinite(x)) : []);

function fail(where: string, error: { message: string } | null | undefined): void {
    if (error) throw new Error(`${where}: ${error.message}`);
}

const mapValue = (r: Row): FamilyValue => ({ id: s(r.id), name: s(r.name), meaning: s(r.meaning), order: n(r.position), archivedAt: optIso(r.archived_at) });
const mapLink = (r: Row): ValueLink => ({ id: s(r.id), valueId: s(r.value_id), moduleId: s(r.module_id), label: s(r.label), href: s(r.href) });
const mapMission = (r: Row): MissionVersion => ({ id: s(r.id), mission: s(r.mission), vision: s(r.vision), legacy: s(r.legacy), authorId: s(r.author_member_id), createdAt: iso(r.created_at) });
const mapShare = (r: Row): ObjectShare => ({
    id: s(r.id),
    memberId: s(r.member_id),
    objectType: s(r.object_type, "board") as ShareObjectType,
    objectId: s(r.object_id),
    label: s(r.label),
    href: s(r.href),
    level: s(r.level, "view") as ShareLevel,
    grantedBy: s(r.granted_by),
    grantedAt: iso(r.granted_at),
    expiresAt: optIso(r.expires_at),
});
const mapAudit = (r: Row): AuditEntry => ({
    id: s(r.id),
    at: iso(r.at),
    actorId: s(r.actor_member_id),
    action: s(r.action, "settings") as AuditAction,
    targetType: s(r.target_type),
    targetId: s(r.target_id),
    summary: s(r.summary),
    before: r.before_text ? s(r.before_text) : null,
    after: r.after_text ? s(r.after_text) : null,
});
const mapExport = (r: Row): ExportJob => ({
    id: s(r.id),
    requestedBy: s(r.requested_by),
    requestedAt: iso(r.requested_at),
    status: s(r.status, "queued") as ExportJob["status"],
    readyAt: optIso(r.ready_at),
    bytes: r.bytes === null || r.bytes === undefined ? null : n(r.bytes),
    note: s(r.note),
});
const mapHandover = (r: Row): Handover => ({ id: s(r.id), memberId: s(r.member_id), memberName: s(r.member_name), toMemberId: s(r.to_member_id), openTasks: n(r.open_tasks), at: iso(r.at) });

const DEFAULT_SETTINGS: FamilySettings = {
    weekStart: 1,
    briefingHour: 7,
    checkinHour: 19,
    graceDays: [7],
    purchaseApprovalCents: 25000,
    plan: "seed",
    quietFrom: "21:00",
    quietTo: "07:00",
    digestAbove: 5,
    notifyPush: true,
    notifyEmail: true,
};

const mapSettings = (r: Row | null): FamilySettings =>
    r
        ? {
              weekStart: n(r.week_start, 1),
              briefingHour: n(r.briefing_hour, 7),
              checkinHour: n(r.checkin_hour, 19),
              graceDays: nums(r.grace_days),
              purchaseApprovalCents: n(r.purchase_approval_cents, 25000),
              plan: s(r.plan, "seed") as PlanId,
              quietFrom: s(r.quiet_from, "21:00").slice(0, 5),
              quietTo: s(r.quiet_to, "07:00").slice(0, 5),
              digestAbove: n(r.digest_above, 5),
              notifyPush: r.notify_push !== false,
              notifyEmail: r.notify_email !== false,
          }
        : { ...DEFAULT_SETTINGS };

const SETTINGS_COLUMNS: Record<keyof FamilySettings, string> = {
    weekStart: "week_start",
    briefingHour: "briefing_hour",
    checkinHour: "checkin_hour",
    graceDays: "grace_days",
    purchaseApprovalCents: "purchase_approval_cents",
    plan: "plan",
    quietFrom: "quiet_from",
    quietTo: "quiet_to",
    digestAbove: "digest_above",
    notifyPush: "notify_push",
    notifyEmail: "notify_email",
};

export class SupabaseFamilyRepo implements FamilyRepo {
    private ctx: RepoContext;
    private space: string;
    private org: string;

    constructor(ctx: RepoContext) {
        this.ctx = ctx;
        this.space = ctx.space.id;
        this.org = ctx.orgId ?? "";
    }

    private t(table: string) {
        return supabase.from(table).select("*").eq("space_id", this.space);
    }

    private base(): Row {
        return { organization_id: this.org, space_id: this.space };
    }

    private parentOnly(): void {
        if (!this.ctx.can("family.manage")) throw new Error("Only a parent can change that");
    }

    // -----------------------------------------------------------------------
    // Read
    // -----------------------------------------------------------------------

    async load(): Promise<FamilyState> {
        const parent = this.ctx.role === "parent";
        const [values, missions, shares, settings, meta] = await Promise.all([
            this.t("wf_family_values").order("position"),
            this.t("wf_family_missions").order("created_at", { ascending: false }).limit(40),
            this.t("wf_family_shares").order("granted_at", { ascending: false }),
            supabase.from("wf_family_settings").select("*").eq("space_id", this.space).maybeSingle(),
            this.t("wf_family_member_meta"),
        ]);
        fail("values", values.error);
        fail("mission", missions.error);
        fail("shares", shares.error);
        fail("settings", settings.error);
        fail("members", meta.error);

        // Parents-only tables: RLS returns nothing to anyone else, so don't ask.
        let audit: AuditEntry[] = [];
        let links: ValueLink[] = [];
        let exports: ExportJob[] = [];
        let handovers: Handover[] = [];
        let pinSet = false;
        if (parent) {
            const [a, l, e, h, sec] = await Promise.all([
                this.t("wf_family_audit").order("at", { ascending: false }).limit(300),
                this.t("wf_family_value_links"),
                this.t("wf_family_exports").order("requested_at", { ascending: false }).limit(20),
                this.t("wf_family_handovers").order("at", { ascending: false }).limit(50),
                supabase.from("wf_family_secrets").select("pin_hash").eq("space_id", this.space).maybeSingle(),
            ]);
            fail("audit", a.error);
            fail("value links", l.error);
            fail("exports", e.error);
            fail("handovers", h.error);
            audit = ((a.data as Row[] | null) ?? []).map(mapAudit);
            links = ((l.data as Row[] | null) ?? []).map(mapLink);
            exports = ((e.data as Row[] | null) ?? []).map(mapExport);
            handovers = ((h.data as Row[] | null) ?? []).map(mapHandover);
            pinSet = Boolean((sec.data as Row | null)?.pin_hash);
        } else {
            const { data } = await supabase.rpc("wf_family_pin_set", { p_space: this.space });
            pinSet = data === true;
        }

        const settingsRow = (settings.data as Row | null) ?? null;
        const usage = settingsRow
            ? { month: s(settingsRow.ai_month, this.ctx.today.slice(0, 7)), calls: n(settingsRow.ai_calls), images: n(settingsRow.ai_images), mediaMb: n(settingsRow.ai_media_mb), reels: n(settingsRow.ai_reels) }
            : { month: this.ctx.today.slice(0, 7), calls: 0, images: 0, mediaMb: 0, reels: 0 };

        const guestTags: Record<string, GuestTag> = {};
        const childMode: Record<string, boolean> = {};
        const overrides: Record<string, Partial<Record<Capability, boolean>>> = {};
        for (const r of (meta.data as Row[] | null) ?? []) {
            const id = s(r.member_id);
            if (r.guest_tag) guestTags[id] = s(r.guest_tag) as GuestTag;
            childMode[id] = r.child_mode === true;
            if (r.overrides && typeof r.overrides === "object") overrides[id] = r.overrides as Partial<Record<Capability, boolean>>;
        }

        const state: FamilyState = {
            values: ((values.data as Row[] | null) ?? []).map(mapValue),
            valueLinks: links,
            missions: ((missions.data as Row[] | null) ?? []).map(mapMission),
            shares: ((shares.data as Row[] | null) ?? []).map(mapShare),
            audit,
            settings: mapSettings(settingsRow),
            guestTags,
            childMode,
            overrides,
            pinSet,
            usage: usage.month === this.ctx.today.slice(0, 7) ? usage : { month: this.ctx.today.slice(0, 7), calls: 0, images: 0, mediaMb: usage.mediaMb, reels: 0 },
            exports,
            handovers,
        };
        return visibleTo(state, this.ctx);
    }

    // -----------------------------------------------------------------------
    // Values and mission
    // -----------------------------------------------------------------------

    async addValue(name: string, meaning: string): Promise<void> {
        this.parentOnly();
        const clean = name.trim();
        if (!clean) throw new Error("A value needs a word");
        const { data, error } = await this.t("wf_family_values").is("archived_at", null);
        fail("values", error);
        const rows = (data as Row[] | null) ?? [];
        if (rows.length >= 7) throw new Error("Seven values is the most a family can hold in its head");
        if (rows.some((r) => s(r.name).toLowerCase() === clean.toLowerCase())) throw new Error(`${clean} is already one of your values`);
        const ins = await supabase.from("wf_family_values").insert({ ...this.base(), name: clean, meaning: meaning.trim(), position: rows.length });
        fail("add value", ins.error);
        await this.log("values", "space", this.space, `Added the value “${clean}”`, null, clean);
    }

    async updateValue(id: string, patch: { name?: string; meaning?: string }): Promise<void> {
        this.parentOnly();
        const row: Row = {};
        if (patch.name !== undefined && patch.name.trim()) row.name = patch.name.trim();
        if (patch.meaning !== undefined) row.meaning = patch.meaning.trim();
        if (!Object.keys(row).length) return;
        const { error } = await supabase.from("wf_family_values").update(row).eq("id", id).eq("space_id", this.space);
        fail("update value", error);
        await this.log("values", "value", id, `Rewrote “${s(row.name, patch.name ?? "")}”`, null, null);
    }

    async setValueArchived(id: string, archived: boolean): Promise<void> {
        this.parentOnly();
        const { error } = await supabase.from("wf_family_values").update({ archived_at: archived ? new Date().toISOString() : null }).eq("id", id).eq("space_id", this.space);
        fail("archive value", error);
        await this.log("values", "value", id, `${archived ? "Archived" : "Brought back"} a value`, archived ? "active" : "archived", archived ? "archived" : "active");
    }

    async deleteValue(id: string, references: number): Promise<void> {
        this.parentOnly();
        if (references > 0) throw new Error(`${references} record${references === 1 ? "" : "s"} still point at this value. Archive it instead — the records keep their meaning.`);
        const { error } = await supabase.from("wf_family_values").delete().eq("id", id).eq("space_id", this.space);
        fail("delete value", error);
        await this.log("values", "value", id, "Deleted a value (nothing referenced it)", null, null);
    }

    async moveValue(id: string, dir: -1 | 1): Promise<void> {
        this.parentOnly();
        const { data, error } = await this.t("wf_family_values").order("position");
        fail("values", error);
        const list = ((data as Row[] | null) ?? []).map(mapValue);
        const i = list.findIndex((v) => v.id === id);
        const j = i + dir;
        if (i < 0 || j < 0 || j >= list.length) return;
        const a = await supabase.from("wf_family_values").update({ position: list[j].order }).eq("id", list[i].id).eq("space_id", this.space);
        fail("reorder", a.error);
        const b = await supabase.from("wf_family_values").update({ position: list[i].order }).eq("id", list[j].id).eq("space_id", this.space);
        fail("reorder", b.error);
    }

    async saveMission(input: { mission: string; vision: string; legacy: string }): Promise<void> {
        this.parentOnly();
        const mission = input.mission.trim();
        if (!mission) throw new Error("The mission cannot be empty");
        const { error } = await supabase.from("wf_family_missions").insert({ ...this.base(), mission, vision: input.vision.trim(), legacy: input.legacy.trim(), author_member_id: this.ctx.me.id });
        fail("save mission", error);
        await this.log("mission", "space", this.space, "Saved a new version of the mission", null, mission);
    }

    // -----------------------------------------------------------------------
    // Guests and shares
    // -----------------------------------------------------------------------

    async addShare(input: NewShare): Promise<void> {
        this.parentOnly();
        const { error } = await supabase.from("wf_family_shares").insert({
            ...this.base(),
            member_id: input.memberId,
            object_type: input.objectType,
            object_id: input.objectId,
            label: input.label,
            href: input.href,
            level: input.level,
            granted_by: this.ctx.me.id,
            expires_at: input.expiresAt,
        });
        if (error?.code === "23505") throw new Error("That is already shared with them");
        fail("share", error);
        await this.log("share", input.objectType, input.objectId, `Shared “${input.label}” with ${this.nameOf(input.memberId)} (${input.level})`, null, input.level);
    }

    async setShareLevel(id: string, level: ShareLevel): Promise<void> {
        this.parentOnly();
        const { error } = await supabase.from("wf_family_shares").update({ level }).eq("id", id).eq("space_id", this.space);
        fail("share", error);
        await this.log("share", "share", id, `A share is now ${level === "contribute" ? "contribute" : "view only"}`, null, level);
    }

    async revokeShare(id: string): Promise<void> {
        this.parentOnly();
        const { error } = await supabase.from("wf_family_shares").delete().eq("id", id).eq("space_id", this.space);
        fail("revoke share", error);
        await this.log("share", "share", id, "Stopped sharing something with a guest", null, null);
    }

    async setGuestTag(memberId: string, tag: GuestTag): Promise<void> {
        this.parentOnly();
        await this.upsertMeta(memberId, { guest_tag: tag });
        await this.log("member", "member", memberId, `${this.nameOf(memberId)} is a ${tag} guest`, null, tag);
    }

    async retargetShares(fromId: string, toId: string): Promise<void> {
        this.parentOnly();
        const { error } = await supabase.from("wf_family_shares").update({ member_id: toId }).eq("member_id", fromId).eq("space_id", this.space);
        fail("shares", error);
        await this.log("share", "member", toId, `Shares followed ${this.nameOf(toId)} into the family`, fromId, toId);
    }

    // -----------------------------------------------------------------------
    // Permissions
    // -----------------------------------------------------------------------

    async setOverride(memberId: string, cap: Capability, value: boolean | null): Promise<void> {
        this.parentOnly();
        const { data, error } = await supabase.from("wf_family_member_meta").select("overrides").eq("space_id", this.space).eq("member_id", memberId).maybeSingle();
        fail("permissions", error);
        const current: Partial<Record<Capability, boolean>> = { ...(((data as Row | null)?.overrides as Partial<Record<Capability, boolean>> | null) ?? {}) };
        const before = current[cap] === undefined ? "default" : current[cap] ? "on" : "off";
        if (value === null) delete current[cap];
        else current[cap] = value;
        await this.upsertMeta(memberId, { overrides: current });
        const after = value === null ? "default" : value ? "on" : "off";
        await this.log("permission", "member", memberId, `${this.nameOf(memberId)} · ${cap} → ${after}`, before, after);
    }

    async clearMember(memberId: string): Promise<void> {
        this.parentOnly();
        const a = await supabase.from("wf_family_shares").delete().eq("member_id", memberId).eq("space_id", this.space);
        fail("shares", a.error);
        const b = await supabase.from("wf_family_member_meta").delete().eq("member_id", memberId).eq("space_id", this.space);
        fail("permissions", b.error);
    }

    // -----------------------------------------------------------------------
    // Child mode and the parent PIN
    // -----------------------------------------------------------------------

    async setChildMode(memberId: string, on: boolean): Promise<void> {
        this.parentOnly();
        await this.upsertMeta(memberId, { child_mode: on });
        await this.log("childmode", "member", memberId, `Child mode ${on ? "on" : "off"} for ${this.nameOf(memberId)}`, on ? "off" : "on", on ? "on" : "off");
    }

    /**
     * A child leaving child mode. The member-meta table is parent-write, so
     * this goes through a definer function that checks the PIN first and only
     * ever clears the CALLER's own flag.
     */
    async exitChildMode(pin: string): Promise<boolean> {
        const { data, error } = await supabase.rpc("wf_family_exit_child_mode", { p_space: this.space, p_pin: pin.trim() });
        fail("child mode", error);
        return data === true;
    }

    async setPin(pin: string): Promise<void> {
        this.parentOnly();
        if (!/^\d{4,8}$/.test(pin.trim())) throw new Error("A PIN is four to eight digits");
        // Hashed in the database with pgcrypto: the app never holds the digits.
        const { error } = await supabase.rpc("wf_family_set_pin", { p_space: this.space, p_pin: pin.trim() });
        fail("pin", error);
        await this.log("childmode", "space", this.space, "Changed the parent PIN", null, null);
    }

    async checkPin(pin: string): Promise<boolean> {
        const { data, error } = await supabase.rpc("wf_family_check_pin", { p_space: this.space, p_pin: pin.trim() });
        fail("pin", error);
        return data === true;
    }

    // -----------------------------------------------------------------------
    // Settings, plan, meter
    // -----------------------------------------------------------------------

    async saveSettings(patch: Partial<FamilySettings>): Promise<void> {
        this.parentOnly();
        const row: Row = { ...this.base() };
        for (const [k, v] of Object.entries(patch)) row[SETTINGS_COLUMNS[k as keyof FamilySettings]] = v;
        if (Object.keys(row).length <= 2) return;
        const { error } = await supabase.from("wf_family_settings").upsert(row, { onConflict: "space_id" });
        fail("settings", error);
        await this.log("settings", "space", this.space, "Changed the family settings", null, Object.keys(patch).join(", "));
    }

    async noteAiCall(kind: "call" | "image" | "reel"): Promise<void> {
        const { error } = await supabase.rpc("wf_family_note_ai", { p_space: this.space, p_month: this.ctx.today.slice(0, 7), p_kind: kind });
        // The meter must never break the feature it is counting.
        if (error) console.warn("[wafe] ai meter:", error.message);
    }

    // -----------------------------------------------------------------------
    // Records
    // -----------------------------------------------------------------------

    async audit(entry: { action: AuditAction; targetType: string; targetId: string; summary: string; before?: string | null; after?: string | null }): Promise<void> {
        this.parentOnly();
        await this.log(entry.action, entry.targetType, entry.targetId, entry.summary, entry.before ?? null, entry.after ?? null);
    }

    async recordHandover(input: { memberId: string; memberName: string; toMemberId: string; openTasks: number }): Promise<void> {
        this.parentOnly();
        const { error } = await supabase.from("wf_family_handovers").insert({ ...this.base(), member_id: input.memberId, member_name: input.memberName, to_member_id: input.toMemberId, open_tasks: input.openTasks });
        fail("handover", error);
        await this.log(
            "member",
            "member",
            input.memberId,
            `${input.memberName} left the family. Access ended at once; ${input.openTasks} open task${input.openTasks === 1 ? "" : "s"} passed to ${this.nameOf(input.toMemberId)}; everything they wrote was kept.`,
            "member",
            "removed",
        );
    }

    async recordExport(bytes: number): Promise<void> {
        this.parentOnly();
        const { error } = await supabase.from("wf_family_exports").insert({ ...this.base(), requested_by: this.ctx.me.id, status: "ready", ready_at: new Date().toISOString(), bytes, note: "Downloaded in the browser." });
        fail("export", error);
        await this.log("export", "space", this.space, "Exported the whole family archive", null, `${Math.round(bytes / 1024)} KB`);
    }

    /** Deleting a family is a re-authentication, not a confirmation checkbox. */
    async reauth(secret: string): Promise<boolean> {
        const email = this.ctx.me.email;
        if (!email) return this.checkPin(secret);
        const { error } = await supabase.auth.signInWithPassword({ email, password: secret });
        return !error;
    }

    async deleteSpace(): Promise<void> {
        this.parentOnly();
        // The pictures first (a deleted row with an orphaned file is worse than
        // the other way round), then the space, which cascades everywhere.
        try {
            const prefix = `wafe/${this.space}`;
            const { data } = await supabase.storage.from("catalog").list(prefix, { limit: 1000 });
            const paths = (data ?? []).map((f) => `${prefix}/${f.name}`);
            if (paths.length) await supabase.storage.from("catalog").remove(paths);
        } catch (e) {
            console.warn("[wafe] media sweep:", e);
        }
        const { error } = await supabase.rpc("wf_family_delete_space", { p_space: this.space });
        fail("delete family", error);
    }

    // -----------------------------------------------------------------------
    // Internals
    // -----------------------------------------------------------------------

    private async upsertMeta(memberId: string, patch: Row): Promise<void> {
        const { error } = await supabase.from("wf_family_member_meta").upsert({ ...this.base(), member_id: memberId, ...patch }, { onConflict: "member_id" });
        fail("permissions", error);
    }

    private async log(action: AuditAction, targetType: string, targetId: string, summary: string, before: string | null, after: string | null): Promise<void> {
        const { error } = await supabase.from("wf_family_audit").insert({ ...this.base(), actor_member_id: this.ctx.me.id, action, target_type: targetType, target_id: targetId, summary, before_text: before, after_text: after });
        // A missing audit line must never swallow the change the family just made.
        if (error) console.warn("[wafe] audit:", error.message);
    }

    private nameOf(id: string): string {
        return this.ctx.members.find((m) => m.id === id)?.name ?? "someone new";
    }
}
