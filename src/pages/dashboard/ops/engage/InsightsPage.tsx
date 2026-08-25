import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useCachedData } from "@/lib/hooks/useCachedData";
import { DASHBOARD_TTL } from "@/lib/cache/dashboardQueries";
import { formatPrice } from "@/lib/db/marketplace";
import { listContacts, type Contact } from "@/lib/db/ops/crm";
import {
  useEngageOps,
  listEngageFlows,
  listEngageTouches,
  listRecentRevenue,
  isFlowLive,
  ENGAGE_WARMING,
  TOUCH_LIMIT,
  REVENUE_LIMIT,
  type EngageFlow,
  type EngageTouch,
  type RevenueEvent,
} from "@/lib/db/ops/engageAreas";
import { Card, Chip, Empty, StatTile, stageTone } from "@/components/dash/Ui";

/**
 * Engage → Insights: what the flows, journeys and broadcasts actually earned.
 *
 * Attribution v1 is deliberately simple and transparent: a paid/fulfilled
 * order or confirmed/completed reservation counts toward a flow when it was
 * created within 7 days AFTER one of that flow's touches, matched by the
 * touched contact's email (the identity orders/reservations carry). Computed
 * client-side over the last 30 days of data with capped queries — a rough
 * floor, never a precise ledger, and shown as "—" whenever it can't honestly
 * be computed.
 */

const WINDOW_DAYS = 7;
const WINDOW_MS = WINDOW_DAYS * 24 * 60 * 60 * 1000;

const CSS = `
.inx-head { display: flex; align-items: center; justify-content: space-between; gap: 10px 12px; flex-wrap: wrap; margin-bottom: 14px; }
.inx-title { font-size: 20px; font-weight: 600; letter-spacing: -0.02em; margin: 0; }
.inx-sub { font-size: 13.5px; color: var(--hrx-muted); }
.inx-method { font-size: 13px; color: var(--hrx-muted); margin: 12px 0 0; }
`;

type FlowRow = {
  flow: EngageFlow;
  touches: number;
  contactsReached: number;
  /** Attributed pence, or null when attribution can't honestly be computed. */
  revenue: number | null;
};

type InsightsData = {
  flows: EngageFlow[];
  touches: EngageTouch[];
  events: RevenueEvent[];
  /** True when the engage tables aren't provisioned yet. */
  engineMissing: boolean;
  /** True when the revenue reads failed — attribution shows "—" everywhere. */
  revenueUnavailable: boolean;
};

export default function InsightsPage() {
  const { orgId, org } = useEngageOps();
  const currency = org?.currency || "GBP";

  const { data, loading, error: loadError } = useCachedData<InsightsData>(
    `ops:engage:insights:${orgId}`,
    async () => {
      const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const [flows, touches, revenue] = await Promise.all([
        listEngageFlows(orgId),
        listEngageTouches(orgId, since),
        listRecentRevenue(orgId, since),
      ]);
      // A missing table is a state, not an error; only real failures throw.
      const err = flows.error || touches.error;
      if (err) throw new Error(err);
      return {
        flows: flows.data,
        touches: touches.data,
        events: revenue.events,
        engineMissing: flows.missing || touches.missing,
        revenueUnavailable: Boolean(revenue.error),
      };
    },
    { ttl: DASHBOARD_TTL },
  );

  // Shares the CRM page's cache — contact ids resolve to emails for attribution.
  const { data: contacts = [] } = useCachedData<Contact[]>(
    `ops:crm:${orgId}`,
    async () => {
      const { data, error } = await listContacts(orgId);
      if (error) throw new Error(error);
      return data;
    },
    { ttl: DASHBOARD_TTL },
  );

  const computed = useMemo(() => {
    const flows = data?.flows ?? [];
    const touches = data?.touches ?? [];
    const events = data?.events ?? [];
    const revenueOk = !(data?.revenueUnavailable ?? false);

    const emailOf = new Map<string, string>();
    for (const c of contacts) {
      const em = (c.email ?? "").trim().toLowerCase();
      if (em) emailOf.set(c.id, em);
    }

    const eventsByEmail = new Map<string, RevenueEvent[]>();
    for (const e of events) {
      const list = eventsByEmail.get(e.email);
      if (list) list.push(e);
      else eventsByEmail.set(e.email, [e]);
    }

    const touchesByFlow = new Map<string, EngageTouch[]>();
    for (const t of touches) {
      if (!t.flow_id) continue;
      const list = touchesByFlow.get(t.flow_id);
      if (list) list.push(t);
      else touchesByFlow.set(t.flow_id, [t]);
    }

    const attributedIds = new Set<string>();
    let attributedTotal = 0;
    let anyComputed = false;

    const rows: FlowRow[] = flows.map((flow) => {
      const ts = touchesByFlow.get(flow.id) ?? [];
      const contactIds = new Set(ts.map((t) => t.contact_id).filter(Boolean) as string[]);

      let revenue: number | null = null;
      if (revenueOk && ts.length > 0) {
        // Attribution only makes sense when at least one touch resolves to an
        // email — otherwise stay at "—" rather than implying a computed zero.
        const seen = new Set<string>();
        let sum = 0;
        let resolvable = false;
        for (const t of ts) {
          const em = t.contact_id ? emailOf.get(t.contact_id) : undefined;
          if (!em) continue;
          resolvable = true;
          const start = new Date(t.created_at).getTime();
          for (const e of eventsByEmail.get(em) ?? []) {
            if (seen.has(e.id)) continue;
            const when = new Date(e.created_at).getTime();
            if (when > start && when <= start + WINDOW_MS) {
              seen.add(e.id);
              sum += e.cents;
            }
          }
        }
        if (resolvable) {
          revenue = sum;
          anyComputed = true;
          for (const id of seen) {
            if (!attributedIds.has(id)) {
              attributedIds.add(id);
              const ev = events.find((e) => e.id === id);
              attributedTotal += ev?.cents ?? 0;
            }
          }
        }
      }

      return { flow, touches: ts.length, contactsReached: contactIds.size, revenue };
    });

    rows.sort((a, b) => b.touches - a.touches || a.flow.name.localeCompare(b.flow.name));

    return {
      rows,
      touches30: touches.length,
      touchesCapped: touches.length >= TOUCH_LIMIT,
      flowsLive: flows.filter((f) => f.kind === "flow" && isFlowLive(f)).length,
      journeysLive: flows.filter((f) => f.kind === "journey" && isFlowLive(f)).length,
      attributedTotal: anyComputed ? attributedTotal : null,
    };
  }, [data, contacts]);

  if (loading) return <div className="hrx-card hrx-pad text-center" style={{ color: "var(--hrx-muted)" }} role="status">Loading…</div>;

  const money = (cents: number | null) => (cents === null ? "—" : formatPrice(cents, currency));

  return (
    <div>
      <style>{CSS}</style>

      <div className="inx-head">
        <h2 className="inx-title">Insights</h2>
        <span className="inx-sub">Last 30 days</span>
      </div>

      {loadError && <div className="alert alert-warning py-2 px-3 mb-3" style={{ borderRadius: 12, fontSize: 14 }} role="alert">{loadError}</div>}

      {data?.engineMissing ? (
        <Card title="Measurement">
          <Empty title={ENGAGE_WARMING.title}>{ENGAGE_WARMING.body}</Empty>
        </Card>
      ) : (
        <>
          <div className="hrx-statrow mb-3">
            <StatTile label="Touches (30d)" value={`${computed.touches30}${computed.touchesCapped ? "+" : ""}`} tone="dark" />
            <StatTile label="Flows live" value={computed.flowsLive} />
            <StatTile label="Journeys live" value={computed.journeysLive} />
            <StatTile label="Attributed revenue (30d)" value={money(computed.attributedTotal)} tone="blue" />
          </div>

          <Card
            title="Per flow & journey"
            right={computed.rows.length > 0 ? <Chip tone="line">{computed.rows.length} total</Chip> : undefined}
          >
            {computed.rows.length === 0 ? (
              <Empty title="Nothing to measure yet">
                Build your first automation in <Link to="../flows">Flows</Link> or <Link to="../journeys">Journeys</Link> — as soon as one touches a contact, its reach and revenue show up here.
              </Empty>
            ) : (
              <div className="hrx-tablewrap">
                <table className="hrx-table" style={{ minWidth: 640 }}>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Kind</th>
                      <th>Status</th>
                      <th style={{ textAlign: "right" }}>Touches</th>
                      <th style={{ textAlign: "right" }}>Contacts reached</th>
                      <th style={{ textAlign: "right" }}>Attributed revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {computed.rows.map((r) => (
                      <tr key={r.flow.id}>
                        <td className="fw-semibold">{r.flow.name}</td>
                        <td><Chip tone={r.flow.kind === "journey" ? "orange" : "blue"}>{r.flow.kind === "journey" ? "Journey" : "Flow"}</Chip></td>
                        <td><Chip tone={stageTone(r.flow.status)}>{r.flow.status}</Chip></td>
                        <td style={{ textAlign: "right" }}>{r.touches}</td>
                        <td style={{ textAlign: "right" }}>{r.contactsReached}</td>
                        <td style={{ textAlign: "right" }} className="fw-semibold">{money(r.revenue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <p className="inx-method">
              Attribution v1: paid or fulfilled orders and confirmed or completed reservations created within {WINDOW_DAYS} days after a touch,
              matched by the touched contact&rsquo;s email, over the last 30 days (up to {TOUCH_LIMIT.toLocaleString()} touches and {REVENUE_LIMIT} orders/reservations
              per read, computed in your browser). &quot;—&quot; means it couldn&rsquo;t honestly be computed — not zero.
            </p>
          </Card>
        </>
      )}
    </div>
  );
}
