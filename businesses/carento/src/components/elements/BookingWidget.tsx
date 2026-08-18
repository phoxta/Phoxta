import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { lookupReservation, requestReservation, supabase, type Car } from "@/lib/phoxta";
import { openPaystackPopup } from "@/lib/paystackPopup";

// Real rental booking: pick a date range for THIS vehicle, add extras (insurance /
// GPS / seats — owner-defined per vehicle, priced per day server-side) and the
// driver's details, then request a reservation. Price + availability are enforced
// by app_request_reservation; it lands in the operating console as 'pending'.
// Falls back to a simulated confirmation when not backend-connected (local dev).
//
// Payment flow: when the tenant has Paystack configured, the checkout edge fn
// returns { url, access_code } — we show a "complete your payment" state (NOT a
// thank-you: the reservation isn't paid yet), open the Paystack overlay popup,
// and poll app_lookup_reservation every 3s (max 2 min) until the webhook marks
// it paid (status 'confirmed' — set together with metadata.paid). Only then do
// we celebrate. If payments aren't configured the pay-later thank-you stands.

const todayPlus = (d: number) => {
  const t = new Date();
  t.setDate(t.getDate() + d);
  return t.toISOString().slice(0, 10);
};

/** Statuses that mean the money actually arrived (paystack-webhook sets
 *  'confirmed' together with metadata.paid=true on charge.success). */
const PAID_STATUSES = new Set(["confirmed", "completed"]);

const ARROW = (
  <svg width={16} height={16} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M8 15L15 8L8 1M15 8L1 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export default function BookingWidget({ car, orgId }: { car?: Car; orgId: string | null }) {
  const [pickup, setPickup] = useState(todayPlus(1));
  const [dropoff, setDropoff] = useState(todayPlus(3));
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [license, setLicense] = useState("");
  const [age, setAge] = useState("");
  const [selected, setSelected] = useState<Record<string, { group: string; label: string; price: number }>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [confirmed, setConfirmed] = useState<string | null>(null);
  // Online payment: set when the checkout fn returned a transaction. While
  // non-null and !paid we're in the "complete your payment" state.
  const [payment, setPayment] = useState<{ accessCode: string | null; url: string | null } | null>(null);
  const [paid, setPaid] = useState(false);
  const pollTimer = useRef<number | null>(null);
  const pollDeadline = useRef(0);

  useEffect(() => () => stopPolling(), []);

  const nights = useMemo(() => {
    const n = Math.round((new Date(dropoff).getTime() - new Date(pickup).getTime()) / 86400000);
    return n > 0 ? n : 0;
  }, [pickup, dropoff]);
  const rate = car?.price ?? 0;
  const extrasPerDay = Object.values(selected).reduce((s, o) => s + o.price, 0) / 100;
  const extrasTotal = extrasPerDay * nights;
  const total = nights * rate + extrasTotal;

  function toggleExtra(group: string, label: string, price: number) {
    const k = `${group}::${label}`;
    setSelected((s) => {
      const n = { ...s };
      if (n[k]) delete n[k];
      else n[k] = { group, label, price };
      return n;
    });
  }

  function stopPolling() {
    if (pollTimer.current !== null) {
      window.clearInterval(pollTimer.current);
      pollTimer.current = null;
    }
  }

  /** One lookup via the same anon RPC the manage-booking page uses; flips to
   *  the real success state once the webhook has marked the reservation paid. */
  async function checkPaid(reservationId: string, customerEmail: string): Promise<void> {
    if (!orgId) return;
    try {
      const r = await lookupReservation(orgId, reservationId, customerEmail);
      const meta = (r as unknown as { metadata?: Record<string, unknown> } | null)?.metadata;
      if (r && r.found && (PAID_STATUSES.has(r.status) || meta?.paid === true)) {
        stopPolling();
        setPaid(true);
      }
    } catch {
      /* transient — next poll tick will retry */
    }
  }

  /** Poll the reservation lookup every 3s for up to 2 minutes. This is the
   *  source of truth for "paid" — the popup callbacks are best-effort only. */
  function beginPaidPolling(reservationId: string, customerEmail: string) {
    stopPolling();
    pollDeadline.current = Date.now() + 120000;
    pollTimer.current = window.setInterval(() => {
      if (Date.now() > pollDeadline.current) {
        stopPolling();
        return;
      }
      void checkPaid(reservationId, customerEmail);
    }, 3000);
  }

  function openPopup(reservationId: string, customerEmail: string, accessCode: string | null, url: string | null) {
    void openPaystackPopup(accessCode, url, {
      onSuccess: () => void checkPaid(reservationId, customerEmail),
      onCancel: () => {
        /* pending-payment state stays; the Pay now button re-opens the popup */
      },
    });
  }

  /** Try to start an online payment for the freshly created reservation. If the
   *  tenant hasn't configured payments (or the edge fn errors) we silently keep
   *  the existing pay-later confirmation — never block the booking on payment. */
  async function startPayment(reservationId: string, customerEmail: string): Promise<void> {
    if (!orgId) return;
    try {
      const returnUrl = `${location.origin}/manage-booking?ref=${encodeURIComponent(reservationId)}&email=${encodeURIComponent(customerEmail)}`;
      const { data, error: fnError } = await supabase.functions.invoke("paystack-storefront-checkout", {
        body: { orgId, kind: "reservation", id: reservationId, returnUrl },
      });
      if (fnError) return;
      const d = data as { url?: string; access_code?: string } | null;
      if (!d?.url && !d?.access_code) return;
      // Payment exists: DON'T celebrate — show the complete-your-payment state,
      // auto-open the Paystack popup, and start verifying via the lookup RPC.
      setPayment({ accessCode: d.access_code ?? null, url: d.url ?? null });
      beginPaidPolling(reservationId, customerEmail);
      openPopup(reservationId, customerEmail, d.access_code ?? null, d.url ?? null);
    } catch {
      /* payments unavailable — pay-later confirmation stands */
    }
  }

  async function book() {
    setError("");
    if (!car) { setError("Select a vehicle first."); return; }
    if (nights < 1) { setError("Drop-off must be after pick-up."); return; }
    if (!name.trim() || !email.trim()) { setError("Enter your name and email."); return; }
    setBusy(true);
    try {
      if (!orgId) {
        setConfirmed("demo-" + Math.random().toString(36).slice(2, 10));
      } else {
        const id = await requestReservation(orgId, String(car.id), name.trim(), email.trim(), pickup, dropoff, 1, {
          extras: Object.values(selected).map((o) => ({ group: o.group, label: o.label })),
          driver: { license: license.trim(), age: age.trim() },
        });
        setConfirmed(id);
        if (id) await startPayment(id, email.trim());
      }
    } catch (e) {
      setError((e as Error)?.message || "Could not complete the booking.");
    } finally {
      setBusy(false);
    }
  }

  // Paid online — the ONLY place we thank the customer in the payment path.
  if (confirmed && paid) {
    const manageHref = `/manage-booking?ref=${encodeURIComponent(confirmed)}&email=${encodeURIComponent(email.trim())}`;
    return (
      <div className="booking-form">
        <div className="head-booking-form"><p className="text-xl-bold neutral-1000">Payment received — thank you!</p></div>
        <div className="content-booking-form">
          <p className="text-md-medium neutral-700 mb-3">
            Thanks {name || "there"} — your booking of the <strong>{car?.name}</strong> from {pickup} to {dropoff}
            {" "}({nights} {nights === 1 ? "day" : "days"}) is confirmed. A receipt is on its way to {email}.
          </p>
          <p className="text-sm-medium neutral-500 mb-3">Reference: {confirmed}</p>
          <div className="box-button-book">
            <Link className="btn btn-book" to={manageHref}>
              Manage my booking
              {ARROW}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Payment started but NOT verified yet — no thank-you, no "confirmed".
  if (confirmed && payment) {
    return (
      <div className="booking-form">
        <div className="head-booking-form"><p className="text-xl-bold neutral-1000">Complete your payment</p></div>
        <div className="content-booking-form">
          <p className="text-md-medium neutral-700 mb-3">
            Your booking of the <strong>{car?.name}</strong> from {pickup} to {dropoff}
            {" "}({nights} {nights === 1 ? "day" : "days"}) is reserved — complete payment to confirm it.
          </p>
          <div className="item-line-booking last-item">
            <strong className="text-md-bold neutral-1000">Amount due</strong>
            <div className="line-booking-right"><p className="text-xl-bold neutral-1000">${total}</p></div>
          </div>
          <p className="text-sm-medium neutral-500 mb-3">Reference: {confirmed}</p>
          <div className="box-button-book">
            <button className="btn btn-book" onClick={() => openPopup(confirmed, email.trim(), payment.accessCode, payment.url)}>
              Pay now
              {ARROW}
            </button>
          </div>
          <p className="text-sm-medium neutral-500 mt-2 mb-0">This page updates automatically once your payment is received.</p>
        </div>
      </div>
    );
  }

  // Pay-later path (payments not configured / demo): today's flow, unchanged.
  if (confirmed) {
    return (
      <div className="booking-form">
        <div className="head-booking-form"><p className="text-xl-bold neutral-1000">Reservation requested</p></div>
        <div className="content-booking-form">
          <p className="text-md-medium neutral-700 mb-3">
            Thanks {name || "there"} — your reservation for the <strong>{car?.name}</strong> from {pickup} to {dropoff}
            {" "}({nights} {nights === 1 ? "day" : "days"}) is in. We'll confirm by email at {email}.
          </p>
          <p className="text-sm-medium neutral-500">Reference: {confirmed}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="booking-form">
      <div className="head-booking-form"><p className="text-xl-bold neutral-1000">Rent {car ? car.name : "This Vehicle"}</p></div>
      <div className="content-booking-form">
        <div className="item-line-booking border-bottom-0 pb-2">
          <strong className="text-md-bold neutral-1000">Pick-Up</strong>
          <div className="input-calendar"><input type="date" className="form-control calendar-date" value={pickup} min={todayPlus(0)} onChange={(e) => setPickup(e.target.value)} /></div>
        </div>
        <div className="item-line-booking pb-2">
          <strong className="text-md-bold neutral-1000">Drop-Off</strong>
          <div className="input-calendar"><input type="date" className="form-control calendar-date" value={dropoff} min={pickup} onChange={(e) => setDropoff(e.target.value)} /></div>
        </div>
        <div className="item-line-booking pb-2">
          <strong className="text-md-bold neutral-1000">Your name</strong>
          <div className="input-calendar"><input className="form-control" value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" /></div>
        </div>
        <div className="item-line-booking pb-2">
          <strong className="text-md-bold neutral-1000">Email</strong>
          <div className="input-calendar"><input className="form-control" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" /></div>
        </div>
        <div className="item-line-booking pb-2">
          <strong className="text-md-bold neutral-1000">Driver licence</strong>
          <div className="input-calendar"><input className="form-control" value={license} onChange={(e) => setLicense(e.target.value)} placeholder="Licence no." /></div>
        </div>
        <div className="item-line-booking pb-2">
          <strong className="text-md-bold neutral-1000">Driver age</strong>
          <div className="input-calendar"><input className="form-control" type="number" min={18} value={age} onChange={(e) => setAge(e.target.value)} placeholder="25" /></div>
        </div>

        {(car?.extras ?? []).map((g) => (
          <div key={g.name} className="pb-2">
            <strong className="text-md-bold neutral-1000 d-block mb-1">{g.name}</strong>
            {g.options.map((o) => (
              <label key={o.label} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", cursor: "pointer" }}>
                <span className="text-md-medium neutral-700"><input type="checkbox" checked={!!selected[`${g.name}::${o.label}`]} onChange={() => toggleExtra(g.name, o.label, o.price)} style={{ marginRight: 8 }} />{o.label}</span>
                {o.price > 0 && <span className="text-sm-medium neutral-500">+${(o.price / 100).toFixed(0)}/day</span>}
              </label>
            ))}
          </div>
        ))}

        <div className="item-line-booking last-item pb-0">
          <strong className="text-md-medium neutral-1000">${rate} × {nights} {nights === 1 ? "day" : "days"}</strong>
          <div className="line-booking-right"><p className="text-md-bold neutral-1000">${nights * rate}</p></div>
        </div>
        {extrasTotal > 0 && (
          <div className="item-line-booking last-item pb-0">
            <strong className="text-md-medium neutral-1000">Extras</strong>
            <div className="line-booking-right"><p className="text-md-bold neutral-1000">${extrasTotal}</p></div>
          </div>
        )}
        <div className="item-line-booking last-item">
          <strong className="text-md-bold neutral-1000">Total Payable</strong>
          <div className="line-booking-right"><p className="text-xl-bold neutral-1000">${total}</p></div>
        </div>
        {error && <p className="text-sm-medium mb-2" style={{ color: "#c0392b" }}>{error}</p>}
        <div className="box-button-book">
          <button className="btn btn-book" onClick={book} disabled={busy}>
            {busy ? "Booking…" : "Book Now"}
            {ARROW}
          </button>
        </div>
      </div>
    </div>
  );
}
