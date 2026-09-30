import { preflight, json } from '../_shared/cors.ts';
import { adminClient, userClient } from '../_shared/supabaseAdmin.ts';
import { stripe, STRIPE_KEY } from '../_shared/stripe.ts';
import type Stripe from 'https://esm.sh/stripe@14.21.0?target=deno';

Deno.serve(async req => {
    const early = preflight(req); if (early) return early;
    const origin = Deno.env.get('PHOXTA_APP_ORIGIN') ?? 'https://www.phoxta.com';
    const allowed = [origin, ...(Deno.env.get('PHOXTA_ALLOWED_ORIGINS') ?? '').split(',').filter(Boolean)];
    if (req.headers.get('origin') && !allowed.includes(req.headers.get('origin')!)) return json({ error: 'Origin not allowed.' }, 403);
    if (!STRIPE_KEY) return json({ error: 'Billing is not configured yet.' }, 503);
    const token = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '');
    if (!token) return json({ error: 'Sign in to continue.' }, 401);
    const client = userClient(token); const { data: auth, error: authError } = await client.auth.getUser();
    if (authError || !auth.user) return json({ error: 'Sign in to continue.' }, 401);
    const { error: accountError } = await client.rpc('opportunity_account_summary');
    if (accountError) return json({ error: 'Your opportunity account could not be loaded.' }, 503);
    const db = adminClient();
    let lease: string | null = null;
    try {
        const raw = await req.text(); if (raw.length > 4000) return json({ error: 'Request too large.' }, 413);
        const body = JSON.parse(raw);
        const claimed = await db.rpc('opportunity_claim_billing', { p_user: auth.user.id });
        if (claimed.error) throw new Error('Billing reservation unavailable.');
        lease = claimed.data;
        if (!lease) return json({ error: 'A billing request is already in progress. Wait a moment and try again.' }, 409);
        const { data: account, error } = await db.from('opportunity_accounts').select('*').eq('user_id', auth.user.id).single();
        if (error) throw new Error('Account unavailable.');
        let customer = account.stripe_customer_id as string | null;
        if (!customer) {
            const made = await stripe.customers.create({ email: auth.user.email, metadata: { phoxta_opportunity_user: auth.user.id } }, { idempotencyKey: `opportunity-customer-${auth.user.id}` });
            customer = made.id;
            const saved = await db.from('opportunity_accounts').update({ stripe_customer_id: customer }).eq('user_id', auth.user.id);
            if (saved.error) throw new Error('Could not save billing account.');
        }
        const subscriptions = await stripe.subscriptions.list({ customer, status: 'all', limit: 100 });
        const existingSubscription = subscriptions.data.some((s: Stripe.Subscription) => s.metadata.kind === 'opportunity_subscription' && !['canceled', 'incomplete_expired'].includes(s.status));
        if (body.action === 'portal' || existingSubscription) {
            const session = await stripe.billingPortal.sessions.create({ customer, return_url: `${origin}/app/settings/billing` });
            return json({ url: session.url });
        }
        if (body.action !== 'checkout' || !['explorer', 'builder', 'studio'].includes(body.plan_key)) return json({ error: 'Choose a valid paid plan.' }, 400);
        // Reuse an open session across page reloads. Expire another plan's old
        // session before offering a replacement so both cannot later be paid.
        const open = await stripe.checkout.sessions.list({ customer, status: 'open', limit: 100 });
        for (const pending of open.data.filter((s: Stripe.Checkout.Session) => s.metadata?.kind === 'opportunity_subscription')) {
            if (pending.metadata?.plan_key === body.plan_key && pending.url) return json({ url: pending.url });
            await stripe.checkout.sessions.expire(pending.id);
        }
        const { data: plan } = await db.from('opportunity_plan_limits').select('*').eq('plan_key', body.plan_key).eq('active', true).single();
        if (!plan || plan.monthly_gbp <= 0) return json({ error: 'Plan unavailable.' }, 400);
        const lookup = `phoxta_opportunity_${plan.plan_key}_gbp_${plan.monthly_gbp}_monthly`;
        let price = (await stripe.prices.list({ lookup_keys: [lookup], active: true, limit: 1 })).data[0];
        if (!price) price = await stripe.prices.create({ currency: 'gbp', unit_amount: plan.monthly_gbp * 100, recurring: { interval: 'month' }, product_data: { name: `Phoxta ${plan.label} — Opportunity Platform` }, lookup_key: lookup }, { idempotencyKey: lookup });
        if (price.unit_amount !== plan.monthly_gbp * 100 || price.currency !== 'gbp' || price.recurring?.interval !== 'month') throw new Error('Billing price does not match the current plan.');
        const session = await stripe.checkout.sessions.create({
            customer, mode: 'subscription', line_items: [{ price: price.id, quantity: 1 }],
            success_url: `${origin}/app/settings/billing?checkout=success`, cancel_url: `${origin}/app/settings/billing?checkout=cancelled`,
            client_reference_id: auth.user.id,
            metadata: { kind: 'opportunity_subscription', user_id: auth.user.id, plan_key: plan.plan_key },
            subscription_data: { metadata: { kind: 'opportunity_subscription', user_id: auth.user.id, plan_key: plan.plan_key } },
        }, { idempotencyKey: `opportunity-checkout-${auth.user.id}-${lease}` });
        return json({ url: session.url });
    } catch (error) {
        console.error(JSON.stringify({ event: 'opportunity_billing_error', error_type: error instanceof Error ? error.name : 'unknown' }));
        return json({ error: 'Billing could not complete this request. Please try again or contact support.' }, 502);
    } finally {
        if (lease) await db.rpc('opportunity_release_billing', { p_user: auth.user.id, p_token: lease });
    }
});
