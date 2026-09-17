import type { AgendaItem, AttentionItem, ChildCard, Member, ProgressRing } from "@/data/core";
import { pct } from "@/lib/format";
import { attentionKey, checkInFor } from "./derive";
import type { HomeState } from "./types";

/**
 * What Home CHOOSES to render out of everything it is handed.
 *
 * Nineteen modules contribute to the dashboard, and on an ordinary Wednesday
 * that is sixty-three legitimately-due things, fifty-seven attention rows and
 * a hundred and thirty-two rings. A real family in March will have as many —
 * they cannot be asked to delete their lives — so the fix is here, in
 * selection, not in anybody's seed.
 *
 * Three rules run through everything below.
 *
 *  1. THE CAP IS ON VARIETY, NEVER ON SEVERITY. One-per-member, one-per-module
 *     and at-most-one-overdue exist so a screen is not three of Tobi's chores.
 *     Anything genuinely rotten — `tone: "danger"`, or more than a week late —
 *     steps over all of them.
 *  2. EVERY CAP PRINTS ITS OWN TOTAL. Each `Picked` carries `total`, and the
 *     section that renders it must say "3 of 57" and link to the full list.
 *     Selection that cannot be audited from the screen is deletion.
 *  3. HOME SORTS ON ITS OWN SCORE. `AgendaItem.sort` is an INTRA-module scale —
 *     tasks emits `late ? -10 - late : allDay ? 700±40 : minuteOfDay`, wellness
 *     emits 1730, memories 2200 — so sorting on it across nineteen modules puts
 *     a wardrobe outfit above an overdue bill.
 */

// ---------------------------------------------------------------------------
// Tiers — what counts as "the family's day"
// ---------------------------------------------------------------------------

export type Tier = "commitment" | "work" | "routine";

/**
 * Home's own reading of every contributing module.
 *
 * A commitment has somebody else on the other end of it. Work is what the
 * family chose to do. A routine is somebody's rhythm — it still counts in
 * that person's ring, still appears on /today and still sits on their own
 * Home; it is simply not what the family's day is SHAPED by.
 */
export const AGENDA_TIER: Record<string, Tier> = {
    calendar: "commitment",
    people: "commitment",
    tasks: "work",
    finance: "work",
    travel: "work",
    projects: "work",
    goals: "work",
    learning: "work",
    bible: "routine",
    books: "routine",
    curricula: "routine",
    wellness: "routine",
    wardrobe: "routine",
    memories: "routine",
    family: "routine",
};

/** An unknown module is somebody's work until it tells us otherwise. */
export const tierOf = (moduleId: string): Tier => AGENDA_TIER[moduleId] ?? "work";

export const isRoutine = (a: AgendaItem): boolean => tierOf(a.moduleId) === "routine";

// ---------------------------------------------------------------------------
// Lateness — the one signal the contract does not carry
// ---------------------------------------------------------------------------

const LATE_META = /(\d+)\s*d(?:ays?)?\s*(?:late|overdue)/i;
const ONE_DAY = 86_400_000;

/**
 * How many whole days late this is, as far as Home can tell.
 *
 * `AgendaItem` has no `overdue` field, so this reads the three signals the
 * contract does leave behind, in order of reliability: tasks' negative sort
 * key (`-10 - late`, the only exact lateness available today), the "3d late"
 * clause modules write into `meta`, and finally a timestamp that is already
 * on an earlier day than today.
 */
export function lateDays(a: AgendaItem, today: string): number {
    if (a.moduleId === "tasks" && a.sort <= -11) return -a.sort - 10;
    const m = LATE_META.exec(a.meta);
    if (m) return Number(m[1]);
    if (a.at) {
        const day = a.at.slice(0, 10);
        if (day < today) return Math.max(1, Math.round((new Date(`${today}T12:00:00`).getTime() - new Date(`${day}T12:00:00`).getTime()) / ONE_DAY));
    }
    return 0;
}

/** Past this, an item is an emergency and no diversity cap may hide it. */
export const HARD_LATE_DAYS = 7;

// ---------------------------------------------------------------------------
// The shape every capped section returns
// ---------------------------------------------------------------------------

export interface Picked<T> {
    /** What the section renders. */
    shown: T[];
    /** How many there really are — the section must print this. */
    total: number;
}

const byWeight = (a: AttentionItem, b: AttentionItem): number => b.weight - a.weight;

// ---------------------------------------------------------------------------
// Three things
// ---------------------------------------------------------------------------

export interface ThingsOptions {
    meId: string;
    isParent: boolean;
    /** This week's three priorities, in the family's own words. */
    priorities: string[];
    now: Date;
    today: string;
    max?: number;
    /** When set, the day is re-selected for this member alone (the face lens). */
    onlyMemberId?: string | null;
}

/** The words from a priority worth matching an item's title against. */
const tokens = (priorities: string[]): string[] => {
    const out: string[] = [];
    for (const p of priorities) for (const w of p.toLowerCase().split(/[^a-z0-9]+/)) if (w.length >= 5) out.push(w);
    return out;
};

interface Scored {
    item: AgendaItem;
    score: number;
    late: number;
    /** An emergency: exempt from every diversity cap. */
    severe: boolean;
    /** A hard external edge — very late, or happening within the hour. */
    pinned: boolean;
}

/**
 * The three things that actually shape today.
 *
 * Routines are dropped (they belong to a person, not to the family's day),
 * everything else is scored against the fields the module contract
 * guarantees, and then two diversity caps run: at most one item per member,
 * so it is never three of one child's chores, and at most one overdue, because
 * a day whose three things are all overdue is a day nobody starts. Both caps
 * are waived for anything more than a week late.
 */
export function threeThings(agenda: AgendaItem[], o: ThingsOptions): Picked<AgendaItem> {
    const max = o.max ?? 3;
    const scope = o.onlyMemberId ? agenda.filter((a) => a.memberId === o.onlyMemberId) : agenda;
    const open = scope.filter((a) => !a.done);
    const eligible = open.filter((a) => !isRoutine(a));
    // A day made entirely of rhythms is still that person's day.
    const pool = eligible.length ? eligible : open;
    const words = tokens(o.priorities);
    const nowMs = o.now.getTime();

    const scored: Scored[] = pool.map((item) => {
        const late = lateDays(item, o.today);
        const hours = item.at ? (new Date(item.at).getTime() - nowMs) / 3_600_000 : null;
        const text = `${item.title} ${item.meta}`.toLowerCase();
        let score = 0;
        if (late > 0) score += 100 + Math.min(late, 30);
        if (hours !== null && hours >= -0.5 && hours <= 4) score += 60;
        if (words.some((w) => text.includes(w))) score += 50;
        if (item.memberId === o.meId) score += 40;
        else if (item.memberId === null && o.isParent) score += 30;
        if (/\bdaily\b|every day/i.test(item.meta)) score -= 30;
        return {
            item,
            score,
            late,
            severe: late > HARD_LATE_DAYS,
            pinned: late >= 3 || (hours !== null && hours >= -0.5 && hours <= 2),
        };
    });

    scored.sort((x, y) => y.score - x.score || cmpAt(x.item, y.item) || x.item.sort - y.item.sort);

    const shown: AgendaItem[] = [];
    const taken = new Set<string>();
    const members = new Set<string>();
    let overdue = 0;
    const take = (s: Scored): void => {
        shown.push(s.item);
        taken.add(key(s.item));
        if (s.item.memberId) members.add(s.item.memberId);
        if (s.late > 0) overdue += 1;
    };

    // 1. Emergencies. No cap applies.
    for (const s of scored) {
        if (shown.length >= max) break;
        if (s.severe && !taken.has(key(s.item))) take(s);
    }
    // 2. One hard external edge, into the next slot, without scoring against it.
    for (const s of scored) {
        if (shown.length >= max) break;
        if (s.pinned && !taken.has(key(s.item))) {
            take(s);
            break;
        }
    }
    // 3. Everything else, diversified.
    for (const s of scored) {
        if (shown.length >= max) break;
        if (taken.has(key(s.item))) continue;
        if (s.item.memberId && members.has(s.item.memberId)) continue;
        if (s.late > 0 && overdue >= 1) continue;
        take(s);
    }

    return { shown, total: open.length };
}

const key = (a: AgendaItem): string => `${a.moduleId}:${a.id}`;
const cmpAt = (x: AgendaItem, y: AgendaItem): number => (x.at && y.at ? x.at.localeCompare(y.at) : x.at ? -1 : y.at ? 1 : 0);

// ---------------------------------------------------------------------------
// Needs you
// ---------------------------------------------------------------------------

export interface PickedAttention extends Picked<AttentionItem> {
    /** The birthday, the answered prayer — a celebration is not a problem. */
    celebration: AttentionItem | null;
}

/**
 * The three decisions actually waiting on a parent.
 *
 * Fifty-seven is fifty-seven because Tasks raises six rows, Family nine and
 * Calendar five — and each of those modules ALREADY writes its own summary
 * row ("5 things are overdue"). So capping one per module loses instances,
 * never facts. Below weight 40 is an FYI, and at most one FYI is allowed
 * through: this panel is for decisions.
 */
export function pickAttention(items: AttentionItem[], resolvedKeys: string[], max = 3): PickedAttention {
    const resolved = new Set(resolvedKeys);
    const live = items.filter((a) => !resolved.has(attentionKey(a)));
    const celebration = live.filter((a) => a.tone === "celebrate").sort(byWeight)[0] ?? null;
    const pool = live.filter((a) => a.tone !== "celebrate");

    const danger = pool.filter((a) => a.tone === "danger").sort(byWeight);
    const best = new Map<string, AttentionItem>();
    for (const a of pool.filter((a) => a.tone !== "danger" && a.weight >= 40).sort(byWeight)) {
        if (!best.has(a.moduleId)) best.set(a.moduleId, a);
    }

    const shown: AttentionItem[] = [];
    let info = 0;
    for (const a of [...danger, ...[...best.values()].sort(byWeight)]) {
        if (shown.length >= max) break;
        if (a.tone === "info") {
            if (info >= 1) continue;
            info += 1;
        }
        shown.push(a);
    }
    return { shown, total: pool.length, celebration };
}

/** The verb a row deserves, from what it is about. */
export function attentionVerb(a: AttentionItem): string {
    const t = `${a.title} ${a.body}`.toLowerCase();
    if (/approve|approval|permission|request|wish/.test(t)) return "Approve";
    if (/pay|bill|invoice|owed|unpaid|budget|over/.test(t)) return "Pay";
    if (/overdue|late|slipped|reschedul|missed/.test(t)) return "Reschedule";
    if (/invit|rsvp|reply|answer/.test(t)) return "Reply";
    if (/renew|expir|passport|document/.test(t)) return "Renew";
    return "Open";
}

/** Rows that name a particular member — what the face lens narrows to. */
export const attentionAbout = (items: AttentionItem[], firstName: string): AttentionItem[] => {
    const needle = firstName.toLowerCase();
    return items.filter((a) => `${a.title} ${a.body}`.toLowerCase().includes(needle));
};

// ---------------------------------------------------------------------------
// What we're building
// ---------------------------------------------------------------------------

export interface PickedRings extends Picked<ProgressRing> {
    /** "Our Future — 68%", computed over the survivors, never over 132. */
    average: number;
}

/**
 * Three rings, not a hundred and thirty-two.
 *
 * Anything finished belongs in Memories, not in a progress row. Projects
 * alone pushes six rings and Tasks four, so one per module — keeping the
 * LOWEST, because the one at risk is the one worth a parent's eye — and the
 * family's own goals lead, because a family's goals are Goals and not
 * "Family set-up".
 */
export function pickRings(rings: ProgressRing[], max = 3): PickedRings {
    const live = rings.filter((r) => r.pct < 100);
    const best = new Map<string, ProgressRing>();
    for (const r of live) {
        const cur = best.get(r.moduleId);
        if (!cur || r.pct < cur.pct) best.set(r.moduleId, r);
    }
    const ordered = [...best.values()].sort((a, b) => rank(a) - rank(b) || a.pct - b.pct);
    const shown = ordered.slice(0, max);
    const average = shown.length ? Math.round(shown.reduce((s, r) => s + r.pct, 0) / shown.length) : 0;
    return { shown, total: live.length, average };
}

const rank = (r: ProgressRing): number => (r.moduleId === "goals" ? 0 : r.moduleId === "projects" ? 1 : 2);

// ---------------------------------------------------------------------------
// The family's faces
// ---------------------------------------------------------------------------

export interface Face {
    memberId: string;
    /** First name only. */
    name: string;
    done: number;
    total: number;
    pct: number;
    checkedIn: boolean;
}

/**
 * The photograph of the family: their real faces, and how their own day is
 * going. The ring counts a member's WHOLE agenda including their routines —
 * Tobi's five chores do count for Tobi — because this is his day, not the
 * family's shape.
 */
export function faces(state: HomeState, members: Member[], agenda: AgendaItem[], today: string, max = 6): Picked<Face> {
    const people = members.filter((m) => m.role !== "guest");
    const all = people.map((m) => {
        const mine = agenda.filter((a) => a.memberId === m.id);
        const done = mine.filter((a) => a.done).length;
        return {
            memberId: m.id,
            name: m.name.split(" ")[0],
            done,
            total: mine.length,
            pct: pct(done, mine.length),
            checkedIn: Boolean(checkInFor(state, m.id, today)),
        };
    });
    return { shown: all.slice(0, max), total: all.length };
}

// ---------------------------------------------------------------------------
// A child's tiles
// ---------------------------------------------------------------------------

/**
 * Not-done first, then one per module so a child never gets four chore
 * tiles, then the module's own order.
 *
 * `ChildCard` carries `done` but no completion action, so a tile can only be
 * ticked in place where the owning module supplies one. Today none does, so
 * every tile is a deep link and this ordering is the whole of the promise.
 */
export function pickTiles(cards: ChildCard[], max: number): Picked<ChildCard> {
    const open = cards.filter((c) => !c.done);
    const done = cards.filter((c) => c.done);
    const shown: ChildCard[] = [];
    const seen = new Set<string>();
    for (const pass of [open, done]) {
        for (const c of pass) {
            if (shown.length >= max) break;
            if (seen.has(c.moduleId)) continue;
            seen.add(c.moduleId);
            shown.push(c);
        }
    }
    for (const pass of [open, done]) {
        for (const c of pass) {
            if (shown.length >= max) break;
            if (shown.includes(c)) continue;
            shown.push(c);
        }
    }
    return { shown, total: cards.length };
}
