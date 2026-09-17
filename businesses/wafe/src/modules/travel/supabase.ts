import type { Member, RepoContext, Visibility } from "@/data/core";
import { supabase } from "@/lib/supabase";
import { canManage, canTickList, daysBetween, templateItems, toHome, tripNights, visibleTo } from "./derive";
import { applyQueue, cacheState, cachedState, enqueue, flush, isOffline } from "./offline";
import { checklistTemplate, templateFor } from "./templates";
import type {
    Booking,
    BookingKind,
    ChecklistItem,
    DocKind,
    ItineraryDay,
    ItineraryItem,
    NewBooking,
    NewDoc,
    NewExpense,
    NewItineraryItem,
    NewPackingItem,
    NewTrip,
    PackItemCategory,
    PackingItem,
    PackingList,
    PackingTemplate,
    Sensitivity,
    TravelDoc,
    TravelRepo,
    TravelState,
    Traveller,
    TravellerRole,
    Trip,
    TripExpense,
    TripKind,
    TripPatch,
    TripStatus,
} from "./types";

/**
 * The same travel shelf, live, under row-level security.
 *
 * The database is the real guard: `wf_travel_docs` is a parents-only table, so
 * a child's session cannot fetch a passport row even with a hand-written query
 * — that is what "documents never reach a child or a guest at the API" means
 * (AC 4). The slice is still run through the same `visibleTo()` the demo uses,
 * so the two modes cannot drift, and snake_case ↔ camelCase lives in this file
 * and nowhere else.
 *
 * Two things are specific to this module:
 *
 *  · OFFLINE (AC 8). Every successful load is mirrored to localStorage, and a
 *    failed load falls back to that mirror with the pending ticks applied. A
 *    tick made with no connection is queued and replayed on the next
 *    successful write or reconnection.
 *  · T-14. A parent's session generates the missing packing lists when a trip
 *    crosses fourteen days out, exactly as the demo does, so the behaviour is
 *    a property of the product and not of the storage.
 */

type Row = Record<string, unknown>;

const s = (v: unknown, d = ""): string => (typeof v === "string" ? v : d);
const n = (v: unknown, d = 0): number => (typeof v === "number" ? v : Number(v ?? d) || d);
const nul = (v: unknown): string | null => (typeof v === "string" && v ? v : null);
const iso = (v: unknown): string => (v ? new Date(v as string).toISOString() : new Date().toISOString());
const date = (v: unknown, d = ""): string => (typeof v === "string" && v ? v.slice(0, 10) : d);
const dateNul = (v: unknown): string | null => (typeof v === "string" && v ? v.slice(0, 10) : null);
const strs = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);
const vis = (v: unknown): Visibility => (v === "private" || v === "shared" || v === "child" ? v : "family");
const sens = (v: unknown): Sensitivity => (v === "financial" || v === "documents" ? v : "general");

function fail(where: string, error: { message: string } | null | undefined): void {
    if (error) throw new Error(`${where}: ${error.message}`);
}

const mapTrip = (r: Row): Trip => ({
    id: s(r.id),
    spaceId: s(r.space_id),
    title: s(r.title),
    destination: s(r.destination),
    countryCode: s(r.country_code, "GB"),
    kind: s(r.kind, "holiday") as TripKind,
    status: s(r.status, "planning") as TripStatus,
    startDate: dateNul(r.start_date),
    endDate: dateNul(r.end_date),
    coverUrl: nul(r.cover_url),
    notes: s(r.notes),
    budgetCents: r.budget_cents === null || r.budget_cents === undefined ? null : n(r.budget_cents),
    financeCategoryId: s(r.finance_category_id, "fun"),
    financeCategoryLabel: s(r.finance_category_label, "Trips & holidays"),
    localCurrency: s(r.local_currency, "GBP"),
    fxRate: n(r.fx_rate, 1) || 1,
    valueId: nul(r.value_id),
    albumId: nul(r.album_id),
    albumTitle: s(r.album_title),
    template: s(r.template, "city") as PackingTemplate,
    visibility: vis(r.visibility),
    sharedWith: strs(r.shared_with),
    createdBy: s(r.created_by),
    createdAt: iso(r.created_at),
    updatedAt: iso(r.updated_at ?? r.created_at),
});

const mapTraveller = (r: Row): Traveller => ({
    id: s(r.id),
    tripId: s(r.trip_id),
    memberId: s(r.member_id),
    role: s(r.role, "traveller") as TravellerRole,
    passportExpiry: dateNul(r.passport_expiry),
    notes: s(r.notes),
});

const mapDay = (r: Row): ItineraryDay => ({ id: s(r.id), tripId: s(r.trip_id), date: date(r.day_date), title: s(r.title), notes: s(r.notes) });

const mapItem = (r: Row): ItineraryItem => ({
    id: s(r.id),
    tripId: s(r.trip_id),
    dayId: s(r.day_id),
    time: s(r.at_time).slice(0, 5),
    title: s(r.title),
    place: s(r.place),
    coords: nul(r.coords),
    notes: s(r.notes),
    bookingRef: s(r.booking_ref),
    costCents: n(r.cost_cents),
    order: n(r.item_order),
    done: r.done === true,
});

const mapBooking = (r: Row): Booking => ({
    id: s(r.id),
    tripId: s(r.trip_id),
    kind: s(r.kind, "other") as BookingKind,
    provider: s(r.provider),
    reference: s(r.reference),
    startAt: iso(r.start_at),
    endAt: r.end_at ? iso(r.end_at) : null,
    costCents: n(r.cost_cents),
    link: s(r.link),
    imageUrl: nul(r.image_url),
    confirmed: r.confirmed === true,
    sensitivity: sens(r.sensitivity),
    notes: s(r.notes),
});

const mapDoc = (r: Row): TravelDoc => ({
    id: s(r.id),
    tripId: nul(r.trip_id),
    memberId: s(r.member_id),
    kind: s(r.kind, "other") as DocKind,
    label: s(r.label),
    number: s(r.doc_number),
    expiresAt: dateNul(r.expires_at),
    imageUrl: nul(r.image_url),
    notes: s(r.notes),
    sensitivity: "documents",
});

const mapList = (r: Row): PackingList => ({
    id: s(r.id),
    tripId: s(r.trip_id),
    memberId: s(r.member_id),
    template: s(r.template, "city") as PackingTemplate,
    generatedAt: r.generated_at ? iso(r.generated_at) : null,
});

const mapPackItem = (r: Row): PackingItem => ({
    id: s(r.id),
    listId: s(r.list_id),
    item: s(r.item),
    qty: n(r.qty, 1) || 1,
    category: s(r.category, "other") as PackItemCategory,
    wardrobeItemId: nul(r.wardrobe_item_id),
    wardrobeLabel: s(r.wardrobe_label),
    checked: r.checked === true,
    order: n(r.item_order),
});

const mapCheck = (r: Row): ChecklistItem => ({
    id: s(r.id),
    tripId: s(r.trip_id),
    item: s(r.item),
    note: s(r.note),
    dueOffsetDays: n(r.due_offset_days),
    ownerMemberId: nul(r.owner_member_id),
    doneAt: r.done_at ? iso(r.done_at) : null,
});

const mapExpense = (r: Row): TripExpense => ({
    id: s(r.id),
    tripId: s(r.trip_id),
    label: s(r.label),
    amountCents: n(r.amount_cents),
    currency: s(r.currency, "GBP"),
    fxRate: n(r.fx_rate, 1) || 1,
    homeCents: n(r.home_cents),
    financeCategoryId: s(r.finance_category_id, "fun"),
    memberId: s(r.member_id),
    date: date(r.spent_on),
    note: s(r.note),
    postedAt: r.posted_at ? iso(r.posted_at) : null,
});

export class SupabaseTravelRepo implements TravelRepo {
    constructor(private ctx: RepoContext) {}

    private get base() {
        return { organization_id: this.ctx.orgId, space_id: this.ctx.space.id };
    }

    private deny(): never {
        throw new Error("Not allowed");
    }

    private manage(): void {
        if (!canManage(this.ctx)) this.deny();
    }

    private member(id: string): Member | undefined {
        return this.ctx.members.find((m) => m.id === id);
    }

    // -- load ----------------------------------------------------------------

    private async fetchAll(): Promise<TravelState> {
        const spaceId = this.ctx.space.id;
        const [trips, travellers, days, items, bookings, docs, lists, packItems, checklist, expenses] = await Promise.all([
            supabase.from("wf_trips").select("*").eq("space_id", spaceId),
            supabase.from("wf_trip_travellers").select("*").eq("space_id", spaceId),
            supabase.from("wf_itinerary_days").select("*").eq("space_id", spaceId),
            supabase.from("wf_itinerary_items").select("*").eq("space_id", spaceId),
            supabase.from("wf_trip_bookings").select("*").eq("space_id", spaceId),
            // Parents-only at the policy: a child's session gets an empty set.
            supabase.from("wf_travel_docs").select("*").eq("space_id", spaceId),
            supabase.from("wf_packing_lists").select("*").eq("space_id", spaceId),
            supabase.from("wf_packing_items").select("*").eq("space_id", spaceId),
            supabase.from("wf_trip_checklist").select("*").eq("space_id", spaceId),
            supabase.from("wf_trip_expenses").select("*").eq("space_id", spaceId),
        ]);
        fail("trips", trips.error);
        fail("travellers", travellers.error);
        fail("itinerary days", days.error);
        fail("itinerary", items.error);
        fail("bookings", bookings.error);
        fail("packing lists", lists.error);
        fail("packing", packItems.error);
        fail("checklist", checklist.error);
        fail("trip expenses", expenses.error);
        // A documents error is never fatal — for a child it is simply "no".
        return {
            trips: ((trips.data ?? []) as Row[]).map(mapTrip),
            travellers: ((travellers.data ?? []) as Row[]).map(mapTraveller),
            days: ((days.data ?? []) as Row[]).map(mapDay),
            items: ((items.data ?? []) as Row[]).map(mapItem),
            bookings: ((bookings.data ?? []) as Row[]).map(mapBooking),
            docs: docs.error ? [] : ((docs.data ?? []) as Row[]).map(mapDoc),
            lists: ((lists.data ?? []) as Row[]).map(mapList),
            packItems: ((packItems.data ?? []) as Row[]).map(mapPackItem),
            checklist: ((checklist.data ?? []) as Row[]).map(mapCheck),
            expenses: ((expenses.data ?? []) as Row[]).map(mapExpense),
        };
    }

    async load(): Promise<TravelState> {
        // Anything queued from a hallway with no signal goes first, so the
        // slice we fetch already contains it.
        if (!isOffline()) await flush((t) => this.pushTick(t.itemId, t.checked)).catch(() => 0);
        try {
            const state = await this.fetchAll();
            if (await this.autoGenerate(state)) {
                const again = await this.fetchAll();
                cacheState(this.ctx.space.id, this.ctx.me.id, again);
                return applyQueue(visibleTo(again, this.ctx));
            }
            cacheState(this.ctx.space.id, this.ctx.me.id, state);
            return applyQueue(visibleTo(state, this.ctx));
        } catch (e) {
            // AC 8 — the packing list is readable with no connection.
            const cached = cachedState(this.ctx.space.id, this.ctx.me.id);
            if (cached) return applyQueue(visibleTo(cached, this.ctx));
            throw e;
        }
    }

    /** AC 1 — fill in the missing lists once a trip is inside fourteen days. */
    private async autoGenerate(state: TravelState): Promise<boolean> {
        if (!canManage(this.ctx)) return false;
        let made = false;
        for (const trip of state.trips) {
            if (!trip.startDate || trip.status === "done" || trip.status === "dreaming") continue;
            const away = daysBetween(this.ctx.today, trip.startDate);
            if (away > 14 || away < 0) continue;
            for (const t of state.travellers.filter((x) => x.tripId === trip.id)) {
                if (state.lists.some((l) => l.tripId === trip.id && l.memberId === t.memberId)) continue;
                await this.buildList(trip, t.memberId, trip.template);
                made = true;
            }
        }
        return made;
    }

    // -- trips ---------------------------------------------------------------

    async createTrip(input: NewTrip): Promise<Trip> {
        this.manage();
        const title = input.title.trim();
        if (!title) throw new Error("Give the trip a name");
        const kind = input.kind ?? "holiday";
        const countryCode = (input.countryCode ?? "GB").toUpperCase();
        const { data, error } = await supabase
            .from("wf_trips")
            .insert({
                ...this.base,
                title,
                destination: (input.destination ?? "").trim(),
                country_code: countryCode,
                kind,
                status: input.status ?? "planning",
                start_date: input.startDate ?? null,
                end_date: input.endDate ?? input.startDate ?? null,
                cover_url: input.coverUrl ?? null,
                notes: (input.notes ?? "").trim(),
                budget_cents: input.budgetCents ?? null,
                finance_category_id: input.financeCategoryId ?? (kind === "school-trip" ? "education" : kind === "day-out" ? "transport" : "fun"),
                finance_category_label: input.financeCategoryLabel ?? "Trips & holidays",
                local_currency: input.localCurrency ?? this.ctx.space.currency,
                fx_rate: input.fxRate && input.fxRate > 0 ? input.fxRate : 1,
                value_id: input.valueId ?? null,
                template: input.template ?? templateFor(kind, countryCode),
                visibility: input.visibility ?? "family",
                shared_with: input.sharedWith ?? [],
                created_by: this.ctx.me.id,
            })
            .select("*")
            .single();
        fail("create trip", error);
        const trip = mapTrip((data ?? {}) as Row);

        const travellers = (input.travellerIds ?? []).map((memberId) => ({ ...this.base, trip_id: trip.id, member_id: memberId, role: "traveller" }));
        if (travellers.length) fail("travellers", (await supabase.from("wf_trip_travellers").insert(travellers)).error);
        const rows = checklistTemplate(kind, countryCode).map((c) => ({ ...this.base, trip_id: trip.id, item: c.item, note: c.note, due_offset_days: c.dueOffsetDays }));
        if (rows.length) fail("checklist", (await supabase.from("wf_trip_checklist").insert(rows)).error);
        return trip;
    }

    async updateTrip(id: string, patch: TripPatch): Promise<void> {
        this.manage();
        const row: Row = {};
        if (patch.title !== undefined) row.title = patch.title;
        if (patch.destination !== undefined) row.destination = patch.destination;
        if (patch.countryCode !== undefined) row.country_code = patch.countryCode;
        if (patch.kind !== undefined) row.kind = patch.kind;
        if (patch.status !== undefined) row.status = patch.status;
        if (patch.startDate !== undefined) row.start_date = patch.startDate;
        if (patch.endDate !== undefined) row.end_date = patch.endDate;
        if (patch.coverUrl !== undefined) row.cover_url = patch.coverUrl;
        if (patch.notes !== undefined) row.notes = patch.notes;
        if (patch.budgetCents !== undefined) row.budget_cents = patch.budgetCents;
        if (patch.financeCategoryId !== undefined) row.finance_category_id = patch.financeCategoryId;
        if (patch.financeCategoryLabel !== undefined) row.finance_category_label = patch.financeCategoryLabel;
        if (patch.localCurrency !== undefined) row.local_currency = patch.localCurrency;
        if (patch.fxRate !== undefined) row.fx_rate = patch.fxRate > 0 ? patch.fxRate : 1;
        if (patch.valueId !== undefined) row.value_id = patch.valueId;
        if (patch.albumId !== undefined) row.album_id = patch.albumId;
        if (patch.albumTitle !== undefined) row.album_title = patch.albumTitle;
        if (patch.template !== undefined) row.template = patch.template;
        if (patch.visibility !== undefined) row.visibility = patch.visibility;
        if (patch.sharedWith !== undefined) row.shared_with = patch.sharedWith;
        row.updated_at = new Date().toISOString();
        fail("update trip", (await supabase.from("wf_trips").update(row).eq("id", id)).error);
    }

    async removeTrip(id: string): Promise<void> {
        this.manage();
        fail("delete trip", (await supabase.from("wf_trips").delete().eq("id", id)).error);
    }

    async setStatus(id: string, status: TripStatus): Promise<void> {
        this.manage();
        fail("trip status", (await supabase.from("wf_trips").update({ status, updated_at: new Date().toISOString() }).eq("id", id)).error);
    }

    async finishTrip(id: string, albumTitle?: string): Promise<string> {
        this.manage();
        const { data, error } = await supabase.from("wf_trips").select("album_id, album_title, title").eq("id", id).maybeSingle();
        fail("trip", error);
        const existing = nul((data as Row | null)?.album_id);
        const albumId = existing ?? crypto.randomUUID();
        fail(
            "finish trip",
            (
                await supabase
                    .from("wf_trips")
                    .update({ status: "done", album_id: albumId, album_title: albumTitle?.trim() || s((data as Row | null)?.album_title) || s((data as Row | null)?.title), updated_at: new Date().toISOString() })
                    .eq("id", id)
            ).error,
        );
        return albumId;
    }

    // -- travellers ----------------------------------------------------------

    async addTraveller(tripId: string, memberId: string, role: TravellerRole = "traveller"): Promise<void> {
        this.manage();
        fail("add traveller", (await supabase.from("wf_trip_travellers").insert({ ...this.base, trip_id: tripId, member_id: memberId, role })).error);
    }

    async updateTraveller(id: string, patch: Partial<Pick<Traveller, "role" | "passportExpiry" | "notes">>): Promise<void> {
        this.manage();
        const row: Row = {};
        if (patch.role !== undefined) row.role = patch.role;
        if (patch.passportExpiry !== undefined) row.passport_expiry = patch.passportExpiry;
        if (patch.notes !== undefined) row.notes = patch.notes;
        fail("traveller", (await supabase.from("wf_trip_travellers").update(row).eq("id", id)).error);
    }

    async removeTraveller(id: string): Promise<void> {
        this.manage();
        fail("remove traveller", (await supabase.from("wf_trip_travellers").delete().eq("id", id)).error);
    }

    // -- itinerary -----------------------------------------------------------

    async addDay(tripId: string, date_: string, title = ""): Promise<ItineraryDay> {
        this.manage();
        const { data, error } = await supabase
            .from("wf_itinerary_days")
            .insert({ ...this.base, trip_id: tripId, day_date: date_, title: title.trim() })
            .select("*")
            .single();
        fail("add day", error);
        return mapDay((data ?? {}) as Row);
    }

    async updateDay(id: string, patch: Partial<Pick<ItineraryDay, "date" | "title" | "notes">>): Promise<void> {
        this.manage();
        const row: Row = {};
        if (patch.date !== undefined) row.day_date = patch.date;
        if (patch.title !== undefined) row.title = patch.title;
        if (patch.notes !== undefined) row.notes = patch.notes;
        fail("day", (await supabase.from("wf_itinerary_days").update(row).eq("id", id)).error);
    }

    async removeDay(id: string): Promise<void> {
        this.manage();
        fail("remove day", (await supabase.from("wf_itinerary_days").delete().eq("id", id)).error);
    }

    async addItem(tripId: string, input: NewItineraryItem): Promise<ItineraryItem> {
        this.manage();
        const title = input.title.trim();
        if (!title) throw new Error("What are we doing?");
        const { count } = await supabase.from("wf_itinerary_items").select("id", { count: "exact", head: true }).eq("day_id", input.dayId);
        const { data, error } = await supabase
            .from("wf_itinerary_items")
            .insert({
                ...this.base,
                trip_id: tripId,
                day_id: input.dayId,
                at_time: input.time?.trim() || null,
                title,
                place: (input.place ?? "").trim(),
                coords: input.coords ?? null,
                notes: (input.notes ?? "").trim(),
                booking_ref: (input.bookingRef ?? "").trim(),
                cost_cents: Math.max(0, Math.round(input.costCents ?? 0)),
                item_order: count ?? 0,
            })
            .select("*")
            .single();
        fail("add itinerary item", error);
        return mapItem((data ?? {}) as Row);
    }

    async updateItem(id: string, patch: Partial<Omit<ItineraryItem, "id" | "tripId">>): Promise<void> {
        this.manage();
        const row: Row = {};
        if (patch.dayId !== undefined) row.day_id = patch.dayId;
        if (patch.time !== undefined) row.at_time = patch.time || null;
        if (patch.title !== undefined) row.title = patch.title;
        if (patch.place !== undefined) row.place = patch.place;
        if (patch.coords !== undefined) row.coords = patch.coords;
        if (patch.notes !== undefined) row.notes = patch.notes;
        if (patch.bookingRef !== undefined) row.booking_ref = patch.bookingRef;
        if (patch.costCents !== undefined) row.cost_cents = patch.costCents;
        if (patch.order !== undefined) row.item_order = patch.order;
        if (patch.done !== undefined) row.done = patch.done;
        fail("itinerary item", (await supabase.from("wf_itinerary_items").update(row).eq("id", id)).error);
    }

    async removeItem(id: string): Promise<void> {
        this.manage();
        fail("remove itinerary item", (await supabase.from("wf_itinerary_items").delete().eq("id", id)).error);
    }

    async toggleItem(id: string): Promise<void> {
        if (this.ctx.role === "guest" && !canManage(this.ctx)) this.deny();
        const { data, error } = await supabase.from("wf_itinerary_items").select("done").eq("id", id).maybeSingle();
        fail("itinerary item", error);
        fail("itinerary item", (await supabase.from("wf_itinerary_items").update({ done: !(data as Row | null)?.done }).eq("id", id)).error);
    }

    // -- bookings and documents ---------------------------------------------

    async addBooking(tripId: string, input: NewBooking): Promise<Booking> {
        this.manage();
        const provider = input.provider.trim();
        if (!provider) throw new Error("Who is it with?");
        const { data, error } = await supabase
            .from("wf_trip_bookings")
            .insert({
                ...this.base,
                trip_id: tripId,
                kind: input.kind,
                provider,
                reference: (input.reference ?? "").trim(),
                start_at: input.startAt,
                end_at: input.endAt ?? null,
                cost_cents: Math.max(0, Math.round(input.costCents ?? 0)),
                link: (input.link ?? "").trim(),
                image_url: input.imageUrl ?? null,
                confirmed: input.confirmed ?? false,
                sensitivity: input.sensitivity ?? "general",
                notes: (input.notes ?? "").trim(),
            })
            .select("*")
            .single();
        fail("add booking", error);
        return mapBooking((data ?? {}) as Row);
    }

    async updateBooking(id: string, patch: Partial<Omit<Booking, "id" | "tripId">>): Promise<void> {
        this.manage();
        const row: Row = {};
        if (patch.kind !== undefined) row.kind = patch.kind;
        if (patch.provider !== undefined) row.provider = patch.provider;
        if (patch.reference !== undefined) row.reference = patch.reference;
        if (patch.startAt !== undefined) row.start_at = patch.startAt;
        if (patch.endAt !== undefined) row.end_at = patch.endAt;
        if (patch.costCents !== undefined) row.cost_cents = patch.costCents;
        if (patch.link !== undefined) row.link = patch.link;
        if (patch.imageUrl !== undefined) row.image_url = patch.imageUrl;
        if (patch.confirmed !== undefined) row.confirmed = patch.confirmed;
        if (patch.sensitivity !== undefined) row.sensitivity = patch.sensitivity;
        if (patch.notes !== undefined) row.notes = patch.notes;
        fail("booking", (await supabase.from("wf_trip_bookings").update(row).eq("id", id)).error);
    }

    async removeBooking(id: string): Promise<void> {
        this.manage();
        fail("remove booking", (await supabase.from("wf_trip_bookings").delete().eq("id", id)).error);
    }

    async addDoc(input: NewDoc): Promise<TravelDoc> {
        if (this.ctx.role !== "parent") this.deny();
        const { data, error } = await supabase
            .from("wf_travel_docs")
            .insert({
                ...this.base,
                trip_id: input.tripId ?? null,
                member_id: input.memberId,
                kind: input.kind,
                label: (input.label ?? "").trim(),
                doc_number: (input.number ?? "").trim(),
                expires_at: input.expiresAt ?? null,
                image_url: input.imageUrl ?? null,
                notes: (input.notes ?? "").trim(),
            })
            .select("*")
            .single();
        fail("add document", error);
        return mapDoc((data ?? {}) as Row);
    }

    async updateDoc(id: string, patch: Partial<Omit<TravelDoc, "id" | "sensitivity">>): Promise<void> {
        if (this.ctx.role !== "parent") this.deny();
        const row: Row = {};
        if (patch.tripId !== undefined) row.trip_id = patch.tripId;
        if (patch.memberId !== undefined) row.member_id = patch.memberId;
        if (patch.kind !== undefined) row.kind = patch.kind;
        if (patch.label !== undefined) row.label = patch.label;
        if (patch.number !== undefined) row.doc_number = patch.number;
        if (patch.expiresAt !== undefined) row.expires_at = patch.expiresAt;
        if (patch.imageUrl !== undefined) row.image_url = patch.imageUrl;
        if (patch.notes !== undefined) row.notes = patch.notes;
        fail("document", (await supabase.from("wf_travel_docs").update(row).eq("id", id)).error);
    }

    async removeDoc(id: string): Promise<void> {
        if (this.ctx.role !== "parent") this.deny();
        fail("remove document", (await supabase.from("wf_travel_docs").delete().eq("id", id)).error);
    }

    // -- packing -------------------------------------------------------------

    private async buildList(trip: Trip, memberId: string, template: PackingTemplate): Promise<PackingList> {
        const { data: old } = await supabase.from("wf_packing_lists").select("id").eq("trip_id", trip.id).eq("member_id", memberId).maybeSingle();
        const oldId = nul((old as Row | null)?.id);
        if (oldId) {
            await supabase.from("wf_packing_items").delete().eq("list_id", oldId);
            await supabase.from("wf_packing_lists").delete().eq("id", oldId);
        }
        const { data, error } = await supabase
            .from("wf_packing_lists")
            .insert({ ...this.base, trip_id: trip.id, member_id: memberId, template, generated_at: new Date().toISOString() })
            .select("*")
            .single();
        fail("packing list", error);
        const list = mapList((data ?? {}) as Row);
        const member = this.member(memberId);
        if (member) {
            const rows = templateItems(template, member, tripNights(trip)).map((row, i) => ({
                ...this.base,
                list_id: list.id,
                item: row.item,
                qty: row.qty,
                category: row.category,
                item_order: i,
            }));
            if (rows.length) fail("packing items", (await supabase.from("wf_packing_items").insert(rows)).error);
        }
        return list;
    }

    async generatePacking(tripId: string, template?: PackingTemplate): Promise<number> {
        this.manage();
        const [{ data: tripRow, error }, { data: travellers }, { data: lists }] = await Promise.all([
            supabase.from("wf_trips").select("*").eq("id", tripId).single(),
            supabase.from("wf_trip_travellers").select("member_id").eq("trip_id", tripId),
            supabase.from("wf_packing_lists").select("member_id").eq("trip_id", tripId),
        ]);
        fail("trip", error);
        const trip = mapTrip((tripRow ?? {}) as Row);
        const have = new Set(((lists ?? []) as Row[]).map((r) => s(r.member_id)));
        let made = 0;
        for (const r of (travellers ?? []) as Row[]) {
            const memberId = s(r.member_id);
            if (have.has(memberId)) continue;
            await this.buildList(trip, memberId, template ?? trip.template);
            made += 1;
        }
        return made;
    }

    async generatePackingFor(tripId: string, memberId: string, template?: PackingTemplate): Promise<PackingList> {
        this.manage();
        const { data, error } = await supabase.from("wf_trips").select("*").eq("id", tripId).single();
        fail("trip", error);
        const trip = mapTrip((data ?? {}) as Row);
        return this.buildList(trip, memberId, template ?? trip.template);
    }

    private async listOf(listId: string): Promise<PackingList | undefined> {
        const { data } = await supabase.from("wf_packing_lists").select("*").eq("id", listId).maybeSingle();
        return data ? mapList(data as Row) : undefined;
    }

    async addPackingItem(listId: string, input: NewPackingItem): Promise<PackingItem> {
        if (!canTickList(await this.listOf(listId), this.ctx)) this.deny();
        const item = input.item.trim();
        if (!item) throw new Error("What is it?");
        const { count } = await supabase.from("wf_packing_items").select("id", { count: "exact", head: true }).eq("list_id", listId);
        const { data, error } = await supabase
            .from("wf_packing_items")
            .insert({
                ...this.base,
                list_id: listId,
                item,
                qty: Math.max(1, Math.round(input.qty ?? 1)),
                category: input.category ?? "other",
                wardrobe_item_id: input.wardrobeItemId ?? null,
                wardrobe_label: (input.wardrobeLabel ?? "").trim(),
                item_order: count ?? 0,
            })
            .select("*")
            .single();
        fail("packing item", error);
        return mapPackItem((data ?? {}) as Row);
    }

    private async pushTick(itemId: string, checked: boolean): Promise<void> {
        const { error } = await supabase.from("wf_packing_items").update({ checked }).eq("id", itemId);
        if (error) throw new Error(error.message);
    }

    /** AC 8 — tick now, sync when there is a network again. */
    async setPackingChecked(itemId: string, checked: boolean): Promise<void> {
        if (isOffline()) {
            enqueue({ itemId, checked, at: new Date().toISOString() });
            return;
        }
        try {
            await this.pushTick(itemId, checked);
        } catch (e) {
            // A network failure is a queue, not an error on a person's screen.
            if (typeof navigator !== "undefined" && navigator.onLine === false) {
                enqueue({ itemId, checked, at: new Date().toISOString() });
                return;
            }
            throw e;
        }
        await flush((t) => this.pushTick(t.itemId, t.checked)).catch(() => 0);
    }

    async removePackingItem(itemId: string): Promise<void> {
        fail("remove packing item", (await supabase.from("wf_packing_items").delete().eq("id", itemId)).error);
    }

    async clearPackingList(listId: string): Promise<void> {
        this.manage();
        fail("clear list", (await supabase.from("wf_packing_items").delete().eq("list_id", listId)).error);
        fail("clear list", (await supabase.from("wf_packing_lists").update({ generated_at: null }).eq("id", listId)).error);
    }

    // -- the run-up ----------------------------------------------------------

    async addChecklistItem(tripId: string, item: string, dueOffsetDays: number, ownerMemberId: string | null = null, note = ""): Promise<ChecklistItem> {
        this.manage();
        const trimmed = item.trim();
        if (!trimmed) throw new Error("What needs doing?");
        const { data, error } = await supabase
            .from("wf_trip_checklist")
            .insert({ ...this.base, trip_id: tripId, item: trimmed, note: note.trim(), due_offset_days: Math.max(0, Math.round(dueOffsetDays)), owner_member_id: ownerMemberId })
            .select("*")
            .single();
        fail("checklist item", error);
        return mapCheck((data ?? {}) as Row);
    }

    async setChecklistDone(id: string, done: boolean): Promise<void> {
        fail("checklist item", (await supabase.from("wf_trip_checklist").update({ done_at: done ? new Date().toISOString() : null }).eq("id", id)).error);
    }

    async removeChecklistItem(id: string): Promise<void> {
        this.manage();
        fail("remove checklist item", (await supabase.from("wf_trip_checklist").delete().eq("id", id)).error);
    }

    // -- money ---------------------------------------------------------------

    async addExpense(tripId: string, input: NewExpense): Promise<TripExpense> {
        if (this.ctx.role !== "parent" && !this.ctx.can("finance.manage")) this.deny();
        const label = input.label.trim();
        if (!label) throw new Error("What was it for?");
        const { data: tripRow, error: tripErr } = await supabase.from("wf_trips").select("*").eq("id", tripId).single();
        fail("trip", tripErr);
        const trip = mapTrip((tripRow ?? {}) as Row);
        const currency = input.currency ?? this.ctx.space.currency;
        const fxRate = currency === this.ctx.space.currency ? 1 : input.fxRate && input.fxRate > 0 ? input.fxRate : trip.fxRate || 1;
        const amountCents = Math.round(input.amountCents);
        const { data, error } = await supabase
            .from("wf_trip_expenses")
            .insert({
                ...this.base,
                trip_id: tripId,
                label,
                amount_cents: amountCents,
                currency,
                fx_rate: fxRate,
                home_cents: toHome(amountCents, fxRate),
                finance_category_id: trip.financeCategoryId,
                member_id: input.memberId ?? this.ctx.me.id,
                spent_on: input.date ?? this.ctx.today,
                note: (input.note ?? "").trim(),
                posted_at: new Date().toISOString(),
            })
            .select("*")
            .single();
        fail("add expense", error);
        return mapExpense((data ?? {}) as Row);
    }

    async removeExpense(id: string): Promise<void> {
        if (this.ctx.role !== "parent" && !this.ctx.can("finance.manage")) this.deny();
        fail("remove expense", (await supabase.from("wf_trip_expenses").delete().eq("id", id)).error);
    }
}
