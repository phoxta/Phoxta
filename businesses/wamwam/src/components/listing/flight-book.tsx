import { useState } from "react";
import { isoAddDays, isoDaysFromToday } from "@/components/listing/booking-dates";
import { getOrgId } from "@/data/live-store";
import { useReservationPayment } from "@/hooks/use-reservation-payment";
import { initReservationPayment, requestReservation, type ReservationPayment } from "@/integration/phoxta";
import AppLink from "@/lib/nav/link";
import type { FlightListing } from "@/types/listings";

/**
 * Compact booking form inside a flight card's detail panel. A flight is a fare
 * (a product whose stock is seats); booking N seats for a departure date writes
 * a 'pending' reservation with units = passengers. The listed schedule date is
 * illustrative, so the traveller picks their own future date.
 */

interface FlightBookProps {
    flight: FlightListing;
}

const FIELD = "rounded-lg border border-border bg-transparent px-3 py-2 text-sm";

export default function FlightBook({ flight }: FlightBookProps) {
    const fare = parseFloat(String(flight.price).replace(/[^0-9.]/g, "")) || 0;
    const [depart, setDepart] = useState(isoDaysFromToday(14));
    const [pax, setPax] = useState(1);
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    const [reference, setReference] = useState<string | null>(null);
    const [payment, setPayment] = useState<ReservationPayment | null>(null);
    const { paid, pollExpired, openPopup } = useReservationPayment(reference, email, payment);

    async function book() {
        setError("");
        if (!name.trim() || !email.trim()) {
            setError("Enter your name and email.");
            return;
        }
        setBusy(true);
        try {
            const orgId = getOrgId();
            if (!orgId) {
                setReference("demo-" + Math.random().toString(36).slice(2, 10));
            } else {
                const id = await requestReservation(
                    orgId,
                    String(flight.id),
                    name.trim(),
                    email.trim(),
                    depart,
                    isoAddDays(depart, 1),
                    pax,
                );
                // The booking is already saved; a payment-init failure just keeps the pay-later confirmation.
                if (id) {
                    const pay = await initReservationPayment(orgId, id, email.trim());
                    if (pay) setPayment(pay);
                }
                setReference(id);
            }
        } catch (e) {
            setError(e instanceof Error && e.message ? e.message : "Could not book this fare.");
        } finally {
            setBusy(false);
        }
    }

    const manageHref = reference
        ? `/manage-booking?ref=${encodeURIComponent(reference)}&email=${encodeURIComponent(email.trim())}`
        : "";

    // Payment verified — the real success state.
    if (reference && paid) {
        return (
            <div className="flex flex-col gap-3 rounded-xl border border-border p-4 text-sm md:ms-24">
                <span>
                    Payment received — thank you! {pax} seat{pax > 1 ? "s" : ""} on <strong>{flight.name}</strong> departing {depart} confirmed. Reference: {reference}
                </span>
                <AppLink
                    className="self-start rounded-full bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground"
                    href={manageHref}
                >
                    Manage booking
                </AppLink>
            </div>
        );
    }

    // Payment initialised but not yet verified — no thank-you until it is paid.
    if (reference && payment) {
        return (
            <div className="flex flex-col gap-3 rounded-xl border border-border p-4 text-sm md:ms-24">
                <span className="font-medium">Complete your payment</span>
                <span>
                    {pax} seat{pax > 1 ? "s" : ""} on <strong>{flight.name}</strong> departing {depart} — reserved. Complete payment of ${(pax * fare).toLocaleString()} to confirm. Reference: {reference}
                </span>
                <button
                    onClick={openPopup}
                    className="self-start rounded-full bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground"
                >
                    Pay now
                </button>
                <span className="text-xs text-muted-foreground">
                    Payment opens in a secure Paystack window. This updates automatically once your payment is received.
                    {pollExpired && (
                        <>
                            {" "}Already paid?{" "}
                            <AppLink className="underline" href={manageHref}>
                                Check your booking
                            </AppLink>.
                        </>
                    )}
                </span>
            </div>
        );
    }

    // Pay-later flow (payments not configured for this tenant / demo mode).
    if (reference) {
        return (
            <div className="flex flex-col gap-3 rounded-xl border border-border p-4 text-sm md:ms-24">
                <span>
                    Booked {pax} seat{pax > 1 ? "s" : ""} on <strong>{flight.name}</strong> departing {depart}. Reference: {reference}
                </span>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-3 rounded-xl border border-border p-4 md:ms-24">
            <div className="text-sm font-medium">Book this fare — {flight.price} / seat</div>
            <div className="flex flex-wrap gap-3">
                <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                    Departure date
                    <input type="date" className={FIELD} value={depart} min={isoDaysFromToday(0)} onChange={(e) => setDepart(e.target.value)} />
                </label>
                <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                    Passengers
                    <input type="number" min={1} className={`${FIELD} w-24`} value={pax} onChange={(e) => setPax(Math.max(1, Number(e.target.value) || 1))} />
                </label>
                <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                    Name
                    <input className={FIELD} value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" />
                </label>
                <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                    Email
                    <input className={FIELD} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" />
                </label>
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Total ${(pax * fare).toLocaleString()}</span>
                <button onClick={book} disabled={busy} className="rounded-full bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-60">
                    {busy ? "Booking…" : "Book seats"}
                </button>
            </div>
        </div>
    );
}
