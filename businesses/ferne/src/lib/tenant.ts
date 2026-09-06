import { resolveTenantUncached, type Tenant } from "@/lib/phoxta";

/**
 * Single-flight, success-only memo of the tenant lookup.
 *
 * Several independent callers (catalogue hydration, live-edit, the in-store
 * advisor and the account page) each want the tenant on boot. They share one
 * promise rather than firing four `app_resolve_domain` round trips. Only a
 * RESOLVED tenant is cached: caching a failure would leave the advisor keyless
 * for the whole session and swap every reply for the canned fallback.
 */

let inflight: Promise<Tenant | null> | null = null;
let resolved: Tenant | null = null;

export function resolveTenant(): Promise<Tenant | null> {
    if (resolved) return Promise.resolve(resolved);
    if (inflight) return inflight;
    inflight = resolveTenantUncached()
        .then((t) => {
            if (t) resolved = t;
            return t;
        })
        .finally(() => {
            inflight = null;
        });
    return inflight;
}

/** Synchronous peek at the resolved tenant, if any. */
export function getResolvedTenant(): Tenant | null {
    return resolved;
}
