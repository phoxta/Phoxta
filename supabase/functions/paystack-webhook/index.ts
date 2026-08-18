// Phoxta — paystack-webhook: signature-verified Paystack fulfilment.
// Deploy with --no-verify-jwt (Paystack authenticates with x-paystack-signature —
// HMAC-SHA512 of the raw body with the secret key — not a Supabase JWT).
//
// Handles:
//   charge.success (metadata.kind = "blueprint")    → mark the purchase paid and
//     provision the business via app_provision_business_paid (service-role-only).
//     Idempotent: the pending→paid claim is a conditional update, so Paystack
//     retries can never provision twice.
//   charge.success (metadata.kind = "subscription") → upsert the business's
//     subscriptions row (plan, active, +30 days).
//   subscription.create                             → attach subscription/email
//     codes + real next_payment_date to the row (matched by customer+plan).
//   invoice.payment_failed                          → status past_due.
//   subscription.disable / subscription.not_renew   → status canceled.
//   invoice.update (success)                        → bump current_period_end.
import { json } from "../_shared/cors.ts";
import { adminClient } from "../_shared/supabaseAdmin.ts";
import { PS_KEY, PLANS, paystack, ensurePlan } from "../_shared/paystack.ts";
import { vercelFetch, attachDomainPair } from "../_shared/vercel.ts";

async function validSignature(rawBody: string, signature: string | null): Promise<boolean> {
  if (!PS_KEY || !signature) return false;
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(PS_KEY), { name: "HMAC", hash: "SHA-512" }, false, ["sign"],
  );
  const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(rawBody));
  const hex = [...new Uint8Array(mac)].map((b) => b.toString(16).padStart(2, "0")).join("");
  // Constant-time-ish compare.
  if (hex.length !== signature.length) return false;
  let diff = 0;
  for (let i = 0; i < hex.length; i++) diff |= hex.charCodeAt(i) ^ signature.charCodeAt(i);
  return diff === 0;
}

// deno-lint-ignore no-explicit-any
type Payload = { event: string; data: any };

Deno.serve(async (req) => {
  const raw = await req.text();
  if (!(await validSignature(raw, req.headers.get("x-paystack-signature")))) {
    return new Response("Invalid signature", { status: 401 });
  }
  let payload: Payload;
  try {
    payload = JSON.parse(raw);
  } catch {
    return new Response("Bad payload", { status: 400 });
  }

  const admin = adminClient();
  const { event, data } = payload;
  const meta = data?.metadata ?? {};

  try {
    if (event === "charge.success" && meta.kind === "blueprint" && meta.purchase_id) {
      // Claim the pending purchase atomically — retries and duplicate deliveries
      // find no 'pending' row and stop here.
      const { data: claimed } = await admin
        .from("purchases")
        .update({ reference: data.reference, status: "paid" })
        .eq("id", meta.purchase_id)
        .eq("status", "pending")
        .select("id")
        .maybeSingle();
      if (claimed) {
        const { data: newOrgId, error } = await admin.rpc("app_provision_business_paid", {
          p_user: meta.user_id,
          p_blueprint: meta.blueprint_id,
          p_name: meta.business_name || null,
          p_purchase: meta.purchase_id,
        });
        if (error) {
          // Payment landed but provisioning failed — flag for follow-up; the
          // purchase stays 'paid' so support can provision manually.
          console.error("provisioning failed", error.message);
        } else if (newOrgId) {
          // Every purchased business includes its FIRST MONTH OF GROWTH FREE.
          // Record the free month now ('trialing'), and — when the purchase
          // card's authorization is reusable — schedule the real Growth billing
          // on Paystack to start the day the free month ends (start_date), so
          // the charge happens automatically with no further action.
          const freeUntil = new Date(Date.now() + 30 * 24 * 3600 * 1000);
          const custCode = data?.customer?.customer_code ?? null;
          let subCode: string | null = null;
          let emailToken: string | null = null;

          const authz = data?.authorization;
          if (authz?.reusable && authz?.authorization_code && custCode) {
            const plan = await ensurePlan("growth");
            if (plan.code) {
              const created = await paystack(`/subscription`, {
                method: "POST",
                body: JSON.stringify({
                  customer: custCode,
                  plan: plan.code,
                  authorization: authz.authorization_code,
                  start_date: freeUntil.toISOString(),
                }),
              });
              if (created.ok) {
                subCode = created.body?.data?.subscription_code ?? null;
                emailToken = created.body?.data?.email_token ?? null;
              } else {
                console.error("could not schedule post-trial billing", created.body?.message);
              }
            }
          }

          await admin.from("subscriptions").upsert(
            {
              organization_id: newOrgId,
              plan: "growth",
              status: "trialing",
              amount_cents: PLANS.growth.usdMonthly * 100,
              currency: "USD",
              current_period_end: freeUntil.toISOString(),
              paystack_customer_code: custCode,
              paystack_subscription_code: subCode,
              paystack_email_token: emailToken,
              paystack_authorization_code: authz?.reusable ? authz.authorization_code : null,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "organization_id" },
          );

          // Tell the buyer their business is ready (in-app feed). Closes the
          // silent gap when provisioning outlasts the callback page's poll.
          await admin.from("notifications").insert({
            user_id: meta.user_id,
            title: "Your business is ready",
            body: `${meta.business_name || "Your new business"} is provisioned — first month of Growth is on us.`,
            kind: "billing",
            link: "/dashboard/businesses",
          }).then(() => {}, () => {});
        }
      }
    }

    // ── Storefront money: a tenant's customer paid for an order/reservation ──
    if (event === "charge.success" && meta.kind === "storefront_order" && meta.record_id) {
      await admin
        .from("orders")
        .update({ status: "paid", payment_reference: data.reference, paid_at: new Date().toISOString() })
        .eq("id", meta.record_id)
        .eq("organization_id", meta.org_id)
        .is("paid_at", null);
    }
    // ── Domain purchase (migrated from the Stripe webhook — same idempotent
    //    claim: only a not-yet-live/verifying row proceeds, so Paystack retries
    //    can never re-register or flip a live domain to error). ──────────────
    if (event === "charge.success" && meta.kind === "domain_purchase" && meta.hostname && meta.org_id) {
      const { data: claimedDomain } = await admin
        .from("domains")
        .update({ status: "verifying" })
        .eq("hostname", meta.hostname)
        .not("status", "in", '("live","verifying")')
        .select("hostname")
        .maybeSingle();
      if (claimedDomain) {
        try {
          const wholesale = Number(meta.wholesale) || undefined;
          const buy = await vercelFetch(`/v4/domains/buy`, { method: "POST", body: JSON.stringify({ name: meta.hostname, expectedPrice: wholesale, renew: true }) });
          if (!buy.ok) throw new Error(buy.body?.error?.message || "Vercel registration failed");
          const { data: sf } = await admin.rpc("app_org_storefront", { p_org: meta.org_id });
          const pid = (sf as Array<{ vercel_project_id?: string }>)?.[0]?.vercel_project_id;
          if (pid) await attachDomainPair(pid, meta.hostname);
          const expires = buy.body?.domain?.expiresAt ? new Date(buy.body.domain.expiresAt).toISOString() : null;
          await admin.from("domains").update({ status: "live", tls_status: "issued", verified_at: new Date().toISOString(), expires_at: expires }).eq("hostname", meta.hostname);
        } catch (e) {
          // Payment succeeded but registration failed — flag for follow-up/refund.
          console.error("domain registration failed", String((e as Error)?.message || e));
          await admin.from("domains").update({ status: "error" }).eq("hostname", meta.hostname);
        }
      }
    }

    if (event === "charge.success" && meta.kind === "invoice" && meta.record_id) {
      await admin
        .from("invoices")
        .update({ status: "paid", paid_at: new Date().toISOString(), payment_reference: data.reference })
        .eq("id", meta.record_id)
        .eq("organization_id", meta.org_id)
        .neq("status", "paid");
    }

    if (event === "charge.success" && meta.kind === "storefront_reservation" && meta.record_id) {
      const { data: resv } = await admin
        .from("reservations")
        .select("id, metadata")
        .eq("id", meta.record_id)
        .eq("organization_id", meta.org_id)
        .maybeSingle();
      if (resv && (resv.metadata as Record<string, unknown>)?.paid !== true) {
        await admin
          .from("reservations")
          .update({
            status: "confirmed",
            metadata: { ...(resv.metadata as Record<string, unknown> ?? {}), paid: true, payment_reference: data.reference, paid_at: new Date().toISOString() },
          })
          .eq("id", resv.id);
      }
    }

    if (event === "charge.success" && meta.kind === "subscription" && meta.org_id) {
      const custCode = data?.customer?.customer_code ?? null;
      const planCode = data?.plan?.plan_code ?? data?.plan_object?.plan_code ?? null;

      // Don't depend on subscription.create arriving after this event (Paystack's
      // ordering isn't guaranteed and a create that lands first matches no row) —
      // ask the API for the subscription right now and store its codes with the row.
      let subCode: string | null = null;
      let emailToken: string | null = null;
      let nextPayment: string | null = null;
      const customerId = data?.customer?.id;
      if (customerId) {
        try {
          const res = await fetch(`https://api.paystack.co/subscription?customer=${customerId}&perPage=10`, {
            headers: { Authorization: `Bearer ${PS_KEY}` },
          });
          const body = await res.json().catch(() => ({}));
          const subs = (body?.data ?? []).filter(
            (s: { plan?: { plan_code?: string }; status?: string }) =>
              (!planCode || s.plan?.plan_code === planCode) && s.status === "active",
          );
          const hit = subs[0];
          if (hit) {
            subCode = hit.subscription_code ?? null;
            emailToken = hit.email_token ?? null;
            nextPayment = hit.next_payment_date ?? null;
          }
        } catch {
          /* subscription.create below still fills these when it arrives */
        }
      }

      await admin.from("subscriptions").upsert(
        {
          organization_id: meta.org_id,
          plan: meta.plan_key,
          status: "active",
          amount_cents: Number(meta.usd_monthly_cents) || 0,
          currency: "USD",
          current_period_end: nextPayment ?? new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString(),
          paystack_customer_code: custCode,
          paystack_plan_code: planCode,
          paystack_subscription_code: subCode,
          paystack_email_token: emailToken,
          // Stored for the dunning ladder: lets billing-alerts retry a failed
          // renewal with charge_authorization on day 1/3/5/7.
          paystack_authorization_code: data?.authorization?.reusable ? data.authorization.authorization_code : null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "organization_id" },
      );
    }

    if (event === "subscription.create") {
      const custCode = data?.customer?.customer_code;
      const planCode = data?.plan?.plan_code;
      if (custCode && planCode) {
        await admin
          .from("subscriptions")
          .update({
            paystack_subscription_code: data.subscription_code ?? null,
            paystack_email_token: data.email_token ?? null,
            current_period_end: data.next_payment_date ?? undefined,
            updated_at: new Date().toISOString(),
          })
          .eq("paystack_customer_code", custCode)
          .eq("paystack_plan_code", planCode);
      }
    }

    if (event === "invoice.payment_failed") {
      const subCode = data?.subscription?.subscription_code;
      if (subCode) {
        await admin
          .from("subscriptions")
          .update({ status: "past_due", updated_at: new Date().toISOString() })
          .eq("paystack_subscription_code", subCode);
      }
    }

    if (event === "subscription.disable" || event === "subscription.not_renew") {
      const subCode = data?.subscription_code;
      if (subCode) {
        await admin
          .from("subscriptions")
          .update({ status: "canceled", updated_at: new Date().toISOString() })
          .eq("paystack_subscription_code", subCode);
      }
    }

    if (event === "invoice.update" && data?.status === "success") {
      const subCode = data?.subscription?.subscription_code;
      const nextDate = data?.subscription?.next_payment_date;
      if (subCode && nextDate) {
        await admin
          .from("subscriptions")
          .update({ status: "active", current_period_end: nextDate, updated_at: new Date().toISOString() })
          .eq("paystack_subscription_code", subCode);
      }
    }
  } catch (err) {
    // Log but still 200 — Paystack retries on non-200, and a poison event must
    // not block the queue. Fulfilment claims above are idempotent.
    console.error("paystack-webhook error", String((err as Error)?.message || err));
  }

  return json({ received: true });
});
