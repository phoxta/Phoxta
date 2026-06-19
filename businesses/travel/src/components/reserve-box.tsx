import { useMemo, useState } from "react";
import { getOrgId } from "@/data/live";
import { requestReservation } from "@/lib/phoxta";

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
        setConfirmed(id);
      }
    } catch (e: any) {
      setError(e?.message || "Could not complete the booking.");
    } finally {
      setBusy(false);
    }
  }

  const wrap = "listingSection__wrap rounded-2xl shadow-lg-for-card bg-card p-4 sm:p-6 2xl:p-7 flex flex-col gap-4";
  const field = "rounded-xl border border-border bg-transparent px-4 py-3 text-sm w-full";

  if (confirmed) {
    return (
      <div className={wrap}>
        <h3 className="text-xl font-semibold">Booking requested</h3>
        <p className="text-sm text-muted-foreground">
          Thanks {name || "there"} — your booking for <strong>{listing?.title || listing?.name}</strong>
          {cfg.range ? ` from ${start} to ${end}` : ` on ${start}`} ({qty} {cfg.qtyL.toLowerCase()}) is in.
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
