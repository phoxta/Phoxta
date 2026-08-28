/**
 * Turn an estimate's displayed range into magnitudes a chart can plot.
 *
 * Charts on this page visualise the SAME estimates the cards already show —
 * they do not invent a second set of numbers. If a range cannot be read as
 * quantities (a sentence, a bare label), the chart returns null and the
 * renderer draws nothing, which is the same honesty rule <Figure> uses.
 */

export type Magnitude = { low: number; high: number; mid: number };

const MULT: Record<string, number> = {
  k: 1e3, thousand: 1e3, thousands: 1e3,
  m: 1e6, mn: 1e6, million: 1e6, millions: 1e6,
  b: 1e9, bn: 1e9, billion: 1e9, billions: 1e9,
};

/** First quantity in a string, with k/m/bn/% suffixes. */
export function parseMagnitude(raw: string): number | null {
  const s = raw.toLowerCase().replace(/,/g, "");
  const pct = s.match(/(-?\d+(?:\.\d+)?)\s*%/);
  if (pct) return Number(pct[1]);
  const m = s.match(/(-?\d+(?:\.\d+)?)\s*(thousand|million|billion|thousands|millions|billions|mn|bn|k|m|b)?/);
  if (!m) return null;
  const n = Number(m[1]);
  if (!Number.isFinite(n)) return null;
  const mul = m[2] ? (MULT[m[2]] ?? 1) : 1;
  return n * mul;
}

/** Low/high from "£40k – £90k", or a point from a single figure. */
export function parseRange(value: string): Magnitude | null {
  const parts = value.split(/\s*(?:–|—|-| to )\s*/i).filter((p) => p.trim());
  if (parts.length >= 2) {
    const low = parseMagnitude(parts[0]);
    const high = parseMagnitude(parts[1]);
    if (low == null || high == null) return null;
    const a = Math.min(low, high);
    const b = Math.max(low, high);
    return { low: a, high: b, mid: (a + b) / 2 };
  }
  const p = parseMagnitude(value);
  if (p == null) return null;
  return { low: p, high: p, mid: p };
}

export function midOf(value: string): number | null {
  return parseRange(value)?.mid ?? null;
}
