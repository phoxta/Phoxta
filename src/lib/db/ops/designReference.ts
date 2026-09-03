import { supabase } from "@/lib/supabaseClient";
import { friendlyError } from "@/lib/friendlyError";
import type { DesignDoc, PlacedImage } from "@/lib/designs/types";

/**
 * The look a month is made in, agreed before a word of it is written.
 *
 * Two ways to arrive at one, and they are genuinely different things:
 *
 *  - UPLOAD your own artwork and it is rebuilt as a real layout — layers,
 *    positions, type, palette — which every post that month is then poured
 *    into. That is reproduction, of your own work.
 *
 *  - Take DIRECTION from a suggestion or a reference off the web: palette,
 *    type, spacing, how the page breathes. Not a copy — a copy of somebody
 *    else's artwork is not yours to publish, and taking direction is what a
 *    designer does with a reference anyway.
 *
 * Which one you get is decided on the server by `origin`, not by a flag the UI
 * can set loosely.
 */

export type Look = {
  name: string;
  feels: string;
  composition: string;
  font: string;
  palette: Partial<Record<"canvas" | "ink" | "accent" | "accentSoft" | "gradientFrom" | "gradientTo", string>>;
  origin: "upload" | "web" | "suggested";
  /** The rebuilt layout. Present only for an upload — a suggestion carries
   *  direction and a template to start from, not a document. */
  doc?: DesignDoc;
  /** For a suggestion: the closest built-in layout. */
  templateId?: string;
  /** The picture that was read, so the owner can see what they approved. */
  referenceUrl?: string;
};

/** One proposed art direction, as shown on a card. */
export type Direction = {
  key: string;
  name: string;
  feels: string;
  composition: string;
  font: string;
  templateId: string;
  palette: Look["palette"];
  moodQuery: string;
  /** A photograph carrying the mood, so the choice is made by eye. */
  mood?: PlacedImage;
};

async function call<T>(body: Record<string, unknown>): Promise<{ data: T | null; error: string | null }> {
  try {
    const { data, error } = await supabase.functions.invoke("design-reference", { body });
    if (error) {
      let msg = error.message;
      try {
        const ctx = await (error as { context?: Response }).context?.json?.();
        if (ctx?.error) msg = ctx.error;
      } catch { /* keep the transport's message */ }
      return { data: null, error: friendlyError(msg) };
    }
    if (data?.error) return { data: null, error: String(data.error) };
    return { data: data as T, error: null };
  } catch (e) {
    return { data: null, error: friendlyError(String((e as Error)?.message ?? e)) };
  }
}

/** Four directions to choose between, each with a mood shot. */
export const proposeLooks = (orgId: string, p: { brief?: string; catalogue: unknown[] }) =>
  call<{ directions: Direction[]; note?: string }>({ orgId, action: "propose", ...p });

/**
 * Read one reference picture.
 *
 * `origin: "upload"` rebuilds it as a layout. `origin: "web"` returns direction
 * only — and the server enforces that, so a caller cannot ask for a pixel copy
 * of somebody else's work by passing the wrong value.
 */
export const analyseReference = (
  orgId: string,
  p: { url: string; origin: "upload" | "web"; format?: string; templateId?: string },
) => call<{
  look: Look;
  doc?: DesignDoc;
  layers?: number;
  /** What could not be read, said out loud rather than quietly repaired. */
  dropped?: { what: string; why: string }[];
}>({ orgId, action: "analyse", ...p });
