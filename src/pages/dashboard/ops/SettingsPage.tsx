import { useEffect, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { useCachedData } from "@/lib/hooks/useCachedData";
import { DASHBOARD_TTL, organizationsQuery } from "@/lib/cache/dashboardQueries";
import { updateBusiness } from "@/lib/db/organizations";
import { listLocations, createLocation, deleteLocation, type Location } from "@/lib/db/ops/agent";
import { getServicePolicies, saveServicePolicies, type ServicePolicies } from "@/lib/db/ops/policies";
import { can } from "@/lib/ops/permissions";
import { confirmDanger, reportMutation, toast, toastError } from "@/lib/ops/feedback";
import { Card, Chip, Empty, InitialAvatar } from "@/components/dash/Ui";
import type { OpsContext } from "@/layouts/OperatingLayout";

/** Major ISO currencies, African markets first (Phoxta's home turf). */
const CURRENCIES: { code: string; label: string }[] = [
  { code: "NGN", label: "NGN — Nigerian naira" },
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

/** First-response target presets (minutes); any other value renders as Custom. */
const SLA_PRESETS: { minutes: number; label: string }[] = [
  { minutes: 15, label: "15 minutes" },
  { minutes: 60, label: "1 hour" },
  { minutes: 240, label: "4 hours" },
  { minutes: 480, label: "8 hours" },
];

// Same order and wording as the Google Workspace page, so the two read as one place.
const GOOGLE_APPS = [
  { app: "gmail", icon: "✉️", name: "Gmail", desc: "Inbox · compose · reply" },
  { app: "drive", icon: "📁", name: "Drive", desc: "Files & folders" },
  { app: "calendar", icon: "📅", name: "Calendar", desc: "Events & scheduling" },
];

/** Page-local styles on top of the shared .hrx kit. */
const CSS = `
.osx-hint { font-size: 13px; color: var(--hrx-muted); margin-top: 6px; }
.osx-note { font-size: 14px; color: var(--hrx-muted); margin: 0 0 14px; }
.osx-btn:disabled { opacity: 0.55; cursor: default; }
.osx-grid .hrx-field { margin-bottom: 0; }
.osx-danger {
  height: 34px; padding: 0 14px; border-radius: 50px; background: #fff;
  border: 1px solid #f3c1c1; color: #dc2626; font-size: 13px; font-weight: 500;
  display: inline-flex; align-items: center; white-space: nowrap; flex-shrink: 0;
  transition: background-color 0.15s ease, color 0.15s ease, border-color 0.15s ease;
}
.osx-danger:hover { background: #dc2626; border-color: #dc2626; color: #fff; }
.osx-gtile {
  background: var(--hrx-soft); border: 1px solid var(--hrx-border-soft); border-radius: 16px;
  padding: 14px; width: 100%; height: 100%; display: flex; align-items: center; gap: 12px;
  text-decoration: none; color: var(--hrx-ink); transition: background-color 0.15s ease, border-color 0.15s ease;
}
.osx-gtile:hover { background: #f1f2f4; border-color: var(--hrx-border); color: var(--hrx-ink); }
.osx-gtile .n { font-size: 15px; font-weight: 500; display: block; }
.osx-gtile .d { font-size: 13px; color: var(--hrx-muted); display: block; }
@media (min-width: 576px) {
  .osx-gtile { flex-direction: column; text-align: center; gap: 6px; }
}
.osx-route { font-size: 14px; margin-top: 8px; }
`;

export default function SettingsPage() {
  const { orgId, org } = useOutletContext<OpsContext>();
  const base = `/dashboard/businesses/${orgId}/ops`;

  // ── Who am I here? (client-side gate only — see lib/ops/permissions) ──────
  // Role comes from the warmed organizations cache (membership role per org).
  const { data: myOrgs = [] } = useCachedData(organizationsQuery.key, organizationsQuery.fetch);
  const myRole = myOrgs.find((m) => m.organization.id === orgId)?.role ?? null;
  // Gate only once the role is actually known — no read-only flash while warming.
  const readOnly = myRole !== null && !can(myRole, "manage_settings");

  // ── Service levels & routing (stored in agent_config.escalation jsonb) ────
  const { data: policies, reload: reloadPolicies } = useCachedData<ServicePolicies>(
    `ops:settings:policies:${orgId}`,
    async () => {
      const { data, error } = await getServicePolicies(orgId);
      if (error) throw new Error(error);
      return data;
    },
    { ttl: DASHBOARD_TTL },
  );
  const [pol, setPol] = useState<{
    enabled: boolean;
    frMinutes: number;
    frCustom: boolean;
    resHours: number;
    routing: "off" | "round_robin";
  } | null>(null);
  const [polBusy, setPolBusy] = useState(false);
  useEffect(() => {
    if (!policies) return;
    setPol({
      enabled: policies.sla.enabled,
      frMinutes: policies.sla.first_response_minutes,
      frCustom: !SLA_PRESETS.some((p) => p.minutes === policies.sla.first_response_minutes),
      resHours: policies.sla.resolution_hours,
      routing: policies.routing.mode,
    });
  }, [policies]);

  async function savePolicies(e: React.FormEvent) {
    e.preventDefault();
    if (!pol || polBusy) return;
    if (!(pol.frMinutes > 0)) { toastError("The first-response target must be at least 1 minute."); return; }
    if (!(pol.resHours > 0)) { toastError("The resolution target must be at least 1 hour."); return; }
    setPolBusy(true);
    const ok = await reportMutation(
      saveServicePolicies(orgId, {
        sla: { enabled: pol.enabled, first_response_minutes: Math.round(pol.frMinutes), resolution_hours: Math.round(pol.resHours) },
        routing: { mode: pol.routing },
      }),
      "Saved — the Inbox shows due/overdue chips and the maintenance run applies routing within a few minutes.",
    );
    setPolBusy(false);
    if (ok) reloadPolicies();
  }

  // ── Business ──────────────────────────────────────────────────────────────
  const [name, setName] = useState(org.name);
  const [currency, setCurrency] = useState(org.currency || "GBP");
  const [bizBusy, setBizBusy] = useState(false);
  useEffect(() => { setName(org.name); setCurrency(org.currency || "GBP"); }, [org.name, org.currency]);

  async function saveBusiness(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) { toastError("The business name can't be empty."); return; }
    const nameChanged = trimmed !== org.name;
    const currencyChanged = currency !== (org.currency || "GBP");
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
  const { data: locations = [], loading: locLoading, error: locError, reload } = useCachedData<Location[]>(
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

  // Agents/viewers don't manage settings — a friendly hand-off, not dead forms.
  // (Client-side gate only in v1: `can()` shapes the UI; RLS is not yet role-aware.)
  if (readOnly)
    return (
      <Card>
        <Empty title="Settings are managed by an admin">
          Your role in {org.name} is {myRole === "staff" ? "agent" : myRole}. Ask an owner or admin to change
          business details, service levels, routing or locations.
        </Empty>
      </Card>
    );

  return (
    <div className="row g-3">
      <style>{CSS}</style>

      {/* ── Business ── */}
      <div className="col-12 col-lg-6 d-flex flex-column gap-3">
        <Card title="Business">
          <form onSubmit={saveBusiness}>
            <label className="hrx-field">
              <span>Business name</span>
              <input className="form-control" value={name} onChange={(e) => setName(e.target.value)} required />
            </label>
            <label className="hrx-field">
              <span>Currency</span>
              <select className="form-select" value={currency} onChange={(e) => setCurrency(e.target.value)}>
                {CURRENCIES.map((c) => <option key={c.code} value={c.code}>{c.label}</option>)}
                {!CURRENCIES.some((c) => c.code === currency) && <option value={currency}>{currency}</option>}
              </select>
              <span className="osx-hint">Changes the display currency console-wide — orders, invoices, reports and dashboards all show money in this currency.</span>
            </label>
            <button type="submit" className="hrx-pill dark osx-btn" disabled={bizBusy}>{bizBusy ? "Saving…" : "Save changes"}</button>
          </form>
        </Card>

        {/* ── Service levels & routing ── */}
        <Card title="Service levels & routing">
          {!pol ? (
            <p className="osx-note text-center mb-0" role="status">Loading…</p>
          ) : (
            <form onSubmit={savePolicies}>
              <label className="d-flex align-items-center gap-2 mb-3" style={{ fontSize: 14 }}>
                <input
                  type="checkbox"
                  className="form-check-input mt-0"
                  checked={pol.enabled}
                  onChange={(e) => setPol({ ...pol, enabled: e.target.checked })}
                />
                <span>Track response-time targets (SLA)</span>
              </label>
              <div className="row g-2 osx-grid">
                <div className={pol.frCustom ? "col-6 col-md-4" : "col-6"}>
                  <label className="hrx-field">
                    <span>First response</span>
                    <select
                      className="form-select"
                      value={pol.frCustom ? "custom" : String(pol.frMinutes)}
                      onChange={(e) => {
                        const v = e.target.value;
                        if (v === "custom") setPol({ ...pol, frCustom: true });
                        else setPol({ ...pol, frCustom: false, frMinutes: Number(v) });
                      }}
                    >
                      {SLA_PRESETS.map((p) => <option key={p.minutes} value={p.minutes}>{p.label}</option>)}
                      <option value="custom">Custom…</option>
                    </select>
                  </label>
                </div>
                {pol.frCustom && (
                  <div className="col-6 col-md-4">
                    <label className="hrx-field">
                      <span>Minutes</span>
                      <input
                        type="number"
                        min={1}
                        className="form-control"
                        value={pol.frMinutes}
                        onChange={(e) => setPol({ ...pol, frMinutes: Number(e.target.value) })}
                      />
                    </label>
                  </div>
                )}
                <div className={pol.frCustom ? "col-6 col-md-4" : "col-6"}>
                  <label className="hrx-field">
                    <span>Resolution (hours)</span>
                    <input
                      type="number"
                      min={1}
                      className="form-control"
                      value={pol.resHours}
                      onChange={(e) => setPol({ ...pol, resHours: Number(e.target.value) })}
                    />
                  </label>
                </div>
              </div>
              <span className="osx-hint d-block mb-3">
                Open conversations show a &ldquo;Due in&rdquo; chip in the Inbox and an overdue breach notifies the
                assignee (or the admins) once per conversation. Snoozing pauses the chip.
              </span>
              <label className="hrx-field">
                <span>Routing — new conversations</span>
                <select
                  className="form-select"
                  value={pol.routing}
                  onChange={(e) => setPol({ ...pol, routing: e.target.value as "off" | "round_robin" })}
                >
                  <option value="off">No auto-assignment</option>
                  <option value="round_robin">Round-robin across the team</option>
                </select>
                <span className="osx-hint">
                  Round-robin assigns unassigned open conversations evenly across owners, admins and agents, and
                  notifies each assignee. Applied by the maintenance run every few minutes.
                </span>
              </label>
              <button type="submit" className="hrx-pill dark osx-btn" disabled={polBusy}>
                {polBusy ? "Saving…" : "Save service levels"}
              </button>
            </form>
          )}
        </Card>

        {/* ── Agent permissions ── */}
        <Card title="AI agent">
          <div className="hrx-listrow">
            <div className="main">
              <h3 className="t">What the AI may do on its own</h3>
              <p className="s">Choose what runs automatically and what waits for your approval.</p>
            </div>
            <Link to={`${base}/agent/operator`} className="hrx-seeall">Open</Link>
          </div>
          <div className="hrx-listrow">
            <div className="main">
              <h3 className="t">Train your agent</h3>
              <p className="s">Greeting, tone, procedures, business hours and escalation rules.</p>
            </div>
            <Link to={`${base}/agent/configure`} className="hrx-seeall">Train</Link>
          </div>
        </Card>

        {/* ── Google Workspace ── */}
        <Card title="Google Workspace">
          {/* Full-width rows on a phone, tiles from sm up — never three 72px columns. */}
          <div className="row g-2 mb-3">
            {GOOGLE_APPS.map((a) => (
              <div className="col-12 col-sm-4" key={a.app}>
                <Link to={`${base}/google?app=${a.app}`} className="osx-gtile">
                  <span aria-hidden="true" style={{ fontSize: 26, lineHeight: 1 }}>{a.icon}</span>
                  <span style={{ minWidth: 0 }}>
                    <span className="n">{a.name}</span>
                    <span className="d">{a.desc}</span>
                  </span>
                </Link>
              </div>
            ))}
          </div>
          <div className="d-flex flex-wrap align-items-center justify-content-between gap-2">
            <p className="osx-note mb-0" style={{ minWidth: 0 }}>Connect or manage the Google account and team email addresses.</p>
            <Link to={`${base}/google?tab=configure`} className="hrx-seeall">Configure</Link>
          </div>
        </Card>
      </div>

      {/* ── Locations & call routing ── */}
      <div className="col-12 col-lg-6 d-flex flex-column gap-3">
        <Card title="Locations & call routing">
          <p className="osx-note">Routing matters mainly for multi-location businesses — the AI call agent uses these branches to send callers to the right place by ZIP and service.</p>
          <form onSubmit={addLocation}>
            <div className="row g-2 osx-grid">
              <div className="col-12 col-md-6">
                <label className="hrx-field">
                  <span>Branch name</span>
                  <input className="form-control" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                </label>
              </div>
              <div className="col-6 col-md-3">
                <label className="hrx-field">
                  <span>ZIP</span>
                  <input className="form-control" value={form.zip} onChange={(e) => setForm({ ...form, zip: e.target.value })} />
                </label>
              </div>
              <div className="col-6 col-md-3">
                <label className="hrx-field">
                  <span>Phone</span>
                  <input type="tel" className="form-control" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                </label>
              </div>
              <div className="col-12">
                <label className="hrx-field">
                  <span>Service types (comma separated)</span>
                  <input className="form-control" value={form.services} onChange={(e) => setForm({ ...form, services: e.target.value })} />
                </label>
              </div>
              <div className="col-12"><button type="submit" className="hrx-pill dark osx-btn">Add location</button></div>
            </div>
          </form>
        </Card>

        <Card title="Branches" right={!locLoading && !locError ? <Chip tone="line">{locations.length}</Chip> : undefined}>
          {locLoading ? (
            <p className="osx-note text-center mb-0" role="status">Loading…</p>
          ) : locError ? (
            <div className="text-center" role="alert">
              <div className="fw-semibold mb-1" style={{ color: "#dc2626" }}>Couldn&rsquo;t load locations</div>
              <p className="osx-note">{locError}</p>
              <button type="button" className="hrx-pill dark" onClick={() => reload()}>Retry</button>
            </div>
          ) : locations.length === 0 ? (
            <Empty title="No locations yet">
              Single-location businesses can skip this — add branches only if calls should route by ZIP.
            </Empty>
          ) : (
            <ul className="list-unstyled m-0">
              {locations.map((l) => (
                <li key={l.id} className="hrx-listrow">
                  <InitialAvatar name={l.name} />
                  <div className="main">
                    <p className="t">{l.name} {l.zip && <span className="fw-normal" style={{ color: "var(--hrx-muted)", fontSize: 13 }}>{l.zip}</span>}</p>
                    <p className="s">{l.service_types.join(", ") || "All services"}{l.phone ? ` · ${l.phone}` : ""}</p>
                  </div>
                  <button
                    type="button"
                    className="osx-danger"
                    aria-label={`Remove ${l.name}`}
                    onClick={() => removeLocation(l)}
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Test ZIP routing">
          <form onSubmit={runRoute}>
            <div className="row g-2 osx-grid">
              <div className="col-6">
                <label className="hrx-field">
                  <span>Caller ZIP</span>
                  <input className="form-control" value={test.zip} onChange={(e) => setTest({ ...test, zip: e.target.value })} />
                </label>
              </div>
              <div className="col-6">
                <label className="hrx-field">
                  <span>Service</span>
                  <input className="form-control" value={test.service} onChange={(e) => setTest({ ...test, service: e.target.value })} />
                </label>
              </div>
              <div className="col-12">
                <button type="submit" className="hrx-pill dark osx-btn" disabled={routing}>{routing ? "Routing…" : "Route this call"}</button>
              </div>
            </div>
            <p className="osx-note mt-2 mb-0">Runs the same routing decision the live call agent uses.</p>
            <div role="status" aria-live="polite">
              {routed === "none" && <div className="osx-route" style={{ color: "var(--hrx-muted)" }}>No matching location.</div>}
              {routed && routed !== "none" && <div className="osx-route"><span aria-hidden="true">→ </span>Routes to <span className="fw-semibold">{routed.name}</span> ({routed.phone || routed.zip})</div>}
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}
