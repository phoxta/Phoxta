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
import { Card, StatTile, Chip, Empty, InitialAvatar, stageTone } from "@/components/dash/Ui";

// Local (not UTC) YYYY-MM-DD — toISOString() shifts the date in non-UTC timezones.
const ymdLocal = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const todayPlus = (n: number) => {
    const t = new Date();
    t.setDate(t.getDate() + n);
    return ymdLocal(t);
};

const FILTERS: Array<{ key: ReservationStatus | "all"; label: string }> = [
  { key: "all", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "confirmed", label: "Confirmed" },
  { key: "completed", label: "Completed" },
  { key: "cancelled", label: "Cancelled" },
];

const days = (a: string, b: string) => Math.max(1, Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000));

// Page-local presentation styles (hrx palette; bkx- prefixed).
const BKX_CSS = `
.bkx-sub { font-size: 12.5px; color: #6b7280; }
.bkx-sub summary { cursor: pointer; }
.bkx-linkbtn { border: 0; background: transparent; padding: 0 4px; font-size: 13px; font-weight: 500; color: #6b7280; cursor: pointer; }
.bkx-linkbtn:hover { color: #272727; text-decoration: underline; }
.bkx-actcell { display: inline-flex; align-items: center; gap: 8px; flex-wrap: wrap; justify-content: flex-end; }
`;

const PaidBadge = () => <Chip tone="ok">Paid</Chip>;

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
  const orgCurrency = org.currency || "GBP";
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
      toastError(`Pick a ${cfg.itemNoun.toLowerCase()} and a valid date range.`);
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

  if (loading && !data) {
    return (
      <Card>
        <div className="text-center py-4" style={{ color: "#6b7280" }} role="status">Loading…</div>
      </Card>
    );
  }
  if (loadError && !data) {
    return (
      <Card>
        <div className="text-center py-4" role="alert">
          <div className="fw-semibold mb-2" style={{ color: "#dc2626" }}>Couldn't load reservations</div>
          <div className="mb-3" style={{ color: "#6b7280" }}>{loadError}</div>
          <button type="button" className="hrx-pill dark ops-tap" onClick={() => reload()}>Retry</button>
        </div>
      </Card>
    );
  }

  const upcoming = rows.filter(isActive).length;
  const pending = rows.filter((r) => r.status === "pending").length;
  const paidRows = rows.filter((r) => isReservationPaid(r) && r.status !== "cancelled");
  const paidSum = paidRows.reduce((s, r) => s + (r.total_cents || 0), 0);
  const awaitingRows = rows.filter((r) => isActive(r) && !isReservationPaid(r));
  const awaitingSum = awaitingRows.reduce((s, r) => s + (r.total_cents || 0), 0);
  const kpiCurrency = rows[0]?.currency || orgCurrency;

  const todayLabel = new Date().toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" });

  const ManifestRow = ({ r, action }: { r: Reservation; action: "in" | "out" }) => {
    const md = reservationMeta(r);
    // r.units is HOW MANY resources are booked; the span is a separate count of
    // nights/days. Both use this business's own vocabulary, same as ReservationRow.
    const noun = cfg.itemNoun.toLowerCase();
    const span = days(r.start_date, r.end_date);
    return (
      <div className="hrx-listrow">
        <InitialAvatar name={r.customer_name || "Guest"} />
        <div className="main">
          <p className="t">
            {r.customer_name || "Guest"}
            {/* Table reservations have no product — don't render a bare "· —". */}
            {!isTableReservation(r) && r.product_name && <span style={{ color: "#6b7280", fontWeight: 500 }}> · {r.product_name}</span>}
          </p>
          <p className="s">
            {isTableReservation(r)
              ? `${md.time || "Time TBC"} · ${r.units} guest${r.units === 1 ? "" : "s"}`
              : `${r.units} ${noun}${r.units === 1 ? "" : "s"} · ${span} ${unitWord}${span === 1 ? "" : "s"} · ${r.start_date} → ${r.end_date}`}
            {/* The table RPC echoes time + party into notes; don't print it twice. */}
            {r.notes && !(isTableReservation(r) && md.time && r.notes.includes(md.time)) ? ` · “${r.notes}”` : ""}
          </p>
        </div>
        <div className="d-flex align-items-center gap-2 flex-shrink-0 flex-wrap justify-content-end">
          {isReservationPaid(r) && <PaidBadge />}
          {action === "in" && r.status === "pending" && (
            <button type="button" className="hrx-pill dark ops-tap" disabled={busyId === r.id} onClick={() => checkIn(r)}>Check in</button>
          )}
          {action === "in" && r.status === "confirmed" && (
            isTableReservation(r) || r.start_date === r.end_date ? (
              <button type="button" className="hrx-pill ops-tap" disabled={busyId === r.id} onClick={() => completeReservation(r, "Checked out")}>Check out</button>
            ) : (
              <Chip tone="ok">Checked in</Chip>
            )
          )}
          {action === "out" && (
            <button type="button" className="hrx-pill dark ops-tap" disabled={busyId === r.id} onClick={() => completeReservation(r, "Checked out")}>Check out</button>
          )}
        </div>
      </div>
    );
  };

  const ManifestList = ({ items, action, empty }: { items: Reservation[]; action: "in" | "out"; empty: string }) =>
    items.length === 0 ? (
      <div style={{ color: "#6b7280", fontSize: 14 }}>{empty}</div>
    ) : (
      <div className="d-flex flex-column">
        {items.map((r) => <ManifestRow key={r.id} r={r} action={action} />)}
      </div>
    );

  const ReservationRow = ({ r }: { r: Reservation }) => {
    const md = reservationMeta(r);
    const table = isTableReservation(r);
    const span = days(r.start_date, r.end_date);
    const extras = Array.isArray(md.extras) ? md.extras.map((e) => e?.label).filter(Boolean) : [];
    const bits = [
      extras.length ? `Extras: ${extras.join(", ")}` : "",
      md.driver?.license ? `Licence ${md.driver.license}` : "",
      md.driver?.age ? `Age ${md.driver.age}` : "",
      r.notes && !(table && md.time && r.notes.includes(md.time)) ? `“${r.notes}”` : "",
    ].filter(Boolean);
    return (
      <tr>
        <td>
          <div style={{ fontWeight: 600 }}>
            {r.customer_name || "Customer"}{" "}
            {isReservationPaid(r) && <PaidBadge />}
          </div>
          {r.customer_email && <div className="bkx-sub">{r.customer_email}</div>}
        </td>
        <td>
          <div>
            {table
              ? `Table · ${md.time || "time TBC"} · ${r.units} guest${r.units === 1 ? "" : "s"}`
              : <>{r.product_name}{r.units > 1 && <span style={{ color: "#6b7280" }}> × {r.units}</span>}</>}
          </div>
          <div className="bkx-sub">
            {table
              ? r.start_date
              : `${r.start_date} → ${r.end_date} · ${span} ${unitWord}${span === 1 ? "" : "s"}`}
          </div>
          {bits.length > 0 && <div className="bkx-sub">{bits.join(" · ")}</div>}
          {isReservationPaid(r) && (
            <details className="bkx-sub">
              <summary>Payment details</summary>
              <div className="mt-1">
                {md.payment_reference ? `Paystack ref ${md.payment_reference}` : "Paid (no reference on file)"}
                {md.paid_at ? ` · ${String(md.paid_at).slice(0, 10)}` : ""}
              </div>
            </details>
          )}
        </td>
        <td style={{ whiteSpace: "nowrap", fontWeight: 600 }}>{formatPrice(r.total_cents, cur(r))}</td>
        <td><Chip tone={stageTone(r.status)}>{r.status}</Chip></td>
        <td className="text-end">
          <span className="bkx-actcell">
            {r.status === "pending" && (
              <button type="button" className="btn btn-dark btn-sm rounded-pill px-3 ops-tap" disabled={busyId === r.id} onClick={() => confirmReservation(r)}>Confirm</button>
            )}
            {r.status === "confirmed" && (
              <button type="button" className="btn btn-outline-secondary btn-sm rounded-pill px-3 ops-tap" disabled={busyId === r.id} onClick={() => completeReservation(r)}>Complete</button>
            )}
            {isActive(r) && (
              <button type="button" className="bkx-linkbtn ops-tap" disabled={busyId === r.id} onClick={() => cancelReservation(r)}>Cancel</button>
            )}
          </span>
        </td>
      </tr>
    );
  };

  const reservationsHead = (
    <thead>
      <tr>
        <th scope="col">Guest</th>
        <th scope="col">Reservation</th>
        <th scope="col">Total</th>
        <th scope="col">Status</th>
        <th scope="col" className="text-end">Actions</th>
      </tr>
    </thead>
  );

  return (
    <div>
      <style>{BKX_CSS}</style>
      {loadError && <div className="alert alert-danger py-2 px-3" style={{ borderRadius: 16 }} role="alert">{loadError}</div>}

      {/* 1 — Today's manifest. The daily surface, so it leads the page and gets the
          biggest card, the largest names and full-size check-in/out buttons. */}
      <section aria-labelledby="today-heading" className="mb-4">
        <Card
          title={<span id="today-heading">{isRestaurant ? "Tonight's tables" : "Today"}</span>}
          right={<span className="bkx-sub">{todayLabel}</span>}
        >
          {isRestaurant ? (
            <ManifestList items={arrivals} action="in" empty="No tables reserved for today." />
          ) : (
            <div className="row g-3 g-md-4">
              <div className="col-md-6">
                <h3 className="text-uppercase" style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.04em", color: "#6b7280" }}>Arriving ({arrivals.length})</h3>
                <ManifestList items={arrivals} action="in" empty="No arrivals today." />
              </div>
              <div className="col-md-6">
                <h3 className="text-uppercase" style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.04em", color: "#6b7280" }}>Leaving ({departures.length})</h3>
                <ManifestList items={departures} action="out" empty="No departures today." />
              </div>
            </div>
          )}
        </Card>
      </section>

      {/* 2 — At-a-glance numbers */}
      <h2 className="visually-hidden">Summary</h2>
      <div className="hrx-statrow mb-4">
        <StatTile label="Upcoming" value={upcoming} tone="dark" />
        <StatTile label="Awaiting confirmation" value={pending} tone={pending > 0 ? "soft" : undefined} />
        <StatTile label="Paid" value={formatPrice(paidSum, paidRows[0]?.currency || kpiCurrency)} tone="blue" />
        <StatTile label="Awaiting payment" value={formatPrice(awaitingSum, awaitingRows[0]?.currency || kpiCurrency)} />
      </div>

      {/* 3 — Availability: the calendar and the blocked-dates form are two halves of
          one job, so they sit together (the calendar's "Block this date" fills the
          form just below it). Not for restaurants — tables don't use date-range stock. */}
      {!isRestaurant && (
        <>
          <div className="mb-4">
            <AvailabilityCalendar products={products} blackouts={blackouts} reservations={rows} onBlockDate={prefillBlackout} itemNoun={cfg.itemNoun} />
          </div>

          <Card title="Blocked dates" className="mb-4">
            <p className="bkx-sub" style={{ fontSize: 14, marginTop: -8 }}>
              Mark a {cfg.itemNoun.toLowerCase()} unavailable (maintenance, owner hold) — customers can't book these dates.
            </p>
            <form ref={blackoutFormRef} onSubmit={addBlackout} className="mb-3">
              <div className="row g-2 align-items-end">
                <div className="col-12 col-md-4">
                  <label className="hrx-field mb-0" htmlFor="blk-product"><span>{cfg.itemNoun}</span>
                    <select id="blk-product" className="form-select" value={bForm.product_id} onChange={(e) => setBForm({ ...bForm, product_id: e.target.value })}>
                      <option value="">Select…</option>
                      {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </label>
                </div>
                <div className="col-6 col-md-4">
                  <label className="hrx-field mb-0" htmlFor="blk-from"><span>From</span>
                    <input id="blk-from" type="date" className="form-control" value={bForm.start_date} min={todayPlus(0)} onChange={(e) => setBForm({ ...bForm, start_date: e.target.value })} />
                  </label>
                </div>
                <div className="col-6 col-md-4">
                  <label className="hrx-field mb-0" htmlFor="blk-to"><span>To</span>
                    <input id="blk-to" type="date" className="form-control" value={bForm.end_date} min={bForm.start_date} onChange={(e) => setBForm({ ...bForm, end_date: e.target.value })} />
                  </label>
                </div>
                <div className="col-12 col-md-8">
                  <label className="hrx-field mb-0" htmlFor="blk-reason"><span>Reason (optional)</span>
                    <input id="blk-reason" className="form-control" placeholder="e.g. servicing" value={bForm.reason} onChange={(e) => setBForm({ ...bForm, reason: e.target.value })} />
                  </label>
                </div>
                <div className="col-12 col-md-4"><button type="submit" className="hrx-pill dark w-100 justify-content-center ops-tap">Block these dates</button></div>
              </div>
            </form>
            {blackouts.length === 0 ? (
              <div className="bkx-sub" style={{ fontSize: 14 }}>No blocked dates.</div>
            ) : (
              <div className="hrx-tablewrap">
                <table className="hrx-table">
                  <thead>
                    <tr>
                      <th scope="col">{cfg.itemNoun}</th>
                      <th scope="col">Dates</th>
                      <th scope="col">Reason</th>
                      <th scope="col" className="text-end">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {blackouts.map((b) => (
                      <tr key={b.id}>
                        <td style={{ fontWeight: 600 }}>{b.product_name}</td>
                        <td style={{ whiteSpace: "nowrap" }}>{b.start_date} → {b.end_date}</td>
                        <td>{b.reason || <span className="bkx-sub">—</span>}</td>
                        <td className="text-end">
                          <button
                            type="button"
                            className="bkx-linkbtn ops-tap"
                            aria-label={`Unblock ${b.product_name} from ${b.start_date} to ${b.end_date}`}
                            onClick={() => unblock(b.id)}
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </>
      )}

      {/* 4 — The full list */}
      <Card
        title="All reservations"
        right={
          <input
            type="search"
            className="form-control form-control-sm"
            style={{ flex: "1 1 160px", minWidth: 0, maxWidth: 260 }}
            placeholder="Search guests…"
            aria-label="Search guests"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        }
      >
        <div className="hrx-tabbar mb-3" role="group" aria-label="Filter reservations by status">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              className={`hrx-tab${statusFilter === f.key ? " active" : ""}`}
              aria-pressed={statusFilter === f.key}
              onClick={() => setStatusFilter(f.key)}
            >
              {f.label}
            </button>
          ))}
        </div>

        {rows.length === 0 ? (
          <Empty title="No reservations yet">
            They'll appear here when customers book your {cfg.commerceLabel.toLowerCase()}.
          </Empty>
        ) : upcomingRows.length === 0 && pastRows.length === 0 ? (
          <Empty title="No reservations match this filter">Try a different status or search term.</Empty>
        ) : (
          <>
            {upcomingRows.length === 0 ? (
              <Empty title="No upcoming reservations match this filter">Past reservations may still match below.</Empty>
            ) : (
              <div className="hrx-tablewrap">
                <table className="hrx-table">
                  {reservationsHead}
                  <tbody>{upcomingRows.map((r) => <ReservationRow key={r.id} r={r} />)}</tbody>
                </table>
              </div>
            )}
            {pastRows.length > 0 && (
              <div className="mt-3">
                <button
                  type="button"
                  className="hrx-pill ops-tap"
                  aria-expanded={showPast}
                  onClick={() => setShowPast(!showPast)}
                >
                  {showPast ? "Hide" : "Show"} {pastRows.length} past reservation{pastRows.length === 1 ? "" : "s"}
                </button>
                {showPast && (
                  <div className="hrx-tablewrap mt-2">
                    <table className="hrx-table">
                      {reservationsHead}
                      <tbody>{pastRows.map((r) => <ReservationRow key={r.id} r={r} />)}</tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  );
}
