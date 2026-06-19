import { supabase } from "@/lib/supabaseClient";
import { friendlyError } from "@/lib/friendlyError";

// Size × colour variants for a product (retail/fashion). Owners manage per-variant
// stock here; the storefront reads availability from the same rows.
export type Variant = {
  id: string;
  product_id: string;
  size: string;
  color: string;
  sku: string;
  stock: number;
  price_cents: number | null;
};

export async function listVariants(productId: string): Promise<{ data: Variant[]; error: string | null }> {
  const { data, error } = await supabase
    .from("product_variants")
    .select("id, product_id, size, color, sku, stock, price_cents")
    .eq("product_id", productId)
    .order("color")
    .order("size");
  return { data: (data as Variant[] | null) ?? [], error: friendlyError(error?.message) };
}

export async function setVariantStock(id: string, stock: number): Promise<{ error: string | null }> {
  const { error } = await supabase.from("product_variants").update({ stock: Math.max(0, Math.round(stock) || 0) }).eq("id", id);
  return { error: friendlyError(error?.message) };
}

export async function removeVariant(id: string): Promise<{ error: string | null }> {
  const { error } = await supabase.from("product_variants").delete().eq("id", id);
  return { error: friendlyError(error?.message) };
}

/** Create the full size × colour grid from the product's metadata (sizes/colors),
 *  skipping combinations that already exist. New cells start at 0 stock. */
export async function generateVariants(orgId: string, productId: string): Promise<{ created: number; error: string | null }> {
  const { data: prod, error: pErr } = await supabase.from("products").select("metadata").eq("id", productId).single();
  if (pErr) return { created: 0, error: friendlyError(pErr.message) };
  const m = (prod?.metadata ?? {}) as { colors?: string[]; sizes?: string[] };
  const colors = Array.isArray(m.colors) && m.colors.length ? m.colors : ["Default"];
  const sizes = Array.isArray(m.sizes) && m.sizes.length ? m.sizes : ["One size"];

  const { data: existing } = await supabase.from("product_variants").select("size, color").eq("product_id", productId);
  const have = new Set((existing ?? []).map((v: { size: string; color: string }) => `${v.size}|${v.color}`));

  const rows: Array<Record<string, unknown>> = [];
  for (const color of colors) for (const size of sizes) {
    if (!have.has(`${size}|${color}`)) rows.push({ organization_id: orgId, product_id: productId, size, color, stock: 0 });
  }
  if (rows.length === 0) return { created: 0, error: null };
  const { error } = await supabase.from("product_variants").insert(rows);
  return { created: rows.length, error: friendlyError(error?.message) };
}
