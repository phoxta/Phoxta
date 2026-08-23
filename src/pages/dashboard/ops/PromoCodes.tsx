import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { useCachedData } from "@/lib/hooks/useCachedData";
import { DASHBOARD_TTL } from "@/lib/cache/dashboardQueries";
import { listPromos, createPromo, updatePromo, deletePromo, type PromoKind } from "@/lib/db/ops/promo";
import { formatPrice } from "@/lib/db/marketplace";
import { toast, toastError, confirmDanger, reportMutation } from "@/lib/ops/feedback";
import type { OpsContext } from "@/layouts/OperatingLayout";

/** A code stays usable until the END of its expiry day, so compare calendar
 *  days (and render at local noon) instead of raw timestamps. */
const dayOf = (iso: string) => iso.slice(0, 10);
const isExpired = (iso: string | null) => !!iso && dayOf(iso) < new Date().toISOString().slice(0, 10);
const showDay = (iso: string) => new Date(`${dayOf(iso)}T12:00:00`).toLocaleDateString();

// Console manager for a business's promo / discount codes.
export default function PromoCodes({ orgId }: { orgId: string }) {
  const { org } = useOutletContext<OpsContext>();
  const currency = org.currency || "GBP";
  const { data: promos = [], loading, error: loadError, reload } = useCachedData(
    `ops:promos:${orgId}`,
    async () => {
      const { data, error } = await listPromos(orgId);
      if (error) throw new Error(error);
      return data;
    },
    { ttl: DASHBOARD_TTL },
  );
  const [form, setForm] = useState({ code: "", kind: "percent" as PromoKind, value: "", min: "", expires: "" });
  const [busy, setBusy] = useState(false);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!form.code.trim() || !form.value) return;
    let value: number;
    if (form.kind === "percent") {
      const pct = parseFloat(form.value);
      if (!Number.isFinite(pct) || pct < 1 || pct > 100) {
        toastError("Percent must be a number between 1 and 100.");
        return;
      }
      value = Math.round(pct);
    } else {
      const amt = parseFloat(form.value);
      if (!Number.isFinite(amt) || amt <= 0) {
        toastError("Enter a valid discount amount greater than zero.");
        return;
      }
      value = Math.round(amt * 100);
    }
    let minCents = 0;
    if (form.min) {
      const min = parseFloat(form.min);
      if (!Number.isFinite(min) || min < 0) {
        toastError("Minimum spend must be a valid amount.");
        return;
      }
      minCents = Math.round(min * 100);
    }
    setBusy(true);
    const { error } = await createPromo(orgId, { code: form.code, kind: form.kind, value, min_cents: minCents, expires_at: form.expires || null });
    setBusy(false);
    if (error) {
      toastError(error.toLowerCase().includes("already exists") ? "That code already exists." : error);
    } else {
      toast(`${form.code.trim().toUpperCase()} is live — customers can use it at checkout.`);
      setForm({ code: "", kind: "percent", value: "", min: "", expires: "" });
      reload();
    }
  }

  return (
    <div className="bg-neutral-0 rounded-4 p-3 p-md-4 border-100">
      <h2 className="fz-font-lg fw-600 mb-3">Promo codes</h2>
      {loadError && <div className="alert alert-warning py-2 px-3 fz-font-sm" role="alert">{loadError}</div>}
      <form onSubmit={add} className="row g-2 align-items-end mb-4">
        <div className="col-12 col-md-3"><label htmlFor="promo-code" className="fz-font-sm neutral-500 d-block mb-1">Code</label><input id="promo-code" className="form-control form-control-sm rounded-3 text-uppercase" placeholder="WELCOME10" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} /></div>
        <div className="col-6 col-md-2"><label htmlFor="promo-kind" className="fz-font-sm neutral-500 d-block mb-1">Type</label><select id="promo-kind" className="form-select form-select-sm rounded-3" value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value as PromoKind })}><option value="percent">% off</option><option value="fixed">{currency} off</option></select></div>
        <div className="col-6 col-md-2"><label htmlFor="promo-value" className="fz-font-sm neutral-500 d-block mb-1">{form.kind === "percent" ? "Percent (1–100)" : `Amount (${currency})`}</label><input id="promo-value" type="number" min={form.kind === "percent" ? 1 : 0.01} max={form.kind === "percent" ? 100 : undefined} step={form.kind === "percent" ? 1 : 0.01} inputMode="decimal" className="form-control form-control-sm rounded-3" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} /></div>
        <div className="col-6 col-md-2"><label htmlFor="promo-min" className="fz-font-sm neutral-500 d-block mb-1">Min spend ({currency})</label><input id="promo-min" type="number" min={0} step={0.01} inputMode="decimal" className="form-control form-control-sm rounded-3" placeholder="0" value={form.min} onChange={(e) => setForm({ ...form, min: e.target.value })} /></div>
        <div className="col-6 col-md-2">
          <label htmlFor="promo-expires" className="fz-font-sm neutral-500 d-block mb-1">Expires</label>
          <input id="promo-expires" type="date" className="form-control form-control-sm rounded-3" value={form.expires} onChange={(e) => setForm({ ...form, expires: e.target.value })} />
        </div>
        <div className="col-12 col-md-1"><button type="submit" className="btn btn-dark btn-sm w-100 rounded-3 text-nowrap" disabled={busy}>{busy ? "…" : "Add"}</button></div>
        {form.expires && <div className="col-12 fz-font-sm neutral-500">Valid through {showDay(form.expires)} — customers can use the code until the end of that day.</div>}
      </form>
      {loading ? (
        <div className="neutral-500 fz-font-md" role="status">Loading…</div>
      ) : promos.length === 0 ? (
        <div className="neutral-500 fz-font-md">No codes yet — add one above (e.g. WELCOME10 for 10% off).</div>
      ) : (
        <div className="d-flex flex-column gap-2">
          {promos.map((p) => {
            const expired = isExpired(p.expires_at);
            const live = p.active && !expired;
            return (
              <div key={p.id} className="border-100 rounded-3 p-3 d-flex flex-wrap align-items-center justify-content-between gap-2">
                <div className="flex-grow-1" style={{ minWidth: "12rem" }}>
                  <div className="fz-font-md fw-600">
                    {p.code}
                    <span className={`badge fw-500 ms-2 ${live ? "bg-success-subtle text-success" : expired ? "bg-danger-subtle text-danger" : "bg-neutral-100 neutral-700"}`}>
                      {expired ? "Expired" : p.active ? "Active" : "Paused"}
                    </span>
                  </div>
                  <div className="fz-font-sm neutral-500">
                    {p.kind === "percent" ? `${p.value}% off` : `${formatPrice(p.value, currency)} off`}
                    {p.min_cents > 0 ? ` · min ${formatPrice(p.min_cents, currency)}` : ""}
                    {p.expires_at ? ` · valid through ${showDay(p.expires_at)}` : " · no expiry"}
                  </div>
                </div>
                <div className="d-flex align-items-center gap-3 flex-shrink-0">
                  <button
                    type="button"
                    className="btn btn-link btn-sm p-0 neutral-700 text-decoration-none ops-tap text-nowrap"
                    onClick={async () => { if (await reportMutation(updatePromo(p.id, { active: !p.active }), p.active ? `${p.code} paused.` : `${p.code} activated.`)) reload(); }}
                  >
                    {p.active ? "Pause" : "Activate"}
                  </button>
                  <button
                    type="button"
                    className="btn btn-link btn-sm p-0 text-danger text-decoration-none ops-tap"
                    onClick={async () => { if (confirmDanger(`Delete ${p.code}? Customers will no longer be able to use it.`)) { if (await reportMutation(deletePromo(p.id), "Code deleted.")) reload(); } }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
