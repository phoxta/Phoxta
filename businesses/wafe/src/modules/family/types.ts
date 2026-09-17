import type { AgeBand, Capability, ModuleRepo, Role } from "@/data/core";

/**
 * Family — the tenant and the trust boundary.
 *
 * The space, its members and its invitations already live in the CORE repo
 * (`useSpace().core`), because every module needs them. This module owns what
 * sits AROUND that core and belongs to nobody else:
 *
 *   · the family's values, with their meanings, and the index of what
 *     references each one (a value can be archived, never deleted out from
 *     under a goal that points at it);
 *   · the mission, kept as versions so a family can see how their words grew;
 *   · object shares — the named things a guest may see, which is the whole of
 *     a guest's product;
 *   · per-member permission OVERRIDES, kept separately from the age-band
 *     defaults so that moving a child between bands re-applies the defaults
 *     without ever silently undoing a parent's explicit decision;
 *   · the rhythms and settings the loop runs on (briefing hour, check-in
 *     hour, planning day, grace days, the purchase-approval threshold);
 *   · the plan, the AI usage meter and the export/delete machinery;
 *   · and the audit log — every role, band, permission, share and settings
 *     change, with who did it and when.
 *
 * Everything here is filtered for the asking member by `visibleTo()` in
 * derive.ts, in BOTH repos: a child never receives the audit log, another
 * member's shares, the PIN or the AI meter, even in the demo.
 */

// ---------------------------------------------------------------------------
// Values, mission
// ---------------------------------------------------------------------------

export interface FamilyValue {
    id: string;
    /** "Faith", "Diligence" — mirrored into `space.values` so every module can chip-filter by it. */
    name: string;
    /** One line, in the family's own words. */
    meaning: string;
    order: number;
    /** Archived values stay on old records but leave the chip row. */
    archivedAt: string | null;
}

/**
 * "What points at this value" — the index behind the rule that a value in use
 * is archived, not deleted. Modules that tag a record with a value add a row;
 * the demo seeds the family's real links, and `valueUsage()` in derive.ts also
 * scans the loaded slices of the other modules so a live space is never wrong
 * because an index row was missed.
 */
export interface ValueLink {
    id: string;
    valueId: string;
    moduleId: string;
    label: string;
    href: string;
}

export interface MissionVersion {
    id: string;
    mission: string;
    vision: string;
    legacy: string;
    authorId: string;
    createdAt: string;
}

// ---------------------------------------------------------------------------
// Guests: tags and the named things they are granted
// ---------------------------------------------------------------------------

export type GuestTag = "relative" | "friend" | "mentor";

export const GUEST_TAG: Record<GuestTag, { label: string; note: string }> = {
    relative: { label: "Relative", note: "Family abroad or across the country: albums, trips, the prayer wall." },
    friend: { label: "Friend", note: "A household you share one thing with — a board, a party, a trip." },
    mentor: { label: "Mentor", note: "Their own sessions and the notes explicitly shared with them." },
};

export type ShareLevel = "view" | "contribute";

export type ShareObjectType = "trip" | "board" | "course" | "wall" | "album" | "event" | "session";

export const SHARE_TYPE: Record<ShareObjectType, { label: string; emoji: string }> = {
    trip: { label: "Trip", emoji: "✈️" },
    board: { label: "Board", emoji: "📌" },
    course: { label: "Course", emoji: "🎓" },
    wall: { label: "Prayer wall", emoji: "🙏" },
    album: { label: "Album", emoji: "🖼️" },
    event: { label: "Calendar event", emoji: "📅" },
    session: { label: "Mentor session", emoji: "🪑" },
};

export interface ObjectShare {
    id: string;
    /** A member id, or the id of an invitation that has not been accepted yet. */
    memberId: string;
    objectType: ShareObjectType;
    objectId: string;
    /** What the guest sees it called. */
    label: string;
    href: string;
    level: ShareLevel;
    grantedBy: string;
    grantedAt: string;
    expiresAt: string | null;
}

// ---------------------------------------------------------------------------
// Rhythms, plan, meter
// ---------------------------------------------------------------------------

export type PlanId = "seed" | "household" | "legacy";

export interface Plan {
    id: PlanId;
    name: string;
    /** Price in pence per month; 0 is free. */
    priceCents: number;
    /** The monthly companion allowance — asks, briefings, plans, summaries. */
    aiCalls: number;
    /** Generated images per month; 0 means the typographic fallback only. */
    images: number;
    /** Media storage across memories, moodboards and the studio. */
    mediaGb: number;
    /** Memory reels the studio may render each month. */
    reels: number;
    /** People in the space, guests included. */
    members: number;
    blurb: string;
}

/**
 * The three tiers, defined here because this is the module that gates them.
 * Everything that says "where the plan allows" in the brief — the AI cap, the
 * image generator, the reel quota, the media allowance — reads these numbers.
 */
export const PLANS: Plan[] = [
    {
        id: "seed",
        name: "Seed",
        priceCents: 0,
        aiCalls: 60,
        images: 0,
        mediaGb: 1,
        reels: 1,
        members: 6,
        blurb: "The whole loop, free: briefing, check-in, Sunday planning. The companion writes from a template when the allowance is spent, and pictures are typographic.",
    },
    {
        id: "household",
        name: "Household",
        priceCents: 900,
        aiCalls: 600,
        images: 40,
        mediaGb: 25,
        reels: 8,
        members: 12,
        blurb: "For a family running on Wàfè: a companion that answers all month, generated pictures in the studio, room for the photos.",
    },
    {
        id: "legacy",
        name: "Legacy",
        priceCents: 1900,
        aiCalls: 2500,
        images: 200,
        mediaGb: 100,
        reels: 30,
        members: 25,
        blurb: "Grandparents, mentors and a decade of memories: the largest allowance, the archive, and every guest you want to bring in.",
    },
];

export const planOf = (id: PlanId): Plan => PLANS.find((p) => p.id === id) ?? PLANS[0];

export interface FamilySettings {
    /** ISO weekday the week starts on (1 = Monday, 7 = Sunday). */
    weekStart: number;
    /** Local hour the morning briefing is written for. */
    briefingHour: number;
    /** Local hour the evening check-in card appears. */
    checkinHour: number;
    /** ISO weekdays a missed habit or chore costs nothing — "rituals over streaks". */
    graceDays: number[];
    /** A child's purchase request above this needs a parent's approval. */
    purchaseApprovalCents: number;
    plan: PlanId;
    /** Quiet hours: nudges wait, they are never dropped. */
    quietFrom: string;
    quietTo: string;
    /** More than this many nudges in a day become one digest. */
    digestAbove: number;
    notifyPush: boolean;
    notifyEmail: boolean;
}

export interface AiUsage {
    /** "2026-09" — the month the counters belong to. */
    month: string;
    calls: number;
    images: number;
    mediaMb: number;
    reels: number;
}

// ---------------------------------------------------------------------------
// Audit, exports, handovers
// ---------------------------------------------------------------------------

export type AuditAction = "member" | "role" | "band" | "permission" | "share" | "invite" | "values" | "mission" | "settings" | "childmode" | "export" | "space";

export const AUDIT_LABEL: Record<AuditAction, string> = {
    member: "Member",
    role: "Role",
    band: "Age band",
    permission: "Permission",
    share: "Share",
    invite: "Invitation",
    values: "Values",
    mission: "Mission",
    settings: "Settings",
    childmode: "Child mode",
    export: "Export",
    space: "Family",
};

export interface AuditEntry {
    id: string;
    at: string;
    actorId: string;
    action: AuditAction;
    targetType: string;
    targetId: string;
    /** One readable line: "Gave Dami the family budget (view)". */
    summary: string;
    before: string | null;
    after: string | null;
}

export interface ExportJob {
    id: string;
    requestedBy: string;
    requestedAt: string;
    status: "queued" | "ready" | "failed";
    readyAt: string | null;
    /** Size of the archive once it exists. */
    bytes: number | null;
    note: string;
}

/**
 * What happened to a removed member's work. Their access ends immediately;
 * their authored history stays (the brief: "preserves authored history"); and
 * their open tasks are reassigned before the record is written — to the owner
 * when nobody else was on them, otherwise to the people who were.
 */
export interface Handover {
    id: string;
    memberId: string;
    memberName: string;
    toMemberId: string;
    /** Tasks that actually passed to `toMemberId`. Never a prediction. */
    openTasks: number;
    at: string;
}

// ---------------------------------------------------------------------------
// Age bands: the default grants a band carries
// ---------------------------------------------------------------------------

/**
 * The minimum a child of this band gets on the day they are added, and what a
 * band change re-applies. Explicit overrides (below) always win, in both
 * directions, so a parent's decision is never undone by a birthday.
 */
export const BAND_DEFAULTS: Record<AgeBand, Capability[]> = {
    little: [],
    junior: [],
    teen: ["moodboards.manage", "studio.full"],
    "young-adult": ["finance.view", "calendar.manage", "projects.view", "moodboards.manage"],
    adult: [],
};

/** The band a birthday implies — offered to a parent, never applied silently. */
export const BAND_FOR_AGE = (age: number): AgeBand => (age <= 6 ? "little" : age <= 10 ? "junior" : age <= 14 ? "teen" : age <= 17 ? "young-adult" : "adult");

/** The age at which a child leaves this band (the boundary the prompt watches). */
export const BAND_UNTIL: Partial<Record<AgeBand, number>> = { little: 6, junior: 10, teen: 14, "young-adult": 17 };

// ---------------------------------------------------------------------------
// State + repo
// ---------------------------------------------------------------------------

export interface FamilyState {
    values: FamilyValue[];
    valueLinks: ValueLink[];
    /** Newest first. */
    missions: MissionVersion[];
    shares: ObjectShare[];
    /** Newest first; parents only. */
    audit: AuditEntry[];
    settings: FamilySettings;
    guestTags: Record<string, GuestTag>;
    childMode: Record<string, boolean>;
    /** memberId → capability → forced on (true) or forced off (false). */
    overrides: Record<string, Partial<Record<Capability, boolean>>>;
    /** Whether a parent PIN exists. The hash itself never leaves the repo. */
    pinSet: boolean;
    usage: AiUsage;
    exports: ExportJob[];
    handovers: Handover[];
}

export interface NewShare {
    memberId: string;
    objectType: ShareObjectType;
    objectId: string;
    label: string;
    href: string;
    level: ShareLevel;
    expiresAt: string | null;
}

export interface FamilyRepo extends ModuleRepo<FamilyState> {
    // values + mission
    addValue(name: string, meaning: string): Promise<void>;
    updateValue(id: string, patch: { name?: string; meaning?: string }): Promise<void>;
    setValueArchived(id: string, archived: boolean): Promise<void>;
    /** Throws when anything still references the value — archive it instead. */
    deleteValue(id: string, references: number): Promise<void>;
    moveValue(id: string, dir: -1 | 1): Promise<void>;
    saveMission(input: { mission: string; vision: string; legacy: string }): Promise<void>;

    // guests
    addShare(input: NewShare): Promise<void>;
    setShareLevel(id: string, level: ShareLevel): Promise<void>;
    revokeShare(id: string): Promise<void>;
    setGuestTag(memberId: string, tag: GuestTag): Promise<void>;
    /** An invitation was accepted: everything shared with the invite follows the new member. */
    retargetShares(fromId: string, toId: string): Promise<void>;

    // permissions
    /** `value` null clears the override and lets the band default decide again. */
    setOverride(memberId: string, cap: Capability, value: boolean | null): Promise<void>;
    /** Drop every override for a member (used when a member leaves). */
    clearMember(memberId: string): Promise<void>;

    // child mode + the parent PIN
    setChildMode(memberId: string, on: boolean): Promise<void>;
    /**
     * The child's own way out: prove the parent PIN and this device leaves
     * child mode. Returns false on a wrong PIN and changes nothing.
     */
    exitChildMode(pin: string): Promise<boolean>;
    setPin(pin: string): Promise<void>;
    checkPin(pin: string): Promise<boolean>;

    // settings, plan, meter
    saveSettings(patch: Partial<FamilySettings>): Promise<void>;
    noteAiCall(kind: "call" | "image" | "reel"): Promise<void>;

    // records
    audit(entry: { action: AuditAction; targetType: string; targetId: string; summary: string; before?: string | null; after?: string | null }): Promise<void>;
    recordHandover(input: { memberId: string; memberName: string; toMemberId: string; openTasks: number }): Promise<void>;
    recordExport(bytes: number): Promise<void>;

    /** Re-authentication before deleting the family: the parent PIN in the demo, the account password when live. */
    reauth(secret: string): Promise<boolean>;
    /** Removes every row and every media object for this space. */
    deleteSpace(): Promise<void>;
}

/** What a member may be in an invitation (a preset a newcomer cannot raise). */
export const INVITE_ROLES: Array<{ role: Role; label: string; note: string }> = [
    { role: "parent", label: "Parent", note: "A second head of the household: everything, including money and settings." },
    { role: "child", label: "Child", note: "Child mode, their own screens, and only what their band allows." },
    { role: "guest", label: "Guest", note: "Nothing at all until you share a named trip, board, album or wall." },
];
