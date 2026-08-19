import { supabase } from "@/lib/supabaseClient";
import { friendlyError } from "@/lib/friendlyError";

export type ContactStage = "lead" | "prospect" | "customer" | "churned";
export type Contact = {
  id: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  stage: ContactStage;
  tags: string[];
  notes: string;
  value_cents: number;
  created_at: string;
  lead_score: number | null;
  churn_risk: number | null;
  ai_summary: string | null;
  scored_at: string | null;
  email_opt_out: boolean;
  sms_opt_out: boolean;
  source: string | null;
};

const SELECT =
  "id, name, email, phone, company, stage, tags, notes, value_cents, created_at, lead_score, churn_risk, ai_summary, scored_at, email_opt_out, sms_opt_out, source";

export async function listContacts(orgId: string): Promise<{ data: Contact[]; error: string | null }> {
  const { data, error } = await supabase
    .from("crm_contacts")
    .select(SELECT)
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false });
  return { data: (data as Contact[] | null) ?? [], error: friendlyError(error?.message) };
}

export async function createContact(
  orgId: string,
  input: { name: string; email?: string; phone?: string; company?: string; stage?: ContactStage; value_cents?: number },
): Promise<{ error: string | null }> {
  const { error } = await supabase.from("crm_contacts").insert({
    organization_id: orgId,
    name: input.name.trim(),
    email: input.email?.trim() ?? "",
    phone: input.phone?.trim() ?? "",
    company: input.company?.trim() ?? "",
    stage: input.stage ?? "lead",
    value_cents: input.value_cents ?? 0,
    source: "console",
  });
  return { error: friendlyError(error?.message) };
}

/** Editable contact fields (Contact drawer). */
export type ContactPatch = Partial<{
  name: string;
  email: string;
  phone: string;
  company: string;
  stage: ContactStage;
  tags: string[];
  notes: string;
  value_cents: number;
}>;

export async function updateContact(id: string, patch: ContactPatch): Promise<{ error: string | null }> {
  const { error } = await supabase.from("crm_contacts").update(patch).eq("id", id);
  return { error: friendlyError(error?.message) };
}

export async function updateContactStage(id: string, stage: ContactStage): Promise<{ error: string | null }> {
  const { error } = await supabase.from("crm_contacts").update({ stage }).eq("id", id);
  return { error: friendlyError(error?.message) };
}

export async function deleteContact(id: string): Promise<{ error: string | null }> {
  const { error } = await supabase.from("crm_contacts").delete().eq("id", id);
  return { error: friendlyError(error?.message) };
}

// ---------- Activity timeline (Contact drawer) ----------

/** One event in a contact's merged activity timeline. */
export type ActivityItem = {
  kind: "order" | "conversation" | "ticket" | "booking";
  id: string;
  date: string;
  title: string;
  detail: string;
  status: string;
  amount_cents: number | null;
  currency: string | null;
};

// Only embed the email in PostgREST filters when it can't break the filter
// grammar (commas/parens/quotes) — otherwise we fall back to contact_id only.
const SAFE_EMAIL = /^[^,()"\s]+@[^,()"\s]+$/;

type OrderRow = { id: string; status: string; total_cents: number; currency: string | null; created_at: string };
type ConversationRow = {
  id: string;
  channel_type: string | null;
  status: string;
  intent: string | null;
  summary: string | null;
  last_message_at: string | null;
  created_at: string;
};
type TicketRow = { id: string; subject: string; status: string; created_at: string };
type BookingRow = { id: string; start_at: string | null; status: string; created_at: string; services: { name: string } | null };

/**
 * Merged chronological activity for one contact: orders, conversations,
 * tickets and bookings matched by contact_id OR the contact's email.
 */
export async function fetchContactActivity(
  orgId: string,
  contactId: string,
  email: string,
): Promise<{ data: ActivityItem[]; error: string | null }> {
  const em = (email ?? "").trim().toLowerCase();
  const emailOk = SAFE_EMAIL.test(em);

  let convQuery = supabase
    .from("conversations")
    .select("id, channel_type, status, intent, summary, last_message_at, created_at")
    .eq("organization_id", orgId)
    .not("is_test", "is", true)
    .order("created_at", { ascending: false })
    .limit(20);
  convQuery = emailOk
    ? convQuery.or(`contact_id.eq.${contactId},customer_email.ilike.${em}`)
    : convQuery.eq("contact_id", contactId);

  const [orders, convs, tickets, bookings] = await Promise.all([
    emailOk
      ? supabase
          .from("orders")
          .select("id, status, total_cents, currency, created_at")
          .eq("organization_id", orgId)
          .ilike("customer_email", em)
          .order("created_at", { ascending: false })
          .limit(20)
      : Promise.resolve({ data: [], error: null }),
    convQuery,
    emailOk
      ? supabase
          .from("tickets")
          .select("id, subject, status, created_at")
          .eq("organization_id", orgId)
          .ilike("customer_email", em)
          .order("created_at", { ascending: false })
          .limit(20)
      : Promise.resolve({ data: [], error: null }),
    emailOk
      ? supabase
          .from("bookings")
          .select("id, start_at, status, created_at, services(name)")
          .eq("organization_id", orgId)
          .ilike("customer_email", em)
          .order("created_at", { ascending: false })
          .limit(20)
      : Promise.resolve({ data: [], error: null }),
  ]);

  const firstError = orders.error?.message || convs.error?.message || tickets.error?.message || bookings.error?.message || null;

  const items: ActivityItem[] = [];
  for (const o of (orders.data as OrderRow[] | null) ?? []) {
    items.push({
      kind: "order",
      id: o.id,
      date: o.created_at,
      title: `Order ${o.id.slice(0, 8).toUpperCase()}`,
      detail: o.status,
      status: o.status,
      amount_cents: o.total_cents,
      currency: o.currency,
    });
  }
  for (const c of (convs.data as ConversationRow[] | null) ?? []) {
    items.push({
      kind: "conversation",
      id: c.id,
      date: c.last_message_at ?? c.created_at,
      title: `Conversation${c.channel_type ? ` · ${c.channel_type}` : ""}`,
      detail: c.summary || c.intent || c.status,
      status: c.status,
      amount_cents: null,
      currency: null,
    });
  }
  for (const t of (tickets.data as TicketRow[] | null) ?? []) {
    items.push({
      kind: "ticket",
      id: t.id,
      date: t.created_at,
      title: `Ticket · ${t.subject || "no subject"}`,
      detail: t.status,
      status: t.status,
      amount_cents: null,
      currency: null,
    });
  }
  for (const b of (bookings.data as unknown as BookingRow[] | null) ?? []) {
    items.push({
      kind: "booking",
      id: b.id,
      date: b.start_at ?? b.created_at,
      title: `Booking${b.services?.name ? ` · ${b.services.name}` : ""}`,
      detail: b.start_at ? new Date(b.start_at).toLocaleString() : b.status,
      status: b.status,
      amount_cents: null,
      currency: null,
    });
  }
  items.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));

  return { data: items, error: friendlyError(firstError ?? undefined) };
}
