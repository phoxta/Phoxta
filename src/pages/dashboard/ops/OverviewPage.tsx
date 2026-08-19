import { useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { useCachedData } from "@/lib/hooks/useCachedData";
import { DASHBOARD_TTL, getOpsWindow, type OpsWindow } from "@/lib/cache/dashboardQueries";
import { getOpsSummary } from "@/lib/db/ops/analytics";
import { invokeAction } from "@/lib/db/ops/ai";
import { formatPrice } from "@/lib/db/marketplace";
import type { OpsContext } from "@/layouts/OperatingLayout";

// ---------- Ask-your-data local history (per org, last 5) ----------
type AskEntry = { q: string; a: string; at: number };
const askKey = (orgId: string) => `phoxta:ops:ask:${orgId}`;
function loadAskHistory(orgId: string): AskEntry[] {
  try {
    const raw = localStorage.getItem(askKey(orgId));
    const parsed = raw ? (JSON.parse(raw) as AskEntry[]) : [];
    return Array.isArray(parsed) ? parsed.slice(0, 5) : [];
  } catch {
    return [];
  }
}
function saveAskHistory(orgId: string, entries: AskEntry[]): void {
  try {
    localStorage.setItem(askKey(orgId), JSON.stringify(entries.slice(0, 5)));
  } catch {
    /* storage full / private mode — history is a nicety */
  }
}

/** Green-up / red-down delta vs the previous 30-day window. */
function Delta({ now, prev }: { now: number; prev: number }) {
  if (prev <= 0 && now <= 0) return null;
  const up = now >= prev;
  const pct = prev > 0 ? Math.round((Math.abs(now - prev) / prev) * 100) : null;
  return (
    <span className={`fz-font-sm fw-600 ${up ? "text-success" : "text-danger"}`}>
      {up ? "▲" : "▼"} {pct != null ? `${pct}%` : "new"}
    </span>
  );
}

export default function OverviewPage() {
  const { orgId, org, console: cfg } = useOutletContext<OpsContext>();
  const { data, loading } = useCachedData(
    `ops:overview:v2:${orgId}`,
    async () => {
      // Fetch the windowed RPC and the all-time summary independently so one
      // failing doesn't blank the other (per-card error handling).
      const [winRes, sum] = await Promise.all([
        getOpsWindow(orgId)
          .then((w) => ({ w, e: null as string | null }))
          .catch((e: unknown) => ({ w: null as OpsWindow | null, e: e instanceof Error ? e.message : String(e) })),
        getOpsSummary(orgId),
      ]);
      return { win: winRes.w, winError: winRes.e, s: sum.data, sumError: sum.error };
    },
    { ttl: DASHBOARD_TTL },
  );
  const s = data?.s ?? null;
  const win = data?.win ?? null;
  const currency = win?.currency || org.currency || "USD";

  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [asking, setAsking] = useState(false);
  const [askError, setAskError] = useState<string | null>(null);
  const [history, setHistory] = useState<AskEntry[]>(() => loadAskHistory(orgId));

  async function runQuestion(q: string) {
    const text = q.trim();
    if (!text || asking) return;
    setAsking(true);
    setAskError(null);
    setAnswer(null);
    const { data: res, error } = await invokeAction<{ answer: string }>(orgId, "ask_data", { question: text });
    setAsking(false);
    if (error) {
      setAskError(error);
      return;
    }
    const a = res?.answer ?? "";
    setAnswer(a || null);
    if (a) {
      const next = [{ q: text, a, at: Date.now() }, ...history].slice(0, 5);
      setHistory(next);
      saveAskHistory(orgId, next);
    }
  }

  function ask(e: React.FormEvent) {
    e.preventDefault();
    void runQuestion(question);
  }

  // Vertical-aware config.
  const isBooking = cfg.booking === "reservations";
  const isAppointments = cfg.booking === "appointments";
  const isRetail = cfg.booking === "none";
  const isRestaurant = cfg.commerceLabel === "Menu";
  const has = (m: string) => cfg.modules.includes(m);
  const noun = cfg.itemNoun.toLowerCase();
  const bookingSeg = isAppointments ? "bookings" : "reservations";

  // ---------- Needs-attention queue (from the windowed RPC) ----------
  type Attention = { label: string; count: number; to: string; danger?: boolean };
  const attention: Attention[] = win
    ? ([
        { label: "Pending approvals", count: win.approvals, to: "agent/operator" },
        { label: "Unread conversations", count: win.unread, to: "inbox" },
        { label: "Escalated conversations", count: win.escalated, to: "inbox", danger: true },
        ...(has("commerce") ? [{ label: "Unfulfilled paid orders", count: win.unfulfilled, to: "commerce" }] : []),
        ...(has("commerce") ? [{ label: "Low stock", count: win.low_stock, to: "commerce" }] : []),
        ...(isBooking
          ? [
              { label: "Arrivals today", count: win.arrivals_today, to: bookingSeg },
              { label: "Departures today", count: win.departures_today, to: bookingSeg },
            ]
          : []),
        ...(isAppointments ? [{ label: "Appointments today", count: win.bookings_today, to: bookingSeg }] : []),
        ...(has("invoicing") ? [{ label: "Overdue invoices", count: win.overdue_invoices, to: "invoicing", danger: true }] : []),
      ] as Attention[]).filter((a) => a.count > 0)
    : [];

  // ---------- Windowed KPI tiles ----------
  const stats: { label: string; value: string; delta?: { now: number; prev: number }; sub?: string; to?: string }[] = [
    {
      label: "Revenue (30d)",
      value: formatPrice(win?.revenue ?? 0, currency),
      delta: win ? { now: win.revenue, prev: win.revenue_prev } : undefined,
      sub: s ? `${formatPrice(s.revenue_cents ?? 0, currency)} all-time` : undefined,
      to: "commerce",
    },
    {
      label: "Orders (30d)",
      value: String(win?.orders ?? 0),
      delta: win ? { now: win.orders, prev: win.orders_prev } : undefined,
      sub: s ? `${s.orders ?? 0} all-time` : undefined,
      to: "commerce",
    },
    ...(isBooking
      ? [
          {
            label: "Upcoming reservations",
            value: String(win?.reservations_upcoming ?? 0),
            sub: `${win?.reservations_pending ?? 0} pending`,
            to: "reservations",
          },
          { label: cfg.commerceLabel, value: String(s?.products ?? 0), sub: `${noun} listings`, to: "commerce" },
        ]
      : []),
    { label: "Customers", value: String(s?.customers ?? 0), sub: `${s?.contacts ?? 0} contacts`, to: "crm" },
    ...(isRetail || isRestaurant
      ? [
          { label: "Unfulfilled orders", value: String(win?.unfulfilled ?? 0), to: "commerce" },
          { label: "Low stock", value: String(win?.low_stock ?? 0), sub: `${s?.products ?? 0} ${noun}s`, to: "commerce" },
        ]
      : []),
    ...(has("invoicing")
      ? [
          { label: "Outstanding invoices", value: formatPrice(s?.outstanding_cents ?? 0, currency), to: "invoicing" },
          ...((s?.active_subs ?? 0) > 0
            ? [{ label: "Active subscriptions", value: String(s?.active_subs ?? 0), to: "invoicing" }]
            : []),
        ]
      : []),
    ...(has("bookings") ? [{ label: "Upcoming appointments", value: String(s?.upcoming_bookings ?? 0), to: "bookings" }] : []),
    { label: "Open tickets", value: String(s?.open_tickets ?? 0), sub: `${s?.ai_deflected ?? 0} AI-deflected`, to: "inbox" },
  ];

  // ---------- Deterministic run-rate projection (no LLM) ----------
  // Last 30 days extrapolated forward, adjusted by the trend vs the prior
  // window and clamped so a tiny base can't project absurd growth.
  const trend = win && win.revenue_prev > 0 ? win.revenue / win.revenue_prev : 1;
  const clampedTrend = Math.min(Math.max(trend, 0.25), 3);
  const projectedRevenue = win ? Math.round(win.revenue * clampedTrend) : 0;
  const projectedOrders = win ? Math.round(win.orders * (win.orders_prev > 0 ? Math.min(Math.max(win.orders / win.orders_prev, 0.25), 3) : 1)) : 0;

  // Example questions tailored to the vertical.
  const chips: string[] = isRetail
    ? ["What's my best-selling product this month?", "Which customers haven't ordered in 60 days?", "How is revenue trending week over week?"]
    : isRestaurant
      ? ["What's my best-selling menu item?", "How many table reservations do I have this week?", "Who are my repeat customers?"]
      : isAppointments
        ? ["Which service gets booked the most?", "How many appointments were missed this month?", "Who are my top customers by spend?"]
        : [`Which ${noun} gets booked the most?`, "How full are the next 14 days?", "Who are my repeat customers?"];

  if (loading) return <div className="bg-neutral-0 rounded-4 p-5 border-100 text-center neutral-500">Loading…</div>;

  return (
    <div>
      {/* ---------- Needs attention ---------- */}
      <div className="mb-4">
        <div className="fz-font-sm fw-600 neutral-500 text-uppercase mb-2">Needs attention</div>
        {data?.winError ? (
          <div className="bg-neutral-0 rounded-4 p-3 border-100 fz-font-md text-danger">
            Couldn't load today's queue: {data.winError}
          </div>
        ) : attention.length === 0 ? (
          <div className="bg-neutral-0 rounded-4 p-3 border-100 fz-font-md neutral-500">
            All clear — nothing needs you right now.
          </div>
        ) : (
          <div className="row g-2">
            {attention.map((a) => (
              <div key={a.label} className="col-xl-3 col-md-4 col-sm-6">
                <Link to={a.to} className="text-decoration-none d-block h-100">
                  <div className="bg-neutral-0 rounded-4 p-3 h-100 border-100 d-flex align-items-center gap-3">
                    <span className={`fz-24 fw-700 lh-1 ${a.danger ? "text-danger" : "neutral-900"}`}>{a.count}</span>
                    <span className="fz-font-md neutral-700">{a.label}</span>
                    <span className="ms-auto neutral-500" aria-hidden="true">→</span>
                  </div>
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ---------- KPI tiles ---------- */}
      <div className="row g-3 mb-4">
        {stats.map((stat) => {
          const inner = (
            <div className="bg-neutral-0 rounded-4 p-4 h-100 border-100">
              <div className="fz-font-md neutral-500 mb-2">{stat.label}</div>
              <div className="d-flex align-items-baseline gap-2">
                <div className="fz-40 fw-700 lh-1 neutral-900">{stat.value}</div>
                {stat.delta && <Delta now={stat.delta.now} prev={stat.delta.prev} />}
              </div>
              {stat.sub && <div className="fz-font-sm neutral-500 mt-1">{stat.sub}</div>}
            </div>
          );
          return (
            <div key={stat.label} className="col-xl-3 col-md-4 col-sm-6">
              {stat.to ? <Link to={stat.to} className="text-decoration-none d-block h-100">{inner}</Link> : inner}
            </div>
          );
        })}
      </div>
      {data?.sumError && (
        <div className="fz-font-sm text-danger mb-4">Some all-time totals failed to load: {data.sumError}</div>
      )}

      <div className="row g-4">
        {/* ---------- Ask your data ---------- */}
        <div className="col-lg-7">
          <div className="bg-neutral-0 rounded-4 p-4 border-100 h-100">
            <h6 className="fw-600 mb-3">✨ Ask your data</h6>
            <form onSubmit={ask} className="d-flex gap-2">
              <input
                className="form-control rounded-3"
                aria-label="Ask a question about your business data"
                placeholder="Ask anything about your business…"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
              />
              <button type="submit" className="btn btn-dark rounded-3 px-4" disabled={asking}>
                {asking ? "Thinking…" : "Ask"}
              </button>
            </form>
            <div className="d-flex flex-wrap gap-2 mt-3">
              {chips.map((c) => (
                <button
                  key={c}
                  type="button"
                  className="btn btn-outline-dark btn-sm rounded-pill px-3"
                  disabled={asking}
                  onClick={() => {
                    setQuestion(c);
                    void runQuestion(c);
                  }}
                >
                  {c}
                </button>
              ))}
            </div>
            {askError && <div className="mt-3 fz-font-sm text-danger">{askError}</div>}
            {answer && (
              <div className="mt-3 p-3 bg-neutral-50 rounded-3 fz-font-md neutral-900" style={{ whiteSpace: "pre-wrap" }}>
                {answer}
              </div>
            )}
            {history.length > 0 && (
              <details className="mt-3">
                <summary className="fz-font-sm neutral-500" style={{ cursor: "pointer" }}>
                  Recent answers ({history.length})
                </summary>
                <ul className="list-unstyled m-0 mt-2 d-flex flex-column gap-2">
                  {history.map((h) => (
                    <li key={h.at} className="p-3 bg-neutral-50 rounded-3">
                      <div className="fw-600 fz-font-sm neutral-700 mb-1">{h.q}</div>
                      <div className="fz-font-sm neutral-500" style={{ whiteSpace: "pre-wrap" }}>{h.a}</div>
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </div>
        </div>

        {/* ---------- Run-rate projection (deterministic, no LLM) ---------- */}
        <div className="col-lg-5">
          <div className="bg-neutral-0 rounded-4 p-4 border-100 h-100">
            <h6 className="fw-600 mb-3">Run-rate projection</h6>
            {win ? (
              <>
                <div className="fz-40 fw-700 lh-1 neutral-900">{formatPrice(projectedRevenue, currency)}</div>
                <div className="fz-font-sm neutral-500 mb-2">~{projectedOrders} orders over the next 30 days</div>
                <p className="fz-font-md neutral-700 mb-0">
                  Last 30 days ({formatPrice(win.revenue, currency)}, {win.orders} orders) carried forward at the current
                  trend vs the prior 30 days. Computed from your data — no AI involved.
                </p>
              </>
            ) : (
              <p className="fz-font-md text-danger mb-0">
                {data?.winError ? `Couldn't load the 30-day window: ${data.winError}` : "No window data yet."}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
