import { useEffect, useMemo, useState } from "react";
import { ArrowLeftRight, Gift, Loader2, ShoppingBag, Sparkles, X } from "lucide-react";
import type { Member } from "@/data/core";
import { cn } from "@/lib/cn";
import { isoDate } from "@/lib/format";
import { Dialog } from "@/components/ui/overlay";
import { Button, EmptyState } from "@/components/ui/primitives";
import { MemberAvatar } from "@/components/shared";
import { filterItems, inUse, suggestReplacement } from "../derive";
import { CATEGORIES, CATEGORY, COLOUR, COLOURS, OCCASION, OCCASIONS, SEASON, SEASONS } from "../types";
import type { Capsule, Colour, ItemCategory, NewCapsule, NewItem, NewOutfit, Occasion, OutgrownDecision, Outfit, Season, WardrobeItem } from "../types";
import { ItemPhoto, ItemStrip, Labelled, PhotoField, PickTile, PillGroup, inputCls } from "./pieces";

/**
 * Every write in the wardrobe happens in one of these, and each one is a whole
 * decision rather than a field: the garment with its photograph, the outfit
 * built on a board, the day laid out, the trip capsule, and — the one that
 * matters most — what happens when something stops fitting, taken once.
 */

// ---------------------------------------------------------------------------
// A garment
// ---------------------------------------------------------------------------

export function ItemDialog({ open, onClose, item, owners, defaultOwner, canReassign, onSubmit, onDelete }: { open: boolean; onClose: () => void; item?: WardrobeItem | null; owners: Member[]; defaultOwner: string; canReassign: boolean; onSubmit: (v: NewItem) => Promise<void>; onDelete?: () => void }) {
    const [name, setName] = useState("");
    const [ownerMemberId, setOwner] = useState(defaultOwner);
    const [category, setCategory] = useState<ItemCategory>("top");
    const [colour, setColour] = useState<Colour>("navy");
    const [season, setSeason] = useState<Season>("all");
    const [size, setSize] = useState("");
    const [brand, setBrand] = useState("");
    const [occasions, setOccasions] = useState<Occasion[]>(["everyday"]);
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const [careNotes, setCare] = useState("");
    const [notes, setNotes] = useState("");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!open) return;
        setError(null);
        setName(item?.name ?? "");
        setOwner(item?.ownerMemberId ?? defaultOwner);
        setCategory(item?.category ?? "top");
        setColour(item?.colour ?? "navy");
        setSeason(item?.season ?? "all");
        setSize(item?.size ?? "");
        setBrand(item?.brand ?? "");
        setOccasions(item?.occasions.length ? item.occasions : ["everyday"]);
        setImageUrl(item?.imageUrl ?? null);
        setCare(item?.careNotes ?? "");
        setNotes(item?.notes ?? "");
    }, [open, item, defaultOwner]);

    const save = async (e: React.FormEvent): Promise<void> => {
        e.preventDefault();
        if (!name.trim()) {
            setError("Give it a name — “navy school jumper” is plenty.");
            return;
        }
        setBusy(true);
        setError(null);
        try {
            await onSubmit({ name, ownerMemberId, category, colour, season, size, brand, occasions, imageUrl, careNotes, notes });
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : "That didn't save.");
        } finally {
            setBusy(false);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} title={item ? "Edit the garment" : "Add to the closet"} wide>
            <form onSubmit={save} className="grid gap-4">
                <PhotoField value={imageUrl} onChange={setImageUrl} />
                <Labelled label="What is it">
                    <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Navy padded winter coat" className={inputCls} required />
                </Labelled>
                <div className="grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-2">
                    <Labelled label="Whose">
                        <select value={ownerMemberId} onChange={(e) => setOwner(e.target.value)} disabled={!canReassign} className={cn(inputCls, !canReassign && "opacity-60")}>
                            {owners.map((m) => (
                                <option key={m.id} value={m.id}>
                                    {m.name}
                                </option>
                            ))}
                        </select>
                    </Labelled>
                    <Labelled label="Kind">
                        <select value={category} onChange={(e) => setCategory(e.target.value as ItemCategory)} className={inputCls}>
                            {CATEGORIES.map((c) => (
                                <option key={c} value={c}>
                                    {CATEGORY[c].emoji} {CATEGORY[c].label}
                                </option>
                            ))}
                        </select>
                    </Labelled>
                    <Labelled label="Colour">
                        <select value={colour} onChange={(e) => setColour(e.target.value as Colour)} className={inputCls}>
                            {COLOURS.map((c) => (
                                <option key={c} value={c}>
                                    {COLOUR[c].label}
                                </option>
                            ))}
                        </select>
                    </Labelled>
                    <Labelled label="Season">
                        <select value={season} onChange={(e) => setSeason(e.target.value as Season)} className={inputCls}>
                            {SEASONS.map((c) => (
                                <option key={c} value={c}>
                                    {SEASON[c].label}
                                </option>
                            ))}
                        </select>
                    </Labelled>
                    <Labelled label="Size" hint="As the label reads: “Age 9-10”, “UK 12”, “Size 3”.">
                        <input value={size} onChange={(e) => setSize(e.target.value)} placeholder="Age 9-10" className={inputCls} />
                    </Labelled>
                    <Labelled label="Brand">
                        <input value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="Clarks" className={inputCls} />
                    </Labelled>
                </div>
                <PillGroup label="When it gets worn" options={OCCASIONS.map((o) => ({ value: o, label: OCCASION[o].label }))} value={occasions} onChange={setOccasions} />
                <Labelled label="Care" hint="What the label says, in your own words.">
                    <input value={careNotes} onChange={(e) => setCare(e.target.value)} placeholder="40°, tumble dry low. Name tape inside the collar." className={inputCls} />
                </Labelled>
                <Labelled label="Notes">
                    <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Anything worth remembering." className="w-full rounded-sm border border-line-strong bg-card px-3 py-2 text-md outline-none focus:border-brand" />
                </Labelled>
                {error && <p className="text-sm text-danger-ink">{error}</p>}
                <div className="flex flex-wrap justify-end gap-2 pt-1">
                    {onDelete && (
                        <Button type="button" variant="danger" onClick={onDelete} className="mr-auto">
                            Remove it
                        </Button>
                    )}
                    <Button type="button" variant="ghost" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button type="submit" loading={busy}>
                        {item ? "Save" : "Add it"}
                    </Button>
                </div>
            </form>
        </Dialog>
    );
}

// ---------------------------------------------------------------------------
// The outfit builder
// ---------------------------------------------------------------------------

export interface OutfitSuggestion {
    itemIds: string[];
    why: string;
    source: "companion" | "closet";
}

/**
 * The builder is a board and a drawer: what you have chosen, in the order you
 * chose it, above everything you could choose. The companion fills the board
 * rather than replacing it — a suggestion you can take apart is a suggestion
 * you can trust.
 */
export function OutfitDialog({ open, onClose, outfit, items, members, defaultMember, canPickMember, onSubmit, onSuggest, suggesting }: { open: boolean; onClose: () => void; outfit?: Outfit | null; items: WardrobeItem[]; members: Member[]; defaultMember: string; canPickMember: boolean; onSubmit: (v: NewOutfit) => Promise<void>; onSuggest?: (memberId: string, occasion: Occasion) => Promise<OutfitSuggestion | null>; suggesting?: boolean }) {
    const [name, setName] = useState("");
    const [memberId, setMemberId] = useState(defaultMember);
    const [occasion, setOccasion] = useState<Occasion>("everyday");
    const [itemIds, setItemIds] = useState<string[]>([]);
    const [isUniform, setUniform] = useState(false);
    const [notes, setNotes] = useState("");
    const [cat, setCat] = useState<ItemCategory | "">("");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [why, setWhy] = useState<string | null>(null);

    useEffect(() => {
        if (!open) return;
        setError(null);
        setWhy(null);
        setCat("");
        setName(outfit?.name ?? "");
        setMemberId(outfit?.memberId ?? defaultMember);
        setOccasion(outfit?.occasion ?? "everyday");
        setItemIds(outfit?.itemIds ?? []);
        setUniform(Boolean(outfit?.isUniform));
        setNotes(outfit?.notes ?? "");
    }, [open, outfit, defaultMember]);

    const pool = useMemo(() => filterItems(items.filter((i) => i.ownerMemberId === memberId && inUse(i)), { category: cat }), [items, memberId, cat]);
    const chosen = useMemo(() => itemIds.map((id) => items.find((i) => i.id === id)).filter((x): x is WardrobeItem => Boolean(x)), [itemIds, items]);
    const cats = useMemo(() => CATEGORIES.filter((c) => items.some((i) => i.ownerMemberId === memberId && inUse(i) && i.category === c)), [items, memberId]);

    const toggle = (id: string): void => setItemIds((v) => (v.includes(id) ? v.filter((x) => x !== id) : [...v, id]));

    const suggest = async (): Promise<void> => {
        if (!onSuggest) return;
        setError(null);
        const r = await onSuggest(memberId, occasion);
        if (!r) return;
        setItemIds(r.itemIds);
        setWhy(r.why);
        if (!name.trim()) setName(`${OCCASION[occasion].label} outfit`);
    };

    const save = async (e: React.FormEvent): Promise<void> => {
        e.preventDefault();
        if (!name.trim()) {
            setError("Give the outfit a name — “Co-op Tuesday” works.");
            return;
        }
        if (!itemIds.length) {
            setError("Choose at least one thing to wear.");
            return;
        }
        setBusy(true);
        setError(null);
        try {
            await onSubmit({ name, memberId, occasion, itemIds, notes, isUniform });
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : "That didn't save.");
        } finally {
            setBusy(false);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} title={outfit ? "Edit the outfit" : "Build an outfit"} wide>
            <form onSubmit={save} className="grid gap-4">
                <div className="grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-2">
                    <Labelled label="Call it">
                        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Co-op Tuesday" className={inputCls} required />
                    </Labelled>
                    {canPickMember ? (
                        <Labelled label="For">
                            <select
                                value={memberId}
                                onChange={(e) => {
                                    setMemberId(e.target.value);
                                    setItemIds([]);
                                }}
                                className={inputCls}
                            >
                                {members.map((m) => (
                                    <option key={m.id} value={m.id}>
                                        {m.name}
                                    </option>
                                ))}
                            </select>
                        </Labelled>
                    ) : (
                        <Labelled label="Occasion">
                            <select value={occasion} onChange={(e) => setOccasion(e.target.value as Occasion)} className={inputCls}>
                                {OCCASIONS.map((o) => (
                                    <option key={o} value={o}>
                                        {OCCASION[o].emoji} {OCCASION[o].label}
                                    </option>
                                ))}
                            </select>
                        </Labelled>
                    )}
                </div>
                {canPickMember && (
                    <Labelled label="Occasion">
                        <select value={occasion} onChange={(e) => setOccasion(e.target.value as Occasion)} className={inputCls}>
                            {OCCASIONS.map((o) => (
                                <option key={o} value={o}>
                                    {OCCASION[o].emoji} {OCCASION[o].label}
                                </option>
                            ))}
                        </select>
                    </Labelled>
                )}

                {/* The board */}
                <div className="rounded-lg bg-page p-3">
                    <div className="mb-2 flex items-center justify-between gap-3">
                        <h3 className="text-sm font-semibold uppercase tracking-[0.06em] text-muted">The look · {chosen.length} pieces</h3>
                        {onSuggest && (
                            <button type="button" onClick={() => void suggest()} disabled={suggesting} className="inline-flex h-8 items-center gap-1.5 rounded-full border border-brand bg-card px-3 text-xs font-semibold text-brand disabled:opacity-50">
                                {suggesting ? <Loader2 size={13} className="animate-spin" aria-hidden="true" /> : <Sparkles size={13} aria-hidden="true" />}
                                {suggesting ? "Thinking…" : "Suggest one"}
                            </button>
                        )}
                    </div>
                    {chosen.length ? (
                        <ul className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                            {chosen.map((i, n) => (
                                <li key={i.id} className="relative">
                                    <span className="block aspect-square overflow-hidden rounded-md bg-card">
                                        <ItemPhoto item={i} w={140} h={140} />
                                    </span>
                                    <span className="absolute left-1 top-1 grid size-5 place-items-center rounded-full bg-ink text-[10px] font-bold text-white">{n + 1}</span>
                                    <button type="button" onClick={() => toggle(i.id)} aria-label={`Take ${i.name} out of the outfit`} className="absolute right-1 top-1 grid size-6 place-items-center rounded-full bg-card text-muted hover:text-danger-ink">
                                        <X size={13} aria-hidden="true" />
                                    </button>
                                    <span className="mt-1 block truncate text-2xs text-caption">{i.name}</span>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="py-4 text-center text-sm text-caption">Nothing on the board yet. Tap things below to lay them out.</p>
                    )}
                    {why && (
                        <p className="mt-3 rounded-sm bg-brand-soft px-3 py-2 text-sm leading-5 text-brand-ink">
                            <Sparkles size={12} className="mr-1 inline" aria-hidden="true" />
                            {why}
                        </p>
                    )}
                </div>

                {/* The drawer */}
                <div>
                    <div className="no-scrollbar -mx-1 mb-2 flex gap-2 overflow-x-auto px-1">
                        <button type="button" aria-pressed={cat === ""} onClick={() => setCat("")} className={cn("h-8 shrink-0 rounded-full border px-3 text-xs font-medium", cat === "" ? "border-brand bg-brand-soft text-brand-ink" : "border-line-strong text-muted")}>
                            Everything
                        </button>
                        {cats.map((c) => (
                            <button key={c} type="button" aria-pressed={cat === c} onClick={() => setCat(c)} className={cn("h-8 shrink-0 rounded-full border px-3 text-xs font-medium", cat === c ? "border-brand bg-brand-soft text-brand-ink" : "border-line-strong text-muted")}>
                                {CATEGORY[c].plural}
                            </button>
                        ))}
                    </div>
                    {pool.length ? (
                        <ul className="grid max-h-72 grid-cols-3 gap-2 overflow-y-auto sm:grid-cols-5">
                            {pool.map((i) => (
                                <PickTile key={i.id} item={i} selected={itemIds.includes(i.id)} index={itemIds.indexOf(i.id) >= 0 ? itemIds.indexOf(i.id) : undefined} onToggle={() => toggle(i.id)} />
                            ))}
                        </ul>
                    ) : (
                        <p className="rounded-md bg-page px-4 py-6 text-center text-sm text-caption">Nothing in this drawer yet.</p>
                    )}
                </div>

                <Labelled label="Notes">
                    <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Kit in the blue bag the night before, or it is forgotten." className={inputCls} />
                </Labelled>
                <label className="flex items-start gap-2.5 rounded-md bg-page px-3 py-2.5">
                    <input type="checkbox" checked={isUniform} onChange={(e) => setUniform(e.target.checked)} className="mt-0.5 size-4 accent-[var(--color-brand)]" />
                    <span className="text-sm font-semibold leading-5">
                        This is the everyday one
                        <span className="block font-normal text-caption">The week planner offers it as the one-tap fill for Monday to Friday.</span>
                    </span>
                </label>
                {error && <p className="text-sm text-danger-ink">{error}</p>}
                <div className="flex justify-end gap-2 pt-1">
                    <Button type="button" variant="ghost" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button type="submit" loading={busy}>
                        {outfit ? "Save the outfit" : "Save it"}
                    </Button>
                </div>
            </form>
        </Dialog>
    );
}

// ---------------------------------------------------------------------------
// Laying out a day
// ---------------------------------------------------------------------------

export function ScheduleDialog({ open, onClose, member, date, entryOutfitId, entryLabel, outfits, items, onSave, onClear }: { open: boolean; onClose: () => void; member: Member | undefined; date: string; entryOutfitId?: string; entryLabel?: string; outfits: Outfit[]; items: WardrobeItem[]; onSave: (outfitId: string, eventLabel: string) => Promise<void>; onClear?: () => Promise<void> }) {
    const [outfitId, setOutfitId] = useState("");
    const [label, setLabel] = useState("");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!open) return;
        setError(null);
        setOutfitId(entryOutfitId ?? outfits[0]?.id ?? "");
        setLabel(entryLabel ?? "");
    }, [open, entryOutfitId, entryLabel, outfits]);

    const save = async (e: React.FormEvent): Promise<void> => {
        e.preventDefault();
        if (!outfitId) {
            setError("Pick an outfit — or build one first.");
            return;
        }
        setBusy(true);
        try {
            await onSave(outfitId, label);
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : "That didn't save.");
        } finally {
            setBusy(false);
        }
    };

    const pretty = new Date(`${date}T00:00:00`).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });

    return (
        <Dialog open={open} onClose={onClose} title={member ? `${member.name.split(" ")[0]} · ${pretty}` : pretty}>
            {outfits.length ? (
                <form onSubmit={save} className="grid gap-4">
                    <fieldset>
                        <legend className="mb-1.5 text-xs font-medium uppercase tracking-[0.06em] text-muted">What they're wearing</legend>
                        <ul className="grid gap-2">
                            {outfits.map((o) => {
                                const pieces = o.itemIds.map((id) => items.find((i) => i.id === id)).filter((x): x is WardrobeItem => Boolean(x));
                                return (
                                    <li key={o.id}>
                                        <label className={cn("flex cursor-pointer items-center gap-3 rounded-md border px-3 py-2.5", outfitId === o.id ? "border-brand bg-brand-soft" : "border-line-strong")}>
                                            <input type="radio" name="outfit" value={o.id} checked={outfitId === o.id} onChange={() => setOutfitId(o.id)} className="size-4 accent-[var(--color-brand)]" />
                                            <span className="min-w-0 flex-1">
                                                <span className="block truncate text-md font-semibold">{o.name}</span>
                                                <span className="block text-xs text-caption">
                                                    {OCCASION[o.occasion].label} · {pieces.length} pieces
                                                </span>
                                            </span>
                                            <ItemStrip items={pieces} max={3} size={32} />
                                        </label>
                                    </li>
                                );
                            })}
                        </ul>
                    </fieldset>
                    <Labelled label="What the day is" hint="“Co-op”, “Swimming”, “Church” — it shows on the dashboard.">
                        <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Co-op" className={inputCls} />
                    </Labelled>
                    {error && <p className="text-sm text-danger-ink">{error}</p>}
                    <div className="flex justify-end gap-2">
                        {entryOutfitId && onClear && (
                            <Button
                                type="button"
                                variant="ghost"
                                className="mr-auto"
                                onClick={async () => {
                                    await onClear();
                                    onClose();
                                }}
                            >
                                Clear the day
                            </Button>
                        )}
                        <Button type="button" variant="ghost" onClick={onClose}>
                            Cancel
                        </Button>
                        <Button type="submit" loading={busy}>
                            Lay it out
                        </Button>
                    </div>
                </form>
            ) : (
                <EmptyState title="No outfits yet" body="Build one first and it will be offered here — and on every other day of the week." />
            )}
        </Dialog>
    );
}

// ---------------------------------------------------------------------------
// Outgrown, in one step (AC 4)
// ---------------------------------------------------------------------------

/**
 * The screen the module exists for. A garment stops fitting once; the three
 * things that follow — the next child, the replacement, the charity bag — are
 * decided here together, or they are not decided at all.
 */
export function OutgrownDialog({ open, onClose, item, candidates, defaultAssignee, currency, onSubmit }: { open: boolean; onClose: () => void; item: WardrobeItem | null; candidates: Member[]; defaultAssignee: string; currency: string; onSubmit: (d: OutgrownDecision) => Promise<void> }) {
    const [handTo, setHandTo] = useState("");
    const [wantWish, setWantWish] = useState(true);
    const [wishName, setWishName] = useState("");
    const [wishSize, setWishSize] = useState("");
    const [wishPrice, setWishPrice] = useState("");
    const [wantDonate, setWantDonate] = useState(true);
    const [charity, setCharity] = useState("The charity shop on London Road");
    const [dueDate, setDue] = useState("");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!open || !item) return;
        const s = suggestReplacement(item);
        setError(null);
        setHandTo("");
        setWantWish(true);
        setWishName(s.name);
        setWishSize(s.size);
        setWishPrice("");
        setWantDonate(true);
        setCharity("The charity shop on London Road");
        setDue(isoDate(new Date(Date.now() + 7 * 86400000)));
    }, [open, item]);

    if (!item) return null;

    const submit = async (e: React.FormEvent): Promise<void> => {
        e.preventDefault();
        setBusy(true);
        setError(null);
        try {
            await onSubmit({
                handDownToMemberId: handTo || null,
                replacement: wantWish ? { name: wishName, size: wishSize, priceCents: Math.round((Number(wishPrice) || 0) * 100), note: "" } : null,
                donate: !handTo && wantDonate ? { charity, dueDate, assigneeMemberId: defaultAssignee } : null,
            });
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : "That didn't save.");
        } finally {
            setBusy(false);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} title={`${item.name} no longer fits`} wide>
            <form onSubmit={submit} className="grid gap-4">
                <p className="text-md leading-6 text-muted">Decide it once. Whatever you tick here is written in one go — the next child's closet, the shopping list, and the bag by the door.</p>

                <section className="rounded-lg bg-page p-3.5">
                    <h3 className="mb-2 flex items-center gap-2 text-md font-semibold">
                        <ArrowLeftRight size={15} aria-hidden="true" /> Hand it down
                    </h3>
                    <div className="flex flex-wrap gap-2">
                        <button type="button" aria-pressed={handTo === ""} onClick={() => setHandTo("")} className={cn("h-9 rounded-full border px-3.5 text-sm font-medium", handTo === "" ? "border-brand bg-brand-soft text-brand-ink" : "border-line-strong text-muted")}>
                            Nobody
                        </button>
                        {candidates.map((m) => (
                            <button key={m.id} type="button" aria-pressed={handTo === m.id} onClick={() => setHandTo(m.id)} className={cn("inline-flex h-9 items-center gap-2 rounded-full border pl-1 pr-3.5 text-sm font-medium", handTo === m.id ? "border-brand bg-brand-soft text-brand-ink" : "border-line-strong text-muted")}>
                                <MemberAvatar member={m} size="xs" />
                                {m.name.split(" ")[0]}
                            </button>
                        ))}
                    </div>
                    {handTo && <p className="mt-2 text-xs text-caption">It becomes theirs, and the wardrobe remembers whose it was.</p>}
                </section>

                <section className="rounded-lg bg-page p-3.5">
                    <label className="flex items-start gap-2.5">
                        <input type="checkbox" checked={wantWish} onChange={(e) => setWantWish(e.target.checked)} className="mt-1 size-4 accent-[var(--color-brand)]" />
                        <span className="text-md font-semibold">
                            <ShoppingBag size={15} className="mr-1.5 inline" aria-hidden="true" /> Ask for a replacement
                            <span className="block text-xs font-normal text-caption">It joins the family's purchase list with a size and a price, so it is bought once and in the right size.</span>
                        </span>
                    </label>
                    {wantWish && (
                        <div className="mt-3 grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-3">
                            <Labelled label="What to buy">
                                <input value={wishName} onChange={(e) => setWishName(e.target.value)} className={inputCls} />
                            </Labelled>
                            <Labelled label="Size">
                                <input value={wishSize} onChange={(e) => setWishSize(e.target.value)} className={inputCls} />
                            </Labelled>
                            <Labelled label={`Roughly (${currency})`}>
                                <input value={wishPrice} onChange={(e) => setWishPrice(e.target.value)} inputMode="decimal" placeholder="34" className={inputCls} />
                            </Labelled>
                        </div>
                    )}
                </section>

                {!handTo && (
                    <section className="rounded-lg bg-page p-3.5">
                        <label className="flex items-start gap-2.5">
                            <input type="checkbox" checked={wantDonate} onChange={(e) => setWantDonate(e.target.checked)} className="mt-1 size-4 accent-[var(--color-brand)]" />
                            <span className="text-md font-semibold">
                                <Gift size={15} className="mr-1.5 inline" aria-hidden="true" /> Put it in the charity bag
                                <span className="block text-xs font-normal text-caption">A job with a date, so the bag reaches the shop instead of the boot of the car.</span>
                            </span>
                        </label>
                        {wantDonate && (
                            <div className="mt-3 grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-2">
                                <Labelled label="Where it goes">
                                    <input value={charity} onChange={(e) => setCharity(e.target.value)} className={inputCls} />
                                </Labelled>
                                <Labelled label="By when">
                                    <input type="date" value={dueDate} onChange={(e) => setDue(e.target.value)} className={inputCls} />
                                </Labelled>
                            </div>
                        )}
                    </section>
                )}

                {error && <p className="text-sm text-danger-ink">{error}</p>}
                <div className="flex justify-end gap-2">
                    <Button type="button" variant="ghost" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button type="submit" loading={busy}>
                        {handTo ? "Hand it down" : "Do all of that"}
                    </Button>
                </div>
            </form>
        </Dialog>
    );
}

/** A straight hand-me-down, for a garment that still fits somebody smaller (AC 3). */
export function HandDownDialog({ open, onClose, item, candidates, onSubmit }: { open: boolean; onClose: () => void; item: WardrobeItem | null; candidates: Member[]; onSubmit: (toMemberId: string, note: string) => Promise<void> }) {
    const [to, setTo] = useState("");
    const [note, setNote] = useState("");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!open) return;
        setTo(candidates[0]?.id ?? "");
        setNote("");
        setError(null);
    }, [open, candidates]);

    if (!item) return null;

    const submit = async (e: React.FormEvent): Promise<void> => {
        e.preventDefault();
        if (!to) return;
        setBusy(true);
        try {
            await onSubmit(to, note);
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : "That didn't save.");
        } finally {
            setBusy(false);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} title={`Hand down ${item.name}`}>
            {candidates.length ? (
                <form onSubmit={submit} className="grid gap-4">
                    <p className="text-md leading-6 text-muted">Ownership moves across; the history stays, so this coat can always say it was someone else's first.</p>
                    <Labelled label="To">
                        <select value={to} onChange={(e) => setTo(e.target.value)} className={inputCls}>
                            {candidates.map((m) => (
                                <option key={m.id} value={m.id}>
                                    {m.name}
                                </option>
                            ))}
                        </select>
                    </Labelled>
                    <Labelled label="Worth remembering">
                        <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Tobi shot up over the summer." className={inputCls} />
                    </Labelled>
                    {error && <p className="text-sm text-danger-ink">{error}</p>}
                    <div className="flex justify-end gap-2">
                        <Button type="button" variant="ghost" onClick={onClose}>
                            Cancel
                        </Button>
                        <Button type="submit" loading={busy}>
                            Hand it down
                        </Button>
                    </div>
                </form>
            ) : (
                <EmptyState title="Nobody to hand it to" body="There is no one else in the family whose closet this could join." />
            )}
        </Dialog>
    );
}

/** Dropping the bag off — and, only if the family says so, recording it as giving (AC 7). */
export function CompleteDonationDialog({ open, onClose, title, itemCount, currency, onSubmit }: { open: boolean; onClose: () => void; title: string; itemCount: number; currency: string; onSubmit: (giving: { amountCents: number; note?: string } | null) => Promise<void> }) {
    const [record, setRecord] = useState(true);
    const [amount, setAmount] = useState("");
    const [note, setNote] = useState("");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!open) return;
        setRecord(true);
        setAmount(String(Math.max(5, itemCount * 5)));
        setNote("");
        setError(null);
    }, [open, itemCount]);

    const submit = async (e: React.FormEvent): Promise<void> => {
        e.preventDefault();
        setBusy(true);
        try {
            await onSubmit(record ? { amountCents: Math.round((Number(amount) || 0) * 100), note } : null);
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : "That didn't save.");
        } finally {
            setBusy(false);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} title="Dropped off">
            <form onSubmit={submit} className="grid gap-4">
                <p className="text-md leading-6 text-muted">
                    {title} — {itemCount} thing{itemCount === 1 ? "" : "s"} gone. The clothes leave the closet now.
                </p>
                <label className="flex items-start gap-2.5 rounded-md bg-page px-3 py-2.5">
                    <input type="checkbox" checked={record} onChange={(e) => setRecord(e.target.checked)} className="mt-0.5 size-4 accent-[var(--color-brand)]" />
                    <span className="text-sm font-semibold leading-5">
                        Record it as giving
                        <span className="block font-normal text-caption">It goes on the giving ledger at what the shop would have priced it. Leave it unticked and nothing is counted — generosity does not have to be.</span>
                    </span>
                </label>
                {record && (
                    <div className="grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-2">
                        <Labelled label={`Worth about (${currency})`}>
                            <input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" className={inputCls} />
                        </Labelled>
                        <Labelled label="Note">
                            <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Estimated at charity-shop prices." className={inputCls} />
                        </Labelled>
                    </div>
                )}
                {error && <p className="text-sm text-danger-ink">{error}</p>}
                <div className="flex justify-end gap-2">
                    <Button type="button" variant="ghost" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button type="submit" loading={busy}>
                        {record ? "Done, and record it" : "Mark it done"}
                    </Button>
                </div>
            </form>
        </Dialog>
    );
}

// ---------------------------------------------------------------------------
// Trip capsules
// ---------------------------------------------------------------------------

export function CapsuleDialog({ open, onClose, capsule, members, defaultMember, items, trips, onSubmit, onSuggest, suggesting }: { open: boolean; onClose: () => void; capsule?: Capsule | null; members: Member[]; defaultMember: string; items: WardrobeItem[]; trips: Array<{ id: string; title: string; when: string }>; onSubmit: (v: NewCapsule) => Promise<void>; onSuggest?: (memberId: string, tripLabel: string) => Promise<OutfitSuggestion | null>; suggesting?: boolean }) {
    const [name, setName] = useState("");
    const [memberId, setMemberId] = useState(defaultMember);
    const [tripId, setTripId] = useState("");
    const [tripLabel, setTripLabel] = useState("");
    const [season, setSeason] = useState<Season>("all");
    const [itemIds, setItemIds] = useState<string[]>([]);
    const [notes, setNotes] = useState("");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [why, setWhy] = useState<string | null>(null);

    useEffect(() => {
        if (!open) return;
        setError(null);
        setWhy(null);
        setName(capsule?.name ?? "");
        setMemberId(capsule?.memberId ?? defaultMember);
        setTripId(capsule?.tripId ?? "");
        setTripLabel(capsule?.tripLabel ?? "");
        setSeason(capsule?.season ?? "all");
        setItemIds(capsule?.itemIds ?? []);
        setNotes(capsule?.notes ?? "");
    }, [open, capsule, defaultMember]);

    const pool = useMemo(() => filterItems(items.filter((i) => i.ownerMemberId === memberId && inUse(i)), {}), [items, memberId]);
    const chosen = useMemo(() => itemIds.map((id) => items.find((i) => i.id === id)).filter((x): x is WardrobeItem => Boolean(x)), [itemIds, items]);

    const submit = async (e: React.FormEvent): Promise<void> => {
        e.preventDefault();
        if (!name.trim()) {
            setError("Give the capsule a name — “Lagos, Christmas”.");
            return;
        }
        setBusy(true);
        setError(null);
        try {
            await onSubmit({ name, memberId, tripId: tripId || null, tripLabel: tripLabel || trips.find((t) => t.id === tripId)?.title || "", season, itemIds, notes });
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : "That didn't save.");
        } finally {
            setBusy(false);
        }
    };

    const suggest = async (): Promise<void> => {
        if (!onSuggest) return;
        const r = await onSuggest(memberId, tripLabel || trips.find((t) => t.id === tripId)?.title || name);
        if (!r) return;
        setItemIds([...new Set([...itemIds, ...r.itemIds])]);
        setWhy(r.why);
    };

    return (
        <Dialog open={open} onClose={onClose} title={capsule ? "Edit the capsule" : "Pull a capsule together"} wide>
            <form onSubmit={submit} className="grid gap-4">
                <div className="grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-2">
                    <Labelled label="Call it">
                        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Lagos, Christmas" className={inputCls} required />
                    </Labelled>
                    <Labelled label="Whose bag">
                        <select
                            value={memberId}
                            onChange={(e) => {
                                setMemberId(e.target.value);
                                setItemIds([]);
                            }}
                            className={inputCls}
                        >
                            {members.map((m) => (
                                <option key={m.id} value={m.id}>
                                    {m.name}
                                </option>
                            ))}
                        </select>
                    </Labelled>
                    <Labelled label="Trip" hint={trips.length ? "Linking it lets the packing list pull these clothes in." : "No trips to link to yet — the label is enough."}>
                        <select
                            value={tripId}
                            onChange={(e) => {
                                setTripId(e.target.value);
                                const t = trips.find((x) => x.id === e.target.value);
                                if (t) setTripLabel(t.title);
                            }}
                            className={inputCls}
                        >
                            <option value="">Not linked</option>
                            {trips.map((t) => (
                                <option key={t.id} value={t.id}>
                                    {t.title}
                                </option>
                            ))}
                        </select>
                    </Labelled>
                    <Labelled label="Weather there">
                        <select value={season} onChange={(e) => setSeason(e.target.value as Season)} className={inputCls}>
                            {SEASONS.map((s) => (
                                <option key={s} value={s}>
                                    {SEASON[s].label}
                                </option>
                            ))}
                        </select>
                    </Labelled>
                </div>
                {!tripId && (
                    <Labelled label="Which trip, in your words">
                        <input value={tripLabel} onChange={(e) => setTripLabel(e.target.value)} placeholder="Christmas in Lagos" className={inputCls} />
                    </Labelled>
                )}

                <div className="rounded-lg bg-page p-3">
                    <div className="mb-2 flex items-center justify-between gap-3">
                        <h3 className="text-sm font-semibold uppercase tracking-[0.06em] text-muted">In the case · {chosen.length} pieces</h3>
                        {onSuggest && (
                            <button type="button" onClick={() => void suggest()} disabled={suggesting} className="inline-flex h-8 items-center gap-1.5 rounded-full border border-brand bg-card px-3 text-xs font-semibold text-brand disabled:opacity-50">
                                {suggesting ? <Loader2 size={13} className="animate-spin" aria-hidden="true" /> : <Sparkles size={13} aria-hidden="true" />}
                                {suggesting ? "Thinking…" : "Suggest a capsule"}
                            </button>
                        )}
                    </div>
                    <ItemStrip items={chosen} max={12} size={40} />
                    {why && <p className="mt-3 rounded-sm bg-brand-soft px-3 py-2 text-sm leading-5 text-brand-ink">{why}</p>}
                </div>

                {pool.length ? (
                    <ul className="grid max-h-72 grid-cols-3 gap-2 overflow-y-auto sm:grid-cols-5">
                        {pool.map((i) => (
                            <PickTile key={i.id} item={i} selected={itemIds.includes(i.id)} onToggle={() => setItemIds((v) => (v.includes(i.id) ? v.filter((x) => x !== i.id) : [...v, i.id]))} />
                        ))}
                    </ul>
                ) : (
                    <p className="rounded-md bg-page px-4 py-6 text-center text-sm text-caption">Nothing in this closet to pack yet.</p>
                )}

                <Labelled label="Notes">
                    <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Nothing heavy. It is thirty-two degrees." className={inputCls} />
                </Labelled>
                {error && <p className="text-sm text-danger-ink">{error}</p>}
                <div className="flex justify-end gap-2">
                    <Button type="button" variant="ghost" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button type="submit" loading={busy}>
                        {capsule ? "Save the capsule" : "Save it"}
                    </Button>
                </div>
            </form>
        </Dialog>
    );
}
