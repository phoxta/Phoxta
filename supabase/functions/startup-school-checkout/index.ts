// Phoxta Startup School — paid admission checkout.
//
// This endpoint never grants access. It creates a Stripe-hosted payment page;
// the signed Stripe webhook writes the entitlement only after payment settles.
import { json, preflight } from "../_shared/cors.ts";
import { requireUser } from "../_shared/auth.ts";
import { adminClient } from "../_shared/supabaseAdmin.ts";
import { ensureCustomer, ensureStartupSchoolPrice, STARTUP_SCHOOL_PLANS, stripe, STRIPE_KEY, type StartupSchoolPlanKey } from "../_shared/stripe.ts";
import { ensureStartupSchoolAccessSchema } from "../_shared/startupSchoolAccessSchema.ts";

const APP_ORIGIN = Deno.env.get("STARTUP_SCHOOL_URL") ?? "https://learn.phoxta.com";
const RANK: Record<StartupSchoolPlanKey, number> = { self_study: 1, cohort: 2, launch: 3 };
const isPlan = (value: string): value is StartupSchoolPlanKey => Object.hasOwn(STARTUP_SCHOOL_PLANS, value);

/**
 * Stripe Link is a separate accelerated payment network, even when card entry
 * is the only listed payment method. Give Startup School its own persistent
 * configuration so new Checkout Sessions always show manual card entry and
 * never prompt a learner for Link's phone-based fast checkout.
 */
async function startupSchoolCardConfiguration(organizationId: string): Promise<string> {
  const admin = adminClient();
  const { data: saved } = await admin
    .from("cs_payment_method_settings")
    .select("stripe_payment_method_configuration_id")
    .eq("organization_id", organizationId)
    .maybeSingle();
  if (saved?.stripe_payment_method_configuration_id) return saved.stripe_payment_method_configuration_id;

  const configuration = await stripe.paymentMethodConfigurations.create({
    name: "Phoxta Startup School — card checkout",
    card: { display_preference: { preference: "on" } },
    link: { display_preference: { preference: "off" } },
  });

  const { error } = await admin.from("cs_payment_method_settings").upsert({
    organization_id: organizationId,
    stripe_payment_method_configuration_id: configuration.id,
    updated_at: new Date().toISOString(),
  });
  if (error) throw new Error(`Could not save the secure card checkout configuration: ${error.message}`);
  return configuration.id;
}

function siteOrigin(req: Request): string {
  const origin = req.headers.get("origin") ?? "";
  try {
    const parsed = new URL(origin);
    if (parsed.hostname === "learn.phoxta.com" || parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1") return parsed.origin;
  } catch { /* use production default */ }
  return APP_ORIGIN;
}

Deno.serve(async (req) => {
  const pf = preflight(req);
  if (pf) return pf;
  if (!STRIPE_KEY) return json({ error: "Card payments are not configured yet." }, 503);

  const caller = await requireUser(req);
  if ("error" in caller) return caller.error;
  try {
    await ensureStartupSchoolAccessSchema();
  } catch (error) {
    console.error("startup-school paid-access schema", error);
    return json({ error: "Enrolment is being prepared. Please try again in a moment." }, 503);
  }
  const body = await req.json().catch(() => ({})) as Record<string, unknown>;
  const organizationId = String(body.organizationId ?? "");
  const kind = String(body.kind ?? "");
  if (!organizationId) return json({ error: "This school could not be identified." }, 400);

  const admin = adminClient();
  // This function is for a real school, not an arbitrary Phoxta organisation.
  const { data: school } = await admin.from("cs_courses").select("organization_id").eq("organization_id", organizationId).limit(1).maybeSingle();
  if (!school) return json({ error: "This school is not ready for enrolment." }, 404);

  if (kind === "status") {
    const sessionId = String(body.sessionId ?? "");
    if (!sessionId.startsWith("cs_")) return json({ error: "A valid checkout reference is required." }, 400);
    const { data: order } = await admin.from("cs_plan_orders").select("id,plan,status").eq("organization_id", organizationId).eq("user_id", caller.userId).eq("stripe_checkout_session_id", sessionId).maybeSingle();
    if (!order) return json({ active: false, status: "pending" });
    const { data: access } = await admin
      .from("cs_entitlements")
      .select("plan")
      .eq("organization_id", organizationId)
      .eq("user_id", caller.userId)
      .eq("status", "active")
      .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
      .maybeSingle();
    const { data: seat } = await admin.from("cs_seat_holds").select("status").eq("order_id", order.id).maybeSingle();
    return json({ active: order.status === "paid" && Boolean(access), plan: access?.plan ?? null, status: order.status, seatAllocated: !seat || seat.status === "confirmed" });
  }

  if (kind === "cancel") {
    const { data: order } = await admin.from("cs_plan_orders").select("id,status,stripe_checkout_session_id").eq("organization_id",organizationId).eq("user_id",caller.userId).eq("id",String(body.orderId??"")).maybeSingle();
    if (!order || order.status !== "pending") return json({ error: "This checkout is no longer pending." },409);
    try { if(order.stripe_checkout_session_id) await stripe.checkout.sessions.expire(order.stripe_checkout_session_id); }
    catch { return json({error:"This checkout could not be cancelled. If you paid, do not pay again."},409); }
    await admin.from("cs_plan_orders").update({status:"failed"}).eq("id",order.id).eq("status","pending");
    await admin.from("cs_seat_holds").update({status:"released"}).eq("order_id",order.id).eq("status","held");
    return json({cancelled:true});
  }

  if (kind !== "checkout") return json({ error: "Unsupported checkout request." }, 400);
  const planValue = String(body.plan ?? "");
  if (!isPlan(planValue)) return json({ error: "Choose a valid programme option." }, 400);
  if (body.termsAccepted !== true) return json({ error: "Review and accept the admission terms before paying." }, 400);
  const { data: terms, error: termsError } = await admin.rpc("cs_public_school_terms", { p_org: organizationId });
  if (termsError || !terms?.access_policy || !terms?.cancellation_policy) return json({ error: "Admission terms are not ready. Please contact programme support." }, 503);
  if(planValue!=="self_study" && !/^[0-9a-f-]{36}$/i.test(String(body.cohortId??""))) return json({error:"Choose an intake before paying for Cohort or Launch."},400);

  const { data: current } = await admin
    .from("cs_entitlements")
    .select("plan,status")
    .eq("organization_id", organizationId)
    .eq("user_id", caller.userId)
    .eq("status", "active")
    .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
    .maybeSingle();
  if (current?.plan && RANK[current.plan as StartupSchoolPlanKey] >= RANK[planValue]) {
    return json({ error: "Your current programme access already includes this option." }, 409);
  }

  const { data: userResult } = await admin.auth.admin.getUserById(caller.userId);
  const email = userResult.user?.email;
  if (!email) return json({ error: "Your account needs an email address before checkout." }, 400);
  let customer: string | null;
  let price: Awaited<ReturnType<typeof ensureStartupSchoolPrice>>;
  try {
    customer = await ensureCustomer(email, String(userResult.user?.user_metadata?.full_name ?? ""));
    price = await ensureStartupSchoolPrice(planValue);
  } catch {
    return json({ error: "Stripe could not prepare this checkout. No payment has been taken. Please try again." }, 502);
  }
  if (!price.id) return json({ error: price.error ?? "This programme option is unavailable." }, 502);

  let paymentMethodConfiguration: string;
  try {
    paymentMethodConfiguration = await startupSchoolCardConfiguration(organizationId);
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Secure card checkout is being prepared. Please try again in a moment." }, 503);
  }

  const { data: order, error: orderError } = await admin
    .from("cs_plan_orders")
    .insert({ organization_id: organizationId, user_id: caller.userId, plan: planValue, amount_pence: STARTUP_SCHOOL_PLANS[planValue].amountPence, currency: "GBP", status: "pending", admission_version: 2, terms_accepted_at: new Date().toISOString(), terms_snapshot: terms })
    .select("id")
    .single();
  if (orderError || !order) return json({ error: orderError?.message ?? "We could not prepare your enrolment." }, 500);
  if(planValue!=="self_study") {
    const {error:seatError}=await admin.rpc("cs_hold_seat",{p_order:order.id,p_cohort:String(body.cohortId)});
    if(seatError){await admin.from("cs_plan_orders").update({status:"failed"}).eq("id",order.id);return json({error:seatError.message},409);}
  }

  const origin = siteOrigin(req);
  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      expires_at: Math.floor(Date.now()/1000)+30*60,
      // This dedicated configuration enables card entry and turns the Link
      // network off. Stripe does not allow a separate method filter when a
      // payment-method configuration is supplied.
      payment_method_configuration: paymentMethodConfiguration,
      phone_number_collection: { enabled: false },
      customer: customer ?? undefined,
      customer_email: customer ? undefined : email,
      line_items: [{ price: price.id, quantity: 1 }],
      metadata: { kind: "startup_school", order_id: order.id, organization_id: organizationId, user_id: caller.userId, plan: planValue },
      payment_intent_data: { metadata: { kind: "startup_school", order_id: order.id, organization_id: organizationId, user_id: caller.userId, plan: planValue } },
      success_url: `${origin}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/payment/cancel?order_id=${order.id}`,
    });
    await admin.from("cs_plan_orders").update({ stripe_checkout_session_id: session.id }).eq("id", order.id);
    return json({ url: session.url });
  } catch (error) {
    await admin.from("cs_plan_orders").update({ status: "failed" }).eq("id", order.id);
    await admin.from("cs_seat_holds").update({status:"released"}).eq("order_id",order.id).eq("status","held");
    return json({ error: error instanceof Error ? error.message : "Stripe could not start checkout." }, 502);
  }
});
