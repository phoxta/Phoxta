import type { Capability, Member, Role } from "@/data/core";

/**
 * The permission matrix, straight from the brief's "Permissions & Access"
 * table and its principle: children never see information simply because they
 * belong to the family — access follows role, age and sensitivity.
 *
 * Parents hold everything. Children get what is theirs (assigned tasks,
 * lessons, their closet, their habits) and the child-facing views. Guests —
 * extended family — see what a house-guest would: the shared calendar, travel,
 * the prayer wall, a limited dashboard. Finances and private notes are parents
 * only, full stop. A parent can widen a single member's access with a grant
 * (e.g. let a teenager see the family budget); a grant can never narrow a
 * parent.
 */
const MATRIX: Record<Role, ReadonlySet<Capability>> = {
    parent: new Set<Capability>([
        "dashboard.full", "family.manage", "family.settings", "people.manage",
        "tasks.manage", "tasks.assigned", "tasks.view",
        "goals.manage", "goals.view",
        "projects.manage", "projects.view",
        "calendar.manage", "calendar.view",
        "learning.manage", "learning.assigned",
        "books.manage", "books.view",
        "bible.manage", "bible.assigned", "bible.prayerwall",
        "curricula.manage", "curricula.mine",
        "finance.manage", "finance.view",
        "travel.manage", "travel.view",
        "wardrobe.manage", "wardrobe.mine",
        "wellness.manage", "wellness.mine",
        "studio.full",
        "moodboards.manage", "moodboards.view",
        "memories.manage", "memories.view",
        "notes.private", "ai.ask", "notifications.view",
    ]),
    child: new Set<Capability>([
        "dashboard.child",
        "tasks.assigned",
        "goals.view",
        "calendar.view",
        "learning.assigned",
        "books.view",
        "bible.assigned",
        "curricula.mine",
        "travel.view",
        "wardrobe.mine",
        "wellness.mine",
        "studio.child",
        "moodboards.view",
        "memories.view",
        "ai.ask", "notifications.view",
    ]),
    guest: new Set<Capability>([
        "dashboard.guest",
        "tasks.view",
        "calendar.view",
        "bible.prayerwall",
        "travel.view",
        "studio.limited",
        "memories.view",
        "notifications.view",
    ]),
};

/** True when this member may do `c`: the role matrix plus any explicit grant. */
export function can(member: Pick<Member, "role" | "grants">, c: Capability): boolean {
    if (member.role === "parent") return MATRIX.parent.has(c);
    if (member.grants?.[c] === true) return true;
    return MATRIX[member.role].has(c);
}

/** The capabilities a role holds by default (for the permissions editor). */
export function defaultsFor(role: Role): Capability[] {
    return [...MATRIX[role]];
}

/** Capabilities a parent may grant to a non-parent, with the label the editor shows. */
export const GRANTABLE: Array<{ cap: Capability; label: string; note: string; roles: Role[] }> = [
    { cap: "finance.view", label: "See the family budget", note: "Read-only view of budgets and spending. Never the ledger detail.", roles: ["child", "guest"] },
    { cap: "tasks.manage", label: "Create and assign tasks", note: "Useful for a teenager who runs their own chores.", roles: ["child", "guest"] },
    { cap: "calendar.manage", label: "Add calendar events", note: "Let a grandparent add the things they host.", roles: ["child", "guest"] },
    { cap: "goals.view", label: "See family goals", note: "Guests do not see goals by default.", roles: ["guest"] },
    { cap: "learning.assigned", label: "Join learning", note: "Assign lessons to a guest, e.g. a visiting cousin.", roles: ["guest"] },
    { cap: "bible.assigned", label: "Join Bible studies", note: "Reading plans and memory verses.", roles: ["guest"] },
    { cap: "moodboards.manage", label: "Pin to moodboards", note: "Children can add pins to shared boards.", roles: ["child", "guest"] },
    { cap: "memories.manage", label: "Add memories", note: "Upload photos and captions.", roles: ["child", "guest"] },
    { cap: "studio.full", label: "Full creative studio", note: "Every generator, not just the child set.", roles: ["child"] },
    { cap: "travel.manage", label: "Edit trips", note: "Itineraries and packing lists.", roles: ["guest"] },
    { cap: "projects.view", label: "See projects", note: "Household projects and research.", roles: ["child", "guest"] },
    { cap: "wellness.manage", label: "See everyone's wellness", note: "Parents only by default.", roles: ["guest"] },
];

/** Which dashboard this member lands on. */
export function dashboardFor(member: Pick<Member, "role" | "grants">): "parent" | "child" | "guest" {
    if (member.role === "parent") return "parent";
    return member.role === "child" ? "child" : "guest";
}
