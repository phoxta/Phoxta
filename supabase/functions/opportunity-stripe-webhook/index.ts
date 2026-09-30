import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno';
import { stripe } from '../_shared/stripe.ts';
import { adminClient } from '../_shared/supabaseAdmin.ts';

Deno.serve(async req => {
    if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });
    const secret = Deno.env.get('OPPORTUNITY_STRIPE_WEBHOOK_SECRET');
    if (!secret) return new Response('Webhook not configured', { status: 503 });
    const signature = req.headers.get('stripe-signature'); if (!signature) return new Response('Missing signature', { status: 400 });
    let event: Stripe.Event;
    try { event = await stripe.webhooks.constructEventAsync(await req.text(), signature, secret, undefined, Stripe.createSubtleCryptoProvider()); }
    catch { return new Response('Invalid signature', { status: 400 }); }
    try {
        let subscriptionId: string | null = null;
        if (event.type.startsWith('customer.subscription.')) subscriptionId = (event.data.object as Stripe.Subscription).id;
        if (event.type === 'checkout.session.completed') { const session = event.data.object as Stripe.Checkout.Session; subscriptionId = typeof session.subscription === 'string' ? session.subscription : session.subscription?.id ?? null; }
        if (event.type === 'invoice.payment_failed' || event.type === 'invoice.paid') { const invoice = event.data.object as Stripe.Invoice; subscriptionId = typeof invoice.subscription === 'string' ? invoice.subscription : invoice.subscription?.id ?? null; }
        if (!subscriptionId) return Response.json({ received: true });
        // Retrieve current provider state: delayed webhooks cannot restore a stale plan.
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        if (subscription.metadata.kind !== 'opportunity_subscription') return Response.json({ received: true });
        const { user_id: user } = subscription.metadata;
        // Portal plan changes do not rewrite subscription metadata. Resolve the
        // actual current recurring item instead of restoring the original plan.
        const price = subscription.items.data[0]?.price;
        const plan = price?.lookup_key?.match(/^phoxta_opportunity_(explorer|builder|studio)_gbp_\d+_monthly$/)?.[1];
        if (!plan || subscription.items.data.length !== 1 || price.currency !== 'gbp' || price.recurring?.interval !== 'month' || price.recurring.interval_count !== 1) throw new Error('Unrecognised opportunity subscription item.');
        const customer = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id;
        const result = await adminClient().rpc('opportunity_apply_subscription', { p_event: event.id, p_created: event.created, p_user: user, p_customer: customer, p_subscription: subscription.id, p_plan: plan, p_status: subscription.status });
        if (result.error) throw result.error;
        return Response.json({ received: true });
    } catch {
        return new Response('Subscription reconciliation failed; retry required.', { status: 500 });
    }
});
