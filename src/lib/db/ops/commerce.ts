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
export type OrderStatus = "pending" | "paid" | "fulfilled" | "cancelled" | "refunded";
export type Order = {
  id: string;
  customer_name: string;
  customer_email: string;
  status: OrderStatus;
  fulfillment_status: "unfulfilled" | "fulfilled";
  total_cents: number;
  currency: string;
  created_at: string;
};
export type OrderItemInput = { name: string; quantity: number; unit_price_cents: number; product_id?: string | null };
export type OrderItem = { id: string; name: string; quantity: number; unit_price_cents: number };

const ORDER_SELECT = "id, customer_name, customer_email, status, fulfillment_status, total_cents, currency, created_at";

export async function listOrders(orgId: string): Promise<{ data: Order[]; error: string | null }> {
  const { data, error } = await supabase
    .from("orders")
    .select(ORDER_SELECT)
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false });
  return { data: (data as Order[] | null) ?? [], error: friendlyError(error?.message) };
}

export async function createOrder(
  orgId: string,
  input: { customer_name: string; customer_email?: string; status?: OrderStatus; items: OrderItemInput[] },
): Promise<{ error: string | null }> {
  const total = input.items.reduce((s, i) => s + i.quantity * i.unit_price_cents, 0);
  const { data: order, error } = await supabase
    .from("orders")
    .insert({
      organization_id: orgId,
      customer_name: input.customer_name.trim(),
      customer_email: input.customer_email?.trim() ?? "",
      status: input.status ?? "paid",
      total_cents: total,
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
  const { error } = await supabase.from("orders").update({ status }).eq("id", id);
  return { error: friendlyError(error?.message) };
}

export async function fulfillOrder(id: string): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from("orders")
    .update({ fulfillment_status: "fulfilled", status: "fulfilled" })
    .eq("id", id);
  return { error: friendlyError(error?.message) };
}
