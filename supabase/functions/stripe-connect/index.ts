// Phoxta — stripe-connect: connect a business's OWN Stripe account so it can take
// customer payments (via the operator's payment links). Distinct from the
// platform Stripe that bills the business for its plan — this money settles with
// the business. Owner/admin only.
import { preflight, json } from "../_shared/cors.ts";
import { authorize } from "../_shared/auth.ts";
import { createStandardAccount, accountOnboardingLink, accountChargesEnabled, cleanReturnUrl } from "../_shared/stripe.ts";

// deno-lint-ignore no-explicit-any
type Json = any;

Deno.serve(async (req) => {
  const pf = preflight(req);
  if (pf) return pf;
  try {
    const body = await req.json().catch(() => ({})) as Json;
    const orgId: string | undefined = body?.organizationId;
    const a = await authorize(req, orgId, { requireAdmin: true });
    if (a.error) return a.error;
    const { admin, org } = a.ok;

    const action = String(body?.action ?? "start");
    const { data: row } = await admin.from("organizations").select("stripe_account_id, stripe_charges_enabled").eq("id", orgId).maybeSingle();
    let accountId = String((row as Json)?.stripe_account_id ?? "");

    if (action === "status") {
      if (!accountId) return json({ connected: false, chargesEnabled: false });
      const enabled = await accountChargesEnabled(accountId);
      if (enabled !== (row as Json)?.stripe_charges_enabled) {
        await admin.from("organizations").update({ stripe_charges_enabled: enabled }).eq("id", orgId);
      }
      return json({ connected: true, chargesEnabled: enabled });
    }

    // action "start": create the account if needed, then a fresh onboarding link.
    if (!accountId) {
      const made = await createStandardAccount(null);
      if (made.error || !made.id) return json({ error: made.error ?? "Could not start Stripe onboarding." }, 502);
      accountId = made.id;
      await admin.from("organizations").update({ stripe_account_id: accountId }).eq("id", orgId);
    }
    const back = cleanReturnUrl(body?.returnUrl, "https://www.phoxta.com/dashboard");
    const link = await accountOnboardingLink(accountId, back, back);
    if (link.error || !link.url) return json({ error: link.error ?? "Could not create the onboarding link." }, 502);
    void org;
    return json({ url: link.url, accountId });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
