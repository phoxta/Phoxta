import { useMemo, useState } from "react";
import { isoAddDays, isoDaysFromToday } from "@/components/listing/booking-dates";
import { getOrgId } from "@/data/live-store";
import { useReservationPayment } from "@/hooks/use-reservation-payment";
import { initReservationPayment, requestReservation, type ReservationPayment } from "@/integration/phoxta";
import AppLink from "@/lib/nav/link";
import type { Vertical } from "@/types/domain";
import type { ListingBase } from "@/types/listings";

/**
 * Booking box for the stay / car / experience detail sidebars. Pricing and
 * availability are enforced server-side by app_request_reservation and the
 * booking lands in the operating console as 'pending'. Without a resolved
 * tenant (local dev, unknown host) it simulates a confirmation instead.
 */

type ReserveVertical = Exclude<Vertical, "flight">;

/** The slice of a listing the box reads; every detail type satisfies it. */
export type ReservableListing = Pick<ListingBase, "id" | "title" | "price">;

interface VerticalCopy {
    startL: string;
    endL: string;
    qtyL: string;
    per: string;
    range: boolean;
}

const CFG: Record<ReserveVertical, VerticalCopy> = {
    stay: { startL: "Check in", endL: "Check out", qtyL: "Rooms", per: "night", range: true },
    car: { startL: "Pick-up", endL: "Drop-off", qtyL: "Vehicles", per: "day", range: true },
    experience: { startL: "Date", endL: "", qtyL: "Guests", per: "person", range: false },
};

const MS_PER_DAY = 86_400_000;

interface ReserveBoxProps {
    listing: ReservableListing;
    vertical: ReserveVertical;
}

export default function ReserveBox({ listing, vertical }: ReserveBoxProps) {
    const cfg = CFG[vertical];
    const rate = useMemo(() => parseFloat(String(listing.price).replace(/[^0-9.]/g, "")) || 0, [listing.price]);
    const [start, setStart] = useState(isoDaysFromToday(2));
    const [end, setEnd] = useState(isoDaysFromToday(cfg.range ? 4 : 3));
    const [qty, setQty] = useState(1);
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    const [confirmed, setConfirmed] = useState<string | null>(null);
    const [payment, setPayment] = useState<ReservationPayment | null>(null);
    const { paid, pollExpired, openPopup } = useReservationPayment(confirmed, email, payment);

    const nights = useMemo(() => {
        if (!cfg.range) return 1;
        const n = Math.round((new Date(end).getTime() - new Date(start).getTime()) / MS_PER_DAY);
        return n > 0 ? n : 0;
    }, [start, end, cfg.range]);
    const total = (cfg.range ? nights : 1) * qty * rate;

    async function reserve() {
        setError("");
        if (cfg.range && nights < 1) {
            setError(`${cfg.endL} must be after ${cfg.startL.toLowerCase()}.`);
            return;
        }
        if (!name.trim() || !email.trim()) {
            setError("Enter your name and email.");
            return;
        }
        setBusy(true);
        try {
            const orgId = getOrgId();
            // Single-day verticals occupy [start, start + 1).
            const endDate = cfg.range ? end : isoAddDays(start, 1);
            if (!orgId) {
                setConfirmed("demo-" + Math.random().toString(36).slice(2, 10));
            } else {
                const id = await requestReservation(orgId, String(listing.id), name.trim(), email.trim(), start, endDate, qty);
                // The booking is already saved; a payment-init failure just keeps the pay-later flow.
                if (id) {
                    const pay = await initReservationPayment(orgId, id, email.trim());
                    if (pay) setPayment(pay);
                }
                setConfirmed(id);
            }
        } catch (e) {
            setError(e instanceof Error && e.message ? e.message : "Could not complete the booking.");
        } finally {
            setBusy(false);
        }
    }

    const wrap = "listingSection__wrap rounded-2xl shadow-lg-for-card bg-card p-4 sm:p-6 2xl:p-7 flex flex-col gap-4";
    const field = "rounded-xl border border-border bg-transparent px-4 py-3 text-sm w-full";

    const when = cfg.range ? ` from ${start} to ${end}` : ` on ${start}`;
    const manageHref = confirmed
        ? `/manage-booking?ref=${encodeURIComponent(confirmed)}&email=${encodeURIComponent(email.trim())}`
        : "";

    // Payment verified — the real success state.
    if (confirmed && paid) {
        return (
            <div className={wrap}>
                <h3 className="text-xl font-semibold">Payment received — thank you!</h3>
                <p className="text-sm text-muted-foreground">
                    {name ? `${name}, your` : "Your"} booking for <strong>{listing.title}</strong>
                    {when} ({qty} {cfg.qtyL.toLowerCase()}) is confirmed. A confirmation email is on its way to {email}.
                </p>
                <p className="text-xs text-muted-foreground">Reference: {confirmed}</p>
                <AppLink
                    href={manageHref}
                    className="w-full rounded-full bg-primary px-6 py-3 text-center text-sm font-medium text-primary-foreground sm:h-12 sm:leading-6"
                >
                    Manage booking
                </AppLink>
            </div>
        );
    }

    // Payment initialised but not yet verified — no thank-you until it is paid.
    if (confirmed && payment) {
        return (
            <div className={wrap}>
                <h3 className="text-xl font-semibold">Complete your payment</h3>
                <p className="text-sm text-muted-foreground">
                    Your booking for <strong>{listing.title}</strong>
                    {when} ({qty} {cfg.qtyL.toLowerCase()}) is reserved — complete payment to confirm it.
                </p>
                <p className="text-xs text-muted-foreground">Reference: {confirmed}</p>
                <div className="flex items-center justify-between border-t border-border pt-3 font-medium">
                    <span>Amount due</span>
                    <span>${total.toLocaleString()}</span>
                </div>
                <button
                    onClick={openPopup}
                    className="w-full rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground sm:h-12"
                >
                    Pay now
                </button>
                <p className="text-center text-xs text-muted-foreground">
                    Payment opens in a secure Paystack window. This page updates automatically once your payment is received.
                </p>
                {pollExpired && (
                    <p className="text-center text-xs text-muted-foreground">
                        Still waiting on payment confirmation. Already paid? Check{" "}
                        <AppLink className="underline" href={manageHref}>
                            Manage booking
                        </AppLink>.
                    </p>
                )}
            </div>
        );
    }

    // Pay-later flow (payments not configured for this tenant / demo mode).
    if (confirmed) {
        return (
            <div className={wrap}>
                <h3 className="text-xl font-semibold">Booking requested</h3>
                <p className="text-sm text-muted-foreground">
                    Thanks {name || "there"} — your booking for <strong>{listing.title}</strong>
                    {when} ({qty} {cfg.qtyL.toLowerCase()}) is in.
                    We&apos;ll confirm by email at {email}.
                </p>
                <p className="text-xs text-muted-foreground">Reference: {confirmed}</p>
            </div>
        );
    }

    return (
        <div className={wrap}>
            <div className="flex items-end text-2xl font-[540]">
                <span>{listing.price}</span>
                <span className="ms-1 text-base font-normal text-muted-foreground">/ {cfg.per}</span>
            </div>

            <div className="flex flex-col gap-3">
                <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
                    {cfg.startL}
                    <input type="date" className={field} value={start} min={isoDaysFromToday(0)} onChange={(e) => setStart(e.target.value)} />
                </label>
                {cfg.range && (
                    <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
                        {cfg.endL}
                        <input type="date" className={field} value={end} min={start} onChange={(e) => setEnd(e.target.value)} />
                    </label>
                )}
                <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
                    {cfg.qtyL}
                    <input type="number" min={1} className={field} value={qty} onChange={(e) => setQty(Math.max(1, Number(e.target.value) || 1))} />
                </label>
                <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
                    Your name
                    <input className={field} value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" />
                </label>
                <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
                    Email
                    <input type="email" className={field} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" />
                </label>
            </div>

            <div className="flex items-center justify-between border-t border-border pt-3 font-medium">
                <span>{cfg.range ? `${listing.price} × ${nights} ${cfg.per}${nights === 1 ? "" : "s"} × ${qty}` : `${listing.price} × ${qty}`}</span>
                <span>${total.toLocaleString()}</span>
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <button
                onClick={reserve}
                disabled={busy}
                className="w-full rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground disabled:opacity-60 sm:h-12"
            >
                {busy ? "Booking…" : "Reserve"}
            </button>
            <p className="text-center text-xs text-muted-foreground">You won&apos;t be charged yet</p>
        </div>
    );
}
