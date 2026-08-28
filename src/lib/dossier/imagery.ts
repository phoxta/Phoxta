/**
 * Photographs for the Playbook.
 *
 * Generated sections already store a Pexels search against the section's own
 * subject (see supabase/functions/_shared/stock.ts). These are the floor under
 * that search: curated Pexels stills, keyed by section and — for the slides
 * that are about the trade itself — by the business's words, so a restaurant
 * playbook does not open on a clothing rail.
 *
 * IDs were picked by looking at the photograph, not by checking that the URL
 * resolves. A 200 says the file exists, not that it shows what the key claims.
 */

import { subjectOf } from "@/lib/ideas/imagery";
import type { DossierTab } from "@/lib/dossier/sections";

export function pexelsPhoto(id: number, w = 900, h = 620): string {
  return `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=${w}&h=${h}&fit=crop`;
}

/** One still per Playbook tab, used when the trade does not name a subject. */
const BY_SECTION: Record<DossierTab, number[]> = {
  industry: [380769, 416405, 3184291],
  competition: [1884581, 3184339, 5632402],
  strategy: [3184296, 3182781, 3184416],
  gtm: [3184360, 3184418, 3183198],
  pricing: [4386321, 4968630, 5632398],
  financials: [6801648, 7567434, 265087],
  operations: [3184465, 3183150, 3182773],
  supply: [4483610, 4246120, 3962294],
  risk: [6693655, 3182759, 380769],
  legal: [5668473, 6077326, 8112199],
};

/**
 * Trades that have a photograph of the trade itself, not of "business".
 * Only used on industry / operations / supply — the sections that are about
 * the shop floor rather than the analysis of it.
 */
const BY_TRADE: Record<string, number[]> = {
  dining: [262978, 941861, 67468],
  coffee: [302899, 264636, 302902],
  bakery: [205961, 1070850, 1775043],
  fashion: [1884581, 1884584, 3965545],
  shop: [264636, 1884581, 1488463],
  warehouse: [4483610, 4481259, 3962294],
  delivery: [4393426, 4246120, 4391470],
  vehicle: [3802510, 1707820, 1545743],
  travel: [346885, 2166553, 1371360],
  hotel: [258154, 271624, 261102],
  fitness: [1552242, 1954524, 841130],
  salon: [3993449, 3992874, 3738339],
  interior: [1571460, 1350789, 1571458],
  studio: [3184465, 3183150, 1181467],
  office: [3184291, 3184360, 3183197],
  money: [4386321, 4968630, 6801648],
};

const TRADE_SECTIONS: DossierTab[] = ["industry", "operations", "supply"];

/**
 * A Pexels still for a Playbook surface.
 *
 * `variant` spreads the choice so two neighbouring sections that land on the
 * same subject are not the same picture. It indexes rather than randomises,
 * so a slide shows the same image on every render.
 */
export function playbookImage(
  section: DossierTab,
  seed: string,
  variant = 0,
  w = 900,
  h = 620,
): string {
  const subject = subjectOf(seed);
  const trade = TRADE_SECTIONS.includes(section) ? BY_TRADE[subject] : undefined;
  const set = trade && trade.length > 0 ? trade : BY_SECTION[section];
  const id = set[Math.abs(variant) % set.length];
  return pexelsPhoto(id, w, h);
}

/** Cover stills for the document cards — one photograph per deliverable. */
export const DOCUMENT_PHOTOS: Record<string, number> = {
  plan: 3184291,
  industry: 380769,
  competition: 1884581,
  strategy: 3184296,
  gtm: 3184360,
  pricing: 4386321,
  financials: 6801648,
  operations: 3184465,
  supply: 4483610,
  risk: 6693655,
  legal: 5668473,
};

export function documentImage(kind: string, w = 640, h = 360): string {
  return pexelsPhoto(DOCUMENT_PHOTOS[kind] ?? 3184291, w, h);
}
