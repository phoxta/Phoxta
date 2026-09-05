/**
 * Cached Intl formatters. Constructing an Intl.NumberFormat per render is
 * measurably slow in lists; these are created once per currency and reused.
 */

const currencyFormatters = new Map<string, Intl.NumberFormat>();

/** Format minor units (cents/pence) as a localised currency string. */
export function formatMoney(cents: number, currency = "GBP"): string {
    const ccy = (currency || "GBP").toUpperCase();
    let f = currencyFormatters.get(ccy);
    if (!f) {
        f = new Intl.NumberFormat(undefined, { style: "currency", currency: ccy });
        currencyFormatters.set(ccy, f);
    }
    return f.format((cents ?? 0) / 100);
}

/** The catalogue's display price: a bare currency symbol and whole units, no decimals. */
export function formatListingPrice(cents: number, symbol = "$"): string {
    return `${symbol}${Math.round((cents ?? 0) / 100).toLocaleString()}`;
}

const mediumDate = new Intl.DateTimeFormat(undefined, { year: "numeric", month: "short", day: "numeric" });

export function formatDate(iso: string | Date): string {
    const d = typeof iso === "string" ? new Date(iso) : iso;
    return Number.isNaN(d.getTime()) ? "" : mediumDate.format(d);
}

export function convertNumbThousand(x?: number): string {
    if (!x) return "0";
    return x.toLocaleString("en-US");
}
