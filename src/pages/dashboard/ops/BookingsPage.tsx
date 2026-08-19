import { useMemo, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { useCachedData } from "@/lib/hooks/useCachedData";
import { DASHBOARD_TTL } from "@/lib/cache/dashboardQueries";
import {
  listServices,
  createService,
  updateService,
  deleteService,
  toggleService,
  listBookings,
  createBooking,
  setBookingStatus,
  notifyBookingStatus,
  type Booking,
  type BookingStatus,
} from "@/lib/db/ops/bookings";
import { toast, toastError, confirmDanger, reportMutation } from "@/lib/ops/feedback";
import { formatPrice } from "@/lib/db/marketplace";
import type { OpsContext } from "@/layouts/OperatingLayout";

const BOOKING_STYLE: Record<BookingStatus, string> = {
  pending: "bg-neutral-100 neutral-700",
  confirmed: "bg-success-subtle text-success",
  completed: "bg-neutral-100 neutral-500",
  cancelled: "bg-danger-subtle text-danger",
  no_show: "bg-danger-subtle text-danger",
};

const STATUS_LABEL: Record<BookingStatus, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  completed: "Completed",
  cancelled: "Cancelled",
  no_show: "No-show",
};

/** "12.50" -> 1250; "" -> 0; garbage/negative -> null. */
function parseMoney(s: string): number | null {
  const t = s.trim();
  if (t === "") return 0;
  const n = Number(t);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100);
}

/** "30" -> 30; garbage / non-positive -> null. */
function parseMins(s: string): number | null {
  const n = Number(s.trim());
  if (!Number.isInteger(n) || n <= 0) return null;
  return n;
}

function dayLabel(key: string): string {
  const today = new Date();
  const tomorrow = new Date(today.getTime() + 86400000);
  if (key === today.toDateString()) return "Today";
  if (key === tomorrow.toDateString()) return "Tomorrow";
  return new Date(key).toLocaleDateString([], { weekday: "long", month: "short", day: "numeric" });
}

export default function BookingsPage() {
  const { orgId, org } = useOutletContext<OpsContext>();
  const { data, loading, error: loadError, reload } = useCachedData(
    `ops:bookings:${orgId}`,
    async () => {
      const [s, b] = await Promise.all([listServices(orgId), listBookings(orgId)]);
      if (s.error) throw new Error(s.error);
      if (b.error) throw new Error(b.error);
      return { services: s.data, bookings: b.data };
    },
    { ttl: DASHBOARD_TTL },
  );
  const services = data?.services ?? [];
  const bookings = useMemo(() => data?.bookings ?? [], [data]);

  const [sForm, setSForm] = useState({ name: "", duration: "30", price: "" });
  const [editId, setEditId] = useState<string | null>(null);
  const [eForm, setEForm] = useState({ name: "", duration: "30", price: "" });
  const [bForm, setBForm] = useState({ serviceId: "", customer: "", email: "", phone: "", start: "" });
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"" | BookingStatus>("");
  const [showPast, setShowPast] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const { todayAndUpcoming, past } = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = bookings.filter((b) => {
      if (statusFilter && b.status !== statusFilter) return false;
      if (!q) return true;
      return [b.customer_name, b.customer_email, b.customer_phone, b.services?.name ?? "", b.notes]
        .some((v) => v && v.toLowerCase().includes(q));
    });
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const upcoming = filtered.filter((b) => new Date(b.start_at).getTime() >= startOfToday.getTime());
    const pastRows = filtered
      .filter((b) => new Date(b.start_at).getTime() < startOfToday.getTime())
      .sort((a, b) => new Date(b.start_at).getTime() - new Date(a.start_at).getTime());
    // Group upcoming by day, Today first then ascending (list is already start_at asc).
    const groups: { key: string; rows: Booking[] }[] = [];
    for (const b of upcoming) {
      const key = new Date(b.start_at).toDateString();
      const g = groups.find((x) => x.key === key);
      if (g) g.rows.push(b);
      else groups.push({ key, rows: [b] });
    }
    return { todayAndUpcoming: groups, past: pastRows };
  }, [bookings, search, statusFilter]);

  async function addService(e: React.FormEvent) {
    e.preventDefault();
    if (!sForm.name.trim()) return;
    const mins = parseMins(sForm.duration);
    if (mins === null) { toastError("Duration must be a whole number of minutes."); return; }
    const cents = parseMoney(sForm.price);
    if (cents === null) { toastError("Price must be a number, e.g. 25 or 25.50."); return; }
    if (await reportMutation(createService(orgId, { name: sForm.name, duration_min: mins, price_cents: cents }), "Service added")) {
      setSForm({ name: "", duration: "30", price: "" });
      reload();
    }
  }

  function startEdit(id: string, name: string, duration: number, cents: number) {
    setEditId(id);
    setEForm({ name, duration: String(duration), price: cents ? (cents / 100).toString() : "" });
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editId || !eForm.name.trim()) return;
    const mins = parseMins(eForm.duration);
    if (mins === null) { toastError("Duration must be a whole number of minutes."); return; }
    const cents = parseMoney(eForm.price);
    if (cents === null) { toastError("Price must be a number, e.g. 25 or 25.50."); return; }
    if (await reportMutation(updateService(editId, { name: eForm.name, duration_min: mins, price_cents: cents }), "Service updated")) {
      setEditId(null);
      reload();
    }
  }

  async function removeService(id: string, name: string) {
    if (!confirmDanger(`Delete "${name}"? Existing bookings keep their history, but this can't be undone.`)) return;
    if (await reportMutation(deleteService(id), "Service deleted")) reload();
  }

  async function addBooking(e: React.FormEvent) {
    e.preventDefault();
    if (!bForm.customer.trim() || !bForm.start) return;
    const ok = await reportMutation(
      createBooking(orgId, {
        service_id: bForm.serviceId || null,
        customer_name: bForm.customer,
        customer_email: bForm.email,
        customer_phone: bForm.phone,
        start_at: new Date(bForm.start).toISOString(),
      }),
      "Booking added",
    );
    if (ok) {
      setBForm({ serviceId: "", customer: "", email: "", phone: "", start: "" });
      reload();
    }
  }

  async function changeStatus(b: Booking, status: BookingStatus) {
    if (status === "cancelled" && !confirmDanger(`Cancel ${b.customer_name || "this customer"}'s booking? This can't be undone.`)) return;
    setBusyId(b.id);
    const ok = await reportMutation(setBookingStatus(b.id, status), `Marked ${STATUS_LABEL[status].toLowerCase()}`);
    if (ok) {
      reload();
      // Confirm / cancel notify the customer by email when we have an address.
      if ((status === "confirmed" || status === "cancelled") && b.customer_email) {
        const kind = status === "confirmed" ? "booking_confirmed" : "booking_cancelled";
        const { delivery, error } = await notifyBookingStatus(orgId, b.id, kind);
        if (error || delivery === "failed") toastError("Status saved, but the customer email didn't send.");
        else if (delivery === "sent") toast(`Customer emailed at ${b.customer_email}`);
      }
    }
    setBusyId(null);
  }

  function renderBooking(b: Booking) {
    const isPastDated = new Date(b.start_at).getTime() < Date.now();
    const open = b.status === "pending" || b.status === "confirmed";
    const busy = busyId === b.id;
    return (
      <div key={b.id} className="bg-neutral-0 rounded-4 p-3 border-100">
        <div className="d-flex align-items-center justify-content-between gap-2 flex-wrap">
          <div>
            <div className="fw-600">
              {b.customer_name || "Customer"}
              {b.services?.name ? ` · ${b.services.name}` : ""}
            </div>
            <div className="fz-font-sm neutral-500">
              {new Date(b.start_at).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}
              {b.customer_email ? ` · ${b.customer_email}` : ""}
              {b.customer_phone ? ` · ${b.customer_phone}` : ""}
            </div>
            {b.notes && <div className="fz-font-sm neutral-500 fst-italic">{b.notes}</div>}
          </div>
          <div className="d-flex align-items-center gap-2 flex-wrap justify-content-end">
            <span className={`badge fw-500 ${BOOKING_STYLE[b.status]}`}>{STATUS_LABEL[b.status]}</span>
            {open && isPastDated ? (
              <>
                <button type="button" className="btn btn-dark btn-sm rounded-pill px-3" disabled={busy} onClick={() => changeStatus(b, "completed")}>Completed</button>
                <button type="button" className="btn btn-outline-danger btn-sm rounded-pill px-3" disabled={busy} onClick={() => changeStatus(b, "no_show")}>No-show</button>
              </>
            ) : (
              <>
                {b.status === "pending" && <button type="button" className="btn btn-dark btn-sm rounded-pill px-3" disabled={busy} onClick={() => changeStatus(b, "confirmed")}>Confirm</button>}
                {b.status === "confirmed" && <button type="button" className="btn btn-outline-secondary btn-sm rounded-pill px-3" disabled={busy} onClick={() => changeStatus(b, "completed")}>Complete</button>}
              </>
            )}
            {open && <button type="button" className="btn btn-link btn-sm p-0 neutral-500 text-decoration-none" disabled={busy} onClick={() => changeStatus(b, "cancelled")}>Cancel</button>}
          </div>
        </div>
      </div>
    );
  }

  if (loading) return <div className="bg-neutral-0 rounded-4 p-5 border-100 text-center neutral-500">Loading…</div>;

  return (
    <div className="row g-4">
      {loadError && <div className="col-12"><div className="alert alert-danger py-2 px-3 fz-font-md mb-0">{loadError}</div></div>}

      {/* Services */}
      <div className="col-lg-5">
        <h5 className="fw-600 mb-3">Services</h5>
        <form onSubmit={addService} className="bg-neutral-0 rounded-4 p-3 border-100 mb-3">
          <div className="row g-2 align-items-end">
            <div className="col-12">
              <label className="fz-font-sm neutral-500" htmlFor="svc-name">Service name</label>
              <input id="svc-name" className="form-control rounded-3" placeholder="e.g. Haircut" value={sForm.name} onChange={(e) => setSForm({ ...sForm, name: e.target.value })} required />
            </div>
            <div className="col-5">
              <label className="fz-font-sm neutral-500" htmlFor="svc-mins">Duration (mins)</label>
              <input id="svc-mins" type="number" min={1} step={1} className="form-control rounded-3" value={sForm.duration} onChange={(e) => setSForm({ ...sForm, duration: e.target.value })} />
            </div>
            <div className="col-5">
              <label className="fz-font-sm neutral-500" htmlFor="svc-price">Price ({org.currency})</label>
              <input id="svc-price" type="number" min={0} step="0.01" className="form-control rounded-3" placeholder="0.00" value={sForm.price} onChange={(e) => setSForm({ ...sForm, price: e.target.value })} />
            </div>
            <div className="col-2"><button type="submit" className="btn btn-dark w-100 rounded-3" aria-label="Add service">+</button></div>
          </div>
        </form>
        {services.length === 0 ? (
          <div className="bg-neutral-0 rounded-4 p-4 border-100 text-center neutral-500">No services yet.</div>
        ) : (
          <div className="d-flex flex-column gap-2">
            {services.map((s) =>
              editId === s.id ? (
                <form key={s.id} onSubmit={saveEdit} className="bg-neutral-0 rounded-4 p-3 border-100">
                  <div className="row g-2 align-items-end">
                    <div className="col-12">
                      <label className="fz-font-sm neutral-500" htmlFor={`edit-name-${s.id}`}>Service name</label>
                      <input id={`edit-name-${s.id}`} className="form-control rounded-3" value={eForm.name} onChange={(e) => setEForm({ ...eForm, name: e.target.value })} required />
                    </div>
                    <div className="col-4">
                      <label className="fz-font-sm neutral-500" htmlFor={`edit-mins-${s.id}`}>Duration (mins)</label>
                      <input id={`edit-mins-${s.id}`} type="number" min={1} step={1} className="form-control rounded-3" value={eForm.duration} onChange={(e) => setEForm({ ...eForm, duration: e.target.value })} />
                    </div>
                    <div className="col-4">
                      <label className="fz-font-sm neutral-500" htmlFor={`edit-price-${s.id}`}>Price ({s.currency || org.currency})</label>
                      <input id={`edit-price-${s.id}`} type="number" min={0} step="0.01" className="form-control rounded-3" value={eForm.price} onChange={(e) => setEForm({ ...eForm, price: e.target.value })} />
                    </div>
                    <div className="col-4 d-flex gap-2">
                      <button type="submit" className="btn btn-dark btn-sm rounded-3 flex-grow-1">Save</button>
                      <button type="button" className="btn btn-outline-secondary btn-sm rounded-3" onClick={() => setEditId(null)}>Cancel</button>
                    </div>
                  </div>
                </form>
              ) : (
                <div key={s.id} className="bg-neutral-0 rounded-4 p-3 border-100 d-flex align-items-center justify-content-between gap-2">
                  <div>
                    <div className="fw-600">{s.name}</div>
                    <div className="fz-font-sm neutral-500">{s.duration_min} min · {formatPrice(s.price_cents, s.currency || org.currency)}</div>
                  </div>
                  <div className="d-flex align-items-center gap-2">
                    <button type="button" className="btn btn-link btn-sm p-0 text-decoration-none" onClick={() => startEdit(s.id, s.name, s.duration_min, s.price_cents)}>Edit</button>
                    <button type="button" className="btn btn-link btn-sm p-0 text-danger text-decoration-none" onClick={() => removeService(s.id, s.name)}>Delete</button>
                    <div className="form-check form-switch m-0">
                      <input className="form-check-input" type="checkbox" aria-label={`${s.name} active`} checked={s.active} onChange={async (e) => { if (await reportMutation(toggleService(s.id, e.target.checked), e.target.checked ? "Service activated" : "Service deactivated")) reload(); }} />
                    </div>
                  </div>
                </div>
              ),
            )}
          </div>
        )}
      </div>

      {/* Day sheet */}
      <div className="col-lg-7">
        <h5 className="fw-600 mb-3">Bookings</h5>
        <div className="bg-neutral-0 rounded-4 p-3 border-100 mb-3 fz-font-sm neutral-700">
          Reminders are sent automatically 24h before each booking once messaging automations are on —{" "}
          <Link to={`/dashboard/businesses/${orgId}/ops/marketing`} className="fw-600">set up in Marketing</Link>.
        </div>
        <form onSubmit={addBooking} className="bg-neutral-0 rounded-4 p-3 border-100 mb-3">
          <div className="row g-2">
            <div className="col-md-4"><input className="form-control rounded-3" aria-label="Customer name" placeholder="Customer name" value={bForm.customer} onChange={(e) => setBForm({ ...bForm, customer: e.target.value })} required /></div>
            <div className="col-md-4"><input type="email" className="form-control rounded-3" aria-label="Customer email" placeholder="Email (for confirmations)" value={bForm.email} onChange={(e) => setBForm({ ...bForm, email: e.target.value })} /></div>
            <div className="col-md-4"><input type="tel" className="form-control rounded-3" aria-label="Customer phone" placeholder="Phone" value={bForm.phone} onChange={(e) => setBForm({ ...bForm, phone: e.target.value })} /></div>
            <div className="col-md-4">
              <select className="form-select rounded-3" aria-label="Service" value={bForm.serviceId} onChange={(e) => setBForm({ ...bForm, serviceId: e.target.value })}>
                <option value="">Any service</option>
                {services.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div className="col-md-5"><input type="datetime-local" className="form-control rounded-3" aria-label="Start time" value={bForm.start} onChange={(e) => setBForm({ ...bForm, start: e.target.value })} required /></div>
            <div className="col-md-3"><button type="submit" className="btn btn-dark w-100 rounded-3">Add booking</button></div>
          </div>
        </form>

        <div className="d-flex gap-2 mb-3">
          <input className="form-control rounded-3" aria-label="Search bookings" placeholder="Search customer, email, phone or service…" value={search} onChange={(e) => setSearch(e.target.value)} />
          <select className="form-select rounded-3 w-auto" aria-label="Filter by status" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as "" | BookingStatus)}>
            <option value="">All statuses</option>
            {(Object.keys(STATUS_LABEL) as BookingStatus[]).map((s) => (
              <option key={s} value={s}>{STATUS_LABEL[s]}</option>
            ))}
          </select>
        </div>

        {todayAndUpcoming.length === 0 && past.length === 0 ? (
          <div className="bg-neutral-0 rounded-4 p-4 border-100 text-center neutral-500">
            {bookings.length === 0 ? "No bookings yet." : "Nothing matches that search."}
          </div>
        ) : (
          <div className="d-flex flex-column gap-3">
            {todayAndUpcoming.length === 0 && (
              <div className="bg-neutral-0 rounded-4 p-4 border-100 text-center neutral-500">Nothing coming up.</div>
            )}
            {todayAndUpcoming.map((g) => (
              <div key={g.key}>
                <div className="fz-font-sm fw-600 neutral-500 text-uppercase mb-2">{dayLabel(g.key)}</div>
                <div className="d-flex flex-column gap-2">{g.rows.map(renderBooking)}</div>
              </div>
            ))}
            {past.length > 0 && (
              <div>
                <button type="button" className="btn btn-link btn-sm p-0 neutral-500 text-decoration-none fw-600" onClick={() => setShowPast((v) => !v)}>
                  {showPast ? "Hide" : "Show"} past bookings ({past.length})
                </button>
                {showPast && <div className="d-flex flex-column gap-2 mt-2">{past.map(renderBooking)}</div>}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
