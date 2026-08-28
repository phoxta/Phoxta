/**
 * The dossier: what is in it, in what order, and how far along it is.
 *
 * The console's copy of the list that supabase/functions/dossier-run/sections.ts
 * drives. Two hand-maintained lists that must agree — a browser bundle cannot
 * import from a Deno function directory — exactly as idea-run's ORDER and
 * src/lib/ideas/steps.ts already are. Adding a section means an entry in both.
 *
 * `legal` is the odd one out and deliberately so: it is NOT generated. See
 * src/lib/dossier/legal.ts for why a model must not write your terms.
 *
 * No React, no Supabase, no network.
 */

export type DossierSection =
  | "industry"
  | "competition"
  | "strategy"
  | "gtm"
  | "pricing"
  | "financials"
  | "operations"
  | "supply"
  | "risk";

/** Every tab on the page, including the one nothing generates. */
export type DossierTab = DossierSection | "legal";

export interface SectionSpec {
  key: DossierTab;
  /** The name on the tab and at the top of the slide. */
  name: string;
  /** One sentence saying what this section is for, in the owner's words. */
  description: string;
  /** Roughly how long generating this one takes, for a progress line that is
   *  not a lie. Zero for the section nothing generates. */
  seconds: number;
  group: "The market" | "The plan" | "Running it";
  /** The accent fill the section head wears — five stops, never twice in a row. */
  cat: "purple" | "pink" | "blue" | "orange" | "green";
  /** False for `legal`, which is written by hand and never by a model. */
  generated: boolean;
}

export const SECTIONS: SectionSpec[] = [
  {
    key: "industry", name: "Industry & market", group: "The market", cat: "blue", seconds: 45, generated: true,
    description: "How this trade works, how much of it you can realistically reach, and what is moving.",
  },
  {
    key: "competition", name: "Competitors", group: "The market", cat: "orange", seconds: 40, generated: true,
    description: "Who you are up against, what they are bad at, and where the room is.",
  },
  {
    key: "strategy", name: "Strategy", group: "The plan", cat: "purple", seconds: 40, generated: true,
    description: "Where to play and how to win there — including what to refuse.",
  },
  {
    key: "gtm", name: "Launch plan", group: "The plan", cat: "pink", seconds: 40, generated: true,
    description: "The first ninety days, phase by phase, and where the first customers come from.",
  },
  {
    key: "pricing", name: "Pricing", group: "The plan", cat: "green", seconds: 40, generated: true,
    description: "What to charge, how to structure it, and what is left after costs.",
  },
  {
    key: "financials", name: "Financials", group: "The plan", cat: "blue", seconds: 45, generated: true,
    description: "Three versions of year one, what they cost, and how much cash gets you there.",
  },
  {
    key: "operations", name: "Operations manual", group: "Running it", cat: "orange", seconds: 35, generated: true,
    description: "The daily, weekly and monthly jobs — and the standards a customer would notice.",
  },
  {
    key: "supply", name: "Suppliers & sourcing", group: "Running it", cat: "purple", seconds: 35, generated: true,
    description: "Where stock or capacity comes from, how to pick a supplier, and what to negotiate.",
  },
  {
    key: "risk", name: "Risk register", group: "Running it", cat: "pink", seconds: 30, generated: true,
    description: "What could go wrong, what shows up first, and what to do about each.",
  },
  {
    key: "legal", name: "Legal & compliance", group: "Running it", cat: "green", seconds: 0, generated: false,
    description: "What you are legally required to have, where to get it, and what we will not write for you.",
  },
];

/** The generated sections, in the order they are written. */
export const SECTION_KEYS: DossierSection[] =
  SECTIONS.filter((s) => s.generated).map((s) => s.key as DossierSection);

export const TOTAL_SECTIONS = SECTION_KEYS.length;

/** Every tab, generated or not — what the rail draws. */
export const TAB_KEYS: DossierTab[] = SECTIONS.map((s) => s.key);

export const getSection = (key: DossierTab): SectionSpec | undefined =>
  SECTIONS.find((s) => s.key === key);

export const sectionIndex = (key: DossierTab): number => TAB_KEYS.indexOf(key);

/** ~5 minutes at these estimates. The page quotes this sum rather than a rounder
 *  number someone liked the sound of — if the sections get slower, the promise
 *  moves with them. */
export const ESTIMATED_SECONDS = SECTIONS.reduce((sum, s) => sum + s.seconds, 0);

/** The rail's headings, in order. */
export const GROUPS: { name: SectionSpec["group"]; keys: DossierTab[] }[] = [
  { name: "The market", keys: SECTIONS.filter((s) => s.group === "The market").map((s) => s.key) },
  { name: "The plan", keys: SECTIONS.filter((s) => s.group === "The plan").map((s) => s.key) },
  { name: "Running it", keys: SECTIONS.filter((s) => s.group === "Running it").map((s) => s.key) },
];

/** Which sections have actually produced something. A section counts as done
 *  when its row exists AND carries content — an empty object is a row that was
 *  created and never filled, and showing it as finished would be a lie the
 *  progress bar tells. */
export function completedSections(rows: { section: string; content?: unknown }[]): DossierSection[] {
  const done = new Set<string>();
  for (const r of rows) {
    const c = r.content;
    if (c && typeof c === "object" && Object.keys(c as object).length > 0) done.add(r.section);
  }
  return SECTION_KEYS.filter((k) => done.has(k));
}

/** The first section still outstanding, or null when the dossier is complete. */
export function nextSection(completed: DossierSection[]): DossierSection | null {
  const done = new Set(completed);
  return SECTION_KEYS.find((k) => !done.has(k)) ?? null;
}

export function progressPercent(completed: DossierSection[]): number {
  if (TOTAL_SECTIONS === 0) return 0;
  return Math.round((completed.length / TOTAL_SECTIONS) * 100);
}

/** "about 5 min" — for the button that starts the run. */
export function humanDuration(seconds: number): string {
  if (seconds < 90) return `about ${Math.round(seconds)} sec`;
  return `about ${Math.round(seconds / 60)} min`;
}

/** Time left, so the progress line counts down instead of sitting still. */
export function remainingSeconds(completed: DossierSection[]): number {
  const done = new Set<string>(completed);
  return SECTIONS.filter((s) => s.generated && !done.has(s.key)).reduce((sum, s) => sum + s.seconds, 0);
}

/**
 * The standing disclosure, in the owner's language.
 *
 * It sits in the head of every generated section — where the reader is looking,
 * not in a footer they scroll past. It is repeated rather than said once at the
 * top of the page, because a section is a thing people link to, print and read
 * on its own, and a warning that only exists on the page above it does not
 * travel with what it is warning about.
 */
export const ESTIMATE_NOTICE_LEAD = "Estimated, not measured.";

// SAYS ONLY WHAT IS TRUE. This used to claim EVERY number carries the
// assumptions it was worked out from. The headline figures do — they render
// through <Figure>, which draws nothing at all without a basis. But several
// sections also mention quantities inside ordinary prose, where there is no
// card and no assumption beside them. A blanket promise the page cannot keep is
// worse than a narrower one it can: a reader who spots one uncited number in a
// paragraph learns the notice is decoration, and stops believing the parts that
// were scrupulous.
export const ESTIMATE_NOTICE =
  "Phoxta has no market-data feed. Nothing here was measured — the figures on the cards show a range with the assumptions they came from, and any number mentioned in the writing is the same kind of estimate without the workings. Check all of it against your own quotes, suppliers and first sales before you rely on it.";
