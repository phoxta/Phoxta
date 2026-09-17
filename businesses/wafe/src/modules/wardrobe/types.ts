import type { ModuleRepo, Visibility } from "@/data/core";

/**
 * Wardrobe & closet manager — what everyone owns, what they are wearing, and
 * what has stopped fitting.
 *
 * The module exists because clothes are the household's highest-frequency
 * decision and its most wasteful one: a coat that fits nobody sits in a hall
 * cupboard for two winters while a size is bought twice. So five objects, and
 * one pipeline running through them:
 *
 *   ITEM      one garment, owned by one member, with a photo, a colour, a
 *             season, a size and a STATUS. The status is the pipeline: in use →
 *             outgrown → handed down (to the next child) or donated.
 *   OUTFIT    a named set of items for an occasion — "Sunday best", "Co-op
 *             Tuesday". Built on a canvas, not typed into a text field.
 *   SCHEDULE  one outfit per member per day. This is what makes the module
 *             worth opening on a Sunday evening: five children's weeks decided
 *             once, and "what am I wearing" answered before anyone asks.
 *   CAPSULE   a small set of items pulled out for a trip. Travel reads capsules
 *             through `useModuleState("wardrobe")` and turns them into packing
 *             items that keep the id of the real garment.
 *   HAND-DOWN the transfer record. Ownership moves; the history does not, so a
 *             coat can still say it was Tobi's first.
 *
 * ---------------------------------------------------------------------------
 * THREE DECISIONS RECORDED HERE, because they are departures from the obvious:
 *
 * 1. OUTGROWN IS ONE STEP, NOT THREE. Marking a garment outgrown is where the
 *    replacement is forgotten and the bag never reaches the charity shop, so
 *    `markOutgrown()` takes the whole decision at once — hand it down, raise a
 *    replacement wish, open a donate job — and writes all three in a single
 *    call. The screens never make a parent do it in three places.
 *
 * 2. THE WISH AND THE DONATE JOB LIVE HERE, NOT IN FINANCE AND TASKS. A module
 *    never writes another module's rows (CONTRACT.md), so Wardrobe owns the
 *    `ReplacementWish` and the `DonateJob` it creates and publishes them on its
 *    own state. Finance reads `wishes` (its `WishItem.sourceType` already has a
 *    `"wardrobe"` value) and Tasks reads `donations` (its `TaskSource` already
 *    has `"wardrobe"`); both match on the stable ids in this module's seed.
 *    The dashboard shows them either way, which is where a job is felt.
 *
 * 3. GIVING IS RECORDED, NOT ASSUMED. Completing a donate job does not silently
 *    post to the ledger. It offers it: `completeDonation(id, { estValueCents })`
 *    writes a `GivingEntry` only when the parent asks for one, because a bag
 *    left at a friend's house is generosity that the family's giving percentage
 *    should not claim.
 */

// ---------------------------------------------------------------------------
// Vocabulary
// ---------------------------------------------------------------------------

export type ItemCategory = "top" | "bottom" | "dress" | "outerwear" | "shoes" | "accessory" | "uniform" | "traditional" | "sleepwear" | "sportswear";

export const CATEGORY: Record<ItemCategory, { label: string; plural: string; emoji: string }> = {
    top: { label: "Top", plural: "Tops", emoji: "👕" },
    bottom: { label: "Bottom", plural: "Bottoms", emoji: "👖" },
    dress: { label: "Dress", plural: "Dresses", emoji: "👗" },
    outerwear: { label: "Outerwear", plural: "Coats", emoji: "🧥" },
    shoes: { label: "Shoes", plural: "Shoes", emoji: "👟" },
    accessory: { label: "Accessory", plural: "Accessories", emoji: "🧣" },
    uniform: { label: "Uniform", plural: "Uniform", emoji: "🎒" },
    traditional: { label: "Traditional", plural: "Traditional", emoji: "🌍" },
    sleepwear: { label: "Sleepwear", plural: "Sleepwear", emoji: "🌙" },
    sportswear: { label: "Sportswear", plural: "Sportswear", emoji: "🏃" },
};

export const CATEGORIES: ItemCategory[] = ["top", "bottom", "dress", "outerwear", "shoes", "accessory", "uniform", "traditional", "sleepwear", "sportswear"];

export type Season = "all" | "spring" | "summer" | "autumn" | "winter";

export const SEASON: Record<Season, { label: string; note: string }> = {
    all: { label: "All year", note: "Wears in any weather." },
    spring: { label: "Spring", note: "Mild, and it rains." },
    summer: { label: "Summer", note: "Hot days and Lagos." },
    autumn: { label: "Autumn", note: "Layers and a coat by half term." },
    winter: { label: "Winter", note: "Padded, lined, and gloves." },
};

export const SEASONS: Season[] = ["all", "spring", "summer", "autumn", "winter"];

/**
 * A fixed colour vocabulary, because "navy" and "dark blue" typed by two
 * people is two filters that should have been one. The hex is only ever used
 * for a swatch dot.
 */
export type Colour = "black" | "white" | "grey" | "navy" | "blue" | "green" | "red" | "pink" | "purple" | "yellow" | "orange" | "brown" | "beige" | "gold" | "multi";

export const COLOUR: Record<Colour, { label: string; hex: string; ring?: boolean }> = {
    black: { label: "Black", hex: "#1f2320" },
    white: { label: "White", hex: "#fbf8f2", ring: true },
    grey: { label: "Grey", hex: "#9a9a94" },
    navy: { label: "Navy", hex: "#27374d" },
    blue: { label: "Blue", hex: "#3f6f8f" },
    green: { label: "Green", hex: "#4f7a4a" },
    red: { label: "Red", hex: "#b53d33" },
    pink: { label: "Pink", hex: "#d98ca3" },
    purple: { label: "Purple", hex: "#6f5f9c" },
    yellow: { label: "Yellow", hex: "#e4b94a" },
    orange: { label: "Orange", hex: "#c0692b" },
    brown: { label: "Brown", hex: "#7a5a42" },
    beige: { label: "Beige", hex: "#d8c9ae" },
    gold: { label: "Gold", hex: "#c09040" },
    multi: { label: "Multi", hex: "linear-gradient(135deg,#b5563d,#c09040,#4f7a4a,#6f5f9c)" },
};

export const COLOURS: Colour[] = ["black", "white", "grey", "navy", "blue", "green", "red", "pink", "purple", "yellow", "orange", "brown", "beige", "gold", "multi"];

export type Occasion = "everyday" | "school" | "church" | "sport" | "party" | "travel" | "formal" | "play";

export const OCCASION: Record<Occasion, { label: string; emoji: string }> = {
    everyday: { label: "Everyday", emoji: "🙂" },
    school: { label: "School & co-op", emoji: "🎒" },
    church: { label: "Church", emoji: "⛪" },
    sport: { label: "Sport & swimming", emoji: "🏊" },
    party: { label: "Party", emoji: "🎉" },
    travel: { label: "Travel", emoji: "✈️" },
    formal: { label: "Formal", emoji: "👔" },
    play: { label: "Play & outdoors", emoji: "🌳" },
};

export const OCCASIONS: Occasion[] = ["everyday", "school", "church", "sport", "party", "travel", "formal", "play"];

/** The pipeline, in order. */
export type ItemStatus = "in-use" | "outgrown" | "donate" | "handed-down";

export const STATUS: Record<ItemStatus, { label: string; note: string; tone: "ok" | "warn" | "info" | "neutral" }> = {
    "in-use": { label: "In use", note: "Fits, and it is in the wardrobe.", tone: "ok" },
    outgrown: { label: "Outgrown", note: "Too small. Waiting on a decision.", tone: "warn" },
    donate: { label: "To donate", note: "In the bag for the charity shop.", tone: "info" },
    "handed-down": { label: "Handed down", note: "Now belongs to the next child.", tone: "neutral" },
};

// ---------------------------------------------------------------------------
// Entities
// ---------------------------------------------------------------------------

export interface WardrobeItem {
    id: string;
    spaceId: string;
    name: string;
    /** Whose garment it is. Never null: a coat in the hall belongs to someone. */
    ownerMemberId: string;
    category: ItemCategory;
    colour: Colour;
    season: Season;
    /** As the label reads: "Age 9-10", "UK 12", "Size 3". Free text on purpose. */
    size: string;
    brand: string;
    occasions: Occasion[];
    /** `/images/...` in the demo seed, a compressed data URL after an upload. */
    imageUrl: string | null;
    status: ItemStatus;
    favourite: boolean;
    /** In the wash — hidden from "what can I wear today" without being outgrown. */
    inLaundry: boolean;
    /** ISO date, null when it has never been logged. */
    lastWorn: string | null;
    wearCount: number;
    careNotes: string;
    notes: string;
    /** Capsules this garment has been pulled into (Travel reads this). */
    capsuleIds: string[];
    visibility: Visibility;
    sharedWith: string[];
    createdAt: string;
}

export interface Outfit {
    id: string;
    spaceId: string;
    name: string;
    memberId: string;
    occasion: Occasion;
    itemIds: string[];
    imageUrl: string | null;
    notes: string;
    /** The quick-fill target: "school uniform" fills a week from this one. */
    isUniform: boolean;
    lastWorn: string | null;
    createdBy: string;
    createdAt: string;
}

/** One member, one day, one outfit. */
export interface ScheduleEntry {
    id: string;
    spaceId: string;
    memberId: string;
    /** ISO date, YYYY-MM-DD. */
    date: string;
    outfitId: string;
    /** "Church", "Co-op", "Swimming" — what the day is, in the family's words. */
    eventLabel: string;
    note: string;
    /** Set when the day passed and it was actually worn. */
    wornAt: string | null;
}

/** A small set of clothes pulled out for a trip. Travel reads these. */
export interface Capsule {
    id: string;
    spaceId: string;
    name: string;
    /** Travel matches capsules to a traveller on this field. */
    memberId: string;
    /** The Travel module's trip id when it has been linked; the label always shows. */
    tripId: string | null;
    tripLabel: string;
    season: Season;
    itemIds: string[];
    notes: string;
    createdAt: string;
}

export interface HandDown {
    id: string;
    spaceId: string;
    itemId: string;
    /** Kept on the row so history survives the garment being deleted. */
    itemName: string;
    fromMemberId: string;
    toMemberId: string;
    note: string;
    at: string;
}

export type WishStatus = "open" | "sent" | "bought";

/** The replacement a parent asked for when something stopped fitting. */
export interface ReplacementWish {
    id: string;
    spaceId: string;
    /** The garment being replaced; null when the item has since been deleted. */
    itemId: string | null;
    name: string;
    forMemberId: string;
    size: string;
    priceCents: number;
    note: string;
    status: WishStatus;
    createdBy: string;
    createdAt: string;
}

/** The bag by the door, and who is taking it. */
export interface DonateJob {
    id: string;
    spaceId: string;
    title: string;
    itemIds: string[];
    charity: string;
    /** ISO date. */
    dueDate: string;
    assigneeMemberId: string;
    note: string;
    doneAt: string | null;
    /** Set once the parent chose to record it as giving. */
    givingEntryId: string | null;
    createdBy: string;
    createdAt: string;
}

/**
 * What Wardrobe hands the Finance module: one giving line per donation the
 * family chose to record. Finance reads it; Wardrobe never writes the ledger.
 */
export interface GivingEntry {
    id: string;
    spaceId: string;
    donationId: string;
    label: string;
    itemCount: number;
    /** Estimated resale value, in the space's currency, in minor units. */
    amountCents: number;
    /** The stable Finance budget id these land under. */
    budgetId: "giving";
    date: string;
    memberId: string;
    note: string;
}

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

export interface WardrobeState {
    items: WardrobeItem[];
    outfits: Outfit[];
    schedule: ScheduleEntry[];
    capsules: Capsule[];
    handdowns: HandDown[];
    wishes: ReplacementWish[];
    donations: DonateJob[];
    giving: GivingEntry[];
}

export const EMPTY_STATE: WardrobeState = {
    items: [],
    outfits: [],
    schedule: [],
    capsules: [],
    handdowns: [],
    wishes: [],
    donations: [],
    giving: [],
};

// ---------------------------------------------------------------------------
// Writes
// ---------------------------------------------------------------------------

export interface NewItem {
    name: string;
    ownerMemberId: string;
    category: ItemCategory;
    colour: Colour;
    season?: Season;
    size?: string;
    brand?: string;
    occasions?: Occasion[];
    imageUrl?: string | null;
    careNotes?: string;
    notes?: string;
    favourite?: boolean;
    visibility?: Visibility;
}

export type ItemPatch = Partial<Omit<WardrobeItem, "id" | "spaceId" | "createdAt" | "capsuleIds">>;

export interface NewOutfit {
    name: string;
    memberId: string;
    occasion: Occasion;
    itemIds: string[];
    imageUrl?: string | null;
    notes?: string;
    isUniform?: boolean;
}

export interface NewCapsule {
    name: string;
    memberId: string;
    tripId?: string | null;
    tripLabel?: string;
    season?: Season;
    itemIds?: string[];
    notes?: string;
}

/** The whole outgrown decision, taken once (AC 4). */
export interface OutgrownDecision {
    /** Hand it to this child instead of donating it. */
    handDownToMemberId?: string | null;
    /** Raise a replacement wish Finance can pick up. */
    replacement?: { name: string; size: string; priceCents?: number; note?: string } | null;
    /** Open a donate job (ignored when the garment is handed down). */
    donate?: { charity: string; dueDate?: string; assigneeMemberId?: string; note?: string } | null;
}

export interface OutgrownResult {
    wishId: string | null;
    donationId: string | null;
    handDownId: string | null;
}

export interface WardrobeRepo extends ModuleRepo<WardrobeState> {
    // Items
    addItem(input: NewItem): Promise<WardrobeItem>;
    updateItem(id: string, patch: ItemPatch): Promise<void>;
    removeItem(id: string): Promise<void>;
    setFavourite(id: string, on: boolean): Promise<void>;
    setLaundry(id: string, on: boolean): Promise<void>;
    /** Log a wear: bumps the count and the last-worn date. */
    markWorn(id: string, date?: string): Promise<void>;

    /** AC 3 — ownership moves to the next child, the history stays. */
    handDown(itemId: string, toMemberId: string, note?: string): Promise<HandDown>;
    /** AC 4 — outgrown, replacement and donate job in one call. */
    markOutgrown(itemId: string, decision: OutgrownDecision): Promise<OutgrownResult>;

    // Outfits
    createOutfit(input: NewOutfit): Promise<Outfit>;
    updateOutfit(id: string, patch: Partial<Omit<Outfit, "id" | "spaceId" | "createdAt" | "createdBy">>): Promise<void>;
    removeOutfit(id: string): Promise<void>;

    // Schedule
    /** Upsert: one entry per member per day. */
    setSchedule(memberId: string, date: string, outfitId: string, eventLabel?: string, note?: string): Promise<ScheduleEntry>;
    clearSchedule(memberId: string, date: string): Promise<void>;
    /** Quick-fill: the member's uniform outfit on every weekday of the week. */
    fillWeek(memberId: string, weekStartDate: string, outfitId: string, days?: number[], eventLabel?: string): Promise<number>;
    markScheduleWorn(id: string, worn: boolean): Promise<void>;

    // Capsules
    createCapsule(input: NewCapsule): Promise<Capsule>;
    updateCapsule(id: string, patch: Partial<Omit<Capsule, "id" | "spaceId" | "createdAt">>): Promise<void>;
    removeCapsule(id: string): Promise<void>;
    setCapsuleItems(id: string, itemIds: string[]): Promise<void>;

    // The outgrown pipeline
    updateWish(id: string, patch: Partial<Pick<ReplacementWish, "name" | "size" | "priceCents" | "note" | "status">>): Promise<void>;
    removeWish(id: string): Promise<void>;
    /** AC 7 — completing the job may write a Giving entry. */
    completeDonation(id: string, giving?: { amountCents: number; note?: string } | null): Promise<GivingEntry | null>;
    reopenDonation(id: string): Promise<void>;
    removeDonation(id: string): Promise<void>;
}

// ---------------------------------------------------------------------------
// What Wardrobe reads from other modules (loose + structural on purpose)
// ---------------------------------------------------------------------------

/**
 * The Travel slice, read through `useModuleState("travel")`. Deliberately
 * partial: Travel may not have shipped, and a capsule screen that breaks
 * because a sibling module is mid-build is a bad trade. Wardrobe never touches
 * Travel's repo — it reads trips to offer them as capsule targets, and reads
 * packing items to show that a garment is genuinely on a list (AC 2).
 */
export interface TravelSlice {
    trips?: Array<{ id: string; title?: string; destination?: string; startDate?: string | null; endDate?: string | null; status?: string }>;
    lists?: Array<{ id: string; tripId?: string; memberId?: string }>;
    packItems?: Array<{ id: string; listId?: string; item?: string; wardrobeItemId?: string | null; wardrobeLabel?: string; checked?: boolean }>;
}

/** The Tasks slice — only "is the donate job already on the board" is read. */
export interface TasksSlice {
    tasks?: Array<{ id: string; title?: string; sourceType?: string; sourceId?: string | null; doneAt?: string | null; status?: string }>;
}

/** The Finance slice — only "has the replacement wish been picked up" is read. */
export interface FinanceSlice {
    wishes?: Array<{ id: string; name?: string; sourceType?: string; sourceId?: string | null; status?: string }>;
}
