import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getOrgId } from "@/data/live";
import { initReservationPayment, isReservationPaid, lookupReservation, requestReservation, type ReservationPayment } from "@/lib/phoxta";
import { openPaystackPopup } from "@/lib/paystackPopup";

// Unified booking box for the stay / car / experience detail sidebars. Pricing +
// availability are enforced server-side by app_request_reservation; the booking
// lands in the operating console as 'pending'. Falls back to a simulated
// confirmation when the store isn't backend-connected (local dev / unknown host).

type Vertical = "stay" | "car" | "experience";
const CFG: Record<Vertical, { startL: string; endL: string; qtyL: string; per: string; range: boolean }> = {
  stay: { startL: "Check in", endL: "Check out", qtyL: "Rooms", per: "night", range: true },
  car: { startL: "Pick-up", endL: "Drop-off", qtyL: "Vehicles", per: "day", range: true },
  experience: { startL: "Date", endL: "", qtyL: "Guests", per: "person", range: false },
};

const todayPlus = (d: number) => {
  const t = new Date();
  t.setDate(t.getDate() + d);
  return t.toISOString().slice(0, 10);
};

export default function ReserveBox({ listing, vertical }: { listing: any; vertical: Vertical }) {
  const cfg = CFG[vertical];
  const rate = useMemo(() => parseFloat(String(listing?.price ?? "").replace(/[^0-9.]/g, "")) || 0, [listing]);
  const [start, setStart] = useState(todayPlus(2));
  const [end, setEnd] = useState(todayPlus(cfg.range ? 4 : 3));
  const [qty, setQty] = useState(1);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [confirmed, setConfirmed] = useState<string | null>(null);
  // Payment-enabled path: pending until the reservation lookup verifies payment.
  const [payment, setPayment] = useState<ReservationPayment | null>(null);
  const [paid, setPaid] = useState(false);
  const [pollExpired, setPollExpired] = useState(false);
  const checkingRef = useRef(false);
  const autoOpenedRef = useRef(false);

  const nights = useMemo(() => {
    if (!cfg.range) return 1;
    const n = Math.round((new Date(end).getTime() - new Date(start).getTime()) / 86400000);
    return n > 0 ? n : 0;
  }, [start, end, cfg.range]);
  const total = (cfg.range ? nights : 1) * qty * rate;

  async function reserve() {
    setError("");
    if (cfg.range && nights < 1) { setError(`${cfg.endL} must be after ${cfg.startL.toLowerCase()}.`); return; }
    if (!name.trim() || !email.trim()) { setError("Enter your name and email."); return; }
    setBusy(true);
    try {
      const orgId = getOrgId();
      // single-day verticals occupy [start, start+1)
      const endDate = cfg.range ? end : (() => { const d = new Date(start); d.setDate(d.getDate() + 1); return d.toISOString().slice(0, 10); })();
      if (!orgId) {
        setConfirmed("demo-" + Math.random().toString(36).slice(2, 10));
      } else {
        const id = await requestReservation(orgId, String(listing.id), name.trim(), email.trim(), start, endDate, qty);
        // Offer online payment when configured for this tenant; the booking is
        // already saved, so any failure here just keeps the pay-later flow.
        if (id) {
          const pay = await initReservationPayment(orgId, id, email.trim());
          if (pay) setPayment(pay); // pending-payment state; popup auto-opens below
        }
        setConfirmed(id);
      }
    } catch (e: any) {
      setError(e?.message || "Could not complete the booking.");
    } finally {
      setBusy(false);
    }
  }

  // Verify payment against the same guest lookup the manage-booking page uses.
  // The Paystack webhook marks the reservation paid server-side, so this works
  // even when the popup's callbacks never fire.
  const checkPaid = useCallback(async () => {
    if (checkingRef.current || paid || !confirmed) return;
    const orgId = getOrgId();
    if (!orgId) return;
    checkingRef.current = true;
    try {
      const r = await lookupReservation(orgId, confirmed, email.trim());
      if (isReservationPaid(r)) setPaid(true);
    } finally {
      checkingRef.current = false;
    }
  }, [confirmed, email, paid]);

  const openPopup = useCallback(() => {
    if (!payment) return;
    if (payment.accessCode) {
      void openPaystackPopup(payment.accessCode, payment.url, {
        onSuccess: () => { void checkPaid(); },
        onCancel: () => {},
      });
    } else {
      window.location.assign(payment.url);
    }
  }, [payment, checkPaid]);

  // Auto-open the popup as soon as the payment is initialised (once).
  useEffect(() => {
    if (payment && !autoOpenedRef.current) {
      autoOpenedRef.current = true;
      openPopup();
    }
  }, [payment, openPopup]);

  // Poll the lookup every 3s for up to 2 minutes while payment is outstanding.
  useEffect(() => {
    if (!payment || !confirmed || paid) return;
    const startedAt = Date.now();
    const timer = window.setInterval(() => {
      if (Date.now() - startedAt > 120000) {
        window.clearInterval(timer);
        setPollExpired(true);
        return;
      }
      void checkPaid();
    }, 3000);
    return () => window.clearInterval(timer);
  }, [payment, confirmed, paid, checkPaid]);

  const wrap = "listingSection__wrap rounded-2xl shadow-lg-for-card bg-card p-4 sm:p-6 2xl:p-7 flex flex-col gap-4";
  const field = "rounded-xl border border-border bg-transparent px-4 py-3 text-sm w-full";

  const when = cfg.range ? ` from ${start} to ${end}` : ` on ${start}`;

  // Payment verified — the real success state.
  if (confirmed && paid) {
    return (
      <div className={wrap}>
        <h3 className="text-xl font-semibold">Payment received — thank you!</h3>
        <p className="text-sm text-muted-foreground">
          {name ? `${name}, your` : "Your"} booking for <strong>{listing?.title || listing?.name}</strong>
          {when} ({qty} {cfg.qtyL.toLowerCase()}) is confirmed. A confirmation email is on its way to {email}.
        </p>
        <p className="text-xs text-muted-foreground">Reference: {confirmed}</p>
        <a
          href={`/manage-booking?ref=${encodeURIComponent(confirmed)}&email=${encodeURIComponent(email.trim())}`}
          className="w-full rounded-full bg-primary px-6 py-3 text-center text-sm font-medium text-primary-foreground sm:h-12 sm:leading-6"
        >
          Manage booking
        </a>
      </div>
    );
  }

  // Payment initialised but not yet verified — no thank-you until it's paid.
  if (confirmed && payment) {
    return (
      <div className={wrap}>
        <h3 className="text-xl font-semibold">Complete your payment</h3>
        <p className="text-sm text-muted-foreground">
          Your booking for <strong>{listing?.title || listing?.name}</strong>
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
            <a className="underline" href={`/manage-booking?ref=${encodeURIComponent(confirmed)}&email=${encodeURIComponent(email.trim())}`}>
              Manage booking
            </a>.
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
          Thanks {name || "there"} — your booking for <strong>{listing?.title || listing?.name}</strong>
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
        <span>{listing?.price}</span>
        <span className="ms-1 text-base font-normal text-muted-foreground">/ {cfg.per}</span>
      </div>

      <div className="flex flex-col gap-3">
        <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
          {cfg.startL}
          <input type="date" className={field} value={start} min={todayPlus(0)} onChange={(e) => setStart(e.target.value)} />
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
        <span>{cfg.range ? `${listing?.price} × ${nights} ${cfg.per}${nights === 1 ? "" : "s"} × ${qty}` : `${listing?.price} × ${qty}`}</span>
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
