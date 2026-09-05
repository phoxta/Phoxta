import { resolveTenantUncached, type Tenant } from "@/integration/phoxta";

/**
 * Single-flight, success-only memo of the tenant lookup.
 *
 * Four independent callers (catalogue hydration, live-edit, the assistant and
 * the account page) each used to fire their own `app_resolve_domain` round
 * trip on boot. They now share one promise. Only a resolved tenant is cached:
 * caching a failure would leave the assistant keyless for the whole session
 * and swap every reply for the fallback string.
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

/** Test helper. */
export function resetTenantCache(): void {
    inflight = null;
    resolved = null;
}
