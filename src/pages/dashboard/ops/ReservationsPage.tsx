import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import {
    listReservations,
    setReservationStatus,
    listBlackouts,
    createBlackout,
    removeBlackout,
    type Reservation,
    type ReservationStatus,
    type Blackout,
} from "@/lib/db/ops/reservations";
import { listProducts, type Product } from "@/lib/db/ops/commerce";
import AvailabilityCalendar from "./AvailabilityCalendar";
import { formatPrice } from "@/lib/db/marketplace";
import type { OpsContext } from "@/layouts/OperatingLayout";

const todayPlus = (d: number) => {
    const t = new Date();
    t.setDate(t.getDate() + d);
    return t.toISOString().slice(0, 10);
};

const STYLE: Record<ReservationStatus, string> = {
  pending: "bg-neutral-100 neutral-700",
  confirmed: "bg-success-subtle text-success",
  completed: "bg-neutral-100 neutral-500",
  cancelled: "bg-warning-subtle text-warning",
};

const days = (a: string, b: string) => Math.max(1, Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000));

export default function ReservationsPage() {
  const { orgId, console: cfg } = useOutletContext<OpsContext>();
  const [rows, setRows] = useState<Reservation[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [blackouts, setBlackouts] = useState<Blackout[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bForm, setBForm] = useState({ product_id: "", start_date: todayPlus(1), end_date: todayPlus(3), reason: "" });

  async function load() {
    const [r, b, p] = await Promise.all([listReservations(orgId), listBlackouts(orgId), listProducts(orgId)]);
    if (r.error) setError(r.error);
    setRows(r.data);
    setBlackouts(b.data);
    setProducts(p.data);
    setLoading(false);
  }
  useEffect(() => {
    load();
  }, [orgId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function addBlackout(e: React.FormEvent) {
    e.preventDefault();
    if (!bForm.product_id || bForm.end_date < bForm.start_date) {
      setError("Pick a resource and a valid date range.");
      return;
    }
    const { error } = await createBlackout(orgId, bForm);
    if (error) return setError(error);
    setBForm({ product_id: "", start_date: todayPlus(1), end_date: todayPlus(3), reason: "" });
    load();
  }

  if (loading) return <div className="bg-neutral-0 rounded-4 p-5 border-100 text-center neutral-500">Loading…</div>;

  const upcoming = rows.filter((r) => r.status === "pending" || r.status === "confirmed").length;
  const pending = rows.filter((r) => r.status === "pending").length;
  const revenue = rows.filter((r) => r.status !== "cancelled").reduce((s, r) => s + (r.total_cents || 0), 0);
  const unitWord = cfg.itemNoun === "Vehicle" ? "day" : "night";

  const KPI = ({ label, value }: { label: string; value: string | number }) => (
    <div className="col-6 col-md-3">
      <div className="bg-neutral-0 rounded-4 p-3 border-100 h-100">
        <div className="fz-font-sm neutral-500">{label}</div>
        <div className="fw-600 fz-4">{value}</div>
      </div>
    </div>
  );

  return (
    <div>
      {error && <div className="alert alert-warning py-2 px-3 fz-font-md">{error}</div>}

      <div className="row g-3 mb-4">
        <KPI label="Total reservations" value={rows.length} />
        <KPI label="Upcoming" value={upcoming} />
        <KPI label="Awaiting confirmation" value={pending} />
        <KPI label="Booked value" value={formatPrice(revenue, rows[0]?.currency || "USD")} />
      </div>

      <div className="mb-4"><AvailabilityCalendar products={products} blackouts={blackouts} /></div>

      <h5 className="fw-600 mb-3">Reservations</h5>
      {rows.length === 0 ? (
        <div className="bg-neutral-0 rounded-4 p-4 border-100 text-center neutral-500">
          No reservations yet. They'll appear here when customers book your {cfg.commerceLabel.toLowerCase()}.
        </div>
      ) : (
        <div className="d-flex flex-column gap-2">
          {rows.map((r) => (
            <div key={r.id} className="bg-neutral-0 rounded-4 p-3 border-100">
              <div className="d-flex align-items-center justify-content-between gap-2 flex-wrap">
                <div>
                  <div className="fw-600">
                    {r.customer_name || "Customer"} · {r.product_name}
                    {r.units > 1 && <span className="neutral-500 fw-500"> × {r.units}</span>}
                  </div>
                  <div className="fz-font-sm neutral-500">
                    {r.start_date} → {r.end_date} · {days(r.start_date, r.end_date)} {unitWord}
                    {days(r.start_date, r.end_date) === 1 ? "" : "s"} · {formatPrice(r.total_cents, r.currency)}
                    {r.customer_email ? ` · ${r.customer_email}` : ""}
                  </div>
                  {(() => {
                    const md = (r.metadata ?? {}) as { extras?: { label?: string }[]; driver?: { license?: string; age?: string } };
                    const extras = Array.isArray(md.extras) ? md.extras.map((e) => e?.label).filter(Boolean) : [];
                    const bits = [
                      extras.length ? `Extras: ${extras.join(", ")}` : "",
                      md.driver?.license ? `Licence ${md.driver.license}` : "",
                      md.driver?.age ? `Age ${md.driver.age}` : "",
                      r.notes ? `“${r.notes}”` : "",
                    ].filter(Boolean);
                    return bits.length ? <div className="fz-font-sm neutral-600 mt-1">{bits.join(" · ")}</div> : null;
                  })()}
                </div>
                <div className="d-flex align-items-center gap-2 flex-wrap justify-content-end">
                  <span className={`badge fw-500 text-capitalize ${STYLE[r.status]}`}>{r.status}</span>
                  {r.status === "pending" && (
                    <button type="button" className="btn btn-dark btn-sm rounded-pill px-3" onClick={async () => { await setReservationStatus(r.id, "confirmed"); load(); }}>Confirm</button>
                  )}
                  {r.status === "confirmed" && (
                    <button type="button" className="btn btn-outline-secondary btn-sm rounded-pill px-3" onClick={async () => { await setReservationStatus(r.id, "completed"); load(); }}>Complete</button>
                  )}
                  {(r.status === "pending" || r.status === "confirmed") && (
                    <button type="button" className="btn btn-link btn-sm p-0 neutral-500 text-decoration-none" onClick={async () => { await setReservationStatus(r.id, "cancelled"); load(); }}>Cancel</button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <h5 className="fw-600 mt-5 mb-2">Blocked dates</h5>
      <p className="fz-font-sm neutral-500 mb-3">Mark a {cfg.itemNoun.toLowerCase()} unavailable (maintenance, owner hold) — customers can't book these dates.</p>
      <form onSubmit={addBlackout} className="bg-neutral-0 rounded-4 p-3 border-100 mb-3">
        <div className="row g-2 align-items-end">
          <div className="col-md-4">
            <label className="fz-font-sm neutral-500">{cfg.itemNoun}</label>
            <select className="form-select rounded-3" value={bForm.product_id} onChange={(e) => setBForm({ ...bForm, product_id: e.target.value })}>
              <option value="">Select…</option>
              {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div className="col-md-3"><label className="fz-font-sm neutral-500">From</label><input type="date" className="form-control rounded-3" value={bForm.start_date} min={todayPlus(0)} onChange={(e) => setBForm({ ...bForm, start_date: e.target.value })} /></div>
          <div className="col-md-3"><label className="fz-font-sm neutral-500">To</label><input type="date" className="form-control rounded-3" value={bForm.end_date} min={bForm.start_date} onChange={(e) => setBForm({ ...bForm, end_date: e.target.value })} /></div>
          <div className="col-md-2"><button type="submit" className="btn btn-dark w-100 rounded-3">Block</button></div>
          <div className="col-12"><input className="form-control rounded-3" placeholder="Reason (optional)" value={bForm.reason} onChange={(e) => setBForm({ ...bForm, reason: e.target.value })} /></div>
        </div>
      </form>
      {blackouts.length === 0 ? (
        <div className="neutral-500 fz-font-md">No blocked dates.</div>
      ) : (
        <div className="d-flex flex-column gap-2">
          {blackouts.map((b) => (
            <div key={b.id} className="bg-neutral-0 rounded-4 p-3 border-100 d-flex align-items-center justify-content-between gap-2">
              <div>
                <span className="fw-600">{b.product_name}</span>
                <span className="fz-font-sm neutral-500"> · {b.start_date} → {b.end_date}{b.reason ? ` · ${b.reason}` : ""}</span>
              </div>
              <button type="button" className="btn btn-link btn-sm p-0 neutral-500 text-decoration-none" onClick={async () => { await removeBlackout(b.id); load(); }}>Remove</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
