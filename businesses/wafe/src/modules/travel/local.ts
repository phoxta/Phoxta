import type { Member, RepoContext } from "@/data/core";
import { seedContext } from "@/data/coreSeed";
import { uid } from "@/lib/format";
import { canManage, canTickList, daysBetween, templateItems, toHome, tripNights, visibleTo } from "./derive";
import { applyQueue, dequeue, enqueue, isOffline, queued } from "./offline";
import { seed } from "./seed";
import { checklistTemplate, templateFor } from "./templates";
import type {
    Booking,
    ChecklistItem,
    ItineraryDay,
    ItineraryItem,
    NewBooking,
    NewDoc,
    NewExpense,
    NewItineraryItem,
    NewPackingItem,
    NewTrip,
    PackingItem,
    PackingList,
    PackingTemplate,
    TravelDoc,
    TravelRepo,
    TravelState,
    Traveller,
    TravellerRole,
    Trip,
    TripExpense,
    TripPatch,
    TripStatus,
} from "./types";

/**
 * Travel in the browser — every write real, every rule the same as live.
 *
 * The blob holds the family's WHOLE travel shelf; `load()` runs the same
 * `visibleTo` filter the Supabase repo runs, so switching "view as" to Tobi
 * genuinely removes the documents, the prices and everybody else's packing
 * list from the data the screens receive. The guards below are the guards in
 * `sql/travel.sql`: a child ticks their own list and nothing else, a guest
 * writes nothing at all unless a parent granted `travel.manage`, and only a
 * manager touches trips, bookings, papers or money.
 */

const KEY = "wafe:demo:travel:v2";
const now = (): string => new Date().toISOString();

function isState(v: unknown): v is TravelState {
    if (!v || typeof v !== "object") return false;
    const s = v as Partial<TravelState>;
    return Array.isArray(s.trips) && Array.isArray(s.travellers) && Array.isArray(s.lists) && Array.isArray(s.packItems);
}

export class LocalTravelRepo implements TravelRepo {
    private cache: TravelState | null = null;

    constructor(private ctx: RepoContext) {}

    // -- storage -------------------------------------------------------------

    private all(): TravelState {
        if (this.cache) return this.cache;
        try {
            const raw = localStorage.getItem(KEY);
            const parsed: unknown = raw ? JSON.parse(raw) : null;
            if (isState(parsed)) {
                this.cache = parsed;
                return parsed;
            }
        } catch {
            /* a stale or foreign blob must never break the demo */
        }
        const fresh = seed(seedContext(this.ctx.space, this.ctx.members, this.ctx.today));
        this.save(fresh);
        return fresh;
    }

    private save(s: TravelState): void {
        this.cache = s;
        try {
            localStorage.setItem(KEY, JSON.stringify(s));
        } catch {
            /* private mode: it still works, it just won't persist */
        }
    }

    private write(mutate: (s: TravelState) => void): void {
        const next = structuredClone(this.all());
        mutate(next);
        this.save(next);
    }

    private deny(): never {
        throw new Error("Not allowed");
    }

    private manage(): void {
        if (!canManage(this.ctx)) this.deny();
    }

    private trip(s: TravelState, id: string): Trip {
        const t = s.trips.find((x) => x.id === id);
        if (!t) throw new Error("That trip is no longer here");
        return t;
    }

    private member(id: string): Member | undefined {
        return this.ctx.members.find((m) => m.id === id);
    }

    // -- load ----------------------------------------------------------------

    /**
     * AC 1 — at T-14 the packing lists exist. A parent's session is the one
     * that runs it (a child cannot write anybody's list), it is idempotent, and
     * it only ever fills a gap: a traveller who already has a list is left
     * exactly as they are.
     */
    private autoGenerate(s: TravelState): boolean {
        if (!canManage(this.ctx)) return false;
        let changed = false;
        for (const trip of s.trips) {
            if (!trip.startDate || trip.status === "done" || trip.status === "dreaming") continue;
            const away = daysBetween(this.ctx.today, trip.startDate);
            if (away > 14 || away < 0) continue;
            for (const t of s.travellers.filter((x) => x.tripId === trip.id)) {
                if (s.lists.some((l) => l.tripId === trip.id && l.memberId === t.memberId)) continue;
                this.buildList(s, trip, t.memberId, trip.template);
                changed = true;
            }
        }
        return changed;
    }

    async load(): Promise<TravelState> {
        const s = structuredClone(this.all());
        if (this.autoGenerate(s)) this.save(structuredClone(s));
        return applyQueue(visibleTo(s, this.ctx));
    }

    // -- trips ---------------------------------------------------------------

    async createTrip(input: NewTrip): Promise<Trip> {
        this.manage();
        const title = input.title.trim();
        if (!title) throw new Error("Give the trip a name");
        const kind = input.kind ?? "holiday";
        const countryCode = (input.countryCode ?? "GB").toUpperCase();
        const trip: Trip = {
            id: uid("trip"),
            spaceId: this.ctx.space.id,
            title,
            destination: (input.destination ?? "").trim(),
            countryCode,
            kind,
            status: input.status ?? "planning",
            startDate: input.startDate ?? null,
            endDate: input.endDate ?? input.startDate ?? null,
            coverUrl: input.coverUrl ?? null,
            notes: (input.notes ?? "").trim(),
            budgetCents: input.budgetCents ?? null,
            financeCategoryId: input.financeCategoryId ?? (kind === "school-trip" ? "education" : kind === "day-out" ? "transport" : "fun"),
            financeCategoryLabel: input.financeCategoryLabel ?? "Trips & holidays",
            localCurrency: input.localCurrency ?? this.ctx.space.currency,
            fxRate: input.fxRate && input.fxRate > 0 ? input.fxRate : 1,
            valueId: input.valueId ?? null,
            albumId: null,
            albumTitle: "",
            template: input.template ?? templateFor(kind, countryCode),
            visibility: input.visibility ?? "family",
            sharedWith: input.sharedWith ?? [],
            createdBy: this.ctx.me.id,
            createdAt: now(),
            updatedAt: now(),
        };
        this.write((s) => {
            s.trips.push(trip);
            for (const memberId of input.travellerIds ?? []) {
                s.travellers.push({ id: uid("trav"), tripId: trip.id, memberId, role: "traveller", passportExpiry: null, notes: "" });
            }
            // The run-up comes with the trip: offsets, not dates, so moving the
            // departure moves the whole list with it.
            for (const row of checklistTemplate(kind, countryCode)) {
                s.checklist.push({ id: uid("check"), tripId: trip.id, item: row.item, note: row.note, dueOffsetDays: row.dueOffsetDays, ownerMemberId: null, doneAt: null });
            }
        });
        return trip;
    }

    async updateTrip(id: string, patch: TripPatch): Promise<void> {
        this.manage();
        this.write((s) => {
            const t = this.trip(s, id);
            Object.assign(t, patch, { updatedAt: now() });
            if (t.fxRate <= 0) t.fxRate = 1;
        });
    }

    async removeTrip(id: string): Promise<void> {
        this.manage();
        this.write((s) => {
            const listIds = new Set(s.lists.filter((l) => l.tripId === id).map((l) => l.id));
            s.trips = s.trips.filter((t) => t.id !== id);
            s.travellers = s.travellers.filter((t) => t.tripId !== id);
            s.days = s.days.filter((d) => d.tripId !== id);
            s.items = s.items.filter((i) => i.tripId !== id);
            s.bookings = s.bookings.filter((b) => b.tripId !== id);
            s.docs = s.docs.filter((d) => d.tripId !== id);
            s.lists = s.lists.filter((l) => l.tripId !== id);
            s.packItems = s.packItems.filter((p) => !listIds.has(p.listId));
            s.checklist = s.checklist.filter((c) => c.tripId !== id);
            s.expenses = s.expenses.filter((e) => e.tripId !== id);
        });
    }

    async setStatus(id: string, status: TripStatus): Promise<void> {
        this.manage();
        this.write((s) => {
            const t = this.trip(s, id);
            t.status = status;
            t.updatedAt = now();
        });
    }

    async finishTrip(id: string, albumTitle?: string): Promise<string> {
        this.manage();
        let albumId = "";
        this.write((s) => {
            const t = this.trip(s, id);
            t.status = "done";
            t.albumId = t.albumId ?? uid("album");
            t.albumTitle = albumTitle?.trim() || t.albumTitle || t.title;
            t.updatedAt = now();
            albumId = t.albumId;
        });
        return albumId;
    }

    // -- travellers ----------------------------------------------------------

    async addTraveller(tripId: string, memberId: string, role: TravellerRole = "traveller"): Promise<void> {
        this.manage();
        this.write((s) => {
            if (s.travellers.some((t) => t.tripId === tripId && t.memberId === memberId)) return;
            s.travellers.push({ id: uid("trav"), tripId, memberId, role, passportExpiry: null, notes: "" });
        });
    }

    async updateTraveller(id: string, patch: Partial<Pick<Traveller, "role" | "passportExpiry" | "notes">>): Promise<void> {
        this.manage();
        this.write((s) => {
            const t = s.travellers.find((x) => x.id === id);
            if (t) Object.assign(t, patch);
        });
    }

    async removeTraveller(id: string): Promise<void> {
        this.manage();
        this.write((s) => {
            const t = s.travellers.find((x) => x.id === id);
            s.travellers = s.travellers.filter((x) => x.id !== id);
            if (!t) return;
            const lists = s.lists.filter((l) => l.tripId === t.tripId && l.memberId === t.memberId);
            const ids = new Set(lists.map((l) => l.id));
            s.lists = s.lists.filter((l) => !ids.has(l.id));
            s.packItems = s.packItems.filter((p) => !ids.has(p.listId));
        });
    }

    // -- itinerary -----------------------------------------------------------

    async addDay(tripId: string, date: string, title = ""): Promise<ItineraryDay> {
        this.manage();
        const day: ItineraryDay = { id: uid("day"), tripId, date, title: title.trim(), notes: "" };
        this.write((s) => {
            if (s.days.some((d) => d.tripId === tripId && d.date === date)) throw new Error("That day is already on the itinerary");
            s.days.push(day);
        });
        return day;
    }

    async updateDay(id: string, patch: Partial<Pick<ItineraryDay, "date" | "title" | "notes">>): Promise<void> {
        this.manage();
        this.write((s) => {
            const d = s.days.find((x) => x.id === id);
            if (d) Object.assign(d, patch);
        });
    }

    async removeDay(id: string): Promise<void> {
        this.manage();
        this.write((s) => {
            s.days = s.days.filter((d) => d.id !== id);
            s.items = s.items.filter((i) => i.dayId !== id);
        });
    }

    async addItem(tripId: string, input: NewItineraryItem): Promise<ItineraryItem> {
        this.manage();
        const title = input.title.trim();
        if (!title) throw new Error("What are we doing?");
        const item: ItineraryItem = {
            id: uid("itin"),
            tripId,
            dayId: input.dayId,
            time: (input.time ?? "").trim(),
            title,
            place: (input.place ?? "").trim(),
            coords: input.coords ?? null,
            notes: (input.notes ?? "").trim(),
            bookingRef: (input.bookingRef ?? "").trim(),
            costCents: Math.max(0, Math.round(input.costCents ?? 0)),
            order: 0,
            done: false,
        };
        this.write((s) => {
            item.order = s.items.filter((i) => i.dayId === input.dayId).length;
            s.items.push(item);
        });
        return item;
    }

    async updateItem(id: string, patch: Partial<Omit<ItineraryItem, "id" | "tripId">>): Promise<void> {
        this.manage();
        this.write((s) => {
            const i = s.items.find((x) => x.id === id);
            if (i) Object.assign(i, patch);
        });
    }

    async removeItem(id: string): Promise<void> {
        this.manage();
        this.write((s) => {
            s.items = s.items.filter((i) => i.id !== id);
        });
    }

    /** Ticking off "we did that" while away — every traveller may, it is not a secret. */
    async toggleItem(id: string): Promise<void> {
        if (this.ctx.role === "guest" && !canManage(this.ctx)) this.deny();
        this.write((s) => {
            const i = s.items.find((x) => x.id === id);
            if (i) i.done = !i.done;
        });
    }

    // -- bookings and documents ---------------------------------------------

    async addBooking(tripId: string, input: NewBooking): Promise<Booking> {
        this.manage();
        const booking: Booking = {
            id: uid("bk"),
            tripId,
            kind: input.kind,
            provider: input.provider.trim(),
            reference: (input.reference ?? "").trim(),
            startAt: input.startAt,
            endAt: input.endAt ?? null,
            costCents: Math.max(0, Math.round(input.costCents ?? 0)),
            link: (input.link ?? "").trim(),
            imageUrl: input.imageUrl ?? null,
            confirmed: input.confirmed ?? false,
            sensitivity: input.sensitivity ?? "general",
            notes: (input.notes ?? "").trim(),
        };
        if (!booking.provider) throw new Error("Who is it with?");
        this.write((s) => {
            s.bookings.push(booking);
        });
        return booking;
    }

    async updateBooking(id: string, patch: Partial<Omit<Booking, "id" | "tripId">>): Promise<void> {
        this.manage();
        this.write((s) => {
            const b = s.bookings.find((x) => x.id === id);
            if (b) Object.assign(b, patch);
        });
    }

    async removeBooking(id: string): Promise<void> {
        this.manage();
        this.write((s) => {
            s.bookings = s.bookings.filter((b) => b.id !== id);
        });
    }

    /** AC 4 — documents are parents-only on the way in as well as on the way out. */
    async addDoc(input: NewDoc): Promise<TravelDoc> {
        if (this.ctx.role !== "parent") this.deny();
        const doc: TravelDoc = {
            id: uid("doc"),
            tripId: input.tripId ?? null,
            memberId: input.memberId,
            kind: input.kind,
            label: (input.label ?? "").trim(),
            number: (input.number ?? "").trim(),
            expiresAt: input.expiresAt ?? null,
            imageUrl: input.imageUrl ?? null,
            notes: (input.notes ?? "").trim(),
            sensitivity: "documents",
        };
        this.write((s) => {
            s.docs.push(doc);
        });
        return doc;
    }

    async updateDoc(id: string, patch: Partial<Omit<TravelDoc, "id" | "sensitivity">>): Promise<void> {
        if (this.ctx.role !== "parent") this.deny();
        this.write((s) => {
            const d = s.docs.find((x) => x.id === id);
            if (d) Object.assign(d, patch, { sensitivity: "documents" as const });
        });
    }

    async removeDoc(id: string): Promise<void> {
        if (this.ctx.role !== "parent") this.deny();
        this.write((s) => {
            s.docs = s.docs.filter((d) => d.id !== id);
        });
    }

    // -- packing -------------------------------------------------------------

    /** Build one list from the template, in place. Shared by every generate path. */
    private buildList(s: TravelState, trip: Trip, memberId: string, template: PackingTemplate, id = uid("plist")): PackingList {
        const member = this.member(memberId);
        const list: PackingList = { id, tripId: trip.id, memberId, template, generatedAt: now() };
        s.lists = s.lists.filter((l) => !(l.tripId === trip.id && l.memberId === memberId));
        s.lists.push(list);
        if (member) {
            templateItems(template, member, tripNights(trip)).forEach((row, i) => {
                s.packItems.push({
                    id: uid("pitem"),
                    listId: list.id,
                    item: row.item,
                    qty: row.qty,
                    category: row.category,
                    wardrobeItemId: null,
                    wardrobeLabel: "",
                    checked: false,
                    order: i,
                });
            });
        }
        return list;
    }

    async generatePacking(tripId: string, template?: PackingTemplate): Promise<number> {
        this.manage();
        let made = 0;
        this.write((s) => {
            const trip = this.trip(s, tripId);
            const t = template ?? trip.template;
            for (const traveller of s.travellers.filter((x) => x.tripId === tripId)) {
                if (s.lists.some((l) => l.tripId === tripId && l.memberId === traveller.memberId)) continue;
                this.buildList(s, trip, traveller.memberId, t);
                made += 1;
            }
        });
        return made;
    }

    async generatePackingFor(tripId: string, memberId: string, template?: PackingTemplate): Promise<PackingList> {
        this.manage();
        const id = uid("plist");
        this.write((s) => {
            const trip = this.trip(s, tripId);
            const old = s.lists.find((l) => l.tripId === tripId && l.memberId === memberId);
            if (old) s.packItems = s.packItems.filter((p) => p.listId !== old.id);
            this.buildList(s, trip, memberId, template ?? trip.template, id);
        });
        const made = this.all().lists.find((l) => l.id === id);
        if (!made) throw new Error("Couldn't make that list");
        return made;
    }

    async addPackingItem(listId: string, input: NewPackingItem): Promise<PackingItem> {
        const list = this.all().lists.find((l) => l.id === listId);
        if (!canTickList(list, this.ctx)) this.deny();
        const item: PackingItem = {
            id: uid("pitem"),
            listId,
            item: input.item.trim(),
            qty: Math.max(1, Math.round(input.qty ?? 1)),
            category: input.category ?? "other",
            wardrobeItemId: input.wardrobeItemId ?? null,
            wardrobeLabel: (input.wardrobeLabel ?? "").trim(),
            checked: false,
            order: 0,
        };
        if (!item.item) throw new Error("What is it?");
        this.write((s) => {
            item.order = s.packItems.filter((p) => p.listId === listId).length;
            s.packItems.push(item);
            const l = s.lists.find((x) => x.id === listId);
            if (l && !l.generatedAt) l.generatedAt = now();
        });
        return item;
    }

    /**
     * AC 8 — the tick that has to work in a hallway with no signal. In the demo
     * the store IS local, so the write always lands; the queue is still written
     * when the browser reports itself offline, and drained on reconnect, so the
     * screen can honestly say what is waiting.
     */
    async setPackingChecked(itemId: string, checked: boolean): Promise<void> {
        const s0 = this.all();
        const item = s0.packItems.find((p) => p.id === itemId);
        const list = item ? s0.lists.find((l) => l.id === item.listId) : undefined;
        if (!canTickList(list, this.ctx)) this.deny();
        this.write((s) => {
            const p = s.packItems.find((x) => x.id === itemId);
            if (p) p.checked = checked;
        });
        if (isOffline()) enqueue({ itemId, checked, at: now() });
        else if (queued().length) dequeue(queued().map((q) => q.itemId));
    }

    async removePackingItem(itemId: string): Promise<void> {
        const s0 = this.all();
        const item = s0.packItems.find((p) => p.id === itemId);
        const list = item ? s0.lists.find((l) => l.id === item.listId) : undefined;
        if (!canTickList(list, this.ctx)) this.deny();
        this.write((s) => {
            s.packItems = s.packItems.filter((p) => p.id !== itemId);
        });
    }

    async clearPackingList(listId: string): Promise<void> {
        this.manage();
        this.write((s) => {
            s.packItems = s.packItems.filter((p) => p.listId !== listId);
            const l = s.lists.find((x) => x.id === listId);
            if (l) l.generatedAt = null;
        });
    }

    // -- the run-up ----------------------------------------------------------

    async addChecklistItem(tripId: string, item: string, dueOffsetDays: number, ownerMemberId: string | null = null, note = ""): Promise<ChecklistItem> {
        this.manage();
        const row: ChecklistItem = { id: uid("check"), tripId, item: item.trim(), note: note.trim(), dueOffsetDays: Math.max(0, Math.round(dueOffsetDays)), ownerMemberId, doneAt: null };
        if (!row.item) throw new Error("What needs doing?");
        this.write((s) => {
            s.checklist.push(row);
        });
        return row;
    }

    /** A child may tick a job that is theirs; anything else is a manager's. */
    async setChecklistDone(id: string, done: boolean): Promise<void> {
        const row = this.all().checklist.find((c) => c.id === id);
        if (!row) throw new Error("That's gone");
        if (!canManage(this.ctx) && row.ownerMemberId !== this.ctx.me.id) this.deny();
        this.write((s) => {
            const c = s.checklist.find((x) => x.id === id);
            if (c) c.doneAt = done ? now() : null;
        });
    }

    async removeChecklistItem(id: string): Promise<void> {
        this.manage();
        this.write((s) => {
            s.checklist = s.checklist.filter((c) => c.id !== id);
        });
    }

    // -- money ---------------------------------------------------------------

    /** AC 7 — the expense is posted the moment it is added, under the trip's category. */
    async addExpense(tripId: string, input: NewExpense): Promise<TripExpense> {
        if (this.ctx.role !== "parent" && !this.ctx.can("finance.manage")) this.deny();
        const label = input.label.trim();
        if (!label) throw new Error("What was it for?");
        const trip = this.trip(this.all(), tripId);
        const currency = input.currency ?? this.ctx.space.currency;
        const fxRate = currency === this.ctx.space.currency ? 1 : input.fxRate && input.fxRate > 0 ? input.fxRate : trip.fxRate || 1;
        const amountCents = Math.round(input.amountCents);
        const row: TripExpense = {
            id: uid("exp"),
            tripId,
            label,
            amountCents,
            currency,
            fxRate,
            homeCents: toHome(amountCents, fxRate),
            financeCategoryId: trip.financeCategoryId,
            memberId: input.memberId ?? this.ctx.me.id,
            date: input.date ?? this.ctx.today,
            note: (input.note ?? "").trim(),
            // Posted on creation: an expense that is not in the ledger is a
            // note to self, and the family's ledger is the point.
            postedAt: now(),
        };
        this.write((s) => {
            s.expenses.push(row);
        });
        return row;
    }

    async removeExpense(id: string): Promise<void> {
        if (this.ctx.role !== "parent" && !this.ctx.can("finance.manage")) this.deny();
        this.write((s) => {
            s.expenses = s.expenses.filter((e) => e.id !== id);
        });
    }
}
