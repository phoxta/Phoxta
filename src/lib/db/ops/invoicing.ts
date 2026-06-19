import { supabase } from "@/lib/supabaseClient";
import { friendlyError } from "@/lib/friendlyError";

export type InvoiceStatus = "draft" | "sent" | "paid" | "void";
export type Invoice = {
  id: string;
  number: string;
  customer_name: string;
  customer_email: string;
  status: InvoiceStatus;
  issue_date: string;
  due_date: string | null;
  total_cents: number;
  currency: string;
  created_at: string;
};
export type InvoiceItemInput = { description: string; quantity: number; unit_price_cents: number };
export type InvoiceItem = { id: string; description: string; quantity: number; unit_price_cents: number };

const INVOICE_SELECT =
  "id, number, customer_name, customer_email, status, issue_date, due_date, total_cents, currency, created_at";

export async function listInvoices(orgId: string): Promise<{ data: Invoice[]; error: string | null }> {
  const { data, error } = await supabase
    .from("invoices")
    .select(INVOICE_SELECT)
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false });
  return { data: (data as Invoice[] | null) ?? [], error: friendlyError(error?.message) };
}

export async function createInvoice(
  orgId: string,
  input: { customer_name: string; customer_email?: string; due_date?: string | null; items: InvoiceItemInput[] },
): Promise<{ error: string | null }> {
  const total = input.items.reduce((s, i) => s + i.quantity * i.unit_price_cents, 0);
  const number = `INV-${Date.now().toString().slice(-6)}`;
  const { data: invoice, error } = await supabase
    .from("invoices")
    .insert({
      organization_id: orgId,
      number,
      customer_name: input.customer_name.trim(),
      customer_email: input.customer_email?.trim() ?? "",
      due_date: input.due_date || null,
      total_cents: total,
      status: "draft",
    })
    .select("id")
    .single();
  if (error || !invoice) return { error: friendlyError(error?.message) };

  if (input.items.length > 0) {
    const { error: itemsErr } = await supabase.from("invoice_items").insert(
      input.items.map((i) => ({
        organization_id: orgId,
        invoice_id: (invoice as { id: string }).id,
        description: i.description,
        quantity: i.quantity,
        unit_price_cents: i.unit_price_cents,
      })),
    );
    if (itemsErr) return { error: friendlyError(itemsErr.message) };
  }
  return { error: null };
}

export async function getInvoiceItems(invoiceId: string): Promise<{ data: InvoiceItem[]; error: string | null }> {
  const { data, error } = await supabase
    .from("invoice_items")
    .select("id, description, quantity, unit_price_cents")
    .eq("invoice_id", invoiceId);
  return { data: (data as InvoiceItem[] | null) ?? [], error: friendlyError(error?.message) };
}

export async function setInvoiceStatus(id: string, status: InvoiceStatus): Promise<{ error: string | null }> {
  const { error } = await supabase.from("invoices").update({ status }).eq("id", id);
  return { error: friendlyError(error?.message) };
}

// --- Recurring subscriptions (per business) --------------------------------
export type SubStatus = "active" | "paused" | "canceled";
export type CustomerSubscription = {
  id: string;
  plan_name: string;
  amount_cents: number;
  currency: string;
  interval: "monthly" | "yearly";
  status: SubStatus;
  current_period_end: string | null;
  created_at: string;
};

export async function listCustomerSubscriptions(
  orgId: string,
): Promise<{ data: CustomerSubscription[]; error: string | null }> {
  const { data, error } = await supabase
    .from("customer_subscriptions")
    .select("id, plan_name, amount_cents, currency, interval, status, current_period_end, created_at")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false });
  return { data: (data as CustomerSubscription[] | null) ?? [], error: friendlyError(error?.message) };
}

export async function createCustomerSubscription(
  orgId: string,
  input: { plan_name: string; amount_cents: number; interval?: "monthly" | "yearly" },
): Promise<{ error: string | null }> {
  const periodDays = input.interval === "yearly" ? 365 : 30;
  const { error } = await supabase.from("customer_subscriptions").insert({
    organization_id: orgId,
    plan_name: input.plan_name.trim(),
    amount_cents: input.amount_cents,
    interval: input.interval ?? "monthly",
    status: "active",
    current_period_end: new Date(Date.now() + periodDays * 86400000).toISOString(),
  });
  return { error: friendlyError(error?.message) };
}

export async function setSubscriptionStatus(id: string, status: SubStatus): Promise<{ error: string | null }> {
  const { error } = await supabase.from("customer_subscriptions").update({ status }).eq("id", id);
  return { error: friendlyError(error?.message) };
}
