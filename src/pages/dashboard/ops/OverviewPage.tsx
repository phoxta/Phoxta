import { useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { useCachedData } from "@/lib/hooks/useCachedData";
import { DASHBOARD_TTL, getOpsWindow, type OpsWindow } from "@/lib/cache/dashboardQueries";
import { getOpsSummary } from "@/lib/db/ops/analytics";
import { invokeAction } from "@/lib/db/ops/ai";
import { formatPrice } from "@/lib/db/marketplace";
import type { OpsContext } from "@/layouts/OperatingLayout";

/**
 * One stat-tile treatment for the whole console. Kept local (and identical in
 * agent/AgentOverviewPage.tsx) so the global stylesheet stays untouched:
 * - a tile that navigates gets the white card, the trailing arrow and a hover lift
 * - a tile that doesn't navigate is recessed (bg-neutral-50) and has no arrow
 * - numerals shrink one step on phones so a long currency string never
 *   overflows a two-up grid at 390px.
 */
const TILE_CSS = `
.ops-tile{transition:border-color .15s ease,box-shadow .15s ease}
.ops-tile-value,.ops-attn-value{overflow-wrap:anywhere}
@media (max-width:575.98px){.ops-tile-value{font-size:24px}.ops-attn-value{font-size:32px}}
.ops-tile-link{display:block;width:100%;height:100%;padding:0;border:0;background:transparent;text-align:left;text-decoration:none}
.ops-tile-link:hover .ops-tile,.ops-tile-link:focus-visible .ops-tile{border-color:var(--at-neutral-300)!important;box-shadow:0 6px 20px rgba(0,0,0,.07)}
.ops-tile-link:hover .ops-tile-arrow{transform:translateX(3px)}
.ops-tile-arrow{display:inline-block;transition:transform .15s ease}
.ops-attn-card{box-shadow:0 2px 10px rgba(0,0,0,.05)}
`;

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
      <span aria-hidden="true">{up ? "▲" : "▼"}</span>
      {/* Direction is spoken, not just coloured. */}
      <span className="visually-hidden">{up ? " up " : " down "}</span> {pct != null ? `${pct}%` : "new"}
    </span>
  );
}

type Kpi = {
  label: string;
  value: string;
  delta?: { now: number; prev: number };
  sub?: string;
  to?: string;
  /** Marks a number that also appears in the needs-attention queue. */
  dup?: string;
  /** Which query produced the number — "win" tiles go blank if that RPC failed. */
  src?: "win" | "sum";
};

/** The shared stat tile. `to` present = navigates (arrow + hover). */
function StatTile({ label, value, sub, delta, to, src, winFailed }: Kpi & { winFailed?: boolean }) {
  // A failed 30-day window must not read as a real zero — the tile goes to an
  // em dash and says so, rather than claiming "$0 revenue".
  const failed = src === "win" && winFailed;
  const body = (
    <div className={`ops-tile rounded-4 p-3 p-md-4 h-100 border-100 ${to ? "bg-neutral-0" : "bg-neutral-50"}`}>
      <div className="d-flex align-items-start gap-2 mb-2">
        <span className="fz-font-sm neutral-500">{label}</span>
        {to && (
          <span className="ms-auto neutral-400 ops-tile-arrow" aria-hidden="true">
            →
          </span>
        )}
      </div>
      <div className="d-flex align-items-baseline flex-wrap gap-2">
        <span className="fz-32 ops-tile-value fw-700 lh-1 neutral-900">{failed ? "—" : value}</span>
        {!failed && delta && <Delta now={delta.now} prev={delta.prev} />}
      </div>
      {failed ? (
        <div className="fz-font-sm neutral-500 mt-1">Couldn't load</div>
      ) : (
        sub && <div className="fz-font-sm neutral-400 mt-1">{sub}</div>
      )}
    </div>
  );
  return (
    <div className="col-6 col-md-4 col-xl-3">
      {to ? (
        <Link to={to} className="ops-tile-link text-decoration-none">
          {body}
        </Link>
      ) : (
        body
      )}
    </div>
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
  type Attention = { label: string; count: number; to: string; danger?: boolean; dup?: string };
  const attention: Attention[] = win
    ? ([
        { label: "Pending approvals", count: win.approvals, to: "agent/operator" },
        { label: "Unread conversations", count: win.unread, to: "inbox" },
        { label: "Escalated conversations", count: win.escalated, to: "inbox", danger: true },
        ...(has("commerce")
          ? [{ label: "Unfulfilled paid orders", count: win.unfulfilled, to: "commerce", dup: "unfulfilled" }]
          : []),
        ...(has("commerce") ? [{ label: "Low stock", count: win.low_stock, to: "commerce", dup: "low_stock" }] : []),
        ...(isBooking
          ? [
              { label: "Arrivals today", count: win.arrivals_today, to: bookingSeg },
              { label: "Departures today", count: win.departures_today, to: bookingSeg },
            ]
          : []),
        ...(isAppointments ? [{ label: "Appointments today", count: win.bookings_today, to: bookingSeg }] : []),
        ...(has("invoicing")
          ? [{ label: "Overdue invoices", count: win.overdue_invoices, to: "invoicing", danger: true }]
          : []),
      ] as Attention[]).filter((a) => a.count > 0)
    : [];

  // Numbers already surfaced (bigger) in the queue above are dropped from the
  // KPI grid so the same figure is never rendered twice.
  const queued = new Set(attention.map((a) => a.dup).filter((d): d is string => Boolean(d)));

  // The catalogue subtitle only earns its place when the noun says something the
  // module label doesn't — otherwise STAYS renders "Listings / listing listings".
  const listingSub = noun === cfg.commerceLabel.toLowerCase().replace(/s$/, "") ? undefined : `${noun} listings`;

  // ---------- Windowed KPI tiles (the quieter second tier) ----------
  const allStats: Kpi[] = [
    {
      label: "Revenue (30d)",
      value: formatPrice(win?.revenue ?? 0, currency),
      delta: win ? { now: win.revenue, prev: win.revenue_prev } : undefined,
      sub: s ? `${formatPrice(s.revenue_cents ?? 0, currency)} all-time` : undefined,
      to: "commerce",
      src: "win",
    },
    {
      label: "Orders (30d)",
      value: String(win?.orders ?? 0),
      delta: win ? { now: win.orders, prev: win.orders_prev } : undefined,
      sub: s ? `${s.orders ?? 0} all-time` : undefined,
      to: "commerce",
      src: "win",
    },
    ...(isBooking
      ? [
          {
            label: "Upcoming reservations",
            value: String(win?.reservations_upcoming ?? 0),
            sub: `${win?.reservations_pending ?? 0} pending`,
            to: "reservations",
            src: "win" as const,
          },
          { label: cfg.commerceLabel, value: String(s?.products ?? 0), sub: listingSub, to: "commerce" },
        ]
      : []),
    { label: "Customers", value: String(s?.customers ?? 0), sub: `${s?.contacts ?? 0} contacts`, to: "crm" },
    ...(isRetail || isRestaurant
      ? [
          // The listings count used to ride along as the "Low stock" sub-line;
          // it gets its own tile so nothing is lost when Low stock is already
          // in the attention queue above.
          ...(isBooking ? [] : [{ label: cfg.commerceLabel, value: String(s?.products ?? 0), sub: listingSub, to: "commerce" }]),
          { label: "Unfulfilled orders", value: String(win?.unfulfilled ?? 0), to: "commerce", dup: "unfulfilled", src: "win" as const },
          { label: "Low stock", value: String(win?.low_stock ?? 0), to: "commerce", dup: "low_stock", src: "win" as const },
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
  const stats = allStats.filter((k) => !k.dup || !queued.has(k.dup));

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

  if (loading) {
    return (
      <div className="bg-neutral-0 rounded-4 p-5 border-100 text-center neutral-500" role="status">
        Loading…
      </div>
    );
  }

  return (
    <div>
      <style>{TILE_CSS}</style>

      {/* ---------- Needs attention: the top tier of the page ---------- */}
      <section className="mb-5" aria-labelledby="ops-attention-h">
        <div className="d-flex align-items-center flex-wrap gap-2 mb-3">
          <h2 id="ops-attention-h" className="fz-font-lg fw-600 neutral-900 m-0">
            Needs attention
          </h2>
          {attention.length > 0 && (
            <span className="badge fw-500 bg-warning-subtle text-warning">
              {attention.length} {attention.length === 1 ? "item" : "items"}
            </span>
          )}
        </div>
        {data?.winError ? (
          <div className="bg-neutral-0 rounded-4 p-4 border-100 fz-font-md text-danger" role="alert">
            Couldn't load today's queue: {data.winError}
          </div>
        ) : attention.length === 0 ? (
          <div className="bg-neutral-0 rounded-4 p-4 border-100 fz-font-md neutral-500">
            All clear — nothing needs you right now.
          </div>
        ) : (
          <div className="row g-3">
            {attention.map((a) => (
              <div key={a.label} className="col-12 col-md-6 col-xl-4">
                <Link to={a.to} className="ops-tile-link text-decoration-none">
                  <div className="ops-tile ops-attn-card bg-neutral-0 rounded-4 p-4 h-100 border-100 d-flex align-items-center gap-3">
                    <span className={`fz-40 ops-attn-value fw-700 lh-1 ${a.danger ? "text-danger" : "neutral-900"}`}>
                      {a.count}
                    </span>
                    <span className="fz-font-md fw-500 neutral-900">{a.label}</span>
                    <span className="ms-auto neutral-400 ops-tile-arrow" aria-hidden="true">
                      →
                    </span>
                  </div>
                </Link>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ---------- KPI tiles: quieter second tier ---------- */}
      <section className="mb-5" aria-labelledby="ops-numbers-h">
        <h2 id="ops-numbers-h" className="fz-font-lg fw-600 neutral-900 mb-3">
          Your numbers
        </h2>
        <div className="row g-3">
          {stats.map((stat) => (
            <StatTile key={stat.label} {...stat} winFailed={Boolean(data?.winError)} />
          ))}
        </div>
        {data?.sumError && (
          <div className="fz-font-sm text-danger mt-3" role="alert">
            Some all-time totals failed to load: {data.sumError}
          </div>
        )}
      </section>

      <div className="row g-4">
        {/* ---------- Ask your data ---------- */}
        <div className="col-lg-7">
          <div className="bg-neutral-0 rounded-4 p-3 p-md-4 border-100 h-100">
            <h2 className="fz-font-lg fw-600 neutral-900 mb-1">Ask your data</h2>
            <label htmlFor="ops-ask-input" className="fz-font-sm neutral-500 d-block mb-2">
              Plain English works — you'll get an answer from your own numbers.
            </label>
            <form onSubmit={ask} className="d-flex flex-column flex-sm-row gap-2">
              <input
                id="ops-ask-input"
                className="form-control rounded-3"
                placeholder="e.g. How did last month compare?"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
              />
              <button type="submit" className="btn btn-dark rounded-3 px-4 ops-tap" disabled={asking}>
                {asking ? "Thinking…" : "Ask"}
              </button>
            </form>
            <div className="d-flex flex-wrap gap-2 mt-3">
              {chips.map((c) => (
                <button
                  key={c}
                  type="button"
                  className="btn btn-outline-dark btn-sm rounded-pill px-3 ops-tap"
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
            {askError && (
              <div className="mt-3 fz-font-sm text-danger" role="alert">
                {askError}
              </div>
            )}
            <div aria-live="polite">
              {asking && <div className="mt-3 fz-font-sm neutral-500">Reading your data…</div>}
              {answer && (
                <div className="mt-3 p-3 bg-neutral-50 rounded-3 fz-font-md neutral-900" style={{ whiteSpace: "pre-wrap" }}>
                  {answer}
                </div>
              )}
            </div>
            {history.length > 0 && (
              <details className="mt-3">
                <summary className="fz-font-sm neutral-500 ops-tap" style={{ cursor: "pointer" }}>
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
          <div className="bg-neutral-0 rounded-4 p-3 p-md-4 border-100 h-100">
            <h2 className="fz-font-lg fw-600 neutral-900 mb-3">Run-rate projection</h2>
            {win ? (
              <>
                <div className="fz-32 ops-tile-value fw-700 lh-1 neutral-900">{formatPrice(projectedRevenue, currency)}</div>
                <div className="fz-font-sm neutral-400 mt-1 mb-3">~{projectedOrders} orders over the next 30 days</div>
                <p className="fz-font-md neutral-700 mb-0">
                  Last 30 days ({formatPrice(win.revenue, currency)}, {win.orders} orders) carried forward at the current
                  trend vs the prior 30 days. Computed from your data — no AI involved.
                </p>
              </>
            ) : (
              <p className="fz-font-md text-danger mb-0" role="alert">
                {data?.winError ? `Couldn't load the 30-day window: ${data.winError}` : "No window data yet."}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
