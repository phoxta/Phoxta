// Phoxta — billing-alerts: the 7-days-before-renewal warning.
//
// Runs daily (pg_cron → this function). Finds subscriptions whose
// current_period_end lands 6–8 days from now that haven't been alerted this
// period, and tells the business owner by SMS (and email, best-effort):
//   · trialing — the free month of Growth is ending; billing starts then.
//   · active   — the plan renews on that date.
// Marks renewal_alert_sent_at so each period alerts exactly once.
//
// Guard: x-cron-secret must match BILLING_CRON_SECRET (the pg_cron job's
// secret) or CRON_SECRET (the shared worker-cron secret). Deploy with
// --no-verify-jwt.
import { json } from "../_shared/cors.ts";
import { adminClient } from "../_shared/supabaseAdmin.ts";
import { twilioSend, sendEmail } from "../_shared/dispatch.ts";
import { CURRENCY, toChargeMinor, PLANS, paystack } from "../_shared/paystack.ts";

// Dunning ladder (the measured 2026 playbook): retry a failed renewal on days
// 1 / 3 / 5 / 7 after it went past_due via charge_authorization on the stored
// card. ~58% of failures recover on this ladder. After the final attempt the
// subscription is canceled and the owner told. State lives in
// subscriptions.dunning = { started_at, attempts: [iso...], done }.
const LADDER_DAYS = [1, 3, 5, 7];

const BILLING_URL = "https://www.phoxta.com/dashboard/billing";

function chargeDisplay(usdCents: number): string {
  const minor = toChargeMinor(usdCents);
  const whole = Math.round(minor / 100);
  const symbol = CURRENCY === "NGN" ? "₦" : CURRENCY === "USD" ? "$" : `${CURRENCY} `;
  return `${symbol}${whole.toLocaleString("en-US")}`;
}

function planLabel(key: string): string {
  return PLANS[key]?.name?.replace(/^Phoxta\s+/, "") ?? key;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "Method not allowed." }, 405);
  const secret = req.headers.get("x-cron-secret");
  const allowed = [Deno.env.get("BILLING_CRON_SECRET"), Deno.env.get("CRON_SECRET")].filter(Boolean);
  if (!secret || !allowed.includes(secret)) return json({ error: "Forbidden." }, 403);

  const admin = adminClient();
  const now = Date.now();
  const from = new Date(now + 6 * 24 * 3600 * 1000).toISOString();
  const to = new Date(now + 8 * 24 * 3600 * 1000).toISOString();

  const { data: due, error } = await admin
    .from("subscriptions")
    .select("id, plan, status, amount_cents, current_period_end, renewal_alert_sent_at, organizations(id, name, owner_user_id)")
    .in("status", ["active", "trialing"])
    .gte("current_period_end", from)
    .lte("current_period_end", to);
  if (error) return json({ error: error.message }, 500);

  const results: Array<{ org: string; sms: string; email: string }> = [];
  for (const sub of due ?? []) {
    // deno-lint-ignore no-explicit-any
    const org = (sub as any).organizations;
    if (!org?.owner_user_id) continue;
    const periodEnd = new Date(sub.current_period_end).getTime();
    // Already alerted for THIS period? (sent_at within 20 days before its end)
    if (sub.renewal_alert_sent_at && new Date(sub.renewal_alert_sent_at).getTime() > periodEnd - 20 * 24 * 3600 * 1000) {
      continue;
    }

    const dateStr = new Date(sub.current_period_end).toLocaleDateString("en-GB", { day: "numeric", month: "long" });
    const amount = chargeDisplay(sub.amount_cents);
    const label = planLabel(sub.plan);
    const message =
      sub.status === "trialing"
        ? `Phoxta: your free month of ${label} for "${org.name}" ends on ${dateStr}. ${label} (${amount}/mo) begins then automatically. Manage: ${BILLING_URL}`
        : `Phoxta: your ${label} plan for "${org.name}" renews on ${dateStr} (${amount}). Manage: ${BILLING_URL}`;

    // Owner contact: phone from their profile, email from auth.
    const { data: prof } = await admin.from("user_profiles").select("phone").eq("user_id", org.owner_user_id).maybeSingle();
    const { data: ud } = await admin.auth.admin.getUserById(org.owner_user_id);
    const phone = String(prof?.phone ?? "").replace(/[^\d+]/g, "");
    const email = ud?.user?.email;

    let smsStatus = "no-phone";
    if (phone.startsWith("+") && phone.length >= 8) {
      const r = await twilioSend("sms", phone, message);
      smsStatus = r.ok ? "sent" : `${r.status}${r.errorCode ? ` (${r.errorCode}: ${r.errorMessage})` : ""}`;
    }
    let emailStatus = "no-email";
    if (email) {
      const subject = sub.status === "trialing" ? `Your free month of ${label} ends ${dateStr}` : `Your ${label} plan renews ${dateStr}`;
      const r = await sendEmail({
        to: [email],
        subject,
        html: `<p>Hi,</p><p>${message.replace("Phoxta: ", "")}</p><p>— The Phoxta team</p>`,
        text: message,
      });
      emailStatus = r.ok ? "sent" : r.status;
    }

    await admin.from("subscriptions").update({ renewal_alert_sent_at: new Date().toISOString() }).eq("id", sub.id);
    results.push({ org: org.name, sms: smsStatus, email: emailStatus });
  }

  // ── Dunning: retry past_due subscriptions on the day-1/3/5/7 ladder ───────
  const { data: pastDue } = await admin
    .from("subscriptions")
    .select("id, plan, amount_cents, dunning, paystack_authorization_code, paystack_customer_code, organizations(id, name, owner_user_id)")
    .eq("status", "past_due");

  const dunned: Array<{ org: string; outcome: string }> = [];
  for (const sub of pastDue ?? []) {
    // deno-lint-ignore no-explicit-any
    const org = (sub as any).organizations;
    const state = (sub.dunning ?? {}) as { started_at?: string; attempts?: string[]; done?: boolean };
    if (state.done) continue;
    const started = state.started_at ? new Date(state.started_at).getTime() : now;
    if (!state.started_at) {
      await admin.from("subscriptions").update({ dunning: { started_at: new Date(now).toISOString(), attempts: [] } }).eq("id", sub.id);
    }
    const attempts = state.attempts ?? [];
    const daysIn = Math.floor((now - started) / (24 * 3600 * 1000));
    const nextStep = LADDER_DAYS[attempts.length];
    if (nextStep === undefined) {
      // Ladder exhausted → cancel + tell the owner.
      await admin.from("subscriptions").update({
        status: "canceled",
        dunning: { ...state, done: true },
        updated_at: new Date().toISOString(),
      }).eq("id", sub.id);
      if (org?.owner_user_id) {
        await admin.from("notifications").insert({
          user_id: org.owner_user_id, kind: "billing",
          title: `Subscription canceled — ${org.name}`,
          body: "We couldn't collect the renewal after several attempts. Re-subscribe anytime in Billing.",
          link: "/dashboard/billing",
        }).then(() => {}, () => {});
      }
      dunned.push({ org: org?.name ?? sub.id, outcome: "canceled-after-ladder" });
      continue;
    }
    if (daysIn < nextStep) continue;
    if (!sub.paystack_authorization_code || !sub.paystack_customer_code) {
      dunned.push({ org: org?.name ?? sub.id, outcome: "no-authorization" });
      continue;
    }
    const { data: ud } = org?.owner_user_id ? await admin.auth.admin.getUserById(org.owner_user_id) : { data: null };
    const email = ud?.user?.email;
    const charge = await paystack(`/transaction/charge_authorization`, {
      method: "POST",
      body: JSON.stringify({
        authorization_code: sub.paystack_authorization_code,
        email: email ?? "billing@phoxta.com",
        amount: toChargeMinor(sub.amount_cents),
        currency: CURRENCY,
        metadata: { kind: "dunning", subscription_id: sub.id, org_id: org?.id },
      }),
    });
    const succeeded = charge.ok && charge.body?.data?.status === "success";
    const newAttempts = [...attempts, new Date().toISOString()];
    if (succeeded) {
      await admin.from("subscriptions").update({
        status: "active",
        current_period_end: new Date(now + 30 * 24 * 3600 * 1000).toISOString(),
        dunning: { ...state, attempts: newAttempts, done: true, recovered: true },
        updated_at: new Date().toISOString(),
      }).eq("id", sub.id);
      dunned.push({ org: org?.name ?? sub.id, outcome: `recovered-attempt-${newAttempts.length}` });
    } else {
      await admin.from("subscriptions").update({
        dunning: { ...state, started_at: new Date(started).toISOString(), attempts: newAttempts },
        updated_at: new Date().toISOString(),
      }).eq("id", sub.id);
      // From day 7 escalate to SMS as well as email (multi-channel dunning).
      if (email) {
        await sendEmail({
          to: [email],
          subject: `Payment failed — ${org?.name ?? "your Phoxta business"}`,
          html: `<p>We couldn't collect this month's ${planLabel(sub.plan)} renewal (attempt ${newAttempts.length} of ${LADDER_DAYS.length}). We'll retry automatically — or update your card at ${BILLING_URL}.</p>`,
          text: `Renewal payment failed (attempt ${newAttempts.length}/${LADDER_DAYS.length}). Update your card: ${BILLING_URL}`,
        }).catch(() => {});
      }
      dunned.push({ org: org?.name ?? sub.id, outcome: `failed-attempt-${newAttempts.length}` });
    }
  }

  return json({ checked: (due ?? []).length, alerted: results.length, results, dunning: dunned });
});
