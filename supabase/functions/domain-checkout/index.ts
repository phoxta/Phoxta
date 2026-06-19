// Phoxta — domain-checkout: start a Stripe Checkout for buying a domain. Validates
// availability + price via Vercel, creates a 'pending' domain row, and returns a
// Stripe Checkout URL. The stripe-webhook finalizes the purchase (registers the
// domain on Vercel) after payment succeeds — so the BUYER is charged (with our
// markup), not the platform's Vercel account.
import { preflight, json } from "../_shared/cors.ts";
import { authorize } from "../_shared/auth.ts";
import { adminClient } from "../_shared/supabaseAdmin.ts";
import { vercelFetch, vercelConfigured, CNAME_TARGET } from "../_shared/vercel.ts";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";

const STRIPE_KEY = Deno.env.get("STRIPE_SECRET_KEY") ?? "";
const MARKUP = 1.25;
const stripe = STRIPE_KEY ? new Stripe(STRIPE_KEY, { apiVersion: "2023-10-16", httpClient: Stripe.createFetchHttpClient() }) : null;

const normalizeHost = (s: string) => String(s || "").trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "").replace(/\.$/, "");

Deno.serve(async (req) => {
  const pf = preflight(req);
  if (pf) return pf;
  try {
    const body = await req.json().catch(() => ({}));
    if (!vercelConfigured()) return json({ error: "The domain service isn't configured yet." }, 503);
    if (!stripe) return json({ error: "Payments aren't configured yet (missing STRIPE_SECRET_KEY)." }, 503);

    const auth = await authorize(req, body.orgId);
    if (auth.error) return auth.error;

    const host = normalizeHost(body.hostname);
    if (!/^([a-z0-9-]+\.)+[a-z]{2,}$/.test(host)) return json({ error: "Enter a valid domain." }, 400);
    const returnUrl = (String(body.returnUrl || "").split("?")[0]) || "https://www.phoxta.com/dashboard";

    const st = await vercelFetch(`/v4/domains/status?name=${encodeURIComponent(host)}`);
    if (!st.body?.available) return json({ error: "That domain isn't available." }, 400);
    const pr = await vercelFetch(`/v4/domains/price?name=${encodeURIComponent(host)}`);
    const wholesale = typeof pr.body?.price === "number" ? pr.body.price : null;
    if (wholesale == null) return json({ error: "That domain can't be purchased right now." }, 400);
    const retailCents = Math.ceil(wholesale * MARKUP) * 100;

    const admin = adminClient();
    await admin.from("domains").upsert(
      { organization_id: body.orgId, hostname: host, kind: "custom", status: "pending", source: "purchased", dns_target: CNAME_TARGET, purchase_cents: retailCents },
      { onConflict: "hostname" },
    );

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [{
        price_data: { currency: "usd", product_data: { name: `Domain registration: ${host}`, description: "1 year · auto-renews" }, unit_amount: retailCents },
        quantity: 1,
      }],
      success_url: `${returnUrl}?domain=success&host=${encodeURIComponent(host)}`,
      cancel_url: `${returnUrl}?domain=cancel`,
      metadata: { kind: "domain_purchase", orgId: body.orgId, hostname: host, wholesale: String(wholesale) },
    });

    await admin.from("domains").update({ stripe_session: session.id }).eq("hostname", host);
    return json({ url: session.url });
  } catch (err) {
    return json({ error: String((err as Error)?.message || err) }, 500);
  }
});
