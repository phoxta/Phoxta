import { useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  CalendarDays,
  ChevronDown,
  Hash,
  IdCard,
  Mail,
  MessageSquare,
  Package,
  Phone,
  SlidersHorizontal,
  Star,
  UserRound,
  X,
} from "lucide-react";
import { formatPrice } from "@/lib/db/marketplace";
import {
  getCustomerContext,
  listCallsForConversation,
  type ConversationCall,
  type CustomerContext,
} from "@/lib/db/ops/inbox";
import type { Conversation, OrgMember } from "@/lib/db/ops/agent";
import type { Ticket } from "@/lib/db/ops/helpdesk";
import { Avatar, Tag } from "@/pages/dashboard/ops/ui/primitives";
import RecordingPlayer from "@/pages/dashboard/ops/ui/RecordingPlayer";

/**
 * Customer context rail.
 *
 * Replaces the old three stacked cards (history / customer / settings), which
 * wrapped onto a second grid row underneath the thread. Everything about the
 * person you are talking to now lives in one scrolling column of collapsible
 * sections: who they are, what they've bought, and how this thread is filed.
 */

const tone = (s: string): "ok" | "danger" | "warn" | "plain" => {
  if (["cancelled", "refunded", "failed", "no_show"].includes(s)) return "danger";
  if (["paid", "fulfilled", "confirmed", "completed"].includes(s)) return "ok";
  if (["pending", "partially_refunded"].includes(s)) return "warn";
  return "plain";
};

const shortId = (id: string) => `#${id.slice(0, 8)}`;
const day = (d: string) => new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric" });

function Section({
  title,
  icon,
  children,
  defaultOpen = true,
  count,
}: {
  title: string;
  icon: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
  count?: number;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="ibx-rail__sec">
      <button type="button" className="ibx-rail__sum" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
        {icon}
        {title}
        {count != null && count > 0 && <span style={{ opacity: 0.6 }}>({count})</span>}
        <ChevronDown className="ibx-rail__chev" />
      </button>
      {open && <div className="ibx-rail__body">{children}</div>}
    </div>
  );
}

export default function ContextRail({
  orgId,
  currency,
  conv,
  ticket,
  modules,
  members,
  me,
  firstResponseMin,
  tagDraft,
  setTagDraft,
  onAssign,
  onAddTag,
  onRemoveTag,
  onRequestRating,
  requestingCsat,
  onClose,
}: {
  orgId: string;
  currency: string;
  conv: Conversation | null;
  ticket: Ticket | null;
  /** Module segments this vertical shows — rows for hidden modules stay unlinked. */
  modules?: string[];
  members: OrgMember[];
  me: string | null;
  firstResponseMin: number | null;
  tagDraft: string;
  setTagDraft: (v: string) => void;
  onAssign: (userId: string | null) => void;
  onAddTag: (e: React.FormEvent) => void;
  onRemoveTag: (t: string) => void;
  onRequestRating: () => void;
  requestingCsat: boolean;
  /** Present only when the rail is shown as a sheet (below 1200px). */
  onClose?: () => void;
}) {
  const email = conv?.customer_email || ticket?.customer_email || "";
  // A label like "web visitor" is not an identity — matching on it would pull
  // every other web-chat thread's history into this one.
  const phone = conv?.customer_phone && /\d/.test(conv.customer_phone) ? conv.customer_phone : "";
  const name = conv?.customer_name || ticket?.customer_name || "Customer";

  const [ctx, setCtx] = useState<CustomerContext | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasIdentity = !!(email.trim() || phone.trim());

  // Calls attached to THIS conversation (any channel — an SMS thread the AI
  // phoned about carries call logs too, not only channel_type "voice").
  const convId = conv?.id ?? null;
  const [calls, setCalls] = useState<ConversationCall[]>([]);
  useEffect(() => {
    if (!convId) {
      setCalls([]);
      return;
    }
    let active = true;
    listCallsForConversation(convId).then(({ data }) => {
      if (active) setCalls(data);
    });
    return () => {
      active = false;
    };
  }, [convId]);

  useEffect(() => {
    if (!hasIdentity) {
      setCtx(null);
      return;
    }
    let active = true;
    setLoading(true);
    setError(null);
    getCustomerContext(orgId, { email, phone, excludeConversationId: conv?.id }).then(({ data, error }) => {
      if (!active) return;
      setCtx(data);
      setError(error);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [orgId, email, phone, conv?.id, hasIdentity]);

  const base = `/dashboard/businesses/${orgId}/ops`;
  const canOpen = (seg: string) => !modules || modules.includes(seg);
  const row = (key: string, seg: string, inner: ReactNode) =>
    canOpen(seg) ? (
      <Link key={key} to={`${base}/${seg}`} className="ibx-rail__row">
        {inner}
      </Link>
    ) : (
      <div key={key} className="ibx-rail__row">
        {inner}
      </div>
    );

  const orders = ctx?.orders ?? [];
  const reservations = ctx?.reservations ?? [];
  const bookings = ctx?.bookings ?? [];
  const spend = orders.reduce((n, o) => n + (o.total_cents || 0), 0);

  return (
    <div className="oc-pane oc-pane--rail">
      <div className="oc-pane__head d-flex align-items-center gap-2">
        <span className="fz-font-sm fw-600 neutral-500 text-uppercase" style={{ letterSpacing: ".05em", fontSize: 11 }}>
          Customer
        </span>
        {onClose && (
          <button type="button" className="oc-ico ms-auto" aria-label="Close details" onClick={onClose}>
            <X width={16} height={16} />
          </button>
        )}
      </div>

      <div className="oc-pane__body">
        {/* ── Identity ─────────────────────────────────────────────────── */}
        <div className="d-flex align-items-center gap-2 px-3 py-3">
          <Avatar name={name} size="lg" />
          <div style={{ minWidth: 0 }}>
            <div className="fw-600" style={{ fontSize: 13.5, overflowWrap: "anywhere" }}>
              {name}
            </div>
            <div className="d-flex flex-column" style={{ fontSize: 11.5, color: "var(--at-neutral-500)" }}>
              {phone && (
                <a href={`tel:${phone}`} className="text-decoration-none d-inline-flex align-items-center gap-1" style={{ color: "inherit" }}>
                  <Phone width={11} height={11} /> {phone}
                </a>
              )}
              {email && (
                <a href={`mailto:${email}`} className="text-decoration-none d-inline-flex align-items-center gap-1 text-truncate" style={{ color: "inherit" }}>
                  <Mail width={11} height={11} /> <span className="text-truncate">{email}</span>
                </a>
              )}
              {!phone && !email && <span>No contact details yet</span>}
            </div>
          </div>
        </div>

        {/* Value at a glance — the two numbers that decide how you answer. */}
        {hasIdentity && (
          <div className="px-3 pb-3">
            <div className="ibx-rail__stat">
              <div>
                <b>{loading && !ctx ? "—" : formatPrice(spend, orders[0]?.currency || currency)}</b>
                <span>Lifetime spend</span>
              </div>
              <div>
                <b>{loading && !ctx ? "—" : (ctx?.priorConversations ?? 0) + 1}</b>
                <span>Conversations</span>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="px-3 pb-2">
            <div className="oc-panel oc-panel--danger">{error}</div>
          </div>
        )}

        {!hasIdentity ? (
          <div className="px-3 pb-3" style={{ fontSize: 12, color: "var(--at-neutral-400)" }}>
            No email or phone on this conversation yet — history appears once the customer identifies themselves.
          </div>
        ) : (
          <>
            <Section title="Orders" icon={<Package />} count={orders.length} defaultOpen={orders.length > 0}>
              {orders.length === 0 ? (
                <div style={{ fontSize: 12, color: "var(--at-neutral-400)" }}>No orders yet.</div>
              ) : (
                orders.map((o) =>
                  row(
                    o.id,
                    "commerce",
                    <>
                      <span style={{ overflowWrap: "anywhere" }}>
                        {shortId(o.id)} · {formatPrice(o.total_cents, o.currency || currency)}
                      </span>
                      <Tag tone={tone(o.status)}>{o.status.replace("_", " ")}</Tag>
                    </>,
                  ),
                )
              )}
            </Section>

            {reservations.length > 0 && (
              <Section title="Reservations" icon={<CalendarDays />} count={reservations.length}>
                {reservations.map((r) =>
                  row(
                    r.id,
                    "reservations",
                    <>
                      <span className="text-truncate">
                        {day(r.start_date)} → {day(r.end_date)} · {r.product_name}
                      </span>
                      <Tag tone={tone(r.status)}>{r.status}</Tag>
                    </>,
                  ),
                )}
              </Section>
            )}

            {bookings.length > 0 && (
              <Section title="Bookings" icon={<CalendarDays />} count={bookings.length}>
                {bookings.map((b) =>
                  row(
                    b.id,
                    "bookings",
                    <>
                      <span className="text-truncate">
                        {new Date(b.start_at).toLocaleString(undefined, {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}{" "}
                        · {b.service_name}
                      </span>
                      <Tag tone={tone(b.status)}>{b.status}</Tag>
                    </>,
                  ),
                )}
              </Section>
            )}

            <Section title="CRM record" icon={<IdCard />} defaultOpen={!!ctx?.contact}>
              {ctx?.contact ? (
                <>
                  <div className="d-flex align-items-center gap-2 flex-wrap">
                    {canOpen("crm") ? (
                      <Link to={`${base}/crm`} className="fw-600 text-decoration-none" style={{ fontSize: 12.5 }}>
                        {ctx.contact.name || "Customer record"} →
                      </Link>
                    ) : (
                      <span className="fw-600" style={{ fontSize: 12.5 }}>
                        {ctx.contact.name || "Customer record"}
                      </span>
                    )}
                    <Tag>{ctx.contact.stage}</Tag>
                  </div>
                  {ctx.contact.tags?.length > 0 && (
                    <div className="d-flex flex-wrap gap-1 mt-2">
                      {ctx.contact.tags.map((t) => (
                        <Tag key={t} icon={<Hash />}>
                          {t}
                        </Tag>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div style={{ fontSize: 12, color: "var(--at-neutral-400)" }}>Not saved as a customer yet.</div>
              )}
            </Section>
          </>
        )}

        {/* ── Calls on this conversation ───────────────────────────────── */}
        {conv && calls.length > 0 && (
          <Section title="Calls" icon={<Phone />} count={calls.length}>
            {calls.map((c) => (
              <div key={c.id} className="ibx-rail__row" style={{ flexDirection: "column", alignItems: "stretch" }}>
                <div className="d-flex align-items-center justify-content-between gap-2">
                  <span className="text-capitalize" style={{ fontSize: 12 }}>
                    {c.direction} call{c.after_hours ? " · after hours" : ""}
                  </span>
                  <Tag tone={c.outcome === "escalated" ? "warn" : c.outcome === "failed" ? "danger" : c.outcome === "booked" ? "ok" : "plain"}>
                    {c.outcome}
                  </Tag>
                </div>
                <div style={{ fontSize: 11, color: "var(--at-neutral-500)" }}>
                  {new Date(c.created_at).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                </div>
                <RecordingPlayer orgId={orgId} callId={c.id} recording={c.recording_url} className="w-100 mt-1" style={{ height: 30 }} />
              </div>
            ))}
          </Section>
        )}

        {/* ── How this thread is filed ─────────────────────────────────── */}
        {conv && (
          <Section title="This conversation" icon={<SlidersHorizontal />}>
            <label className="oc-label" htmlFor="ibx-assign">
              Assigned to
            </label>
            <select
              id="ibx-assign"
              className="oc-field mb-3"
              value={conv.assigned_to ?? ""}
              onChange={(e) => onAssign(e.target.value || null)}
            >
              <option value="">Unassigned</option>
              {me && <option value={me}>Me</option>}
              {members
                .filter((m) => m.user_id !== me)
                .map((m) => (
                  <option key={m.user_id} value={m.user_id}>
                    {m.full_name || "Teammate"}
                  </option>
                ))}
            </select>

            <span className="oc-label">Tags</span>
            <div className="d-flex flex-wrap gap-1 mb-2">
              {conv.tags?.length ? (
                conv.tags.map((t) => (
                  <span key={t} className="oc-tag">
                    <Hash width={10} height={10} />
                    {t}
                    <button
                      type="button"
                      className="border-0 bg-transparent p-0 ms-1 lh-1"
                      style={{ color: "inherit", cursor: "pointer" }}
                      aria-label={`Remove tag ${t}`}
                      onClick={() => onRemoveTag(t)}
                    >
                      <X width={10} height={10} />
                    </button>
                  </span>
                ))
              ) : (
                <span style={{ fontSize: 11.5, color: "var(--at-neutral-400)" }}>No tags yet</span>
              )}
            </div>
            <form onSubmit={onAddTag} className="mb-3">
              <label className="visually-hidden" htmlFor="oc-tag">
                Add a tag
              </label>
              <input
                id="oc-tag"
                className="oc-field"
                placeholder="Add a tag, then press Enter"
                value={tagDraft}
                onChange={(e) => setTagDraft(e.target.value)}
              />
            </form>

            <span className="oc-label">Satisfaction</span>
            {/* Honest CSAT: the score belongs to the customer, not the owner. */}
            {conv.csat_score != null ? (
              <div className="d-flex align-items-center gap-2 flex-wrap">
                <Tag tone={conv.csat_score >= 4 ? "ok" : conv.csat_score <= 2 ? "danger" : "warn"} icon={<Star />}>
                  {conv.csat_score}/5
                </Tag>
                <span style={{ fontSize: 11.5, color: "var(--at-neutral-500)" }}>
                  {conv.csat_source === "customer" ? "rated by the customer" : "entered by your team"}
                </span>
              </div>
            ) : (
              <>
                <button
                  type="button"
                  className="oc-btn"
                  disabled={conv.csat_requested || requestingCsat}
                  onClick={onRequestRating}
                >
                  <Star />
                  {requestingCsat ? "Sending…" : conv.csat_requested ? "Rating requested" : "Request rating"}
                </button>
                <div className="mt-1" style={{ fontSize: 11, color: "var(--at-neutral-400)" }}>
                  {conv.csat_requested
                    ? "Survey link sent — waiting on the customer."
                    : "Sends the customer a one-tap survey link."}
                </div>
              </>
            )}

            {(firstResponseMin != null || conv.qualified || conv.lead_score != null) && (
              <div className="d-flex flex-wrap gap-1 mt-3">
                {conv.qualified && <Tag tone="ok">Qualified</Tag>}
                {conv.lead_score != null && <Tag>Score {conv.lead_score}</Tag>}
                {firstResponseMin != null && (
                  <Tag icon={<MessageSquare />}>
                    First reply {firstResponseMin === 0 ? "< 1 min" : `${firstResponseMin} min`}
                  </Tag>
                )}
              </div>
            )}
          </Section>
        )}

        {ticket && (
          <Section title="This ticket" icon={<SlidersHorizontal />}>
            <div className="d-flex flex-wrap gap-1">
              {ticket.category && <Tag>{ticket.category}</Tag>}
              <Tag tone={ticket.priority === "high" ? "danger" : "plain"}>{ticket.priority} priority</Tag>
              {ticket.ai_deflected && <Tag tone="accent">Answered by AI</Tag>}
            </div>
            {ticket.ai_summary && (
              <div className="mt-2" style={{ fontSize: 12, color: "var(--at-neutral-500)", lineHeight: 1.5 }}>
                {ticket.ai_summary}
              </div>
            )}
          </Section>
        )}

        {!conv && !ticket && (
          <div className="px-3 py-4 text-center" style={{ fontSize: 12, color: "var(--at-neutral-400)" }}>
            <UserRound width={20} height={20} className="mb-2 d-block mx-auto" />
            Open a conversation to see who wrote in.
          </div>
        )}
      </div>
    </div>
  );
}
