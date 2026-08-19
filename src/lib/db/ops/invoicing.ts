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
  input: {
    customer_name: string;
    customer_email?: string;
    due_date?: string | null;
    currency?: string;
    items: InvoiceItemInput[];
  },
): Promise<{ error: string | null }> {
  const total = input.items.reduce((s, i) => s + i.quantity * i.unit_price_cents, 0);
  // Per-org sequential number (INV-0001 …) issued by the database.
  const { data: number, error: numErr } = await supabase.rpc("app_next_invoice_number", { p_org: orgId });
  if (numErr || !number) return { error: friendlyError(numErr?.message ?? "invoice number unavailable") };
  const row: Record<string, unknown> = {
    organization_id: orgId,
    number: number as string,
    customer_name: input.customer_name.trim(),
    customer_email: input.customer_email?.trim() ?? "",
    due_date: input.due_date || null,
    total_cents: total,
    status: "draft",
  };
  if (input.currency) row.currency = input.currency;
  const { data: invoice, error } = await supabase.from("invoices").insert(row).select("id").single();
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

/** Permanently remove a draft invoice and its line items. Drafts only. */
export async function deleteDraftInvoice(id: string): Promise<{ error: string | null }> {
  const { data: inv, error: checkErr } = await supabase.from("invoices").select("id, status").eq("id", id).single();
  if (checkErr || !inv) return { error: friendlyError(checkErr?.message ?? "not found") };
  if ((inv as { status: string }).status !== "draft") return { error: "Only draft invoices can be deleted." };
  const { error: itemsErr } = await supabase.from("invoice_items").delete().eq("invoice_id", id);
  if (itemsErr) return { error: friendlyError(itemsErr.message) };
  const { error } = await supabase.from("invoices").delete().eq("id", id).eq("status", "draft");
  return { error: friendlyError(error?.message) };
}
