import type { AgendaItem, AttentionItem, ChildCard, DashboardContribution, Member, Nudge, ProgressRing, RepoContext } from "@/data/core";
import { isoDate, money, pct, shortDate } from "@/lib/format";
import {
    BOOKING_KIND,
    DOC_KIND,
    PACK_CATEGORY,
    TRIP_KIND,
    type Booking,
    type ChecklistItem,
    type ItineraryDay,
    type ItineraryItem,
    type PackItemCategory,
    type PackingItem,
    type PackingList,
    type PackingTemplate,
    type TravelDoc,
    type TravelLedgerEntry,
    type TravelState,
    type Traveller,
    type Trip,
    type TripExpense,
    type WardrobeSlice,
} from "./types";

/**
 * Everything the travel screens show, as pure functions of state.
 *
 * Four ideas do the work:
 *
 *   VISIBILITY   `visibleTo` is the ONE filter both repos run before anybody
 *                sees state. Documents never survive it for a child or a
 *                guest, costs never survive it for a child, and a packing list
 *                that is not yours never survives it at all. Nothing is hidden
 *                with CSS.
 *   READINESS    one number per trip — bookings confirmed, papers valid,
 *                lists generated and packed, checklist worked through — which
 *                is what the dashboard ring and the "is this trip actually
 *                ready" question both read.
 *   THE RUN-UP   the checklist is stored as an OFFSET (T-14, T-7…) and the
 *                due date is computed from the departure, so moving the trip
 *                moves the whole run-up with it.
 *   ONE CURRENCY every total sums `homeCents`. Foreign amounts are kept beside
 *                it for the receipt line and never added to anything.
 */

export const HREF = "/live/travel";
export const tripHref = (id: string): string => `${HREF}/${id}`;
export const itineraryHref = (id: string): string => `${HREF}/${id}/itinerary`;
export const packingHref = (id: string): string => `${HREF}/${id}/packing`;

const MS_DAY = 86400000;

// ---------------------------------------------------------------------------
// Dates
// ---------------------------------------------------------------------------

const midnight = (iso: string): number => new Date(`${iso.slice(0, 10)}T00:00:00`).getTime();

/** Whole days from `today` to `iso`; negative for the past. */
export function daysBetween(today: string, iso: string): number {
    return Math.round((midnight(iso) - midnight(today)) / MS_DAY);
}

export function addDaysIso(iso: string, days: number): string {
    const d = new Date(`${iso.slice(0, 10)}T00:00:00`);
    d.setDate(d.getDate() + days);
    return isoDate(d);
}

/** Whole months from `from` to `to` (used by the six-month passport rule). */
export function monthsBetween(from: string, to: string): number {
    const a = new Date(`${from.slice(0, 10)}T00:00:00`);
    const b = new Date(`${to.slice(0, 10)}T00:00:00`);
    let m = (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());
    if (b.getDate() < a.getDate()) m -= 1;
    return m;
}

/** "In 14 days", "Tomorrow", "Day 3 of 6", "Home 2 weeks ago". */
export function tripWhen(trip: Trip, today: string): string {
    if (!trip.startDate) return "No dates yet";
    const to = daysBetween(today, trip.startDate);
    const end = trip.endDate ?? trip.startDate;
    const back = daysBetween(today, end);
    if (to > 1) return to > 45 ? `In ${Math.round(to / 7)} weeks` : `In ${to} days`;
    if (to === 1) return "Tomorrow";
    if (to === 0) return "Today";
    if (back >= 0) return `Day ${1 - to} of ${daysBetween(trip.startDate, end) + 1}`;
    const home = -back;
    return home === 1 ? "Home yesterday" : home < 21 ? `Home ${home} days ago` : `Home ${Math.round(home / 7)} weeks ago`;
}

export function tripDates(trip: Trip): string {
    if (!trip.startDate) return "Dates to be decided";
    if (!trip.endDate || trip.endDate === trip.startDate) return shortDate(trip.startDate);
    return `${shortDate(trip.startDate)} – ${shortDate(trip.endDate)}`;
}

export const tripNights = (trip: Trip): number => (trip.startDate && trip.endDate ? Math.max(0, daysBetween(trip.startDate, trip.endDate)) : 0);

// ---------------------------------------------------------------------------
// Maps — a deep link, not an embed (decision 1 in types.ts)
// ---------------------------------------------------------------------------

/**
 * A "map link" has a precise definition in this product: a universal deep link
 * that opens the device's own maps application at a set of coordinates when we
 * have them, and at a URL-encoded address when we do not. It is a link and not
 * an embedded map because the app's content-security policy admits exactly
 * three third parties (the YouTube player, the AI gateway and the image API);
 * a tile server is not one of them, and a silently blank map is worse than an
 * honest link.
 */
export function mapLink(place: string, coords: string | null): string {
    const q = (coords ?? "").trim() || place.trim();
    return q ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}` : "";
}

/** The same place, for a family on iPhones. */
export function appleMapLink(place: string, coords: string | null): string {
    const c = (coords ?? "").trim();
    if (c) return `https://maps.apple.com/?ll=${encodeURIComponent(c)}&q=${encodeURIComponent(place || c)}`;
    return place.trim() ? `https://maps.apple.com/?q=${encodeURIComponent(place.trim())}` : "";
}

// ---------------------------------------------------------------------------
// Permissions
// ---------------------------------------------------------------------------

/** Who may change a trip: parents, and anyone a parent granted `travel.manage`. */
export const canManage = (ctx: RepoContext): boolean => ctx.can("travel.manage");

/** Is this member on the trip at all (traveller or host)? */
export function isOnTrip(state: TravelState, tripId: string, memberId: string): boolean {
    return state.travellers.some((t) => t.tripId === tripId && t.memberId === memberId);
}

/** May this member see the trip row? Parents always; anyone else only when on it or explicitly shared. */
export function canSeeTrip(state: TravelState, trip: Trip, ctx: RepoContext): boolean {
    if (ctx.role === "parent") return true;
    if (isOnTrip(state, trip.id, ctx.me.id)) return true;
    // "Granted named objects, never modules": a guest reaches a trip only by
    // being on it or by being named on it. `family` deliberately grants a guest
    // nothing — a family trip is family business until somebody shares it.
    if (trip.visibility === "shared") return trip.sharedWith.includes(ctx.me.id);
    if (trip.visibility === "child") return ctx.role === "child";
    return false;
}

/**
 * May this member tick a packing item?
 *
 * Parents tick anything. A child ticks their own list — that is the whole
 * point of giving children a real product. A guest is READ-ONLY (the source
 * matrix gives guests "view" and nothing more) unless a parent has handed them
 * the `travel.manage` grant from Family → Permissions.
 */
export function canTickList(list: PackingList | undefined, ctx: RepoContext): boolean {
    if (!list) return false;
    if (canManage(ctx)) return true;
    if (list.memberId !== ctx.me.id) return false;
    return ctx.role === "child";
}

// ---------------------------------------------------------------------------
// The filter — run by BOTH repos, once, before anything is rendered
// ---------------------------------------------------------------------------

/**
 * What this member may receive.
 *
 *  parent — everything.
 *  child  — the trips they are on; the itinerary without prices; general
 *           bookings without a reference or a cost; NO documents, NO expenses,
 *           NO passport dates, NO budget, and only their own packing list.
 *  guest  — the trips they were granted; the same stripping as a child, and
 *           read-only besides.
 */
export function visibleTo(state: TravelState, ctx: RepoContext): TravelState {
    const parent = ctx.role === "parent";
    const trips = state.trips.filter((t) => canSeeTrip(state, t, ctx));
    const ids = new Set(trips.map((t) => t.id));

    if (parent) {
        return {
            trips,
            travellers: state.travellers.filter((t) => ids.has(t.tripId)),
            days: state.days.filter((d) => ids.has(d.tripId)),
            items: state.items.filter((i) => ids.has(i.tripId)),
            bookings: state.bookings.filter((b) => ids.has(b.tripId)),
            docs: state.docs.filter((d) => d.tripId === null || ids.has(d.tripId)),
            lists: state.lists.filter((l) => ids.has(l.tripId)),
            packItems: state.packItems.filter((p) => state.lists.some((l) => l.id === p.listId && ids.has(l.tripId))),
            checklist: state.checklist.filter((c) => ids.has(c.tripId)),
            expenses: state.expenses.filter((e) => ids.has(e.tripId)),
        };
    }

    const lists = state.lists.filter((l) => ids.has(l.tripId) && l.memberId === ctx.me.id);
    const listIds = new Set(lists.map((l) => l.id));
    return {
        // No budget for a child or a guest: money is a parent's business.
        trips: trips.map((t) => ({ ...t, budgetCents: null })),
        // Passport dates are a document fact; strip them from the traveller row too.
        travellers: state.travellers.filter((t) => ids.has(t.tripId)).map((t) => ({ ...t, passportExpiry: null, notes: "" })),
        days: state.days.filter((d) => ids.has(d.tripId)),
        items: state.items.filter((i) => ids.has(i.tripId)).map((i) => ({ ...i, costCents: 0, bookingRef: "" })),
        // General bookings only, and without the reference or the price.
        bookings: state.bookings
            .filter((b) => ids.has(b.tripId) && b.sensitivity === "general")
            .map((b) => ({ ...b, reference: "", costCents: 0, link: "", imageUrl: null })),
        // AC 4 — documents never reach a child or a guest. Not masked: absent.
        docs: [],
        lists,
        packItems: state.packItems.filter((p) => listIds.has(p.listId)),
        checklist: state.checklist.filter((c) => ids.has(c.tripId)),
        expenses: [],
    };
}

// ---------------------------------------------------------------------------
// Slicing state
// ---------------------------------------------------------------------------

export const tripById = (state: TravelState, id: string | undefined): Trip | undefined => (id ? state.trips.find((t) => t.id === id) : undefined);

export const travellersOf = (state: TravelState, tripId: string): Traveller[] => state.travellers.filter((t) => t.tripId === tripId);

export const travellingOn = (state: TravelState, tripId: string): Traveller[] => travellersOf(state, tripId).filter((t) => t.role === "traveller");

export const daysOf = (state: TravelState, tripId: string): ItineraryDay[] => state.days.filter((d) => d.tripId === tripId).sort((a, b) => a.date.localeCompare(b.date));

export const itemsOfDay = (state: TravelState, dayId: string): ItineraryItem[] =>
    state.items.filter((i) => i.dayId === dayId).sort((a, b) => (a.time || "99:99").localeCompare(b.time || "99:99") || a.order - b.order);

export const itemsOfTrip = (state: TravelState, tripId: string): ItineraryItem[] => state.items.filter((i) => i.tripId === tripId);

export const bookingsOf = (state: TravelState, tripId: string): Booking[] => state.bookings.filter((b) => b.tripId === tripId).sort((a, b) => a.startAt.localeCompare(b.startAt));

export const docsOf = (state: TravelState, tripId: string): TravelDoc[] => state.docs.filter((d) => d.tripId === tripId || d.tripId === null);

export const listsOf = (state: TravelState, tripId: string): PackingList[] => state.lists.filter((l) => l.tripId === tripId);

export const listFor = (state: TravelState, tripId: string, memberId: string): PackingList | undefined => state.lists.find((l) => l.tripId === tripId && l.memberId === memberId);

export const packItemsOf = (state: TravelState, listId: string): PackingItem[] => state.packItems.filter((p) => p.listId === listId).sort((a, b) => a.order - b.order);

export const checklistOf = (state: TravelState, tripId: string): ChecklistItem[] => state.checklist.filter((c) => c.tripId === tripId).sort((a, b) => b.dueOffsetDays - a.dueOffsetDays);

export const expensesOf = (state: TravelState, tripId: string): TripExpense[] => state.expenses.filter((e) => e.tripId === tripId).sort((a, b) => b.date.localeCompare(a.date));

/** Trips sorted the way a family thinks: what is next, then what we dream of, then where we have been. */
export function sortedTrips(state: TravelState, today: string): { current: Trip | null; upcoming: Trip[]; dreaming: Trip[]; past: Trip[] } {
    const dated = state.trips.filter((t) => t.startDate);
    const current = dated.find((t) => t.startDate! <= today && (t.endDate ?? t.startDate!) >= today) ?? null;
    const upcoming = dated
        .filter((t) => t.id !== current?.id && (t.endDate ?? t.startDate!) >= today && t.status !== "done")
        .sort((a, b) => a.startDate!.localeCompare(b.startDate!));
    const past = dated.filter((t) => t.id !== current?.id && ((t.endDate ?? t.startDate!) < today || t.status === "done")).sort((a, b) => b.startDate!.localeCompare(a.startDate!));
    const dreaming = state.trips.filter((t) => !t.startDate).sort((a, b) => a.title.localeCompare(b.title));
    return { current, upcoming, dreaming, past };
}

/** The trip the dashboard, the nudges and the child's card all mean by "our trip". */
export function nextTrip(state: TravelState, today: string): Trip | null {
    const { current, upcoming } = sortedTrips(state, today);
    return current ?? upcoming[0] ?? null;
}

// ---------------------------------------------------------------------------
// Packing
// ---------------------------------------------------------------------------

export function packedCount(state: TravelState, listId: string): { done: number; total: number; pct: number } {
    const items = packItemsOf(state, listId);
    const done = items.filter((i) => i.checked).length;
    return { done, total: items.length, pct: pct(done, items.length) };
}

/**
 * "5 of 6 travellers have a list" — the number AC 1 is measured by. It counts
 * everyone on the trip, hosts included: Mama Fọláké drives down from Ibadan
 * and packs a bag like everybody else.
 */
export function packingProgress(state: TravelState, tripId: string): { generated: number; travellers: number; packed: number; items: number } {
    const people = travellersOf(state, tripId);
    const lists = listsOf(state, tripId).filter((l) => l.generatedAt);
    let packed = 0;
    let items = 0;
    for (const l of lists) {
        const c = packedCount(state, l.id);
        packed += c.done;
        items += c.total;
    }
    return { generated: lists.length, travellers: people.length, packed, items };
}

/**
 * The generator behind AC 1: a template plus the traveller's age band.
 *
 * Templates are the family's, not a packing app's — the little one's list has
 * a favourite teddy on it and the teenager's has a charger, because that is
 * what actually gets forgotten.
 */
export function templateItems(template: PackingTemplate, member: Member, nights: number): Array<{ item: string; qty: number; category: PackItemCategory }> {
    const n = Math.max(1, nights);
    const outfits = Math.min(12, Math.max(2, Math.ceil(n * 0.8)));
    const base: Array<{ item: string; qty: number; category: PackItemCategory }> = [
        { item: "Underwear", qty: n + 2, category: "clothes" },
        { item: "Socks", qty: n + 1, category: "clothes" },
        { item: "Pyjamas", qty: Math.min(3, Math.ceil(n / 3)), category: "clothes" },
        { item: "Toothbrush and toothpaste", qty: 1, category: "toiletries" },
        { item: "Wash bag", qty: 1, category: "toiletries" },
    ];

    const byTemplate: Record<PackingTemplate, Array<{ item: string; qty: number; category: PackItemCategory }>> = {
        warm: [
            { item: "Light outfits", qty: outfits, category: "clothes" },
            { item: "Sun hat", qty: 1, category: "clothes" },
            { item: "Sun cream", qty: 1, category: "toiletries" },
            { item: "Insect repellent", qty: 1, category: "toiletries" },
            { item: "Sandals", qty: 1, category: "clothes" },
            { item: "Refillable water bottle", qty: 1, category: "other" },
        ],
        cold: [
            { item: "Warm layers", qty: outfits, category: "clothes" },
            { item: "Waterproof coat", qty: 1, category: "clothes" },
            { item: "Walking boots", qty: 1, category: "clothes" },
            { item: "Hat, scarf and gloves", qty: 1, category: "clothes" },
            { item: "Thermal socks", qty: 2, category: "clothes" },
        ],
        city: [
            { item: "Everyday outfits", qty: outfits, category: "clothes" },
            { item: "One smart outfit", qty: 1, category: "clothes" },
            { item: "Comfortable shoes", qty: 1, category: "clothes" },
            { item: "Day bag", qty: 1, category: "other" },
        ],
        beach: [
            { item: "Swimming things", qty: 2, category: "clothes" },
            { item: "Beach towel", qty: 1, category: "other" },
            { item: "Light outfits", qty: outfits, category: "clothes" },
            { item: "Sun cream", qty: 1, category: "toiletries" },
            { item: "Bucket and spade", qty: 1, category: "kids" },
        ],
        "school-trip": [
            { item: "The school's kit list", qty: 1, category: "documents" },
            { item: "Named waterproof", qty: 1, category: "clothes" },
            { item: "Packed lunch box", qty: 1, category: "other" },
            { item: "Spare clothes in a bag", qty: 1, category: "clothes" },
        ],
        "day-out": [
            { item: "Snacks and water", qty: 1, category: "other" },
            { item: "Wellies", qty: 1, category: "clothes" },
            { item: "A change of clothes", qty: 1, category: "clothes" },
        ],
    };

    const byBand: Record<string, Array<{ item: string; qty: number; category: PackItemCategory }>> = {
        little: [
            { item: "Favourite teddy", qty: 1, category: "kids" },
            { item: "Two picture books", qty: 2, category: "kids" },
            { item: "Wipes", qty: 1, category: "toiletries" },
        ],
        junior: [
            { item: "Colouring things", qty: 1, category: "kids" },
            { item: "A book for the journey", qty: 1, category: "kids" },
        ],
        teen: [
            { item: "Headphones", qty: 1, category: "tech" },
            { item: "Charger", qty: 1, category: "tech" },
        ],
        "young-adult": [
            { item: "Charger and power bank", qty: 1, category: "tech" },
            { item: "Revision notes", qty: 1, category: "other" },
        ],
        adult: [
            { item: "Phone charger and adapter", qty: 1, category: "tech" },
            { item: "Any medicines we take", qty: 1, category: "medical" },
        ],
    };

    const papers: Array<{ item: string; qty: number; category: PackItemCategory }> =
        template === "day-out" ? [] : [{ item: "Passport and travel papers", qty: 1, category: "documents" }];

    return [...papers, ...base, ...byTemplate[template], ...(byBand[member.ageBand] ?? [])];
}

/**
 * AC 9 — wardrobe capsules become packing items that keep the link back to the
 * wardrobe record. Reads the Wardrobe slice loosely so a module that has not
 * shipped simply contributes nothing.
 */
export function capsuleItems(wardrobe: WardrobeSlice | undefined, memberId: string): Array<{ id: string; label: string; capsule: string; category: PackItemCategory }> {
    if (!wardrobe) return [];
    const items = wardrobe.items ?? [];
    const capsules = (wardrobe.capsules ?? []).filter((c) => !c.memberId || c.memberId === memberId || c.ownerMemberId === memberId);
    const out: Array<{ id: string; label: string; capsule: string; category: PackItemCategory }> = [];
    for (const c of capsules) {
        const name = c.name ?? c.title ?? "Capsule";
        const ids = c.itemIds ?? items.filter((i) => (i.capsuleIds ?? []).includes(c.id)).map((i) => i.id);
        for (const id of ids) {
            const it = items.find((x) => x.id === id);
            if (!it) continue;
            const owner = it.memberId ?? it.ownerMemberId ?? null;
            if (owner && owner !== memberId) continue;
            out.push({ id, label: it.name ?? it.title ?? "Wardrobe item", capsule: name, category: "clothes" });
        }
    }
    return out.slice(0, 40);
}

// ---------------------------------------------------------------------------
// The run-up, papers and readiness
// ---------------------------------------------------------------------------

/** The real date a T-minus item is due; null when the trip has no departure yet. */
export function checklistDue(trip: Trip, item: ChecklistItem): string | null {
    return trip.startDate ? addDaysIso(trip.startDate, -item.dueOffsetDays) : null;
}

export function checklistProgress(state: TravelState, trip: Trip, today: string): { done: number; total: number; overdue: ChecklistItem[]; dueSoon: ChecklistItem[] } {
    const all = checklistOf(state, trip.id);
    const open = all.filter((c) => !c.doneAt);
    const overdue: ChecklistItem[] = [];
    const dueSoon: ChecklistItem[] = [];
    for (const c of open) {
        const due = checklistDue(trip, c);
        if (!due) continue;
        const d = daysBetween(today, due);
        if (d < 0) overdue.push(c);
        else if (d <= 3) dueSoon.push(c);
    }
    return { done: all.filter((c) => c.doneAt).length, total: all.length, overdue, dueSoon };
}

/**
 * AC 3 — the six-month rule. Most countries the family flies to (Nigeria among
 * them) want a passport valid for six months beyond the date you leave. This
 * returns every traveller whose passport does not clear that bar, with how
 * much room they actually have, so the warning can say a true thing rather
 * than "check your passport".
 */
export interface PassportRisk {
    memberId: string;
    tripId: string;
    expiry: string;
    /** Months of validity remaining after the return date; may be negative. */
    monthsClear: number;
    /** Expired before we even leave. */
    expiredBeforeTravel: boolean;
}

export function passportRisks(state: TravelState, trip: Trip, today: string): PassportRisk[] {
    if (!trip.startDate || trip.status === "done") return [];
    // A day out in Kent does not need a passport.
    if (trip.countryCode === "GB" || trip.kind === "day-out") return [];
    const end = trip.endDate ?? trip.startDate;
    if (daysBetween(today, end) < 0) return [];
    const out: PassportRisk[] = [];
    for (const t of travellingOn(state, trip.id)) {
        const expiry = t.passportExpiry ?? state.docs.find((d) => d.memberId === t.memberId && d.kind === "passport" && d.expiresAt)?.expiresAt ?? null;
        if (!expiry) continue;
        const monthsClear = monthsBetween(end, expiry);
        if (monthsClear < 6) out.push({ memberId: t.memberId, tripId: trip.id, expiry, monthsClear, expiredBeforeTravel: expiry < trip.startDate });
    }
    return out.sort((a, b) => a.monthsClear - b.monthsClear);
}

/** AC 5 — documents that fall inside the 90-day or 30-day window. */
export function expiringDocs(state: TravelState, today: string, within = 90): Array<{ doc: TravelDoc; daysLeft: number }> {
    return state.docs
        .filter((d) => d.expiresAt)
        .map((d) => ({ doc: d, daysLeft: daysBetween(today, d.expiresAt!) }))
        .filter((x) => x.daysLeft <= within)
        .sort((a, b) => a.daysLeft - b.daysLeft);
}

export interface Readiness {
    pct: number;
    parts: Array<{ label: string; done: number; total: number }>;
}

/** One honest number for "is this trip ready", and the four parts behind it. */
export function readiness(state: TravelState, trip: Trip, today: string): Readiness {
    const bookings = bookingsOf(state, trip.id);
    const people = travellingOn(state, trip.id);
    const lists = listsOf(state, trip.id).filter((l) => l.generatedAt);
    const packing = packingProgress(state, trip.id);
    const check = checklistProgress(state, trip, today);
    const risks = passportRisks(state, trip, today);

    const parts = [
        { label: "Bookings confirmed", done: bookings.filter((b) => b.confirmed).length, total: Math.max(1, bookings.length) },
        { label: "Papers in order", done: Math.max(0, people.length - risks.length), total: Math.max(1, people.length) },
        { label: "Packing lists", done: packing.items ? packing.packed : lists.length, total: packing.items ? packing.items : Math.max(1, people.length) },
        { label: "The run-up", done: check.done, total: Math.max(1, check.total) },
    ];
    const score = parts.reduce((sum, p) => sum + Math.min(1, p.done / p.total), 0) / parts.length;
    return { pct: Math.round(score * 100), parts };
}

// ---------------------------------------------------------------------------
// Money — one currency in the totals, both on the receipt line
// ---------------------------------------------------------------------------

/** Convert an amount spent abroad into the family's own currency. */
export const toHome = (amountCents: number, fxRate: number): number => Math.round(amountCents / (fxRate || 1));

/** "₦48,000 · £26 at 1,850 to the pound" — the line under a foreign expense. */
export function fxNote(e: TripExpense, homeCurrency: string): string {
    if (e.currency === homeCurrency || e.fxRate === 1) return "";
    return `${money(e.amountCents, e.currency)} at ${e.fxRate.toLocaleString("en-GB")} to the ${homeCurrency}`;
}

/** Everything spent on a trip, in the family's currency. */
export function tripSpend(state: TravelState, tripId: string): number {
    return expensesOf(state, tripId).reduce((sum, e) => sum + e.homeCents, 0);
}

/** What the itinerary is expected to cost, in the family's currency. */
export function itineraryCost(state: TravelState, trip: Trip): number {
    return itemsOfTrip(state, trip.id).reduce((sum, i) => sum + toHome(i.costCents, trip.fxRate), 0);
}

/**
 * AC 7 — the ledger lines Finance reads. Travel never writes another module's
 * table; it exposes its posted expenses under the trip's own finance category
 * and the Finance module picks them up from the loaded slice.
 */
export function ledgerEntries(state: TravelState): TravelLedgerEntry[] {
    return state.expenses
        .filter((e) => e.postedAt)
        .map((e) => {
            const trip = state.trips.find((t) => t.id === e.tripId);
            return {
                id: e.id,
                tripId: e.tripId,
                tripTitle: trip?.title ?? "A trip",
                label: e.label,
                amountCents: e.homeCents,
                categoryId: e.financeCategoryId,
                memberId: e.memberId,
                date: e.date,
                postedAt: e.postedAt,
                original: e.fxRate === 1 ? null : { amountCents: e.amountCents, currency: e.currency, fxRate: e.fxRate },
            };
        })
        .sort((a, b) => b.date.localeCompare(a.date));
}

// ---------------------------------------------------------------------------
// AC 6 — the itinerary as a printable document
// ---------------------------------------------------------------------------

const esc = (s: string): string => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/**
 * A standalone HTML document for the itinerary, printed to PDF by the
 * platform's own print dialog ("Save as PDF"). Built as a full document rather
 * than a print stylesheet on the page so what comes out is the itinerary and
 * not the app around it — and so it needs no PDF library, which the no-new-
 * dependencies rule would not allow anyway.
 */
export function itineraryDocument(state: TravelState, trip: Trip, members: Member[], opts: { currency: string; showCosts: boolean }): string {
    const name = (id: string): string => members.find((m) => m.id === id)?.name ?? "Someone";
    const people = travellersOf(state, trip.id);
    const days = daysOf(state, trip.id);
    const bookings = bookingsOf(state, trip.id).filter((b) => opts.showCosts || b.sensitivity === "general");

    const dayBlocks = days
        .map((d) => {
            const items = itemsOfDay(state, d.id);
            const rows = items.length
                ? items
                      .map((i) => {
                          const link = mapLink(i.place, i.coords);
                          const cost = opts.showCosts && i.costCents ? `<span class="cost">${esc(money(toHome(i.costCents, trip.fxRate), opts.currency))}</span>` : "";
                          return `<tr>
        <td class="t">${esc(i.time || "—")}</td>
        <td>
          <div class="ti">${esc(i.title)}${cost}</div>
          ${i.place ? `<div class="pl">${esc(i.place)}${link ? ` · <a href="${esc(link)}">open in maps</a>` : ""}</div>` : ""}
          ${i.notes ? `<div class="nt">${esc(i.notes)}</div>` : ""}
        </td>
      </tr>`;
                      })
                      .join("")
                : `<tr><td class="t">—</td><td class="nt">Nothing planned. A day to breathe.</td></tr>`;
            return `<section class="day">
    <h2>${esc(new Date(`${d.date}T00:00:00`).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" }))}${d.title ? ` · ${esc(d.title)}` : ""}</h2>
    ${d.notes ? `<p class="dn">${esc(d.notes)}</p>` : ""}
    <table>${rows}</table>
  </section>`;
        })
        .join("");

    const bookingRows = bookings
        .map(
            (b) => `<tr>
      <td>${esc(BOOKING_KIND[b.kind].label)}</td>
      <td>${esc(b.provider)}</td>
      <td>${esc(b.reference || "—")}</td>
      <td>${esc(new Date(b.startAt).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }))}</td>
    </tr>`,
        )
        .join("");

    return `<!doctype html>
<html lang="en"><head><meta charset="utf-8" />
<title>${esc(trip.title)} — itinerary</title>
<style>
  @page { margin: 18mm 16mm; }
  * { box-sizing: border-box; }
  body { font: 13px/1.55 -apple-system, "Segoe UI", system-ui, sans-serif; color: #24242c; margin: 0; }
  header { border-bottom: 2px solid #3e4a3a; padding-bottom: 14px; margin-bottom: 20px; }
  h1 { font: 600 26px/1.2 Georgia, "Times New Roman", serif; margin: 0 0 4px; color: #2f392d; }
  .sub { color: #5d5d68; font-size: 13px; }
  .who { margin-top: 8px; font-size: 12px; color: #5d5d68; }
  .day { break-inside: avoid; margin-bottom: 18px; }
  .day h2 { font: 600 15px/1.3 Georgia, serif; margin: 0 0 6px; color: #3e4a3a; border-bottom: 1px solid #e2e0d8; padding-bottom: 4px; }
  .dn { margin: 0 0 6px; color: #5d5d68; font-size: 12px; font-style: italic; }
  table { width: 100%; border-collapse: collapse; }
  td { vertical-align: top; padding: 5px 0; border-bottom: 1px dotted #e2e0d8; }
  td.t { width: 62px; color: #5d5d68; font-variant-numeric: tabular-nums; white-space: nowrap; }
  .ti { font-weight: 600; }
  .cost { float: right; font-weight: 400; color: #8c6722; }
  .pl, .nt { color: #5d5d68; font-size: 12px; }
  .nt { font-style: italic; }
  a { color: #3e4a3a; }
  h3 { font: 600 14px/1.3 Georgia, serif; margin: 22px 0 6px; }
  .bk td { font-size: 12px; padding: 4px 8px 4px 0; }
  footer { margin-top: 24px; border-top: 1px solid #e2e0d8; padding-top: 10px; color: #8a8a95; font-size: 11px; }
  @media print { .noprint { display: none; } }
</style></head>
<body>
  <header>
    <h1>${esc(trip.title)}</h1>
    <div class="sub">${esc(trip.destination)} · ${esc(tripDates(trip))} · ${esc(TRIP_KIND[trip.kind].label)}</div>
    <div class="who">Travelling: ${esc(people.filter((p) => p.role === "traveller").map((p) => name(p.memberId)).join(", ") || "—")}${
        people.some((p) => p.role === "host") ? ` · Hosted by ${esc(people.filter((p) => p.role === "host").map((p) => name(p.memberId)).join(", "))}` : ""
    }</div>
  </header>
  ${dayBlocks || "<p>No itinerary yet.</p>"}
  ${bookingRows ? `<h3>Bookings</h3><table class="bk">${bookingRows}</table>` : ""}
  <footer>Printed from Wàfè · ${esc(new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }))}</footer>
</body></html>`;
}

// ---------------------------------------------------------------------------
// Shared surfaces
// ---------------------------------------------------------------------------

const AREA = "live" as const;

export function dashboard(state: TravelState, ctx: RepoContext): DashboardContribution {
    const today = ctx.today;
    const agenda: AgendaItem[] = [];
    const attention: AttentionItem[] = [];
    const rings: ProgressRing[] = [];
    const childCards: ChildCard[] = [];
    const { current } = sortedTrips(state, today);
    const next = nextTrip(state, today);
    const name = (id: string): string => ctx.members.find((m) => m.id === id)?.name.split(" ")[0] ?? "Someone";

    // Today's itinerary, but only while we are actually away.
    if (current) {
        const day = daysOf(state, current.id).find((d) => d.date === today);
        if (day) {
            for (const [n, item] of itemsOfDay(state, day.id).entries()) {
                agenda.push({
                    id: `itin-${item.id}`,
                    moduleId: "travel",
                    area: AREA,
                    title: item.title,
                    meta: item.place ? `${current.title} · ${item.place}` : current.title,
                    memberId: null,
                    at: item.time ? `${today}T${item.time}:00` : null,
                    done: item.done,
                    href: itineraryHref(current.id),
                    sort: item.time ? Number(item.time.replace(":", "")) : 2400 + n,
                });
            }
        }
    }

    for (const trip of state.trips) {
        if (!trip.startDate || trip.status === "done") continue;
        const away = daysBetween(today, trip.startDate);
        if (away < -60) continue;

        // AC 3 — a passport that does not clear six months is raised immediately.
        for (const r of passportRisks(state, trip, today)) {
            attention.push({
                id: `passport-${trip.id}-${r.memberId}`,
                moduleId: "travel",
                area: AREA,
                tone: r.expiredBeforeTravel || r.monthsClear < 0 ? "danger" : "warn",
                title: `${name(r.memberId)}'s passport won't clear ${trip.destination}`,
                body: r.expiredBeforeTravel
                    ? `It expires ${shortDate(r.expiry)}, before we even fly. Renew it now.`
                    : `It expires ${shortDate(r.expiry)} — ${r.monthsClear} month${r.monthsClear === 1 ? "" : "s"} after we come home, and ${trip.destination} wants six.`,
                href: tripHref(trip.id),
                weight: r.expiredBeforeTravel ? 96 : 88,
            });
        }

        // The run-up, once it is close enough to matter.
        if (away <= 14 && away >= 0) {
            const check = checklistProgress(state, trip, today);
            if (check.total && check.done < check.total && (away <= 7 || check.overdue.length)) {
                attention.push({
                    id: `checklist-${trip.id}`,
                    moduleId: "travel",
                    area: AREA,
                    tone: check.overdue.length ? "warn" : "info",
                    title: `${trip.title}: ${check.total - check.done} thing${check.total - check.done === 1 ? "" : "s"} left before we go`,
                    body: check.overdue.length ? `${check.overdue.length} of them were due already — ${check.overdue[0].item.toLowerCase()}.` : `We leave in ${away === 0 ? "hours" : `${away} days`}.`,
                    href: tripHref(trip.id),
                    weight: check.overdue.length ? 80 : 66,
                });
            }
            const unconfirmed = bookingsOf(state, trip.id).filter((b) => !b.confirmed);
            if (unconfirmed.length && ctx.role === "parent") {
                attention.push({
                    id: `bookings-${trip.id}`,
                    moduleId: "travel",
                    area: AREA,
                    tone: "warn",
                    title: `${unconfirmed.length} booking${unconfirmed.length === 1 ? "" : "s"} still unconfirmed`,
                    body: `${unconfirmed.map((b) => b.provider).join(", ")} — for ${trip.title}, ${away} day${away === 1 ? "" : "s"} away.`,
                    href: tripHref(trip.id),
                    weight: 74,
                });
            }
        }
    }

    // AC 5's other half, on the dashboard rather than in the inbox.
    for (const { doc, daysLeft } of expiringDocs(state, today, 90)) {
        if (daysLeft < -30) continue;
        attention.push({
            id: `doc-${doc.id}`,
            moduleId: "travel",
            area: AREA,
            tone: daysLeft <= 30 ? "danger" : "warn",
            title: daysLeft < 0 ? `${name(doc.memberId)}'s ${DOC_KIND[doc.kind].label.toLowerCase()} has expired` : `${name(doc.memberId)}'s ${DOC_KIND[doc.kind].label.toLowerCase()} expires in ${daysLeft} days`,
            body: `${doc.label || DOC_KIND[doc.kind].label} · ${shortDate(doc.expiresAt!)}. Renewals take longer than anyone expects.`,
            href: next ? tripHref(next.id) : HREF,
            weight: daysLeft <= 30 ? 84 : 62,
        });
    }

    if (next) {
        const r = readiness(state, next, today);
        rings.push({
            id: `ready-${next.id}`,
            moduleId: "travel",
            area: AREA,
            label: next.title,
            pct: r.pct,
            sub: `${tripWhen(next, today)} · ${next.destination}`,
            href: tripHref(next.id),
        });

        if (ctx.role === "child") {
            const list = listFor(state, next.id, ctx.me.id);
            if (list?.generatedAt) {
                const c = packedCount(state, list.id);
                childCards.push({
                    id: `packing-${next.id}`,
                    moduleId: "travel",
                    area: AREA,
                    title: "Your packing list",
                    body: c.total ? `${c.done} of ${c.total} things packed for ${next.title}.` : `Nothing on your list for ${next.title} yet.`,
                    emoji: "🧳",
                    href: packingHref(next.id),
                    pct: c.pct,
                    done: c.total > 0 && c.done === c.total,
                });
            } else {
                childCards.push({
                    id: `trip-${next.id}`,
                    moduleId: "travel",
                    area: AREA,
                    title: next.title,
                    body: `${tripWhen(next, today)} · ${next.destination}. Have a look at what we're doing.`,
                    emoji: TRIP_KIND[next.kind].emoji,
                    href: itineraryHref(next.id),
                });
            }
        }
    }

    return { agenda, attention, rings, childCards };
}

export function nudges(state: TravelState, ctx: RepoContext): Nudge[] {
    if (ctx.role !== "parent") return [];
    const today = ctx.today;
    const out: Nudge[] = [];
    const name = (id: string): string => ctx.members.find((m) => m.id === id)?.name.split(" ")[0] ?? "Someone";

    for (const trip of state.trips) {
        if (!trip.startDate || trip.status === "done" || trip.status === "dreaming") continue;
        const away = daysBetween(today, trip.startDate);
        if (away < 0) continue;
        const check = checklistProgress(state, trip, today);

        // The run-up opens at T-14 and is chased once, at T-14, T-7, T-3, T-1.
        for (const t of [14, 7, 3, 1]) {
            if (away > t || check.total === 0 || check.done >= check.total) continue;
            out.push({
                key: `trip-checklist-${trip.id}-t${t}`,
                moduleId: "travel",
                kind: "travel",
                title: `${trip.title}: ${check.total - check.done} left on the list`,
                body: t === 1 ? "We fly tomorrow. Charge everything and check the bags." : `T-minus ${t} days. ${check.overdue.length ? `${check.overdue.length} already overdue.` : "Nothing overdue yet."}`,
                href: tripHref(trip.id),
                memberIds: [],
            });
            break;
        }

        // AC 1 — the lists are generated at T-14, and the family is told.
        if (away <= 14) {
            const p = packingProgress(state, trip.id);
            if (p.generated < p.travellers) {
                out.push({
                    key: `trip-packing-${trip.id}`,
                    moduleId: "travel",
                    kind: "travel",
                    title: `Packing lists for ${trip.title}`,
                    body: `${p.travellers - p.generated} traveller${p.travellers - p.generated === 1 ? "" : "s"} still without a list. One tap makes them all.`,
                    href: packingHref(trip.id),
                    memberIds: [],
                });
            }
        }

        for (const r of passportRisks(state, trip, today)) {
            out.push({
                key: `trip-passport-${trip.id}-${r.memberId}`,
                moduleId: "travel",
                kind: "travel",
                title: `${name(r.memberId)}'s passport and ${trip.destination}`,
                body: `It expires ${shortDate(r.expiry)} — ${r.monthsClear} month${r.monthsClear === 1 ? "" : "s"} clear of our return. Six are wanted.`,
                href: tripHref(trip.id),
                memberIds: [],
            });
        }
    }

    // AC 5 — 90 days, then 30. Two keys, so both fire, each exactly once.
    for (const { doc, daysLeft } of expiringDocs(state, today, 90)) {
        const window = daysLeft <= 30 ? 30 : 90;
        out.push({
            key: `travel-doc-expiry-${window}-${doc.id}`,
            moduleId: "travel",
            kind: "travel",
            title: `${name(doc.memberId)}'s ${DOC_KIND[doc.kind].label.toLowerCase()} expires ${daysLeft < 0 ? "already" : `in ${daysLeft} days`}`,
            body: `${doc.label || DOC_KIND[doc.kind].label} · ${shortDate(doc.expiresAt!)}. ${window === 30 ? "This is the last reminder before it lapses." : "Renewing now costs nothing but a form."}`,
            href: HREF,
            memberIds: [],
        });
    }

    return out;
}

export function aiContext(state: TravelState, ctx: RepoContext): string {
    if (!state.trips.length) return "";
    const today = ctx.today;
    const parent = ctx.role === "parent";
    const name = (id: string): string => ctx.members.find((m) => m.id === id)?.name.split(" ")[0] ?? "someone";
    const lines: string[] = [];
    const { current, upcoming, dreaming, past } = sortedTrips(state, today);

    const describe = (t: Trip): string => {
        const people = travellingOn(state, t.id).map((x) => name(x.memberId));
        const check = checklistProgress(state, t, today);
        const p = packingProgress(state, t.id);
        const bits = [`${t.title} — ${t.destination}, ${tripDates(t)} (${tripWhen(t, today)}), ${t.status}`, `travelling: ${people.join(", ") || "nobody yet"}`];
        if (check.total) bits.push(`run-up ${check.done}/${check.total} done${check.overdue.length ? `, ${check.overdue.length} overdue` : ""}`);
        if (p.travellers) bits.push(`packing lists ${p.generated}/${p.travellers}${p.items ? `, ${p.packed}/${p.items} items packed` : ""}`);
        if (parent && t.budgetCents) bits.push(`budget ${money(t.budgetCents, ctx.space.currency)}, spent ${money(tripSpend(state, t.id), ctx.space.currency)}`);
        return bits.join("; ");
    };

    if (current) lines.push(`Away right now: ${describe(current)}`);
    for (const t of upcoming.slice(0, 2)) lines.push(`Coming up: ${describe(t)}`);
    if (dreaming.length) lines.push(`Dreaming about: ${dreaming.map((t) => `${t.title} (${t.destination})`).join("; ")}.`);
    if (past.length) lines.push(`Been: ${past.slice(0, 2).map((t) => `${t.title}, ${tripDates(t)}`).join("; ")}.`);

    if (parent) {
        const risks = state.trips.flatMap((t) => passportRisks(state, t, today));
        if (risks.length) lines.push(`Passport warnings: ${risks.map((r) => `${name(r.memberId)} expires ${shortDate(r.expiry)} (${r.monthsClear} months clear)`).join("; ")}.`);
        const docs = expiringDocs(state, today, 90);
        if (docs.length) lines.push(`Documents expiring: ${docs.map((d) => `${name(d.doc.memberId)}'s ${DOC_KIND[d.doc.kind].label.toLowerCase()} in ${d.daysLeft} days`).join("; ")}.`);
    } else {
        lines.push("Money, booking references, passport numbers and travel documents are not in this summary and must never be guessed at.");
    }

    const open = current ?? upcoming[0];
    if (open) {
        const todayDay = daysOf(state, open.id).find((d) => d.date === today);
        if (todayDay) lines.push(`Today's plan: ${itemsOfDay(state, todayDay.id).map((i) => `${i.time || "—"} ${i.title}`).join("; ")}.`);
    }

    return lines.join("\n").slice(0, 1500);
}

export function search(state: TravelState, q: string): Array<{ title: string; meta: string; href: string }> {
    const needle = q.toLowerCase();
    const hit = (s: string): boolean => s.toLowerCase().includes(needle);
    const out: Array<{ title: string; meta: string; href: string }> = [];

    for (const t of state.trips) {
        if (hit(t.title) || hit(t.destination) || hit(t.notes)) out.push({ title: t.title, meta: `Trip · ${t.destination} · ${tripDates(t)}`, href: tripHref(t.id) });
    }
    for (const i of state.items) {
        if (!hit(i.title) && !hit(i.place)) continue;
        const trip = state.trips.find((t) => t.id === i.tripId);
        if (!trip) continue;
        out.push({ title: i.title, meta: `Itinerary · ${trip.title}${i.place ? ` · ${i.place}` : ""}`, href: itineraryHref(trip.id) });
    }
    for (const b of state.bookings) {
        if (!hit(b.provider) && !hit(b.reference)) continue;
        const trip = state.trips.find((t) => t.id === b.tripId);
        if (!trip) continue;
        out.push({ title: `${BOOKING_KIND[b.kind].label} · ${b.provider}`, meta: `Booking · ${trip.title}`, href: tripHref(trip.id) });
    }
    for (const p of state.packItems) {
        if (!hit(p.item)) continue;
        const list = state.lists.find((l) => l.id === p.listId);
        const trip = list ? state.trips.find((t) => t.id === list.tripId) : undefined;
        if (!trip) continue;
        out.push({ title: p.item, meta: `Packing · ${trip.title} · ${PACK_CATEGORY[p.category].label}`, href: packingHref(trip.id) });
    }
    return out.slice(0, 12);
}
