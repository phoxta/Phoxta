import type { ComponentType } from "react";
import type { Hue } from "@/lib/format";

/**
 * Wàfè — the core domain every module shares.
 *
 * A SPACE is one family (or couple, or person): the tenant's unit of privacy.
 * MEMBERS belong to a space with a ROLE. Everything a module stores hangs off a
 * space, and most of it also carries a VISIBILITY so a child never sees a thing
 * simply because they belong to the family.
 *
 * Modules are self-contained (see CONTRACT.md): each one exports a manifest
 * (`WafeModule`) with its routes, its repo (demo + live), its seed, and what it
 * contributes to the shared surfaces — the dashboard, the follow-up engine and
 * the AI companion's grounding.
 */

// ---------------------------------------------------------------------------
// Areas, roles, visibility
// ---------------------------------------------------------------------------

/** The five areas of the product plus Family. Doubles as the colour theme key. */
export type Area = "home" | "grow" | "execute" | "live" | "create" | "family";

export const AREA_LABEL: Record<Area, string> = {
    home: "Home",
    grow: "Grow",
    execute: "Execute",
    live: "Live",
    create: "Create",
    family: "Family",
};

/** Design-system colour theme keys (areas + the accent hues used on covers). */
export type Theme = Area | "terra" | "ochre" | "plum" | "sage" | "mint";

export type Role = "parent" | "child" | "guest";

export const ROLE_LABEL: Record<Role, string> = { parent: "Parent", child: "Child", guest: "Guest" };

/**
 * The age band, which drives layout, copy, content filters and reward
 * mechanics for a child. A parent SETS it — it is never inferred from a
 * birthday, because a birthday is optional and a family knows its own child
 * better than an arithmetic rule does. (The Family module offers the change
 * when a birthday crosses a boundary; it never applies it silently.)
 */
export type AgeBand = "little" | "junior" | "teen" | "young-adult" | "adult";

export const AGE_BAND: Record<AgeBand, { label: string; years: string; note: string }> = {
    little: { label: "Little", years: "4–6", note: "Tap to complete, read aloud, pictures not words. No free typing." },
    junior: { label: "Junior", years: "7–10", note: "Assigned lessons, chores and habits. Simplified nav, bigger type." },
    teen: { label: "Teen", years: "11–14", note: "Own habits, reading plans, private prayers and boards." },
    "young-adult": { label: "Young adult", years: "15–17", note: "Near-parent layout, own credentials, per-module grants." },
    adult: { label: "Adult", years: "18+", note: "Parents and guests." },
};

/**
 * Who may see a thing.
 *  private — the owner member only
 *  shared  — the owner plus members listed on the row (`sharedWith`)
 *  family  — every parent and guest in the space; children only when
 *            `childSafe` is also true on the row (or the module is child-facing)
 *  child   — written for children: visible to everyone
 */
export type Visibility = "private" | "shared" | "family" | "child";

// ---------------------------------------------------------------------------
// Space + members
// ---------------------------------------------------------------------------

export interface Space {
    id: string;
    /** "The Adeyemi family", "Femi & Ada". */
    name: string;
    /** Short line under the name, e.g. "Manchester · est. 2014". */
    tagline: string;
    /** Family values, in the family's own words. */
    values: string[];
    /** The one-paragraph mission the vision blueprint expands on. */
    mission: string;
    coverUrl?: string;
    currency: string;
    /** ISO weekday the family plans on (1 = Monday … 7 = Sunday). */
    planningDay: number;
    /** Local timezone label for briefings. */
    timezone: string;
    createdAt: string;
}

export interface Member {
    id: string;
    spaceId: string;
    /** Null for a member without an account yet (a young child, an invited relative). */
    userId: string | null;
    name: string;
    /** "Dad", "Mum", "Grandma", "Son". */
    relation: string;
    role: Role;
    ageBand: AgeBand;
    /** Birthday, if shared (drives age-band and birthday nudges). */
    birthday?: string;
    avatarUrl?: string;
    hue: Hue;
    /** Chore/learning points the child has earned (parents/guests keep 0). */
    points: number;
    /** Per-member overrides on top of the role matrix. */
    grants: Partial<Record<Capability, boolean>>;
    email?: string;
    joinedAt: string;
}

export type InviteStatus = "pending" | "accepted" | "expired";

export interface Invite {
    id: string;
    spaceId: string;
    email: string;
    name: string;
    role: Role;
    relation: string;
    code: string;
    status: InviteStatus;
    invitedBy: string;
    createdAt: string;
}

// ---------------------------------------------------------------------------
// Capabilities — what a role may do (see lib/perms.ts for the matrix)
// ---------------------------------------------------------------------------

export type Capability =
    | "dashboard.full"
    | "dashboard.child"
    | "dashboard.guest"
    | "family.manage"
    | "family.settings"
    | "people.manage"
    | "tasks.manage"
    | "tasks.assigned"
    | "tasks.view"
    | "goals.manage"
    | "goals.view"
    | "projects.manage"
    | "projects.view"
    | "calendar.manage"
    | "calendar.view"
    | "learning.manage"
    | "learning.assigned"
    | "books.manage"
    | "books.view"
    | "bible.manage"
    | "bible.assigned"
    | "bible.prayerwall"
    | "curricula.manage"
    | "curricula.mine"
    | "finance.manage"
    | "finance.view"
    | "travel.manage"
    | "travel.view"
    | "wardrobe.manage"
    | "wardrobe.mine"
    | "wellness.manage"
    | "wellness.mine"
    | "studio.full"
    | "studio.child"
    | "studio.limited"
    | "moodboards.manage"
    | "moodboards.view"
    | "memories.manage"
    | "memories.view"
    | "notes.private"
    | "ai.ask"
    | "notifications.view";

// ---------------------------------------------------------------------------
// Shared surfaces every module can contribute to
// ---------------------------------------------------------------------------

/** One line on the dashboard's "Today" list. */
export interface AgendaItem {
    id: string;
    moduleId: string;
    area: Area;
    /** "Finish Chapter 3", "Evening check-in". */
    title: string;
    /** "Learning · 20 min", "Chore · 10 pts". */
    meta: string;
    /** Who it is for; null = the whole family. */
    memberId: string | null;
    /** ISO time when it has one, else null (all-day). */
    at: string | null;
    done: boolean;
    href: string;
    /** Sort key: earlier first; undated items sort by priority. */
    sort: number;
}

/** Something that needs a decision or is slipping. */
export interface AttentionItem {
    id: string;
    moduleId: string;
    area: Area;
    tone: "danger" | "warn" | "info" | "celebrate";
    title: string;
    body: string;
    href: string;
    /** Higher shows first. */
    weight: number;
}

/** A progress ring on the dashboard's "What we're building". */
export interface ProgressRing {
    id: string;
    moduleId: string;
    area: Area;
    label: string;
    /** 0-100 */
    pct: number;
    sub: string;
    href: string;
}

/** A card on the child dashboard. */
export interface ChildCard {
    id: string;
    moduleId: string;
    area: Area;
    title: string;
    body: string;
    emoji: string;
    href: string;
    /** Optional 0-100 for a mini progress bar. */
    pct?: number;
    done?: boolean;
}

export interface DashboardContribution {
    agenda?: AgendaItem[];
    attention?: AttentionItem[];
    rings?: ProgressRing[];
    childCards?: ChildCard[];
}

/** A nudge the follow-up engine may raise (computed from state, never stored twice). */
export interface Nudge {
    /** Stable per situation, e.g. "task-overdue-<id>", so it is raised once. */
    key: string;
    moduleId: string;
    kind: NotificationKind;
    title: string;
    body: string;
    href: string;
    /** Members to notify; empty = every parent. */
    memberIds: string[];
    /** Optional ISO time before which it should not fire. */
    notBefore?: string;
}

export type NotificationKind = "task" | "goal" | "event" | "learning" | "prayer" | "finance" | "travel" | "wellness" | "family" | "celebrate" | "briefing";

export interface Notification {
    id: string;
    spaceId: string;
    memberId: string;
    kind: NotificationKind;
    title: string;
    body: string;
    href: string | null;
    readAt: string | null;
    createdAt: string;
}

// ---------------------------------------------------------------------------
// Module contract
// ---------------------------------------------------------------------------

/** What every repo call knows about who is asking. */
export interface RepoContext {
    /** "demo" runs in the browser on the seed; "live" is Supabase under RLS. */
    kind: "demo" | "live";
    orgId: string | null;
    space: Space;
    members: Member[];
    /** The signed-in (or demo-selected) member. */
    me: Member;
    role: Role;
    can: (c: Capability) => boolean;
    /** Today, as an ISO date (YYYY-MM-DD) in the space's timezone. */
    today: string;
}

export interface SeedContext {
    space: Space;
    members: Member[];
    /** Members by relation: parents[0] is Dad, parents[1] is Mum, kids in age order, guests. */
    parents: Member[];
    kids: Member[];
    guests: Member[];
    /** ISO date for "today" in the demo (Sun 6 Sep 2026); relative helpers below. */
    today: string;
    /** ISO datetime N days from today at HH:MM (negative for the past). */
    at: (daysFromToday: number, hhmm?: string) => string;
    /** ISO date N days from today. */
    day: (daysFromToday: number) => string;
    /** Stable ids: uid("task") → "task-<n>" — deterministic in seeds. */
    uid: (prefix: string) => string;
    /** "/images/<name>.jpg" — files fetched with scripts/pexels.mjs. */
    img: (name: string) => string;
}

/**
 * A module's data access. `load` returns the whole slice the module's screens
 * need for this member (respecting visibility); writes are explicit methods
 * the module declares on its own interface, and after every write the shell
 * reloads the slice — so derived numbers are always consistent with storage.
 */
export interface ModuleRepo<S> {
    load(): Promise<S>;
    /** Optional live-update hook (realtime, another tab). */
    subscribe?(onChange: () => void): () => void;
}

export interface ModuleRoute {
    /** Relative to the module's `path` ("" = index, ":id", "boards/:id"). */
    path: string;
    /** A lazy component: () => import("./pages/X") */
    lazy: () => Promise<{ default: ComponentType }>;
}

export interface WafeModule<S = unknown, R extends ModuleRepo<S> = ModuleRepo<S>> {
    id: string;
    area: Area;
    /** The module's full name, used as the page title. */
    name: string;
    /**
     * The sidebar label. A nav rail is read at a glance and truncates at about
     * twenty characters, so "Bible, prayer & discipleship" becomes "Bible".
     * Falls back to `name` when a module's name is already short enough.
     */
    nav?: string;
    /** One line for the area overview page. */
    blurb: string;
    /** Lucide icon component. */
    icon: ComponentType<{ size?: number; strokeWidth?: number; className?: string; "aria-hidden"?: boolean | "true" }>;
    /** Absolute base path, e.g. "/grow/learning". */
    path: string;
    /** Capabilities that make the module visible in nav (any of them). */
    visibleTo: Capability[];
    routes: ModuleRoute[];
    /** Build the repo for this context; the shell calls it once per member/space. */
    createRepo(ctx: RepoContext): R;
    /** What this module puts on the shared surfaces, computed from its loaded state. */
    dashboard?(state: S, ctx: RepoContext): DashboardContribution;
    /** Follow-ups this module wants raised now (the engine dedupes on `key`). */
    nudges?(state: S, ctx: RepoContext): Nudge[];
    /**
     * A compact, role-safe plain-text summary of this module for the AI
     * companion's grounding (≤ 1,500 chars). Must omit anything `ctx.role`
     * may not see — the companion is only as private as this string.
     */
    aiContext?(state: S, ctx: RepoContext): string;
    /** Search hits for the global search box. */
    search?(state: S, q: string): Array<{ title: string; meta: string; href: string }>;
}
