import { useEffect, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { useCachedData } from "@/lib/hooks/useCachedData";
import { DASHBOARD_TTL } from "@/lib/cache/dashboardQueries";
import { updateBusiness } from "@/lib/db/organizations";
import { listLocations, createLocation, deleteLocation, type Location } from "@/lib/db/ops/agent";
import { confirmDanger, reportMutation, toast, toastError } from "@/lib/ops/feedback";
import type { OpsContext } from "@/layouts/OperatingLayout";

/** Major ISO currencies, African markets first (Phoxta's home turf). */
const CURRENCIES: { code: string; label: string }[] = [
  { code: "NGN", label: "NGN — Nigerian naira" },
  { code: "USD", label: "USD — US dollar" },
  { code: "GBP", label: "GBP — British pound" },
  { code: "EUR", label: "EUR — Euro" },
  { code: "GHS", label: "GHS — Ghanaian cedi" },
  { code: "KES", label: "KES — Kenyan shilling" },
  { code: "ZAR", label: "ZAR — South African rand" },
  { code: "EGP", label: "EGP — Egyptian pound" },
  { code: "XOF", label: "XOF — West African CFA franc" },
  { code: "CAD", label: "CAD — Canadian dollar" },
  { code: "AUD", label: "AUD — Australian dollar" },
  { code: "INR", label: "INR — Indian rupee" },
  { code: "AED", label: "AED — UAE dirham" },
  { code: "JPY", label: "JPY — Japanese yen" },
  { code: "CNY", label: "CNY — Chinese yuan" },
  { code: "CHF", label: "CHF — Swiss franc" },
  { code: "BRL", label: "BRL — Brazilian real" },
  { code: "MXN", label: "MXN — Mexican peso" },
];

const GOOGLE_APPS = [
  { app: "gmail", icon: "✉️", name: "Gmail", desc: "Inbox · compose · reply" },
  { app: "calendar", icon: "📅", name: "Calendar", desc: "Events & scheduling" },
  { app: "drive", icon: "📁", name: "Drive", desc: "Files & folders" },
];

export default function SettingsPage() {
  const { orgId, org } = useOutletContext<OpsContext>();
  const base = `/dashboard/businesses/${orgId}/ops`;

  // ── Business ──────────────────────────────────────────────────────────────
  const [name, setName] = useState(org.name);
  const [currency, setCurrency] = useState(org.currency || "USD");
  const [bizBusy, setBizBusy] = useState(false);
  useEffect(() => { setName(org.name); setCurrency(org.currency || "USD"); }, [org.name, org.currency]);

  async function saveBusiness(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) { toastError("The business name can't be empty."); return; }
    const nameChanged = trimmed !== org.name;
    const currencyChanged = currency !== (org.currency || "USD");
    if (!nameChanged && !currencyChanged) { toast("Nothing to save — details are up to date.", "info"); return; }
    setBizBusy(true);
    let ok = true;
    if (nameChanged) {
      ok = await reportMutation(updateBusiness(orgId, { name: trimmed }), currencyChanged ? undefined : "Business details saved.");
    }
    if (ok && currencyChanged) {
      ok = await reportMutation(
        supabase.from("organizations").update({ currency }).eq("id", orgId).then(({ error }) => ({ error: error?.message ?? null })),
        `Saved — money across the console now shows in ${currency}. Reload open tabs to see it everywhere.`,
      );
    }
    setBizBusy(false);
  }

  // ── Locations & call routing ──────────────────────────────────────────────
  const { data: locations = [], loading: locLoading, reload } = useCachedData<Location[]>(
    `ops:settings:locations:${orgId}`,
    async () => {
      const { data, error } = await listLocations(orgId);
      if (error) throw new Error(error);
      return data;
    },
    { ttl: DASHBOARD_TTL },
  );
  const [form, setForm] = useState({ name: "", zip: "", phone: "", services: "" });
  const [test, setTest] = useState({ zip: "", service: "" });
  const [routed, setRouted] = useState<Location | null | "none">(null);
  const [routing, setRouting] = useState(false);

  async function addLocation(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) { toastError("Give the location a name."); return; }
    const ok = await reportMutation(
      createLocation(orgId, {
        name: form.name,
        zip: form.zip,
        phone: form.phone,
        service_types: form.services.split(",").map((s) => s.trim()).filter(Boolean),
      }),
      "Location added.",
    );
    if (ok) { setForm({ name: "", zip: "", phone: "", services: "" }); reload(); }
  }

  async function removeLocation(l: Location) {
    if (!confirmDanger(`Remove "${l.name}"? Calls will no longer route to this location.`)) return;
    const ok = await reportMutation(deleteLocation(l.id), "Location removed.");
    if (ok) reload();
  }

  async function runRoute(e: React.FormEvent) {
    e.preventDefault();
    setRouting(true);
    setRouted(null);
    // The real routing decision — a member-guarded wrapper (0074) over the same
    // RPC the AI call agent uses live, so the tester can never drift from it.
    const { data, error } = await supabase.rpc("app_route_location_member", { p_org: orgId, p_zip: test.zip.trim(), p_service: test.service.trim() });
    setRouting(false);
    if (error) { toastError(error.message || "Routing test failed."); return; }
    const hit = data as { matched?: boolean; id?: string } | null;
    if (!hit?.matched || !hit.id) { setRouted("none"); return; }
    setRouted(locations.find((l) => l.id === hit.id) ?? "none");
  }

  return (
    <div className="row g-4">
      {/* ── Business ── */}
      <div className="col-lg-6">
        <h6 className="fw-600 mb-3">Business</h6>
        <form onSubmit={saveBusiness} className="bg-neutral-0 rounded-4 p-4 border-100">
          <div className="mb-3">
            <label htmlFor="set-biz-name" className="fz-font-sm fw-600 neutral-500 mb-1 d-block">Business name</label>
            <input id="set-biz-name" className="form-control rounded-3" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="mb-3">
            <label htmlFor="set-biz-currency" className="fz-font-sm fw-600 neutral-500 mb-1 d-block">Currency</label>
            <select id="set-biz-currency" className="form-select rounded-3" value={currency} onChange={(e) => setCurrency(e.target.value)}>
              {CURRENCIES.map((c) => <option key={c.code} value={c.code}>{c.label}</option>)}
              {!CURRENCIES.some((c) => c.code === currency) && <option value={currency}>{currency}</option>}
            </select>
            <div className="fz-font-sm neutral-500 mt-1">Changes the display currency console-wide — orders, invoices, reports and dashboards all show money in this currency.</div>
          </div>
          <button type="submit" className="btn btn-dark rounded-3 px-4" disabled={bizBusy}>{bizBusy ? "Saving…" : "Save changes"}</button>
        </form>

        {/* ── Agent permissions ── */}
        <h6 className="fw-600 mb-3 mt-4">AI agent</h6>
        <div className="bg-neutral-0 rounded-4 p-4 border-100 d-flex flex-column gap-3">
          <div className="d-flex align-items-center justify-content-between gap-2">
            <div>
              <div className="fw-600">Tool policies</div>
              <div className="fz-font-sm neutral-500">What the AI may do on its own — per-tool off / approve / auto, with an approval queue.</div>
            </div>
            <Link to={`${base}/agent/operator`} className="btn btn-outline-dark btn-sm rounded-pill px-3 text-nowrap">Open</Link>
          </div>
          <div className="d-flex align-items-center justify-content-between gap-2 border-top border-100 pt-3">
            <div>
              <div className="fw-600">Training & persona</div>
              <div className="fz-font-sm neutral-500">Greeting, tone, procedures, business hours and escalation rules.</div>
            </div>
            <Link to={`${base}/agent/configure`} className="btn btn-outline-dark btn-sm rounded-pill px-3 text-nowrap">Configure</Link>
          </div>
        </div>

        {/* ── Google Workspace ── */}
        <h6 className="fw-600 mb-3 mt-4">Google Workspace</h6>
        <div className="bg-neutral-0 rounded-4 p-4 border-100">
          <div className="row g-2 mb-3">
            {GOOGLE_APPS.map((a) => (
              <div className="col-4" key={a.app}>
                <Link to={`${base}/google?app=${a.app}`} className="bg-neutral-0 rounded-4 p-3 border-100 w-100 h-100 text-center d-flex flex-column align-items-center justify-content-center gap-1 text-decoration-none">
                  <span style={{ fontSize: 28, lineHeight: 1 }}>{a.icon}</span>
                  <span className="fw-600 neutral-900 fz-font-md">{a.name}</span>
                  <span className="fz-font-sm neutral-500">{a.desc}</span>
                </Link>
              </div>
            ))}
          </div>
          <div className="d-flex align-items-center justify-content-between gap-2">
            <div className="fz-font-sm neutral-500">Connect or manage the Google account and team email addresses.</div>
            <Link to={`${base}/google?tab=configure`} className="btn btn-outline-dark btn-sm rounded-pill px-3 text-nowrap">Configure</Link>
          </div>
        </div>
      </div>

      {/* ── Locations & call routing ── */}
      <div className="col-lg-6">
        <h6 className="fw-600 mb-3">Locations & call routing</h6>
        <div className="fz-font-sm neutral-500 mb-3">Routing matters mainly for multi-location businesses — the AI call agent uses these branches to send callers to the right place by ZIP and service.</div>
        <form onSubmit={addLocation} className="bg-neutral-0 rounded-4 p-3 border-100 mb-3">
          <div className="row g-2">
            <div className="col-md-6">
              <label htmlFor="set-loc-name" className="fz-font-sm fw-600 neutral-500 mb-1 d-block">Branch name</label>
              <input id="set-loc-name" className="form-control rounded-3" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div className="col-md-3">
              <label htmlFor="set-loc-zip" className="fz-font-sm fw-600 neutral-500 mb-1 d-block">ZIP</label>
              <input id="set-loc-zip" className="form-control rounded-3" value={form.zip} onChange={(e) => setForm({ ...form, zip: e.target.value })} />
            </div>
            <div className="col-md-3">
              <label htmlFor="set-loc-phone" className="fz-font-sm fw-600 neutral-500 mb-1 d-block">Phone</label>
              <input id="set-loc-phone" type="tel" className="form-control rounded-3" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div className="col-12">
              <label htmlFor="set-loc-services" className="fz-font-sm fw-600 neutral-500 mb-1 d-block">Service types <span className="fw-400">(comma separated)</span></label>
              <input id="set-loc-services" className="form-control rounded-3" value={form.services} onChange={(e) => setForm({ ...form, services: e.target.value })} />
            </div>
            <div className="col-12"><button type="submit" className="btn btn-dark rounded-3 px-4">Add location</button></div>
          </div>
        </form>

        {locLoading ? (
          <div className="bg-neutral-0 rounded-4 p-4 border-100 text-center neutral-500">Loading…</div>
        ) : locations.length === 0 ? (
          <div className="bg-neutral-0 rounded-4 p-4 border-100 text-center neutral-500">No locations yet. Single-location businesses can skip this — add branches only if calls should route by ZIP.</div>
        ) : (
          <div className="d-flex flex-column gap-2">
            {locations.map((l) => (
              <div key={l.id} className="bg-neutral-0 rounded-4 p-3 border-100 d-flex align-items-center justify-content-between gap-2">
                <div>
                  <div className="fw-600">{l.name} <span className="fz-font-sm neutral-500">{l.zip}</span></div>
                  <div className="fz-font-sm neutral-500">{l.service_types.join(", ") || "All services"}{l.phone ? ` · ${l.phone}` : ""}</div>
                </div>
                <button type="button" className="btn btn-link btn-sm p-0 neutral-500 text-decoration-none" onClick={() => removeLocation(l)}>Remove</button>
              </div>
            ))}
          </div>
        )}

        <form onSubmit={runRoute} className="bg-neutral-0 rounded-4 p-3 border-100 mt-3">
          <div className="fz-font-sm fw-600 neutral-500 mb-2">Test ZIP routing</div>
          <div className="d-flex gap-2">
            <input aria-label="Caller ZIP code" className="form-control rounded-3" placeholder="ZIP" value={test.zip} onChange={(e) => setTest({ ...test, zip: e.target.value })} />
            <input aria-label="Requested service" className="form-control rounded-3" placeholder="Service" value={test.service} onChange={(e) => setTest({ ...test, service: e.target.value })} />
            <button type="submit" className="btn btn-dark rounded-3 px-3" disabled={routing}>{routing ? "…" : "Route"}</button>
          </div>
          <div className="fz-font-sm neutral-500 mt-2">Runs the same routing decision the live call agent uses.</div>
          {routed === "none" && <div className="fz-font-md neutral-500 mt-1">No matching location.</div>}
          {routed && routed !== "none" && <div className="fz-font-md neutral-700 mt-1">→ Routes to <span className="fw-600">{routed.name}</span> ({routed.phone || routed.zip})</div>}
        </form>
      </div>
    </div>
  );
}
