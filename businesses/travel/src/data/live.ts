// Runtime cache of the live, per-tenant catalogue, keyed by vertical. The
// LiveListings provider fetches the tenant's products once (before any page
// renders) and populates this; the synchronous getXListings() in listings.ts
// then return live data instead of the bundled demo arrays. Plain module state
// (no React) so the template's sync data functions can read it unchanged.

export type Vertical = "stay" | "car" | "experience" | "flight";
export type BusinessProfile = {
  address?: string; phone?: string; email?: string; mapQuery?: string;
  hours?: { day: string; open?: string; close?: string; closed?: boolean }[];
};

let CACHE: Partial<Record<Vertical, any[]>> = {};
let CONTENT: { blog?: any[]; reviews?: any[] } = {};
let ORG_ID: string | null = null;
let PROFILE: BusinessProfile | null = null;

export function setLiveListings(partial: Partial<Record<Vertical, any[]>>) {
  CACHE = { ...CACHE, ...partial };
}
export function getLiveListings(v: Vertical): any[] | null {
  return CACHE[v] ?? null;
}
export function setLiveContent(partial: { blog?: any[]; reviews?: any[] }) {
  CONTENT = { ...CONTENT, ...partial };
}
export function getLiveContent(k: "blog" | "reviews"): any[] | null {
  return CONTENT[k] ?? null;
}
export function setOrgId(id: string | null) {
  ORG_ID = id;
}
export function getOrgId(): string | null {
  return ORG_ID;
}
export function setProfile(p: BusinessProfile | null) {
  PROFILE = p;
}
export function getProfile(): BusinessProfile | null {
  return PROFILE;
}
