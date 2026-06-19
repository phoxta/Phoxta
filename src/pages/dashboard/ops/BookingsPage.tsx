import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import {
  listServices,
  createService,
  toggleService,
  listBookings,
  createBooking,
  setBookingStatus,
  type Service,
  type Booking,
  type BookingStatus,
} from "@/lib/db/ops/bookings";
import { invokeAction } from "@/lib/db/ops/ai";
import { formatPrice } from "@/lib/db/marketplace";
import type { OpsContext } from "@/layouts/OperatingLayout";

const toCents = (s: string) => Math.round((parseFloat(s) || 0) * 100);

type NlBooking = { service_name: string | null; customer_name: string; start_at: string; notes: string };

const BOOKING_STYLE: Record<BookingStatus, string> = {
  pending: "bg-neutral-100 neutral-700",
  confirmed: "bg-success-subtle text-success",
  completed: "bg-neutral-100 neutral-500",
  cancelled: "bg-warning-subtle text-warning",
};

export default function BookingsPage() {
  const { orgId } = useOutletContext<OpsContext>();
  const [services, setServices] = useState<Service[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [sForm, setSForm] = useState({ name: "", duration: "30", price: "" });
  const [bForm, setBForm] = useState({ serviceId: "", customer: "", start: "" });

  const [nlText, setNlText] = useState("");
  const [nlLoading, setNlLoading] = useState(false);
  const [risks, setRisks] = useState<Record<string, number>>({});
  const [reminders, setReminders] = useState<Record<string, string>>({});
  const [aiBusy, setAiBusy] = useState<string | null>(null);

  async function load() {
    const [s, b] = await Promise.all([listServices(orgId), listBookings(orgId)]);
    if (s.error) setError(s.error);
    setServices(s.data);
    setBookings(b.data);
    setLoading(false);
  }
  useEffect(() => {
    load();
  }, [orgId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function addService(e: React.FormEvent) {
    e.preventDefault();
    if (!sForm.name.trim()) return;
    const { error } = await createService(orgId, { name: sForm.name, duration_min: parseInt(sForm.duration) || 30, price_cents: toCents(sForm.price) });
    if (error) setError(error);
    else {
      setSForm({ name: "", duration: "30", price: "" });
      load();
    }
  }

  async function addBooking(e: React.FormEvent) {
    e.preventDefault();
    if (!bForm.customer.trim() || !bForm.start) return;
    const { error } = await createBooking(orgId, {
      service_id: bForm.serviceId || null,
      customer_name: bForm.customer,
      start_at: new Date(bForm.start).toISOString(),
    });
    if (error) setError(error);
    else {
      setBForm({ serviceId: "", customer: "", start: "" });
      load();
    }
  }

  async function createFromText() {
    if (!nlText.trim()) return;
    setNlLoading(true);
    setError(null);
    const { data, error } = await invokeAction<NlBooking>(orgId, "nl_booking", { text: nlText });
    if (error || !data) {
      setNlLoading(false);
      setError(error ?? "Couldn't read that.");
      return;
    }
    const matched = data.service_name ? services.find((s) => s.name.toLowerCase() === data.service_name?.toLowerCase()) : null;
    const { error: createErr } = await createBooking(orgId, {
      service_id: matched?.id ?? null,
      customer_name: data.customer_name,
      start_at: data.start_at,
      notes: data.notes,
    });
    setNlLoading(false);
    if (createErr) setError(createErr);
    else {
      setNlText("");
      load();
    }
  }

  async function checkRisk(id: string) {
    setAiBusy(`risk-${id}`);
    const { data } = await invokeAction<{ risk: number }>(orgId, "no_show_risk", { bookingId: id });
    setAiBusy(null);
    if (data) setRisks((r) => ({ ...r, [id]: data.risk }));
  }

  async function draftReminder(id: string) {
    setAiBusy(`rem-${id}`);
    const { data } = await invokeAction<{ message: string }>(orgId, "booking_reminder", { bookingId: id });
    setAiBusy(null);
    if (data) setReminders((r) => ({ ...r, [id]: data.message }));
  }

  if (loading) return <div className="bg-neutral-0 rounded-4 p-5 border-100 text-center neutral-500">Loading…</div>;

  return (
    <div className="row g-4">
      {error && <div className="col-12"><div className="alert alert-warning py-2 px-3 fz-font-md mb-0">{error}</div></div>}

      {/* Services */}
      <div className="col-lg-5">
        <h5 className="fw-600 mb-3">Services</h5>
        <form onSubmit={addService} className="bg-neutral-0 rounded-4 p-3 border-100 mb-3">
          <div className="row g-2">
            <div className="col-12"><input className="form-control rounded-3" placeholder="Service name" value={sForm.name} onChange={(e) => setSForm({ ...sForm, name: e.target.value })} required /></div>
            <div className="col-5"><input className="form-control rounded-3" placeholder="Mins" value={sForm.duration} onChange={(e) => setSForm({ ...sForm, duration: e.target.value })} /></div>
            <div className="col-5"><input className="form-control rounded-3" placeholder="Price" value={sForm.price} onChange={(e) => setSForm({ ...sForm, price: e.target.value })} /></div>
            <div className="col-2"><button type="submit" className="btn btn-dark w-100 rounded-3">+</button></div>
          </div>
        </form>
        {services.length === 0 ? (
          <div className="bg-neutral-0 rounded-4 p-4 border-100 text-center neutral-500">No services yet.</div>
        ) : (
          <div className="d-flex flex-column gap-2">
            {services.map((s) => (
              <div key={s.id} className="bg-neutral-0 rounded-4 p-3 border-100 d-flex align-items-center justify-content-between gap-2">
                <div>
                  <div className="fw-600">{s.name}</div>
                  <div className="fz-font-sm neutral-500">{s.duration_min} min · {formatPrice(s.price_cents, s.currency)}</div>
                </div>
                <div className="form-check form-switch m-0">
                  <input className="form-check-input" type="checkbox" checked={s.active} onChange={async (e) => { await toggleService(s.id, e.target.checked); load(); }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bookings */}
      <div className="col-lg-7">
        <h5 className="fw-600 mb-3">Bookings</h5>
        <div className="bg-neutral-0 rounded-4 p-3 border-100 mb-3">
          <div className="fz-font-sm fw-600 neutral-500 mb-2">✨ Book from text</div>
          <div className="d-flex gap-2">
            <input className="form-control rounded-3" placeholder="e.g. Book a haircut for Jane next Tuesday at 2pm" value={nlText} onChange={(e) => setNlText(e.target.value)} />
            <button type="button" className="btn btn-dark rounded-3 px-3" onClick={createFromText} disabled={nlLoading}>{nlLoading ? "…" : "Book"}</button>
          </div>
        </div>
        <form onSubmit={addBooking} className="bg-neutral-0 rounded-4 p-3 border-100 mb-3">
          <div className="row g-2">
            <div className="col-md-4"><input className="form-control rounded-3" placeholder="Customer" value={bForm.customer} onChange={(e) => setBForm({ ...bForm, customer: e.target.value })} required /></div>
            <div className="col-md-4">
              <select className="form-select rounded-3" value={bForm.serviceId} onChange={(e) => setBForm({ ...bForm, serviceId: e.target.value })}>
                <option value="">Any service</option>
                {services.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div className="col-md-3"><input type="datetime-local" className="form-control rounded-3" value={bForm.start} onChange={(e) => setBForm({ ...bForm, start: e.target.value })} required /></div>
            <div className="col-md-1"><button type="submit" className="btn btn-dark w-100 rounded-3">+</button></div>
          </div>
        </form>
        {bookings.length === 0 ? (
          <div className="bg-neutral-0 rounded-4 p-4 border-100 text-center neutral-500">No bookings yet.</div>
        ) : (
          <div className="d-flex flex-column gap-2">
            {bookings.map((b) => (
              <div key={b.id} className="bg-neutral-0 rounded-4 p-3 border-100">
                <div className="d-flex align-items-center justify-content-between gap-2">
                  <div>
                    <div className="fw-600">
                      {b.customer_name || "Customer"}{b.services?.name ? ` · ${b.services.name}` : ""}
                      {risks[b.id] != null && (
                        <span className={`badge ms-2 fw-500 ${risks[b.id] >= 0.5 ? "bg-warning-subtle text-warning" : "bg-neutral-100 neutral-700"}`}>no-show {Math.round(risks[b.id] * 100)}%</span>
                      )}
                    </div>
                    <div className="fz-font-sm neutral-500">{new Date(b.start_at).toLocaleString()}</div>
                  </div>
                  <div className="d-flex align-items-center gap-2 flex-wrap justify-content-end">
                    <span className={`badge fw-500 text-capitalize ${BOOKING_STYLE[b.status]}`}>{b.status}</span>
                    <button type="button" className="btn btn-link btn-sm p-0 text-decoration-none" onClick={() => checkRisk(b.id)} disabled={aiBusy === `risk-${b.id}`}>{aiBusy === `risk-${b.id}` ? "…" : "✨ Risk"}</button>
                    <button type="button" className="btn btn-link btn-sm p-0 text-decoration-none" onClick={() => draftReminder(b.id)} disabled={aiBusy === `rem-${b.id}`}>{aiBusy === `rem-${b.id}` ? "…" : "✨ Remind"}</button>
                    {b.status === "pending" && <button type="button" className="btn btn-dark btn-sm rounded-pill px-3" onClick={async () => { await setBookingStatus(b.id, "confirmed"); load(); }}>Confirm</button>}
                    {b.status === "confirmed" && <button type="button" className="btn btn-outline-secondary btn-sm rounded-pill px-3" onClick={async () => { await setBookingStatus(b.id, "completed"); load(); }}>Complete</button>}
                    {(b.status === "pending" || b.status === "confirmed") && <button type="button" className="btn btn-link btn-sm p-0 neutral-500 text-decoration-none" onClick={async () => { await setBookingStatus(b.id, "cancelled"); load(); }}>Cancel</button>}
                  </div>
                </div>
                {reminders[b.id] && <div className="fz-font-sm neutral-700 mt-2 p-2 bg-neutral-50 rounded-3" style={{ whiteSpace: "pre-wrap" }}>✉️ {reminders[b.id]}</div>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
