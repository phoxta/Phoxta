import { ensureCataloguePrice, type CatalogueClient, type CataloguePrice, type CatalogueSpec, type PriceCreate } from '../../supabase/functions/_shared/stripeCatalogue.ts';

function assert(value: unknown, message: string): asserts value { if (!value) throw new Error(message); }
const school: CatalogueSpec = { lookupKey: 'school_cohort', name: 'Cohort', currency: 'gbp', amount: 120000 };
const oldPrice: CataloguePrice = { id: 'price_old_default', currency: 'gbp', unit_amount: 50000, type: 'one_time', product: 'prod_school', recurring: null };

function fixture(initial?: CataloguePrice, rejectCreate = false) {
    let current = initial;
    const creates: { params: PriceCreate; key: string }[] = [];
    const oldSnapshot = initial ? structuredClone(initial) : undefined;
    const byKey = new Map<string, { id: string }>();
    const client: CatalogueClient = { prices: {
        list: async () => ({ data: current ? [current] : [] }),
        create: async (params, options) => {
            creates.push({ params, key: options.idempotencyKey });
            if (rejectCreate) throw new Error('Stripe unavailable');
            const known = byKey.get(options.idempotencyKey); if (known) return known;
            const made = { id: 'price_new' }; byKey.set(options.idempotencyKey, made);
            current = { ...made, currency: params.currency, unit_amount: params.unit_amount, type: params.recurring ? 'recurring' : 'one_time', recurring: params.recurring ? { ...params.recurring, interval_count: 1 } : null, product: params.product ?? 'prod_new' };
            return made;
        },
    } };
    return { client, creates, oldSnapshot, current: () => current };
}
Deno.test('default product price drift creates a replacement without archiving or clearing the old price', async () => {
    const f = fixture(oldPrice);
    assert(await ensureCataloguePrice(f.client, school) === 'price_new', 'Current price is returned');
    assert(f.creates[0].params.product === 'prod_school', 'Existing product is reused');
    assert(f.creates[0].params.transfer_lookup_key, 'Stripe transfers lookup atomically');
    assert(JSON.stringify(oldPrice) === JSON.stringify(f.oldSnapshot), 'Default price remains intact');
    assert(await ensureCataloguePrice(f.client, school) === 'price_new', 'Retry resolves current price');
    assert(f.creates.length === 1, 'Retry creates no duplicate');
});
Deno.test('matching school admission reuses price; same amount in another currency is replaced', async () => {
    const matched = fixture({ ...oldPrice, unit_amount: school.amount });
    assert(await ensureCataloguePrice(matched.client, school) === oldPrice.id, 'Matching price reused');
    assert(matched.creates.length === 0, 'No catalogue mutation');
    const wrongCurrency = fixture({ ...oldPrice, unit_amount: school.amount, currency: 'usd' });
    assert(await ensureCataloguePrice(wrongCurrency.client, school) === 'price_new', 'Wrong currency replaced');
});
Deno.test('one-time admissions reject recurring prices even at the same amount', async () => {
    const f = fixture({ ...oldPrice, unit_amount: school.amount, type: 'recurring', recurring: { interval: 'month', interval_count: 1 } });
    await ensureCataloguePrice(f.client, school);
    assert(!f.creates[0].params.recurring, 'Admission replacement remains one-time');
});
Deno.test('monthly Console plan rejects a yearly price at the same amount', async () => {
    const f = fixture({ ...oldPrice, unit_amount: school.amount, type: 'recurring', recurring: { interval: 'year', interval_count: 1 } });
    await ensureCataloguePrice(f.client, { ...school, recurring: 'month' });
    assert(f.creates[0].params.recurring?.interval === 'month', 'Monthly interval preserved');
});
Deno.test('concurrent replacements use the same idempotency key', async () => {
    const f = fixture(oldPrice);
    const ids = await Promise.all([ensureCataloguePrice(f.client, school), ensureCataloguePrice(f.client, school)]);
    assert(ids[0] === ids[1], 'Both checkouts receive the same replacement');
    assert(new Set(f.creates.map(call => call.key)).size === 1, 'Single idempotency key');
});
Deno.test('failed creation preserves old lookup and default price', async () => {
    const f = fixture(oldPrice, true);
    let failed = false;
    try { await ensureCataloguePrice(f.client, school); } catch { failed = true; }
    assert(failed, 'Failure is surfaced, not a stale-priced checkout');
    assert(f.current()?.id === oldPrice.id, 'Original retained');
});
Deno.test('new catalogue creates a named product and price once', async () => {
    const f = fixture(); await ensureCataloguePrice(f.client, school);
    assert(f.creates[0].params.product_data?.name === school.name, 'Product name passed');
    assert(!f.creates[0].params.product, 'No fabricated existing product');
});
