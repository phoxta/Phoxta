import { useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, CloudOff, ExternalLink, Lock, MapPin, Sparkles } from "lucide-react";
import type { Member } from "@/data/core";
import { cn } from "@/lib/cn";
import { shortDate } from "@/lib/format";
import { useSpace } from "@/state/space";
import { MemberChips, Money, Points } from "@/components/shared";
import { Ring } from "@/components/ui/charts";
import { Button, Card, ProgressBar, Spinner, Tag } from "@/components/ui/primitives";
import {
    appleMapLink,
    checklistDue,
    checklistProgress,
    mapLink,
    packedCount,
    packingProgress,
    readiness,
    toHome,
    travellersOf,
    tripDates,
    tripHref,
    tripWhen,
} from "../derive";
import { onReconnect, queueSize } from "../offline";
import { BOOKING_KIND, PACK_CATEGORY, TRIP_KIND, TRIP_STATUS, type Booking, type ChecklistItem, type ItineraryItem, type PackingItem, type TravelState, type Trip } from "../types";

/**
 * The module's own pieces, so the four screens stay readable: the trip tile,
 * the readiness dial, an itinerary line with its maps deep link, a booking
 * row, a packing row, the run-up list, and the two banners the product needs
 * to be honest about — "you are offline" and "the companion is thinking".
 */

// ---------------------------------------------------------------------------
// Trips
// ---------------------------------------------------------------------------

const STATUS_TONE: Record<Trip["status"], "brand" | "warn" | "ok" | "neutral"> = {
    dreaming: "neutral",
    planning: "brand",
    booked: "ok",
    done: "neutral",
};

export function TripCard({ state, trip, today, child }: { state: TravelState; trip: Trip; today: string; child?: boolean }) {
    const people = travellersOf(state, trip.id);
    const ready = trip.status === "done" ? null : readiness(state, trip, today);
    return (
        <li>
            <Link to={tripHref(trip.id)} className="group flex h-full flex-col overflow-hidden rounded-xl bg-card transition-shadow hover:shadow-hover">
                <span className="relative block aspect-[16/9] overflow-hidden bg-live-soft">
                    {trip.coverUrl ? (
                        <img src={trip.coverUrl} alt="" width={960} height={540} loading="lazy" className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
                    ) : (
                        <span className="grid size-full place-items-center text-[40px]" aria-hidden="true">
                            {TRIP_KIND[trip.kind].emoji}
                        </span>
                    )}
                    <span className="absolute left-3 top-3">
                        <Tag tone={STATUS_TONE[trip.status]}>{TRIP_STATUS[trip.status].label}</Tag>
                    </span>
                </span>
                <span className="flex flex-1 flex-col p-4">
                    <span className={cn("font-display leading-tight", child ? "text-2xl" : "text-xl")}>{trip.title}</span>
                    <span className="mt-1 text-sm text-muted">
                        {trip.destination} · {tripDates(trip)}
                    </span>
                    <span className="mt-3 flex items-center justify-between gap-3">
                        <MemberChips memberIds={people.map((p) => p.memberId)} />
                        <span className="text-xs font-semibold text-live-ink">{tripWhen(trip, today)}</span>
                    </span>
                    {ready && (
                        <span className="mt-3 block">
                            <ProgressBar value={ready.pct} label={`${trip.title} readiness`} />
                            <span className="mt-1.5 block text-2xs text-caption">{ready.pct}% ready</span>
                        </span>
                    )}
                </span>
            </Link>
        </li>
    );
}

/** The dial on the trip page: one number, and the four parts behind it. */
export function ReadinessPanel({ state, trip, today }: { state: TravelState; trip: Trip; today: string }) {
    const r = readiness(state, trip, today);
    return (
        <Card className="flex flex-wrap items-center gap-5">
            <Ring pct={r.pct} size={96} stroke={4} label={`${trip.title} is ${r.pct}% ready`}>
                <span className="text-center">
                    <span className="block font-display text-3xl leading-6">{r.pct}%</span>
                    <span className="block text-[10px] uppercase tracking-[0.08em] text-caption">ready</span>
                </span>
            </Ring>
            <ul className="min-w-[180px] flex-1 space-y-2.5">
                {r.parts.map((p) => (
                    <li key={p.label}>
                        <div className="flex items-baseline justify-between gap-2 text-sm">
                            <span className="font-medium">{p.label}</span>
                            <span className="tabular-nums text-caption">
                                {p.done}/{p.total}
                            </span>
                        </div>
                        <ProgressBar value={(p.done / p.total) * 100} className="mt-1" label={p.label} />
                    </li>
                ))}
            </ul>
        </Card>
    );
}

// ---------------------------------------------------------------------------
// Itinerary
// ---------------------------------------------------------------------------

/**
 * "Open in maps" — a deep link, not an embed. The app's content-security
 * policy admits no tile server, so the honest thing is to hand the place to
 * the device's own maps application, by coordinates when we have them.
 */
export function MapsLinks({ place, coords }: { place: string; coords: string | null }) {
    const g = mapLink(place, coords);
    if (!g) return null;
    return (
        <span className="inline-flex items-center gap-2">
            <a href={g} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-semibold text-brand underline-offset-4 hover:underline">
                <MapPin size={12} aria-hidden="true" /> Open in Maps
            </a>
            <a href={appleMapLink(place, coords)} target="_blank" rel="noreferrer" className="text-xs text-caption underline-offset-4 hover:underline">
                Apple
            </a>
        </span>
    );
}

export function ItineraryRow({
    item,
    trip,
    currency,
    showCost,
    onToggle,
    actions,
}: {
    item: ItineraryItem;
    trip: Trip;
    currency: string;
    showCost: boolean;
    onToggle?: () => void;
    actions?: ReactNode;
}) {
    return (
        <li className="flex gap-3 border-b border-line py-3 last:border-0">
            <span className="w-[52px] shrink-0 pt-0.5 text-sm font-semibold tabular-nums text-live-ink">{item.time || "—"}</span>
            <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-x-2">
                    {onToggle ? (
                        <button type="button" onClick={onToggle} className={cn("text-left text-base font-semibold underline-offset-4 hover:underline", item.done && "text-muted line-through")}>
                            {item.title}
                        </button>
                    ) : (
                        <span className={cn("text-base font-semibold", item.done && "text-muted line-through")}>{item.title}</span>
                    )}
                    {showCost && item.costCents > 0 && (
                        <span className="text-sm text-live-ink">
                            <Money cents={toHome(item.costCents, trip.fxRate)} currency={currency} />
                        </span>
                    )}
                    {item.done && <CheckCircle2 size={14} className="text-mint" aria-label="Done" />}
                </div>
                {item.place && <div className="mt-0.5 text-sm text-muted">{item.place}</div>}
                {item.notes && <p className="mt-1 text-sm leading-5 text-muted">{item.notes}</p>}
                <div className="mt-1.5 flex flex-wrap items-center gap-3">
                    <MapsLinks place={item.place} coords={item.coords} />
                    {item.bookingRef && <span className="text-xs text-caption">Ref {item.bookingRef}</span>}
                </div>
            </div>
            {actions && <div className="shrink-0">{actions}</div>}
        </li>
    );
}

// ---------------------------------------------------------------------------
// Bookings, papers
// ---------------------------------------------------------------------------

export function BookingRow({ booking, showMoney, actions }: { booking: Booking; showMoney: boolean; actions?: ReactNode }) {
    return (
        <li className="flex items-start gap-3 border-b border-line py-3 last:border-0">
            <span className="text-2xl leading-none" aria-hidden="true">
                {BOOKING_KIND[booking.kind].emoji}
            </span>
            <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                    <span className="text-md font-semibold">{booking.provider}</span>
                    {booking.confirmed ? <Tag tone="ok">Confirmed</Tag> : <Tag tone="warn">Not confirmed</Tag>}
                    {booking.sensitivity === "documents" && (
                        <span className="inline-flex items-center gap-1 text-2xs text-caption">
                            <Lock size={11} aria-hidden="true" /> Parents only
                        </span>
                    )}
                </div>
                <div className="mt-0.5 text-sm text-muted">
                    {BOOKING_KIND[booking.kind].label} · {shortDate(booking.startAt)}
                    {booking.endAt ? ` – ${shortDate(booking.endAt)}` : ""}
                    {showMoney && booking.reference ? ` · ${booking.reference}` : ""}
                </div>
                {booking.notes && <p className="mt-1 text-sm leading-5 text-muted">{booking.notes}</p>}
                {showMoney && booking.link && (
                    <a href={booking.link} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-brand underline-offset-4 hover:underline">
                        Manage the booking <ExternalLink size={11} aria-hidden="true" />
                    </a>
                )}
            </div>
            {showMoney && booking.costCents > 0 && (
                <span className="shrink-0 text-md font-semibold tabular-nums">
                    <Money cents={booking.costCents} />
                </span>
            )}
            {actions && <div className="shrink-0">{actions}</div>}
        </li>
    );
}

/** A document number is never shown in full — the last four is enough to recognise it. */
export const maskNumber = (v: string): string => (v.length <= 4 ? v : `•••• ${v.slice(-4)}`);

// ---------------------------------------------------------------------------
// The run-up
// ---------------------------------------------------------------------------

export function ChecklistRow({ item, trip, today, canTick, onToggle, actions }: { item: ChecklistItem; trip: Trip; today: string; canTick: boolean; onToggle: () => void; actions?: ReactNode }) {
    const { members } = useSpace();
    const due = checklistDue(trip, item);
    const owner = item.ownerMemberId ? members.find((m) => m.id === item.ownerMemberId) : undefined;
    const late = Boolean(due && !item.doneAt && due < today);
    return (
        <li className="flex items-start gap-3 border-b border-line py-3 last:border-0">
            <input
                type="checkbox"
                checked={Boolean(item.doneAt)}
                onChange={onToggle}
                disabled={!canTick}
                aria-label={item.item}
                className="mt-1 size-[18px] shrink-0 accent-[var(--color-brand)] disabled:opacity-40"
            />
            <div className="min-w-0 flex-1">
                <div className={cn("text-md font-medium", item.doneAt && "text-muted line-through")}>{item.item}</div>
                {item.note && <p className="mt-0.5 text-sm leading-5 text-muted">{item.note}</p>}
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                    <span className={cn("rounded-xs px-1.5 py-0.5 font-semibold", late ? "bg-danger-soft text-danger-ink" : "bg-page text-caption")}>T-{item.dueOffsetDays}</span>
                    {due && <span className={cn(late ? "text-danger-ink" : "text-caption")}>{late ? `was due ${shortDate(due)}` : `by ${shortDate(due)}`}</span>}
                    {owner && <span className="text-caption">· {owner.name.split(" ")[0]}</span>}
                </div>
            </div>
            {actions && <div className="shrink-0">{actions}</div>}
        </li>
    );
}

export function RunUpSummary({ state, trip, today }: { state: TravelState; trip: Trip; today: string }) {
    const c = checklistProgress(state, trip, today);
    if (!c.total) return null;
    return (
        <p className="text-sm text-muted">
            {c.done} of {c.total} done
            {c.overdue.length ? ` · ${c.overdue.length} overdue` : c.dueSoon.length ? ` · ${c.dueSoon.length} due in the next few days` : ""}
        </p>
    );
}

// ---------------------------------------------------------------------------
// Packing
// ---------------------------------------------------------------------------

export function PackingRow({ item, canTick, onToggle, onRemove }: { item: PackingItem; canTick: boolean; onToggle: () => void; onRemove?: () => void }) {
    return (
        <li className="flex items-center gap-3 py-2">
            <input
                type="checkbox"
                checked={item.checked}
                onChange={onToggle}
                disabled={!canTick}
                aria-label={item.item}
                className="size-[18px] shrink-0 accent-[var(--color-brand)] disabled:opacity-40"
            />
            <span className="min-w-0 flex-1">
                <span className={cn("block text-md", item.checked && "text-muted line-through")}>
                    {item.item}
                    {item.qty > 1 && <span className="ml-1.5 text-xs text-caption">×{item.qty}</span>}
                </span>
                {item.wardrobeItemId && (
                    <span className="mt-0.5 inline-flex items-center gap-1 rounded-xs bg-create-soft px-1.5 py-0.5 text-2xs font-semibold text-create-ink">
                        From the wardrobe{item.wardrobeLabel ? ` · ${item.wardrobeLabel}` : ""}
                    </span>
                )}
            </span>
            <span className="shrink-0 text-2xs text-caption" aria-hidden="true">
                {PACK_CATEGORY[item.category].emoji}
            </span>
            {onRemove && (
                <button type="button" onClick={onRemove} className="shrink-0 text-xs text-caption underline-offset-4 hover:text-danger-ink hover:underline">
                    Remove
                </button>
            )}
        </li>
    );
}

export function PackingSummary({ state, trip }: { state: TravelState; trip: Trip }) {
    const p = packingProgress(state, trip.id);
    return (
        <p className="text-sm text-muted">
            {p.generated} of {p.travellers} {p.travellers === 1 ? "list" : "lists"} made
            {p.items ? ` · ${p.packed} of ${p.items} things packed` : ""}
        </p>
    );
}

export function PackingListTile({ state, member, listId }: { state: TravelState; member: Member; listId: string }) {
    const c = packedCount(state, listId);
    return (
        <div className="flex items-center gap-3">
            <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                    <span className="truncate text-md font-semibold">{member.name.split(" ")[0]}</span>
                    <span className="text-xs tabular-nums text-caption">
                        {c.done}/{c.total}
                    </span>
                </div>
                <ProgressBar value={c.pct} className="mt-1.5" label={`${member.name}'s packing`} />
            </div>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Banners
// ---------------------------------------------------------------------------

/**
 * AC 8's visible half: the screen tells the truth about being offline and
 * about how many ticks are still waiting to reach the server.
 */
export function OfflineBanner({ onReconnected }: { onReconnected?: () => void }) {
    const [offline, setOffline] = useState(() => typeof navigator !== "undefined" && navigator.onLine === false);
    const [waiting, setWaiting] = useState(() => queueSize());

    useEffect(() => {
        const tick = (): void => setWaiting(queueSize());
        const down = (): void => {
            setOffline(true);
            tick();
        };
        const up = (): void => {
            setOffline(false);
            tick();
            onReconnected?.();
        };
        window.addEventListener("offline", down);
        const off = onReconnect(up);
        const id = window.setInterval(tick, 4000);
        return () => {
            window.removeEventListener("offline", down);
            off();
            window.clearInterval(id);
        };
    }, [onReconnected]);

    if (!offline && !waiting) return null;
    return (
        <div className={cn("mb-5 flex items-start gap-2.5 rounded-md px-4 py-3 text-sm leading-5", offline ? "bg-peach-soft text-peach" : "bg-brand-soft text-brand-ink")} role="status">
            <CloudOff size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
            <div>
                {offline ? (
                    <>
                        <strong className="font-semibold">You&apos;re offline.</strong> The list still works — tick away. {waiting > 0 && `${waiting} change${waiting === 1 ? "" : "s"} waiting to sync.`}
                    </>
                ) : (
                    <>
                        Back online — syncing {waiting} change{waiting === 1 ? "" : "s"}.
                    </>
                )}
            </div>
        </div>
    );
}

/** The companion's panel: never blocks the screen, always says where it got to. */
export function AiPanel({ title, hint, busy, error, unavailable, text, actions, children }: { title: string; hint?: string; busy: boolean; error?: string | null; unavailable?: string | null; text?: string; actions?: ReactNode; children?: ReactNode }) {
    return (
        <Card className="bg-brand-soft/60">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <h3 className="flex items-center gap-2 text-base font-semibold">
                    <Sparkles size={15} className="text-brand" aria-hidden="true" /> {title}
                </h3>
                {actions}
            </div>
            {hint && !text && !busy && <p className="text-sm leading-5 text-muted">{hint}</p>}
            {busy && (
                <p className="flex items-center gap-2 text-sm text-muted">
                    <Spinner /> Thinking about it…
                </p>
            )}
            {unavailable && <p className="mt-2 text-sm text-muted">{unavailable}</p>}
            {error && !unavailable && <p className="mt-2 text-sm text-danger-ink">{error}</p>}
            {text && !busy && <p className="mt-2 whitespace-pre-wrap text-md leading-6">{text}</p>}
            {children}
            {(text || children) && <p className="mt-3 text-2xs text-caption">A suggestion, not a change. Nothing is saved until you add it.</p>}
        </Card>
    );
}

/** The child's reward line, used on the packing screen when the bag is done. */
export function AllPacked({ points }: { points: number }) {
    return (
        <div className="flex items-center gap-3 rounded-lg bg-mint-soft px-4 py-3">
            <span className="text-4xl" aria-hidden="true">
                🎉
            </span>
            <div className="flex-1 text-md font-semibold text-mint">Everything on your list is packed.</div>
            <Points n={points} />
        </div>
    );
}

export function BackLink({ to, children }: { to: string; children: ReactNode }) {
    return (
        <Link to={to} className="mb-4 inline-block text-sm font-semibold text-brand underline-offset-4 hover:underline">
            ← {children}
        </Link>
    );
}

export function InlineButton({ onClick, children, disabled }: { onClick: () => void; children: ReactNode; disabled?: boolean }) {
    return (
        <Button variant="outline" size="sm" onClick={onClick} disabled={disabled}>
            {children}
        </Button>
    );
}
