// Phoxta — paystack-refund: a member refunds a customer's storefront payment
// (order or reservation) through Paystack, fully or partially.
//   { orgId, orderId? | reservationId?, amountCents?, restock? }
//   - omit amountCents → refund the full remaining amount
//   - full order refunds restock inventory (product + exact size/colour
//     variant) unless restock === false
// Orders track refunded_cents/status (refunded | partially_refunded);
// reservations are cancelled with metadata.refunded stamped. Idempotent:
// an already-fully-refunded record is refused.
import { preflight, json } from "../_shared/cors.ts";
import { authorize } from "../_shared/auth.ts";
import { paystack, toChargeMinor, PS_KEY } from "../_shared/paystack.ts";
import type { SupabaseClient } from "../_shared/supabaseAdmin.ts";

// deno-lint-ignore no-explicit-any
type Json = any;

/** Put stock back for every line of a fully refunded order — mirrors
 *  app_cancel_order_admin(): product counter (when tracked) + the exact
 *  size/colour variant recorded on the item's metadata. */
async function restockOrder(admin: SupabaseClient, orderId: string): Promise<void> {
  const { data: items } = await admin
    .from("order_items")
    .select("product_id, quantity, metadata")
    .eq("order_id", orderId);
  for (const it of ((items as Json[]) ?? [])) {
    if (!it.product_id) continue;
    const qty = Number(it.quantity) || 0;
    if (qty <= 0) continue;

    const { data: prod } = await admin.from("products").select("stock").eq("id", it.product_id).maybeSingle();
    if (prod && (prod as Json).stock !== null && (prod as Json).stock !== undefined) {
      await admin.from("products").update({ stock: Number((prod as Json).stock) + qty }).eq("id", it.product_id);
    }

    const size = String(it.metadata?.size ?? "");
    const color = String(it.metadata?.color ?? "");
    if (size || color) {
      let q = admin.from("product_variants").select("id, stock").eq("product_id", it.product_id);
      if (size) q = q.eq("size", size);
      if (color) q = q.eq("color", color);
      const { data: variants } = await q.order("size").order("color").limit(1);
      const v = (variants as Json[] | null)?.[0];
      if (v) await admin.from("product_variants").update({ stock: Number(v.stock) + qty }).eq("id", v.id);
    }
  }
}

Deno.serve(async (req) => {
  const pf = preflight(req);
  if (pf) return pf;
  try {
    const body = (await req.json().catch(() => ({}))) as Json;
    const orgId = body?.orgId;
    const orderId = body?.orderId ? String(body.orderId) : "";
    const reservationId = body?.reservationId ? String(body.reservationId) : "";
    if (!orderId && !reservationId) return json({ error: "Nothing to refund." }, 400);

    const a = await authorize(req, orgId);
    if (a.error) return a.error;
    const { admin } = a.ok;

    if (!PS_KEY) return json({ error: "Payments are not configured yet." }, 400);

    // Partial amount (USD cents): reject garbage instead of coercing to 0.
    let amountCents: number | null = null;
    if (body?.amountCents !== undefined && body?.amountCents !== null && body?.amountCents !== "") {
      const n = Number(body.amountCents);
      if (!Number.isFinite(n) || !Number.isInteger(n) || n <= 0) {
        return json({ error: "Invalid refund amount." }, 400);
      }
      amountCents = n;
    }

    // ── Order refund ─────────────────────────────────────────────────────────
    if (orderId) {
      const { data: ord } = await admin
        .from("orders")
        .select("id, status, total_cents, refunded_cents, payment_reference")
        .eq("id", orderId)
        .eq("organization_id", orgId)
        .maybeSingle();
      if (!ord) return json({ error: "Order not found." }, 404);
      const o = ord as Json;
      if (!o.payment_reference) return json({ error: "No payment on record for this order." }, 400);

      const total = Number(o.total_cents) || 0;
      const already = Number(o.refunded_cents) || 0;
      const remaining = total - already;
      if (remaining <= 0 || o.status === "refunded") {
        return json({ error: "This order has already been fully refunded." }, 400);
      }

      const amount = amountCents === null ? remaining : Math.min(amountCents, remaining);
      // deno-lint-ignore no-explicit-any
      const payload: Record<string, any> = { transaction: o.payment_reference };
      // Pass an explicit amount for any refund that isn't the whole original
      // charge (a caller-chosen partial, or completing an earlier partial).
      if (amount < total) payload.amount = toChargeMinor(amount);
      const r = await paystack("/refund", { method: "POST", body: JSON.stringify(payload) });
      if (!r.ok) return json({ error: r.body?.message || "Paystack refused the refund." }, 400);

      const newRefunded = already + amount;
      const fullyRefunded = newRefunded >= total;
      await admin
        .from("orders")
        .update({ refunded_cents: newRefunded, status: fullyRefunded ? "refunded" : "partially_refunded" })
        .eq("id", orderId)
        .eq("organization_id", orgId);

      if (fullyRefunded && body?.restock !== false) await restockOrder(admin, orderId);
      return json({ ok: true, refunded_cents: newRefunded });
    }

    // ── Reservation refund ───────────────────────────────────────────────────
    const { data: resv } = await admin
      .from("reservations")
      .select("id, status, total_cents, metadata")
      .eq("id", reservationId)
      .eq("organization_id", orgId)
      .maybeSingle();
    if (!resv) return json({ error: "Reservation not found." }, 404);
    const rv = resv as Json;
    const meta = (rv.metadata ?? {}) as Json;
    if (!meta.payment_reference) return json({ error: "No payment on record for this reservation." }, 400);
    if (meta.refunded === true) return json({ error: "This reservation has already been refunded." }, 400);

    const total = Number(rv.total_cents) || 0;
    const amount = amountCents === null ? total : Math.min(amountCents, total);
    // deno-lint-ignore no-explicit-any
    const payload: Record<string, any> = { transaction: meta.payment_reference };
    if (amount < total) payload.amount = toChargeMinor(amount);
    const r = await paystack("/refund", { method: "POST", body: JSON.stringify(payload) });
    if (!r.ok) return json({ error: r.body?.message || "Paystack refused the refund." }, 400);

    await admin
      .from("reservations")
      .update({
        status: "cancelled",
        metadata: { ...meta, refunded: true, refunded_at: new Date().toISOString(), refunded_cents: amount },
      })
      .eq("id", reservationId)
      .eq("organization_id", orgId);

    return json({ ok: true, refunded_cents: amount });
  } catch (err) {
    return json({ error: String((err as Error)?.message || err) }, 500);
  }
});
