import { useEffect, useMemo, useState } from "react";
import type { Member } from "@/data/core";
import { cn } from "@/lib/cn";
import { useSpace } from "@/state/space";
import { MemberMultiPicker, MemberPicker, VisibilityPicker } from "@/components/shared";
import { Dialog } from "@/components/ui/overlay";
import { Button, EmptyState, Field } from "@/components/ui/primitives";
import { capsuleItems } from "../derive";
import {
    BOOKING_KINDS,
    BOOKING_KIND,
    DOC_KINDS,
    DOC_KIND,
    PACKING_TEMPLATE,
    PACKING_TEMPLATES,
    PACK_CATEGORIES,
    PACK_CATEGORY,
    TRIP_KINDS,
    TRIP_KIND,
    TRIP_STATUSES,
    TRIP_STATUS,
    type BookingKind,
    type DocKind,
    type NewBooking,
    type NewDoc,
    type NewExpense,
    type NewItineraryItem,
    type NewPackingItem,
    type NewTrip,
    type PackItemCategory,
    type PackingTemplate,
    type Sensitivity,
    type Trip,
    type TripKind,
    type TripStatus,
    type WardrobeSlice,
} from "../types";

/**
 * Every form in the module, in one file: real `<form onSubmit>`s, labelled
 * inputs, errors inline, and a save button that reports what went wrong rather
 * than swallowing it. Money is typed the way a person types it ("120.50") and
 * stored as integer minor units.
 */

/** "£1,240.50" / "1240.5" / "" → integer minor units. */
export function parseMoney(v: string): number {
    const n = Number(v.replace(/[^0-9.-]/g, ""));
    return Number.isFinite(n) ? Math.round(n * 100) : 0;
}

const showMoney = (cents: number | null | undefined): string => (cents === null || cents === undefined ? "" : (cents / 100).toString());

function Select<T extends string>({ label, value, onChange, options, className }: { label: string; value: T; onChange: (v: T) => void; options: Array<{ value: T; label: string }>; className?: string }) {
    const id = `sel-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
    return (
        <div className={cn("flex flex-col gap-1.5", className)}>
            <label htmlFor={id} className="text-xs font-medium uppercase tracking-[0.06em] text-muted">
                {label}
            </label>
            <select id={id} value={value} onChange={(e) => onChange(e.target.value as T)} className="h-[46px] rounded-md border border-line-strong bg-card px-3 text-md outline-none focus:border-brand">
                {options.map((o) => (
                    <option key={o.value} value={o.value}>
                        {o.label}
                    </option>
                ))}
            </select>
        </div>
    );
}

function TextArea({ label, value, onChange, rows = 3, placeholder }: { label: string; value: string; onChange: (v: string) => void; rows?: number; placeholder?: string }) {
    const id = `ta-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
    return (
        <div className="flex flex-col gap-1.5">
            <label htmlFor={id} className="text-xs font-medium uppercase tracking-[0.06em] text-muted">
                {label}
            </label>
            <textarea id={id} rows={rows} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="rounded-md border border-line-strong bg-card px-4 py-3 text-md outline-none focus:border-brand" />
        </div>
    );
}

function useSubmit(onSave: () => Promise<void>, onClose: () => void) {
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const submit = async (e: React.FormEvent): Promise<void> => {
        e.preventDefault();
        setBusy(true);
        setError(null);
        try {
            await onSave();
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : "That didn't save");
        } finally {
            setBusy(false);
        }
    };
    return { busy, error, submit, setError };
}

// ---------------------------------------------------------------------------
// Trip
// ---------------------------------------------------------------------------

export function TripDialog({ open, onClose, trip, onSave }: { open: boolean; onClose: () => void; trip?: Trip; onSave: (input: NewTrip) => Promise<void> }) {
    const { space, members, today } = useSpace();
    const [title, setTitle] = useState("");
    const [destination, setDestination] = useState("");
    const [countryCode, setCountryCode] = useState("GB");
    const [kind, setKind] = useState<TripKind>("holiday");
    const [status, setStatus] = useState<TripStatus>("planning");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [budget, setBudget] = useState("");
    const [localCurrency, setLocalCurrency] = useState(space.currency);
    const [fxRate, setFxRate] = useState("1");
    const [template, setTemplate] = useState<PackingTemplate>("city");
    const [valueId, setValueId] = useState<string>("");
    const [notes, setNotes] = useState("");
    const [travellerIds, setTravellerIds] = useState<string[]>([]);
    const [visibility, setVisibility] = useState<Trip["visibility"]>("family");
    const [sharedWith, setSharedWith] = useState<string[]>([]);

    useEffect(() => {
        if (!open) return;
        setTitle(trip?.title ?? "");
        setDestination(trip?.destination ?? "");
        setCountryCode(trip?.countryCode ?? "GB");
        setKind(trip?.kind ?? "holiday");
        setStatus(trip?.status ?? "planning");
        setStartDate(trip?.startDate ?? "");
        setEndDate(trip?.endDate ?? "");
        setBudget(showMoney(trip?.budgetCents ?? null));
        setLocalCurrency(trip?.localCurrency ?? space.currency);
        setFxRate(String(trip?.fxRate ?? 1));
        setTemplate(trip?.template ?? "city");
        setValueId(trip?.valueId ?? "");
        setNotes(trip?.notes ?? "");
        setVisibility(trip?.visibility ?? "family");
        setSharedWith(trip?.sharedWith ?? []);
        setTravellerIds(trip ? [] : members.filter((m) => m.role !== "guest").map((m) => m.id));
    }, [open, trip, members, space.currency]);

    const { busy, error, submit } = useSubmit(
        () =>
            onSave({
                title,
                destination,
                countryCode,
                kind,
                status,
                startDate: startDate || null,
                endDate: endDate || startDate || null,
                budgetCents: budget ? parseMoney(budget) : null,
                localCurrency,
                fxRate: Number(fxRate) || 1,
                template,
                valueId: valueId || null,
                notes,
                visibility,
                sharedWith,
                travellerIds: trip ? undefined : travellerIds,
            }),
        onClose,
    );

    return (
        <Dialog open={open} onClose={onClose} title={trip ? "Edit the trip" : "A new trip"} wide>
            <form onSubmit={submit} className="space-y-4">
                <Field label="What are we calling it" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Christmas in Lagos" required />
                <div className="grid grid-cols-[minmax(0,1fr)] gap-4 md:grid-cols-2">
                    <Field label="Where" value={destination} onChange={(e) => setDestination(e.target.value)} placeholder="Lagos, Nigeria" />
                    <Field label="Country code" value={countryCode} onChange={(e) => setCountryCode(e.target.value.toUpperCase().slice(0, 2))} hint="Two letters. GB means no passport rules apply." />
                </div>
                <div className="grid grid-cols-[minmax(0,1fr)] gap-4 md:grid-cols-2">
                    <Select label="Kind of trip" value={kind} onChange={setKind} options={TRIP_KINDS.map((k) => ({ value: k, label: `${TRIP_KIND[k].emoji} ${TRIP_KIND[k].label}` }))} />
                    <Select label="Where it's up to" value={status} onChange={setStatus} options={TRIP_STATUSES.map((k) => ({ value: k, label: TRIP_STATUS[k].label }))} />
                </div>
                <div className="grid grid-cols-[minmax(0,1fr)] gap-4 md:grid-cols-2">
                    <Field label="Leaving" type="date" value={startDate} min="2000-01-01" onChange={(e) => setStartDate(e.target.value)} hint={`Today is ${today}. Leave both empty for a someday trip.`} />
                    <Field label="Home" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                </div>
                <div className="grid grid-cols-[minmax(0,1fr)] gap-4 md:grid-cols-3">
                    <Field label={`Budget (${space.currency})`} value={budget} onChange={(e) => setBudget(e.target.value)} inputMode="decimal" placeholder="1200" />
                    <Field label="Currency there" value={localCurrency} onChange={(e) => setLocalCurrency(e.target.value.toUpperCase().slice(0, 3))} hint="NGN, EUR…" />
                    <Field
                        label="Rate"
                        value={fxRate}
                        onChange={(e) => setFxRate(e.target.value)}
                        inputMode="decimal"
                        hint={localCurrency === space.currency ? "Same currency — leave it at 1." : `1 ${space.currency} = this many ${localCurrency}`}
                    />
                </div>
                <div className="grid grid-cols-[minmax(0,1fr)] gap-4 md:grid-cols-2">
                    <Select label="Packing template" value={template} onChange={setTemplate} options={PACKING_TEMPLATES.map((t) => ({ value: t, label: PACKING_TEMPLATE[t].label }))} />
                    <Select label="A value this serves" value={valueId} onChange={setValueId} options={[{ value: "", label: "None in particular" }, ...space.values.map((v) => ({ value: v, label: v }))]} />
                </div>
                <TextArea label="Notes" value={notes} onChange={setNotes} placeholder="What this trip is for, and anything the family should remember." />
                {!trip && <MemberMultiPicker value={travellerIds} onChange={setTravellerIds} label="Who's going" />}
                <VisibilityPicker value={visibility} onChange={setVisibility} sharedWith={sharedWith} onSharedWith={setSharedWith} />
                {error && <p className="text-sm text-danger-ink">{error}</p>}
                <div className="flex justify-end gap-2 pt-1">
                    <Button variant="ghost" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button type="submit" loading={busy}>
                        {trip ? "Save the trip" : "Add the trip"}
                    </Button>
                </div>
            </form>
        </Dialog>
    );
}

// ---------------------------------------------------------------------------
// Itinerary item
// ---------------------------------------------------------------------------

export function ItineraryItemDialog({
    open,
    onClose,
    dayId,
    dayLabel,
    localCurrency,
    initial,
    onSave,
}: {
    open: boolean;
    onClose: () => void;
    dayId: string;
    dayLabel: string;
    localCurrency: string;
    initial?: Partial<NewItineraryItem>;
    onSave: (input: NewItineraryItem) => Promise<void>;
}) {
    const [time, setTime] = useState("");
    const [title, setTitle] = useState("");
    const [place, setPlace] = useState("");
    const [coords, setCoords] = useState("");
    const [cost, setCost] = useState("");
    const [bookingRef, setBookingRef] = useState("");
    const [notes, setNotes] = useState("");

    useEffect(() => {
        if (!open) return;
        setTime(initial?.time ?? "");
        setTitle(initial?.title ?? "");
        setPlace(initial?.place ?? "");
        setCoords(initial?.coords ?? "");
        setCost(showMoney(initial?.costCents ?? null));
        setBookingRef(initial?.bookingRef ?? "");
        setNotes(initial?.notes ?? "");
    }, [open, initial]);

    const { busy, error, submit } = useSubmit(() => onSave({ dayId, time, title, place, coords: coords || null, costCents: cost ? parseMoney(cost) : 0, bookingRef, notes }), onClose);

    return (
        <Dialog open={open} onClose={onClose} title={`Add to ${dayLabel}`}>
            <form onSubmit={submit} className="space-y-4">
                <Field label="What" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Canopy walkway" required />
                <div className="grid grid-cols-[minmax(0,1fr)] gap-4 md:grid-cols-2">
                    <Field label="When" type="time" value={time} onChange={(e) => setTime(e.target.value)} hint="Leave empty for 'sometime today'." />
                    <Field label={`Cost (${localCurrency})`} value={cost} onChange={(e) => setCost(e.target.value)} inputMode="decimal" />
                </div>
                <Field label="Where" value={place} onChange={(e) => setPlace(e.target.value)} placeholder="Lekki Conservation Centre, Lagos" hint="Anything a maps app can find." />
                <Field label="Coordinates" value={coords} onChange={(e) => setCoords(e.target.value)} placeholder="6.4419,3.5406" hint="Optional. With these the maps link is exact." />
                <Field label="Booking reference" value={bookingRef} onChange={(e) => setBookingRef(e.target.value)} />
                <TextArea label="Notes" value={notes} onChange={setNotes} rows={2} />
                {error && <p className="text-sm text-danger-ink">{error}</p>}
                <div className="flex justify-end gap-2">
                    <Button variant="ghost" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button type="submit" loading={busy}>
                        Add it
                    </Button>
                </div>
            </form>
        </Dialog>
    );
}

// ---------------------------------------------------------------------------
// Booking
// ---------------------------------------------------------------------------

export function BookingDialog({ open, onClose, onSave }: { open: boolean; onClose: () => void; onSave: (input: NewBooking) => Promise<void> }) {
    const { today } = useSpace();
    const [kind, setKind] = useState<BookingKind>("flight");
    const [provider, setProvider] = useState("");
    const [reference, setReference] = useState("");
    const [startAt, setStartAt] = useState(`${today}T09:00`);
    const [endAt, setEndAt] = useState("");
    const [cost, setCost] = useState("");
    const [link, setLink] = useState("");
    const [confirmed, setConfirmed] = useState(false);
    const [sensitivity, setSensitivity] = useState<Sensitivity>("general");
    const [notes, setNotes] = useState("");

    useEffect(() => {
        if (!open) return;
        setKind("flight");
        setProvider("");
        setReference("");
        setStartAt(`${today}T09:00`);
        setEndAt("");
        setCost("");
        setLink("");
        setConfirmed(false);
        setSensitivity("general");
        setNotes("");
    }, [open, today]);

    const { busy, error, submit } = useSubmit(
        () =>
            onSave({
                kind,
                provider,
                reference,
                startAt: new Date(startAt).toISOString(),
                endAt: endAt ? new Date(endAt).toISOString() : null,
                costCents: cost ? parseMoney(cost) : 0,
                link,
                confirmed,
                sensitivity,
                notes,
            }),
        onClose,
    );

    return (
        <Dialog open={open} onClose={onClose} title="Add a booking">
            <form onSubmit={submit} className="space-y-4">
                <Select label="What kind" value={kind} onChange={setKind} options={BOOKING_KINDS.map((k) => ({ value: k, label: `${BOOKING_KIND[k].emoji} ${BOOKING_KIND[k].label}` }))} />
                <Field label="Who with" value={provider} onChange={(e) => setProvider(e.target.value)} placeholder="British Airways" required />
                <Field label="Reference" value={reference} onChange={(e) => setReference(e.target.value)} placeholder="KX7ND2" />
                <div className="grid grid-cols-[minmax(0,1fr)] gap-4 md:grid-cols-2">
                    <Field label="From" type="datetime-local" value={startAt} onChange={(e) => setStartAt(e.target.value)} required />
                    <Field label="To" type="datetime-local" value={endAt} onChange={(e) => setEndAt(e.target.value)} />
                </div>
                <div className="grid grid-cols-[minmax(0,1fr)] gap-4 md:grid-cols-2">
                    <Field label="Cost" value={cost} onChange={(e) => setCost(e.target.value)} inputMode="decimal" />
                    <Select
                        label="Who can see it"
                        value={sensitivity}
                        onChange={setSensitivity}
                        options={[
                            { value: "general" as Sensitivity, label: "Everyone on the trip" },
                            { value: "financial" as Sensitivity, label: "Parents (it's about money)" },
                            { value: "documents" as Sensitivity, label: "Parents only (papers)" },
                        ]}
                    />
                </div>
                <Field label="Link" value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://…" />
                <label className="flex items-center gap-2.5 text-md">
                    <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} className="size-[18px] accent-[var(--color-brand)]" />
                    Paid for and confirmed
                </label>
                <TextArea label="Notes" value={notes} onChange={setNotes} rows={2} />
                {error && <p className="text-sm text-danger-ink">{error}</p>}
                <div className="flex justify-end gap-2">
                    <Button variant="ghost" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button type="submit" loading={busy}>
                        Add the booking
                    </Button>
                </div>
            </form>
        </Dialog>
    );
}

// ---------------------------------------------------------------------------
// Document
// ---------------------------------------------------------------------------

export function DocDialog({ open, onClose, onSave }: { open: boolean; onClose: () => void; onSave: (input: NewDoc) => Promise<void> }) {
    const { members, me } = useSpace();
    const [memberId, setMemberId] = useState<string | null>(me.id);
    const [kind, setKind] = useState<DocKind>("passport");
    const [label, setLabel] = useState("");
    const [number, setNumber] = useState("");
    const [expiresAt, setExpiresAt] = useState("");
    const [notes, setNotes] = useState("");

    useEffect(() => {
        if (!open) return;
        setMemberId(members[0]?.id ?? me.id);
        setKind("passport");
        setLabel("");
        setNumber("");
        setExpiresAt("");
        setNotes("");
    }, [open, members, me.id]);

    const { busy, error, submit } = useSubmit(() => onSave({ memberId: memberId ?? me.id, kind, label, number, expiresAt: expiresAt || null, notes }), onClose);

    return (
        <Dialog open={open} onClose={onClose} title="Add a document">
            <form onSubmit={submit} className="space-y-4">
                <p className="rounded-md bg-page px-4 py-3 text-sm leading-5 text-muted">
                    Documents are parents-only, everywhere: they are filtered out of a child&apos;s and a guest&apos;s data before it leaves the server, not hidden on the screen.
                </p>
                <MemberPicker value={memberId} onChange={setMemberId} label="Whose is it" />
                <Select label="What is it" value={kind} onChange={setKind} options={DOC_KINDS.map((k) => ({ value: k, label: `${DOC_KIND[k].emoji} ${DOC_KIND[k].label}` }))} />
                <Field label="Label" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="British passport" />
                <Field label="Number" value={number} onChange={(e) => setNumber(e.target.value)} hint="Only the last four characters are ever shown." />
                <Field label="Expires" type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} hint="You'll be reminded 90 days and 30 days before." />
                <TextArea label="Notes" value={notes} onChange={setNotes} rows={2} />
                {error && <p className="text-sm text-danger-ink">{error}</p>}
                <div className="flex justify-end gap-2">
                    <Button variant="ghost" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button type="submit" loading={busy}>
                        Save the document
                    </Button>
                </div>
            </form>
        </Dialog>
    );
}

// ---------------------------------------------------------------------------
// Expense
// ---------------------------------------------------------------------------

export function ExpenseDialog({ open, onClose, trip, onSave }: { open: boolean; onClose: () => void; trip: Trip; onSave: (input: NewExpense) => Promise<void> }) {
    const { space, me, today } = useSpace();
    const [label, setLabel] = useState("");
    const [amount, setAmount] = useState("");
    const [currency, setCurrency] = useState(space.currency);
    const [rate, setRate] = useState(String(trip.fxRate || 1));
    const [memberId, setMemberId] = useState<string | null>(me.id);
    const [date, setDate] = useState(today);
    const [note, setNote] = useState("");

    useEffect(() => {
        if (!open) return;
        setLabel("");
        setAmount("");
        setCurrency(space.currency);
        setRate(String(trip.fxRate || 1));
        setMemberId(me.id);
        setDate(today);
        setNote("");
    }, [open, space.currency, trip.fxRate, me.id, today]);

    const foreign = currency !== space.currency;
    const { busy, error, submit } = useSubmit(
        () => onSave({ label, amountCents: parseMoney(amount), currency, fxRate: foreign ? Number(rate) || trip.fxRate : 1, memberId: memberId ?? me.id, date, note }),
        onClose,
    );

    return (
        <Dialog open={open} onClose={onClose} title="What did it cost?">
            <form onSubmit={submit} className="space-y-4">
                <p className="rounded-md bg-page px-4 py-3 text-sm leading-5 text-muted">
                    This posts to the family ledger under <strong className="font-semibold">{trip.financeCategoryLabel}</strong>, and is converted to {space.currency} so the budget still adds up.
                </p>
                <Field label="What for" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Airport transfer" required />
                <div className="grid grid-cols-[minmax(0,1fr)] gap-4 md:grid-cols-3">
                    <Field label="Amount" value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" required />
                    <Field label="Currency" value={currency} onChange={(e) => setCurrency(e.target.value.toUpperCase().slice(0, 3))} />
                    <Field label="Rate" value={rate} onChange={(e) => setRate(e.target.value)} inputMode="decimal" disabled={!foreign} hint={foreign ? `1 ${space.currency} = ? ${currency}` : "Same currency"} />
                </div>
                <div className="grid grid-cols-[minmax(0,1fr)] gap-4 md:grid-cols-2">
                    <MemberPicker value={memberId} onChange={setMemberId} label="Who paid" />
                    <Field label="When" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                </div>
                <TextArea label="Note" value={note} onChange={setNote} rows={2} />
                {error && <p className="text-sm text-danger-ink">{error}</p>}
                <div className="flex justify-end gap-2">
                    <Button variant="ghost" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button type="submit" loading={busy}>
                        Post it to the ledger
                    </Button>
                </div>
            </form>
        </Dialog>
    );
}

// ---------------------------------------------------------------------------
// A packing item, by hand or from the wardrobe (AC 9)
// ---------------------------------------------------------------------------

export function PackingItemDialog({
    open,
    onClose,
    member,
    wardrobe,
    onSave,
}: {
    open: boolean;
    onClose: () => void;
    member: Member;
    wardrobe: WardrobeSlice | undefined;
    onSave: (input: NewPackingItem) => Promise<void>;
}) {
    const [tab, setTab] = useState<"typed" | "wardrobe">("typed");
    const [item, setItem] = useState("");
    const [qty, setQty] = useState("1");
    const [category, setCategory] = useState<PackItemCategory>("other");
    const capsule = useMemo(() => capsuleItems(wardrobe, member.id), [wardrobe, member.id]);

    useEffect(() => {
        if (!open) return;
        setTab(capsule.length ? "wardrobe" : "typed");
        setItem("");
        setQty("1");
        setCategory("other");
    }, [open, capsule.length]);

    const { busy, error, submit } = useSubmit(() => onSave({ item, qty: Number(qty) || 1, category }), onClose);

    return (
        <Dialog open={open} onClose={onClose} title={`Add to ${member.name.split(" ")[0]}'s list`}>
            <div className="mb-4 flex gap-1 rounded-full bg-page p-1" role="tablist">
                {(["wardrobe", "typed"] as const).map((t) => (
                    <button
                        key={t}
                        type="button"
                        role="tab"
                        aria-selected={tab === t}
                        onClick={() => setTab(t)}
                        className={cn("h-9 flex-1 rounded-full text-sm font-semibold", tab === t ? "bg-card text-ink shadow-sm" : "text-muted")}
                    >
                        {t === "wardrobe" ? "From the wardrobe" : "Type it"}
                    </button>
                ))}
            </div>

            {tab === "wardrobe" ? (
                capsule.length ? (
                    <ul className="space-y-2">
                        {capsule.map((c) => (
                            <li key={c.id}>
                                <button
                                    type="button"
                                    onClick={() => {
                                        void onSave({ item: c.label, qty: 1, category: c.category, wardrobeItemId: c.id, wardrobeLabel: `${c.label} · ${c.capsule}` }).then(onClose);
                                    }}
                                    className="flex w-full items-center justify-between gap-3 rounded-md border border-line-strong px-4 py-3 text-left hover:border-brand"
                                >
                                    <span>
                                        <span className="block text-md font-medium">{c.label}</span>
                                        <span className="block text-xs text-caption">{c.capsule}</span>
                                    </span>
                                    <span className="text-xs font-semibold text-brand">Add</span>
                                </button>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <EmptyState
                        title="No capsules to pull from yet"
                        body={`When ${member.name.split(" ")[0]} has a capsule in the Wardrobe, its pieces show up here and stay linked to the real garment.`}
                        action={
                            <Button variant="outline" onClick={() => setTab("typed")}>
                                Type it instead
                            </Button>
                        }
                    />
                )
            ) : (
                <form onSubmit={submit} className="space-y-4">
                    <Field label="What" value={item} onChange={(e) => setItem(e.target.value)} placeholder="Sun hat" required />
                    <div className="grid grid-cols-[minmax(0,1fr)] gap-4 md:grid-cols-2">
                        <Field label="How many" value={qty} onChange={(e) => setQty(e.target.value)} inputMode="numeric" />
                        <Select label="Where it goes" value={category} onChange={setCategory} options={PACK_CATEGORIES.map((c) => ({ value: c, label: `${PACK_CATEGORY[c].emoji} ${PACK_CATEGORY[c].label}` }))} />
                    </div>
                    {error && <p className="text-sm text-danger-ink">{error}</p>}
                    <div className="flex justify-end gap-2">
                        <Button variant="ghost" onClick={onClose}>
                            Cancel
                        </Button>
                        <Button type="submit" loading={busy}>
                            Add it
                        </Button>
                    </div>
                </form>
            )}
        </Dialog>
    );
}

// ---------------------------------------------------------------------------
// One line on the run-up
// ---------------------------------------------------------------------------

export function ChecklistDialog({ open, onClose, onSave }: { open: boolean; onClose: () => void; onSave: (item: string, offset: number, ownerMemberId: string | null, note: string) => Promise<void> }) {
    const [item, setItem] = useState("");
    const [offset, setOffset] = useState("7");
    const [owner, setOwner] = useState<string | null>(null);
    const [note, setNote] = useState("");

    useEffect(() => {
        if (!open) return;
        setItem("");
        setOffset("7");
        setOwner(null);
        setNote("");
    }, [open]);

    const { busy, error, submit } = useSubmit(() => onSave(item, Number(offset) || 0, owner, note), onClose);

    return (
        <Dialog open={open} onClose={onClose} title="One more thing before we go">
            <form onSubmit={submit} className="space-y-4">
                <Field label="What needs doing" value={item} onChange={(e) => setItem(e.target.value)} placeholder="Cancel the veg box" required />
                <Select
                    label="When"
                    value={offset}
                    onChange={setOffset}
                    options={[
                        { value: "14", label: "Two weeks before (T-14)" },
                        { value: "7", label: "A week before (T-7)" },
                        { value: "3", label: "Three days before (T-3)" },
                        { value: "1", label: "The day before (T-1)" },
                        { value: "0", label: "The day we go (T-0)" },
                    ]}
                />
                <MemberPicker value={owner} onChange={setOwner} allowFamily label="Whose job" />
                <TextArea label="Note" value={note} onChange={setNote} rows={2} />
                {error && <p className="text-sm text-danger-ink">{error}</p>}
                <div className="flex justify-end gap-2">
                    <Button variant="ghost" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button type="submit" loading={busy}>
                        Add it
                    </Button>
                </div>
            </form>
        </Dialog>
    );
}
