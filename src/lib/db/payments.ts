import { supabase } from "@/lib/supabaseClient";
import { trackEvent } from "@/lib/analytics";

// Client side of the Stripe flows. Both money surfaces go through the
// stripe-checkout edge function, which returns a hosted-payment URL we redirect
// the browser to; fulfilment happens in stripe-webhook, never here — a client
// that can tell the server "I paid" is a client that can provision itself a
// free business.

const CALLBACK_PATH = "/dashboard/payment/callback";

function callbackUrl(): string {
  return `${window.location.origin}${CALLBACK_PATH}`;
}

async function invokeCheckout<T>(body: Record<string, unknown>): Promise<{ data: T | null; error: string | null }> {
  const { data, error } = await supabase.functions.invoke("stripe-checkout", { body });
  if (error) {
    let msg = error.message;
    try {
      const ctx = await (error as { context?: Response }).context?.json?.();
      if (ctx?.error) msg = ctx.error;
    } catch {
      /* keep generic */
    }
    return { data: null, error: msg };
  }
  if ((data as { error?: string })?.error) return { data: null, error: (data as { error: string }).error };
  return { data: data as T, error: null };
}

/** Buy a business: returns the Stripe Checkout URL to redirect to. */
export async function startBlueprintCheckout(
  blueprintId: string,
  name?: string,
): Promise<{ url: string | null; error: string | null }> {
  trackEvent("checkout_started", { kind: "blueprint" });
  const { data, error } = await invokeCheckout<{ url: string }>({
    kind: "blueprint",
    blueprintId,
    name,
    returnUrl: callbackUrl(),
  });
  return { url: data?.url ?? null, error };
}

/** Put a business on a monthly platform plan: returns the payment URL. */
export async function startSubscriptionCheckout(
  orgId: string,
  plan: "starter" | "growth" | "scale",
): Promise<{ url: string | null; error: string | null }> {
  trackEvent("subscription_started", { plan });
  const { data, error } = await invokeCheckout<{ url: string }>({
    kind: "subscription",
    orgId,
    plan,
    returnUrl: callbackUrl(),
  });
  return { url: data?.url ?? null, error };
}

/** Cancel a business's plan (self-serve — the promise Billing makes). */
export async function cancelSubscription(orgId: string): Promise<{ ok: boolean; error: string | null }> {
  trackEvent("plan_cancel_clicked");
  const { data, error } = await invokeCheckout<{ ok: boolean }>({ kind: "cancel", orgId });
  return { ok: data?.ok === true, error };
}

/** Switch plans. A live subscription is amended in place — Stripe prorates the
 *  difference — so this returns { url: null } and the change is already done.
 *  With nothing to amend it hands back a checkout URL instead. */
export async function changePlan(
  orgId: string,
  plan: "starter" | "growth" | "scale",
): Promise<{ url: string | null; changed: boolean; error: string | null }> {
  trackEvent("subscription_started", { plan, change: "true" });
  const { data, error } = await invokeCheckout<{ url?: string; ok?: boolean }>({
    kind: "change_plan",
    orgId,
    plan,
    returnUrl: callbackUrl(),
  });
  return { url: data?.url ?? null, changed: (data as { ok?: boolean } | null)?.ok === true, error };
}

export type PaymentVerification = {
  status: string;
  kind: "blueprint" | "subscription" | null;
  /** True once the webhook has finished fulfilment (business provisioned / plan active). */
  fulfilled: boolean;
};

/** Callback-page check: confirms the transaction server-side. */
export async function verifyPayment(reference: string): Promise<{ data: PaymentVerification | null; error: string | null }> {
  return invokeCheckout<PaymentVerification>({ kind: "verify", reference });
}
