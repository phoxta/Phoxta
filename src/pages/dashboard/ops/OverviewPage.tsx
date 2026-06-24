import { useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { useCachedData } from "@/lib/hooks/useCachedData";
import { DASHBOARD_TTL } from "@/lib/cache/dashboardQueries";
import { getOpsSummary } from "@/lib/db/ops/analytics";
import { invokeAction } from "@/lib/db/ops/ai";
import { listReservations } from "@/lib/db/ops/reservations";
import { formatPrice } from "@/lib/db/marketplace";
import type { OpsContext } from "@/layouts/OperatingLayout";

type Insight = { title: string; detail: string; severity: "info" | "warn" | "good" };
type Forecast = { revenue_next_30d_cents: number; orders_next_30d: number; narrative: string };

const SEV_STYLE: Record<string, string> = {
  good: "bg-success-subtle text-success",
  warn: "bg-warning-subtle text-warning",
  info: "bg-neutral-100 neutral-700",
};

export default function OverviewPage() {
  const { orgId, console: cfg } = useOutletContext<OpsContext>();
  const { data, loading } = useCachedData(
    `ops:overview:${orgId}`,
    async () => {
      const sum = await getOpsSummary(orgId);
      let resv = { total: 0, upcoming: 0 };
      if (cfg.booking === "reservations") {
        const r = await listReservations(orgId);
        resv = {
          total: r.data.length,
          upcoming: r.data.filter((x) => x.status === "pending" || x.status === "confirmed").length,
        };
      }
      return { s: sum.data, resv };
    },
    { ttl: DASHBOARD_TTL },
  );
  const s = data?.s ?? null;
  const resv = data?.resv ?? { total: 0, upcoming: 0 };

  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [asking, setAsking] = useState(false);
  const [insights, setInsights] = useState<Insight[] | null>(null);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [forecast, setForecast] = useState<Forecast | null>(null);
  const [forecastLoading, setForecastLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function ask(e: React.FormEvent) {
    e.preventDefault();
    if (!question.trim()) return;
    setAsking(true);
    setError(null);
    setAnswer(null);
    const { data, error } = await invokeAction<{ answer: string }>(orgId, "ask_data", { question });
    setAsking(false);
    if (error) setError(error);
    else setAnswer(data?.answer ?? null);
  }

  async function genInsights() {
    setInsightsLoading(true);
    setError(null);
    const { data, error } = await invokeAction<{ insights: Insight[] }>(orgId, "auto_insights");
    setInsightsLoading(false);
    if (error) setError(error);
    else setInsights(data?.insights ?? []);
  }

  async function genForecast() {
    setForecastLoading(true);
    setError(null);
    const { data, error } = await invokeAction<Forecast>(orgId, "forecast");
    setForecastLoading(false);
    if (error) setError(error);
    else setForecast(data);
  }

  // Vertical-aware KPIs: built from the console config so each business sees the
  // metrics that matter to it (reservations for booking verticals, fulfilment +
  // stock for retail, appointments for services).
  const isBooking = cfg.booking === "reservations";
  const isRetail = cfg.booking === "none";
  const has = (m: string) => cfg.modules.includes(m);
  const noun = cfg.itemNoun.toLowerCase();

  const stats: { label: string; value: string; sub?: string; to?: string }[] = [
    { label: "Revenue", value: formatPrice(s?.revenue_cents ?? 0), sub: `${s?.orders ?? 0} orders`, to: "commerce" },
    ...(isBooking
      ? [
          { label: "Upcoming reservations", value: String(resv.upcoming), sub: `${resv.total} all-time`, to: "reservations" },
          { label: cfg.commerceLabel, value: String(s?.products ?? 0), sub: `${noun} listings`, to: "commerce" },
        ]
      : []),
    { label: "Customers", value: String(s?.customers ?? 0), sub: `${s?.contacts ?? 0} contacts`, to: "crm" },
    ...(isRetail
      ? [
          { label: "Unfulfilled orders", value: String(s?.unfulfilled ?? 0), to: "commerce" },
          { label: "Low stock", value: String(s?.low_stock ?? 0), sub: `${s?.products ?? 0} ${noun}s`, to: "commerce" },
        ]
      : []),
    ...(has("invoicing")
      ? [
          { label: "Outstanding invoices", value: formatPrice(s?.outstanding_cents ?? 0), to: "invoicing" },
          { label: "Active subscriptions", value: String(s?.active_subs ?? 0), to: "invoicing" },
        ]
      : []),
    ...(has("bookings") ? [{ label: "Upcoming appointments", value: String(s?.upcoming_bookings ?? 0), to: "bookings" }] : []),
    { label: "Open tickets", value: String(s?.open_tickets ?? 0), sub: `${s?.ai_deflected ?? 0} AI-deflected`, to: "helpdesk" },
  ];

  if (loading) return <div className="bg-neutral-0 rounded-4 p-5 border-100 text-center neutral-500">Loading…</div>;

  return (
    <div>
      <div className="row g-3 mb-4">
        {stats.map((stat) => {
          const inner = (
            <div className="bg-neutral-0 rounded-4 p-4 h-100 border-100">
              <div className="fz-font-md neutral-500 mb-2">{stat.label}</div>
              <div className="fz-40 fw-700 lh-1 neutral-900">{stat.value}</div>
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

      {error && <div className="alert alert-warning py-2 px-3 fz-font-md">{error}</div>}

      {/* Ask your data */}
      <div className="bg-neutral-0 rounded-4 p-4 border-100 mb-4">
        <h6 className="fw-600 mb-3">✨ Ask your data</h6>
        <form onSubmit={ask} className="d-flex gap-2">
          <input
            className="form-control rounded-3"
            placeholder="e.g. What's my best-selling product? How many customers are at churn risk?"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
          />
          <button type="submit" className="btn btn-dark rounded-3 px-4" disabled={asking}>
            {asking ? "Thinking…" : "Ask"}
          </button>
        </form>
        {answer && <div className="mt-3 p-3 bg-neutral-50 rounded-3 fz-font-md neutral-900" style={{ whiteSpace: "pre-wrap" }}>{answer}</div>}
      </div>

      <div className="row g-4">
        {/* Insights */}
        <div className="col-lg-7">
          <div className="bg-neutral-0 rounded-4 p-4 border-100 h-100">
            <div className="d-flex align-items-center justify-content-between mb-3">
              <h6 className="fw-600 mb-0">AI insights</h6>
              <button type="button" className="btn btn-outline-dark btn-sm rounded-pill px-3" onClick={genInsights} disabled={insightsLoading}>
                {insightsLoading ? "…" : "Generate"}
              </button>
            </div>
            {insights == null ? (
              <p className="neutral-500 fz-font-md mb-0">Generate AI insights from your live metrics.</p>
            ) : insights.length === 0 ? (
              <p className="neutral-500 fz-font-md mb-0">No insights right now.</p>
            ) : (
              <ul className="list-unstyled m-0 d-flex flex-column gap-2">
                {insights.map((i, idx) => (
                  <li key={idx} className="d-flex gap-2">
                    <span className={`badge fw-500 text-capitalize ${SEV_STYLE[i.severity] ?? SEV_STYLE.info}`} style={{ height: "fit-content" }}>{i.severity}</span>
                    <div>
                      <div className="fw-600 fz-font-md">{i.title}</div>
                      <div className="fz-font-sm neutral-500">{i.detail}</div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Forecast */}
        <div className="col-lg-5">
          <div className="bg-neutral-0 rounded-4 p-4 border-100 h-100">
            <div className="d-flex align-items-center justify-content-between mb-3">
              <h6 className="fw-600 mb-0">30-day forecast</h6>
              <button type="button" className="btn btn-outline-dark btn-sm rounded-pill px-3" onClick={genForecast} disabled={forecastLoading}>
                {forecastLoading ? "…" : "Forecast"}
              </button>
            </div>
            {forecast == null ? (
              <p className="neutral-500 fz-font-md mb-0">Project revenue from recent orders.</p>
            ) : (
              <>
                <div className="fz-40 fw-700 lh-1 neutral-900">{formatPrice(forecast.revenue_next_30d_cents ?? 0)}</div>
                <div className="fz-font-sm neutral-500 mb-2">~{forecast.orders_next_30d ?? 0} orders</div>
                <p className="fz-font-md neutral-700 mb-0">{forecast.narrative}</p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
