/**
 * The content engine: what it thinks about, in what order, and how far along.
 *
 * The console's copy of the list that
 * supabase/functions/content-plan-run/stages.ts drives. Two hand-maintained
 * lists that must agree — a browser bundle cannot import from a Deno function
 * directory — exactly as the dossier's and idea-run's already are. Adding a
 * stage means an entry in both.
 *
 * `production` is the odd one out: it is not one stage but as many batches as
 * the calendar has pieces, so its share of the progress bar is computed from
 * the plan rather than fixed here. Without that the bar would sit still for
 * minutes on one label, which reads as a hang.
 *
 * No React, no Supabase, no network.
 */

export type PlanStage = "context" | "situation" | "audience" | "strategy" | "calendar" | "production";

export interface StageSpec {
  key: PlanStage;
  /** What the owner sees while it runs. Written as work being done, not as a
   *  system state: "Reading your business" rather than "Stage 1 of 6". */
  label: string;
  /** One line on what this stage is for, in the owner's words. */
  description: string;
  /** Roughly how long it takes, for a progress line that is not a lie. */
  seconds: number;
  /** False for the stage that costs nothing — it is a database read. */
  costsAModelCall: boolean;
}

export const STAGES: StageSpec[] = [
  {
    key: "context", label: "Reading your business", seconds: 6, costsAModelCall: false,
    description: "Your orders, reviews, inbox, offers and catalogue — what is actually true right now.",
  },
  {
    key: "situation", label: "Working out where you are", seconds: 35, costsAModelCall: true,
    description: "What is worth saying this month, and the evidence for it.",
  },
  {
    key: "audience", label: "Deciding who this is for", seconds: 25, costsAModelCall: true,
    description: "Who the month talks to, in their own words — and who it deliberately does not.",
  },
  {
    key: "strategy", label: "Setting the strategy", seconds: 40, costsAModelCall: true,
    description: "What the month is for, the mix of content, any campaign, and what you are refusing to do.",
  },
  {
    key: "calendar", label: "Laying out the month", seconds: 35, costsAModelCall: true,
    description: "What runs when, on which channel — the shape, before a word is written.",
  },
  {
    key: "production", label: "Writing it", seconds: 40, costsAModelCall: true,
    description: "The captions, the artwork copy, the emails and the articles.",
  },
];

export const STAGE_ORDER: PlanStage[] = STAGES.map((s) => s.key);

export const stageSpec = (key: string): StageSpec | undefined =>
  STAGES.find((s) => s.key === key);

/** How many production batches a plan of this many pieces will take. Must match
 *  PRODUCTION_BATCH in the edge function. */
export const PRODUCTION_BATCH = 6;

/**
 * Roughly how long is left, in seconds.
 *
 * Production counts as one step per batch rather than one step overall, because
 * a bar that stalls for four minutes on "Writing it" looks broken even when it
 * is working perfectly.
 */
export function secondsRemaining(current: PlanStage | null, pieces: number, produced = 0): number {
  if (!current) return 0;
  const from = STAGE_ORDER.indexOf(current);
  if (from < 0) return 0;
  let total = 0;
  for (let i = from; i < STAGES.length; i++) {
    const s = STAGES[i];
    if (s.key === "production") {
      const left = Math.max(0, Math.ceil((pieces - produced) / PRODUCTION_BATCH));
      total += s.seconds * Math.max(left, pieces && produced >= pieces ? 0 : 1);
    } else {
      total += s.seconds;
    }
  }
  return total;
}

/** 0-100. Production advances by pieces written, not by stage. */
export function percentDone(current: PlanStage | null, pieces: number, produced = 0): number {
  if (!current) return 100;
  const idx = STAGE_ORDER.indexOf(current);
  if (idx < 0) return 0;
  const thinking = STAGE_ORDER.length - 1; // everything except production
  if (current !== "production") return Math.round((idx / (thinking + 1)) * 100);
  const share = pieces > 0 ? produced / pieces : 0;
  return Math.round(((thinking + share) / (thinking + 1)) * 100);
}
