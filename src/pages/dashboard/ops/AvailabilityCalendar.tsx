import { useEffect, useMemo, useState } from "react";
import { resourceAvailability, type AvailDay, type Blackout } from "@/lib/db/ops/reservations";
import type { Product } from "@/lib/db/ops/commerce";

const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const WEEK = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// Month availability calendar for one resource — visualises open / limited / full /
// blocked days at a glance (the booking backend factors stock, bookings + blackouts).
export default function AvailabilityCalendar({ products, blackouts }: { products: Product[]; blackouts: Blackout[] }) {
  const [productId, setProductId] = useState(products[0]?.id ?? "");
  const [cursor, setCursor] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });
  const [avail, setAvail] = useState<Record<string, AvailDay>>({});
  const [loading, setLoading] = useState(false);

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
      for (let d = new Date(b.start_date); d <= new Date(b.end_date); d.setDate(d.getDate() + 1)) set.add(ymd(d));
    });
    return set;
  }, [blackouts, productId]);

  const firstWeekday = (new Date(cursor.getFullYear(), cursor.getMonth(), 1).getDay() + 6) % 7; // Mon=0
  const daysInMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
  const cells: (Date | null)[] = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(cursor.getFullYear(), cursor.getMonth(), d));

  function styleFor(date: Date): { bg: string; color: string; label: string } {
    const key = ymd(date);
    if (blackoutDays.has(key)) return { bg: "#fee2e2", color: "#b91c1c", label: "Blocked" };
    const a = avail[key];
    if (!a) return { bg: "#f8fafc", color: "#64748b", label: "" };
    if (a.available <= 0) return { bg: "#fee2e2", color: "#b91c1c", label: "Full" };
    if (a.available < a.units_total) return { bg: "#fef3c7", color: "#92400e", label: `${a.available} left` };
    return { bg: "#dcfce7", color: "#166534", label: "Open" };
  }

  const Legend = ({ bg, text }: { bg: string; text: string }) => (
    <span><span style={{ display: "inline-block", width: 12, height: 12, background: bg, borderRadius: 3, marginRight: 5, verticalAlign: "middle" }} />{text}</span>
  );

  return (
    <div className="bg-neutral-0 rounded-4 p-4 border-100">
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
        <h5 className="fw-600 mb-0">Availability calendar</h5>
        <select className="form-select form-select-sm rounded-3" style={{ width: "auto", maxWidth: 240 }} value={productId} onChange={(e) => setProductId(e.target.value)}>
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
              const s = styleFor(date);
              return (
                <div key={i} style={{ background: s.bg, color: s.color, borderRadius: 8, padding: "6px 4px", minHeight: 52, textAlign: "center" }}>
                  <div className="fw-600 fz-font-md">{date.getDate()}</div>
                  <div style={{ fontSize: 10 }}>{s.label}</div>
                </div>
              );
            })}
          </div>
          <div className="d-flex gap-3 mt-3 fz-font-sm neutral-500 flex-wrap align-items-center">
            <Legend bg="#dcfce7" text="Open" /><Legend bg="#fef3c7" text="Limited" /><Legend bg="#fee2e2" text="Full / blocked" />
            {loading && <span className="ms-auto">Loading…</span>}
          </div>
        </>
      )}
    </div>
  );
}
