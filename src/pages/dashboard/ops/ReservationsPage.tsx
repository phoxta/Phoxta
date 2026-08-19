import { useMemo, useRef, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { useCachedData } from "@/lib/hooks/useCachedData";
import { DASHBOARD_TTL } from "@/lib/cache/dashboardQueries";
import {
    listReservations,
    setReservationStatus,
    listBlackouts,
    createBlackout,
    removeBlackout,
    countOverlappingReservations,
    notifyReservationGuest,
    refundReservationPaystack,
    reservationMeta,
    isReservationPaid,
    isTableReservation,
    type Reservation,
    type ReservationStatus,
    type ReservationNotifyKind,
} from "@/lib/db/ops/reservations";
import { listProducts } from "@/lib/db/ops/commerce";
import AvailabilityCalendar from "./AvailabilityCalendar";
import { formatPrice } from "@/lib/db/marketplace";
import { toast, toastError, confirmDanger, reportMutation } from "@/lib/ops/feedback";
import type { OpsContext } from "@/layouts/OperatingLayout";

// Local (not UTC) YYYY-MM-DD — toISOString() shifts the date in non-UTC timezones.
const ymdLocal = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const todayPlus = (n: number) => {
    const t = new Date();
    t.setDate(t.getDate() + n);
    return ymdLocal(t);
};

const STYLE: Record<ReservationStatus, string> = {
  pending: "bg-neutral-100 neutral-700",
  confirmed: "bg-success-subtle text-success",
  completed: "bg-neutral-100 neutral-500",
  cancelled: "bg-danger-subtle text-danger",
};

const FILTERS: Array<{ key: ReservationStatus | "all"; label: string }> = [
  { key: "all", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "confirmed", label: "Confirmed" },
  { key: "completed", label: "Completed" },
  { key: "cancelled", label: "Cancelled" },
];

const days = (a: string, b: string) => Math.max(1, Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000));

const PaidBadge = () => <span className="badge fw-500 bg-success-subtle text-success">Paid</span>;

export default function ReservationsPage() {
  const { orgId, org, console: cfg } = useOutletContext<OpsContext>();
  const { data, loading, error: loadError, reload } = useCachedData(
    `ops:reservations:${orgId}`,
    async () => {
      const [r, b, p] = await Promise.all([listReservations(orgId), listBlackouts(orgId), listProducts(orgId)]);
      // Throw on every load failure so an error never renders as "No reservations yet".
      if (r.error) throw new Error(r.error);
      if (b.error) throw new Error(b.error);
      if (p.error) throw new Error(p.error);
      return { rows: r.data, blackouts: b.data, products: p.data };
    },
    { ttl: DASHBOARD_TTL },
  );
  const rows = useMemo(() => data?.rows ?? [], [data]);
  const products = data?.products ?? [];
  const blackouts = data?.blackouts ?? [];
  const [bForm, setBForm] = useState({ product_id: "", start_date: todayPlus(1), end_date: todayPlus(3), reason: "" });
  const [statusFilter, setStatusFilter] = useState<ReservationStatus | "all">("all");
  const [search, setSearch] = useState("");
  const [showPast, setShowPast] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const blackoutFormRef = useRef<HTMLFormElement>(null);

  const today = todayPlus(0);
  const isRestaurant =
    cfg.commerceLabel === "Menu" || /restaurant|food|cafe|dining|kitchen/.test((org.vertical ?? "").toLowerCase());
  const orgCurrency = org.currency || "USD";
  const cur = (r: Reservation) => r.currency || orgCurrency;
  const unitWord = cfg.itemNoun === "Vehicle" ? "day" : "night";

  const isActive = (r: Reservation) => r.status === "pending" || r.status === "confirmed";
  const arrivals = useMemo(
    () => rows.filter((r) => isActive(r) && r.start_date === today).sort((a, b) => (reservationMeta(a).time || "").localeCompare(reservationMeta(b).time || "")),
    [rows, today],
  );
  const departures = useMemo(() => rows.filter((r) => isActive(r) && r.end_date === today && r.start_date !== today), [rows, today]);

  // --- Mutations (all reported, destructive ones confirmed) ------------------

  async function notifyGuest(r: Reservation, kind: ReservationNotifyKind) {
    const res = await notifyReservationGuest(orgId, r.id, kind);
    if (res.error) toastError(`Guest not notified: ${res.error}`);
    else if (res.delivery === "sent") toast("Guest notified by email");
    else if (res.delivery === "no-email") toast("No guest email on file — nobody was notified", "info");
    else toastError("The guest notification failed to send.");
  }

  async function confirmReservation(r: Reservation) {
    setBusyId(r.id);
    const ok = await reportMutation(setReservationStatus(r.id, "confirmed"), "Reservation confirmed");
    setBusyId(null);
    if (!ok) return;
    reload();
    await notifyGuest(r, "reservation_confirmed");
  }

  async function completeReservation(r: Reservation, okMsg = "Reservation completed") {
    setBusyId(r.id);
    const ok = await reportMutation(setReservationStatus(r.id, "completed"), okMsg);
    setBusyId(null);
    if (ok) reload();
  }

  async function checkIn(r: Reservation) {
    setBusyId(r.id);
    const ok = await reportMutation(setReservationStatus(r.id, "confirmed"), "Checked in");
    setBusyId(null);
    if (ok) reload();
  }

  async function cancelReservation(r: Reservation) {
    const paid = isReservationPaid(r);
    const who = r.customer_name || "this guest";
    const msg = paid
      ? `This reservation is PAID (${formatPrice(r.total_cents, cur(r))}). Cancelling does NOT automatically refund ${who} — you'll be offered a Paystack refund next. Cancel it anyway?`
      : `Cancel ${who}'s reservation for ${r.product_name}? This can't be undone.`;
    if (!confirmDanger(msg)) return;
    setBusyId(r.id);
    const ok = await reportMutation(setReservationStatus(r.id, "cancelled"), "Reservation cancelled");
    setBusyId(null);
    if (!ok) return;
    reload();
    await notifyGuest(r, "reservation_cancelled");
    if (paid && confirmDanger(`Refund ${formatPrice(r.total_cents, cur(r))} to ${who} via Paystack now?`)) {
      const res = await refundReservationPaystack(orgId, r.id);
      if (res.error) toastError(`Refund failed: ${res.error}`);
      else toast(`Refunded ${formatPrice(res.refunded_cents ?? r.total_cents, cur(r))} via Paystack`);
      reload();
    }
  }

  async function addBlackout(e: React.FormEvent) {
    e.preventDefault();
    if (!bForm.product_id || !bForm.start_date || !bForm.end_date || bForm.end_date < bForm.start_date) {
      toastError("Pick a resource and a valid date range.");
      return;
    }
    const overlap = await countOverlappingReservations(orgId, bForm.product_id, bForm.start_date, bForm.end_date);
    if (overlap.error) {
      toastError(`Couldn't check for existing reservations: ${overlap.error}`);
      return;
    }
    if (
      overlap.count > 0 &&
      !confirmDanger(
        `${overlap.count} pending/confirmed reservation${overlap.count === 1 ? "" : "s"} overlap${overlap.count === 1 ? "s" : ""} these dates. Blocking won't cancel them — block anyway?`,
      )
    ) {
      return;
    }
    const ok = await reportMutation(createBlackout(orgId, bForm), "Dates blocked");
    if (!ok) return;
    setBForm({ product_id: "", start_date: todayPlus(1), end_date: todayPlus(3), reason: "" });
    reload();
  }

  async function unblock(id: string) {
    if (!confirmDanger("Unblock these dates? Customers will be able to book them again.")) return;
    const ok = await reportMutation(removeBlackout(id), "Dates unblocked");
    if (ok) reload();
  }

  function prefillBlackout(productId: string, date: string) {
    setBForm({ product_id: productId, start_date: date, end_date: date, reason: "" });
    blackoutFormRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  // --- Derived views ---------------------------------------------------------

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (!q) return true;
      return [r.customer_name, r.customer_email, r.product_name].some((v) => (v || "").toLowerCase().includes(q));
    });
  }, [rows, statusFilter, search]);
  const upcomingRows = useMemo(
    () => filtered.filter((r) => r.end_date >= today).sort((a, b) => a.start_date.localeCompare(b.start_date) || a.created_at.localeCompare(b.created_at)),
    [filtered, today],
  );
  const pastRows = useMemo(
    () => filtered.filter((r) => r.end_date < today).sort((a, b) => b.start_date.localeCompare(a.start_date)),
    [filtered, today],
  );

  if (loading && !data) return <div className="bg-neutral-0 rounded-4 p-5 border-100 text-center neutral-500">Loading…</div>;
  if (loadError && !data) {
    return (
      <div className="bg-neutral-0 rounded-4 p-5 border-100 text-center">
        <div className="text-danger fw-600 mb-2">Couldn't load reservations</div>
        <div className="fz-font-md neutral-500 mb-3">{loadError}</div>
        <button type="button" className="btn btn-dark btn-sm rounded-pill px-4" onClick={() => reload()}>Retry</button>
      </div>
    );
  }

  const upcoming = rows.filter(isActive).length;
  const pending = rows.filter((r) => r.status === "pending").length;
  const paidRows = rows.filter((r) => isReservationPaid(r) && r.status !== "cancelled");
  const paidSum = paidRows.reduce((s, r) => s + (r.total_cents || 0), 0);
  const awaitingRows = rows.filter((r) => isActive(r) && !isReservationPaid(r));
  const awaitingSum = awaitingRows.reduce((s, r) => s + (r.total_cents || 0), 0);
  const kpiCurrency = rows[0]?.currency || orgCurrency;

  const KPI = ({ label, value }: { label: string; value: string | number }) => (
    <div className="col-6 col-md-3">
      <div className="bg-neutral-0 rounded-4 p-3 border-100 h-100">
        <div className="fz-font-sm neutral-500">{label}</div>
        <div className="fw-600 fz-4">{value}</div>
      </div>
    </div>
  );

  const ManifestRow = ({ r, action }: { r: Reservation; action: "in" | "out" }) => {
    const md = reservationMeta(r);
    return (
      <div className="d-flex align-items-center justify-content-between gap-2 flex-wrap py-2">
        <div>
          <div className="fw-600 fz-font-md">
            {r.customer_name || "Guest"} <span className="neutral-500 fw-500">· {r.product_name}</span>{" "}
            {isReservationPaid(r) && <PaidBadge />}
          </div>
          <div className="fz-font-sm neutral-500">
            {isTableReservation(r)
              ? `${md.time || "Time TBC"} · ${r.units} guest${r.units === 1 ? "" : "s"}`
              : `${r.units} ${r.units === 1 ? "unit" : "units"} · ${r.start_date} → ${r.end_date}`}
            {r.notes ? ` · “${r.notes}”` : ""}
          </div>
        </div>
        {action === "in" && r.status === "pending" && (
          <button type="button" className="btn btn-dark btn-sm rounded-pill px-3" disabled={busyId === r.id} onClick={() => checkIn(r)}>Check in</button>
        )}
        {action === "in" && r.status === "confirmed" && (
          isTableReservation(r) || r.start_date === r.end_date ? (
            <button type="button" className="btn btn-outline-secondary btn-sm rounded-pill px-3" disabled={busyId === r.id} onClick={() => completeReservation(r, "Checked out")}>Check out</button>
          ) : (
            <span className="badge fw-500 bg-success-subtle text-success">Checked in</span>
          )
        )}
        {action === "out" && (
          <button type="button" className="btn btn-dark btn-sm rounded-pill px-3" disabled={busyId === r.id} onClick={() => completeReservation(r, "Checked out")}>Check out</button>
        )}
      </div>
    );
  };

  const ReservationCard = ({ r }: { r: Reservation }) => {
    const md = reservationMeta(r);
    const table = isTableReservation(r);
    return (
      <div className="bg-neutral-0 rounded-4 p-3 border-100">
        <div className="d-flex align-items-center justify-content-between gap-2 flex-wrap">
          <div>
            <div className="fw-600">
              {r.customer_name || "Customer"} · {r.product_name}
              {!table && r.units > 1 && <span className="neutral-500 fw-500"> × {r.units}</span>}{" "}
              {isReservationPaid(r) && <PaidBadge />}
            </div>
            <div className="fz-font-sm neutral-500">
              {table
                ? `${r.start_date} · Table · ${md.time || "time TBC"} · ${r.units} guest${r.units === 1 ? "" : "s"}`
                : `${r.start_date} → ${r.end_date} · ${days(r.start_date, r.end_date)} ${unitWord}${days(r.start_date, r.end_date) === 1 ? "" : "s"}`}
              {" · "}{formatPrice(r.total_cents, cur(r))}
              {r.customer_email ? ` · ${r.customer_email}` : ""}
            </div>
            {(() => {
              const extras = Array.isArray(md.extras) ? md.extras.map((e) => e?.label).filter(Boolean) : [];
              const bits = [
                extras.length ? `Extras: ${extras.join(", ")}` : "",
                md.driver?.license ? `Licence ${md.driver.license}` : "",
                md.driver?.age ? `Age ${md.driver.age}` : "",
                r.notes ? `“${r.notes}”` : "",
              ].filter(Boolean);
              return bits.length ? <div className="fz-font-sm neutral-600 mt-1">{bits.join(" · ")}</div> : null;
            })()}
            {isReservationPaid(r) && (
              <details className="fz-font-sm neutral-500 mt-1">
                <summary style={{ cursor: "pointer" }}>Payment details</summary>
                <div className="mt-1">
                  {md.payment_reference ? `Paystack ref ${md.payment_reference}` : "Paid (no reference on file)"}
                  {md.paid_at ? ` · ${String(md.paid_at).slice(0, 10)}` : ""}
                </div>
              </details>
            )}
          </div>
          <div className="d-flex align-items-center gap-2 flex-wrap justify-content-end">
            <span className={`badge fw-500 text-capitalize ${STYLE[r.status]}`}>{r.status}</span>
            {r.status === "pending" && (
              <button type="button" className="btn btn-dark btn-sm rounded-pill px-3" disabled={busyId === r.id} onClick={() => confirmReservation(r)}>Confirm</button>
            )}
            {r.status === "confirmed" && (
              <button type="button" className="btn btn-outline-secondary btn-sm rounded-pill px-3" disabled={busyId === r.id} onClick={() => completeReservation(r)}>Complete</button>
            )}
            {isActive(r) && (
              <button type="button" className="btn btn-link btn-sm p-0 neutral-500 text-decoration-none" disabled={busyId === r.id} onClick={() => cancelReservation(r)}>Cancel</button>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div>
      {loadError && <div className="alert alert-danger py-2 px-3 fz-font-md">{loadError}</div>}

      <div className="row g-3 mb-4">
        <KPI label="Upcoming" value={upcoming} />
        <KPI label="Awaiting confirmation" value={pending} />
        <KPI label="Paid" value={formatPrice(paidSum, paidRows[0]?.currency || kpiCurrency)} />
        <KPI label="Awaiting payment" value={formatPrice(awaitingSum, awaitingRows[0]?.currency || kpiCurrency)} />
      </div>

      {/* Today manifest */}
      <div className="bg-neutral-0 rounded-4 p-4 border-100 mb-4">
        {isRestaurant ? (
          <>
            <h5 className="fw-600 mb-2">Tonight's tables</h5>
            {arrivals.length === 0 ? (
              <div className="fz-font-md neutral-500">No tables reserved for today.</div>
            ) : (
              <div className="d-flex flex-column">{arrivals.map((r) => <ManifestRow key={r.id} r={r} action="in" />)}</div>
            )}
          </>
        ) : (
          <div className="row g-4">
            <div className="col-md-6">
              <h5 className="fw-600 mb-2">Arrivals today</h5>
              {arrivals.length === 0 ? (
                <div className="fz-font-md neutral-500">No arrivals today.</div>
              ) : (
                <div className="d-flex flex-column">{arrivals.map((r) => <ManifestRow key={r.id} r={r} action="in" />)}</div>
              )}
            </div>
            <div className="col-md-6">
              <h5 className="fw-600 mb-2">Departures today</h5>
              {departures.length === 0 ? (
                <div className="fz-font-md neutral-500">No departures today.</div>
              ) : (
                <div className="d-flex flex-column">{departures.map((r) => <ManifestRow key={r.id} r={r} action="out" />)}</div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Availability calendar — not for restaurants (tables don't use date-range stock) */}
      {!isRestaurant && (
        <div className="mb-4">
          <AvailabilityCalendar products={products} blackouts={blackouts} reservations={rows} onBlockDate={prefillBlackout} />
        </div>
      )}

      <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
        <h5 className="fw-600 mb-0">Reservations</h5>
        <div className="d-flex flex-wrap align-items-center gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              className={`btn btn-sm rounded-pill px-3 ${statusFilter === f.key ? "btn-dark" : "btn-outline-secondary"}`}
              onClick={() => setStatusFilter(f.key)}
            >
              {f.label}
            </button>
          ))}
          <input
            type="search"
            className="form-control form-control-sm rounded-3"
            style={{ width: 180 }}
            placeholder="Search guests…"
            aria-label="Search guests"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="bg-neutral-0 rounded-4 p-4 border-100 text-center neutral-500">
          No reservations yet. They'll appear here when customers book your {cfg.commerceLabel.toLowerCase()}.
        </div>
      ) : upcomingRows.length === 0 && pastRows.length === 0 ? (
        <div className="bg-neutral-0 rounded-4 p-4 border-100 text-center neutral-500">No reservations match this filter.</div>
      ) : (
        <>
          {upcomingRows.length === 0 ? (
            <div className="bg-neutral-0 rounded-4 p-4 border-100 text-center neutral-500">No upcoming reservations match this filter.</div>
          ) : (
            <div className="d-flex flex-column gap-2">{upcomingRows.map((r) => <ReservationCard key={r.id} r={r} />)}</div>
          )}
          {pastRows.length > 0 && (
            <div className="mt-3">
              <button type="button" className="btn btn-link btn-sm p-0 neutral-500 text-decoration-none" onClick={() => setShowPast(!showPast)}>
                {showPast ? "Hide" : "Show"} {pastRows.length} past reservation{pastRows.length === 1 ? "" : "s"}
              </button>
              {showPast && <div className="d-flex flex-column gap-2 mt-2">{pastRows.map((r) => <ReservationCard key={r.id} r={r} />)}</div>}
            </div>
          )}
        </>
      )}

      {/* Blocked dates — not for restaurants (blackouts act on date-range resources) */}
      {!isRestaurant && (
        <>
          <h5 className="fw-600 mt-5 mb-2">Blocked dates</h5>
          <p className="fz-font-sm neutral-500 mb-3">Mark a {cfg.itemNoun.toLowerCase()} unavailable (maintenance, owner hold) — customers can't book these dates.</p>
          <form ref={blackoutFormRef} onSubmit={addBlackout} className="bg-neutral-0 rounded-4 p-3 border-100 mb-3">
            <div className="row g-2 align-items-end">
              <div className="col-md-4">
                <label className="fz-font-sm neutral-500" htmlFor="blk-product">{cfg.itemNoun}</label>
                <select id="blk-product" className="form-select rounded-3" value={bForm.product_id} onChange={(e) => setBForm({ ...bForm, product_id: e.target.value })}>
                  <option value="">Select…</option>
                  {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div className="col-md-3">
                <label className="fz-font-sm neutral-500" htmlFor="blk-from">From</label>
                <input id="blk-from" type="date" className="form-control rounded-3" value={bForm.start_date} min={todayPlus(0)} onChange={(e) => setBForm({ ...bForm, start_date: e.target.value })} />
              </div>
              <div className="col-md-3">
                <label className="fz-font-sm neutral-500" htmlFor="blk-to">To</label>
                <input id="blk-to" type="date" className="form-control rounded-3" value={bForm.end_date} min={bForm.start_date} onChange={(e) => setBForm({ ...bForm, end_date: e.target.value })} />
              </div>
              <div className="col-md-2"><button type="submit" className="btn btn-dark w-100 rounded-3">Block</button></div>
              <div className="col-12">
                <input className="form-control rounded-3" placeholder="Reason (optional)" aria-label="Reason (optional)" value={bForm.reason} onChange={(e) => setBForm({ ...bForm, reason: e.target.value })} />
              </div>
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
                  <button type="button" className="btn btn-link btn-sm p-0 neutral-500 text-decoration-none" onClick={() => unblock(b.id)}>Remove</button>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
