import { useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { formatPrice } from "@/lib/db/marketplace";
import { getCustomerContext, type CustomerContext } from "@/lib/db/ops/inbox";

/**
 * Gorgias-style customer context rail: what this customer has bought/booked,
 * how often they've written in, and their CRM record — fetched by email/phone
 * for whichever conversation or ticket is open.
 */

const STATUS_BADGE = (s: string) => {
  if (["cancelled", "refunded", "failed", "no_show"].includes(s)) return "bg-danger-subtle text-danger-emphasis";
  if (["paid", "fulfilled", "confirmed", "completed"].includes(s)) return "bg-success-subtle text-success-emphasis";
  if (["pending", "partially_refunded"].includes(s)) return "bg-warning-subtle text-warning-emphasis";
  return "bg-neutral-100 neutral-700";
};

/** History rows are links into the matching console tab — comfortable to tap on a phone. */
const ROW_CLASS = "d-flex align-items-center justify-content-between gap-2 text-decoration-none py-1 ops-tap";

const shortId = (id: string) => `#${id.slice(0, 8)}`;
const day = (d: string) => new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric" });

export default function InboxContextRail({
  orgId,
  currency,
  email,
  phone,
  excludeConversationId,
  modules,
}: {
  orgId: string;
  /** Org fallback currency for rows without their own. */
  currency: string;
  email?: string | null;
  phone?: string | null;
  excludeConversationId?: string | null;
  /** Module segments this vertical shows. Rows for hidden modules stay unlinked. */
  modules?: string[];
}) {
  const [ctx, setCtx] = useState<CustomerContext | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasIdentity = !!(email?.trim() || phone?.trim());

  useEffect(() => {
    if (!hasIdentity) {
      setCtx(null);
      return;
    }
    let active = true;
    setLoading(true);
    setError(null);
    getCustomerContext(orgId, { email, phone, excludeConversationId }).then(({ data, error }) => {
      if (!active) return;
      setCtx(data);
      setError(error);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [orgId, email, phone, excludeConversationId, hasIdentity]);

  const base = `/dashboard/businesses/${orgId}/ops`;
  /**
   * A row only links when its module belongs to this vertical's console — a
   * booking row on a rental console would land on a page with no tab and no
   * way back. The row still reads fine without the link.
   */
  const canOpen = (seg: string) => !modules || modules.includes(seg);
  const historyRow = (key: string, seg: string, inner: ReactNode) =>
    canOpen(seg) ? (
      <Link key={key} to={`${base}/${seg}`} className={ROW_CLASS}>{inner}</Link>
    ) : (
      <div key={key} className={ROW_CLASS}>{inner}</div>
    );

  return (
    <div className="bg-neutral-0 rounded-4 p-3 border-100">
      <h3 className="fz-font-sm fw-600 neutral-500 mb-2">Customer history</h3>

      {!hasIdentity ? (
        <div className="fz-font-sm neutral-400">No email or phone on this conversation yet — history will appear once the customer is identified.</div>
      ) : loading && !ctx ? (
        <div className="fz-font-sm neutral-500">Loading history…</div>
      ) : (
        <>
          {error && <div className="alert alert-danger py-1 px-2 fz-font-sm mb-2" role="alert">{error}</div>}

          {/* Orders */}
          <h4 className="fz-font-sm fw-600 neutral-700 mb-1">Orders</h4>
          {(ctx?.orders.length ?? 0) === 0 ? (
            <div className="fz-font-sm neutral-400 mb-2">No orders yet.</div>
          ) : (
            <div className="d-flex flex-column mb-2">
              {ctx!.orders.map((o) =>
                historyRow(o.id, "commerce", (
                  <>
                    <span className="fz-font-sm neutral-700" style={{ overflowWrap: "anywhere" }}>{shortId(o.id)} · {formatPrice(o.total_cents, o.currency || currency)}</span>
                    <span className={`badge fw-500 text-capitalize flex-shrink-0 ${STATUS_BADGE(o.status)}`}>{o.status.replace("_", " ")}</span>
                  </>
                )),
              )}
            </div>
          )}

          {/* Reservations + bookings */}
          {(ctx?.reservations.length ?? 0) > 0 && (
            <>
              <h4 className="fz-font-sm fw-600 neutral-700 mb-1">Reservations</h4>
              <div className="d-flex flex-column mb-2">
                {ctx!.reservations.map((r) =>
                  historyRow(r.id, "reservations", (
                    <>
                      <span className="fz-font-sm neutral-700 text-truncate">
                        {day(r.start_date)} → {day(r.end_date)} · {r.product_name} · {formatPrice(r.total_cents, r.currency || currency)}
                      </span>
                      <span className={`badge fw-500 text-capitalize flex-shrink-0 ${STATUS_BADGE(r.status)}`}>{r.status}</span>
                    </>
                  )),
                )}
              </div>
            </>
          )}
          {(ctx?.bookings.length ?? 0) > 0 && (
            <>
              <h4 className="fz-font-sm fw-600 neutral-700 mb-1">Bookings</h4>
              <div className="d-flex flex-column mb-2">
                {ctx!.bookings.map((b) =>
                  historyRow(b.id, "bookings", (
                    <>
                      <span className="fz-font-sm neutral-700 text-truncate">
                        {new Date(b.start_at).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })} · {b.service_name}
                      </span>
                      <span className={`badge fw-500 text-capitalize flex-shrink-0 ${STATUS_BADGE(b.status)}`}>{b.status}</span>
                    </>
                  )),
                )}
              </div>
            </>
          )}

          {/* Prior conversations */}
          <div className="fz-font-sm neutral-500 mb-2">
            {ctx?.priorConversations ? (
              <>Earlier conversations: <span className="fw-600 neutral-800">{ctx.priorConversations}</span></>
            ) : (
              "First conversation with this customer."
            )}
          </div>

          {/* CRM contact */}
          {ctx?.contact ? (
            <div className="border-top border-100 pt-2">
              {canOpen("crm") ? (
                <Link to={`${base}/crm`} className="fz-font-sm fw-600 text-decoration-none ops-tap">
                  {ctx.contact.name || "Customer record"} →
                </Link>
              ) : (
                <span className="fz-font-sm fw-600">{ctx.contact.name || "Customer record"}</span>
              )}
              <span className="badge bg-neutral-100 neutral-700 fw-500 text-capitalize ms-2">{ctx.contact.stage}</span>
              {ctx.contact.tags?.length > 0 && (
                <div className="d-flex flex-wrap gap-1 mt-1">
                  {ctx.contact.tags.map((t) => (
                    <span key={t} className="badge bg-neutral-100 neutral-700 fw-500">#{t}</span>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="fz-font-sm neutral-400 border-top border-100 pt-2">Not saved as a customer yet.</div>
          )}
        </>
      )}
    </div>
  );
}
