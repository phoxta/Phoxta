// Phoxta — domain-checkout: start a PAYSTACK payment for buying a domain.
// (Migrated off Stripe 2026-08-18 — the audit's "one money rail" consolidation;
// the Stripe path had dormant secrets and never charged.) Validates
// availability + price via Vercel, creates a 'pending' domain row, and returns
// a Paystack payment URL. paystack-webhook (kind domain_purchase) finalizes:
// registers the domain on Vercel after the charge succeeds — the BUYER pays
// (with our markup), not the platform's Vercel account.
import { preflight, json } from "../_shared/cors.ts";
import { authorize } from "../_shared/auth.ts";
import { adminClient } from "../_shared/supabaseAdmin.ts";
import { vercelFetch, vercelConfigured, CNAME_TARGET } from "../_shared/vercel.ts";
import { PS_KEY, RATE, CURRENCY, toChargeMinor, paystack } from "../_shared/paystack.ts";

const MARKUP = 1.25;

const normalizeHost = (s: string) => String(s || "").trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "").replace(/\.$/, "");

Deno.serve(async (req) => {
  const pf = preflight(req);
  if (pf) return pf;
  try {
    const body = await req.json().catch(() => ({}));
    if (!vercelConfigured()) return json({ error: "The domain service isn't configured yet." }, 503);
    if (!PS_KEY) return json({ error: "Payments aren't configured yet." }, 503);
    if (!RATE || RATE <= 0) return json({ error: "Payments misconfigured (currency rate)." }, 503);

    const auth = await authorize(req, body.orgId, { requireAdmin: true });
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

    const { data: ud } = await admin.auth.admin.getUserById(auth.ok.userId);
    const email = ud?.user?.email;
    if (!email) return json({ error: "Your account has no email address." }, 400);

    const init = await paystack(`/transaction/initialize`, {
      method: "POST",
      body: JSON.stringify({
        email,
        amount: toChargeMinor(retailCents),
        currency: CURRENCY,
        callback_url: `${returnUrl}?domain=success&host=${encodeURIComponent(host)}`,
        metadata: { kind: "domain_purchase", org_id: body.orgId, hostname: host, wholesale: String(wholesale) },
      }),
    });
    if (!init.ok) return json({ error: init.body?.message || "Payment could not be started." }, 502);

    await admin.from("domains").update({ stripe_session: init.body?.data?.reference }).eq("hostname", host);
    return json({ url: init.body?.data?.authorization_url });
  } catch (err) {
    return json({ error: String((err as Error)?.message || err) }, 500);
  }
});
