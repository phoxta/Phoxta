import type { RepoContext } from "@/data/core";
import { seedContext } from "@/data/coreSeed";
import { isoDate, uid, weekStart } from "@/lib/format";
import { visibleTo } from "./derive";
import { seed } from "./seed";
import type { Capsule, DonateJob, GivingEntry, HandDown, ItemPatch, NewCapsule, NewItem, NewOutfit, OutgrownDecision, OutgrownResult, Outfit, ReplacementWish, ScheduleEntry, WardrobeItem, WardrobeRepo, WardrobeState } from "./types";

/**
 * The demo wardrobe, persisted in this browser.
 *
 * Every write is real and lands in localStorage: a visitor can photograph a
 * coat, build an outfit, lay out Tuesday, hand a jumper down to the next
 * child, mark a pair of shoes outgrown and watch the replacement wish and the
 * charity bag appear in one step, drop the bag off, and record it as giving —
 * and it is all still there after a reload.
 *
 * The permission checks are the ones the live policies enforce, so "Not
 * allowed" means the same thing in both modes: a guest cannot read or write
 * anything here, and a child may only touch their own closet and their own
 * week. Nothing in this file trusts a screen to have hidden a button.
 */

const KEY = "wafe:demo:wardrobe:v2";

function isState(v: unknown): v is WardrobeState {
    if (!v || typeof v !== "object") return false;
    const s = v as Partial<WardrobeState>;
    return Array.isArray(s.items) && Array.isArray(s.outfits) && Array.isArray(s.schedule) && Array.isArray(s.capsules);
}

const now = (): string => new Date().toISOString();

export class LocalWardrobeRepo implements WardrobeRepo {
    private cache: WardrobeState | null = null;

    constructor(private ctx: RepoContext) {}

    // -- storage -------------------------------------------------------------

    private all(): WardrobeState {
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

    private save(s: WardrobeState): void {
        this.cache = s;
        try {
            localStorage.setItem(KEY, JSON.stringify(s));
        } catch {
            /* private browsing, or a very full quota: the session still works */
        }
    }

    private write<T>(fn: (s: WardrobeState) => T): T {
        const s: WardrobeState = { ...this.all() };
        const out = fn(s);
        this.save(s);
        return out;
    }

    // -- permissions ---------------------------------------------------------

    private deny(): never {
        throw new Error("Not allowed");
    }

    /** Parents run the household's wardrobe. */
    private manage(): void {
        if (!this.ctx.can("wardrobe.manage")) this.deny();
    }

    /** A member may touch their own closet; a parent may touch anyone's (AC 6). */
    private mine(memberId: string): void {
        if (this.ctx.can("wardrobe.manage")) return;
        if (this.ctx.can("wardrobe.mine") && memberId === this.ctx.me.id) return;
        this.deny();
    }

    private item(s: WardrobeState, id: string): WardrobeItem {
        const it = s.items.find((x) => x.id === id);
        if (!it) throw new Error("That garment is no longer in the wardrobe.");
        this.mine(it.ownerMemberId);
        return it;
    }

    // -- load ----------------------------------------------------------------

    async load(): Promise<WardrobeState> {
        return visibleTo(this.all(), this.ctx);
    }

    // -- items ---------------------------------------------------------------

    async addItem(input: NewItem): Promise<WardrobeItem> {
        this.mine(input.ownerMemberId);
        const name = input.name.trim();
        if (!name) throw new Error("Give it a name — \"navy school jumper\" is plenty.");
        const item: WardrobeItem = {
            id: uid("wi"),
            spaceId: this.ctx.space.id,
            name,
            ownerMemberId: input.ownerMemberId,
            category: input.category,
            colour: input.colour,
            season: input.season ?? "all",
            size: input.size?.trim() ?? "",
            brand: input.brand?.trim() ?? "",
            occasions: input.occasions ?? ["everyday"],
            imageUrl: input.imageUrl ?? null,
            status: "in-use",
            favourite: Boolean(input.favourite),
            inLaundry: false,
            lastWorn: null,
            wearCount: 0,
            careNotes: input.careNotes?.trim() ?? "",
            notes: input.notes?.trim() ?? "",
            capsuleIds: [],
            visibility: input.visibility ?? "family",
            sharedWith: [],
            createdAt: now(),
        };
        this.write((s) => {
            s.items = [item, ...s.items];
        });
        return item;
    }

    async updateItem(id: string, patch: ItemPatch): Promise<void> {
        this.write((s) => {
            const it = this.item(s, id);
            if (patch.ownerMemberId && patch.ownerMemberId !== it.ownerMemberId) this.manage();
            s.items = s.items.map((x) => (x.id === id ? { ...x, ...patch, id: x.id, spaceId: x.spaceId, capsuleIds: x.capsuleIds } : x));
        });
    }

    async removeItem(id: string): Promise<void> {
        this.write((s) => {
            this.item(s, id);
            s.items = s.items.filter((x) => x.id !== id);
            s.outfits = s.outfits.map((o) => (o.itemIds.includes(id) ? { ...o, itemIds: o.itemIds.filter((x) => x !== id) } : o));
            s.capsules = s.capsules.map((c) => (c.itemIds.includes(id) ? { ...c, itemIds: c.itemIds.filter((x) => x !== id) } : c));
            s.donations = s.donations.map((d) => (d.itemIds.includes(id) ? { ...d, itemIds: d.itemIds.filter((x) => x !== id) } : d));
            s.wishes = s.wishes.map((w) => (w.itemId === id ? { ...w, itemId: null } : w));
        });
    }

    async setFavourite(id: string, on: boolean): Promise<void> {
        this.write((s) => {
            this.item(s, id);
            s.items = s.items.map((x) => (x.id === id ? { ...x, favourite: on } : x));
        });
    }

    async setLaundry(id: string, on: boolean): Promise<void> {
        this.write((s) => {
            this.item(s, id);
            s.items = s.items.map((x) => (x.id === id ? { ...x, inLaundry: on } : x));
        });
    }

    async markWorn(id: string, date?: string): Promise<void> {
        const when = date ?? this.ctx.today;
        this.write((s) => {
            this.item(s, id);
            s.items = s.items.map((x) => (x.id === id ? { ...x, lastWorn: when, wearCount: x.wearCount + 1, inLaundry: false } : x));
        });
    }

    // -- hand-me-downs (AC 3) -------------------------------------------------

    async handDown(itemId: string, toMemberId: string, note = ""): Promise<HandDown> {
        this.manage();
        const to = this.ctx.members.find((m) => m.id === toMemberId);
        if (!to) throw new Error("That person isn't in the family.");
        return this.write((s) => {
            const it = s.items.find((x) => x.id === itemId);
            if (!it) throw new Error("That garment is no longer in the wardrobe.");
            if (it.ownerMemberId === toMemberId) throw new Error(`${to.name.split(" ")[0]} already owns it.`);
            const row: HandDown = {
                id: uid("wd"),
                spaceId: this.ctx.space.id,
                itemId,
                itemName: it.name,
                fromMemberId: it.ownerMemberId,
                toMemberId,
                note: note.trim(),
                at: now(),
            };
            // Ownership moves; the history stays, so the coat can still say whose it was.
            s.items = s.items.map((x) => (x.id === itemId ? { ...x, ownerMemberId: toMemberId, status: "handed-down", inLaundry: false, capsuleIds: [], lastWorn: null } : x));
            s.capsules = s.capsules.map((c) => (c.itemIds.includes(itemId) && c.memberId !== toMemberId ? { ...c, itemIds: c.itemIds.filter((x) => x !== itemId) } : c));
            s.outfits = s.outfits.map((o) => (o.itemIds.includes(itemId) && o.memberId !== toMemberId ? { ...o, itemIds: o.itemIds.filter((x) => x !== itemId) } : o));
            s.handdowns = [row, ...s.handdowns];
            return row;
        });
    }

    // -- outgrown, in one step (AC 4) ----------------------------------------

    async markOutgrown(itemId: string, decision: OutgrownDecision): Promise<OutgrownResult> {
        this.manage();
        const result: OutgrownResult = { wishId: null, donationId: null, handDownId: null };
        const item = this.all().items.find((x) => x.id === itemId);
        if (!item) throw new Error("That garment is no longer in the wardrobe.");

        if (decision.replacement) {
            const wish: ReplacementWish = {
                id: uid("ww"),
                spaceId: this.ctx.space.id,
                itemId,
                name: decision.replacement.name.trim() || `Replacement for ${item.name}`,
                forMemberId: item.ownerMemberId,
                size: decision.replacement.size.trim(),
                priceCents: Math.max(0, Math.round(decision.replacement.priceCents ?? 0)),
                note: decision.replacement.note?.trim() ?? "",
                status: "open",
                createdBy: this.ctx.me.id,
                createdAt: now(),
            };
            this.write((s) => {
                s.wishes = [wish, ...s.wishes];
            });
            result.wishId = wish.id;
        }

        if (decision.handDownToMemberId) {
            const row = await this.handDown(itemId, decision.handDownToMemberId, "Passed on when it stopped fitting.");
            result.handDownId = row.id;
            return result;
        }

        this.write((s) => {
            s.items = s.items.map((x) => (x.id === itemId ? { ...x, status: decision.donate ? "donate" : "outgrown", inLaundry: false, capsuleIds: [] } : x));
            s.capsules = s.capsules.map((c) => (c.itemIds.includes(itemId) ? { ...c, itemIds: c.itemIds.filter((y) => y !== itemId) } : c));
            s.outfits = s.outfits.map((o) => (o.itemIds.includes(itemId) ? { ...o, itemIds: o.itemIds.filter((y) => y !== itemId) } : o));

            if (decision.donate) {
                // One open bag per charity: a second pair of shoes joins the bag
                // by the door rather than opening a second trip to the same shop.
                const open = s.donations.find((d) => !d.doneAt && d.charity.toLowerCase() === decision.donate!.charity.trim().toLowerCase());
                if (open) {
                    s.donations = s.donations.map((d) => (d.id === open.id ? { ...d, itemIds: [...new Set([...d.itemIds, itemId])] } : d));
                    result.donationId = open.id;
                } else {
                    const job: DonateJob = {
                        id: uid("wj"),
                        spaceId: this.ctx.space.id,
                        title: `Donate ${item.name.toLowerCase()}`,
                        itemIds: [itemId],
                        charity: decision.donate.charity.trim() || "The charity shop",
                        dueDate: decision.donate.dueDate ?? isoDate(new Date(new Date(`${this.ctx.today}T00:00:00`).getTime() + 7 * 86400000)),
                        assigneeMemberId: decision.donate.assigneeMemberId ?? this.ctx.me.id,
                        note: decision.donate.note?.trim() ?? "",
                        doneAt: null,
                        givingEntryId: null,
                        createdBy: this.ctx.me.id,
                        createdAt: now(),
                    };
                    s.donations = [job, ...s.donations];
                    result.donationId = job.id;
                }
            }
        });

        return result;
    }

    // -- outfits -------------------------------------------------------------

    async createOutfit(input: NewOutfit): Promise<Outfit> {
        this.mine(input.memberId);
        const name = input.name.trim();
        if (!name) throw new Error("Give the outfit a name — \"Co-op Tuesday\" works.");
        if (!input.itemIds.length) throw new Error("Choose at least one thing to wear.");
        const outfit: Outfit = {
            id: uid("wo"),
            spaceId: this.ctx.space.id,
            name,
            memberId: input.memberId,
            occasion: input.occasion,
            itemIds: [...new Set(input.itemIds)],
            imageUrl: input.imageUrl ?? null,
            notes: input.notes?.trim() ?? "",
            isUniform: Boolean(input.isUniform),
            lastWorn: null,
            createdBy: this.ctx.me.id,
            createdAt: now(),
        };
        this.write((s) => {
            s.outfits = [outfit, ...s.outfits];
        });
        return outfit;
    }

    async updateOutfit(id: string, patch: Partial<Omit<Outfit, "id" | "spaceId" | "createdAt" | "createdBy">>): Promise<void> {
        this.write((s) => {
            const o = s.outfits.find((x) => x.id === id);
            if (!o) throw new Error("That outfit is gone.");
            this.mine(o.memberId);
            if (patch.memberId && patch.memberId !== o.memberId) this.manage();
            s.outfits = s.outfits.map((x) => (x.id === id ? { ...x, ...patch, itemIds: patch.itemIds ? [...new Set(patch.itemIds)] : x.itemIds } : x));
        });
    }

    async removeOutfit(id: string): Promise<void> {
        this.write((s) => {
            const o = s.outfits.find((x) => x.id === id);
            if (!o) return;
            this.mine(o.memberId);
            s.outfits = s.outfits.filter((x) => x.id !== id);
            s.schedule = s.schedule.filter((x) => x.outfitId !== id);
        });
    }

    // -- the week ------------------------------------------------------------

    async setSchedule(memberId: string, date: string, outfitId: string, eventLabel = "", note = ""): Promise<ScheduleEntry> {
        this.mine(memberId);
        return this.write((s) => {
            const outfit = s.outfits.find((o) => o.id === outfitId);
            if (!outfit) throw new Error("Pick an outfit first.");
            if (outfit.memberId !== memberId) throw new Error("That outfit belongs to someone else.");
            const existing = s.schedule.find((x) => x.memberId === memberId && x.date === date);
            const row: ScheduleEntry = existing
                ? { ...existing, outfitId, eventLabel: eventLabel.trim(), note: note.trim() }
                : { id: uid("ws"), spaceId: this.ctx.space.id, memberId, date, outfitId, eventLabel: eventLabel.trim(), note: note.trim(), wornAt: null };
            s.schedule = existing ? s.schedule.map((x) => (x.id === row.id ? row : x)) : [...s.schedule, row];
            return row;
        });
    }

    async clearSchedule(memberId: string, date: string): Promise<void> {
        this.mine(memberId);
        this.write((s) => {
            s.schedule = s.schedule.filter((x) => !(x.memberId === memberId && x.date === date));
        });
    }

    async fillWeek(memberId: string, weekStartDate: string, outfitId: string, days = [0, 1, 2, 3, 4], eventLabel = ""): Promise<number> {
        this.mine(memberId);
        const start = new Date(`${weekStart(`${weekStartDate}T00:00:00`)}T00:00:00`);
        let made = 0;
        this.write((s) => {
            const outfit = s.outfits.find((o) => o.id === outfitId);
            if (!outfit) throw new Error("Pick an outfit first.");
            if (outfit.memberId !== memberId) throw new Error("That outfit belongs to someone else.");
            for (const offset of days) {
                const d = new Date(start);
                d.setDate(d.getDate() + offset);
                const date = isoDate(d);
                if (s.schedule.some((x) => x.memberId === memberId && x.date === date)) continue;
                s.schedule = [...s.schedule, { id: uid("ws"), spaceId: this.ctx.space.id, memberId, date, outfitId, eventLabel: eventLabel.trim(), note: "", wornAt: null }];
                made += 1;
            }
        });
        return made;
    }

    async markScheduleWorn(id: string, worn: boolean): Promise<void> {
        this.write((s) => {
            const row = s.schedule.find((x) => x.id === id);
            if (!row) return;
            this.mine(row.memberId);
            s.schedule = s.schedule.map((x) => (x.id === id ? { ...x, wornAt: worn ? now() : null } : x));
            if (!worn) return;
            const outfit = s.outfits.find((o) => o.id === row.outfitId);
            if (!outfit) return;
            s.outfits = s.outfits.map((o) => (o.id === outfit.id ? { ...o, lastWorn: row.date } : o));
            s.items = s.items.map((it) => (outfit.itemIds.includes(it.id) ? { ...it, lastWorn: row.date, wearCount: it.wearCount + 1 } : it));
        });
    }

    // -- capsules ------------------------------------------------------------

    async createCapsule(input: NewCapsule): Promise<Capsule> {
        this.manage();
        const capsule: Capsule = {
            id: uid("wc"),
            spaceId: this.ctx.space.id,
            name: input.name.trim() || "Capsule",
            memberId: input.memberId,
            tripId: input.tripId ?? null,
            tripLabel: input.tripLabel?.trim() ?? "",
            season: input.season ?? "all",
            itemIds: [...new Set(input.itemIds ?? [])],
            notes: input.notes?.trim() ?? "",
            createdAt: now(),
        };
        this.write((s) => {
            s.capsules = [capsule, ...s.capsules];
            s.items = s.items.map((i) => (capsule.itemIds.includes(i.id) ? { ...i, capsuleIds: [...new Set([...i.capsuleIds, capsule.id])] } : i));
        });
        return capsule;
    }

    async updateCapsule(id: string, patch: Partial<Omit<Capsule, "id" | "spaceId" | "createdAt">>): Promise<void> {
        this.manage();
        this.write((s) => {
            s.capsules = s.capsules.map((c) => (c.id === id ? { ...c, ...patch, itemIds: patch.itemIds ? [...new Set(patch.itemIds)] : c.itemIds } : c));
        });
    }

    async removeCapsule(id: string): Promise<void> {
        this.manage();
        this.write((s) => {
            s.capsules = s.capsules.filter((c) => c.id !== id);
            s.items = s.items.map((i) => (i.capsuleIds.includes(id) ? { ...i, capsuleIds: i.capsuleIds.filter((x) => x !== id) } : i));
        });
    }

    async setCapsuleItems(id: string, itemIds: string[]): Promise<void> {
        this.manage();
        const ids = [...new Set(itemIds)];
        this.write((s) => {
            s.capsules = s.capsules.map((c) => (c.id === id ? { ...c, itemIds: ids } : c));
            s.items = s.items.map((i) => {
                const should = ids.includes(i.id);
                const has = i.capsuleIds.includes(id);
                if (should === has) return i;
                return { ...i, capsuleIds: should ? [...i.capsuleIds, id] : i.capsuleIds.filter((x) => x !== id) };
            });
        });
    }

    // -- wishes and donations -------------------------------------------------

    async updateWish(id: string, patch: Partial<Pick<ReplacementWish, "name" | "size" | "priceCents" | "note" | "status">>): Promise<void> {
        this.manage();
        this.write((s) => {
            s.wishes = s.wishes.map((w) => (w.id === id ? { ...w, ...patch } : w));
        });
    }

    async removeWish(id: string): Promise<void> {
        this.manage();
        this.write((s) => {
            s.wishes = s.wishes.filter((w) => w.id !== id);
        });
    }

    /** AC 7 — dropping the bag off may, if the family says so, become giving. */
    async completeDonation(id: string, giving?: { amountCents: number; note?: string } | null): Promise<GivingEntry | null> {
        this.manage();
        return this.write((s) => {
            const job = s.donations.find((d) => d.id === id);
            if (!job) throw new Error("That donation is gone.");
            let entry: GivingEntry | null = null;
            if (giving && giving.amountCents > 0) {
                entry = {
                    id: uid("wg"),
                    spaceId: this.ctx.space.id,
                    donationId: job.id,
                    label: `Clothing to ${job.charity}`,
                    itemCount: job.itemIds.length,
                    amountCents: Math.round(giving.amountCents),
                    budgetId: "giving",
                    date: this.ctx.today,
                    memberId: job.assigneeMemberId || this.ctx.me.id,
                    note: giving.note?.trim() ?? "",
                };
                s.giving = [entry, ...s.giving];
            }
            s.donations = s.donations.map((d) => (d.id === id ? { ...d, doneAt: now(), givingEntryId: entry?.id ?? d.givingEntryId } : d));
            // The garments have left the house.
            s.items = s.items.filter((i) => !job.itemIds.includes(i.id));
            s.outfits = s.outfits.map((o) => ({ ...o, itemIds: o.itemIds.filter((x) => !job.itemIds.includes(x)) }));
            s.capsules = s.capsules.map((c) => ({ ...c, itemIds: c.itemIds.filter((x) => !job.itemIds.includes(x)) }));
            return entry;
        });
    }

    async reopenDonation(id: string): Promise<void> {
        this.manage();
        this.write((s) => {
            s.donations = s.donations.map((d) => (d.id === id ? { ...d, doneAt: null } : d));
        });
    }

    async removeDonation(id: string): Promise<void> {
        this.manage();
        this.write((s) => {
            const job = s.donations.find((d) => d.id === id);
            s.donations = s.donations.filter((d) => d.id !== id);
            if (job) s.items = s.items.map((i) => (job.itemIds.includes(i.id) && i.status === "donate" ? { ...i, status: "outgrown" } : i));
        });
    }
}
