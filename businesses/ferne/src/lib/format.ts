/** Formatting helpers. Money is always in minor units (pence), like the backend. */

/** e.g. 2800, "GBP" → "£28.00" — whole amounts drop the ".00" ("£28"). */
export function formatMoney(cents: number, currency = "GBP"): string {
    const amount = (cents ?? 0) / 100;
    const fractionDigits = Number.isInteger(amount) ? 0 : 2;
    try {
        return new Intl.NumberFormat("en-GB", {
            style: "currency",
            currency: currency || "GBP",
            minimumFractionDigits: fractionDigits,
            maximumFractionDigits: 2,
        }).format(amount);
    } catch {
        // An unknown ISO code would throw and take the whole page down.
        return `${amount.toFixed(fractionDigits)}`;
    }
}

/** "★★★★☆" for a 0–5 rating. Decorative: callers state the number for screen readers. */
export function stars(rating: number): string {
    const filled = Math.max(0, Math.min(5, Math.round(rating)));
    return "★".repeat(filled) + "☆".repeat(5 - filled);
}

/** "12 August 2026" */
export function formatDate(value: string | number | Date): string {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

/** "12 Aug 2026" */
export function formatDateShort(value: string | number | Date): string {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

/** Rough reading time from a body of text, at ~200 words a minute. */
export function readingMinutes(text: string): number {
    const words = (text || "").trim().split(/\s+/).filter(Boolean).length;
    return Math.max(1, Math.round(words / 200));
}

export const isEmail = (v: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

/** UK postcodes only; other countries are not validated beyond "not empty". */
export const isUkPostcode = (v: string): boolean => /^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/i.test(v.trim());
