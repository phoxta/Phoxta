import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { formatPrice } from "@/lib/db/marketplace";
import { getCustomerContext, type CustomerContext } from "@/lib/db/ops/inbox";

/**
 * Gorgias-style customer context rail: what this customer has bought/booked,
 * how often they've written in, and their CRM record — fetched by email/phone
 * for whichever conversation or ticket is open.
 */

const STATUS_BADGE = (s: string) => {
  if (["cancelled", "refunded", "failed", "no_show"].includes(s)) return "bg-danger-subtle text-danger";
  if (["paid", "fulfilled", "confirmed", "completed"].includes(s)) return "bg-success-subtle text-success";
  if (["pending", "partially_refunded"].includes(s)) return "bg-warning-subtle text-warning";
  return "bg-neutral-100 neutral-700";
};

const shortId = (id: string) => `#${id.slice(0, 8)}`;
const day = (d: string) => new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric" });

export default function InboxContextRail({
  orgId,
  currency,
  email,
  phone,
  excludeConversationId,
}: {
  orgId: string;
  /** Org fallback currency for rows without their own. */
  currency: string;
  email?: string | null;
  phone?: string | null;
  excludeConversationId?: string | null;
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

  return (
    <div className="bg-neutral-0 rounded-4 p-3 border-100">
      <div className="fz-font-sm fw-600 neutral-500 mb-2">Customer history</div>

      {!hasIdentity ? (
        <div className="fz-font-sm neutral-400">No email or phone on this conversation yet — history will appear once the customer is identified.</div>
      ) : loading && !ctx ? (
        <div className="fz-font-sm neutral-500">Loading history…</div>
      ) : (
        <>
          {error && <div className="alert alert-warning py-1 px-2 fz-font-sm mb-2">{error}</div>}

          {/* Orders */}
          <div className="fz-font-sm fw-600 neutral-700 mb-1">Orders</div>
          {(ctx?.orders.length ?? 0) === 0 ? (
            <div className="fz-font-sm neutral-400 mb-2">No orders yet.</div>
          ) : (
            <div className="d-flex flex-column gap-1 mb-2">
              {ctx!.orders.map((o) => (
                <Link key={o.id} to={`${base}/commerce`} className="d-flex align-items-center justify-content-between gap-2 text-decoration-none">
                  <span className="fz-font-sm neutral-700">{shortId(o.id)} · {formatPrice(o.total_cents, o.currency || currency)}</span>
                  <span className={`badge fw-500 text-capitalize ${STATUS_BADGE(o.status)}`}>{o.status.replace("_", " ")}</span>
                </Link>
              ))}
            </div>
          )}

          {/* Reservations + bookings */}
          {(ctx?.reservations.length ?? 0) > 0 && (
            <>
              <div className="fz-font-sm fw-600 neutral-700 mb-1">Reservations</div>
              <div className="d-flex flex-column gap-1 mb-2">
                {ctx!.reservations.map((r) => (
                  <Link key={r.id} to={`${base}/reservations`} className="d-flex align-items-center justify-content-between gap-2 text-decoration-none">
                    <span className="fz-font-sm neutral-700 text-truncate">
                      {day(r.start_date)} → {day(r.end_date)} · {formatPrice(r.total_cents, r.currency || currency)}
                    </span>
                    <span className={`badge fw-500 text-capitalize ${STATUS_BADGE(r.status)}`}>{r.status}</span>
                  </Link>
                ))}
              </div>
            </>
          )}
          {(ctx?.bookings.length ?? 0) > 0 && (
            <>
              <div className="fz-font-sm fw-600 neutral-700 mb-1">Bookings</div>
              <div className="d-flex flex-column gap-1 mb-2">
                {ctx!.bookings.map((b) => (
                  <Link key={b.id} to={`${base}/bookings`} className="d-flex align-items-center justify-content-between gap-2 text-decoration-none">
                    <span className="fz-font-sm neutral-700 text-truncate">
                      {new Date(b.start_at).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })} · {b.service_name}
                    </span>
                    <span className={`badge fw-500 text-capitalize ${STATUS_BADGE(b.status)}`}>{b.status}</span>
                  </Link>
                ))}
              </div>
            </>
          )}

          {/* Prior conversations */}
          <div className="fz-font-sm neutral-500 mb-2">
            {ctx?.priorConversations ? (
              <>Prior conversations: <span className="fw-600 neutral-800">{ctx.priorConversations}</span></>
            ) : (
              "First conversation with this customer."
            )}
          </div>

          {/* CRM contact */}
          {ctx?.contact ? (
            <div className="border-top border-100 pt-2">
              <Link to={`${base}/crm`} className="fz-font-sm fw-600 text-decoration-none">
                {ctx.contact.name || "CRM contact"} →
              </Link>
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
            <div className="fz-font-sm neutral-400 border-top border-100 pt-2">Not in the CRM yet.</div>
          )}
        </>
      )}
    </div>
  );
}
