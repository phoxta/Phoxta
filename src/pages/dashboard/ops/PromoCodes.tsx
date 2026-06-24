import { useState } from "react";
import { useCachedData } from "@/lib/hooks/useCachedData";
import { DASHBOARD_TTL } from "@/lib/cache/dashboardQueries";
import { listPromos, createPromo, updatePromo, deletePromo, type PromoKind } from "@/lib/db/ops/promo";
import { formatPrice } from "@/lib/db/marketplace";

// Console manager for a business's promo / discount codes.
export default function PromoCodes({ orgId }: { orgId: string }) {
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
  const [err, setErr] = useState<string | null>(null);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!form.code.trim() || !form.value) return;
    setBusy(true);
    setErr(null);
    const value = form.kind === "percent" ? Math.round(parseFloat(form.value) || 0) : Math.round((parseFloat(form.value) || 0) * 100);
    const { error } = await createPromo(orgId, { code: form.code, kind: form.kind, value, min_cents: form.min ? Math.round((parseFloat(form.min) || 0) * 100) : 0, expires_at: form.expires || null });
    setBusy(false);
    if (error) setErr(error);
    else { setForm({ code: "", kind: "percent", value: "", min: "", expires: "" }); reload(); }
  }

  return (
    <div className="bg-neutral-0 rounded-4 p-4 border-100">
      <h5 className="fw-600 mb-3">Promo codes</h5>
      {(err || loadError) && <div className="alert alert-warning py-2 px-3 fz-font-sm">{err || loadError}</div>}
      <form onSubmit={add} className="row g-2 align-items-end mb-3">
        <div className="col-6 col-md-3"><label className="fz-font-sm neutral-500 d-block mb-1">Code</label><input className="form-control form-control-sm rounded-3 text-uppercase" placeholder="WELCOME10" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} /></div>
        <div className="col-6 col-md-2"><label className="fz-font-sm neutral-500 d-block mb-1">Type</label><select className="form-select form-select-sm rounded-3" value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value as PromoKind })}><option value="percent">% off</option><option value="fixed">$ off</option></select></div>
        <div className="col-6 col-md-2"><label className="fz-font-sm neutral-500 d-block mb-1">{form.kind === "percent" ? "Percent" : "Amount $"}</label><input className="form-control form-control-sm rounded-3" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} /></div>
        <div className="col-6 col-md-2"><label className="fz-font-sm neutral-500 d-block mb-1">Min spend $</label><input className="form-control form-control-sm rounded-3" placeholder="0" value={form.min} onChange={(e) => setForm({ ...form, min: e.target.value })} /></div>
        <div className="col-6 col-md-2"><label className="fz-font-sm neutral-500 d-block mb-1">Expires</label><input type="date" className="form-control form-control-sm rounded-3" value={form.expires} onChange={(e) => setForm({ ...form, expires: e.target.value })} /></div>
        <div className="col-6 col-md-1"><button type="submit" className="btn btn-dark btn-sm w-100 rounded-3" disabled={busy}>Add</button></div>
      </form>
      {loading ? (
        <div className="neutral-500 fz-font-md">Loading…</div>
      ) : promos.length === 0 ? (
        <div className="neutral-500 fz-font-md">No codes yet — add one above (e.g. WELCOME10 for 10% off).</div>
      ) : (
        <div className="d-flex flex-column gap-2">
          {promos.map((p) => (
            <div key={p.id} className="border-100 rounded-3 p-2 px-3 d-flex flex-wrap align-items-center justify-content-between gap-2">
              <span className="fz-font-md">
                <span className="fw-600">{p.code}</span>
                <span className="neutral-500 fz-font-sm"> · {p.kind === "percent" ? `${p.value}% off` : `${formatPrice(p.value, "USD")} off`}{p.min_cents > 0 ? ` · min ${formatPrice(p.min_cents, "USD")}` : ""}{p.expires_at ? ` · until ${new Date(p.expires_at).toLocaleDateString()}` : ""}</span>
              </span>
              <span className="d-flex align-items-center gap-3">
                <button type="button" className={`btn btn-link btn-sm p-0 text-decoration-none fw-600 ${p.active ? "text-success" : "neutral-500"}`} onClick={async () => { await updatePromo(p.id, { active: !p.active }); reload(); }}>{p.active ? "Active" : "Paused"}</button>
                <button type="button" className="btn btn-link btn-sm p-0 neutral-500 text-decoration-none" onClick={async () => { if (confirm(`Delete ${p.code}?`)) { await deletePromo(p.id); reload(); } }}>Delete</button>
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
