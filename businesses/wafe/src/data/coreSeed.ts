import type { AgeBand, Member, Role, Space } from "@/data/core";
import type { SeedContext } from "@/data/core";
import type { CoreState } from "@/data/coreRepo";

/**
 * The Adeyemi family — the demo space, exactly as the design brief defines it.
 *
 * British-Nigerian, Croydon, together since 2009 and not married, three children,
 * church at the centre, relatives
 * across London, Manchester and Ibadan. Ifeoluwa owns the space and keeps the
 * finances and the vision; Oluwafemi leads Bible study and is organising Christmas
 * in Lagos; Dami is fifteen and sitting GCSEs; Tobi is nine and home-educated;
 * Ayo is five and in Reception. Mama Fọláké watches from Ibadan and Pastor Dayo
 * mentors the family — both guests, both scoped to almost nothing.
 *
 * Every module's seed hangs off these seven people, and the four child age
 * bands in the brief (Little · Junior · Teen · Young adult) are all reachable:
 * three are seeded, and a parent can move a child between bands in Family, so
 * the Teen layout is exercisable in the demo like the rest.
 *
 * "Today" is Sunday 6 September 2026 — the family's planning day — and every
 * date in every seed is relative to it, so the demo never goes stale.
 */

export const DEMO_TODAY = "2026-09-06";
export const DEMO_SPACE_ID = "space-adewale";

export const DEMO_SPACE: Space = {
    id: DEMO_SPACE_ID,
    name: "The Adeyemi family",
    tagline: "Croydon, South London · together since 2009",
    values: ["Faith", "Love", "Diligence", "Generosity", "Joy"],
    mission:
        "To raise a family that loves God, loves people and builds things that last. We plan on Sundays, we eat together, we tell the truth kindly, our door is open, and we keep our love alive on purpose.",
    coverUrl: "/images/family-hero.jpg",
    currency: "GBP",
    planningDay: 7,
    timezone: "Europe/London",
    createdAt: "2026-01-11T10:00:00.000Z",
};

const m = (id: string, name: string, relation: string, role: Role, ageBand: AgeBand, hue: Member["hue"], avatar: string, extra: Partial<Member> = {}): Member => ({
    id,
    spaceId: DEMO_SPACE_ID,
    userId: null,
    name,
    relation,
    role,
    ageBand,
    avatarUrl: `/images/${avatar}.jpg`,
    hue,
    points: 0,
    grants: {},
    joinedAt: "2026-01-11T10:00:00.000Z",
    ...extra,
});

/**
 * Order matters: parents first (the "view as" switcher and every
 * `parents[0]` in a module seed reads this order), then children oldest to
 * youngest, then guests.
 */
export const DEMO_MEMBERS: Member[] = [
    m("mem-ife", "Ifeoluwa Adeyemi", "Mum", "parent", "adult", "rose", "member-ife", {
        userId: "demo-ife",
        email: "ifeoluwa@adeyemi.example",
        birthday: "1985-04-17",
    }),
    m("mem-tunde", "Oluwafemi Adeyemi", "Dad", "parent", "adult", "sky", "member-tunde", {
        userId: "demo-tunde",
        email: "oluwafemi@adeyemi.example",
        birthday: "1982-01-29",
    }),
    // Young adult: own credentials, own calendar, a granted personal budget envelope.
    m("mem-dami", "Dami Adeyemi", "Daughter", "child", "young-adult", "plum", "member-dami", {
        userId: "demo-dami",
        email: "dami@adewale.example",
        birthday: "2011-02-08",
        points: 620,
        grants: { "finance.view": true, "calendar.manage": true, "projects.view": true },
    }),
    m("mem-tobi", "Tobi Adeyemi", "Son", "child", "junior", "mint", "member-tobi", { birthday: "2017-05-21", points: 340 }),
    m("mem-ayo", "Ayo Adeyemi", "Daughter", "child", "little", "peach", "member-ayo", { birthday: "2021-08-30", points: 155 }),
    m("mem-folake", "Mama Fọláké", "Grandma", "guest", "adult", "lilac", "member-folake", {
        userId: "demo-folake",
        email: "folake@adewale.example",
        birthday: "1958-06-09",
        grants: { "calendar.manage": true },
    }),
    m("mem-dayo", "Pastor Dayo", "Mentor", "guest", "adult", "sage" as Member["hue"], "member-dayo", {
        email: "dayo@gracechapel.example",
        birthday: "1974-10-03",
    }),
];

/** Build the SeedContext every module's seed() receives. */
export function seedContext(space: Space = DEMO_SPACE, members: Member[] = DEMO_MEMBERS, today = DEMO_TODAY): SeedContext {
    const counters: Record<string, number> = {};
    const base = new Date(`${today}T00:00:00`);
    const at = (days: number, hhmm = "09:00"): string => {
        const d = new Date(base);
        d.setDate(d.getDate() + days);
        const [h, mi] = hhmm.split(":").map(Number);
        d.setHours(h, mi, 0, 0);
        return d.toISOString();
    };
    const day = (days: number): string => at(days, "00:00").slice(0, 10);
    return {
        space,
        members,
        parents: members.filter((x) => x.role === "parent"),
        kids: members.filter((x) => x.role === "child"),
        guests: members.filter((x) => x.role === "guest"),
        today,
        at,
        day,
        uid: (prefix: string) => `${prefix}-${(counters[prefix] = (counters[prefix] ?? 0) + 1)}`,
        img: (name: string) => `/images/${name}.jpg`,
    };
}

export function demoCoreState(): CoreState {
    const ctx = seedContext();
    return {
        space: DEMO_SPACE,
        members: DEMO_MEMBERS,
        invites: [
            { id: "inv-1", spaceId: DEMO_SPACE_ID, email: "chidi.okonkwo@example.com", name: "The Okonkwos", role: "guest", relation: "Friends", code: "WAFE-OKON-2026", status: "pending", invitedBy: "mem-ife", createdAt: ctx.at(-3, "20:10") },
        ],
        notifications: [
            { id: "ntf-1", spaceId: DEMO_SPACE_ID, memberId: "mem-ife", kind: "briefing", title: "Your Sunday briefing is ready", body: "Three things need a decision this week, and Tobi's science fair is Thursday.", href: "/", readAt: null, createdAt: ctx.at(0, "07:00") },
            { id: "ntf-2", spaceId: DEMO_SPACE_ID, memberId: "mem-ife", kind: "task", title: "Overdue: Renew the car insurance", body: "Was due Friday. Ten minutes online.", href: "/execute/tasks", readAt: null, createdAt: ctx.at(-1, "09:00") },
            { id: "ntf-3", spaceId: DEMO_SPACE_ID, memberId: "mem-ife", kind: "finance", title: "Groceries at 92% of budget", body: "£46 left for the rest of the month.", href: "/live/finance", readAt: null, createdAt: ctx.at(-1, "18:00") },
            { id: "ntf-4", spaceId: DEMO_SPACE_ID, memberId: "mem-tunde", kind: "celebrate", title: "Ayo finished her first reading plan", body: "Twelve books, and she read the last one to Mama Fọláké on the phone.", href: "/grow/books", readAt: ctx.at(-2, "19:30"), createdAt: ctx.at(-2, "19:00") },
            { id: "ntf-5", spaceId: DEMO_SPACE_ID, memberId: "mem-tunde", kind: "travel", title: "Christmas in Lagos: 6 things left", body: "Passports for Tobi and Ayo expire in February.", href: "/live/travel", readAt: null, createdAt: ctx.at(-2, "08:15") },
            { id: "ntf-6", spaceId: DEMO_SPACE_ID, memberId: "mem-dami", kind: "learning", title: "Revision block at 16:00", body: "Chemistry paper 2 — 40 minutes, then a break.", href: "/grow/learning", readAt: null, createdAt: ctx.at(0, "08:00") },
            { id: "ntf-7", spaceId: DEMO_SPACE_ID, memberId: "mem-tobi", kind: "learning", title: "New lesson for you", body: "\"How volcanoes work\" — 12 minutes, then 3 questions.", href: "/grow/learning", readAt: null, createdAt: ctx.at(0, "08:00") },
            { id: "ntf-8", spaceId: DEMO_SPACE_ID, memberId: "mem-ayo", kind: "celebrate", title: "You earned the Reader badge!", body: "Twelve books. Wow.", href: "/grow/curricula", readAt: null, createdAt: ctx.at(-2, "19:00") },
            { id: "ntf-9", spaceId: DEMO_SPACE_ID, memberId: "mem-folake", kind: "prayer", title: "Answered: Oluwafemi's contract", body: "Ifeoluwa marked it answered on the prayer wall.", href: "/grow/bible", readAt: null, createdAt: ctx.at(-4, "21:00") },
            { id: "ntf-10", spaceId: DEMO_SPACE_ID, memberId: "mem-dayo", kind: "family", title: "Mentor session on Thursday", body: "Oluwafemi asked to talk through the Lagos trip and the men's group.", href: "/family/people", readAt: null, createdAt: ctx.at(-1, "12:00") },
        ],
    };
}
