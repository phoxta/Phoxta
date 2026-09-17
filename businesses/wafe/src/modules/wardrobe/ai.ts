import { useCallback, useState } from "react";
import { useAi } from "@/lib/ai";
import { inUse, itemsOf, suggestOutfit } from "./derive";
import { CATEGORY, COLOUR, OCCASION, SEASON } from "./types";
import type { Occasion, Season, WardrobeState } from "./types";
import type { OutfitSuggestion } from "./components/dialogs";

/**
 * The companion, over the closet.
 *
 * Two asks, one shape: "build an outfit for this occasion" and "pull a capsule
 * for this trip" are the same question with a different sentence, and both must
 * answer only with clothes the family actually owns — the edge function checks
 * the ids it returns against the closet it was sent, and this hook checks them
 * again before a screen sees them.
 *
 * When the companion is unavailable — no backend, no allowance, an error — the
 * template in `derive.ts` answers instead and says so. A parent laying out
 * Tuesday evening should never be stopped by somebody else's quota.
 */

const CAPSULE_SIZE = 9;

/** One garment, as the function's closet payload wants it. */
const forAi = (state: WardrobeState, memberId: string) =>
    itemsOf(state, memberId)
        .filter((i) => inUse(i) && !i.inLaundry)
        .slice(0, 80)
        .map((i) => ({ id: i.id, name: i.name, category: CATEGORY[i.category].label, color: COLOUR[i.colour].label, season: SEASON[i.season].label }));

/** The template capsule: the favourites first, then one of everything else. */
function templateCapsule(state: WardrobeState, memberId: string, season: Season): string[] {
    const pool = itemsOf(state, memberId).filter((i) => inUse(i) && (i.season === "all" || season === "all" || i.season === season));
    const seen = new Set<string>();
    const out: string[] = [];
    for (const i of [...pool].sort((a, b) => Number(b.favourite) - Number(a.favourite))) {
        if (out.length >= CAPSULE_SIZE) break;
        const key = `${i.category}:${seen.has(i.category) ? i.colour : ""}`;
        if (seen.has(key)) continue;
        seen.add(key);
        seen.add(i.category);
        out.push(i.id);
    }
    return out;
}

export function useWardrobeAi(state: WardrobeState | undefined) {
    const { ask, busy, available } = useAi();
    const [notice, setNotice] = useState<string | null>(null);

    const propose = useCallback(
        async (memberId: string, occasion: string, weather: string, fallback: () => string[]): Promise<OutfitSuggestion | null> => {
            setNotice(null);
            if (!state) return null;
            const closet = forAi(state, memberId);
            const template = (why: string): OutfitSuggestion => ({ itemIds: fallback(), why, source: "closet" });
            if (!closet.length) {
                setNotice("There is nothing wearable in this closet yet.");
                return null;
            }
            if (!available) return template("Put together from what is in the closet — the companion isn't switched on for this build.");
            try {
                const r = await ask<{ itemIds?: string[]; why?: string }>({ action: "outfit", payload: { occasion, weather, closet } });
                if (r.unavailable) {
                    setNotice(r.unavailable);
                    return template("Put together from the closet while the companion's allowance is used up.");
                }
                const known = new Set(closet.map((c) => c.id));
                const itemIds = (r.data?.itemIds ?? []).filter((id) => known.has(id));
                if (!itemIds.length) return template("Put together from the closet — the companion couldn't pick this time.");
                return { itemIds, why: r.data?.why || r.text, source: "companion" };
            } catch {
                return template("Put together from the closet — the companion couldn't be reached.");
            }
        },
        [ask, available, state],
    );

    /** "Build a Sunday outfit for Ayo from his closet." */
    const suggestForOccasion = useCallback(
        (memberId: string, occasion: Occasion): Promise<OutfitSuggestion | null> =>
            propose(memberId, `${OCCASION[occasion].label} — one outfit, head to toe`, "London, early autumn", () => (state ? suggestOutfit(state, memberId, occasion) : [])),
        [propose, state],
    );

    /** "A capsule for Lagos." */
    const suggestCapsule = useCallback(
        (memberId: string, tripLabel: string, season: Season): Promise<OutfitSuggestion | null> =>
            propose(memberId, `A capsule of about ${CAPSULE_SIZE} pieces to pack for ${tripLabel || "a trip"} — mix and match, one dressy option`, SEASON[season].note, () => (state ? templateCapsule(state, memberId, season) : [])),
        [propose, state],
    );

    return { suggestForOccasion, suggestCapsule, busy, notice, clearNotice: () => setNotice(null) };
}
