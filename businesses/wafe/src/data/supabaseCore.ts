import type { AgeBand, Capability, Invite, InviteStatus, Member, Notification, NotificationKind, Role, Space } from "@/data/core";
import type { CoreRepo, CoreState, NewInvite, NewMember, NewNotification, NewSpace, SpaceSummary } from "@/data/coreRepo";
import { hueFor, type Hue } from "@/lib/format";
import { supabase } from "@/lib/supabase";

/**
 * A signed-in member's family, under row-level security, inside one tenant.
 *
 * Every wf_ table carries `organization_id` (the tenant this deployment
 * resolved on boot) and `space_id` (the family). The database decides what
 * this client may see through the foundation helpers (`wf_is_member`,
 * `wf_is_parent`, `wf_my_member`), so a child's session physically cannot
 * read a parent's invites or another member's notifications — this file only
 * asks for what the current member would expect to get back.
 *
 * Column names are snake_case in Postgres and camelCase in the app; the
 * mapping lives here and nowhere else.
 */

type Row = Record<string, unknown>;
const s = (v: unknown, d = ""): string => (typeof v === "string" ? v : d);
const n = (v: unknown, d = 0): number => (typeof v === "number" ? v : Number(v ?? d) || d);
const iso = (v: unknown): string => (v ? new Date(v as string).toISOString() : new Date().toISOString());
const opt = (v: unknown): string | undefined => (typeof v === "string" && v ? v : undefined);
const strs = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);

const HUES: ReadonlySet<string> = new Set<Hue>(["lilac", "sky", "peach", "rose", "mint", "plum"]);

/** Throw a readable error for a failed query: "members: permission denied for table wf_members". */
function fail(where: string, error: { message: string } | null | undefined): void {
    if (error) throw new Error(`${where}: ${error.message}`);
}

const mapSpace = (r: Row): Space => ({
    id: s(r.id),
    name: s(r.name),
    tagline: s(r.tagline),
    values: strs(r.values),
    mission: s(r.mission),
    coverUrl: opt(r.cover_url),
    currency: s(r.currency, "GBP"),
    planningDay: n(r.planning_day, 7),
    timezone: s(r.timezone, "Europe/London"),
    createdAt: iso(r.created_at),
});

const mapMember = (r: Row): Member => {
    const name = s(r.name);
    const hue = s(r.hue);
    return {
        id: s(r.id),
        spaceId: s(r.space_id),
        userId: (r.user_id as string | null) ?? null,
        name,
        relation: s(r.relation),
        role: s(r.role, "guest") as Role,
        ageBand: s(r.age_band, "adult") as AgeBand,
        birthday: opt(r.birthday),
        avatarUrl: opt(r.avatar_url),
        // The column default ('sage') is a cover accent, not an avatar tint; fall back to the app's rule.
        hue: (HUES.has(hue) ? hue : hueFor(name)) as Hue,
        points: n(r.points),
        grants: r.grants && typeof r.grants === "object" ? (r.grants as Member["grants"]) : {},
        email: opt(r.email),
        joinedAt: iso(r.joined_at),
    };
};

const mapInvite = (r: Row): Invite => ({
    id: s(r.id),
    spaceId: s(r.space_id),
    email: s(r.email),
    name: s(r.name),
    role: s(r.role, "guest") as Role,
    relation: s(r.relation),
    code: s(r.code),
    status: s(r.status, "pending") as InviteStatus,
    invitedBy: s(r.invited_by),
    createdAt: iso(r.created_at),
});

const mapNotification = (r: Row): Notification => ({
    id: s(r.id),
    spaceId: s(r.space_id),
    memberId: s(r.member_id),
    kind: s(r.kind, "family") as NotificationKind,
    title: s(r.title),
    body: s(r.body),
    href: s(r.href) || null,
    readAt: r.read_at ? iso(r.read_at) : null,
    createdAt: iso(r.created_at),
});

const mapSummary = (r: Row): SpaceSummary => ({
    id: s(r.id),
    name: s(r.name),
    role: s(r.role, "guest") as Role,
    memberId: s(r.member_id),
});

/** "WAFE-KEMI-2026": four letters from the name (padded with random ones), then the year. */
function inviteCode(name: string, attempt: number): string {
    const alpha = "ABCDEFGHJKLMNPQRSTUVWXYZ";
    let letters = name.toUpperCase().replace(/[^A-Z]/g, "").slice(0, attempt === 0 ? 4 : 2);
    while (letters.length < 4) letters += alpha[Math.floor(Math.random() * alpha.length)];
    return `WAFE-${letters}-${new Date().getFullYear()}`;
}

export class SupabaseCoreRepo implements CoreRepo {
    readonly kind = "live" as const;
    private org: string;
    private spaceId: string;
    private me: string;

    constructor(orgId: string, spaceId: string, myMemberId: string) {
        this.org = orgId;
        this.spaceId = spaceId;
        this.me = myMemberId;
    }

    /** This space's rows of a table. */
    private t(table: string) {
        return supabase.from(table).select("*").eq("space_id", this.spaceId);
    }

    private async members(): Promise<Member[]> {
        const { data, error } = await this.t("wf_members").order("joined_at");
        fail("members", error);
        return ((data as Row[] | null) ?? []).map(mapMember);
    }

    async load(): Promise<CoreState> {
        const [space, members, notifs] = await Promise.all([
            supabase.from("wf_spaces").select("*").eq("id", this.spaceId).single(),
            this.members(),
            this.t("wf_notifications").eq("member_id", this.me).order("created_at", { ascending: false }).limit(100),
        ]);
        fail("space", space.error);
        fail("notifications", notifs.error);
        // Invites are parents' business: RLS would return nothing to anyone
        // else anyway, so don't even ask.
        const mine = members.find((m) => m.id === this.me);
        let invites: Invite[] = [];
        if (mine?.role === "parent") {
            const inv = await this.t("wf_invites").order("created_at", { ascending: false });
            fail("invites", inv.error);
            invites = ((inv.data as Row[] | null) ?? []).map(mapInvite);
        }
        return {
            space: mapSpace(space.data as Row),
            members,
            invites,
            notifications: ((notifs.data as Row[] | null) ?? []).map(mapNotification),
        };
    }

    subscribe(onChange: () => void): () => void {
        // Notifications arrive from elsewhere (another member's follow-up engine,
        // another tab); the rest of the core only changes through this client.
        const ch = supabase
            .channel(`wf-core-${this.spaceId}-${this.me}`)
            .on("postgres_changes", { event: "*", schema: "public", table: "wf_notifications", filter: `member_id=eq.${this.me}` }, onChange)
            .subscribe();
        return () => {
            void supabase.removeChannel(ch);
        };
    }

    async updateSpace(patch: Partial<Omit<Space, "id" | "createdAt">>): Promise<void> {
        const row: Row = {};
        if (patch.name !== undefined) row.name = patch.name;
        if (patch.tagline !== undefined) row.tagline = patch.tagline;
        if (patch.values !== undefined) row.values = patch.values;
        if (patch.mission !== undefined) row.mission = patch.mission;
        if (patch.coverUrl !== undefined) row.cover_url = patch.coverUrl || null;
        if (patch.currency !== undefined) row.currency = patch.currency;
        if (patch.planningDay !== undefined) row.planning_day = patch.planningDay;
        if (patch.timezone !== undefined) row.timezone = patch.timezone;
        if (!Object.keys(row).length) return;
        const { error } = await supabase.from("wf_spaces").update(row).eq("id", this.spaceId);
        fail("space", error);
    }

    async addMember(input: NewMember): Promise<Member> {
        const name = input.name.trim();
        const row: Row = {
            organization_id: this.org,
            space_id: this.spaceId,
            name,
            relation: input.relation.trim(),
            role: input.role,
            age_band: input.ageBand,
            birthday: input.birthday || null,
            avatar_url: input.avatarUrl || null,
            email: input.email?.trim() || null,
            hue: hueFor(name),
            points: 0,
            grants: {},
        };
        const { data, error } = await supabase.from("wf_members").insert(row).select("*").single();
        fail("add member", error);
        return mapMember(data as Row);
    }

    async updateMember(id: string, patch: Partial<Omit<Member, "id" | "spaceId" | "joinedAt">>): Promise<void> {
        const row: Row = {};
        if (patch.name !== undefined) row.name = patch.name.trim();
        if (patch.relation !== undefined) row.relation = patch.relation;
        if (patch.role !== undefined) row.role = patch.role;
        if (patch.ageBand !== undefined) row.age_band = patch.ageBand;
        if (patch.birthday !== undefined) row.birthday = patch.birthday || null;
        if (patch.avatarUrl !== undefined) row.avatar_url = patch.avatarUrl || null;
        if (patch.hue !== undefined) row.hue = patch.hue;
        if (patch.points !== undefined) row.points = patch.points;
        if (patch.grants !== undefined) row.grants = patch.grants;
        if (patch.email !== undefined) row.email = patch.email || null;
        if (patch.userId !== undefined) row.user_id = patch.userId;
        if (!Object.keys(row).length) return;
        const { error } = await supabase.from("wf_members").update(row).eq("id", id).eq("space_id", this.spaceId);
        fail("update member", error);
    }

    async removeMember(id: string): Promise<void> {
        const members = await this.members();
        const m = members.find((x) => x.id === id);
        if (!m) throw new Error("That person is no longer in the family");
        // A family with no parent has nobody who can manage it — the last one stays.
        if (m.role === "parent" && members.filter((x) => x.role === "parent").length <= 1) {
            throw new Error("A family needs at least one parent");
        }
        const { error } = await supabase.from("wf_members").delete().eq("id", id).eq("space_id", this.spaceId);
        fail("remove member", error);
    }

    async setGrant(memberId: string, cap: Capability, on: boolean): Promise<void> {
        const { data, error } = await supabase.from("wf_members").select("role, grants").eq("id", memberId).eq("space_id", this.spaceId).single();
        fail("grant", error);
        const r = data as Row;
        // Parents hold everything already; a grant can neither widen nor narrow them.
        if (s(r.role) === "parent") throw new Error("Parents already have every permission");
        const grants: Member["grants"] = { ...((r.grants as Member["grants"] | null) ?? {}) };
        if (on) grants[cap] = true;
        else delete grants[cap];
        const upd = await supabase.from("wf_members").update({ grants }).eq("id", memberId).eq("space_id", this.spaceId);
        fail("grant", upd.error);
    }

    async addPoints(memberId: string, delta: number, reason: string): Promise<void> {
        if (!Number.isFinite(delta) || delta === 0) return;
        const d = Math.round(delta);
        const { data, error } = await supabase.from("wf_members").select("points").eq("id", memberId).eq("space_id", this.spaceId).single();
        fail("points", error);
        const points = Math.max(0, n((data as Row).points) + d);
        const upd = await supabase.from("wf_members").update({ points }).eq("id", memberId).eq("space_id", this.spaceId);
        fail("points", upd.error);
        // The log is what the child sees ("+20 · Tidied the playroom"); a failed
        // log line must not undo the points, so it is best-effort after the fact.
        const log = await supabase.from("wf_point_log").insert({ organization_id: this.org, space_id: this.spaceId, member_id: memberId, delta: d, reason: reason.trim() });
        if (log.error) console.warn("[wafe] point log:", log.error.message);
    }

    /** A member's points history, newest first (the child's "how I earned it" list). */
    async pointLog(memberId: string): Promise<Array<{ delta: number; reason: string; at: string }>> {
        const { data, error } = await this.t("wf_point_log").eq("member_id", memberId).order("created_at", { ascending: false }).limit(200);
        fail("point log", error);
        return ((data as Row[] | null) ?? []).map((r) => ({ delta: n(r.delta), reason: s(r.reason), at: iso(r.created_at) }));
    }

    async invite(input: NewInvite): Promise<Invite> {
        const base: Row = {
            organization_id: this.org,
            space_id: this.spaceId,
            email: input.email.trim().toLowerCase(),
            name: input.name.trim(),
            role: input.role,
            relation: input.relation.trim(),
            status: "pending",
            invited_by: this.me,
        };
        // Codes are unique across the platform, so a popular name ("Auntie Kemi"
        // in two families) can collide; retry with fresh letters a few times.
        for (let attempt = 0; attempt < 6; attempt += 1) {
            const { data, error } = await supabase.from("wf_invites").insert({ ...base, code: inviteCode(input.name, attempt) }).select("*").single();
            if (error?.code === "23505") continue;
            fail("invite", error);
            return mapInvite(data as Row);
        }
        throw new Error("invite: could not find a free invite code, please try again");
    }

    async revokeInvite(id: string): Promise<void> {
        const { error } = await supabase.from("wf_invites").delete().eq("id", id).eq("space_id", this.spaceId);
        fail("revoke invite", error);
    }

    async notify(input: NewNotification): Promise<void> {
        const { error } = await supabase.from("wf_notifications").insert({
            organization_id: this.org,
            space_id: this.spaceId,
            member_id: input.memberId,
            kind: input.kind,
            title: input.title,
            body: input.body,
            href: input.href,
        });
        fail("notify", error);
    }

    async markRead(ids?: string[]): Promise<void> {
        if (ids && !ids.length) return;
        let q = supabase.from("wf_notifications").update({ read_at: new Date().toISOString() }).eq("member_id", this.me).is("read_at", null);
        if (ids) q = q.in("id", ids);
        const { error } = await q;
        fail("mark read", error);
    }

    async raisedNudgeKeys(): Promise<string[]> {
        const { data, error } = await supabase.from("wf_nudges").select("key").eq("space_id", this.spaceId);
        fail("nudges", error);
        return ((data as Row[] | null) ?? []).map((r) => s(r.key));
    }

    async recordNudge(key: string): Promise<void> {
        // Two tabs (or two members) may compute the same nudge at once; the
        // primary key makes the second write a no-op rather than an error.
        const { error } = await supabase.from("wf_nudges").upsert({ space_id: this.spaceId, key }, { onConflict: "space_id,key", ignoreDuplicates: true });
        fail("record nudge", error);
    }
}

// ---------------------------------------------------------------------------
// Spaces for this account (the switcher, onboarding, invitations)
// ---------------------------------------------------------------------------

/** Every space in this tenant the signed-in user is a member of. */
export async function listMySpaces(orgId: string, userId: string): Promise<SpaceSummary[]> {
    // The RPC reads auth.uid() itself; the id here is the caller's sanity check
    // (no session → nothing to list, and no round trip).
    if (!userId) return [];
    const { data, error } = await supabase.rpc("wf_list_my_spaces", { p_org: orgId });
    fail("spaces", error);
    return ((data as Row[] | null) ?? []).map(mapSummary);
}

/** Create a family and make the signed-in user its first parent. */
export async function createSpace(orgId: string, input: NewSpace): Promise<SpaceSummary> {
    const { data, error } = await supabase.rpc("wf_create_space", {
        p_org: orgId,
        p_name: input.name.trim(),
        p_tagline: input.tagline.trim(),
        p_my_name: input.myName.trim(),
        p_my_relation: input.myRelation.trim(),
        p_values: input.values,
        p_mission: input.mission.trim(),
        p_currency: input.currency,
        p_timezone: input.timezone,
    });
    fail("create space", error);
    return mapSummary((data as Row | null) ?? {});
}

/** Join a family with an invite code; the member row takes the invite's name, role and relation. */
export async function acceptInvite(orgId: string, code: string): Promise<SpaceSummary> {
    const { data, error } = await supabase.rpc("wf_accept_invite", { p_org: orgId, p_code: code.trim().toUpperCase() });
    fail("accept invite", error);
    return mapSummary((data as Row | null) ?? {});
}
