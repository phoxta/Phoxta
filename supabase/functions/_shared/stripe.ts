// Phoxta — shared Stripe client and plan catalogue.
//
// Everything Phoxta charges for is priced in pounds and settled by Stripe. The
// amounts here are the same numbers the pricing page shows, in minor units,
// because a plan that costs one thing on the marketing site and another at
// checkout is the worst kind of bug: nobody notices until a customer does.
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";

export const STRIPE_KEY = Deno.env.get("STRIPE_SECRET_KEY") ?? "";

export const stripe = new Stripe(STRIPE_KEY, {
  apiVersion: "2023-10-16",
  httpClient: Stripe.createFetchHttpClient(),
});

export const CURRENCY = "gbp";

export type PlanKey = "starter" | "growth" | "scale";

/** Mirrors src/lib/plans.ts. Both must move together. */
export const PLANS: Record<PlanKey, { name: string; monthlyPence: number }> = {
  starter: { name: "Phoxta Starter", monthlyPence: 75_00 },
  growth: { name: "Phoxta Growth", monthlyPence: 250_00 },
  scale: { name: "Phoxta Scale", monthlyPence: 1500_00 },
};

/** Stable handle for a plan's recurring Price, so it is found not duplicated. */
const lookupKey = (plan: PlanKey) => `phoxta_${plan}_${CURRENCY}_monthly`;

/**
 * The recurring Price for a plan, created on first use.
 *
 * Building it here rather than expecting Products and Prices to be set up in
 * the Stripe dashboard means a fresh Stripe account works immediately, and the
 * price a customer is charged comes from the same constant the site renders.
 * The lookup key makes it idempotent — a second call finds the existing Price
 * rather than creating a parallel one at the same amount.
 */
export async function ensurePrice(plan: PlanKey): Promise<{ id?: string; error?: string }> {
  const key = lookupKey(plan);
  try {
    const found = await stripe.prices.list({ lookup_keys: [key], active: true, limit: 1 });
    if (found.data[0]) {
      // A price whose amount has drifted from the catalogue would silently keep
      // charging the old figure, so retire it and make the current one.
      if (found.data[0].unit_amount === PLANS[plan].monthlyPence) return { id: found.data[0].id };
      await stripe.prices.update(found.data[0].id, { active: false, lookup_key: null });
    }

    const price = await stripe.prices.create({
      currency: CURRENCY,
      unit_amount: PLANS[plan].monthlyPence,
      recurring: { interval: "month" },
      lookup_key: key,
      transfer_lookup_key: true,
      product_data: { name: PLANS[plan].name },
    });
    return { id: price.id };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

/**
 * The Stripe customer for a signed-in user, reused across purchases.
 *
 * Without this every checkout makes another customer record, and a business
 * that bought a blueprint then subscribed appears in Stripe as two unrelated
 * people — which is exactly when you need them to be one.
 */
export async function ensureCustomer(email: string, name?: string | null): Promise<string | null> {
  try {
    const found = await stripe.customers.list({ email, limit: 1 });
    if (found.data[0]) return found.data[0].id;
    const made = await stripe.customers.create({ email, name: name || undefined });
    return made.id;
  } catch {
    return null; // Checkout can still create one; this is an optimisation.
  }
}

/** Only our own return URLs, so a crafted returnUrl cannot redirect elsewhere. */
export function cleanReturnUrl(raw: unknown, fallback: string): string {
  const s = String(raw ?? "");
  try {
    const u = new URL(s);
    if (u.protocol === "https:" || u.hostname === "localhost") return u.toString();
  } catch {
    /* not a URL */
  }
  return fallback;
}

// ── Stripe Connect: tenants receive customer payments into their own account ──
//
// Standard connected accounts. The business owns the account and is the merchant
// of record; Phoxta orchestrates. Charges are created ON the connected account
// (the `stripeAccount` request option), so the money lands with the business and
// never touches the platform balance.

/** Create a Standard connected account for a business, or return the existing id. */
export async function createStandardAccount(email?: string | null): Promise<{ id?: string; error?: string }> {
  try {
    const acct = await stripe.accounts.create({
      type: "standard",
      email: email || undefined,
      metadata: { platform: "phoxta" },
    });
    return { id: acct.id };
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) };
  }
}

/** The hosted onboarding link the owner completes to activate their account. */
export async function accountOnboardingLink(accountId: string, returnUrl: string, refreshUrl: string): Promise<{ url?: string; error?: string }> {
  try {
    const link = await stripe.accountLinks.create({
      account: accountId,
      return_url: returnUrl,
      refresh_url: refreshUrl,
      type: "account_onboarding",
    });
    return { url: link.url };
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) };
  }
}

/** Has Stripe cleared this account to take charges? (Onboarding complete.) */
export async function accountChargesEnabled(accountId: string): Promise<boolean> {
  try {
    const acct = await stripe.accounts.retrieve(accountId);
    return !!acct.charges_enabled;
  } catch {
    return false;
  }
}

/**
 * A Checkout Session ON the connected account — an ad-hoc amount the customer
 * pays, settling with the business. Returns the hosted pay URL the owner sends
 * on. `payload` carries the org id into the webhook (checkout.session.completed
 * arrives with event.account = the connected account, and this metadata says
 * which business it is).
 */
export async function checkoutOnAccount(
  accountId: string,
  p: { amount: number; currency: string; description: string; orgId: string; successUrl: string; cancelUrl: string },
): Promise<{ url?: string; error?: string }> {
  try {
    const session = await stripe.checkout.sessions.create(
      {
        mode: "payment",
        line_items: [{
          quantity: 1,
          price_data: {
            currency: p.currency.toLowerCase(),
            product_data: { name: p.description.slice(0, 250) || "Payment" },
            unit_amount: Math.round(p.amount),
          },
        }],
        success_url: p.successUrl,
        cancel_url: p.cancelUrl,
        metadata: { kind: "operator_payment", org_id: p.orgId },
        payment_intent_data: { metadata: { kind: "operator_payment", org_id: p.orgId } },
      },
      { stripeAccount: accountId },
    );
    return { url: session.url ?? undefined };
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) };
  }
}
