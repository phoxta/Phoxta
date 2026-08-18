// Phoxta — paystack-checkout: start (or verify) a Paystack payment.
//
// Three kinds:
//   { kind: "blueprint", blueprintId, name?, returnUrl }   — one-time marketplace purchase.
//       Creates a 'pending' purchases row, initializes a Paystack transaction and
//       returns { url }. Fulfilment (provisioning the business) happens ONLY in
//       paystack-webhook after charge.success.
//   { kind: "subscription", orgId, plan, returnUrl }        — monthly platform plan.
//       Gets-or-creates the matching Paystack Plan and initializes a subscribing
//       transaction. The webhook keeps the subscriptions row in sync.
//   { kind: "verify", reference }                            — callback-page check.
//       Confirms the transaction status server-side (secret key never leaves here).
//
// Config (supabase secrets):
//   PAYSTACK_SECRET_KEY   — required. sk_test_… or sk_live_…
//   PAYSTACK_CURRENCY     — optional, default "USD". Set "NGN" (etc.) if the
//                           Paystack account isn't USD-enabled…
//   PAYSTACK_RATE_PER_USD — …and then REQUIRED: units of PAYSTACK_CURRENCY per
//                           1 USD (e.g. "1600"). Refused otherwise, so a $75 plan
//                           can never accidentally charge ₦75.
import { preflight, json } from "../_shared/cors.ts";
import { authorize, requireUser } from "../_shared/auth.ts";
import { adminClient } from "../_shared/supabaseAdmin.ts";
import { PS_KEY, CURRENCY, RATE, PLANS, toChargeMinor, paystack, ensurePlan } from "../_shared/paystack.ts";

// Mirrors src/lib/promo.ts — the storefront shows business prices with this
// discount, so checkout MUST charge the same number. Keep the two in sync.
// (Promo ended 2026-08-18 — replaced by the free first month of Growth that
// paystack-webhook grants on every purchased business.)
const PROMO_ACTIVE = false;
const PROMO_PERCENT_OFF = 35;

const ALLOWED_RETURN_ORIGINS = ["https://www.phoxta.com", "https://phoxta.com", "https://phoxta.vercel.app", "http://localhost:5173"];

function cleanReturnUrl(raw: unknown): string {
  try {
    const url = new URL(String(raw ?? ""));
    if (ALLOWED_RETURN_ORIGINS.includes(url.origin)) return `${url.origin}${url.pathname}`;
  } catch { /* fall through */ }
  return "https://www.phoxta.com/dashboard/payment/callback";
}

Deno.serve(async (req) => {
  const pf = preflight(req);
  if (pf) return pf;
  try {
    const body = await req.json().catch(() => ({}));
    if (!PS_KEY) return json({ error: "Payments aren't configured yet (missing PAYSTACK_SECRET_KEY)." }, 503);
    if (!RATE || RATE <= 0) {
      return json({ error: `Payments misconfigured: set PAYSTACK_RATE_PER_USD for ${CURRENCY} charges.` }, 503);
    }
    const admin = adminClient();

    // ── verify (callback page) ──────────────────────────────────────────────
    if (body.kind === "verify") {
      const who = await requireUser(req);
      if ("error" in who) return who.error;
      const reference = String(body.reference ?? "");
      if (!reference) return json({ error: "Missing reference." }, 400);
      const v = await paystack(`/transaction/verify/${encodeURIComponent(reference)}`);
      if (!v.ok) return json({ error: v.body?.message || "Could not verify the payment." }, 502);
      const tx = v.body?.data ?? {};
      const meta = tx.metadata ?? {};
      // A purchase row exists for blueprint payments — report whether fulfilment
      // (webhook provisioning) has landed yet so the client can poll briefly.
      let fulfilled = false;
      if (meta.kind === "blueprint" && meta.purchase_id) {
        const { data: p } = await admin.from("purchases").select("status, organization_id").eq("id", meta.purchase_id).maybeSingle();
        fulfilled = p?.status === "paid" && !!p?.organization_id;
      } else if (meta.kind === "subscription" && meta.org_id) {
        const { data: s } = await admin.from("subscriptions").select("status").eq("organization_id", meta.org_id).maybeSingle();
        fulfilled = s?.status === "active";
      }
      return json({ status: tx.status, kind: meta.kind ?? null, fulfilled });
    }

    // ── blueprint purchase (one-time) ───────────────────────────────────────
    if (body.kind === "blueprint") {
      const who = await requireUser(req);
      if ("error" in who) return who.error;
      const { data: bp } = await admin
        .from("blueprints").select("id, name, price_cents, currency, status").eq("id", body.blueprintId).maybeSingle();
      if (!bp || bp.status !== "live") return json({ error: "That business isn't available right now." }, 404);

      const usdCents = PROMO_ACTIVE ? Math.round(bp.price_cents * (1 - PROMO_PERCENT_OFF / 100)) : bp.price_cents;
      const { data: ud } = await admin.auth.admin.getUserById(who.userId);
      const email = ud?.user?.email;
      if (!email) return json({ error: "Your account has no email address." }, 400);

      const { data: purchase, error: pe } = await admin
        .from("purchases")
        .insert({ buyer_user_id: who.userId, blueprint_id: bp.id, amount_cents: usdCents, currency: "USD", status: "pending" })
        .select("id").single();
      if (pe || !purchase) return json({ error: "Could not start the purchase." }, 500);

      const metadata = {
        kind: "blueprint", user_id: who.userId, blueprint_id: bp.id,
        purchase_id: purchase.id, business_name: String(body.name ?? "").slice(0, 120),
      };
      const init = await paystack(`/transaction/initialize`, {
        method: "POST",
        body: JSON.stringify({
          email, amount: toChargeMinor(usdCents), currency: CURRENCY,
          callback_url: cleanReturnUrl(body.returnUrl), metadata,
        }),
      });
      if (!init.ok) {
        await admin.from("purchases").update({ status: "failed" }).eq("id", purchase.id);
        return json({ error: init.body?.message || "Paystack rejected the transaction." }, 502);
      }
      await admin.from("purchases").update({ reference: init.body?.data?.reference, metadata }).eq("id", purchase.id);
      return json({ url: init.body?.data?.authorization_url });
    }

    // ── platform subscription (monthly plan) ────────────────────────────────
    if (body.kind === "subscription") {
      const auth = await authorize(req, body.orgId, { requireAdmin: true });
      if (auth.error) return auth.error;
      const planKey = String(body.plan ?? "");
      if (!PLANS[planKey]) return json({ error: "Choose a valid plan." }, 400);

      const plan = await ensurePlan(planKey);
      if (!plan.code) return json({ error: plan.error ?? "Billing plan unavailable." }, 502);

      const { data: ud } = await admin.auth.admin.getUserById(auth.ok.userId);
      const email = ud?.user?.email;
      if (!email) return json({ error: "Your account has no email address." }, 400);

      const metadata = {
        kind: "subscription", user_id: auth.ok.userId, org_id: body.orgId,
        plan_key: planKey, usd_monthly_cents: PLANS[planKey].usdMonthly * 100,
      };
      const init = await paystack(`/transaction/initialize`, {
        method: "POST",
        body: JSON.stringify({ email, plan: plan.code, callback_url: cleanReturnUrl(body.returnUrl), metadata }),
      });
      if (!init.ok) return json({ error: init.body?.message || "Paystack rejected the transaction." }, 502);
      return json({ url: init.body?.data?.authorization_url });
    }

    // ── invoice_send: email the invoice WITH a Paystack payment link ────────
    // (Invoicing's "Send" used to only flip a status — no delivery, no way to
    // pay. Now it emails the customer a real, chargeable link.)
    if (body.kind === "invoice_send") {
      const auth = await authorize(req, body.orgId);
      if (auth.error) return auth.error;
      const { data: inv } = await admin
        .from("invoices")
        .select("id, number, customer_name, customer_email, status, total_cents, currency, due_date")
        .eq("id", String(body.invoiceId ?? "")).eq("organization_id", body.orgId).maybeSingle();
      if (!inv) return json({ error: "Invoice not found." }, 404);
      if (inv.status === "paid") return json({ error: "This invoice is already paid." }, 400);
      if (!inv.total_cents || inv.total_cents <= 0) return json({ error: "The invoice total is zero." }, 400);
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inv.customer_email)) return json({ error: "The invoice has no valid customer email." }, 400);

      const init = await paystack(`/transaction/initialize`, {
        method: "POST",
        body: JSON.stringify({
          email: inv.customer_email,
          amount: toChargeMinor(inv.total_cents),
          currency: CURRENCY,
          metadata: { kind: "invoice", org_id: body.orgId, record_id: inv.id },
        }),
      });
      if (!init.ok) return json({ error: init.body?.message || "Could not create the payment link." }, 502);
      const payUrl = init.body?.data?.authorization_url;

      const { sendEmail } = await import("../_shared/dispatch.ts");
      const label = inv.number ? `Invoice ${inv.number}` : "Invoice";
      const amount = `$${(inv.total_cents / 100).toLocaleString("en-US")}`;
      const emailed = await sendEmail({
        to: [inv.customer_email],
        subject: `${label} from ${auth.ok.org.name} — ${amount}`,
        html: `<p>Hi ${inv.customer_name || "there"},</p><p>${auth.ok.org.name} sent you ${label.toLowerCase()} for <b>${amount}</b>${inv.due_date ? `, due ${inv.due_date}` : ""}.</p><p><a href="${payUrl}">Pay this invoice</a></p><p>— ${auth.ok.org.name}</p>`,
        text: `${label} from ${auth.ok.org.name} for ${amount}. Pay: ${payUrl}`,
      });
      await admin.from("invoices").update({ status: "sent", payment_reference: init.body?.data?.reference }).eq("id", inv.id);
      return json({ ok: true, url: payUrl, delivery: emailed.ok ? "sent" : emailed.status });
    }

    // ── cancel (self-serve, the promise Billing makes) ──────────────────────
    if (body.kind === "cancel") {
      const auth = await authorize(req, body.orgId, { requireAdmin: true });
      if (auth.error) return auth.error;
      const { data: sub } = await admin
        .from("subscriptions")
        .select("id, status, paystack_subscription_code, paystack_email_token")
        .eq("organization_id", body.orgId).maybeSingle();
      if (!sub) return json({ error: "No subscription found for this business." }, 404);
      if (sub.status === "canceled") return json({ ok: true, status: "canceled" });
      if (sub.paystack_subscription_code && sub.paystack_email_token) {
        const r = await paystack(`/subscription/disable`, {
          method: "POST",
          body: JSON.stringify({ code: sub.paystack_subscription_code, token: sub.paystack_email_token }),
        });
        if (!r.ok) return json({ error: r.body?.message || "Could not cancel with the payment provider." }, 502);
      }
      await admin.from("subscriptions")
        .update({ status: "canceled", updated_at: new Date().toISOString() })
        .eq("id", sub.id);
      return json({ ok: true, status: "canceled" });
    }

    // ── change_plan: cancel the current Paystack subscription, then hand back
    //    a checkout URL for the new plan (same fulfilment path as subscribe). ──
    if (body.kind === "change_plan") {
      const auth = await authorize(req, body.orgId, { requireAdmin: true });
      if (auth.error) return auth.error;
      const planKey = String(body.plan ?? "");
      if (!PLANS[planKey]) return json({ error: "Choose a valid plan." }, 400);

      const { data: sub } = await admin
        .from("subscriptions")
        .select("id, plan, paystack_subscription_code, paystack_email_token")
        .eq("organization_id", body.orgId).maybeSingle();
      if (sub?.plan === planKey) return json({ error: "That is already the current plan." }, 400);
      if (sub?.paystack_subscription_code && sub?.paystack_email_token) {
        await paystack(`/subscription/disable`, {
          method: "POST",
          body: JSON.stringify({ code: sub.paystack_subscription_code, token: sub.paystack_email_token }),
        });
      }

      const plan = await ensurePlan(planKey);
      if (!plan.code) return json({ error: plan.error ?? "Billing plan unavailable." }, 502);
      const { data: ud } = await admin.auth.admin.getUserById(auth.ok.userId);
      const email = ud?.user?.email;
      if (!email) return json({ error: "Your account has no email address." }, 400);
      const metadata = {
        kind: "subscription", user_id: auth.ok.userId, org_id: body.orgId,
        plan_key: planKey, usd_monthly_cents: PLANS[planKey].usdMonthly * 100,
      };
      const init = await paystack(`/transaction/initialize`, {
        method: "POST",
        body: JSON.stringify({ email, plan: plan.code, callback_url: cleanReturnUrl(body.returnUrl), metadata }),
      });
      if (!init.ok) return json({ error: init.body?.message || "Paystack rejected the transaction." }, 502);
      return json({ url: init.body?.data?.authorization_url });
    }

    return json({ error: "Unknown request." }, 400);
  } catch (err) {
    return json({ error: String((err as Error)?.message || err) }, 500);
  }
});
