// Phoxta — paystack-storefront-checkout: tenant storefronts finally take money.
// Anon-callable (the buyer is a storefront guest): initializes a Paystack
// transaction for an existing pending order or reservation. Fulfilment happens
// ONLY in paystack-webhook (kind storefront_order / storefront_reservation).
//
// Split payments: when the tenant org has organizations.paystack_subaccount set,
// the charge is routed to that subaccount (tenant receives settlement, Paystack
// fees apply per the subaccount's configuration). Without one, funds land in
// the platform account and the platform owes the tenant — surfaced in the ops
// console so nobody is surprised.
//
// returnUrl safety: the return host must resolve (app_resolve_domain) to the
// SAME org the record belongs to, so a checkout can't bounce a buyer to an
// attacker's site. Falls back to the order-tracking page on the primary host.
import { preflight, json } from "../_shared/cors.ts";
import { adminClient } from "../_shared/supabaseAdmin.ts";
import { PS_KEY, CURRENCY, RATE, toChargeMinor, paystack } from "../_shared/paystack.ts";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function validReturnUrl(admin: ReturnType<typeof adminClient>, orgId: string, raw: unknown): Promise<string | null> {
  try {
    const url = new URL(String(raw ?? ""));
    if (!/^https?:$/.test(url.protocol)) return null;
    const { data } = await admin.rpc("app_resolve_domain", { p_host: url.host });
    const row = Array.isArray(data) ? data[0] : data;
    if (row?.organization_id === orgId) return `${url.origin}${url.pathname}`;
  } catch { /* invalid */ }
  return null;
}

Deno.serve(async (req) => {
  const pf = preflight(req);
  if (pf) return pf;
  try {
    if (!PS_KEY) return json({ error: "Payments aren't configured yet." }, 503);
    if (!RATE || RATE <= 0) return json({ error: "Payments misconfigured (currency rate)." }, 503);
    const body = await req.json().catch(() => ({}));
    const orgId = String(body.orgId ?? "");
    const kind = body.kind === "reservation" ? "reservation" : "order";
    const recordId = String(body.id ?? "");
    if (!orgId || !recordId) return json({ error: "Missing order details." }, 400);

    const admin = adminClient();
    const { data: org } = await admin
      .from("organizations").select("id, name, paystack_subaccount").eq("id", orgId).maybeSingle();
    if (!org) return json({ error: "Unknown business." }, 404);

    let totalCents = 0;
    let email = "";
    let reference: string;
    if (kind === "order") {
      const { data: o } = await admin
        .from("orders").select("id, status, total_cents, customer_email, paid_at")
        .eq("id", recordId).eq("organization_id", orgId).maybeSingle();
      if (!o) return json({ error: "Order not found." }, 404);
      if (o.paid_at) return json({ error: "This order is already paid." }, 400);
      totalCents = o.total_cents;
      email = o.customer_email;
      reference = `sfo_${o.id}`;
    } else {
      const { data: r } = await admin
        .from("reservations").select("id, status, total_cents, customer_email, metadata")
        .eq("id", recordId).eq("organization_id", orgId).maybeSingle();
      if (!r) return json({ error: "Reservation not found." }, 404);
      if ((r.metadata as Record<string, unknown>)?.paid === true) return json({ error: "This reservation is already paid." }, 400);
      if (r.status === "cancelled") return json({ error: "This reservation was cancelled." }, 400);
      totalCents = r.total_cents;
      email = r.customer_email;
      reference = `sfr_${r.id}`;
    }
    if (!totalCents || totalCents <= 0) return json({ error: "Nothing to pay." }, 400);
    if (!EMAIL_RE.test(email)) return json({ error: "The order has no valid email address." }, 400);

    const callback = await validReturnUrl(admin, orgId, body.returnUrl);
    const payload: Record<string, unknown> = {
      email,
      amount: toChargeMinor(totalCents),
      currency: CURRENCY,
      reference: `${reference}_${Date.now().toString(36)}`,
      metadata: {
        kind: kind === "order" ? "storefront_order" : "storefront_reservation",
        org_id: orgId,
        record_id: recordId,
      },
      ...(callback ? { callback_url: callback } : {}),
      ...(org.paystack_subaccount ? { subaccount: org.paystack_subaccount } : {}),
    };
    const init = await paystack(`/transaction/initialize`, { method: "POST", body: JSON.stringify(payload) });
    if (!init.ok) return json({ error: init.body?.message || "Payment could not be started." }, 502);
    return json({ url: init.body?.data?.authorization_url, reference: init.body?.data?.reference });
  } catch (err) {
    return json({ error: String((err as Error)?.message || err) }, 500);
  }
});
