import type { ModuleRepo, Visibility } from "@/data/core";

/**
 * Travel & holiday planner — plan a trip well and arrive prepared.
 *
 * A TRIP is the object a family shares; everything else hangs off it:
 *
 *   TRAVELLERS   who is going (including guests), with the one fact that ruins
 *                a holiday when nobody checks it: passport expiry.
 *   DAYS + ITEMS the itinerary, a day at a time, each item with a place that
 *                becomes a maps deep link and an optional cost.
 *   BOOKINGS     flights, stays, cars, tickets, insurance — with a reference,
 *                a cost and a SENSITIVITY, because a booking reference is not
 *                a thing a nine-year-old needs.
 *   DOCUMENTS    passports, visas, insurance certificates. Sensitivity is
 *                always `documents`, which means parents only — in the filter
 *                AND in the RLS policy, so a child's session cannot fetch one.
 *   PACKING      one list per traveller, generated from a template for their
 *                age band and the trip's climate, with items that may point
 *                back at a real wardrobe record.
 *   CHECKLIST    the pre-trip run-up at T-14 / T-7 / T-3 / T-1.
 *   EXPENSES     what the trip actually cost, in the currency it was spent in,
 *                converted to the family's currency for the ledger.
 *
 * ---------------------------------------------------------------------------
 * THREE DECISIONS RECORDED HERE, because they are departures from the brief:
 *
 * 1. MAPS ARE LINKS, NOT EMBEDS. The brief asks for interactive maps. The
 *    app's content-security policy allows exactly three third parties (the
 *    YouTube IFrame player, the AI gateway and the image API), so an embedded
 *    map — Google, Mapbox, Leaflet tiles — cannot load and would render as a
 *    silent empty box. A "map link" here is therefore a precise definition, not
 *    a hand-wave: a deep link built by `mapLink()` in derive.ts that opens the
 *    device's own maps app at `?api=1&query=<lat,lng>` when the item has
 *    coordinates and at `?api=1&query=<url-encoded address>` when it does not,
 *    with an Apple Maps equivalent beside it on iOS. The place is always
 *    resolvable; the tiles simply belong to the device.
 *
 * 2. GUESTS ARE READ-ONLY. The permissions matrix in `lib/perms.ts` gives a
 *    guest `travel.view` and nothing else, and the brief's guest tier is "view"
 *    throughout. So a guest traveller reads the itinerary and reads their own
 *    packing list; ticking it is a write, and a write needs the `travel.manage`
 *    grant a parent can hand a specific guest from Family → Permissions. That
 *    keeps one rule ("guests are granted named objects, read-only, unless a
 *    parent says otherwise") instead of a per-module exception.
 *
 * 3. MONEY IS MULTI-CURRENCY AT THE EDGE, SINGLE-CURRENCY IN THE LEDGER. A
 *    trip to Lagos is paid for in naira. Every cost row therefore carries the
 *    amount as it was spent (`amountCents` + `currency`) plus the rate used
 *    (`fxRate`) and the converted amount in the family's own currency
 *    (`homeCents`). Budgets, totals and anything the Finance module reads use
 *    `homeCents` only, so the giving-percentage and budget sums stay in one
 *    currency exactly as they assume.
 */

// ---------------------------------------------------------------------------
// Vocabulary
// ---------------------------------------------------------------------------

export type TripKind = "holiday" | "visit" | "school-trip" | "day-out";

export const TRIP_KIND: Record<TripKind, { label: string; emoji: string; note: string }> = {
    holiday: { label: "Holiday", emoji: "🏝️", note: "Away for a stretch — flights, a stay, a packing list each." },
    visit: { label: "Visiting family", emoji: "🏠", note: "Staying with people we love. Gifts matter more than guidebooks." },
    "school-trip": { label: "School trip", emoji: "🎒", note: "One child, a kit list and a consent form." },
    "day-out": { label: "Day out", emoji: "🚗", note: "Back before bedtime. Tickets, snacks, wellies." },
};

export const TRIP_KINDS: TripKind[] = ["holiday", "visit", "school-trip", "day-out"];

export type TripStatus = "dreaming" | "planning" | "booked" | "done";

export const TRIP_STATUS: Record<TripStatus, { label: string; note: string }> = {
    dreaming: { label: "Dreaming", note: "An idea we keep coming back to." },
    planning: { label: "Planning", note: "Dates roughly known, nothing paid for." },
    booked: { label: "Booked", note: "Paid for and happening." },
    done: { label: "Been", note: "Home again — and there is an album." },
};

export const TRIP_STATUSES: TripStatus[] = ["dreaming", "planning", "booked", "done"];

/** A traveller travels; a host receives us and sees the plan without packing for it. */
export type TravellerRole = "traveller" | "host";

export type BookingKind = "flight" | "stay" | "car" | "transport" | "ticket" | "insurance" | "other";

export const BOOKING_KIND: Record<BookingKind, { label: string; emoji: string }> = {
    flight: { label: "Flight", emoji: "✈️" },
    stay: { label: "Stay", emoji: "🛏️" },
    car: { label: "Car hire", emoji: "🚗" },
    transport: { label: "Transport", emoji: "🚆" },
    ticket: { label: "Ticket", emoji: "🎟️" },
    insurance: { label: "Insurance", emoji: "🛡️" },
    other: { label: "Other", emoji: "📌" },
};

export const BOOKING_KINDS: BookingKind[] = ["flight", "stay", "car", "transport", "ticket", "insurance", "other"];

/**
 * The sensitivity class from the brief, applied to travel rows.
 *   general    — the itinerary, the place, the times. Everyone on the trip.
 *   financial  — what it cost. Parents (and anyone granted finance.view).
 *   documents  — passport numbers, visas, certificates. Parents only, always.
 */
export type Sensitivity = "general" | "financial" | "documents";

export type DocKind = "passport" | "visa" | "insurance" | "ticket" | "vaccination" | "licence" | "other";

export const DOC_KIND: Record<DocKind, { label: string; emoji: string }> = {
    passport: { label: "Passport", emoji: "🛂" },
    visa: { label: "Visa", emoji: "📄" },
    insurance: { label: "Travel insurance", emoji: "🛡️" },
    ticket: { label: "Ticket", emoji: "🎫" },
    vaccination: { label: "Vaccination record", emoji: "💉" },
    licence: { label: "Driving licence", emoji: "🪪" },
    other: { label: "Other document", emoji: "📎" },
};

export const DOC_KINDS: DocKind[] = ["passport", "visa", "insurance", "ticket", "vaccination", "licence", "other"];

/** The packing templates a family actually uses, keyed by climate/occasion. */
export type PackingTemplate = "warm" | "cold" | "city" | "beach" | "school-trip" | "day-out";

export const PACKING_TEMPLATE: Record<PackingTemplate, { label: string; note: string }> = {
    warm: { label: "Hot country", note: "Light layers, sun cream, mosquito spray, adapters." },
    cold: { label: "Cold and wet", note: "Waterproofs, boots, thermals, a hot-water bottle." },
    city: { label: "City break", note: "Comfortable shoes, one smart outfit, a day bag." },
    beach: { label: "Beach", note: "Swimming things, towels, buckets, spare everything." },
    "school-trip": { label: "School trip", note: "The school's kit list, named and packed by the child." },
    "day-out": { label: "Day out", note: "Snacks, water, wellies, a change of clothes." },
};

export const PACKING_TEMPLATES: PackingTemplate[] = ["warm", "cold", "city", "beach", "school-trip", "day-out"];

/** Packing items group under these, so a list reads like a suitcase and not a spreadsheet. */
export type PackItemCategory = "clothes" | "toiletries" | "documents" | "tech" | "medical" | "gifts" | "kids" | "other";

export const PACK_CATEGORY: Record<PackItemCategory, { label: string; emoji: string }> = {
    clothes: { label: "Clothes", emoji: "👕" },
    toiletries: { label: "Toiletries", emoji: "🧴" },
    documents: { label: "Papers", emoji: "🛂" },
    tech: { label: "Tech", emoji: "🔌" },
    medical: { label: "Medicines", emoji: "💊" },
    gifts: { label: "Gifts", emoji: "🎁" },
    kids: { label: "For the little ones", emoji: "🧸" },
    other: { label: "Everything else", emoji: "🎒" },
};

export const PACK_CATEGORIES: PackItemCategory[] = ["clothes", "toiletries", "documents", "tech", "medical", "gifts", "kids", "other"];

/** How long before departure a checklist item is due (T-14 … T-0). */
export const CHECKLIST_OFFSETS: number[] = [14, 7, 3, 1, 0];

// ---------------------------------------------------------------------------
// Rows
// ---------------------------------------------------------------------------

export interface Trip {
    id: string;
    spaceId: string;
    title: string;
    destination: string;
    /** "NG", "GB", "FR" — drives the passport-validity rule (six months for Nigeria). */
    countryCode: string;
    kind: TripKind;
    status: TripStatus;
    /** ISO dates; a dreaming trip may have neither. */
    startDate: string | null;
    endDate: string | null;
    coverUrl: string | null;
    notes: string;
    /** Minor units in the SPACE's currency (see the money note at the top). */
    budgetCents: number | null;
    /** The Finance module's stable budget key this trip's spending posts to. */
    financeCategoryId: string;
    financeCategoryLabel: string;
    /** The currency spent at the destination, when it differs from home. */
    localCurrency: string;
    /** Local → home rate used for the trip's own conversions (1 home = fxRate local). */
    fxRate: number;
    /** A family value this trip serves ("Love", "Joy"), by label. */
    valueId: string | null;
    /** The Memories album created when we came home. */
    albumId: string | null;
    albumTitle: string;
    /** The packing template new lists are generated from. */
    template: PackingTemplate;
    visibility: Visibility;
    sharedWith: string[];
    createdBy: string;
    createdAt: string;
    updatedAt: string;
}

export interface Traveller {
    id: string;
    tripId: string;
    memberId: string;
    role: TravellerRole;
    /** ISO date. Parents only — it is stripped from a child's and a guest's slice. */
    passportExpiry: string | null;
    notes: string;
}

export interface ItineraryDay {
    id: string;
    tripId: string;
    /** ISO date. */
    date: string;
    title: string;
    notes: string;
}

export interface ItineraryItem {
    id: string;
    tripId: string;
    dayId: string;
    /** "09:30", or "" for "sometime today". */
    time: string;
    title: string;
    /** A postal address or a place name — whatever a maps app can find. */
    place: string;
    /** "6.4419,3.5406" when we know it; the deep link prefers this. */
    coords: string | null;
    notes: string;
    bookingRef: string;
    /** In the trip's LOCAL currency; see the money note at the top of this file. */
    costCents: number;
    order: number;
    done: boolean;
}

export interface Booking {
    id: string;
    tripId: string;
    kind: BookingKind;
    provider: string;
    reference: string;
    startAt: string;
    endAt: string | null;
    /** Home currency, minor units. */
    costCents: number;
    link: string;
    /** A photo of the confirmation; a data URL in the demo, storage in live. */
    imageUrl: string | null;
    confirmed: boolean;
    sensitivity: Sensitivity;
    notes: string;
}

export interface TravelDoc {
    id: string;
    /** Null for a document that is not about one trip (a passport). */
    tripId: string | null;
    memberId: string;
    kind: DocKind;
    label: string;
    /** Shown masked; only the last four characters ever reach the screen. */
    number: string;
    expiresAt: string | null;
    imageUrl: string | null;
    notes: string;
    /** Always "documents". Kept on the row so the filter reads the row, not the table name. */
    sensitivity: Sensitivity;
}

export interface PackingList {
    id: string;
    tripId: string;
    memberId: string;
    template: PackingTemplate;
    /** Null until it has been generated — that is what "4 of 6 generated" counts. */
    generatedAt: string | null;
}

export interface PackingItem {
    id: string;
    listId: string;
    item: string;
    qty: number;
    category: PackItemCategory;
    /** The Wardrobe module's item id, when this came from a capsule. */
    wardrobeItemId: string | null;
    /** What to show when the Wardrobe slice is not loaded ("Ankara dress · Lagos capsule"). */
    wardrobeLabel: string;
    checked: boolean;
    order: number;
}

export interface ChecklistItem {
    id: string;
    tripId: string;
    item: string;
    note: string;
    /** Days before departure it is due: 14, 7, 3, 1, 0. */
    dueOffsetDays: number;
    ownerMemberId: string | null;
    doneAt: string | null;
}

export interface TripExpense {
    id: string;
    tripId: string;
    label: string;
    /** As spent, in `currency`. */
    amountCents: number;
    currency: string;
    /** 1 home unit = fxRate units of `currency`. 1 when they are the same. */
    fxRate: number;
    /** The converted amount in the space's currency — the only number that is summed. */
    homeCents: number;
    financeCategoryId: string;
    /** Who paid. */
    memberId: string;
    date: string;
    note: string;
    /** When it was posted to the family ledger. */
    postedAt: string | null;
}

export interface TravelState {
    trips: Trip[];
    travellers: Traveller[];
    days: ItineraryDay[];
    items: ItineraryItem[];
    bookings: Booking[];
    docs: TravelDoc[];
    lists: PackingList[];
    packItems: PackingItem[];
    checklist: ChecklistItem[];
    expenses: TripExpense[];
}

export const EMPTY_STATE: TravelState = {
    trips: [],
    travellers: [],
    days: [],
    items: [],
    bookings: [],
    docs: [],
    lists: [],
    packItems: [],
    checklist: [],
    expenses: [],
};

// ---------------------------------------------------------------------------
// Writes
// ---------------------------------------------------------------------------

export interface NewTrip {
    title: string;
    destination: string;
    countryCode?: string;
    kind?: TripKind;
    status?: TripStatus;
    startDate?: string | null;
    endDate?: string | null;
    coverUrl?: string | null;
    notes?: string;
    budgetCents?: number | null;
    financeCategoryId?: string;
    financeCategoryLabel?: string;
    localCurrency?: string;
    fxRate?: number;
    valueId?: string | null;
    template?: PackingTemplate;
    visibility?: Visibility;
    sharedWith?: string[];
    /** Member ids to add as travellers straight away. */
    travellerIds?: string[];
}

export type TripPatch = Partial<Omit<Trip, "id" | "spaceId" | "createdBy" | "createdAt">>;

export interface NewItineraryItem {
    dayId: string;
    title: string;
    time?: string;
    place?: string;
    coords?: string | null;
    notes?: string;
    bookingRef?: string;
    costCents?: number;
}

export interface NewBooking {
    kind: BookingKind;
    provider: string;
    reference?: string;
    startAt: string;
    endAt?: string | null;
    costCents?: number;
    link?: string;
    imageUrl?: string | null;
    confirmed?: boolean;
    sensitivity?: Sensitivity;
    notes?: string;
}

export interface NewDoc {
    memberId: string;
    kind: DocKind;
    label?: string;
    number?: string;
    expiresAt?: string | null;
    imageUrl?: string | null;
    notes?: string;
    tripId?: string | null;
}

export interface NewPackingItem {
    item: string;
    qty?: number;
    category?: PackItemCategory;
    wardrobeItemId?: string | null;
    wardrobeLabel?: string;
}

export interface NewExpense {
    label: string;
    amountCents: number;
    currency?: string;
    fxRate?: number;
    memberId?: string;
    date?: string;
    note?: string;
}

export interface TravelRepo extends ModuleRepo<TravelState> {
    // Trips
    createTrip(input: NewTrip): Promise<Trip>;
    updateTrip(id: string, patch: TripPatch): Promise<void>;
    removeTrip(id: string): Promise<void>;
    setStatus(id: string, status: TripStatus): Promise<void>;
    /** Home again: mark it been, and open an album for the photos. */
    finishTrip(id: string, albumTitle?: string): Promise<string>;

    // Travellers
    addTraveller(tripId: string, memberId: string, role?: TravellerRole): Promise<void>;
    updateTraveller(id: string, patch: Partial<Pick<Traveller, "role" | "passportExpiry" | "notes">>): Promise<void>;
    removeTraveller(id: string): Promise<void>;

    // Itinerary
    addDay(tripId: string, date: string, title?: string): Promise<ItineraryDay>;
    updateDay(id: string, patch: Partial<Pick<ItineraryDay, "date" | "title" | "notes">>): Promise<void>;
    removeDay(id: string): Promise<void>;
    addItem(tripId: string, input: NewItineraryItem): Promise<ItineraryItem>;
    updateItem(id: string, patch: Partial<Omit<ItineraryItem, "id" | "tripId">>): Promise<void>;
    removeItem(id: string): Promise<void>;
    toggleItem(id: string): Promise<void>;

    // Bookings and documents
    addBooking(tripId: string, input: NewBooking): Promise<Booking>;
    updateBooking(id: string, patch: Partial<Omit<Booking, "id" | "tripId">>): Promise<void>;
    removeBooking(id: string): Promise<void>;
    addDoc(input: NewDoc): Promise<TravelDoc>;
    updateDoc(id: string, patch: Partial<Omit<TravelDoc, "id" | "sensitivity">>): Promise<void>;
    removeDoc(id: string): Promise<void>;

    // Packing
    /** Generate a list for every traveller who has none (AC 1). Returns how many were made. */
    generatePacking(tripId: string, template?: PackingTemplate): Promise<number>;
    generatePackingFor(tripId: string, memberId: string, template?: PackingTemplate): Promise<PackingList>;
    addPackingItem(listId: string, input: NewPackingItem): Promise<PackingItem>;
    /** The one write a child has, and the one that must survive being offline (AC 8). */
    setPackingChecked(itemId: string, checked: boolean): Promise<void>;
    removePackingItem(itemId: string): Promise<void>;
    clearPackingList(listId: string): Promise<void>;

    // Checklist
    addChecklistItem(tripId: string, item: string, dueOffsetDays: number, ownerMemberId?: string | null, note?: string): Promise<ChecklistItem>;
    setChecklistDone(id: string, done: boolean): Promise<void>;
    removeChecklistItem(id: string): Promise<void>;

    // Money
    addExpense(tripId: string, input: NewExpense): Promise<TripExpense>;
    removeExpense(id: string): Promise<void>;
}

// ---------------------------------------------------------------------------
// What Travel reads from other modules (loose + structural on purpose)
// ---------------------------------------------------------------------------

/**
 * The Wardrobe slice, read through `useModuleState("wardrobe")`. Deliberately
 * partial: a module that has not shipped yet contributes nothing rather than
 * breaking the packing screen, and Travel never touches Wardrobe's repo.
 */
export interface WardrobeSlice {
    items?: Array<{
        id: string;
        name?: string;
        title?: string;
        memberId?: string | null;
        ownerMemberId?: string | null;
        category?: string;
        imageUrl?: string | null;
        capsuleIds?: string[];
    }>;
    capsules?: Array<{
        id: string;
        name?: string;
        title?: string;
        memberId?: string | null;
        ownerMemberId?: string | null;
        itemIds?: string[];
        season?: string;
    }>;
}

/** The Finance slice — only the budget label for the trip's category is read. */
export interface FinanceSlice {
    budgets?: Array<{ id: string; label?: string; name?: string; limitCents?: number; spentCents?: number }>;
}

/** What Travel hands the Finance module back: one ledger line per posted expense. */
export interface TravelLedgerEntry {
    id: string;
    tripId: string;
    tripTitle: string;
    label: string;
    /** Always the space's currency. */
    amountCents: number;
    categoryId: string;
    memberId: string;
    date: string;
    /** Set when the row has been posted; Finance shows only posted rows. */
    postedAt: string | null;
    /** The original, for the receipt line: "₦48,000 at 1,850/£". */
    original: { amountCents: number; currency: string; fxRate: number } | null;
}
