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
import { Chip, stageTone } from "@/components/dash/Ui";

const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
// Parse 'YYYY-MM-DD' as a LOCAL date — new Date("YYYY-MM-DD") is UTC midnight and
// shifts a day backwards in negative-offset timezones (the blackout off-by-one).
const parseLocal = (s: string) => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
};
const WEEK = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// Component-local presentation styles (hrx palette; bkx- prefixed).
const BKX_CAL_CSS = `
.bkx-cal-nav { width: 38px; height: 38px; }
.bkx-cal-month { font-size: 16px; font-weight: 600; letter-spacing: -0.02em; color: #272727; }
.bkx-cal-link { border: 0; background: transparent; padding: 0 2px; font-size: 13px; font-weight: 500; color: #6b7280; cursor: pointer; }
.bkx-cal-link:hover { color: #272727; text-decoration: underline; }
.bkx-cal-link.blue { color: #195ce5; }
.bkx-cal-link.blue:hover { color: #1246b0; }
/* minmax(0,1fr) — plain 1fr uses each cell's min-content width as a floor,
   which pushed the whole page sideways on a phone. */
.bkx-cal-grid { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: 4px; }
.bkx-cal-dow { min-width: 0; overflow: hidden; text-align: center; font-size: 11px; font-weight: 600; letter-spacing: 0.04em; text-transform: uppercase; color: #6b7280; padding-bottom: 2px; }
.bkx-cal-day { border: 0; border-radius: 12px; padding: 6px 2px; min-height: 52px; min-width: 0; text-align: center; cursor: pointer; background: #f9fbfc; color: #6b7280; transition: filter 0.12s ease; }
.bkx-cal-day:hover { filter: brightness(0.96); }
.bkx-cal-day .n { font-size: 15px; font-weight: 600; line-height: 1.2; }
.bkx-cal-day .lbl { font-size: 10px; line-height: 1.2; overflow: hidden; white-space: nowrap; }
.bkx-cal-day.open, .bkx-cal-sw.open { background: #e6f6ec; color: #15803d; }
.bkx-cal-day.limited, .bkx-cal-sw.limited { background: #fff0e9; color: #fe5f2b; }
.bkx-cal-day.full, .bkx-cal-sw.full { background: #fdeaea; color: #dc2626; }
.bkx-cal-day.today { box-shadow: inset 0 0 0 1px #272727; }
.bkx-cal-day.today .n { font-weight: 700; }
.bkx-cal-day.selected { box-shadow: inset 0 0 0 2px #195ce5; }
.bkx-cal-panel { background: #f9fbfc; border: 1px solid #ededed; border-radius: 16px; padding: 16px; margin-top: 14px; }
.bkx-cal-panel h3 { font-size: 15px; font-weight: 600; letter-spacing: -0.02em; margin: 0; }
.bkx-cal-panel h3 .who { color: #6b7280; font-weight: 500; }
.bkx-cal-row { display: flex; align-items: center; justify-content: space-between; gap: 8px 12px; flex-wrap: wrap; font-size: 13px; padding: 7px 0; }
.bkx-cal-row + .bkx-cal-row { border-top: 1px solid #ededed; }
.bkx-cal-legend { display: flex; gap: 8px 16px; margin-top: 14px; flex-wrap: wrap; align-items: center; font-size: 13px; color: #6b7280; }
.bkx-cal-sw { display: inline-block; width: 12px; height: 12px; border-radius: 4px; }
.bkx-cal-sub { font-size: 13px; color: #6b7280; }
`;

// Month availability calendar for one resource — visualises open / limited / full /
// blocked days at a glance (the booking backend factors stock, bookings + blackouts).
// Clicking a day opens a panel with that day's reservations + a block-date shortcut.
export default function AvailabilityCalendar({
  products,
  blackouts,
  reservations = [],
  onBlockDate,
  itemNoun = "item",
}: {
  products: Product[];
  blackouts: Blackout[];
  reservations?: Reservation[];
  onBlockDate?: (productId: string, date: string) => void;
  /** What this business calls a bookable resource ("Vehicle", "Listing", …). */
  itemNoun?: string;
}) {
  const [productId, setProductId] = useState(products[0]?.id ?? "");
  const [cursor, setCursor] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });
  const [avail, setAvail] = useState<Record<string, AvailDay>>({});
  const [loading, setLoading] = useState(false);
  const [availError, setAvailError] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  useEffect(() => {
    if (!productId && products[0]) setProductId(products[0].id);
  }, [products, productId]);

  useEffect(() => {
    setSelectedDay(null);
  }, [productId, cursor]);

  useEffect(() => {
    if (!productId) { setAvail({}); setAvailError(null); return; }
    const start = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const end = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
    setLoading(true);
    setAvailError(null);
    resourceAvailability(productId, ymd(start), ymd(end))
      .then((res) => {
        const m: Record<string, AvailDay> = {};
        res.data.forEach((r) => { m[String(r.day).slice(0, 10)] = r; });
        setAvail(m);
        setAvailError(res.error);
        setLoading(false);
      })
      // A rejection (network drop) would otherwise leave `loading` stuck on forever.
      .catch(() => {
        setAvail({});
        setAvailError("Something went wrong. Please try again.");
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

  const todayKey = ymd(new Date());
  const thisMonth = new Date();
  const offCurrentMonth = cursor.getFullYear() !== thisMonth.getFullYear() || cursor.getMonth() !== thisMonth.getMonth();

  // Availability tone (bkx-cal-day modifier). `short` is what a ~40px-wide phone
  // cell can hold; the full word shows from 576px up and is always available to
  // screen readers via aria-label/title.
  function styleFor(date: Date): { cls: string; label: string; short: string } {
    const key = ymd(date);
    if (blackoutDays.has(key)) return { cls: "full", label: "Blocked", short: "Off" };
    const a = avail[key];
    if (!a) return { cls: "", label: "", short: "" };
    if (a.available <= 0) return { cls: "full", label: "Full", short: "Full" };
    if (a.available < a.units_total) return { cls: "limited", label: `${a.available} left`, short: String(a.available) };
    return { cls: "open", label: "Open", short: "" };
  }

  const Legend = ({ cls, text }: { cls: string; text: string }) => (
    <span className="d-inline-flex align-items-center gap-1">
      <span className={`bkx-cal-sw ${cls}`} aria-hidden="true" />
      {text}
    </span>
  );

  const selectedProduct = products.find((p) => p.id === productId);

  return (
    <section className="hrx-card hrx-pad">
      <style>{BKX_CAL_CSS}</style>
      <div className="hrx-card-head">
        <h2 className="hrx-card-title">Availability calendar</h2>
        {products.length > 0 && (
          <div className="d-flex align-items-center gap-2" style={{ minWidth: 0 }}>
            <label className="bkx-cal-sub mb-0" htmlFor="cal-resource">Showing</label>
            <select
              id="cal-resource"
              className="form-select form-select-sm"
              style={{ width: "auto", maxWidth: 200 }}
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
            >
              {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
        )}
      </div>
      {products.length === 0 ? (
        <div className="bkx-cal-sub" style={{ fontSize: 14 }}>Add a {itemNoun.toLowerCase()} first.</div>
      ) : (
        <>
          <div className="d-flex align-items-center justify-content-between gap-2 mb-2">
            <button
              type="button"
              className="hrx-rbtn bkx-cal-nav ops-tap"
              aria-label="Previous month"
              onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}
            >
              ←
            </button>
            <div className="text-center" style={{ minWidth: 0 }}>
              <div className="bkx-cal-month">{cursor.toLocaleString(undefined, { month: "long", year: "numeric" })}</div>
              {offCurrentMonth && (
                <button
                  type="button"
                  className="bkx-cal-link blue"
                  onClick={() => setCursor(new Date(thisMonth.getFullYear(), thisMonth.getMonth(), 1))}
                >
                  Back to this month
                </button>
              )}
            </div>
            <button
              type="button"
              className="hrx-rbtn bkx-cal-nav ops-tap"
              aria-label="Next month"
              onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}
            >
              →
            </button>
          </div>
          <div className="bkx-cal-grid">
            {WEEK.map((d) => (
              <div key={d} className="bkx-cal-dow">
                <span className="d-sm-none" aria-hidden="true">{d.slice(0, 1)}</span>
                <span className="d-none d-sm-inline">{d}</span>
                <span className="visually-hidden d-sm-none">{d}</span>
              </div>
            ))}
            {cells.map((date, i) => {
              if (!date) return <div key={i} />;
              const key = ymd(date);
              const s = styleFor(date);
              const selected = selectedDay === key;
              const isToday = key === todayKey;
              return (
                <button
                  key={i}
                  type="button"
                  className={`bkx-cal-day${s.cls ? ` ${s.cls}` : ""}${isToday ? " today" : ""}${selected ? " selected" : ""}`}
                  title={`${key}${s.label ? ` — ${s.label}` : ""}`}
                  aria-label={`${key}${s.label ? ` — ${s.label}` : ""}${isToday ? " — today" : ""}`}
                  aria-pressed={selected}
                  onClick={() => setSelectedDay(selected ? null : key)}
                >
                  <div className="n">{date.getDate()}</div>
                  <div className="lbl">
                    <span className="d-none d-sm-inline">{s.label}</span>
                    <span className="d-sm-none">{s.short}</span>
                  </div>
                </button>
              );
            })}
          </div>
          {selectedDay && (
            <div className="bkx-cal-panel">
              <div className="d-flex align-items-start justify-content-between gap-2 mb-2">
                <h3>
                  {parseLocal(selectedDay).toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" })}
                  {selectedProduct ? <span className="who"> · {selectedProduct.name}</span> : null}
                </h3>
                <button type="button" className="bkx-cal-link ops-tap" onClick={() => setSelectedDay(null)}>Close</button>
              </div>
              {dayReservations.length === 0 ? (
                <div className="bkx-cal-sub mb-2">No reservations on this day.</div>
              ) : (
                <div className="d-flex flex-column mb-2">
                  {dayReservations.map((r) => (
                    <div key={r.id} className="bkx-cal-row">
                      <span style={{ minWidth: 0 }}>
                        <span style={{ fontWeight: 600 }}>{r.customer_name || "Guest"}</span>
                        <span style={{ color: "#6b7280" }}>
                          {isTableReservation(r)
                            ? ` · ${reservationMeta(r).time || "time TBC"} · ${r.units} guest${r.units === 1 ? "" : "s"}`
                            : ` · ${r.start_date} → ${r.end_date}${r.units > 1 ? ` · × ${r.units}` : ""}`}
                        </span>
                      </span>
                      <Chip tone={stageTone(r.status)}>{r.status}</Chip>
                    </div>
                  ))}
                </div>
              )}
              {onBlockDate && (
                <button type="button" className="hrx-pill ops-tap" onClick={() => onBlockDate(productId, selectedDay)}>
                  Block this date
                </button>
              )}
            </div>
          )}
          <div className="bkx-cal-legend">
            <Legend cls="open" text="Open" />
            <Legend cls="limited" text="Limited (number = left)" />
            <Legend cls="full" text="Full, or blocked (“Off”)" />
            {availError && (
              <span className="ms-auto" style={{ color: "#dc2626" }} role="alert">Couldn't load availability for this month</span>
            )}
            <span className={availError ? "" : "ms-auto"} role="status" aria-live="polite">{loading ? "Loading…" : ""}</span>
          </div>
        </>
      )}
    </section>
  );
}
