/** Immutable price replacement without archiving a product's default price.
 * Checkout always uses the returned price ID; existing purchases and prices
 * remain intact. Stripe transfers the lookup key atomically on creation.
 * https://docs.stripe.com/api/prices/create#price_create-transfer_lookup_key
 */
export type CataloguePrice = {
    id: string;
    currency: string;
    unit_amount: number | null;
    type: string;
    product: string | { id: string };
    recurring?: { interval: string; interval_count: number } | null;
};
export type CatalogueSpec = { lookupKey: string; name: string; currency: string; amount: number; recurring?: 'month' };
export type PriceCreate = {
    currency: string; unit_amount: number; lookup_key: string; transfer_lookup_key: boolean;
    recurring?: { interval: 'month' }; product?: string; product_data?: { name: string };
};
export type CatalogueClient = {
    prices: {
        list(params: { lookup_keys: string[]; active: boolean; limit: number }): Promise<{ data: CataloguePrice[] }>;
        create(params: PriceCreate, options: { idempotencyKey: string }): Promise<{ id: string }>;
    };
};

export async function ensureCataloguePrice(client: CatalogueClient, spec: CatalogueSpec): Promise<string> {
    const { data } = await client.prices.list({ lookup_keys: [spec.lookupKey], active: true, limit: 1 });
    const existing = data[0];
    const matches = existing && existing.currency === spec.currency && existing.unit_amount === spec.amount && (
        spec.recurring ? existing.type === 'recurring' && existing.recurring?.interval === spec.recurring && existing.recurring.interval_count === 1 : existing.type === 'one_time'
    );
    if (matches) return existing.id;

    const product = typeof existing?.product === 'string' ? existing.product : existing?.product.id;
    const price = await client.prices.create({
        currency: spec.currency, unit_amount: spec.amount, lookup_key: spec.lookupKey, transfer_lookup_key: true,
        ...(product ? { product } : { product_data: { name: spec.name } }),
        ...(spec.recurring ? { recurring: { interval: spec.recurring } } : {}),
    }, {
        // Two concurrent checkouts seeing the same old price create one
        // replacement. Including that old ID also supports later price changes.
        idempotencyKey: `catalogue-v2-${spec.lookupKey}-${spec.amount}-${existing?.id ?? 'new'}`,
    });
    return price.id;
}
