import type { RepoContext, Visibility } from "@/data/core";
import { isoDate, weekStart } from "@/lib/format";
import { supabase } from "@/lib/supabase";
import { visibleTo } from "./derive";
import type { Capsule, Colour, DonateJob, GivingEntry, HandDown, ItemCategory, ItemPatch, ItemStatus, NewCapsule, NewItem, NewOutfit, Occasion, OutgrownDecision, OutgrownResult, Outfit, ReplacementWish, ScheduleEntry, Season, WardrobeItem, WardrobeRepo, WardrobeState, WishStatus } from "./types";

/**
 * The same wardrobe, live, under row-level security.
 *
 * The database is the real guard: `wf_can_see` decides which garments come
 * back, and a child's policy admits only rows whose `owner_member_id` is their
 * own member row, so a sibling's closet is not merely hidden — it is not
 * fetchable. This repo still runs the result through the same `visibleTo()`
 * the demo uses, so the two modes cannot drift.
 *
 * Outfits keep their pieces in a join table (`wf_outfit_items`) with an
 * explicit position, because the order a family builds an outfit in is the
 * order they lay it out; the array on the client is that order, read back.
 * snake_case ↔ camelCase mapping lives in this file and nowhere else.
 */

type Row = Record<string, unknown>;

const s = (v: unknown, d = ""): string => (typeof v === "string" ? v : d);
const n = (v: unknown, d = 0): number => (typeof v === "number" ? v : Number(v ?? d) || d);
const b = (v: unknown): boolean => v === true;
const iso = (v: unknown): string => (v ? new Date(v as string).toISOString() : new Date().toISOString());
const nul = (v: unknown): string | null => (typeof v === "string" && v ? v : null);
const strs = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);

function fail(where: string, error: { message: string } | null | undefined): void {
    if (error) throw new Error(`${where}: ${error.message}`);
}

const T_ITEM = "wf_wardrobe_items";
const T_OUTFIT = "wf_outfits";
const T_OUTFIT_ITEM = "wf_outfit_items";
const T_SCHEDULE = "wf_attire_schedule";
const T_CAPSULE = "wf_wardrobe_capsules";
const T_HANDDOWN = "wf_handdowns";
const T_WISH = "wf_wardrobe_wishes";
const T_DONATION = "wf_wardrobe_donations";
const T_GIVING = "wf_wardrobe_giving";

const mapItem = (r: Row): WardrobeItem => ({
    id: s(r.id),
    spaceId: s(r.space_id),
    name: s(r.name),
    ownerMemberId: s(r.owner_member_id),
    category: s(r.category, "top") as ItemCategory,
    colour: s(r.colour, "black") as Colour,
    season: s(r.season, "all") as Season,
    size: s(r.size),
    brand: s(r.brand),
    occasions: strs(r.occasions) as Occasion[],
    imageUrl: nul(r.image_url),
    status: s(r.status, "in-use") as ItemStatus,
    favourite: b(r.favourite),
    inLaundry: b(r.in_laundry),
    lastWorn: nul(r.last_worn),
    wearCount: n(r.wear_count),
    careNotes: s(r.care_notes),
    notes: s(r.notes),
    capsuleIds: [],
    visibility: s(r.visibility, "family") as Visibility,
    sharedWith: strs(r.shared_with),
    createdAt: iso(r.created_at),
});

const mapOutfit = (r: Row): Outfit => ({
    id: s(r.id),
    spaceId: s(r.space_id),
    name: s(r.name),
    memberId: s(r.member_id),
    occasion: s(r.occasion, "everyday") as Occasion,
    itemIds: [],
    imageUrl: nul(r.image_url),
    notes: s(r.notes),
    isUniform: b(r.is_uniform),
    lastWorn: nul(r.last_worn),
    createdBy: s(r.created_by),
    createdAt: iso(r.created_at),
});

const mapSchedule = (r: Row): ScheduleEntry => ({
    id: s(r.id),
    spaceId: s(r.space_id),
    memberId: s(r.member_id),
    date: s(r.date),
    outfitId: s(r.outfit_id),
    eventLabel: s(r.event_label),
    note: s(r.note),
    wornAt: nul(r.worn_at),
});

const mapCapsule = (r: Row): Capsule => ({
    id: s(r.id),
    spaceId: s(r.space_id),
    name: s(r.name),
    memberId: s(r.member_id),
    tripId: nul(r.trip_id),
    tripLabel: s(r.trip_label),
    season: s(r.season, "all") as Season,
    itemIds: strs(r.item_ids),
    notes: s(r.notes),
    createdAt: iso(r.created_at),
});

const mapHandDown = (r: Row): HandDown => ({
    id: s(r.id),
    spaceId: s(r.space_id),
    itemId: s(r.item_id),
    itemName: s(r.item_name),
    fromMemberId: s(r.from_member_id),
    toMemberId: s(r.to_member_id),
    note: s(r.note),
    at: iso(r.at),
});

const mapWish = (r: Row): ReplacementWish => ({
    id: s(r.id),
    spaceId: s(r.space_id),
    itemId: nul(r.item_id),
    name: s(r.name),
    forMemberId: s(r.for_member_id),
    size: s(r.size),
    priceCents: n(r.price_cents),
    note: s(r.note),
    status: s(r.status, "open") as WishStatus,
    createdBy: s(r.created_by),
    createdAt: iso(r.created_at),
});

const mapDonation = (r: Row): DonateJob => ({
    id: s(r.id),
    spaceId: s(r.space_id),
    title: s(r.title),
    itemIds: strs(r.item_ids),
    charity: s(r.charity),
    dueDate: s(r.due_date),
    assigneeMemberId: s(r.assignee_member_id),
    note: s(r.note),
    doneAt: nul(r.done_at),
    givingEntryId: nul(r.giving_entry_id),
    createdBy: s(r.created_by),
    createdAt: iso(r.created_at),
});

const mapGiving = (r: Row): GivingEntry => ({
    id: s(r.id),
    spaceId: s(r.space_id),
    donationId: s(r.donation_id),
    label: s(r.label),
    itemCount: n(r.item_count),
    amountCents: n(r.amount_cents),
    budgetId: "giving",
    date: s(r.date),
    memberId: s(r.member_id),
    note: s(r.note),
});

export class SupabaseWardrobeRepo implements WardrobeRepo {
    constructor(private ctx: RepoContext) {}

    private get space(): string {
        return this.ctx.space.id;
    }

    private base(): { organization_id: string | null; space_id: string } {
        return { organization_id: this.ctx.orgId, space_id: this.space };
    }

    private deny(): never {
        throw new Error("Not allowed");
    }

    private manage(): void {
        if (!this.ctx.can("wardrobe.manage")) this.deny();
    }

    private mine(memberId: string): void {
        if (this.ctx.can("wardrobe.manage")) return;
        if (this.ctx.can("wardrobe.mine") && memberId === this.ctx.me.id) return;
        this.deny();
    }

    // -- load ----------------------------------------------------------------

    async load(): Promise<WardrobeState> {
        if (this.ctx.role === "guest") return visibleTo({ items: [], outfits: [], schedule: [], capsules: [], handdowns: [], wishes: [], donations: [], giving: [] }, this.ctx);

        const [items, outfits, links, schedule, capsules, handdowns, wishes, donations, giving] = await Promise.all([
            supabase.from(T_ITEM).select("*").eq("space_id", this.space).order("name"),
            supabase.from(T_OUTFIT).select("*").eq("space_id", this.space).order("created_at", { ascending: false }),
            supabase.from(T_OUTFIT_ITEM).select("*").eq("space_id", this.space).order("position"),
            supabase.from(T_SCHEDULE).select("*").eq("space_id", this.space).order("date"),
            supabase.from(T_CAPSULE).select("*").eq("space_id", this.space).order("created_at", { ascending: false }),
            supabase.from(T_HANDDOWN).select("*").eq("space_id", this.space).order("at", { ascending: false }),
            supabase.from(T_WISH).select("*").eq("space_id", this.space).order("created_at", { ascending: false }),
            supabase.from(T_DONATION).select("*").eq("space_id", this.space).order("due_date"),
            supabase.from(T_GIVING).select("*").eq("space_id", this.space).order("date", { ascending: false }),
        ]);
        fail("wardrobe items", items.error);
        fail("outfits", outfits.error);
        fail("outfit pieces", links.error);
        fail("attire schedule", schedule.error);
        fail("capsules", capsules.error);
        fail("hand-me-downs", handdowns.error);
        fail("replacements", wishes.error);
        fail("donations", donations.error);
        fail("giving", giving.error);

        const itemRows = (items.data ?? []).map(mapItem);
        const capsuleRows = (capsules.data ?? []).map(mapCapsule);
        // Capsule membership lives on the capsule; the item's mirror is derived.
        const byItem = new Map<string, string[]>();
        for (const c of capsuleRows) for (const id of c.itemIds) byItem.set(id, [...(byItem.get(id) ?? []), c.id]);
        for (const it of itemRows) it.capsuleIds = byItem.get(it.id) ?? [];

        const outfitRows = (outfits.data ?? []).map(mapOutfit);
        const byOutfit = new Map<string, string[]>();
        for (const l of links.data ?? []) {
            const oid = s((l as Row).outfit_id);
            byOutfit.set(oid, [...(byOutfit.get(oid) ?? []), s((l as Row).item_id)]);
        }
        for (const o of outfitRows) o.itemIds = byOutfit.get(o.id) ?? [];

        return visibleTo(
            {
                items: itemRows,
                outfits: outfitRows,
                schedule: (schedule.data ?? []).map(mapSchedule),
                capsules: capsuleRows,
                handdowns: (handdowns.data ?? []).map(mapHandDown),
                wishes: (wishes.data ?? []).map(mapWish),
                donations: (donations.data ?? []).map(mapDonation),
                giving: (giving.data ?? []).map(mapGiving),
            },
            this.ctx,
        );
    }

    // -- items ---------------------------------------------------------------

    async addItem(input: NewItem): Promise<WardrobeItem> {
        this.mine(input.ownerMemberId);
        const name = input.name.trim();
        if (!name) throw new Error("Give it a name — \"navy school jumper\" is plenty.");
        const { data, error } = await supabase
            .from(T_ITEM)
            .insert({
                ...this.base(),
                name,
                owner_member_id: input.ownerMemberId,
                category: input.category,
                colour: input.colour,
                season: input.season ?? "all",
                size: input.size?.trim() ?? "",
                brand: input.brand?.trim() ?? "",
                occasions: input.occasions ?? ["everyday"],
                image_url: input.imageUrl ?? null,
                status: "in-use",
                favourite: Boolean(input.favourite),
                care_notes: input.careNotes?.trim() ?? "",
                notes: input.notes?.trim() ?? "",
                visibility: input.visibility ?? "family",
            })
            .select()
            .single();
        fail("add garment", error);
        return mapItem((data ?? {}) as Row);
    }

    async updateItem(id: string, patch: ItemPatch): Promise<void> {
        const owner = await this.ownerOf(id);
        this.mine(owner);
        if (patch.ownerMemberId && patch.ownerMemberId !== owner) this.manage();
        const row: Row = {};
        if (patch.name !== undefined) row.name = patch.name.trim();
        if (patch.ownerMemberId !== undefined) row.owner_member_id = patch.ownerMemberId;
        if (patch.category !== undefined) row.category = patch.category;
        if (patch.colour !== undefined) row.colour = patch.colour;
        if (patch.season !== undefined) row.season = patch.season;
        if (patch.size !== undefined) row.size = patch.size;
        if (patch.brand !== undefined) row.brand = patch.brand;
        if (patch.occasions !== undefined) row.occasions = patch.occasions;
        if (patch.imageUrl !== undefined) row.image_url = patch.imageUrl;
        if (patch.status !== undefined) row.status = patch.status;
        if (patch.favourite !== undefined) row.favourite = patch.favourite;
        if (patch.inLaundry !== undefined) row.in_laundry = patch.inLaundry;
        if (patch.lastWorn !== undefined) row.last_worn = patch.lastWorn;
        if (patch.wearCount !== undefined) row.wear_count = patch.wearCount;
        if (patch.careNotes !== undefined) row.care_notes = patch.careNotes;
        if (patch.notes !== undefined) row.notes = patch.notes;
        if (patch.visibility !== undefined) row.visibility = patch.visibility;
        if (patch.sharedWith !== undefined) row.shared_with = patch.sharedWith;
        if (!Object.keys(row).length) return;
        const { error } = await supabase.from(T_ITEM).update(row).eq("id", id).eq("space_id", this.space);
        fail("update garment", error);
    }

    private async ownerOf(id: string): Promise<string> {
        const { data, error } = await supabase.from(T_ITEM).select("owner_member_id,name,status").eq("id", id).eq("space_id", this.space).single();
        fail("read garment", error);
        return s((data as Row | null)?.owner_member_id);
    }

    async removeItem(id: string): Promise<void> {
        this.mine(await this.ownerOf(id));
        const { error } = await supabase.from(T_ITEM).delete().eq("id", id).eq("space_id", this.space);
        fail("remove garment", error);
    }

    async setFavourite(id: string, on: boolean): Promise<void> {
        this.mine(await this.ownerOf(id));
        const { error } = await supabase.from(T_ITEM).update({ favourite: on }).eq("id", id).eq("space_id", this.space);
        fail("favourite", error);
    }

    async setLaundry(id: string, on: boolean): Promise<void> {
        this.mine(await this.ownerOf(id));
        const { error } = await supabase.from(T_ITEM).update({ in_laundry: on }).eq("id", id).eq("space_id", this.space);
        fail("laundry", error);
    }

    async markWorn(id: string, date?: string): Promise<void> {
        this.mine(await this.ownerOf(id));
        const { data } = await supabase.from(T_ITEM).select("wear_count").eq("id", id).eq("space_id", this.space).single();
        const { error } = await supabase
            .from(T_ITEM)
            .update({ last_worn: date ?? this.ctx.today, wear_count: n((data as Row | null)?.wear_count) + 1, in_laundry: false })
            .eq("id", id)
            .eq("space_id", this.space);
        fail("log a wear", error);
    }

    // -- hand-me-downs -------------------------------------------------------

    async handDown(itemId: string, toMemberId: string, note = ""): Promise<HandDown> {
        this.manage();
        const { data: item, error: readErr } = await supabase.from(T_ITEM).select("owner_member_id,name").eq("id", itemId).eq("space_id", this.space).single();
        fail("read garment", readErr);
        const from = s((item as Row | null)?.owner_member_id);
        if (from === toMemberId) throw new Error("They already own it.");
        const { data, error } = await supabase
            .from(T_HANDDOWN)
            .insert({ ...this.base(), item_id: itemId, item_name: s((item as Row | null)?.name), from_member_id: from, to_member_id: toMemberId, note: note.trim() })
            .select()
            .single();
        fail("hand down", error);
        const { error: moveErr } = await supabase.from(T_ITEM).update({ owner_member_id: toMemberId, status: "handed-down", in_laundry: false, last_worn: null }).eq("id", itemId).eq("space_id", this.space);
        fail("hand down", moveErr);
        // The garment leaves the previous owner's outfits and capsules with it.
        await supabase.from(T_OUTFIT_ITEM).delete().eq("space_id", this.space).eq("item_id", itemId);
        const { data: caps } = await supabase.from(T_CAPSULE).select("id,item_ids,member_id").eq("space_id", this.space).contains("item_ids", [itemId]);
        for (const c of (caps ?? []) as Row[]) {
            if (s(c.member_id) === toMemberId) continue;
            await supabase.from(T_CAPSULE).update({ item_ids: strs(c.item_ids).filter((x) => x !== itemId) }).eq("id", s(c.id));
        }
        return mapHandDown((data ?? {}) as Row);
    }

    // -- outgrown, in one step ------------------------------------------------

    async markOutgrown(itemId: string, decision: OutgrownDecision): Promise<OutgrownResult> {
        this.manage();
        const result: OutgrownResult = { wishId: null, donationId: null, handDownId: null };
        const { data: item, error: readErr } = await supabase.from(T_ITEM).select("owner_member_id,name").eq("id", itemId).eq("space_id", this.space).single();
        fail("read garment", readErr);
        const owner = s((item as Row | null)?.owner_member_id);
        const itemName = s((item as Row | null)?.name);

        if (decision.replacement) {
            const { data, error } = await supabase
                .from(T_WISH)
                .insert({
                    ...this.base(),
                    item_id: itemId,
                    name: decision.replacement.name.trim() || `Replacement for ${itemName}`,
                    for_member_id: owner,
                    size: decision.replacement.size.trim(),
                    price_cents: Math.max(0, Math.round(decision.replacement.priceCents ?? 0)),
                    note: decision.replacement.note?.trim() ?? "",
                    status: "open",
                    created_by: this.ctx.me.id,
                })
                .select("id")
                .single();
            fail("replacement", error);
            result.wishId = s((data as Row | null)?.id);
        }

        if (decision.handDownToMemberId) {
            const row = await this.handDown(itemId, decision.handDownToMemberId, "Passed on when it stopped fitting.");
            result.handDownId = row.id;
            return result;
        }

        const { error: statusErr } = await supabase.from(T_ITEM).update({ status: decision.donate ? "donate" : "outgrown", in_laundry: false }).eq("id", itemId).eq("space_id", this.space);
        fail("mark outgrown", statusErr);
        await supabase.from(T_OUTFIT_ITEM).delete().eq("space_id", this.space).eq("item_id", itemId);
        const { data: caps } = await supabase.from(T_CAPSULE).select("id,item_ids").eq("space_id", this.space).contains("item_ids", [itemId]);
        for (const c of (caps ?? []) as Row[]) {
            await supabase.from(T_CAPSULE).update({ item_ids: strs(c.item_ids).filter((x) => x !== itemId) }).eq("id", s(c.id));
        }

        if (decision.donate) {
            const charity = decision.donate.charity.trim() || "The charity shop";
            const { data: open } = await supabase.from(T_DONATION).select("id,item_ids").eq("space_id", this.space).is("done_at", null).ilike("charity", charity).limit(1);
            const existing = (open ?? [])[0] as Row | undefined;
            if (existing) {
                const ids = [...new Set([...strs(existing.item_ids), itemId])];
                const { error } = await supabase.from(T_DONATION).update({ item_ids: ids }).eq("id", s(existing.id));
                fail("donate job", error);
                result.donationId = s(existing.id);
            } else {
                const { data, error } = await supabase
                    .from(T_DONATION)
                    .insert({
                        ...this.base(),
                        title: `Donate ${itemName.toLowerCase()}`,
                        item_ids: [itemId],
                        charity,
                        due_date: decision.donate.dueDate ?? isoDate(new Date(new Date(`${this.ctx.today}T00:00:00`).getTime() + 7 * 86400000)),
                        assignee_member_id: decision.donate.assigneeMemberId ?? this.ctx.me.id,
                        note: decision.donate.note?.trim() ?? "",
                        created_by: this.ctx.me.id,
                    })
                    .select("id")
                    .single();
                fail("donate job", error);
                result.donationId = s((data as Row | null)?.id);
            }
        }
        return result;
    }

    // -- outfits -------------------------------------------------------------

    private async setOutfitItems(outfitId: string, itemIds: string[]): Promise<void> {
        await supabase.from(T_OUTFIT_ITEM).delete().eq("space_id", this.space).eq("outfit_id", outfitId);
        const rows = [...new Set(itemIds)].map((item_id, position) => ({ ...this.base(), outfit_id: outfitId, item_id, position }));
        if (!rows.length) return;
        const { error } = await supabase.from(T_OUTFIT_ITEM).insert(rows);
        fail("outfit pieces", error);
    }

    async createOutfit(input: NewOutfit): Promise<Outfit> {
        this.mine(input.memberId);
        if (!input.name.trim()) throw new Error("Give the outfit a name — \"Co-op Tuesday\" works.");
        if (!input.itemIds.length) throw new Error("Choose at least one thing to wear.");
        const { data, error } = await supabase
            .from(T_OUTFIT)
            .insert({
                ...this.base(),
                name: input.name.trim(),
                member_id: input.memberId,
                occasion: input.occasion,
                image_url: input.imageUrl ?? null,
                notes: input.notes?.trim() ?? "",
                is_uniform: Boolean(input.isUniform),
                created_by: this.ctx.me.id,
            })
            .select()
            .single();
        fail("create outfit", error);
        const outfit = mapOutfit((data ?? {}) as Row);
        await this.setOutfitItems(outfit.id, input.itemIds);
        return { ...outfit, itemIds: [...new Set(input.itemIds)] };
    }

    async updateOutfit(id: string, patch: Partial<Omit<Outfit, "id" | "spaceId" | "createdAt" | "createdBy">>): Promise<void> {
        const { data: existing, error: readErr } = await supabase.from(T_OUTFIT).select("member_id").eq("id", id).eq("space_id", this.space).single();
        fail("read outfit", readErr);
        this.mine(s((existing as Row | null)?.member_id));
        if (patch.memberId && patch.memberId !== s((existing as Row | null)?.member_id)) this.manage();
        const row: Row = {};
        if (patch.name !== undefined) row.name = patch.name.trim();
        if (patch.memberId !== undefined) row.member_id = patch.memberId;
        if (patch.occasion !== undefined) row.occasion = patch.occasion;
        if (patch.imageUrl !== undefined) row.image_url = patch.imageUrl;
        if (patch.notes !== undefined) row.notes = patch.notes;
        if (patch.isUniform !== undefined) row.is_uniform = patch.isUniform;
        if (patch.lastWorn !== undefined) row.last_worn = patch.lastWorn;
        if (Object.keys(row).length) {
            const { error } = await supabase.from(T_OUTFIT).update(row).eq("id", id).eq("space_id", this.space);
            fail("update outfit", error);
        }
        if (patch.itemIds) await this.setOutfitItems(id, patch.itemIds);
    }

    async removeOutfit(id: string): Promise<void> {
        const { data: existing } = await supabase.from(T_OUTFIT).select("member_id").eq("id", id).eq("space_id", this.space).single();
        this.mine(s((existing as Row | null)?.member_id));
        const { error } = await supabase.from(T_OUTFIT).delete().eq("id", id).eq("space_id", this.space);
        fail("remove outfit", error);
    }

    // -- the week ------------------------------------------------------------

    async setSchedule(memberId: string, date: string, outfitId: string, eventLabel = "", note = ""): Promise<ScheduleEntry> {
        this.mine(memberId);
        const { data, error } = await supabase
            .from(T_SCHEDULE)
            .upsert({ ...this.base(), member_id: memberId, date, outfit_id: outfitId, event_label: eventLabel.trim(), note: note.trim() }, { onConflict: "space_id,member_id,date" })
            .select()
            .single();
        fail("lay out the day", error);
        return mapSchedule((data ?? {}) as Row);
    }

    async clearSchedule(memberId: string, date: string): Promise<void> {
        this.mine(memberId);
        const { error } = await supabase.from(T_SCHEDULE).delete().eq("space_id", this.space).eq("member_id", memberId).eq("date", date);
        fail("clear the day", error);
    }

    async fillWeek(memberId: string, weekStartDate: string, outfitId: string, days = [0, 1, 2, 3, 4], eventLabel = ""): Promise<number> {
        this.mine(memberId);
        const start = new Date(`${weekStart(`${weekStartDate}T00:00:00`)}T00:00:00`);
        const dates = days.map((offset) => {
            const d = new Date(start);
            d.setDate(d.getDate() + offset);
            return isoDate(d);
        });
        const { data: taken } = await supabase.from(T_SCHEDULE).select("date").eq("space_id", this.space).eq("member_id", memberId).in("date", dates);
        const already = new Set((taken ?? []).map((r) => s((r as Row).date)));
        const rows = dates.filter((d) => !already.has(d)).map((date) => ({ ...this.base(), member_id: memberId, date, outfit_id: outfitId, event_label: eventLabel.trim(), note: "" }));
        if (!rows.length) return 0;
        const { error } = await supabase.from(T_SCHEDULE).insert(rows);
        fail("fill the week", error);
        return rows.length;
    }

    async markScheduleWorn(id: string, worn: boolean): Promise<void> {
        const { data: row, error: readErr } = await supabase.from(T_SCHEDULE).select("member_id,outfit_id,date").eq("id", id).eq("space_id", this.space).single();
        fail("read the day", readErr);
        this.mine(s((row as Row | null)?.member_id));
        const { error } = await supabase.from(T_SCHEDULE).update({ worn_at: worn ? new Date().toISOString() : null }).eq("id", id).eq("space_id", this.space);
        fail("mark worn", error);
        if (!worn) return;
        const outfitId = s((row as Row | null)?.outfit_id);
        const date = s((row as Row | null)?.date);
        await supabase.from(T_OUTFIT).update({ last_worn: date }).eq("id", outfitId).eq("space_id", this.space);
        const { data: links } = await supabase.from(T_OUTFIT_ITEM).select("item_id").eq("space_id", this.space).eq("outfit_id", outfitId);
        for (const l of (links ?? []) as Row[]) await this.markWorn(s(l.item_id), date);
    }

    // -- capsules ------------------------------------------------------------

    async createCapsule(input: NewCapsule): Promise<Capsule> {
        this.manage();
        const { data, error } = await supabase
            .from(T_CAPSULE)
            .insert({
                ...this.base(),
                name: input.name.trim() || "Capsule",
                member_id: input.memberId,
                trip_id: input.tripId ?? null,
                trip_label: input.tripLabel?.trim() ?? "",
                season: input.season ?? "all",
                item_ids: [...new Set(input.itemIds ?? [])],
                notes: input.notes?.trim() ?? "",
            })
            .select()
            .single();
        fail("create capsule", error);
        return mapCapsule((data ?? {}) as Row);
    }

    async updateCapsule(id: string, patch: Partial<Omit<Capsule, "id" | "spaceId" | "createdAt">>): Promise<void> {
        this.manage();
        const row: Row = {};
        if (patch.name !== undefined) row.name = patch.name.trim();
        if (patch.memberId !== undefined) row.member_id = patch.memberId;
        if (patch.tripId !== undefined) row.trip_id = patch.tripId;
        if (patch.tripLabel !== undefined) row.trip_label = patch.tripLabel;
        if (patch.season !== undefined) row.season = patch.season;
        if (patch.itemIds !== undefined) row.item_ids = [...new Set(patch.itemIds)];
        if (patch.notes !== undefined) row.notes = patch.notes;
        if (!Object.keys(row).length) return;
        const { error } = await supabase.from(T_CAPSULE).update(row).eq("id", id).eq("space_id", this.space);
        fail("update capsule", error);
    }

    async removeCapsule(id: string): Promise<void> {
        this.manage();
        const { error } = await supabase.from(T_CAPSULE).delete().eq("id", id).eq("space_id", this.space);
        fail("remove capsule", error);
    }

    async setCapsuleItems(id: string, itemIds: string[]): Promise<void> {
        this.manage();
        const { error } = await supabase.from(T_CAPSULE).update({ item_ids: [...new Set(itemIds)] }).eq("id", id).eq("space_id", this.space);
        fail("capsule pieces", error);
    }

    // -- wishes and donations -------------------------------------------------

    async updateWish(id: string, patch: Partial<Pick<ReplacementWish, "name" | "size" | "priceCents" | "note" | "status">>): Promise<void> {
        this.manage();
        const row: Row = {};
        if (patch.name !== undefined) row.name = patch.name.trim();
        if (patch.size !== undefined) row.size = patch.size;
        if (patch.priceCents !== undefined) row.price_cents = Math.max(0, Math.round(patch.priceCents));
        if (patch.note !== undefined) row.note = patch.note;
        if (patch.status !== undefined) row.status = patch.status;
        if (!Object.keys(row).length) return;
        const { error } = await supabase.from(T_WISH).update(row).eq("id", id).eq("space_id", this.space);
        fail("update replacement", error);
    }

    async removeWish(id: string): Promise<void> {
        this.manage();
        const { error } = await supabase.from(T_WISH).delete().eq("id", id).eq("space_id", this.space);
        fail("remove replacement", error);
    }

    async completeDonation(id: string, giving?: { amountCents: number; note?: string } | null): Promise<GivingEntry | null> {
        this.manage();
        const { data: job, error: readErr } = await supabase.from(T_DONATION).select("*").eq("id", id).eq("space_id", this.space).single();
        fail("read donation", readErr);
        const row = (job ?? {}) as Row;
        const itemIds = strs(row.item_ids);
        let entry: GivingEntry | null = null;

        if (giving && giving.amountCents > 0) {
            const { data, error } = await supabase
                .from(T_GIVING)
                .insert({
                    ...this.base(),
                    donation_id: id,
                    label: `Clothing to ${s(row.charity)}`,
                    item_count: itemIds.length,
                    amount_cents: Math.round(giving.amountCents),
                    date: this.ctx.today,
                    member_id: s(row.assignee_member_id) || this.ctx.me.id,
                    note: giving.note?.trim() ?? "",
                })
                .select()
                .single();
            fail("record giving", error);
            entry = mapGiving((data ?? {}) as Row);
        }

        const { error } = await supabase.from(T_DONATION).update({ done_at: new Date().toISOString(), giving_entry_id: entry?.id ?? nul(row.giving_entry_id) }).eq("id", id).eq("space_id", this.space);
        fail("complete donation", error);
        if (itemIds.length) {
            const { error: delErr } = await supabase.from(T_ITEM).delete().in("id", itemIds).eq("space_id", this.space);
            fail("clear donated garments", delErr);
        }
        return entry;
    }

    async reopenDonation(id: string): Promise<void> {
        this.manage();
        const { error } = await supabase.from(T_DONATION).update({ done_at: null }).eq("id", id).eq("space_id", this.space);
        fail("reopen donation", error);
    }

    async removeDonation(id: string): Promise<void> {
        this.manage();
        const { data: job } = await supabase.from(T_DONATION).select("item_ids").eq("id", id).eq("space_id", this.space).single();
        const ids = strs((job as Row | null)?.item_ids);
        const { error } = await supabase.from(T_DONATION).delete().eq("id", id).eq("space_id", this.space);
        fail("remove donation", error);
        if (ids.length) await supabase.from(T_ITEM).update({ status: "outgrown" }).in("id", ids).eq("space_id", this.space).eq("status", "donate");
    }
}
