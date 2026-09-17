import { useId, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Camera, Check, Droplets, Heart, ImageOff, Loader2, Search, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { Tag } from "@/components/ui/primitives";
import { BASE, itemLine } from "../derive";
import { ACCEPT, compressPhoto, fileSize } from "../photo";
import { CATEGORIES, CATEGORY, COLOUR, COLOURS, OCCASION, OCCASIONS, SEASON, SEASONS, STATUS } from "../types";
import type { Colour, ItemCategory, ItemStatus, Occasion, Season, WardrobeItem } from "../types";
import type { ItemFilter } from "../derive";

/**
 * The wardrobe's own small parts: a garment as a photograph, the filter row,
 * and the photo field that will not let a four-megabyte picture of a coat
 * reach storage (AC 5).
 *
 * Everything here is presentational. Nothing reads the repo, nothing decides
 * a permission — the pages do that, once, and pass down what a person may see.
 */

// ---------------------------------------------------------------------------
// Atoms
// ---------------------------------------------------------------------------

export function ColourDot({ colour, size = 14, className }: { colour: Colour; size?: number; className?: string }) {
    return <span className={cn("inline-block shrink-0 rounded-full border border-line-strong", className)} style={{ width: size, height: size, background: COLOUR[colour].hex }} aria-hidden="true" />;
}

export function StatusTag({ status, className }: { status: ItemStatus; className?: string }) {
    const s = STATUS[status];
    const tone = status === "in-use" ? "ok" : status === "outgrown" ? "warn" : status === "donate" ? "brand" : "neutral";
    return (
        <Tag tone={tone} className={className}>
            {s.label}
        </Tag>
    );
}

/** The garment itself: its photo, or its category emoji on a tint. */
export function ItemPhoto({ item, className, w = 320, h = 320 }: { item: WardrobeItem; className?: string; w?: number; h?: number }) {
    if (item.imageUrl) {
        return <img src={item.imageUrl} alt={item.name} width={w} height={h} loading="lazy" className={cn("size-full object-cover", className)} />;
    }
    return (
        <span className={cn("grid size-full place-items-center bg-live-soft text-[32px]", className)} aria-hidden="true">
            {CATEGORY[item.category].emoji}
        </span>
    );
}

const OVERLAY = "absolute inline-flex items-center gap-1 rounded-full px-2 py-1 text-2xs font-semibold";

/** One garment in the grid. Tapping it opens the garment; the heart is its own button. */
export function ItemCard({ item, onFavourite, footer }: { item: WardrobeItem; onFavourite?: (on: boolean) => void; footer?: React.ReactNode }) {
    return (
        <li className="group relative">
            <Link to={`${BASE}/items/${item.id}`} className="block overflow-hidden rounded-xl bg-card transition-shadow hover:shadow-hover">
                <span className="relative block aspect-square overflow-hidden bg-page">
                    <ItemPhoto item={item} />
                    {item.inLaundry && (
                        <span className={cn(OVERLAY, "left-2 top-2 bg-sky-soft text-sky")}>
                            <Droplets size={11} aria-hidden="true" /> In the wash
                        </span>
                    )}
                    {item.status !== "in-use" && item.status !== "handed-down" && <StatusTag status={item.status} className="absolute bottom-2 left-2" />}
                </span>
                <span className="block p-3">
                    <span className="flex items-start gap-1.5">
                        <ColourDot colour={item.colour} className="mt-[3px]" />
                        <span className="min-w-0 flex-1 truncate text-md font-semibold">{item.name}</span>
                    </span>
                    <span className="mt-0.5 block truncate text-xs text-caption">{itemLine(item)}</span>
                    {footer}
                </span>
            </Link>
            {onFavourite && (
                <button
                    type="button"
                    aria-pressed={item.favourite}
                    aria-label={item.favourite ? `Remove ${item.name} from favourites` : `Make ${item.name} a favourite`}
                    onClick={() => onFavourite(!item.favourite)}
                    className={cn("absolute right-2 top-2 grid size-8 place-items-center rounded-full transition-colors", item.favourite ? "bg-card text-danger" : "bg-card/80 text-caption hover:text-ink")}
                >
                    <Heart size={15} fill={item.favourite ? "currentColor" : "none"} aria-hidden="true" />
                </button>
            )}
        </li>
    );
}

/** A garment as a toggle — the outfit builder and the capsule picker. */
export function PickTile({ item, selected, onToggle, index }: { item: WardrobeItem; selected: boolean; onToggle: () => void; index?: number }) {
    return (
        <li>
            <button type="button" aria-pressed={selected} onClick={onToggle} className={cn("relative block w-full overflow-hidden rounded-md border-2 bg-card text-left transition-colors", selected ? "border-brand" : "border-transparent hover:border-line-strong")}>
                <span className="relative block aspect-square overflow-hidden bg-page">
                    <ItemPhoto item={item} w={160} h={160} />
                    {selected && (
                        <span className="absolute right-1.5 top-1.5 grid size-6 place-items-center rounded-full bg-brand text-white">
                            {typeof index === "number" ? <span className="text-2xs font-bold tabular-nums">{index + 1}</span> : <Check size={13} strokeWidth={3} aria-hidden="true" />}
                        </span>
                    )}
                    {item.inLaundry && <span className={cn(OVERLAY, "bottom-1.5 left-1.5 bg-sky-soft text-sky")}>Wash</span>}
                </span>
                <span className="block px-2 py-1.5">
                    <span className="block truncate text-xs font-semibold leading-4">{item.name}</span>
                    <span className="block truncate text-2xs text-caption">{CATEGORY[item.category].label}</span>
                </span>
            </button>
        </li>
    );
}

/** A row of small garment thumbnails — an outfit or a capsule, at a glance. */
export function ItemStrip({ items, max = 6, size = 44, className }: { items: WardrobeItem[]; max?: number; size?: number; className?: string }) {
    if (!items.length) return <span className={cn("text-xs text-caption", className)}>Nothing chosen yet</span>;
    return (
        <span className={cn("flex flex-wrap items-center gap-1.5", className)}>
            {items.slice(0, max).map((i) => (
                <span key={i.id} className="block overflow-hidden rounded-xs bg-page" style={{ width: size, height: size }} title={i.name}>
                    <ItemPhoto item={i} w={size} h={size} />
                </span>
            ))}
            {items.length > max && <span className="text-2xs font-semibold text-caption">+{items.length - max}</span>}
        </span>
    );
}

// ---------------------------------------------------------------------------
// The filter row
// ---------------------------------------------------------------------------

const SELECT = "h-9 rounded-full border border-line-strong bg-card px-3 text-sm outline-none focus:border-brand";

export interface FilterOwner {
    id: string;
    name: string;
}

export function FilterBar({ filter, onChange, owners, categories, colours }: { filter: ItemFilter; onChange: (f: ItemFilter) => void; owners?: FilterOwner[]; categories?: ItemCategory[]; colours?: Colour[] }) {
    const set = (patch: Partial<ItemFilter>): void => onChange({ ...filter, ...patch });
    const cats = categories?.length ? CATEGORIES.filter((c) => categories.includes(c)) : CATEGORIES;
    const cols = colours?.length ? COLOURS.filter((c) => colours.includes(c)) : COLOURS;
    const searchId = useId();
    return (
        <div className="mb-5">
            <div className="flex h-11 items-center gap-2.5 rounded-full border border-line-strong bg-card px-4 focus-within:border-brand">
                <Search size={17} strokeWidth={1.8} aria-hidden="true" className="shrink-0 text-caption" />
                <input id={searchId} type="search" value={filter.q ?? ""} onChange={(e) => set({ q: e.target.value })} placeholder="Search the closet — “navy”, “Clarks”, “age 9”…" aria-label="Search the closet" className="min-w-0 flex-1 bg-transparent text-md outline-none placeholder:text-caption" />
            </div>
            <div className="no-scrollbar -mx-1 mt-2.5 flex gap-2 overflow-x-auto px-1 py-0.5">
                {owners && owners.length > 1 && (
                    <select value={filter.owner ?? ""} onChange={(e) => set({ owner: e.target.value })} aria-label="Whose clothes" className={SELECT}>
                        <option value="">Everyone</option>
                        {owners.map((o) => (
                            <option key={o.id} value={o.id}>
                                {o.name}
                            </option>
                        ))}
                    </select>
                )}
                <select value={filter.category ?? ""} onChange={(e) => set({ category: e.target.value as ItemCategory | "" })} aria-label="Category" className={SELECT}>
                    <option value="">All kinds</option>
                    {cats.map((c) => (
                        <option key={c} value={c}>
                            {CATEGORY[c].plural}
                        </option>
                    ))}
                </select>
                <select value={filter.colour ?? ""} onChange={(e) => set({ colour: e.target.value as Colour | "" })} aria-label="Colour" className={SELECT}>
                    <option value="">Any colour</option>
                    {cols.map((c) => (
                        <option key={c} value={c}>
                            {COLOUR[c].label}
                        </option>
                    ))}
                </select>
                <select value={filter.season ?? ""} onChange={(e) => set({ season: e.target.value as Season | "" })} aria-label="Season" className={SELECT}>
                    <option value="">Any season</option>
                    {SEASONS.filter((x) => x !== "all").map((c) => (
                        <option key={c} value={c}>
                            {SEASON[c].label}
                        </option>
                    ))}
                </select>
                <select value={filter.occasion ?? ""} onChange={(e) => set({ occasion: e.target.value as Occasion | "" })} aria-label="Occasion" className={SELECT}>
                    <option value="">Any occasion</option>
                    {OCCASIONS.map((c) => (
                        <option key={c} value={c}>
                            {OCCASION[c].label}
                        </option>
                    ))}
                </select>
                <select value={filter.status ?? "wearable"} onChange={(e) => set({ status: e.target.value as ItemFilter["status"] })} aria-label="Status" className={SELECT}>
                    <option value="wearable">In the wardrobe</option>
                    <option value="all">Everything</option>
                    <option value="outgrown">Outgrown</option>
                    <option value="donate">In the charity bag</option>
                    <option value="handed-down">Handed down</option>
                </select>
                <button type="button" aria-pressed={Boolean(filter.favourite)} onClick={() => set({ favourite: !filter.favourite })} className={cn("inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3 text-sm font-medium", filter.favourite ? "border-danger bg-danger-soft text-danger-ink" : "border-line-strong text-muted hover:text-ink")}>
                    <Heart size={13} fill={filter.favourite ? "currentColor" : "none"} aria-hidden="true" /> Favourites
                </button>
                <button type="button" aria-pressed={Boolean(filter.laundry)} onClick={() => set({ laundry: !filter.laundry })} className={cn("inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3 text-sm font-medium", filter.laundry ? "border-sky bg-sky-soft text-sky" : "border-line-strong text-muted hover:text-ink")}>
                    <Droplets size={13} aria-hidden="true" /> In the wash
                </button>
            </div>
        </div>
    );
}

// ---------------------------------------------------------------------------
// The photo field (AC 5)
// ---------------------------------------------------------------------------

/**
 * Choose a picture of the garment. Whatever the phone hands over is drawn into
 * a canvas and re-encoded until it is under 300 KB, and the saving is shown —
 * "3.9 MB → 184 KB" — because a person should be able to see that the app is
 * looking after their storage rather than merely be told so.
 */
export function PhotoField({ value, onChange, label = "Photo" }: { value: string | null; onChange: (url: string | null) => void; label?: string }) {
    const input = useRef<HTMLInputElement>(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [saved, setSaved] = useState<string | null>(null);
    const id = useId();

    const choose = async (file: File | undefined): Promise<void> => {
        if (!file) return;
        setError(null);
        setBusy(true);
        try {
            const out = await compressPhoto(file);
            onChange(out.dataUrl);
            setSaved(`${fileSize(out.originalBytes)} → ${fileSize(out.bytes)} · ${out.width}×${out.height}`);
        } catch (e) {
            setError(e instanceof Error ? e.message : "That photo wouldn't open.");
        } finally {
            setBusy(false);
        }
    };

    return (
        <div>
            <span className="mb-1.5 block text-xs font-medium uppercase tracking-[0.06em] text-muted" id={`${id}-label`}>
                {label}
            </span>
            <div className="flex items-center gap-3">
                <span className="grid size-20 shrink-0 place-items-center overflow-hidden rounded-md bg-page">
                    {value ? <img src={value} alt="The garment" width={80} height={80} loading="lazy" className="size-full object-cover" /> : <ImageOff size={20} className="text-caption" aria-hidden="true" />}
                </span>
                <div className="min-w-0 flex-1">
                    <input ref={input} id={id} type="file" accept={ACCEPT} className="sr-only" aria-labelledby={`${id}-label`} onChange={(e) => void choose(e.target.files?.[0])} />
                    <div className="flex flex-wrap gap-2">
                        <button type="button" onClick={() => input.current?.click()} disabled={busy} className="inline-flex h-9 items-center gap-2 rounded-full border border-line-strong bg-card px-4 text-sm font-semibold disabled:opacity-50">
                            {busy ? <Loader2 size={14} className="animate-spin" aria-hidden="true" /> : <Camera size={14} aria-hidden="true" />}
                            {busy ? "Shrinking…" : value ? "Change photo" : "Add a photo"}
                        </button>
                        {value && (
                            <button
                                type="button"
                                onClick={() => {
                                    onChange(null);
                                    setSaved(null);
                                }}
                                className="inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-sm font-semibold text-muted hover:text-ink"
                            >
                                <X size={14} aria-hidden="true" /> Remove
                            </button>
                        )}
                    </div>
                    <p className={cn("mt-1.5 text-xs", error ? "text-danger-ink" : "text-caption")}>{error ?? saved ?? "Photos are shrunk to under 300 KB before they are saved."}</p>
                </div>
            </div>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Form furniture
// ---------------------------------------------------------------------------

export const inputCls = "h-11 w-full rounded-sm border border-line-strong bg-card px-3 text-md outline-none focus:border-brand";

export function Labelled({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
    return (
        <label className="block">
            <span className="mb-1.5 block text-xs font-medium uppercase tracking-[0.06em] text-muted">{label}</span>
            {children}
            {hint && <span className="mt-1 block text-xs text-caption">{hint}</span>}
        </label>
    );
}

/** A row of toggle pills — occasions, days of the week. */
export function PillGroup<T extends string>({ label, options, value, onChange, single }: { label: string; options: Array<{ value: T; label: string }>; value: T[]; onChange: (v: T[]) => void; single?: boolean }) {
    return (
        <div>
            <span className="mb-1.5 block text-xs font-medium uppercase tracking-[0.06em] text-muted">{label}</span>
            <div className="flex flex-wrap gap-2">
                {options.map((o) => {
                    const on = value.includes(o.value);
                    return (
                        <button key={o.value} type="button" aria-pressed={on} onClick={() => onChange(single ? [o.value] : on ? value.filter((x) => x !== o.value) : [...value, o.value])} className={cn("inline-flex h-9 items-center rounded-full border px-3.5 text-sm font-medium", on ? "border-brand bg-brand-soft text-brand-ink" : "border-line-strong text-muted hover:text-ink")}>
                            {o.label}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
