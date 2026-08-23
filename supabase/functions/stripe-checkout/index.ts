// Phoxta — stripe-checkout: start (or verify) a Stripe payment.
//
// Same five kinds the Paystack version answered, so the client swap is one line:
//   { kind: "blueprint", blueprintId, name?, returnUrl }  — one-time purchase.
//   { kind: "subscription", orgId, plan, returnUrl }      — monthly platform plan.
//   { kind: "change_plan", orgId, plan, returnUrl }       — move between plans.
//   { kind: "cancel", orgId }                             — self-serve cancel.
//   { kind: "verify", reference }                         — callback-page check.
//
// Fulfilment NEVER happens here. This returns a hosted checkout URL; the
// business is provisioned and the subscription row written only by
// stripe-webhook, after Stripe confirms the money moved. A client that can tell
// the server "I paid" is a client that can provision itself a free business.
//
// Config (supabase secrets):
//   STRIPE_SECRET_KEY     — required, sk_test_… or sk_live_…
//   STRIPE_WEBHOOK_SECRET — required by stripe-webhook, not by this.
import { preflight, json } from "../_shared/cors.ts";
import { authorize, requireUser } from "../_shared/auth.ts";
import { adminClient } from "../_shared/supabaseAdmin.ts";
import { stripe, STRIPE_KEY, CURRENCY, PLANS, ensurePrice, ensureCustomer, cleanReturnUrl, type PlanKey } from "../_shared/stripe.ts";

// deno-lint-ignore no-explicit-any
type Json = any;

const SITE = Deno.env.get("PUBLIC_SITE_URL") ?? "https://www.phoxta.com";

/** Stripe needs an address to send a receipt to; auth carries only the user id. */
// deno-lint-ignore no-explicit-any
async function emailOf(admin: any, userId: string): Promise<string | null> {
  const { data } = await admin.auth.admin.getUserById(userId);
  return data?.user?.email ?? null;
}

Deno.serve(async (req) => {
  const pf = preflight(req);
  if (pf) return pf;

  if (!STRIPE_KEY) {
    // Said plainly rather than failing at Stripe with a generic 401 — an unset
    // key is a deployment problem, not a payment problem.
    return json({ error: "Card payments are not configured yet — STRIPE_SECRET_KEY is unset." }, 503);
  }

  try {
    const body = (await req.json().catch(() => ({}))) as Json;
    const kind = String(body?.kind ?? "");
    const admin = adminClient();
    const returnUrl = cleanReturnUrl(body?.returnUrl, `${SITE}/dashboard/payment/callback`);
    const success = `${returnUrl}${returnUrl.includes("?") ? "&" : "?"}session_id={CHECKOUT_SESSION_ID}`;

    // ── verify ──────────────────────────────────────────────────────────────
    if (kind === "verify") {
      const who = await requireUser(req);
      if ("error" in who) return who.error;
      const id = String(body?.reference ?? "");
      if (!id) return json({ error: "Missing session." }, 400);

      const session = await stripe.checkout.sessions.retrieve(id);
      const meta = (session.metadata ?? {}) as Json;
      const paid = session.payment_status === "paid" || session.status === "complete";

      // "Paid" and "done" are different questions. Fulfilment is the webhook's
      // job, so the callback page waits on the row, not on Stripe.
      let fulfilled = false;
      if (meta.kind === "blueprint" && meta.purchase_id) {
        const { data: p } = await admin.from("purchases").select("status").eq("id", meta.purchase_id).maybeSingle();
        fulfilled = (p as Json)?.status === "paid";
      } else if (meta.kind === "subscription" && meta.org_id) {
        const { data: s } = await admin.from("subscriptions").select("status").eq("organization_id", meta.org_id).maybeSingle();
        fulfilled = ["active", "trialing"].includes(String((s as Json)?.status ?? ""));
      }
      return json({ status: paid ? "success" : String(session.status ?? "pending"), kind: meta.kind ?? null, fulfilled });
    }

    // ── blueprint: one-time purchase of a business ──────────────────────────
    if (kind === "blueprint") {
      const who = await requireUser(req);
      if ("error" in who) return who.error;

      const { data: bp } = await admin
        .from("blueprints").select("id, name, price_cents, currency, status").eq("id", body.blueprintId).maybeSingle();
      const blueprint = bp as Json;
      if (!blueprint || blueprint.status !== "live") return json({ error: "That business is not available." }, 404);

      const { data: purchase, error: pErr } = await admin
        .from("purchases")
        .insert({ buyer_user_id: who.userId, blueprint_id: blueprint.id, amount_cents: blueprint.price_cents, currency: "GBP", status: "pending" })
        .select("id").single();
      if (pErr) return json({ error: pErr.message }, 500);

      const email = await emailOf(admin, who.userId);
      if (!email) return json({ error: "Your account has no email address." }, 400);
      const customer = await ensureCustomer(email, null);
      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        customer: customer ?? undefined,
        customer_email: customer ? undefined : email,
        line_items: [{
          quantity: 1,
          price_data: {
            currency: CURRENCY,
            unit_amount: blueprint.price_cents,
            product_data: { name: blueprint.name },
          },
        }],
        // Every purchased business includes its first month of Growth free, and
        // the real billing starts automatically when it ends. That needs the
        // card kept on file, which has to be asked for at the moment of payment.
        payment_intent_data: { setup_future_usage: "off_session" },
        metadata: {
          kind: "blueprint",
          purchase_id: (purchase as Json).id,
          blueprint_id: blueprint.id,
          user_id: who.userId,
          business_name: String(body?.name ?? ""),
        },
        success_url: success,
        cancel_url: returnUrl,
      });

      await admin.from("purchases").update({ stripe_session_id: session.id }).eq("id", (purchase as Json).id);
      return json({ url: session.url });
    }

    // ── subscription: put a business on a monthly plan ──────────────────────
    if (kind === "subscription") {
      const auth = await authorize(req, body?.orgId);
      if (auth.error) return auth.error;

      const plan = String(body?.plan ?? "") as PlanKey;
      if (!PLANS[plan]) return json({ error: "Choose a valid plan." }, 400);

      const price = await ensurePrice(plan);
      if (!price.id) return json({ error: price.error ?? "Billing plan unavailable." }, 502);

      const email = await emailOf(admin, auth.ok.userId);
      if (!email) return json({ error: "Your account has no email address." }, 400);
      const customer = await ensureCustomer(email, auth.ok.org.name);
      const session = await stripe.checkout.sessions.create({
        mode: "subscription",
        customer: customer ?? undefined,
        customer_email: customer ? undefined : email,
        line_items: [{ price: price.id, quantity: 1 }],
        metadata: { kind: "subscription", org_id: auth.ok.org.id, plan },
        subscription_data: { metadata: { kind: "subscription", org_id: auth.ok.org.id, plan } },
        success_url: success,
        cancel_url: returnUrl,
      });
      return json({ url: session.url });
    }

    // ── change_plan ─────────────────────────────────────────────────────────
    if (kind === "change_plan") {
      const auth = await authorize(req, body?.orgId);
      if (auth.error) return auth.error;

      const plan = String(body?.plan ?? "") as PlanKey;
      if (!PLANS[plan]) return json({ error: "Choose a valid plan." }, 400);

      const { data: sub } = await admin
        .from("subscriptions").select("plan, stripe_subscription_id").eq("organization_id", auth.ok.org.id).maybeSingle();
      const row = sub as Json;
      if (row?.plan === plan) return json({ error: "That is already the current plan." }, 400);

      const price = await ensurePrice(plan);
      if (!price.id) return json({ error: price.error ?? "Billing plan unavailable." }, 502);

      // A live Stripe subscription is amended in place, which prorates the
      // difference. Cancelling and re-subscribing would charge a full month
      // again and lose the billing anchor.
      if (row?.stripe_subscription_id) {
        const current = await stripe.subscriptions.retrieve(row.stripe_subscription_id);
        await stripe.subscriptions.update(row.stripe_subscription_id, {
          items: [{ id: current.items.data[0].id, price: price.id }],
          proration_behavior: "create_prorations",
          metadata: { kind: "subscription", org_id: auth.ok.org.id, plan },
        });
        // The webhook writes the row; this only reports that it was accepted.
        return json({ ok: true, url: null });
      }

      // Nothing live to amend — this is a first subscription in disguise.
      const email = await emailOf(admin, auth.ok.userId);
      const customer = email ? await ensureCustomer(email, auth.ok.org.name) : null;
      const session = await stripe.checkout.sessions.create({
        mode: "subscription",
        customer: customer ?? undefined,
        customer_email: customer ? undefined : (email ?? undefined),
        line_items: [{ price: price.id, quantity: 1 }],
        metadata: { kind: "subscription", org_id: auth.ok.org.id, plan },
        subscription_data: { metadata: { kind: "subscription", org_id: auth.ok.org.id, plan } },
        success_url: success,
        cancel_url: returnUrl,
      });
      return json({ url: session.url });
    }

    // ── cancel ──────────────────────────────────────────────────────────────
    if (kind === "cancel") {
      const auth = await authorize(req, body?.orgId);
      if (auth.error) return auth.error;

      const { data: sub } = await admin
        .from("subscriptions").select("stripe_subscription_id").eq("organization_id", auth.ok.org.id).maybeSingle();
      const id = (sub as Json)?.stripe_subscription_id;
      if (!id) return json({ error: "There is no active plan to cancel." }, 400);

      // At period end, not immediately: the month is already paid for, and
      // cutting access the moment someone clicks cancel takes back time they
      // bought. The webhook flips the row when it actually ends.
      await stripe.subscriptions.update(id, { cancel_at_period_end: true });
      return json({ ok: true });
    }

    return json({ error: "Unknown request." }, 400);
  } catch (err) {
    return json({ error: String((err as Error)?.message || err) }, 500);
  }
});
