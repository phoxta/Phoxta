/**
 * The coercions every model-generated slide is built on.
 *
 * These are not helpers, they are the degradation contract. A model is asked for
 * a shape but is not bound to it, so every field a slide reads has to survive
 * being absent, being null, or arriving as the wrong type — and it has to do it
 * by rendering NOTHING rather than by rendering the word "undefined". A slide
 * that is short because the data was thin is honest; one that says "undefined"
 * to someone deciding whether to spend thousands of pounds is not.
 *
 * One definition, shared by the Idea Validator's step slides and the business
 * dossier's section slides. The previous arrangement was a copy in each file,
 * which works right up until one copy drifts to returning String(undefined).
 */

export type Json = Record<string, unknown>;

/**
 * Anything → a string. null/undefined become "", never "null" or "undefined".
 *
 * An OBJECT or an array also becomes "". A model told to return a sentence
 * sometimes returns a small structure instead — an estimate object where a
 * heading was asked for, say — and `String({})` is "[object Object]", which is
 * the same class of failure as printing "undefined" and looks even more like a
 * bug. Numbers and booleans still stringify, because a field that arrived as
 * `12` where "12" was expected is the right answer in the wrong wrapper.
 */
export const str = (v: unknown): string =>
  typeof v === "string" ? v
    : v == null ? ""
      : typeof v === "object" ? ""
        : String(v);

/** Anything → an array of objects. A non-array becomes [], so `.map` is safe. */
export const arr = (v: unknown): Json[] => (Array.isArray(v) ? (v as Json[]) : []);

/** Anything → a plain object. null and arrays become {}, so `.foo` is safe. */
export const obj = (v: unknown): Json =>
  v && typeof v === "object" && !Array.isArray(v) ? (v as Json) : {};

/** Anything → a string list, with the empties dropped rather than rendered. */
export const list = (v: unknown): string[] => (Array.isArray(v) ? v.map(str).filter(Boolean) : []);

/** Anything → a finite number, or null. Null is the honest answer for "this was
 *  not a number" — zero is a different claim, and one a reader would believe. */
export const num = (v: unknown): number | null => {
  const n = typeof v === "number" ? v : parseFloat(str(v));
  return Number.isFinite(n) ? n : null;
};
