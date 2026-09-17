import type { AgendaItem, AttentionItem, ChildCard, DashboardContribution, Member, Nudge, ProgressRing, RepoContext } from "@/data/core";
import { isoDate, pct as pctOf, weekStart } from "@/lib/format";
import { CATEGORY, COLOUR, EMPTY_STATE, OCCASION, SEASON } from "./types";
import type { Capsule, Colour, DonateJob, ItemCategory, ItemStatus, Occasion, Outfit, ReplacementWish, ScheduleEntry, Season, TravelSlice, WardrobeItem, WardrobeState } from "./types";

/**
 * Every number the wardrobe screens show, and — first — the one function both
 * repos use to decide what a member may receive.
 *
 * The filter is the module's whole permission story: a child's `load()`
 * genuinely contains only their own closet, their own outfits and their own
 * week, so there is no screen anywhere that could accidentally render their
 * sister's clothes or their parents' donate pipeline. A guest receives
 * nothing at all — the module is not theirs, and an empty state is the honest
 * answer rather than a locked door.
 */

export const BASE = "/live/wardrobe";

// ---------------------------------------------------------------------------
// Visibility
// ---------------------------------------------------------------------------

/** Core visibility semantics, applied to a garment. */
export function canSeeItem(it: WardrobeItem, me: Member): boolean {
    if (it.ownerMemberId === me.id) return true;
    if (me.role === "child") return false;
    switch (it.visibility) {
        case "private":
            return false;
        case "shared":
            return it.sharedWith.includes(me.id);
        default:
            return true;
    }
}

/**
 * The slice this member may receive.
 *
 * Parents get the household minus another adult's private rows. A child gets
 * their own closet, their own outfits, their own week and the replacements
 * being bought for them — never a sibling's wardrobe, never the donate bag,
 * never the giving ledger. A guest gets nothing.
 */
export function visibleTo(state: WardrobeState, ctx: RepoContext): WardrobeState {
    const me = ctx.me;
    if (me.role === "guest") return EMPTY_STATE;

    if (me.role === "child") {
        const items = state.items.filter((i) => i.ownerMemberId === me.id);
        const ids = new Set(items.map((i) => i.id));
        return {
            items,
            outfits: state.outfits.filter((o) => o.memberId === me.id),
            schedule: state.schedule.filter((s) => s.memberId === me.id),
            capsules: state.capsules.filter((c) => c.memberId === me.id),
            handdowns: state.handdowns.filter((h) => h.toMemberId === me.id || h.fromMemberId === me.id || ids.has(h.itemId)),
            wishes: state.wishes.filter((w) => w.forMemberId === me.id),
            donations: [],
            giving: [],
        };
    }

    const items = state.items.filter((i) => canSeeItem(i, me));
    return { ...state, items };
}

// ---------------------------------------------------------------------------
// Small readers
// ---------------------------------------------------------------------------

/** In the wardrobe and wearable — a handed-down coat is very much in use. */
export const inUse = (it: WardrobeItem): boolean => it.status === "in-use" || it.status === "handed-down";

export const isLeaving = (it: WardrobeItem): boolean => it.status === "outgrown" || it.status === "donate";

export const itemById = (state: WardrobeState, id: string): WardrobeItem | undefined => state.items.find((i) => i.id === id);

export const outfitById = (state: WardrobeState, id: string): Outfit | undefined => state.outfits.find((o) => o.id === id);

/** The garments in an outfit, in the order they were chosen, skipping any deleted. */
export function outfitItems(state: WardrobeState, outfit: Outfit | undefined): WardrobeItem[] {
    if (!outfit) return [];
    return outfit.itemIds.map((id) => itemById(state, id)).filter((x): x is WardrobeItem => Boolean(x));
}

export function capsuleItems(state: WardrobeState, capsule: Capsule | undefined): WardrobeItem[] {
    if (!capsule) return [];
    return capsule.itemIds.map((id) => itemById(state, id)).filter((x): x is WardrobeItem => Boolean(x));
}

export const itemsOf = (state: WardrobeState, memberId: string): WardrobeItem[] => state.items.filter((i) => i.ownerMemberId === memberId);

/** The members who actually own something — the owner filter's options. */
export function ownersOf(state: WardrobeState, members: Member[]): Member[] {
    const owned = new Set(state.items.map((i) => i.ownerMemberId));
    return members.filter((m) => owned.has(m.id));
}

export interface ItemFilter {
    owner?: string;
    category?: ItemCategory | "";
    colour?: Colour | "";
    season?: Season | "";
    occasion?: Occasion | "";
    status?: ItemStatus | "all" | "wearable";
    laundry?: boolean;
    favourite?: boolean;
    q?: string;
}

/** One filter function for the grid, the builder and the capsule picker. */
export function filterItems(items: WardrobeItem[], f: ItemFilter): WardrobeItem[] {
    const q = (f.q ?? "").trim().toLowerCase();
    return items
        .filter((i) => (f.owner ? i.ownerMemberId === f.owner : true))
        .filter((i) => (f.category ? i.category === f.category : true))
        .filter((i) => (f.colour ? i.colour === f.colour : true))
        .filter((i) => (f.season ? i.season === f.season || i.season === "all" : true))
        .filter((i) => (f.occasion ? i.occasions.includes(f.occasion) : true))
        .filter((i) => (f.status === "wearable" ? inUse(i) : f.status && f.status !== "all" ? i.status === f.status : true))
        .filter((i) => (f.laundry ? i.inLaundry : true))
        .filter((i) => (f.favourite ? i.favourite : true))
        .filter((i) => (q ? `${i.name} ${i.brand} ${i.size} ${COLOUR[i.colour].label} ${CATEGORY[i.category].label}`.toLowerCase().includes(q) : true))
        .sort((a, b) => Number(b.favourite) - Number(a.favourite) || a.category.localeCompare(b.category) || a.name.localeCompare(b.name));
}

/** "Navy · UK 12 · Winter" — the one line under a garment's name. */
export const itemLine = (i: WardrobeItem): string => [COLOUR[i.colour].label, i.size, i.season === "all" ? "All year" : SEASON[i.season].label].filter(Boolean).join(" · ");

export const outfitLine = (state: WardrobeState, o: Outfit): string => {
    const n = outfitItems(state, o).length;
    return `${OCCASION[o.occasion].label} · ${n} piece${n === 1 ? "" : "s"}`;
};

// ---------------------------------------------------------------------------
// Closet numbers
// ---------------------------------------------------------------------------

export interface ClosetStats {
    total: number;
    wearable: number;
    outgrown: number;
    toDonate: number;
    inLaundry: number;
    favourites: number;
    /** Sorted, biggest first. */
    byCategory: Array<{ category: ItemCategory; n: number }>;
    byColour: Array<{ colour: Colour; n: number }>;
    /** Never worn, or not worn in 120 days — the "why do we own this" list. */
    unworn: WardrobeItem[];
}

export function closetStats(items: WardrobeItem[], today: string): ClosetStats {
    const cats = new Map<ItemCategory, number>();
    const cols = new Map<Colour, number>();
    for (const i of items) {
        cats.set(i.category, (cats.get(i.category) ?? 0) + 1);
        cols.set(i.colour, (cols.get(i.colour) ?? 0) + 1);
    }
    const cut = new Date(`${today}T00:00:00`).getTime() - 120 * 86400000;
    return {
        total: items.length,
        wearable: items.filter(inUse).length,
        outgrown: items.filter((i) => i.status === "outgrown").length,
        toDonate: items.filter((i) => i.status === "donate").length,
        inLaundry: items.filter((i) => i.inLaundry).length,
        favourites: items.filter((i) => i.favourite).length,
        byCategory: [...cats.entries()].map(([category, n]) => ({ category, n })).sort((a, b) => b.n - a.n),
        byColour: [...cols.entries()].map(([colour, n]) => ({ colour, n })).sort((a, b) => b.n - a.n),
        unworn: items.filter((i) => inUse(i) && (!i.lastWorn || new Date(`${i.lastWorn}T00:00:00`).getTime() < cut)).sort((a, b) => (a.lastWorn ?? "").localeCompare(b.lastWorn ?? "")),
    };
}

// ---------------------------------------------------------------------------
// The week
// ---------------------------------------------------------------------------

/** The seven ISO dates of the Monday-anchored week containing `anchor`. */
export function weekDates(anchor: string): string[] {
    const start = weekStart(`${anchor}T00:00:00`);
    const base = new Date(`${start}T00:00:00`);
    return Array.from({ length: 7 }, (_, i) => {
        const d = new Date(base);
        d.setDate(d.getDate() + i);
        return isoDate(d);
    });
}

export const shiftWeek = (anchor: string, weeks: number): string => {
    const d = new Date(`${weekStart(`${anchor}T00:00:00`)}T00:00:00`);
    d.setDate(d.getDate() + weeks * 7);
    return isoDate(d);
};

export const entryFor = (state: WardrobeState, memberId: string, date: string): ScheduleEntry | undefined => state.schedule.find((s) => s.memberId === memberId && s.date === date);

/** What this member is wearing today — the line the dashboard reads (AC 1). */
export function wearingToday(state: WardrobeState, memberId: string, today: string): { entry: ScheduleEntry; outfit: Outfit | undefined; items: WardrobeItem[] } | null {
    const entry = entryFor(state, memberId, today);
    if (!entry) return null;
    const outfit = outfitById(state, entry.outfitId);
    return { entry, outfit, items: outfitItems(state, outfit) };
}

/** How much of the coming seven days is decided, per member. */
export function weekPlanned(state: WardrobeState, memberId: string, today: string): { planned: number; days: number; pct: number } {
    const base = new Date(`${today}T00:00:00`);
    const days = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(base);
        d.setDate(d.getDate() + i);
        return isoDate(d);
    });
    const planned = days.filter((d) => state.schedule.some((s) => s.memberId === memberId && s.date === d)).length;
    return { planned, days: days.length, pct: pctOf(planned, days.length) };
}

/** The garment a member wears most days — used for the uniform quick-fill. */
export const uniformOutfit = (state: WardrobeState, memberId: string): Outfit | undefined => state.outfits.find((o) => o.memberId === memberId && o.isUniform);

// ---------------------------------------------------------------------------
// Capsules and the packing link (AC 2)
// ---------------------------------------------------------------------------

export interface CapsuleRow {
    capsule: Capsule;
    items: WardrobeItem[];
    /** Items on this member's packing list in Travel that point back at a garment. */
    packed: number;
    /** Of those, the ones already ticked off. */
    checked: number;
    tripTitle: string;
}

/**
 * A capsule with its live packing status, read from the Travel slice. Travel
 * turns capsules into packing items that keep `wardrobeItemId`, so "packed"
 * here is a real join and not a hope: a garment counts once a packing item
 * genuinely references it.
 */
export function capsuleRows(state: WardrobeState, travel: TravelSlice | undefined): CapsuleRow[] {
    const packItems = travel?.packItems ?? [];
    const lists = travel?.lists ?? [];
    const trips = travel?.trips ?? [];
    return state.capsules.map((capsule) => {
        const items = capsuleItems(state, capsule);
        const mine = packItems.filter((p) => {
            if (!p.wardrobeItemId) return false;
            const list = lists.find((l) => l.id === p.listId);
            return !list || !list.memberId || list.memberId === capsule.memberId;
        });
        const packed = items.filter((i) => mine.some((p) => p.wardrobeItemId === i.id)).length;
        const checked = items.filter((i) => mine.some((p) => p.wardrobeItemId === i.id && p.checked)).length;
        const trip = trips.find((t) => t.id === capsule.tripId);
        return { capsule, items, packed, checked, tripTitle: trip?.title ?? capsule.tripLabel };
    });
}

/** Every packing item across Travel that points at this garment. */
export function packingLinks(itemId: string, travel: TravelSlice | undefined): Array<{ id: string; label: string; checked: boolean; tripTitle: string }> {
    const packItems = travel?.packItems ?? [];
    const lists = travel?.lists ?? [];
    const trips = travel?.trips ?? [];
    return packItems
        .filter((p) => p.wardrobeItemId === itemId)
        .map((p) => {
            const list = lists.find((l) => l.id === p.listId);
            const trip = trips.find((t) => t.id === list?.tripId);
            return { id: p.id, label: p.item ?? p.wardrobeLabel ?? "Packing item", checked: Boolean(p.checked), tripTitle: trip?.title ?? "A trip" };
        });
}

/** Trips a capsule can be linked to, newest departure first. */
export function linkableTrips(travel: TravelSlice | undefined): Array<{ id: string; title: string; when: string }> {
    return (travel?.trips ?? [])
        .filter((t) => t.status !== "done")
        .map((t) => ({ id: t.id, title: t.title ?? t.destination ?? "Trip", when: t.startDate ?? "" }))
        .sort((a, b) => (a.when || "9").localeCompare(b.when || "9"));
}

// ---------------------------------------------------------------------------
// The outgrown pipeline
// ---------------------------------------------------------------------------

/** Outgrown garments with nothing decided yet — the list that costs money. */
export function undecided(state: WardrobeState): WardrobeItem[] {
    const wished = new Set(state.wishes.map((w) => w.itemId).filter(Boolean));
    const bagged = new Set(state.donations.flatMap((d) => d.itemIds));
    return state.items.filter((i) => i.status === "outgrown" && !wished.has(i.id) && !bagged.has(i.id));
}

export const openDonations = (state: WardrobeState): DonateJob[] => state.donations.filter((d) => !d.doneAt).sort((a, b) => a.dueDate.localeCompare(b.dueDate));

/** Done, but the family never said whether it counted as giving (AC 7). */
export const unrecordedDonations = (state: WardrobeState): DonateJob[] => state.donations.filter((d) => d.doneAt && !d.givingEntryId);

export const openWishes = (state: WardrobeState): ReplacementWish[] => state.wishes.filter((w) => w.status !== "bought");

export const givingTotal = (state: WardrobeState): number => state.giving.reduce((n, g) => n + g.amountCents, 0);

/** The default replacement a parent is offered when something stops fitting. */
export function suggestReplacement(item: WardrobeItem): { name: string; size: string } {
    const bump = item.size.match(/^(?:Size|UK)?\s*(\d+)$/i);
    const band = item.size.match(/^Age (\d+)-(\d+)$/i);
    const size = bump ? item.size.replace(/\d+/, String(Number(bump[1]) + 1)) : band ? `Age ${Number(band[1]) + 1}-${Number(band[2]) + 1}` : item.size;
    const noun = item.name.replace(/^(Black|White|Navy|Grey|Blue|Red|Pink|Green|Gold|Cream|Yellow|Brown|Beige|Purple)\s+/i, "");
    return { name: `${noun.charAt(0).toUpperCase()}${noun.slice(1)}, ${size.toLowerCase()}`, size };
}

// ---------------------------------------------------------------------------
// A template outfit, for when the companion is unavailable
// ---------------------------------------------------------------------------

/**
 * The fallback behind the AI outfit button: one wearable garment per slot that
 * suits the occasion and the season. Never clever, always an answer — the
 * screen must not sit empty because the allowance ran out.
 */
export function suggestOutfit(state: WardrobeState, memberId: string, occasion: Occasion, season: Season = "all"): string[] {
    const pool = itemsOf(state, memberId).filter((i) => inUse(i) && !i.inLaundry && (i.season === "all" || season === "all" || i.season === season));
    const pick = (cats: ItemCategory[]): WardrobeItem | undefined => {
        const fits = pool.filter((i) => cats.includes(i.category));
        return fits.find((i) => i.occasions.includes(occasion) && i.favourite) ?? fits.find((i) => i.occasions.includes(occasion)) ?? (occasion === "everyday" ? fits[0] : undefined);
    };
    const traditional = occasion === "church" || occasion === "party" ? pick(["traditional"]) : undefined;
    const dress = traditional ?? pick(["dress"]);
    const out = [dress ?? pick(["top"]), dress ? undefined : pick(["bottom"]), pick(["shoes"]), pick(["accessory", "outerwear"])];
    return out.filter((x): x is WardrobeItem => Boolean(x)).map((x) => x.id);
}

// ---------------------------------------------------------------------------
// Shared surfaces
// ---------------------------------------------------------------------------

export function dashboard(state: WardrobeState, ctx: RepoContext): DashboardContribution {
    const agenda: AgendaItem[] = [];
    const attention: AttentionItem[] = [];
    const rings: ProgressRing[] = [];
    const childCards: ChildCard[] = [];
    const me = ctx.me;
    if (me.role === "guest") return { agenda, attention, rings, childCards };

    const people = me.role === "child" ? [me] : ctx.members.filter((m) => m.role !== "guest");

    // AC 1 — what each person is wearing today, on the day it is for.
    for (const m of people) {
        const w = wearingToday(state, m.id, ctx.today);
        if (!w?.outfit) continue;
        const first = m.name.split(" ")[0];
        agenda.push({
            id: `wearing-${m.id}-${ctx.today}`,
            moduleId: "wardrobe",
            area: "live",
            title: me.role === "child" ? `Wearing today: ${w.outfit.name}` : `${first} wears ${w.outfit.name}`,
            meta: `Wardrobe · ${w.entry.eventLabel || OCCASION[w.outfit.occasion].label}${w.items.length ? ` · ${w.items.length} pieces` : ""}`,
            memberId: m.id,
            at: null,
            done: Boolean(w.entry.wornAt),
            href: `${BASE}/schedule`,
            sort: 210,
        });
        if (me.role === "child") {
            childCards.push({
                id: `wearing-${m.id}`,
                moduleId: "wardrobe",
                area: "live",
                title: `Today you're wearing ${w.outfit.name}`,
                body: w.items.length ? w.items.map((i) => i.name).slice(0, 3).join(", ") : "Tap to see what's laid out.",
                emoji: "👕",
                href: `${BASE}/schedule`,
                done: Boolean(w.entry.wornAt),
            });
        }
    }

    if (me.role === "child") {
        const mine = itemsOf(state, me.id);
        const wash = mine.filter((i) => i.inLaundry).length;
        if (wash) {
            childCards.push({
                id: "laundry",
                moduleId: "wardrobe",
                area: "live",
                title: `${wash} thing${wash === 1 ? " is" : "s are"} in the wash`,
                body: "So don't plan on wearing them tomorrow.",
                emoji: "🧺",
                href: BASE,
            });
        }
        for (const w of state.wishes.filter((x) => x.status !== "bought").slice(0, 1)) {
            childCards.push({
                id: `wish-${w.id}`,
                moduleId: "wardrobe",
                area: "live",
                title: `New ${w.name.toLowerCase()} on the way`,
                body: w.status === "sent" ? "Mum has ordered them." : "Mum has put it on the list.",
                emoji: "🛍️",
                href: BASE,
            });
        }
        return { agenda, attention, rings, childCards };
    }

    // Parents: the week decided, and the trip capsules.
    const kids = ctx.members.filter((m) => m.role === "child");
    if (kids.length) {
        const totals = kids.map((k) => weekPlanned(state, k.id, ctx.today));
        const planned = totals.reduce((n, t) => n + t.planned, 0);
        const days = totals.reduce((n, t) => n + t.days, 0);
        rings.push({
            id: "week",
            moduleId: "wardrobe",
            area: "live",
            label: "Mornings decided",
            pct: pctOf(planned, days),
            sub: `${planned} of ${days} child-days this week`,
            href: `${BASE}/schedule`,
        });
    }
    if (state.capsules.length) {
        const ready = state.capsules.filter((c) => c.itemIds.length >= 5).length;
        rings.push({
            id: "capsules",
            moduleId: "wardrobe",
            area: "live",
            label: state.capsules[0].tripLabel || "Trip capsules",
            pct: pctOf(ready, state.capsules.length),
            sub: `${ready} of ${state.capsules.length} capsules packed out`,
            href: `${BASE}?view=capsules`,
        });
    }

    for (const it of undecided(state).slice(0, 3)) {
        const who = ctx.members.find((m) => m.id === it.ownerMemberId)?.name.split(" ")[0] ?? "Someone";
        attention.push({
            id: `outgrown-${it.id}`,
            moduleId: "wardrobe",
            area: "live",
            tone: "warn",
            title: `${who}'s ${it.name.toLowerCase()} no longer fits`,
            body: "Decide it once: hand it down, ask for a replacement, or put it in the charity bag.",
            href: `${BASE}/items/${it.id}`,
            weight: 42,
        });
    }
    for (const d of openDonations(state)) {
        const late = d.dueDate < ctx.today;
        const soon = d.dueDate <= isoDate(new Date(new Date(`${ctx.today}T00:00:00`).getTime() + 3 * 86400000));
        if (!late && !soon) continue;
        attention.push({
            id: `donate-${d.id}`,
            moduleId: "wardrobe",
            area: "live",
            tone: late ? "danger" : "warn",
            title: late ? `${d.title} is overdue` : d.title,
            body: `${d.itemIds.length} thing${d.itemIds.length === 1 ? "" : "s"} for ${d.charity}. ${late ? "It has been in the boot since last week." : "Due this week."}`,
            href: `${BASE}?view=outgrown`,
            weight: late ? 52 : 38,
        });
    }
    for (const d of unrecordedDonations(state).slice(0, 2)) {
        attention.push({
            id: `giving-${d.id}`,
            moduleId: "wardrobe",
            area: "live",
            tone: "info",
            title: "Record the clothing donation as giving?",
            body: `${d.title} was dropped off. One tap puts it on the giving ledger, or leave it — generosity does not have to be counted.`,
            href: `${BASE}?view=outgrown`,
            weight: 24,
        });
    }
    const recent = state.handdowns.filter((h) => new Date(h.at).getTime() > Date.now() - 21 * 86400000);
    for (const h of recent.slice(0, 1)) {
        const from = ctx.members.find((m) => m.id === h.fromMemberId)?.name.split(" ")[0] ?? "someone";
        const to = ctx.members.find((m) => m.id === h.toMemberId)?.name.split(" ")[0] ?? "someone";
        attention.push({
            id: `handdown-${h.id}`,
            moduleId: "wardrobe",
            area: "live",
            tone: "celebrate",
            title: `${h.itemName} is ${to}'s now`,
            body: `Handed down from ${from}. That is one thing not bought twice.`,
            href: h.itemId ? `${BASE}/items/${h.itemId}` : BASE,
            weight: 18,
        });
    }

    return { agenda, attention, rings, childCards };
}

export function nudges(state: WardrobeState, ctx: RepoContext): Nudge[] {
    if (ctx.me.role !== "parent") return [];
    const out: Nudge[] = [];

    for (const it of undecided(state)) {
        const who = ctx.members.find((m) => m.id === it.ownerMemberId)?.name.split(" ")[0] ?? "Someone";
        out.push({
            key: `wardrobe-outgrown-${it.id}`,
            moduleId: "wardrobe",
            kind: "family",
            title: `${it.name} has been outgrown`,
            body: `${who} can't wear it any more. Hand it down, replace it, or bag it — the screen does all three at once.`,
            href: `${BASE}/items/${it.id}`,
            memberIds: [],
        });
    }

    for (const d of openDonations(state)) {
        if (d.dueDate > isoDate(new Date(new Date(`${ctx.today}T00:00:00`).getTime() + 2 * 86400000))) continue;
        out.push({
            key: `wardrobe-donate-${d.id}-${d.dueDate}`,
            moduleId: "wardrobe",
            kind: "task",
            title: d.dueDate < ctx.today ? `${d.title} is overdue` : `${d.title} is due`,
            body: `${d.charity}. ${d.itemIds.length} thing${d.itemIds.length === 1 ? "" : "s"} in the bag.`,
            href: `${BASE}?view=outgrown`,
            memberIds: d.assigneeMemberId ? [d.assigneeMemberId] : [],
        });
    }

    for (const d of unrecordedDonations(state)) {
        out.push({
            key: `wardrobe-giving-${d.id}`,
            moduleId: "wardrobe",
            kind: "finance",
            title: "Count the clothing donation as giving?",
            body: `${d.title} went to ${d.charity}. You can put it on the giving ledger, or let it be.`,
            href: `${BASE}?view=outgrown`,
            memberIds: [],
        });
    }

    // On the planning day, the children's week.
    const planningDay = new Date(`${ctx.today}T00:00:00`).getDay() === ctx.space.planningDay % 7;
    if (planningDay) {
        for (const k of ctx.members.filter((m) => m.role === "child")) {
            const { planned } = weekPlanned(state, k.id, ctx.today);
            if (planned >= 4) continue;
            out.push({
                key: `wardrobe-week-${k.id}-${weekStart(`${ctx.today}T00:00:00`)}`,
                moduleId: "wardrobe",
                kind: "family",
                title: `${k.name.split(" ")[0]}'s week isn't laid out`,
                body: `${planned} of the next seven days has an outfit. Five minutes now is five arguments you don't have.`,
                href: `${BASE}/schedule`,
                memberIds: [],
            });
        }
    }

    return out;
}

export function aiContext(state: WardrobeState, ctx: RepoContext): string {
    if (ctx.me.role === "guest" || !state.items.length) return "";
    const parts: string[] = [];
    const name = (id: string): string => ctx.members.find((m) => m.id === id)?.name.split(" ")[0] ?? "someone";

    if (ctx.me.role === "child") {
        const mine = itemsOf(state, ctx.me.id);
        const stats = closetStats(mine, ctx.today);
        parts.push(`${name(ctx.me.id)}'s closet: ${stats.total} things (${stats.byCategory.slice(0, 4).map((c) => `${c.n} ${CATEGORY[c.category].plural.toLowerCase()}`).join(", ")}).`);
        const w = wearingToday(state, ctx.me.id, ctx.today);
        if (w?.outfit) parts.push(`Today: ${w.outfit.name} for ${w.entry.eventLabel || OCCASION[w.outfit.occasion].label}.`);
        const wash = mine.filter((i) => i.inLaundry).map((i) => i.name);
        if (wash.length) parts.push(`In the wash: ${wash.slice(0, 4).join(", ")}.`);
        return parts.join(" ").slice(0, 1500);
    }

    const stats = closetStats(state.items, ctx.today);
    parts.push(`Closet: ${stats.total} garments across ${new Set(state.items.map((i) => i.ownerMemberId)).size} people; ${stats.wearable} in use, ${stats.outgrown} outgrown, ${stats.toDonate} bagged for the charity shop, ${stats.inLaundry} in the wash.`);
    parts.push(`Biggest categories: ${stats.byCategory.slice(0, 4).map((c) => `${CATEGORY[c.category].plural.toLowerCase()} ${c.n}`).join(", ")}.`);
    const today = ctx.members
        .filter((m) => m.role !== "guest")
        .map((m) => {
            const w = wearingToday(state, m.id, ctx.today);
            return w?.outfit ? `${name(m.id)}: ${w.outfit.name}${w.entry.eventLabel ? ` (${w.entry.eventLabel})` : ""}` : null;
        })
        .filter(Boolean);
    if (today.length) parts.push(`Scheduled today — ${today.join("; ")}.`);
    if (state.capsules.length) parts.push(`Trip capsules for ${state.capsules[0].tripLabel}: ${state.capsules.map((c) => `${name(c.memberId)} ${c.itemIds.length} pieces`).join(", ")}.`);
    const undec = undecided(state);
    if (undec.length) parts.push(`Outgrown and undecided: ${undec.map((i) => `${name(i.ownerMemberId)}'s ${i.name}`).slice(0, 4).join(", ")}.`);
    const open = openWishes(state);
    if (open.length) parts.push(`Replacements wanted: ${open.map((w) => `${w.name} for ${name(w.forMemberId)}`).join(", ")}.`);
    const jobs = openDonations(state);
    if (jobs.length) parts.push(`Donate job open: ${jobs[0].title} to ${jobs[0].charity}, due ${jobs[0].dueDate}.`);
    return parts.join(" ").slice(0, 1500);
}

export function search(state: WardrobeState, q: string): Array<{ title: string; meta: string; href: string }> {
    const needle = q.toLowerCase();
    const hits: Array<{ title: string; meta: string; href: string }> = [];
    for (const i of state.items) {
        if (!`${i.name} ${i.brand} ${i.size} ${COLOUR[i.colour].label}`.toLowerCase().includes(needle)) continue;
        hits.push({ title: i.name, meta: `Wardrobe · ${itemLine(i)}`, href: `${BASE}/items/${i.id}` });
        if (hits.length >= 8) break;
    }
    for (const o of state.outfits) {
        if (!o.name.toLowerCase().includes(needle)) continue;
        hits.push({ title: o.name, meta: `Outfit · ${OCCASION[o.occasion].label}`, href: `${BASE}/outfits?o=${o.id}` });
    }
    for (const c of state.capsules) {
        if (!`${c.name} ${c.tripLabel}`.toLowerCase().includes(needle)) continue;
        hits.push({ title: `${c.name} — ${c.tripLabel}`, meta: `Capsule · ${c.itemIds.length} pieces`, href: `${BASE}?view=capsules` });
    }
    return hits.slice(0, 12);
}
