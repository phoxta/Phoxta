// Phoxta — stripe-webhook: finalizes a paid domain purchase. After Stripe confirms
// payment (checkout.session.completed), register the domain on Vercel, attach it to
// the business's storefront project, and flip the domain row to 'live'. Deploy with
// --no-verify-jwt (Stripe calls this with a signature, not a Supabase JWT).
import { json } from "../_shared/cors.ts";
import { adminClient } from "../_shared/supabaseAdmin.ts";
import { vercelFetch, attachDomainPair } from "../_shared/vercel.ts";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";

const STRIPE_KEY = Deno.env.get("STRIPE_SECRET_KEY") ?? "";
const WH_SECRET = Deno.env.get("STRIPE_WEBHOOK_SECRET") ?? "";
const stripe = new Stripe(STRIPE_KEY, { apiVersion: "2023-10-16", httpClient: Stripe.createFetchHttpClient() });
const cryptoProvider = Stripe.createSubtleCryptoProvider();

Deno.serve(async (req) => {
  const sig = req.headers.get("stripe-signature");
  const payload = await req.text();
  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(payload, sig as string, WH_SECRET, undefined, cryptoProvider);
  } catch (e) {
    return new Response(`Webhook signature error: ${(e as Error).message}`, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    // deno-lint-ignore no-explicit-any
    const s = event.data.object as any;
    const m = s.metadata || {};
    if (m.kind === "domain_purchase" && m.hostname && m.orgId) {
      const admin = adminClient();

      // Stripe retries webhooks. Without an idempotency guard a redelivery
      // re-ran /v4/domains/buy for an already-registered domain, that threw, and
      // the catch below flipped a LIVE, paid domain to 'error'. Only proceed
      // when the row is still in a pre-registration state; claim it atomically
      // so concurrent deliveries can't both register.
      // 'verifying' is the in-flight claim state (already permitted by the
      // domains.status CHECK constraint); it becomes 'live' or 'error' below.
      const { data: claimed } = await admin
        .from("domains")
        .update({ status: "verifying" })
        .eq("hostname", m.hostname)
        .not("status", "in", '("live","verifying")')
        .select("hostname")
        .maybeSingle();
      if (!claimed) return json({ received: true, skipped: "already processed" });

      try {
        const wholesale = Number(m.wholesale) || undefined;
        const buy = await vercelFetch(`/v4/domains/buy`, { method: "POST", body: JSON.stringify({ name: m.hostname, expectedPrice: wholesale, renew: true }) });
        if (!buy.ok) throw new Error(buy.body?.error?.message || "Vercel registration failed");
        const { data } = await admin.rpc("app_org_storefront", { p_org: m.orgId });
        const pid = (data as Array<{ vercel_project_id?: string }>)?.[0]?.vercel_project_id;
        if (pid) await attachDomainPair(pid, m.hostname); // apex + www redirect
        const expires = buy.body?.domain?.expiresAt ? new Date(buy.body.domain.expiresAt).toISOString() : null;
        await admin.from("domains").update({ status: "live", tls_status: "issued", verified_at: new Date().toISOString(), expires_at: expires }).eq("hostname", m.hostname);
      } catch (_e) {
        // Payment succeeded but registration failed — flag for follow-up/refund.
        await admin.from("domains").update({ status: "error" }).eq("hostname", m.hostname);
      }
    }
  }

  return json({ received: true });
});
