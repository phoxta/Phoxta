import { supabase } from "@/lib/supabaseClient";
import { friendlyError } from "@/lib/friendlyError";

// Inbox-specific reads/writes that don't belong in the generic agent lib:
// unread bookkeeping, honest CSAT requests, the Gorgias-style customer
// commerce context rail, and call logs for voice conversations.

/**
 * Public CSAT survey link for a conversation (rendered into a message).
 * Points at the Phoxta domain, not the edge function: the Supabase gateway
 * forces text/plain + a sandbox CSP, so a function URL would reach the
 * customer as raw markup. /rate calls the same function with json=1.
 */
export function csatSurveyUrl(conversationId: string): string {
  return `https://www.phoxta.com/rate?cv=${conversationId}`;
}

/** Opening a conversation clears its unread flag (set by a DB trigger on inbound). */
export async function markConversationRead(convId: string): Promise<{ error: string | null }> {
  const { error } = await supabase.from("conversations").update({ unread: false }).eq("id", convId);
  return { error: friendlyError(error?.message) };
}

/** Record that the customer was sent a rating request (button then disables). */
export async function markCsatRequested(convId: string): Promise<{ error: string | null }> {
  const { error } = await supabase.from("conversations").update({ csat_requested: true }).eq("id", convId);
  return { error: friendlyError(error?.message) };
}

// ---------- Voice: calls attached to a conversation ----------
export type ConversationCall = {
  id: string;
  direction: string;
  outcome: string;
  after_hours: boolean;
  created_at: string;
  recording_url: string | null;
};

export async function listCallsForConversation(convId: string): Promise<{ data: ConversationCall[]; error: string | null }> {
  const { data, error } = await supabase
    .from("call_logs")
    .select("id, direction, outcome, after_hours, created_at, recording_url")
    .eq("conversation_id", convId)
    .order("created_at", { ascending: true });
  return { data: (data as ConversationCall[] | null) ?? [], error: friendlyError(error?.message) };
}

// ---------- Customer commerce context (rail beside the thread) ----------
export type ContextOrder = { id: string; status: string; total_cents: number; currency: string | null; created_at: string };
export type ContextReservation = {
  id: string;
  status: string;
  start_date: string;
  end_date: string;
  total_cents: number;
  currency: string | null;
  product_name: string;
};
export type ContextBooking = { id: string; status: string; start_at: string; service_name: string };
export type ContextContact = { id: string; name: string; stage: string; tags: string[] };
export type CustomerContext = {
  orders: ContextOrder[];
  reservations: ContextReservation[];
  bookings: ContextBooking[];
  contact: ContextContact | null;
  priorConversations: number;
};

const EMPTY_CONTEXT: CustomerContext = { orders: [], reservations: [], bookings: [], contact: null, priorConversations: 0 };

/**
 * Everything the console knows about this customer, looked up by email/phone:
 * recent orders, reservations, bookings, their CRM contact, and how many other
 * conversations they've had. Orders/reservations/bookings only carry an email,
 * so phone-only customers still get contact + prior-conversation matches.
 */
export async function getCustomerContext(
  orgId: string,
  who: { email?: string | null; phone?: string | null; excludeConversationId?: string | null },
): Promise<{ data: CustomerContext; error: string | null }> {
  const email = who.email?.trim() ?? "";
  const phone = who.phone?.trim() ?? "";
  if (!email && !phone) return { data: EMPTY_CONTEXT, error: null };

  const ordersP = email
    ? supabase
        .from("orders")
        .select("id, status, total_cents, currency, created_at")
        .eq("organization_id", orgId)
        .ilike("customer_email", email)
        .order("created_at", { ascending: false })
        .limit(5)
    : Promise.resolve({ data: [], error: null });

  const reservationsP = email
    ? supabase
        .from("reservations")
        .select("id, status, start_date, end_date, total_cents, currency, products(name)")
        .eq("organization_id", orgId)
        .ilike("customer_email", email)
        .order("created_at", { ascending: false })
        .limit(5)
    : Promise.resolve({ data: [], error: null });

  const bookingsP = email
    ? supabase
        .from("bookings")
        .select("id, status, start_at, services(name)")
        .eq("organization_id", orgId)
        .ilike("customer_email", email)
        .order("start_at", { ascending: false })
        .limit(5)
    : Promise.resolve({ data: [], error: null });

  let priorQ = supabase
    .from("conversations")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", orgId)
    .eq("is_test", false);
  if (email && phone) priorQ = priorQ.or(`customer_email.ilike.${email},customer_phone.eq.${phone}`);
  else if (email) priorQ = priorQ.ilike("customer_email", email);
  else priorQ = priorQ.eq("customer_phone", phone);
  if (who.excludeConversationId) priorQ = priorQ.neq("id", who.excludeConversationId);

  const [orders, reservations, bookings, prior] = await Promise.all([ordersP, reservationsP, bookingsP, priorQ]);

  // CRM contact: try the email first, then the phone.
  let contact: ContextContact | null = null;
  if (email) {
    const { data } = await supabase
      .from("crm_contacts")
      .select("id, name, stage, tags")
      .eq("organization_id", orgId)
      .ilike("email", email)
      .limit(1);
    contact = (data?.[0] as ContextContact | undefined) ?? null;
  }
  if (!contact && phone) {
    const { data } = await supabase
      .from("crm_contacts")
      .select("id, name, stage, tags")
      .eq("organization_id", orgId)
      .eq("phone", phone)
      .limit(1);
    contact = (data?.[0] as ContextContact | undefined) ?? null;
  }

  const firstError =
    friendlyError(orders.error?.message) ??
    friendlyError(reservations.error?.message) ??
    friendlyError(bookings.error?.message) ??
    friendlyError(prior.error?.message);

  type Row = Record<string, unknown> & { products?: { name?: string } | null; services?: { name?: string } | null };
  const data: CustomerContext = {
    orders: ((orders.data as ContextOrder[] | null) ?? []),
    reservations: (((reservations.data as Row[] | null) ?? []) as Row[]).map((r) => ({
      id: String(r.id),
      status: String(r.status ?? ""),
      start_date: String(r.start_date ?? ""),
      end_date: String(r.end_date ?? ""),
      total_cents: Number(r.total_cents ?? 0),
      currency: (r.currency as string | null) ?? null,
      product_name: r.products?.name ?? "—",
    })),
    bookings: (((bookings.data as Row[] | null) ?? []) as Row[]).map((b) => ({
      id: String(b.id),
      status: String(b.status ?? ""),
      start_at: String(b.start_at ?? ""),
      service_name: b.services?.name ?? "—",
    })),
    contact,
    priorConversations: prior.count ?? 0,
  };
  return { data, error: firstError };
}
