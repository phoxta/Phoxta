// Phoxta — stripe-webhook: everything Stripe confirms, applied here and nowhere else.
//
//   checkout.session.completed  kind=domain_purchase → register the domain on Vercel
//                               kind=blueprint       → provision the business
//                               kind=subscription    → activate the plan
//   customer.subscription.updated/deleted            → keep the plan row in sync
//   invoice.payment_failed                           → past_due
//
// Fulfilment lives here because this is the only place that knows the money
// actually moved. Deploy with --no-verify-jwt: Stripe calls with a signature,
// not a Supabase JWT.
import { json } from "../_shared/cors.ts";
import { adminClient } from "../_shared/supabaseAdmin.ts";
import { vercelFetch, attachDomainPair } from "../_shared/vercel.ts";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";
import { PLANS, ensurePrice } from "../_shared/stripe.ts";

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
    // ── A business bought from the marketplace ──────────────────────────────
    if (m.kind === "blueprint" && m.purchase_id) {
      const admin = adminClient();

      // Claim the pending purchase atomically. Stripe retries, and two
      // deliveries that both provisioned would hand out the business twice.
      const { data: claimed } = await admin
        .from("purchases")
        .update({ status: "paid", stripe_payment_intent: s.payment_intent ?? null, reference: s.id })
        .eq("id", m.purchase_id)
        .eq("status", "pending")
        .select("id")
        .maybeSingle();

      if (claimed) {
        const { data: newOrgId, error } = await admin.rpc("app_provision_business_paid", {
          p_user: m.user_id,
          p_blueprint: m.blueprint_id,
          p_name: m.business_name || null,
          p_purchase: m.purchase_id,
        });

        if (error) {
          // The money landed. Leave the purchase 'paid' so support can finish it
          // by hand rather than silently losing a sale.
          console.error("provisioning failed", error.message);
        } else if (newOrgId) {
          // Every purchased business includes its first month of Growth free,
          // and real billing starts automatically when it ends. Stripe does this
          // natively with trial_end, using the card kept at checkout — no second
          // visit and no scheduled job to miss.
          const freeUntil = Math.floor(Date.now() / 1000) + 30 * 24 * 3600;
          let subId: string | null = null;
          const customerId = typeof s.customer === "string" ? s.customer : s.customer?.id ?? null;

          if (customerId) {
            try {
              const price = await ensurePrice("growth");
              if (price.id) {
                // The checkout saved the card off-session; make it the default so
                // the first real invoice can be collected without the buyer.
                const pi = s.payment_intent
                  ? await stripe.paymentIntents.retrieve(String(s.payment_intent))
                  : null;
                if (pi?.payment_method) {
                  await stripe.customers.update(customerId, {
                    invoice_settings: { default_payment_method: String(pi.payment_method) },
                  });
                }
                const created = await stripe.subscriptions.create({
                  customer: customerId,
                  items: [{ price: price.id }],
                  trial_end: freeUntil,
                  metadata: { kind: "subscription", org_id: newOrgId, plan: "growth" },
                });
                subId = created.id;
              }
            } catch (e) {
              // The business is provisioned and the free month still stands; only
              // the automatic follow-on billing failed to schedule.
              console.error("could not schedule post-trial billing", (e as Error).message);
            }
          }

          await admin.from("subscriptions").upsert(
            {
              organization_id: newOrgId,
              plan: "growth",
              status: "trialing",
              amount_cents: PLANS.growth.monthlyPence,
              currency: "GBP",
              current_period_end: new Date(freeUntil * 1000).toISOString(),
              stripe_customer_id: customerId,
              stripe_subscription_id: subId,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "organization_id" },
          );
        }
      }
    }

    // ── A business went onto a monthly plan ─────────────────────────────────
    if (m.kind === "subscription" && m.org_id) {
      const admin = adminClient();
      const subId = typeof s.subscription === "string" ? s.subscription : s.subscription?.id ?? null;
      const customerId = typeof s.customer === "string" ? s.customer : s.customer?.id ?? null;
      const plan = String(m.plan ?? "growth") as keyof typeof PLANS;
      let periodEnd: string | null = null;
      if (subId) {
        try {
          const sub = await stripe.subscriptions.retrieve(subId);
          periodEnd = new Date(sub.current_period_end * 1000).toISOString();
        } catch { /* the row is still worth writing without it */ }
      }
      await admin.from("subscriptions").upsert(
        {
          organization_id: m.org_id,
          plan,
          status: "active",
          amount_cents: PLANS[plan]?.monthlyPence ?? 0,
          currency: "GBP",
          current_period_end: periodEnd,
          stripe_customer_id: customerId,
          stripe_subscription_id: subId,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "organization_id" },
      );
    }
  }

  // ── Plan lifecycle ────────────────────────────────────────────────────────
  // Stripe owns the truth about whether a subscription is live, so the row
  // follows it rather than being guessed at from the last thing the app did.
  if (event.type === "customer.subscription.updated" || event.type === "customer.subscription.deleted") {
    // deno-lint-ignore no-explicit-any
    const sub = event.data.object as any;
    const orgId = sub.metadata?.org_id;
    if (orgId) {
      const admin = adminClient();
      const STATUS: Record<string, string> = {
        trialing: "trialing",
        active: "active",
        past_due: "past_due",
        unpaid: "past_due",
        incomplete: "past_due",
        canceled: "canceled",
        incomplete_expired: "canceled",
      };
      const planKey = String(sub.metadata?.plan ?? "") as keyof typeof PLANS;
      await admin
        .from("subscriptions")
        .update({
          status: event.type.endsWith("deleted") ? "canceled" : (STATUS[sub.status] ?? "active"),
          ...(PLANS[planKey] ? { plan: planKey, amount_cents: PLANS[planKey].monthlyPence } : {}),
          current_period_end: sub.current_period_end ? new Date(sub.current_period_end * 1000).toISOString() : null,
          stripe_subscription_id: sub.id,
          updated_at: new Date().toISOString(),
        })
        .eq("organization_id", orgId);
    }
  }

  if (event.type === "invoice.payment_failed") {
    // deno-lint-ignore no-explicit-any
    const inv = event.data.object as any;
    const subId = typeof inv.subscription === "string" ? inv.subscription : null;
    if (subId) {
      const admin = adminClient();
      await admin
        .from("subscriptions")
        .update({ status: "past_due", updated_at: new Date().toISOString() })
        .eq("stripe_subscription_id", subId);
    }
  }

  return json({ received: true });
});
