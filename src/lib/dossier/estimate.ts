import { arr, list, obj, str } from "@/lib/safeJson";

/**
 * A number in a dossier, and the reasoning that has to travel with it.
 *
 * WHY THIS TYPE EXISTS AT ALL
 *
 * A language model has no industry data. Ask one how big the UK fashion market
 * is and it will answer "£62.4 billion" — confident, precise, and made up. There
 * is no web search wired into Phoxta's functions (only Pexels, for photographs),
 * so a figure on this page cannot be sourced, and a figure that cannot be sourced
 * must not be shown as though it had been.
 *
 * So a dossier does not store numbers. It stores estimates: a RANGE, one plain
 * sentence saying what the range was derived from, and the assumptions a reader
 * can disagree with. `readEstimate` returns null when the basis or the range is
 * missing, and the <Figure> component renders nothing for a null — which makes
 * the honesty rule a property of the code rather than a promise about prompts.
 * A bare number cannot reach a slide even if a model returns one.
 *
 * THE SEAM
 *
 * `sources` is read, carried and rendered today, and today it is always empty
 * because nothing can fill it. When a research step exists it pushes
 * { title, url, publisher, retrievedAt } objects into the same array in the same
 * stored JSON, and citations appear under every figure — no migration, no prompt
 * rewrite, no change here.
 */

export type EstimateSource = {
  title: string;
  url: string;
  publisher: string;
  retrievedAt: string;
};

export type Estimate = {
  /** What is being counted, e.g. "What an independent can reach". */
  label: string;
  /** The range as one string: "£40k – £90k", or a single figure when the model
   *  could only give one honestly. */
  value: string;
  /** "per month", "% gross margin" — rendered beside the figure, not inside it. */
  unit: string;
  /** One sentence: what this range was worked out from. Without it, nothing renders. */
  basis: string;
  /** The inputs a reader can argue with. */
  assumptions: string[];
  confidence: "low" | "medium" | "high" | "";
  /** Always empty today. See "the seam" above. */
  sources: EstimateSource[];
};

function confidenceOf(v: unknown): Estimate["confidence"] {
  const s = str(v).trim().toLowerCase();
  if (s.startsWith("high")) return "high";
  if (s.startsWith("med")) return "medium";
  if (s.startsWith("low")) return "low";
  return "";
}

function sourcesOf(v: unknown): EstimateSource[] {
  return arr(v)
    .map((s) => ({
      title: str(s.title),
      url: str(s.url),
      publisher: str(s.publisher),
      retrievedAt: str(s.retrievedAt ?? s.retrieved_at),
    }))
    .filter((s) => s.title || s.url);
}

/**
 * Read a stored estimate, or null.
 *
 * Null means "do not draw this". Two things make it null, and both are the same
 * failure: a figure nobody can check. No basis — the number arrived without its
 * reasoning. No range and no point — there is no number at all, only prose in a
 * field that was supposed to hold one.
 */
export function readEstimate(v: unknown): Estimate | null {
  const d = obj(v);
  const basis = str(d.basis).trim();
  if (!basis) return null;

  const low = str(d.low).trim();
  const high = str(d.high).trim();
  const point = str(d.point).trim();

  const value =
    low && high && low !== high ? `${low} – ${high}`
      : low || high || point;
  if (!value) return null;

  return {
    label: str(d.label).trim(),
    value,
    unit: str(d.unit).trim(),
    basis,
    assumptions: list(d.assumptions),
    confidence: confidenceOf(d.confidence),
    sources: sourcesOf(d.sources),
  };
}

/** Read a list of estimates, dropping the ones that cannot be shown honestly. */
export function readEstimates(v: unknown): Estimate[] {
  return arr(v).map(readEstimate).filter((e): e is Estimate => e !== null);
}

/** Owner-facing wording for how much weight to put on a figure. "Medium" alone
 *  says nothing; this says what it means for them. */
export const CONFIDENCE_LABEL: Record<Exclude<Estimate["confidence"], "">, string> = {
  high: "Fairly confident",
  medium: "Rough",
  low: "A guess — check this one",
};
