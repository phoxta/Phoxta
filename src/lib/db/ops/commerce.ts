import { supabase } from "@/lib/supabaseClient";
import { friendlyError } from "@/lib/friendlyError";

// --- Products --------------------------------------------------------------
export type ProductStatus = "active" | "draft" | "archived";
export type Product = {
  id: string;
  name: string;
  sku: string;
  description: string;
  price_cents: number;
  currency: string;
  stock: number;
  status: ProductStatus;
  image_url: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

const PRODUCT_SELECT = "id, name, sku, description, price_cents, currency, stock, status, image_url, metadata, created_at";

export async function listProducts(orgId: string): Promise<{ data: Product[]; error: string | null }> {
  const { data, error } = await supabase
    .from("products")
    .select(PRODUCT_SELECT)
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false });
  return { data: (data as Product[] | null) ?? [], error: friendlyError(error?.message) };
}

export async function createProduct(
  orgId: string,
  input: { name: string; sku?: string; description?: string; price_cents: number; stock?: number; status?: ProductStatus; image_url?: string | null; metadata?: Record<string, unknown> },
): Promise<{ error: string | null }> {
  const { error } = await supabase.from("products").insert({
    organization_id: orgId,
    name: input.name.trim(),
    sku: input.sku?.trim() ?? "",
    description: input.description ?? "",
    price_cents: input.price_cents,
    stock: input.stock ?? 0,
    status: input.status ?? "active",
    image_url: input.image_url ?? null,
    metadata: input.metadata ?? {},
  });
  return { error: friendlyError(error?.message) };
}

export async function updateProduct(
  id: string,
  patch: Partial<Pick<Product, "name" | "description" | "price_cents" | "stock" | "status" | "image_url" | "metadata">>,
): Promise<{ error: string | null }> {
  const { error } = await supabase.from("products").update(patch).eq("id", id);
  return { error: friendlyError(error?.message) };
}

/** Upload a catalogue/menu item image to Storage and return its public URL.
 *  Stored under the org's folder so RLS scopes writes to members. */
export async function uploadProductImage(orgId: string, file: File): Promise<{ url: string | null; error: string | null }> {
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
  const path = `${orgId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from("catalog").upload(path, file, { upsert: false, contentType: file.type || undefined });
  if (error) return { url: null, error: friendlyError(error.message) };
  const { data } = supabase.storage.from("catalog").getPublicUrl(path);
  return { url: data.publicUrl, error: null };
}

// --- Orders + fulfillment --------------------------------------------------
export type OrderStatus = "pending" | "paid" | "fulfilled" | "cancelled" | "refunded" | "partially_refunded";
export type Order = {
  id: string;
  customer_name: string;
  customer_email: string;
  status: OrderStatus;
  fulfillment_status: "unfulfilled" | "fulfilled";
  total_cents: number;
  currency: string;
  created_at: string;
  payment_reference: string | null;
  paid_at: string | null;
  discount_cents: number | null;
  promo_code: string | null;
  notes: string | null;
  shipping: Record<string, unknown> | null;
  source: string | null;
  refunded_cents: number | null;
  tracking: string | null;
};
export type OrderItemInput = { name: string; quantity: number; unit_price_cents: number; product_id?: string | null };
export type OrderItem = { id: string; name: string; quantity: number; unit_price_cents: number };

const ORDER_SELECT =
  "id, customer_name, customer_email, status, fulfillment_status, total_cents, currency, created_at, payment_reference, paid_at, discount_cents, promo_code, notes, shipping, source, refunded_cents, tracking";

/** Paged newest-first order list. Fetches one extra row to signal `hasMore`. */
export async function listOrders(orgId: string, limit = 50): Promise<{ data: Order[]; hasMore: boolean; error: string | null }> {
  const { data, error } = await supabase
    .from("orders")
    .select(ORDER_SELECT)
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false })
    .limit(limit + 1);
  const rows = (data as Order[] | null) ?? [];
  return { data: rows.slice(0, limit), hasMore: rows.length > limit, error: friendlyError(error?.message) };
}

export async function createOrder(
  orgId: string,
  input: { customer_name: string; customer_email?: string; status?: OrderStatus; notes?: string; currency?: string; items: OrderItemInput[] },
): Promise<{ error: string | null }> {
  const total = input.items.reduce((s, i) => s + i.quantity * i.unit_price_cents, 0);
  const { data: order, error } = await supabase
    .from("orders")
    .insert({
      organization_id: orgId,
      customer_name: input.customer_name.trim(),
      customer_email: input.customer_email?.trim() ?? "",
      status: input.status ?? "pending",
      total_cents: total,
      source: "console",
      ...(input.notes ? { notes: input.notes } : {}),
      ...(input.currency ? { currency: input.currency } : {}),
      ...(input.status === "paid" ? { paid_at: new Date().toISOString() } : {}),
    })
    .select("id")
    .single();
  if (error || !order) return { error: friendlyError(error?.message) };

  if (input.items.length > 0) {
    const { error: itemsErr } = await supabase.from("order_items").insert(
      input.items.map((i) => ({
        organization_id: orgId,
        order_id: (order as { id: string }).id,
        product_id: i.product_id ?? null,
        name: i.name,
        quantity: i.quantity,
        unit_price_cents: i.unit_price_cents,
      })),
    );
    if (itemsErr) return { error: friendlyError(itemsErr.message) };
  }
  return { error: null };
}

export async function getOrderItems(orderId: string): Promise<{ data: OrderItem[]; error: string | null }> {
  const { data, error } = await supabase
    .from("order_items")
    .select("id, name, quantity, unit_price_cents")
    .eq("order_id", orderId);
  return { data: (data as OrderItem[] | null) ?? [], error: friendlyError(error?.message) };
}

export async function setOrderStatus(id: string, status: OrderStatus): Promise<{ error: string | null }> {
  const patch: Record<string, unknown> = { status };
  if (status === "paid") patch.paid_at = new Date().toISOString();
  const { error } = await supabase.from("orders").update(patch).eq("id", id);
  return { error: friendlyError(error?.message) };
}

/** Mark an order fulfilled. Touches ONLY fulfillment_status — `status` stays the
 *  financial truth ('paid' etc). Optionally records a tracking number. */
export async function fulfillOrder(id: string, tracking?: string): Promise<{ error: string | null }> {
  const patch: Record<string, unknown> = { fulfillment_status: "fulfilled" };
  if (tracking && tracking.trim()) patch.tracking = tracking.trim();
  const { error } = await supabase.from("orders").update(patch).eq("id", id);
  return { error: friendlyError(error?.message) };
}

export async function saveOrderTracking(id: string, tracking: string): Promise<{ error: string | null }> {
  const { error } = await supabase.from("orders").update({ tracking: tracking.trim() || null }).eq("id", id);
  return { error: friendlyError(error?.message) };
}

/** Member-guarded cancel with stock restore (product + exact size/colour variant). */
export async function cancelOrder(orderId: string, restock = true): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc("app_cancel_order", { p_order: orderId, p_restock: restock });
  return { error: friendlyError(error?.message) };
}

// --- Edge-function bridges -------------------------------------------------
async function invokeEdge<T>(name: string, body: Record<string, unknown>): Promise<{ data: T | null; error: string | null }> {
  const { data, error } = await supabase.functions.invoke(name, { body });
  if (error) {
    let serverMessage: string | null = null;
    try {
      const ctx = (error as { context?: Response }).context;
      if (ctx && typeof ctx.json === "function") {
        const payload = await ctx.json();
        if (payload?.error) serverMessage = String(payload.error);
      }
    } catch {
      /* fall through */
    }
    return { data: null, error: serverMessage ?? friendlyError(error.message) };
  }
  if (data && typeof data === "object" && "error" in data && (data as { error?: unknown }).error) {
    return { data: null, error: String((data as { error: unknown }).error) };
  }
  return { data: (data as T) ?? null, error: null };
}

export type CommerceNotifyKind =
  | "order_fulfilled"
  | "order_cancelled"
  | "reservation_confirmed"
  | "reservation_cancelled"
  | "booking_confirmed"
  | "booking_cancelled"
  | "invoice_reminder";

/** Notify the customer about an order/reservation/booking event (commerce-notify fn). */
export async function notifyCommerce(
  orgId: string,
  input: { kind: CommerceNotifyKind; orderId?: string; reservationId?: string; bookingId?: string; invoiceId?: string; tracking?: string; subject?: string; message?: string },
): Promise<{ delivery: "sent" | "no-email" | "failed" | null; error: string | null }> {
  const { data, error } = await invokeEdge<{ ok: boolean; delivery: "sent" | "no-email" | "failed" }>("commerce-notify", { orgId, ...input });
  return { delivery: data?.delivery ?? null, error };
}

/** Full or partial Paystack refund. Omit amountCents for a full refund. */
export async function refundOrder(
  orgId: string,
  orderId: string,
  amountCents?: number,
  restock?: boolean,
): Promise<{ refundedCents: number | null; error: string | null }> {
  const body: Record<string, unknown> = { orgId, orderId };
  if (typeof amountCents === "number") body.amountCents = amountCents;
  if (typeof restock === "boolean") body.restock = restock;
  const { data, error } = await invokeEdge<{ ok: boolean; refunded_cents: number }>("paystack-refund", body);
  return { refundedCents: data?.refunded_cents ?? null, error };
}
