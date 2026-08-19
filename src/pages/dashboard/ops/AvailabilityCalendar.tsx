import { useEffect, useMemo, useState } from "react";
import {
  resourceAvailability,
  reservationMeta,
  isTableReservation,
  type AvailDay,
  type Blackout,
  type Reservation,
} from "@/lib/db/ops/reservations";
import type { Product } from "@/lib/db/ops/commerce";

const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
// Parse 'YYYY-MM-DD' as a LOCAL date — new Date("YYYY-MM-DD") is UTC midnight and
// shifts a day backwards in negative-offset timezones (the blackout off-by-one).
const parseLocal = (s: string) => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
};
const WEEK = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const STATUS_BADGE: Record<Reservation["status"], string> = {
  pending: "bg-neutral-100 neutral-700",
  confirmed: "bg-success-subtle text-success",
  completed: "bg-neutral-100 neutral-500",
  cancelled: "bg-danger-subtle text-danger",
};

// Month availability calendar for one resource — visualises open / limited / full /
// blocked days at a glance (the booking backend factors stock, bookings + blackouts).
// Clicking a day opens a panel with that day's reservations + a block-date shortcut.
export default function AvailabilityCalendar({
  products,
  blackouts,
  reservations = [],
  onBlockDate,
}: {
  products: Product[];
  blackouts: Blackout[];
  reservations?: Reservation[];
  onBlockDate?: (productId: string, date: string) => void;
}) {
  const [productId, setProductId] = useState(products[0]?.id ?? "");
  const [cursor, setCursor] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });
  const [avail, setAvail] = useState<Record<string, AvailDay>>({});
  const [loading, setLoading] = useState(false);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  useEffect(() => {
    if (!productId && products[0]) setProductId(products[0].id);
  }, [products, productId]);

  useEffect(() => {
    setSelectedDay(null);
  }, [productId, cursor]);

  useEffect(() => {
    if (!productId) { setAvail({}); return; }
    const start = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const end = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
    setLoading(true);
    resourceAvailability(productId, ymd(start), ymd(end)).then((rows) => {
      const m: Record<string, AvailDay> = {};
      rows.forEach((r) => { m[String(r.day).slice(0, 10)] = r; });
      setAvail(m);
      setLoading(false);
    });
  }, [productId, cursor]);

  const blackoutDays = useMemo(() => {
    const set = new Set<string>();
    blackouts.filter((b) => b.product_id === productId).forEach((b) => {
      for (let d = parseLocal(b.start_date); d <= parseLocal(b.end_date); d.setDate(d.getDate() + 1)) set.add(ymd(d));
    });
    return set;
  }, [blackouts, productId]);

  const dayReservations = useMemo(() => {
    if (!selectedDay) return [];
    return reservations.filter(
      (r) => r.product_id === productId && r.status !== "cancelled" && r.start_date <= selectedDay && selectedDay <= r.end_date,
    );
  }, [reservations, productId, selectedDay]);

  const firstWeekday = (new Date(cursor.getFullYear(), cursor.getMonth(), 1).getDay() + 6) % 7; // Mon=0
  const daysInMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
  const cells: (Date | null)[] = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(cursor.getFullYear(), cursor.getMonth(), d));

  // Theme classes (same palette the console status badges use) so days stay
  // legible on light and dark backgrounds — no hardcoded hex.
  function styleFor(date: Date): { cls: string; label: string } {
    const key = ymd(date);
    if (blackoutDays.has(key)) return { cls: "bg-danger-subtle text-danger", label: "Blocked" };
    const a = avail[key];
    if (!a) return { cls: "bg-neutral-100 neutral-500", label: "" };
    if (a.available <= 0) return { cls: "bg-danger-subtle text-danger", label: "Full" };
    if (a.available < a.units_total) return { cls: "bg-warning-subtle text-warning", label: `${a.available} left` };
    return { cls: "bg-success-subtle text-success", label: "Open" };
  }

  const Legend = ({ cls, text }: { cls: string; text: string }) => (
    <span className="d-inline-flex align-items-center gap-1">
      <span className={`rounded-1 ${cls}`} style={{ display: "inline-block", width: 12, height: 12 }} />
      {text}
    </span>
  );

  const selectedProduct = products.find((p) => p.id === productId);

  return (
    <div className="bg-neutral-0 rounded-4 p-4 border-100">
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
        <h5 className="fw-600 mb-0">Availability calendar</h5>
        <select
          className="form-select form-select-sm rounded-3"
          style={{ width: "auto", maxWidth: 240 }}
          value={productId}
          aria-label="Resource"
          onChange={(e) => setProductId(e.target.value)}
        >
          {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>
      {products.length === 0 ? (
        <div className="neutral-500 fz-font-md">Add a resource first.</div>
      ) : (
        <>
          <div className="d-flex align-items-center justify-content-between mb-2">
            <button type="button" className="btn btn-link btn-sm p-0 text-decoration-none neutral-700" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}>← Prev</button>
            <strong>{cursor.toLocaleString(undefined, { month: "long", year: "numeric" })}</strong>
            <button type="button" className="btn btn-link btn-sm p-0 text-decoration-none neutral-700" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}>Next →</button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 4 }}>
            {WEEK.map((d) => <div key={d} className="fz-font-sm neutral-500 text-center fw-600">{d}</div>)}
            {cells.map((date, i) => {
              if (!date) return <div key={i} />;
              const key = ymd(date);
              const s = styleFor(date);
              const selected = selectedDay === key;
              return (
                <button
                  key={i}
                  type="button"
                  className={`border-0 rounded-3 ${s.cls}`}
                  style={{ padding: "6px 4px", minHeight: 52, textAlign: "center", cursor: "pointer", boxShadow: selected ? "inset 0 0 0 2px currentColor" : undefined }}
                  aria-label={`${key}${s.label ? ` — ${s.label}` : ""}`}
                  aria-pressed={selected}
                  onClick={() => setSelectedDay(selected ? null : key)}
                >
                  <div className="fw-600 fz-font-md">{date.getDate()}</div>
                  <div style={{ fontSize: 10 }}>{s.label}</div>
                </button>
              );
            })}
          </div>
          {selectedDay && (
            <div className="bg-neutral-100 rounded-3 p-3 mt-3">
              <div className="d-flex align-items-center justify-content-between gap-2 mb-2">
                <div className="fw-600 fz-font-md">
                  {parseLocal(selectedDay).toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" })}
                  {selectedProduct ? <span className="neutral-500 fw-500"> · {selectedProduct.name}</span> : null}
                </div>
                <button type="button" className="btn btn-link btn-sm p-0 neutral-500 text-decoration-none" onClick={() => setSelectedDay(null)}>Close</button>
              </div>
              {dayReservations.length === 0 ? (
                <div className="fz-font-sm neutral-500 mb-2">No reservations on this day.</div>
              ) : (
                <div className="d-flex flex-column gap-1 mb-2">
                  {dayReservations.map((r) => (
                    <div key={r.id} className="d-flex align-items-center justify-content-between gap-2 fz-font-sm">
                      <span>
                        <span className="fw-600">{r.customer_name || "Guest"}</span>
                        <span className="neutral-500">
                          {isTableReservation(r)
                            ? ` · ${reservationMeta(r).time || "time TBC"} · ${r.units} guest${r.units === 1 ? "" : "s"}`
                            : ` · ${r.start_date} → ${r.end_date}${r.units > 1 ? ` · × ${r.units}` : ""}`}
                        </span>
                      </span>
                      <span className={`badge fw-500 text-capitalize ${STATUS_BADGE[r.status]}`}>{r.status}</span>
                    </div>
                  ))}
                </div>
              )}
              {onBlockDate && (
                <button type="button" className="btn btn-outline-secondary btn-sm rounded-pill px-3" onClick={() => onBlockDate(productId, selectedDay)}>
                  Block this date
                </button>
              )}
            </div>
          )}
          <div className="d-flex gap-3 mt-3 fz-font-sm neutral-500 flex-wrap align-items-center">
            <Legend cls="bg-success-subtle" text="Open" />
            <Legend cls="bg-warning-subtle" text="Limited" />
            <Legend cls="bg-danger-subtle" text="Full / blocked" />
            {loading && <span className="ms-auto">Loading…</span>}
          </div>
        </>
      )}
    </div>
  );
}
