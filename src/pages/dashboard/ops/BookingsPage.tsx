import { Fragment, useMemo, useState } from "react";
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
import { Card, StatTile, Chip, Empty, InitialAvatar, stageTone } from "@/components/dash/Ui";

const STATUS_LABEL: Record<BookingStatus, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  completed: "Completed",
  cancelled: "Cancelled",
  no_show: "No-show",
};

/** stageTone doesn't know "no_show"; everything else maps straight through. */
const bookingTone = (s: BookingStatus) => (s === "no_show" ? "danger" : stageTone(s));

// Page-local presentation styles (hrx palette; bkx- prefixed).
const BKX_CSS = `
.bkx-note { background: #f9fbfc; border: 1px solid #ededed; border-radius: 16px; padding: 12px 16px; font-size: 14px; color: #6b7280; }
.bkx-note a { color: #195ce5; font-weight: 600; }
.bkx-sub { font-size: 12.5px; color: #6b7280; }
.bkx-dayhead th { font-size: 13px; font-weight: 600; letter-spacing: 0; text-transform: none; color: #272727; background: #f9fbfc; border-radius: 12px; }
.bkx-dayhead th .bkx-count { font-weight: 500; color: #6b7280; }
.bkx-actcell { display: inline-flex; align-items: center; gap: 8px; flex-wrap: wrap; justify-content: flex-end; }
.bkx-linkbtn { border: 0; background: transparent; padding: 0 4px; font-size: 13px; font-weight: 500; color: #6b7280; cursor: pointer; }
.bkx-linkbtn:hover { color: #272727; text-decoration: underline; }
.bkx-linkbtn.danger { color: #dc2626; }
.bkx-linkbtn.danger:hover { color: #dc2626; }
`;

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

  // At-a-glance numbers (derived from the already-loaded list; display only).
  const stats = useMemo(() => {
    const todayKey = new Date().toDateString();
    const open = (b: Booking) => b.status === "pending" || b.status === "confirmed";
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    return {
      today: bookings.filter((b) => open(b) && new Date(b.start_at).toDateString() === todayKey).length,
      upcoming: bookings.filter((b) => open(b) && new Date(b.start_at).getTime() >= startOfToday.getTime()).length,
      pending: bookings.filter((b) => b.status === "pending").length,
    };
  }, [bookings]);

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

  function renderBookingRow(b: Booking) {
    const isPastDated = new Date(b.start_at).getTime() < Date.now();
    const open = b.status === "pending" || b.status === "confirmed";
    const busy = busyId === b.id;
    const when = new Date(b.start_at);
    return (
      <tr key={b.id}>
        <td style={{ whiteSpace: "nowrap" }}>
          <div style={{ fontWeight: 600 }}>{when.toLocaleTimeString([], { timeStyle: "short" })}</div>
          <div className="bkx-sub">{when.toLocaleDateString([], { dateStyle: "medium" })}</div>
        </td>
        <td>
          <div style={{ fontWeight: 600 }}>{b.customer_name || "Customer"}</div>
          {b.services?.name && <div className="bkx-sub">{b.services.name}</div>}
          {b.notes && <div className="bkx-sub fst-italic">{b.notes}</div>}
        </td>
        <td>
          {b.customer_email || b.customer_phone ? (
            <>
              {b.customer_email && <div className="bkx-sub">{b.customer_email}</div>}
              {b.customer_phone && <div className="bkx-sub">{b.customer_phone}</div>}
            </>
          ) : (
            <span className="bkx-sub">—</span>
          )}
        </td>
        <td><Chip tone={bookingTone(b.status)}>{STATUS_LABEL[b.status]}</Chip></td>
        <td className="text-end">
          <span className="bkx-actcell">
            {open && isPastDated ? (
              <>
                <button type="button" className="btn btn-dark btn-sm rounded-pill px-3 ops-tap" disabled={busy} onClick={() => changeStatus(b, "completed")}>Completed</button>
                <button type="button" className="btn btn-outline-danger btn-sm rounded-pill px-3 ops-tap" disabled={busy} onClick={() => changeStatus(b, "no_show")}>No-show</button>
              </>
            ) : (
              <>
                {b.status === "pending" && <button type="button" className="btn btn-dark btn-sm rounded-pill px-3 ops-tap" disabled={busy} onClick={() => changeStatus(b, "confirmed")}>Confirm</button>}
                {b.status === "confirmed" && <button type="button" className="btn btn-outline-secondary btn-sm rounded-pill px-3 ops-tap" disabled={busy} onClick={() => changeStatus(b, "completed")}>Complete</button>}
              </>
            )}
            {open && <button type="button" className="bkx-linkbtn ops-tap" disabled={busy} onClick={() => changeStatus(b, "cancelled")}>Cancel</button>}
          </span>
        </td>
      </tr>
    );
  }

  const tableHead = (
    <thead>
      <tr>
        <th scope="col">When</th>
        <th scope="col">Customer</th>
        <th scope="col">Contact</th>
        <th scope="col">Status</th>
        <th scope="col" className="text-end">Actions</th>
      </tr>
    </thead>
  );

  if (loading && !data) {
    return (
      <Card>
        <div className="text-center py-4" style={{ color: "#6b7280" }} role="status">Loading…</div>
      </Card>
    );
  }
  // A hard load failure must never render as "No bookings yet".
  if (loadError && !data) {
    return (
      <Card>
        <div className="text-center py-4" role="alert">
          <div className="fw-semibold mb-2" style={{ color: "#dc2626" }}>Couldn't load bookings</div>
          <div className="mb-3" style={{ color: "#6b7280" }}>{loadError}</div>
          <button type="button" className="hrx-pill dark ops-tap" onClick={() => reload()}>Retry</button>
        </div>
      </Card>
    );
  }

  return (
    <div>
      <style>{BKX_CSS}</style>

      {loadError && (
        <div className="alert alert-danger py-2 px-3 mb-3 d-flex flex-wrap align-items-center justify-content-between gap-2" style={{ borderRadius: 16 }} role="alert">
          <span>{loadError}</span>
          <button type="button" className="btn btn-dark btn-sm rounded-pill px-3 ops-tap" onClick={() => reload()}>Retry</button>
        </div>
      )}

      {/* At-a-glance numbers */}
      <h2 className="visually-hidden">Summary</h2>
      <div className="hrx-statrow mb-4">
        <StatTile label="Today" value={stats.today} tone="dark" />
        <StatTile label="Upcoming" value={stats.upcoming} />
        <StatTile label="Awaiting confirmation" value={stats.pending} tone={stats.pending > 0 ? "soft" : undefined} />
        <StatTile label="Active services" value={services.filter((s) => s.active).length} />
      </div>

      <div className="row g-4">
        {/* Day sheet — the daily job, so it comes first on a phone and sits on the
            right (wider column) from lg up. */}
        <div className="col-lg-7 order-0 order-lg-1">
          <div className="bkx-note mb-3">
            Reminders are sent automatically 24h before each booking once messaging automations are on —{" "}
            <Link to={`/dashboard/businesses/${orgId}/ops/marketing`}>set up in Marketing</Link>.
          </div>

          <Card title="Add a booking" className="mb-3">
            <form onSubmit={addBooking}>
              <div className="row g-2 align-items-end">
                <div className="col-12 col-md-4">
                  <label className="hrx-field mb-0" htmlFor="bk-name"><span>Customer name</span>
                    <input id="bk-name" className="form-control" value={bForm.customer} onChange={(e) => setBForm({ ...bForm, customer: e.target.value })} required />
                  </label>
                </div>
                <div className="col-12 col-md-4">
                  <label className="hrx-field mb-0" htmlFor="bk-email"><span>Email (for confirmations)</span>
                    <input id="bk-email" type="email" className="form-control" value={bForm.email} onChange={(e) => setBForm({ ...bForm, email: e.target.value })} />
                  </label>
                </div>
                <div className="col-12 col-md-4">
                  <label className="hrx-field mb-0" htmlFor="bk-phone"><span>Phone</span>
                    <input id="bk-phone" type="tel" className="form-control" value={bForm.phone} onChange={(e) => setBForm({ ...bForm, phone: e.target.value })} />
                  </label>
                </div>
                <div className="col-12 col-md-4">
                  <label className="hrx-field mb-0" htmlFor="bk-service"><span>Service</span>
                    <select id="bk-service" className="form-select" value={bForm.serviceId} onChange={(e) => setBForm({ ...bForm, serviceId: e.target.value })}>
                      <option value="">Any service</option>
                      {services.map((s) => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </label>
                </div>
                <div className="col-12 col-md-4">
                  <label className="hrx-field mb-0" htmlFor="bk-start"><span>Date &amp; time</span>
                    <input id="bk-start" type="datetime-local" className="form-control" value={bForm.start} onChange={(e) => setBForm({ ...bForm, start: e.target.value })} required />
                  </label>
                </div>
                <div className="col-12 col-md-4"><button type="submit" className="hrx-pill dark w-100 justify-content-center ops-tap">Add booking</button></div>
              </div>
            </form>
          </Card>

          <div className="row g-2 mb-3">
            <div className="col-12 col-sm-7">
              <label className="hrx-field mb-0" htmlFor="bk-search"><span>Search</span>
                <input id="bk-search" type="search" className="form-control" placeholder="Customer, email, phone or service…" value={search} onChange={(e) => setSearch(e.target.value)} />
              </label>
            </div>
            <div className="col-12 col-sm-5">
              <label className="hrx-field mb-0" htmlFor="bk-status"><span>Status</span>
                <select id="bk-status" className="form-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as "" | BookingStatus)}>
                  <option value="">All statuses</option>
                  {(Object.keys(STATUS_LABEL) as BookingStatus[]).map((s) => (
                    <option key={s} value={s}>{STATUS_LABEL[s]}</option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          {todayAndUpcoming.length === 0 && past.length === 0 ? (
            <Empty title={bookings.length === 0 ? "No bookings yet" : "Nothing matches that search"}>
              {bookings.length === 0 ? "New bookings will appear here as they come in." : "Try a different search or status filter."}
            </Empty>
          ) : (
            <div className="d-flex flex-column gap-3">
              {todayAndUpcoming.length === 0 && (
                <Empty title="Nothing coming up">Every upcoming day is clear for now.</Empty>
              )}
              {todayAndUpcoming.length > 0 && (
                <Card title="Bookings">
                  <div className="hrx-tablewrap">
                    <table className="hrx-table">
                      {tableHead}
                      <tbody>
                        {todayAndUpcoming.map((g) => (
                          <Fragment key={g.key}>
                            <tr className="bkx-dayhead">
                              <th colSpan={5} scope="colgroup">
                                {dayLabel(g.key)}{" "}
                                <span className="bkx-count">· {g.rows.length} booking{g.rows.length === 1 ? "" : "s"}</span>
                              </th>
                            </tr>
                            {g.rows.map(renderBookingRow)}
                          </Fragment>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              )}
              {past.length > 0 && (
                <div>
                  <button
                    type="button"
                    className="hrx-pill ops-tap"
                    aria-expanded={showPast}
                    onClick={() => setShowPast((v) => !v)}
                  >
                    {showPast ? "Hide" : "Show"} past bookings ({past.length})
                  </button>
                  {showPast && (
                    <Card className="mt-2">
                      <div className="hrx-tablewrap">
                        <table className="hrx-table">
                          {tableHead}
                          <tbody>{past.map(renderBookingRow)}</tbody>
                        </table>
                      </div>
                    </Card>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Services — setup, so it drops below the day sheet on a phone. */}
        <div className="col-lg-5 order-1 order-lg-0">
          <Card title="Add a service" className="mb-3">
            <form onSubmit={addService}>
              <div className="row g-2 align-items-end">
                <div className="col-12">
                  <label className="hrx-field mb-0" htmlFor="svc-name"><span>Service name</span>
                    <input id="svc-name" className="form-control" placeholder="e.g. Haircut" value={sForm.name} onChange={(e) => setSForm({ ...sForm, name: e.target.value })} required />
                  </label>
                </div>
                <div className="col-6">
                  <label className="hrx-field mb-0" htmlFor="svc-mins"><span>Duration (mins)</span>
                    <input id="svc-mins" type="number" min={1} step={1} className="form-control" value={sForm.duration} onChange={(e) => setSForm({ ...sForm, duration: e.target.value })} />
                  </label>
                </div>
                <div className="col-6">
                  <label className="hrx-field mb-0" htmlFor="svc-price"><span>Price ({org.currency})</span>
                    <input id="svc-price" type="number" min={0} step="0.01" className="form-control" placeholder="0.00" value={sForm.price} onChange={(e) => setSForm({ ...sForm, price: e.target.value })} />
                  </label>
                </div>
                <div className="col-12"><button type="submit" className="hrx-pill dark w-100 justify-content-center ops-tap">Add service</button></div>
              </div>
            </form>
          </Card>
          {services.length === 0 ? (
            <Empty title="No services yet">Add your first service above so customers can book it.</Empty>
          ) : (
            <Card title="Services">
              <div className="d-flex flex-column">
                {services.map((s) =>
                  editId === s.id ? (
                    <form key={s.id} onSubmit={saveEdit} className="py-3" style={{ borderTop: "1px solid #ececec" }}>
                      <div className="row g-2 align-items-end">
                        <div className="col-12">
                          <label className="hrx-field mb-0" htmlFor={`edit-name-${s.id}`}><span>Service name</span>
                            <input id={`edit-name-${s.id}`} className="form-control" value={eForm.name} onChange={(e) => setEForm({ ...eForm, name: e.target.value })} required />
                          </label>
                        </div>
                        <div className="col-6">
                          <label className="hrx-field mb-0" htmlFor={`edit-mins-${s.id}`}><span>Duration (mins)</span>
                            <input id={`edit-mins-${s.id}`} type="number" min={1} step={1} className="form-control" value={eForm.duration} onChange={(e) => setEForm({ ...eForm, duration: e.target.value })} />
                          </label>
                        </div>
                        <div className="col-6">
                          <label className="hrx-field mb-0" htmlFor={`edit-price-${s.id}`}><span>Price ({s.currency || org.currency})</span>
                            <input id={`edit-price-${s.id}`} type="number" min={0} step="0.01" className="form-control" value={eForm.price} onChange={(e) => setEForm({ ...eForm, price: e.target.value })} />
                          </label>
                        </div>
                        <div className="col-12 d-flex gap-2">
                          <button type="submit" className="hrx-pill dark flex-grow-1 justify-content-center ops-tap">Save</button>
                          <button type="button" className="hrx-pill ops-tap" onClick={() => setEditId(null)}>Cancel</button>
                        </div>
                      </div>
                    </form>
                  ) : (
                    <div key={s.id} className="hrx-listrow">
                      <InitialAvatar name={s.name} />
                      <div className="main">
                        <p className="t">{s.name}</p>
                        <p className="s">{s.duration_min} min · {formatPrice(s.price_cents, s.currency || org.currency)}</p>
                      </div>
                      <div className="d-flex align-items-center gap-2 flex-shrink-0">
                        {!s.active && <Chip>Hidden</Chip>}
                        <button type="button" className="bkx-linkbtn ops-tap" aria-label={`Edit ${s.name}`} onClick={() => startEdit(s.id, s.name, s.duration_min, s.price_cents)}>Edit</button>
                        <button type="button" className="bkx-linkbtn danger ops-tap" aria-label={`Delete ${s.name}`} onClick={() => removeService(s.id, s.name)}>Delete</button>
                        <div className="form-check form-switch m-0">
                          <input
                            className="form-check-input"
                            type="checkbox"
                            aria-label={`Show ${s.name} to customers`}
                            checked={s.active}
                            onChange={async (e) => { if (await reportMutation(toggleService(s.id, e.target.checked), e.target.checked ? "Service activated" : "Service deactivated")) reload(); }}
                          />
                        </div>
                      </div>
                    </div>
                  ),
                )}
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
