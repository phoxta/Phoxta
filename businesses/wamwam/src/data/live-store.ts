import type { ListingsByVertical } from "@/types/listings";
import type { BlogPost, ListingReview } from "@/types/content";
import type { Vertical } from "@/types/domain";

/**
 * The tenant's live catalogue and content, hydrated once at boot by
 * <LiveListings> and read synchronously by the data getters.
 *
 * This is deliberately plain module state rather than React context:
 * getOrgId() and getProfile() are called from event handlers and async
 * callbacks (booking, contact, booking lookup) where hooks are illegal, and
 * the synchronous getters in src/data/listings are what let every card and
 * page stay a simple function of its inputs.
 *
 * Writers are only the hydration layer. Readers get the stored reference; the
 * public data getters copy before returning so callers cannot corrupt it.
 */

export interface BusinessHours {
    day: string;
    open?: string;
    close?: string;
    closed?: boolean;
}

export interface BusinessProfile {
    address?: string;
    phone?: string;
    email?: string;
    mapQuery?: string;
    hours?: BusinessHours[];
}

export interface LiveContent {
    blog?: BlogPost[];
    reviews?: ListingReview[];
}

interface LiveState {
    listings: Partial<ListingsByVertical>;
    content: LiveContent;
    orgId: string | null;
    profile: BusinessProfile | null;
    /** True once hydration has settled, with or without a tenant. */
    hydrated: boolean;
}

const initial = (): LiveState => ({ listings: {}, content: {}, orgId: null, profile: null, hydrated: false });

let state: LiveState = initial();

/* ---- writers (hydration only) ---- */

export function setLiveListings(partial: Partial<ListingsByVertical>): void {
    state.listings = { ...state.listings, ...partial };
}

export function setLiveContent(partial: LiveContent): void {
    state.content = { ...state.content, ...partial };
}

export function setOrgId(id: string | null): void {
    state.orgId = id;
}

export function setProfile(profile: BusinessProfile | null): void {
    state.profile = profile;
}

export function markHydrated(): void {
    state.hydrated = true;
}

/** Test/debug helper: forget everything. */
export function resetLive(): void {
    state = initial();
}

/* ---- readers ---- */

export function getLiveListings<V extends Vertical>(vertical: V): ListingsByVertical[V] | null {
    return (state.listings[vertical] as ListingsByVertical[V] | undefined) ?? null;
}

export function getLiveContent<K extends keyof LiveContent>(key: K): NonNullable<LiveContent[K]> | null {
    return (state.content[key] as NonNullable<LiveContent[K]> | undefined) ?? null;
}

export function getOrgId(): string | null {
    return state.orgId;
}

export function getProfile(): BusinessProfile | null {
    return state.profile;
}

export function isHydrated(): boolean {
    return state.hydrated;
}
