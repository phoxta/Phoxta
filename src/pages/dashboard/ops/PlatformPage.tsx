import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { toast, toastError } from "@/lib/ops/feedback";
import {
  fetchPlatformOverview, fetchPlatformTenants, fetchPlatformRevenue,
  fetchPlatformAdmins, addPlatformAdmin, removePlatformAdmin,
  fetchPlatformLeads, savePlatformLead, LEAD_STATUSES,
  fetchPlatformBlueprints, savePlatformBlueprint,
  setTenantStage, setTenantSubscription, setSupportAccess,
  fetchPlatformMargin, fetchPlatformAudit,
  type PlatformOverview, type PlatformTenant, type PlatformPurchase, type PlatformAdmin,
  listPaymentTests, startPaymentTest,
  type PlatformLead, type PlatformBlueprint, type PlatformMargin, type PlatformAuditRow,
  type PaymentTest,
} from "@/lib/db/platform";

/**
 * The Platform module — running Phoxta itself.
 *
 * The sibling tabs (Inbox, CRM, Marketing, Invoicing, AI Agent, Settings) already
 * serve Phoxta now that it is a real organization. What no tenant console can
 * answer is the cross-tenant question, so that lives here: who the customers
 * are, what they pay, what they cost, what is for sale, and who is allowed to
 * see any of it.
 *
 * Every read and write is gated on app_is_platform_admin() server-side, and every
 * write is appended to platform_audit. Hiding the tab is presentation; the RPCs
 * are the control.
 */

const money = (cents: number, ccy = "GBP") => {
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency: ccy, maximumFractionDigits: 0 }).format(cents / 100);
  } catch { return `${(cents / 100).toFixed(0)}`; }
};
const num = (n: number) => new Intl.NumberFormat().format(n);
const day = (iso: string) => new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });

const SECTIONS = ["Overview", "Customers", "Blueprints", "Leads", "Margin", "Payments", "Access"] as const;
type Section = (typeof SECTIONS)[number];

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="col-lg-3 col-md-4 col-6">
      <div className="bg-neutral-0 rounded-4 p-4 h-100 border-100">
        <div className="neutral-500 fz-font-sm mb-1">{label}</div>
        <div className="fw-600" style={{ fontSize: 26, lineHeight: 1.15 }}>{value}</div>
        {sub && <div className="neutral-500 fz-font-sm mt-1">{sub}</div>}
      </div>
    </div>
  );
}

function Card({ title, count, children }: { title: string; count?: number; children: React.ReactNode }) {
  return (
    <div className="bg-neutral-0 rounded-4 p-4 border-100">
      <div className="d-flex align-items-center justify-content-between mb-3">
        <h2 className="fw-600 mb-0" style={{ fontSize: 18 }}>{title}</h2>
        {count != null && <span className="badge bg-neutral-100 neutral-700 fw-500">{count}</span>}
      </div>
      {children}
    </div>
  );
}

export default function OpsPlatformPage() {
  const [section, setSection] = useState<Section>(
    // Stripe returns here after a test, so land on the section that shows it.
    () => (new URLSearchParams(window.location.search).get("section") as Section) || "Overview",
  );
  const [tests, setTests] = useState<PaymentTest[]>([]);
  const [testAmount, setTestAmount] = useState("1.00");
  const [testNote, setTestNote] = useState("");
  const [testing, setTesting] = useState(false);
  const [ov, setOv] = useState<PlatformOverview | null>(null);
  const [tenants, setTenants] = useState<PlatformTenant[]>([]);
  const [revenue, setRevenue] = useState<PlatformPurchase[]>([]);
  const [admins, setAdmins] = useState<PlatformAdmin[]>([]);
  const [leads, setLeads] = useState<PlatformLead[]>([]);
  const [blueprints, setBlueprints] = useState<PlatformBlueprint[]>([]);
  const [margin, setMargin] = useState<PlatformMargin[]>([]);
  const [audit, setAudit] = useState<PlatformAuditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [denied, setDenied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [adminEmail, setAdminEmail] = useState("");
  const [edit, setEdit] = useState<Record<string, Partial<PlatformBlueprint>>>({});

  const reload = useCallback(async () => {
    const [t, r, a, l, b, m, au, pt] = await Promise.all([
      fetchPlatformTenants(), fetchPlatformRevenue(), fetchPlatformAdmins(),
      fetchPlatformLeads(), fetchPlatformBlueprints(), fetchPlatformMargin(), fetchPlatformAudit(),
      listPaymentTests(),
    ]);
    setTenants(t.data); setRevenue(r.data); setAdmins(a.data);
    setLeads(l.data); setBlueprints(b.data); setMargin(m.data); setAudit(au.data);
    setTests(pt.data);
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      const o = await fetchPlatformOverview();
      if (!active) return;
      if (!o.data) { setDenied(true); setLoading(false); return; }
      setOv(o.data);
      await reload();
      if (active) setLoading(false);
    })();
    return () => { active = false; };
  }, [reload]);

  /** Every mutation goes through here so the audit trail and the UI stay in step. */
  async function act(fn: () => Promise<{ ok: boolean; error: string | null }>, okMsg: string) {
    if (busy) return;
    setBusy(true);
    const r = await fn();
    setBusy(false);
    if (!r.ok) { toastError(r.error ?? "That didn't work."); return; }
    toast(okMsg);
    reload();
  }

  if (loading) return <p className="neutral-500">Loading platform data…</p>;

  if (denied) {
    return (
      <div className="bg-neutral-0 rounded-4 p-5 border-100 text-center">
        <h2 className="fw-600 mb-2" style={{ fontSize: 20 }}>Platform</h2>
        <p className="neutral-500 mb-0">This module is for Phoxta platform administrators. Your account isn't on that list.</p>
      </div>
    );
  }

  return (
    <div className="d-flex flex-column gap-4">
      <div className="d-flex gap-2 flex-wrap">
        {SECTIONS.map((s) => (
          <button
            key={s}
            type="button"
            aria-pressed={section === s}
            onClick={() => setSection(s)}
            className={`btn btn-sm rounded-pill px-3 ${section === s ? "btn-dark" : "btn-outline-dark"}`}
          >
            {s}
          </button>
        ))}
      </div>

      {/* ── Overview ─────────────────────────────────────────────────────── */}
      {section === "Overview" && ov && (
        <>
          <div className="row g-3">
            <Stat label="Customers" value={num(ov.tenants_total)} sub={`${num(ov.tenants_active)} active · ${num(ov.tenants_new_30d)} new in 30d`} />
            <Stat label="Revenue (all time)" value={money(ov.revenue_cents)} sub={`${money(ov.revenue_30d_cents)} in the last 30 days`} />
            <Stat label="Active subscriptions" value={num(ov.subs_active)} sub={`${num(ov.purchases_total)} purchases total`} />
            <Stat label="Leads" value={num(ov.leads_total)} sub={`${num(ov.leads_new_30d)} in the last 30 days`} />
            <Stat label="Blueprints live" value={num(ov.blueprints_live)} sub="buyable right now" />
            <Stat label="Custom domains live" value={num(ov.domains_live)} />
            <Stat label="AI tokens (30d)" value={num(ov.ai_tokens_30d)} sub="across all tenants" />
          </div>

          <Card title="Purchases" count={revenue.length}>
            {revenue.length === 0 ? <p className="neutral-500 mb-0 fz-font-md">No purchases yet.</p> : (
              <div className="table-responsive">
                <table className="table align-middle mb-0 fz-font-md">
                  <thead><tr className="neutral-500 fz-font-sm"><th>Blueprint</th><th>Customer</th><th>Status</th><th className="text-end">Amount</th><th>When</th></tr></thead>
                  <tbody>
                    {revenue.map((p) => (
                      <tr key={p.id}>
                        <td className="fw-600">{p.blueprint_name || "—"}</td>
                        <td className="neutral-500">{p.org_name || "—"}</td>
                        <td><span className="badge bg-neutral-100 neutral-700 text-capitalize fw-500">{p.status}</span></td>
                        <td className="text-end">{money(p.amount_cents, p.currency)}</td>
                        <td className="neutral-500">{day(p.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </>
      )}

      {/* ── Customers ────────────────────────────────────────────────────── */}
      {section === "Customers" && (
        <Card title="Customers" count={tenants.length}>
          {tenants.length === 0 ? <p className="neutral-500 mb-0 fz-font-md">No customers yet.</p> : (
            <div className="table-responsive">
              <table className="table align-middle mb-0 fz-font-md">
                <thead>
                  <tr className="neutral-500 fz-font-sm">
                    <th>Business</th><th>Stage</th><th>Plan</th><th>Subscription</th>
                    <th className="text-end">Tokens 30d</th><th>Joined</th><th />
                  </tr>
                </thead>
                <tbody>
                  {tenants.map((t) => (
                    <tr key={t.id}>
                      <td>
                        <div className="fw-600">{t.name}</div>
                        <div className="neutral-500 fz-font-sm text-capitalize">{t.vertical || "—"}</div>
                      </td>
                      <td>
                        <select
                          className="form-select form-select-sm rounded-3" style={{ minWidth: 110 }}
                          value={t.stage} disabled={busy}
                          onChange={(e) => act(() => setTenantStage(t.id, e.target.value), `${t.name} is now ${e.target.value}.`)}
                        >
                          {["active", "trial", "archived"].map((s) => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </td>
                      <td>
                        <select
                          className="form-select form-select-sm rounded-3" style={{ minWidth: 120 }}
                          value={t.plan ?? "starter"} disabled={busy}
                          onChange={(e) => act(() => setTenantSubscription(t.id, e.target.value, null), `${t.name} moved to ${e.target.value}.`)}
                        >
                          {["starter", "growth", "scale", "enterprise"].map((p) => <option key={p} value={p}>{p}</option>)}
                        </select>
                      </td>
                      <td>
                        <select
                          className="form-select form-select-sm rounded-3" style={{ minWidth: 120 }}
                          value={t.sub_status ?? "active"} disabled={busy}
                          onChange={(e) => act(() => setTenantSubscription(t.id, null, e.target.value), `${t.name} subscription ${e.target.value}.`)}
                        >
                          {["trialing", "active", "past_due", "canceled"].map((s) => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </td>
                      <td className="text-end">{num(t.tokens_30d)}</td>
                      <td className="neutral-500">{day(t.created_at)}</td>
                      <td className="text-end">
                        <div className="d-flex gap-2 justify-content-end">
                          <button
                            type="button" className="btn btn-sm btn-outline-dark rounded-pill px-3" disabled={busy}
                            title="Adds you as a member of this business so you can open their console. Revocable, and recorded in the audit log."
                            onClick={() => act(() => setSupportAccess(t.id, true), `Support access granted on ${t.name}.`)}
                          >
                            Support access
                          </button>
                          <Link className="btn btn-dark btn-sm rounded-pill px-3" to={`/dashboard/businesses/${t.id}/ops`}>Open</Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* ── Blueprints ───────────────────────────────────────────────────── */}
      {section === "Blueprints" && (
        <Card title="Blueprints" count={blueprints.length}>
          <p className="neutral-500 fz-font-md mb-3">
            What the marketplace sells, and what the platform agent quotes — it reads this table live.
          </p>
          <div className="d-flex flex-column gap-3">
            {blueprints.map((b) => {
              const e = edit[b.id] ?? {};
              const val = <K extends keyof PlatformBlueprint>(k: K) => (e[k] ?? b[k]) as PlatformBlueprint[K];
              const dirty = Object.keys(e).length > 0;
              return (
                <div key={b.id} className="border-100 rounded-4 p-3">
                  <div className="row g-2 align-items-end">
                    <div className="col-md-3">
                      <label className="neutral-500 fz-font-sm" htmlFor={`n-${b.id}`}>Name</label>
                      <input id={`n-${b.id}`} className="form-control form-control-sm rounded-3" value={String(val("name"))}
                             onChange={(ev) => setEdit((s) => ({ ...s, [b.id]: { ...e, name: ev.target.value } }))} />
                    </div>
                    <div className="col-md-5">
                      <label className="neutral-500 fz-font-sm" htmlFor={`t-${b.id}`}>Tagline</label>
                      <input id={`t-${b.id}`} className="form-control form-control-sm rounded-3" value={String(val("tagline"))}
                             onChange={(ev) => setEdit((s) => ({ ...s, [b.id]: { ...e, tagline: ev.target.value } }))} />
                    </div>
                    <div className="col-md-2">
                      <label className="neutral-500 fz-font-sm" htmlFor={`p-${b.id}`}>Price ({b.currency})</label>
                      <input id={`p-${b.id}`} type="number" min={0} className="form-control form-control-sm rounded-3"
                             value={Number(val("price_cents")) / 100}
                             onChange={(ev) => setEdit((s) => ({ ...s, [b.id]: { ...e, price_cents: Math.round(Number(ev.target.value) * 100) } }))} />
                    </div>
                    <div className="col-md-2">
                      <label className="neutral-500 fz-font-sm" htmlFor={`s-${b.id}`}>Status</label>
                      <select id={`s-${b.id}`} className="form-select form-select-sm rounded-3" value={String(val("status"))}
                              onChange={(ev) => setEdit((s) => ({ ...s, [b.id]: { ...e, status: ev.target.value } }))}>
                        {["draft", "live", "archived"].map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="d-flex align-items-center gap-3 mt-2">
                    {b.demo_url && <a className="fz-font-sm" href={b.demo_url} target="_blank" rel="noreferrer">Demo ↗</a>}
                    <button
                      type="button" className="btn btn-dark btn-sm rounded-pill px-3 ms-auto" disabled={busy || !dirty}
                      onClick={() => act(
                        () => savePlatformBlueprint(b.id, e.name ?? null, e.tagline ?? null, e.price_cents ?? null, e.status ?? null),
                        `${b.name} saved.`,
                      ).then(() => setEdit((s) => { const n = { ...s }; delete n[b.id]; return n; }))}
                    >
                      {dirty ? "Save" : "Saved"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* ── Leads ────────────────────────────────────────────────────────── */}
      {section === "Leads" && (
        <Card title="Leads" count={leads.length}>
          <p className="neutral-500 fz-font-md mb-3">
            From the contact form, Startup School and careers. Counted on the Overview; worked here.
          </p>
          {leads.length === 0 ? <p className="neutral-500 mb-0 fz-font-md">No leads yet.</p> : (
            <div className="d-flex flex-column gap-3">
              {leads.map((l) => (
                <div key={l.id} className="border-100 rounded-4 p-3">
                  <div className="d-flex align-items-center gap-2 flex-wrap mb-1">
                    <b>{l.name || "Someone"}</b>
                    <span className="neutral-500 fz-font-sm">{l.email}{l.phone ? ` · ${l.phone}` : ""}</span>
                    <span className="badge bg-neutral-100 neutral-700 fw-500 text-capitalize">{l.source}</span>
                    <span className="neutral-500 fz-font-sm ms-auto">{day(l.created_at)}</span>
                  </div>
                  {l.message && <p className="fz-font-md mb-2" style={{ whiteSpace: "pre-wrap" }}>{l.message}</p>}
                  <div className="d-flex gap-2 align-items-center flex-wrap">
                    <select
                      className="form-select form-select-sm rounded-3" style={{ maxWidth: 150 }}
                      value={l.status} disabled={busy}
                      onChange={(ev) => act(() => savePlatformLead(l.id, ev.target.value, null), "Lead updated.")}
                    >
                      {LEAD_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <input
                      className="form-control form-control-sm rounded-3" style={{ maxWidth: 380 }}
                      placeholder="Note…" defaultValue={l.notes}
                      onBlur={(ev) => { if (ev.target.value !== l.notes) act(() => savePlatformLead(l.id, null, ev.target.value), "Note saved."); }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* ── Margin ───────────────────────────────────────────────────────── */}
      {section === "Margin" && (
        <Card title="AI margin (30 days)" count={margin.length}>
          <p className="neutral-500 fz-font-md mb-3">
            What each customer paid against what their AI usage cost. A proxy, not accounting — infrastructure
            isn't attributed per tenant, so read it as AI margin rather than profit.
          </p>
          <div className="table-responsive">
            <table className="table align-middle mb-0 fz-font-md">
              <thead><tr className="neutral-500 fz-font-sm"><th>Business</th><th className="text-end">Revenue</th><th className="text-end">AI cost</th><th className="text-end">Margin</th><th className="text-end">Tokens</th></tr></thead>
              <tbody>
                {margin.map((m) => {
                  const net = m.revenue_cents - m.ai_cost_cents;
                  return (
                    <tr key={m.organization_id}>
                      <td className="fw-600">{m.name}</td>
                      <td className="text-end">{money(m.revenue_cents)}</td>
                      <td className="text-end">{money(m.ai_cost_cents)}</td>
                      <td className={`text-end fw-600 ${net < 0 ? "text-danger" : ""}`}>{money(net)}</td>
                      <td className="text-end neutral-500">{num(m.tokens)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ── Access ───────────────────────────────────────────────────────── */}
      {section === "Payments" && (
        <>
          <div className="bg-neutral-0 rounded-4 p-4 border-100 mb-3">
            <h3 className="fz-font-md fw-600 mb-1">Test a payment</h3>
            <p className="fz-font-sm neutral-500 mb-3">
              Puts a real charge through Stripe and then waits to see whether{" "}
              <b>stripe-webhook</b> ran. Those are different things: a card can be charged while the
              webhook never fires — which is what a live key wired to a test-mode signing secret
              looks like — and the webhook is the half that provisions businesses.
            </p>
            <form
              className="row g-2 align-items-end"
              onSubmit={async (e: FormEvent) => {
                e.preventDefault();
                const pence = Math.round(parseFloat(testAmount || "0") * 100);
                if (!Number.isFinite(pence) || pence < 50) {
                  toastError("Enter at least £0.50 — Stripe refuses anything smaller.");
                  return;
                }
                setTesting(true);
                const { url, error } = await startPaymentTest(pence, testNote.trim());
                setTesting(false);
                if (error || !url) {
                  toastError(error ?? "Could not start the test.");
                  return;
                }
                window.location.assign(url);
              }}
            >
              <div className="col-sm-3">
                <label htmlFor="pt-amount" className="form-label fz-font-sm neutral-500 mb-1">Amount (£)</label>
                <input
                  id="pt-amount" className="form-control rounded-3" inputMode="decimal"
                  value={testAmount} onChange={(e) => setTestAmount(e.target.value)}
                />
              </div>
              <div className="col-sm-6">
                <label htmlFor="pt-note" className="form-label fz-font-sm neutral-500 mb-1">Note (optional)</label>
                <input
                  id="pt-note" className="form-control rounded-3" placeholder="What are you checking?"
                  value={testNote} onChange={(e) => setTestNote(e.target.value)}
                />
              </div>
              <div className="col-sm-3">
                <button className="btn btn-dark rounded-3 w-100 ops-tap" disabled={testing}>
                  {testing ? "Starting…" : "Pay with Stripe"}
                </button>
              </div>
            </form>
            <p className="fz-font-sm neutral-500 mb-0 mt-2">
              Capped at £100. With a live key this charges a real card — use test card
              <code className="ms-1">4242 4242 4242 4242</code> while your key is <code>sk_test_…</code>.
            </p>
          </div>

          <div className="bg-neutral-0 rounded-4 p-4 border-100">
            <div className="d-flex align-items-center justify-content-between mb-2">
              <h3 className="fz-font-md fw-600 mb-0">Recent tests</h3>
              <button type="button" className="btn btn-outline-dark btn-sm rounded-3 ops-tap"
                      onClick={async () => { const { data } = await listPaymentTests(); setTests(data); toast("Refreshed."); }}>
                Refresh
              </button>
            </div>
            {tests.length === 0 ? (
              <p className="fz-font-sm neutral-500 mb-0">No tests yet.</p>
            ) : (
              <div className="table-responsive">
                <table className="table table-sm align-middle mb-0">
                  <thead>
                    <tr className="fz-font-sm neutral-500">
                      <th>When</th><th>Amount</th><th>Note</th><th>Charged</th><th>Webhook ran</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tests.map((t) => (
                      <tr key={t.id} className="fz-font-md">
                        <td className="neutral-500">{new Date(t.created_at).toLocaleString()}</td>
                        <td>{money(t.amount_cents, t.currency)}</td>
                        <td className="neutral-500">{t.note || "—"}</td>
                        <td>
                          <span className={`badge fw-500 ${t.status === "paid" ? "bg-success-subtle text-success" : "bg-neutral-100 neutral-700"}`}>
                            {t.status}
                          </span>
                        </td>
                        <td>
                          {t.webhook_seen_at ? (
                            <span className="badge bg-success-subtle text-success fw-500">
                              {new Date(t.webhook_seen_at).toLocaleTimeString()}
                            </span>
                          ) : t.status === "paid" ? (
                            // Paid but never stamped: the money moved and the code
                            // that fulfils orders did not run.
                            <span className="badge bg-danger-subtle text-danger fw-500">never arrived</span>
                          ) : (
                            <span className="neutral-400">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {section === "Access" && (
        <>
          <Card title="Platform access" count={admins.length}>
            <p className="neutral-500 fz-font-md mb-3">
              These accounts can see every customer's revenue, usage and domains, and can change what a
              customer pays. Add sparingly.
            </p>
            <form
              className="d-flex gap-2 flex-wrap mb-3"
              onSubmit={(e: FormEvent) => {
                e.preventDefault();
                const email = adminEmail.trim();
                if (!email) return;
                act(() => addPlatformAdmin(email), `${email} can now open the platform console.`).then(() => setAdminEmail(""));
              }}
            >
              <input className="form-control rounded-3" style={{ maxWidth: 320 }} type="email"
                     placeholder="teammate@phoxta.com" aria-label="Email of the admin to add"
                     value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} />
              <button className="btn btn-dark btn-sm rounded-pill px-3" disabled={busy || !adminEmail.trim()}>Add admin</button>
            </form>
            <ul className="list-unstyled m-0 d-flex flex-column gap-2">
              {admins.map((a) => (
                <li key={a.user_id} className="d-flex align-items-center gap-3 flex-wrap">
                  <span className="fw-600 fz-font-md">{a.email}</span>
                  <span className="badge bg-neutral-100 neutral-700 fw-500">{a.note || "admin"}</span>
                  <span className="neutral-500 fz-font-sm">since {day(a.created_at)}</span>
                  <button type="button" className="btn btn-sm btn-outline-dark rounded-pill px-3 ms-auto" disabled={busy}
                          onClick={() => act(() => removePlatformAdmin(a.user_id), `${a.email} no longer has platform access.`)}>
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          </Card>

          <Card title="Audit" count={audit.length}>
            <p className="neutral-500 fz-font-md mb-3">
              Every platform write — who did it, to what, and when.
            </p>
            {audit.length === 0 ? <p className="neutral-500 mb-0 fz-font-md">Nothing yet.</p> : (
              <div className="table-responsive">
                <table className="table align-middle mb-0 fz-font-md">
                  <thead><tr className="neutral-500 fz-font-sm"><th>Action</th><th>Target</th><th>By</th><th>When</th></tr></thead>
                  <tbody>
                    {audit.map((a) => (
                      <tr key={a.id}>
                        <td className="fw-600">{a.action}</td>
                        <td className="neutral-500" style={{ maxWidth: 260, overflowWrap: "anywhere" }}>{a.target}</td>
                        <td className="neutral-500">{a.actor_email || "—"}</td>
                        <td className="neutral-500">{day(a.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
