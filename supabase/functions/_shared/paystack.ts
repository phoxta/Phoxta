// Phoxta — shared Paystack config + helpers for paystack-checkout,
// paystack-webhook and billing-alerts.
//
// Config (supabase secrets):
//   PAYSTACK_SECRET_KEY   — sk_test_… or sk_live_…
//   PAYSTACK_CURRENCY     — default "USD"; set "NGN" (etc.) if the account
//                           isn't USD-enabled…
//   PAYSTACK_RATE_PER_USD — …then REQUIRED: units of PAYSTACK_CURRENCY per
//                           1 USD (e.g. "1600").

export const PS_KEY = Deno.env.get("PAYSTACK_SECRET_KEY") ?? "";
export const CURRENCY = (Deno.env.get("PAYSTACK_CURRENCY") ?? "USD").toUpperCase();
export const RATE = Number(Deno.env.get("PAYSTACK_RATE_PER_USD") ?? (CURRENCY === "USD" ? "1" : "0"));

// Platform plans — amounts mirror src/lib/plans.ts (USD/month).
export const PLANS: Record<string, { name: string; usdMonthly: number }> = {
  starter: { name: "Phoxta Starter", usdMonthly: 75 },
  growth: { name: "Phoxta Growth", usdMonthly: 250 },
  scale: { name: "Phoxta Scale", usdMonthly: 1500 },
};

/** USD cents → minor units of the charge currency (kobo/cents), rounded up. */
export function toChargeMinor(usdCents: number): number {
  return Math.ceil(usdCents * RATE);
}

// deno-lint-ignore no-explicit-any
export async function paystack(path: string, init?: RequestInit): Promise<{ ok: boolean; status: number; body: any }> {
  const res = await fetch(`https://api.paystack.co${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${PS_KEY}`, "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  const body = await res.json().catch(() => ({}));
  return { ok: res.ok && body?.status !== false, status: res.status, body };
}

/** Find-or-create the Paystack Plan for a platform plan key. */
export async function ensurePlan(planKey: string): Promise<{ code?: string; error?: string }> {
  const spec = PLANS[planKey];
  if (!spec) return { error: "Unknown plan." };
  const wanted = `${spec.name} Monthly (${CURRENCY})`;
  const list = await paystack(`/plan?interval=monthly&status=active&perPage=100`);
  if (list.ok) {
    // deno-lint-ignore no-explicit-any
    const hit = (list.body?.data ?? []).find((p: any) => p?.name === wanted && p?.currency === CURRENCY);
    if (hit?.plan_code) return { code: hit.plan_code };
  }
  const created = await paystack(`/plan`, {
    method: "POST",
    body: JSON.stringify({ name: wanted, interval: "monthly", amount: toChargeMinor(spec.usdMonthly * 100), currency: CURRENCY }),
  });
  if (!created.ok) return { error: created.body?.message || "Could not create the billing plan." };
  return { code: created.body?.data?.plan_code };
}
