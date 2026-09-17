import type { AgendaItem, AgeBand, AttentionItem, Capability, ChildCard, DashboardContribution, Invite, Member, Nudge, ProgressRing, RepoContext, Space } from "@/data/core";
import { AGE_BAND } from "@/data/core";
import { GRANTABLE } from "@/lib/perms";
import { ageOf, isoDate, money, pct } from "@/lib/format";
import { BAND_DEFAULTS, BAND_FOR_AGE, BAND_UNTIL, GUEST_TAG, SHARE_TYPE, planOf, type FamilyState, type FamilyValue, type ObjectShare, type ValueLink } from "./types";

/**
 * Every number the Family screens show, and the filter that decides what a
 * member is allowed to receive in the first place.
 *
 * The filter is the important one: `visibleTo` runs in BOTH repos, so a child
 * loading this module in the demo gets a state that physically does not
 * contain the audit log, the AI meter, another member's shares, the
 * permission overrides or the PIN — the screens never have to remember to
 * hide them.
 */

// ---------------------------------------------------------------------------
// Visibility
// ---------------------------------------------------------------------------

const EMPTY_USAGE = { month: "", calls: 0, images: 0, mediaMb: 0, reels: 0 };

/** The slice this member may hold. Parents get the whole thing. */
export function visibleTo(state: FamilyState, ctx: RepoContext): FamilyState {
    const parent = ctx.role === "parent";
    const active = state.values.filter((v) => !v.archivedAt);
    if (parent) return { ...state, pinSet: state.pinSet };

    const mine = state.shares.filter((s) => s.memberId === ctx.me.id && !expired(s, ctx.today));
    return {
        // Values and the current mission are the family's public face: a child
        // and a guest both see them, because both are asked to live by them.
        values: active,
        valueLinks: [],
        missions: state.missions.slice(0, 1),
        shares: mine,
        audit: [],
        settings: {
            ...state.settings,
            // The rhythms are shared; the money threshold and the plan are not.
            purchaseApprovalCents: 0,
            plan: state.settings.plan,
        },
        guestTags: ctx.me.id in state.guestTags ? { [ctx.me.id]: state.guestTags[ctx.me.id] } : {},
        childMode: { [ctx.me.id]: Boolean(state.childMode[ctx.me.id]) },
        overrides: state.overrides[ctx.me.id] ? { [ctx.me.id]: state.overrides[ctx.me.id] } : {},
        pinSet: state.pinSet,
        usage: EMPTY_USAGE,
        exports: [],
        handovers: [],
    };
}

export const expired = (s: ObjectShare, today: string): boolean => Boolean(s.expiresAt && s.expiresAt.slice(0, 10) < today);

// ---------------------------------------------------------------------------
// Permissions: band defaults + explicit overrides
// ---------------------------------------------------------------------------

export type GrantSource = "band" | "explicit-on" | "explicit-off" | "none";

/** Where a capability's current answer comes from, for the tri-state editor. */
export function grantSource(band: AgeBand, overrides: Partial<Record<Capability, boolean>> | undefined, cap: Capability): GrantSource {
    const o = overrides?.[cap];
    if (o === true) return "explicit-on";
    if (o === false) return "explicit-off";
    return BAND_DEFAULTS[band].includes(cap) ? "band" : "none";
}

/**
 * The grants a member SHOULD hold: the band's defaults, widened by explicit
 * "on" decisions and narrowed by explicit "off" ones. This is what a band
 * change writes back to the core member row — which is exactly why an
 * override survives a birthday.
 */
export function effectiveGrants(band: AgeBand, overrides: Partial<Record<Capability, boolean>> | undefined): Partial<Record<Capability, boolean>> {
    const out: Partial<Record<Capability, boolean>> = {};
    for (const cap of BAND_DEFAULTS[band]) out[cap] = true;
    for (const [cap, on] of Object.entries(overrides ?? {})) {
        if (on) out[cap as Capability] = true;
        else delete out[cap as Capability];
    }
    return out;
}

/** The capabilities that must be turned on / off in core to match `effectiveGrants`. */
export function grantDiff(member: Member, band: AgeBand, overrides: Partial<Record<Capability, boolean>> | undefined): Array<{ cap: Capability; on: boolean }> {
    const want = effectiveGrants(band, overrides);
    const have = member.grants ?? {};
    const caps = new Set<Capability>([...(Object.keys(want) as Capability[]), ...(Object.keys(have) as Capability[])]);
    const out: Array<{ cap: Capability; on: boolean }> = [];
    for (const cap of caps) {
        const a = want[cap] === true;
        const b = have[cap] === true;
        if (a !== b) out.push({ cap, on: a });
    }
    return out;
}

// ---------------------------------------------------------------------------
// Age bands and the birthday rule
// ---------------------------------------------------------------------------

export interface BandCheck {
    member: Member;
    age: number | null;
    band: AgeBand;
    /** The band the birthday implies (null when we have no birthday). */
    implied: AgeBand | null;
    /** True when the two disagree and a parent should decide. */
    mismatch: boolean;
    /** The band they move to next, and the date they reach it. */
    nextBand: AgeBand | null;
    nextOn: string | null;
    daysToNext: number | null;
}

/**
 * The band rule, written down: Little 4–6, Junior 7–10, Teen 11–14, Young
 * adult 15–17. A birthday never changes a band on its own — the family knows
 * its child better than arithmetic does — but the day the boundary is crossed
 * (and for a month beforehand) a parent is asked.
 */
export function bandChecks(members: Member[], today: string): BandCheck[] {
    const now = new Date(`${today}T12:00:00`);
    return members
        .filter((m) => m.role === "child")
        .map((m) => {
            if (!m.birthday) return { member: m, age: null, band: m.ageBand, implied: null, mismatch: false, nextBand: null, nextOn: null, daysToNext: null };
            const age = ageOf(m.birthday, now);
            const implied = BAND_FOR_AGE(age);
            const until = BAND_UNTIL[m.ageBand];
            let nextOn: string | null = null;
            let nextBand: AgeBand | null = null;
            if (until !== undefined && age <= until) {
                const b = new Date(m.birthday);
                const year = now.getFullYear() + (until + 1 - age);
                const at = new Date(year, b.getMonth(), b.getDate());
                nextOn = isoDate(at);
                nextBand = BAND_FOR_AGE(until + 1);
            }
            const daysToNext = nextOn ? Math.round((new Date(`${nextOn}T12:00:00`).getTime() - now.getTime()) / 86_400_000) : null;
            return { member: m, age, band: m.ageBand, implied, mismatch: implied !== m.ageBand, nextBand, nextOn, daysToNext };
        });
}

// ---------------------------------------------------------------------------
// The recommended profile for a band
// ---------------------------------------------------------------------------

export interface ProfileSuggestion {
    cap: Capability;
    label: string;
    /** What the profile proposes: allow it, or block it. */
    allow: boolean;
    why: string;
}

/**
 * What a child of this band is usually given, with the reason in a sentence a
 * parent can disagree with. This is the companion's TEMPLATE fallback — the
 * screen shows these rows whether or not the AI answered, because a
 * recommendation nobody can read is not a recommendation, and because the
 * companion proposes and never writes.
 */
const PROFILE: Record<AgeBand, Partial<Record<Capability, { allow: boolean; why: string }>>> = {
    little: {
        "studio.full": { allow: false, why: "Four to six stays in the child studio: pictures to tap, no free typing." },
        "moodboards.manage": { allow: false, why: "At this age a board is for looking at, not for pinning to." },
    },
    junior: {
        "memories.manage": { allow: true, why: "Nine-year-olds take good photographs — let them add to the album." },
        "moodboards.manage": { allow: true, why: "Pinning to a shared board is a safe first taste of making something." },
        "studio.full": { allow: false, why: "The child studio's presets are the right amount of studio at this age." },
        "finance.view": { allow: false, why: "Money is not a Junior's business yet." },
    },
    teen: {
        "moodboards.manage": { allow: true, why: "Their own boards are where a teenager thinks out loud." },
        "studio.full": { allow: true, why: "The whole studio, with the classifier reading the prompts." },
        "memories.manage": { allow: true, why: "They are the one with the camera at everything now." },
        "projects.view": { allow: true, why: "Seeing the household's projects is how they learn to run one." },
        "finance.view": { allow: false, why: "An envelope of their own, not the family budget — that comes at fifteen." },
    },
    "young-adult": {
        "finance.view": { allow: true, why: "A read-only view of the budget is a year of practice before they leave home." },
        "calendar.manage": { allow: true, why: "Sixth form runs on their own calendar, not yours." },
        "projects.view": { allow: true, why: "Old enough to carry part of a household project." },
        "tasks.manage": { allow: true, why: "Let them run their own chores rather than be handed them." },
        "moodboards.manage": { allow: true, why: "Their boards, their taste." },
        "memories.manage": { allow: true, why: "They are the one with the camera." },
        "studio.full": { allow: true, why: "The whole studio." },
    },
    adult: {},
};

/** The proposals for a child on this band, in the editor's own order. */
export function recommendedProfile(band: AgeBand): ProfileSuggestion[] {
    const rules = PROFILE[band];
    return GRANTABLE.filter((g) => g.roles.includes("child")).map((g) => {
        const rule = rules[g.cap];
        if (rule) return { cap: g.cap, label: g.label, allow: rule.allow, why: rule.why };
        const byDefault = BAND_DEFAULTS[band].includes(g.cap);
        return { cap: g.cap, label: g.label, allow: byDefault, why: byDefault ? `The ${AGE_BAND[band].label} band gives this by default.` : `Not usually given on the ${AGE_BAND[band].label} band.` };
    });
}

/** Is this proposal already what the member holds? */
export function profileMatches(band: AgeBand, overrides: Partial<Record<Capability, boolean>> | undefined, s: ProfileSuggestion): boolean {
    const src = grantSource(band, overrides, s.cap);
    const on = src === "explicit-on" || src === "band";
    return on === s.allow;
}

// ---------------------------------------------------------------------------
// Values: what points at them
// ---------------------------------------------------------------------------

/**
 * Every record that references a value: the module's own index plus a scan of
 * the other modules' loaded slices, so the "archive, never delete" rule is
 * right even when an index row was never written.
 */
export function valueUsage(state: FamilyState, slices?: Record<string, { state?: unknown }>): Record<string, ValueLink[]> {
    const out: Record<string, ValueLink[]> = {};
    for (const v of state.values) out[v.id] = [];
    for (const l of state.valueLinks) (out[l.valueId] ??= []).push(l);
    if (slices) {
        for (const [moduleId, slice] of Object.entries(slices)) {
            if (moduleId === "family" || !slice || slice.state === undefined) continue;
            for (const hit of scan(slice.state, state.values)) {
                const list = (out[hit.valueId] ??= []);
                if (!list.some((x) => x.label === hit.label && x.moduleId === moduleId)) list.push({ id: `${moduleId}:${list.length}`, valueId: hit.valueId, moduleId, label: hit.label, href: hit.href });
            }
        }
    }
    return out;
}

const VALUE_KEYS = new Set(["valueid", "value", "values", "valueids"]);
const TITLE_KEYS = ["title", "name", "label", "question", "summary"];

/** A bounded walk of another module's slice looking for value references. */
function scan(root: unknown, values: FamilyValue[]): Array<{ valueId: string; label: string; href: string }> {
    const byKey = new Map<string, string>();
    for (const v of values) {
        byKey.set(v.id.toLowerCase(), v.id);
        byKey.set(v.name.toLowerCase(), v.id);
    }
    const hits: Array<{ valueId: string; label: string; href: string }> = [];
    const queue: unknown[] = [root];
    let seen = 0;
    while (queue.length && seen < 4000 && hits.length < 200) {
        const node = queue.shift();
        seen += 1;
        if (Array.isArray(node)) {
            for (const x of node) if (x && typeof x === "object") queue.push(x);
            continue;
        }
        if (!node || typeof node !== "object") continue;
        const obj = node as Record<string, unknown>;
        const matched = new Set<string>();
        for (const [k, v] of Object.entries(obj)) {
            if (VALUE_KEYS.has(k.toLowerCase())) {
                const list = Array.isArray(v) ? v : [v];
                for (const item of list) if (typeof item === "string" && byKey.has(item.toLowerCase())) matched.add(byKey.get(item.toLowerCase())!);
            } else if (v && typeof v === "object") {
                queue.push(v);
            }
        }
        if (matched.size) {
            const title = TITLE_KEYS.map((k) => obj[k]).find((x) => typeof x === "string" && x) as string | undefined;
            const href = typeof obj.href === "string" ? obj.href : "";
            for (const id of matched) hits.push({ valueId: id, label: title ?? "A record", href });
        }
    }
    return hits;
}

// ---------------------------------------------------------------------------
// The plan and the meter
// ---------------------------------------------------------------------------

export interface Meter {
    planName: string;
    used: number;
    cap: number;
    pct: number;
    tone: "ok" | "warn" | "danger";
    message: string;
}

/** The companion's monthly allowance: an 80 % warning, then a plain hard stop. */
export function meter(state: FamilyState): Meter {
    const plan = planOf(state.settings.plan);
    const used = state.usage.calls;
    const p = Math.min(100, pct(used, plan.aiCalls));
    const tone = p >= 100 ? "danger" : p >= 80 ? "warn" : "ok";
    const message =
        p >= 100
            ? `You have used this month's ${plan.aiCalls} companion answers. Briefings fall back to the template until the ${monthName(state.usage.month)} allowance resets.`
            : p >= 80
              ? `${plan.aiCalls - used} companion answers left this month.`
              : `${used} of ${plan.aiCalls} companion answers used this month.`;
    return { planName: plan.name, used, cap: plan.aiCalls, pct: p, tone, message };
}

const monthName = (m: string): string => (m ? new Date(`${m}-01T12:00:00`).toLocaleDateString("en-GB", { month: "long" }) : "next");

// ---------------------------------------------------------------------------
// Set-up completeness — the first-run checklist, kept honest afterwards
// ---------------------------------------------------------------------------

export interface SetupStep {
    id: string;
    label: string;
    done: boolean;
    href: string;
    note: string;
}

export function setupSteps(state: FamilyState, space: Space, members: Member[], goalsWithMilestones: number): SetupStep[] {
    const active = state.values.filter((v) => !v.archivedAt);
    return [
        { id: "values", label: "Name your values", done: active.length >= 3, href: "/family/settings", note: "Three to seven words the whole house recognises." },
        { id: "mission", label: "Write the mission", done: space.mission.trim().length > 20, href: "/family/settings", note: "One paragraph the children could repeat." },
        { id: "members", label: "Add everyone", done: members.length >= 3, href: "/family/members", note: "Children get a band; guests get nothing until you share something." },
        { id: "roles", label: "Set roles and permissions", done: members.some((m) => m.role !== "parent"), href: "/family/permissions", note: "A second parent, a teenager's budget view, a grandmother's calendar." },
        { id: "goals", label: "Set one goal with milestones", done: goalsWithMilestones > 0, href: "/execute/goals", note: "A value nobody is working towards is a poster, not a plan." },
        { id: "rhythms", label: "Choose your rhythms", done: state.settings.briefingHour > 0 && state.settings.checkinHour > 0, href: "/family/settings", note: "Briefing hour, check-in hour, planning day, grace days." },
    ];
}

// ---------------------------------------------------------------------------
// Small helpers the screens share
// ---------------------------------------------------------------------------

/** A share's target, which may be a member or an invitation that has not been accepted. */
export function shareTarget(id: string, members: Member[], invites: Invite[]): { name: string; member?: Member; pending?: Invite } {
    const m = members.find((x) => x.id === id);
    if (m) return { name: m.name, member: m };
    const inv = invites.find((x) => x.id === id);
    if (inv) return { name: inv.name, pending: inv };
    return { name: "Someone who has left" };
}

/** Days an invitation has left of its seven. */
export const inviteDaysLeft = (inv: Invite, today: string): number => {
    const created = new Date(`${inv.createdAt.slice(0, 10)}T12:00:00`).getTime();
    const now = new Date(`${today}T12:00:00`).getTime();
    return 7 - Math.round((now - created) / 86_400_000);
};

export const guestTagLabel = (tag: string | undefined): string => (tag && tag in GUEST_TAG ? GUEST_TAG[tag as keyof typeof GUEST_TAG].label : "Guest");

/**
 * The named things THIS member holds, newest first — for a guest that list is
 * the whole of their product, so it has a screen of its own (`/family/shared`)
 * as well as a place on the dashboard and a notification when one arrives.
 */
export function sharesFor(state: FamilyState, memberId: string, today: string): ObjectShare[] {
    return state.shares.filter((s) => s.memberId === memberId && !expired(s, today)).sort((a, b) => b.grantedAt.localeCompare(a.grantedAt));
}

// ---------------------------------------------------------------------------
// The handover: what happens to a leaving member's open work
// ---------------------------------------------------------------------------

/** The little of another module's task this module needs in order to move it. */
export interface OpenTask {
    id: string;
    title: string;
    /** Everyone the task is assigned to right now. */
    assignees: string[];
}

/**
 * The one write the handover asks of the tasks module, described by shape
 * rather than imported: we never reach into another module's data, we call the
 * method it publishes, exactly as a page does.
 */
interface TaskWriter {
    bulkAssign?: (ids: string[], memberIds: string[]) => Promise<unknown>;
    updateTask?: (id: string, patch: { assigneeMemberIds: string[] }) => Promise<unknown>;
}

/**
 * The unfinished tasks a member is carrying, read (never written) from the
 * tasks module's loaded slice. Only that module's `tasks` array is read, and
 * only its assignee list — counting anything that merely holds a member id
 * would sweep in rotas and ledger rows and make the handover lie.
 */
export function openTasksFor(slice: unknown, memberId: string): OpenTask[] {
    const rows = (slice as { tasks?: unknown } | undefined)?.tasks;
    if (!Array.isArray(rows)) return [];
    const out: OpenTask[] = [];
    for (const row of rows) {
        if (!row || typeof row !== "object") continue;
        const t = row as Record<string, unknown>;
        if (typeof t.id !== "string") continue;
        const assignees = Array.isArray(t.assigneeMemberIds)
            ? t.assigneeMemberIds.filter((x): x is string => typeof x === "string")
            : typeof t.assigneeId === "string"
              ? [t.assigneeId]
              : [];
        if (!assignees.includes(memberId)) continue;
        if (t.done === true || t.doneAt != null || t.completedAt != null || t.status === "done" || t.status === "complete") continue;
        out.push({ id: t.id, title: typeof t.title === "string" ? t.title : "A task", assignees });
    }
    return out;
}

export interface HandoverPlan {
    /** Every open task the leaving member is on. */
    total: number;
    /** Those nobody else is on: these pass to the owner. */
    toOwner: number;
    /** Those someone else is also on: they stay with that someone. */
    shared: number;
}

/** What the removal is about to do — the only thing the dialog may claim. */
export function handoverPlan(tasks: OpenTask[], fromId: string): HandoverPlan {
    let toOwner = 0;
    for (const t of tasks) if (t.assignees.filter((x) => x !== fromId).length === 0) toOwner += 1;
    return { total: tasks.length, toOwner, shared: tasks.length - toOwner };
}

/**
 * The sentence the removal dialog is allowed to say. It is generated from the
 * plan rather than written by hand, so the promise on screen and the work that
 * follows can never drift apart.
 */
export function removalBody(memberName: string, ownerName: string, tasks: OpenTask[], fromId: string): string {
    const plan = handoverPlan(tasks, fromId);
    const first = memberName.split(" ")[0];
    const s = (n: number) => (n === 1 ? "" : "s");
    const work =
        plan.total === 0
            ? `${first} has no open tasks.`
            : plan.toOwner === 0
              ? `Their ${plan.shared} open task${s(plan.shared)} stay${plan.shared === 1 ? "s" : ""} with the others already on them.`
              : `${plan.toOwner} open task${s(plan.toOwner)} pass${plan.toOwner === 1 ? "es" : ""} to ${ownerName}${plan.shared ? `, and ${plan.shared} shared with someone else stay${plan.shared === 1 ? "s" : ""} with them` : ""}.`;
    return `Their access ends with this click. ${work} Everything they wrote — prayers, memories, notes — stays exactly where it is, under their name.`;
}

/** The new assignee list for each task, batched so equal lists move in one call. */
export function handoverGroups(tasks: OpenTask[], fromId: string, toId: string): Array<{ assignees: string[]; ids: string[] }> {
    const by = new Map<string, { assignees: string[]; ids: string[] }>();
    for (const t of tasks) {
        const rest = t.assignees.filter((x) => x !== fromId);
        const next = rest.length ? rest : [toId];
        const key = next.join(",");
        const group = by.get(key) ?? { assignees: next, ids: [] };
        group.ids.push(t.id);
        by.set(key, group);
    }
    return [...by.values()];
}

/**
 * Actually move the work, through the tasks module's own repo — the same way a
 * page credits points through core rather than writing another module's rows.
 * It returns what really happened, because the handover record and the audit
 * line are only allowed to claim that.
 */
export async function reassignOpenTasks(repo: unknown, tasks: OpenTask[], fromId: string, toId: string): Promise<HandoverPlan> {
    const done: HandoverPlan = { total: 0, toOwner: 0, shared: 0 };
    if (!tasks.length) return done;
    const writer = repo as TaskWriter | undefined;
    for (const group of handoverGroups(tasks, fromId, toId)) {
        if (typeof writer?.bulkAssign === "function") await writer.bulkAssign(group.ids, group.assignees);
        else if (typeof writer?.updateTask === "function") for (const id of group.ids) await writer.updateTask(id, { assigneeMemberIds: group.assignees });
        else break;
        done.total += group.ids.length;
        if (group.assignees.length === 1 && group.assignees[0] === toId) done.toOwner += group.ids.length;
        else done.shared += group.ids.length;
    }
    return done;
}

/** Days until the next anniversary of an ISO date (0 = today). */
export function daysToAnniversary(iso: string, today: string): number {
    const b = new Date(iso);
    const now = new Date(`${today}T12:00:00`);
    let next = new Date(now.getFullYear(), b.getMonth(), b.getDate());
    if (next.getTime() < new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()) next = new Date(now.getFullYear() + 1, b.getMonth(), b.getDate());
    return Math.round((next.getTime() - new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()) / 86_400_000);
}

// ---------------------------------------------------------------------------
// Shared surfaces
// ---------------------------------------------------------------------------

export function dashboard(state: FamilyState, ctx: RepoContext): DashboardContribution {
    const agenda: AgendaItem[] = [];
    const attention: AttentionItem[] = [];
    const rings: ProgressRing[] = [];
    const childCards: ChildCard[] = [];
    const parent = ctx.role === "parent";

    // Birthdays are the family's own calendar, and everyone sees them.
    for (const m of ctx.members) {
        if (!m.birthday) continue;
        const d = daysToAnniversary(m.birthday, ctx.today);
        if (d === 0) {
            agenda.push({ id: `bday-${m.id}`, moduleId: "family", area: "family", title: `${m.name.split(" ")[0]}'s birthday`, meta: `Family · turns ${ageOf(m.birthday, new Date(`${ctx.today}T12:00:00`))}`, memberId: null, at: null, done: false, href: "/family/members", sort: 5 });
            attention.push({ id: `bday-${m.id}`, moduleId: "family", area: "family", tone: "celebrate", title: `It's ${m.name.split(" ")[0]}'s birthday`, body: "Say it out loud at breakfast, and put a photo on the timeline.", href: "/family/members", weight: 60 });
        } else if (d <= 7 && parent) {
            attention.push({ id: `bday-soon-${m.id}`, moduleId: "family", area: "family", tone: "info", title: `${m.name.split(" ")[0]}'s birthday in ${d} day${d === 1 ? "" : "s"}`, body: "Time to plan something small, or something big.", href: "/family/members", weight: 30 });
        }
    }

    if (parent) {
        const met = meter(state);
        if (met.pct >= 80) {
            attention.push({
                id: "ai-cap",
                moduleId: "family",
                area: "family",
                tone: met.pct >= 100 ? "danger" : "warn",
                title: met.pct >= 100 ? "The companion's allowance is spent" : `The companion is at ${met.pct}% of this month`,
                body: met.message,
                href: "/family/settings",
                weight: met.pct >= 100 ? 82 : 48,
            });
        }

        for (const s of state.shares) {
            if (!s.expiresAt) continue;
            const days = Math.round((new Date(s.expiresAt).getTime() - new Date(`${ctx.today}T12:00:00`).getTime()) / 86_400_000);
            if (days >= 0 && days <= 14) {
                const who = shareTarget(s.memberId, ctx.members, []).name;
                attention.push({ id: `share-${s.id}`, moduleId: "family", area: "family", tone: "info", title: `“${s.label}” stops being shared in ${days} day${days === 1 ? "" : "s"}`, body: `${who} will lose it on the date you set. Extend it or let it lapse.`, href: "/family/permissions", weight: 26 });
            }
        }

        for (const b of bandChecks(ctx.members, ctx.today)) {
            if (b.mismatch && b.implied) {
                attention.push({ id: `band-${b.member.id}`, moduleId: "family", area: "family", tone: "info", title: `${b.member.name.split(" ")[0]} is ${b.age} — still on the ${AGE_BAND[b.band].label} band`, body: `${AGE_BAND[b.implied].label} would give ${b.member.name.split(" ")[0]} ${AGE_BAND[b.implied].note.toLowerCase()} Your own permission choices are kept.`, href: "/family/members", weight: 44 });
            } else if (b.daysToNext !== null && b.daysToNext <= 30 && b.nextBand) {
                attention.push({ id: `band-soon-${b.member.id}`, moduleId: "family", area: "family", tone: "info", title: `${b.member.name.split(" ")[0]} moves to ${AGE_BAND[b.nextBand].label} in ${b.daysToNext} days`, body: "We will ask before anything changes — a band is a decision, not a birthday.", href: "/family/members", weight: 20 });
            }
        }

        const setup = setupSteps(state, ctx.space, ctx.members, 1);
        const done = setup.filter((s) => s.done).length;
        if (done < setup.length) {
            attention.push({ id: "setup", moduleId: "family", area: "family", tone: "info", title: `${setup.length - done} thing${setup.length - done === 1 ? "" : "s"} left to set up`, body: setup.filter((s) => !s.done).map((s) => s.label).join(" · "), href: "/family/members", weight: 34 });
        }
        rings.push({ id: "setup", moduleId: "family", area: "family", label: "Family set-up", pct: pct(done, setup.length), sub: `${done} of ${setup.length} steps`, href: "/family/members" });

        // Only a parent holds the value index, so only a parent gets this ring.
        const usage = valueUsage(state);
        const active = state.values.filter((v) => !v.archivedAt);
        if (active.length) {
            const inPlay = active.filter((v) => (usage[v.id] ?? []).length > 0).length;
            rings.push({ id: "values", moduleId: "family", area: "family", label: "Values in play", pct: pct(inPlay, active.length), sub: `${inPlay} of ${active.length} have something attached`, href: "/family/settings" });
        }
    }

    // A guest's dashboard IS the list of what they were given, so every share
    // they hold is contributed here as well as living on /family/shared.
    if (!parent) {
        for (const s of sharesFor(state, ctx.me.id, ctx.today)) {
            const meta = `${SHARE_TYPE[s.objectType].label} · ${s.level === "contribute" ? "you can join in" : "view only"}`;
            agenda.push({ id: `share-mine-${s.id}`, moduleId: "family", area: "family", title: s.label, meta, memberId: ctx.me.id, at: null, done: false, href: s.href || "/family/shared", sort: 70 });
            if (ctx.role === "guest") {
                attention.push({ id: `share-mine-${s.id}`, moduleId: "family", area: "family", tone: "info", title: s.label, body: `${meta}. Shared with you by the family.`, href: s.href || "/family/shared", weight: 24 });
            }
        }
    }

    if (ctx.role === "child") {
        childCards.push({
            id: "me",
            moduleId: "family",
            area: "family",
            title: "My family card",
            body: `${ctx.me.points} points · ${AGE_BAND[ctx.me.ageBand].label}. Pick your colour and your picture.`,
            emoji: "🏡",
            href: "/family/settings",
        });
    }

    return { agenda, attention, rings, childCards };
}

export function nudges(state: FamilyState, ctx: RepoContext): Nudge[] {
    const out: Nudge[] = [];
    if (ctx.role !== "parent") {
        // A share is only real to a guest when it reaches them: a recent grant
        // becomes one notification, pointing at the thing itself.
        for (const s of sharesFor(state, ctx.me.id, ctx.today)) {
            const days = Math.round((new Date(`${ctx.today}T12:00:00`).getTime() - new Date(s.grantedAt).getTime()) / 86_400_000);
            if (days < 0 || days > 14) continue;
            out.push({
                key: `family-share-granted-${s.id}`,
                moduleId: "family",
                kind: "family",
                title: `${SHARE_TYPE[s.objectType].label} shared with you: ${s.label}`,
                body: s.level === "contribute" ? "You can look at it and add to it." : "You can look at it whenever you like.",
                href: s.href || "/family/shared",
                memberIds: [ctx.me.id],
            });
        }
        return out;
    }
    const met = meter(state);
    if (met.pct >= 80) {
        out.push({
            key: `family-ai-cap-${state.usage.month}-${met.pct >= 100 ? "full" : "80"}`,
            moduleId: "family",
            kind: "family",
            title: met.pct >= 100 ? "The companion's monthly allowance is spent" : "The companion is at 80% of this month",
            body: met.message,
            href: "/family/settings",
            memberIds: [],
        });
    }
    for (const s of state.shares) {
        if (!s.expiresAt) continue;
        const days = Math.round((new Date(s.expiresAt).getTime() - new Date(`${ctx.today}T12:00:00`).getTime()) / 86_400_000);
        if (days >= 0 && days <= 7) {
            out.push({ key: `family-share-expiring-${s.id}`, moduleId: "family", kind: "family", title: `“${s.label}” stops being shared soon`, body: `It lapses in ${days} day${days === 1 ? "" : "s"}. Extend it if the party has moved.`, href: "/family/permissions", memberIds: [] });
        }
    }
    for (const b of bandChecks(ctx.members, ctx.today)) {
        if (b.mismatch && b.implied) {
            out.push({ key: `family-band-${b.member.id}-${b.implied}`, moduleId: "family", kind: "family", title: `Move ${b.member.name.split(" ")[0]} to the ${AGE_BAND[b.implied].label} band?`, body: `${b.member.name.split(" ")[0]} is ${b.age}. Nothing changes until you say so, and your own permission choices are kept.`, href: "/family/members", memberIds: [] });
        } else if (b.daysToNext !== null && b.daysToNext <= 14 && b.nextBand) {
            out.push({ key: `family-band-soon-${b.member.id}-${b.nextBand}`, moduleId: "family", kind: "family", title: `${b.member.name.split(" ")[0]} turns the corner into ${AGE_BAND[b.nextBand].label} soon`, body: `In ${b.daysToNext} days. We will ask you first.`, href: "/family/members", memberIds: [] });
        }
    }
    for (const m of ctx.members) {
        if (!m.birthday) continue;
        if (daysToAnniversary(m.birthday, ctx.today) === 1) {
            out.push({ key: `family-birthday-${m.id}-${new Date(`${ctx.today}T12:00:00`).getFullYear()}`, moduleId: "family", kind: "celebrate", title: `${m.name.split(" ")[0]}'s birthday is tomorrow`, body: "A card, a cake, a photo on the timeline.", href: "/family/members", memberIds: ctx.members.filter((x) => x.id !== m.id).map((x) => x.id) });
        }
    }
    return out;
}

export function aiContext(state: FamilyState, ctx: RepoContext): string {
    const parts: string[] = [];
    const active = state.values.filter((v) => !v.archivedAt);
    if (active.length) parts.push(`Values: ${active.map((v) => `${v.name} — ${v.meaning}`).join(" | ")}`);
    const mission = state.missions[0];
    if (mission) {
        parts.push(`Mission: ${mission.mission}`);
        if (ctx.role === "parent" && mission.vision) parts.push(`Vision: ${mission.vision}`);
    }
    parts.push(`Rhythm: briefing ${String(state.settings.briefingHour).padStart(2, "0")}:00, check-in ${String(state.settings.checkinHour).padStart(2, "0")}:00, planning on day ${ctx.space.planningDay}, grace day(s) ${state.settings.graceDays.join(", ") || "none"}, quiet hours ${state.settings.quietFrom}–${state.settings.quietTo}.`);

    if (ctx.role === "parent") {
        const kids = ctx.members.filter((m) => m.role === "child").map((m) => `${m.name.split(" ")[0]} (${AGE_BAND[m.ageBand].label}${m.birthday ? `, ${ageOf(m.birthday, new Date(`${ctx.today}T12:00:00`))}` : ""}${state.childMode[m.id] ? ", child mode on" : ""})`);
        if (kids.length) parts.push(`Children: ${kids.join("; ")}.`);
        const guests = ctx.members
            .filter((m) => m.role === "guest")
            .map((m) => {
                const n = state.shares.filter((s) => s.memberId === m.id).length;
                return `${m.name} (${guestTagLabel(state.guestTags[m.id])}, ${n} thing${n === 1 ? "" : "s"} shared)`;
            });
        if (guests.length) parts.push(`Guests: ${guests.join("; ")}.`);
        const met = meter(state);
        parts.push(`Plan ${met.planName}: ${met.used}/${met.cap} companion answers used this month. Purchases over ${money(state.settings.purchaseApprovalCents, ctx.space.currency)} need a parent's approval.`);
    } else if (ctx.role === "guest") {
        const mine = state.shares.filter((s) => s.memberId === ctx.me.id);
        parts.push(mine.length ? `Shared with ${ctx.me.name}: ${mine.map((s) => s.label).join("; ")}. Nothing else in this family is visible to them.` : `Nothing has been shared with ${ctx.me.name} yet.`);
    } else {
        parts.push(`${ctx.me.name.split(" ")[0]} is on the ${AGE_BAND[ctx.me.ageBand].label} band with ${ctx.me.points} points. Never discuss money, health notes, documents or other people's private things.`);
    }
    return parts.join("\n").slice(0, 1500);
}

export function search(state: FamilyState, q: string): Array<{ title: string; meta: string; href: string }> {
    const hit = (s: string) => s.toLowerCase().includes(q);
    const out: Array<{ title: string; meta: string; href: string }> = [];
    for (const v of state.values) {
        if (hit(v.name) || hit(v.meaning)) out.push({ title: v.name, meta: `Value · ${v.meaning}`, href: "/family/settings" });
    }
    const mission = state.missions[0];
    if (mission && (hit(mission.mission) || hit(mission.vision) || hit(mission.legacy))) out.push({ title: "Our mission", meta: mission.mission.slice(0, 90), href: "/family/settings" });
    for (const s of state.shares) {
        // The object itself, not the settings page: a guest holds shares too,
        // and /family/permissions is a door they cannot open.
        if (hit(s.label)) out.push({ title: s.label, meta: `Shared · ${s.level === "contribute" ? "can add" : "view only"}`, href: s.href || "/family/shared" });
    }
    for (const a of state.audit.slice(0, 60)) {
        if (hit(a.summary)) out.push({ title: a.summary, meta: "Audit log", href: "/family/permissions" });
    }
    return out.slice(0, 10);
}
