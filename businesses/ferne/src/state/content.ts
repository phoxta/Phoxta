import { useEffect, useState } from "react";
import { useCatalog } from "@/state/catalog";

/**
 * Per-tenant content, once the storefront knows which business it is serving.
 *
 * Returns the bundled fallback until live rows arrive, and KEEPS the fallback
 * when the tenant has none — an empty journal or FAQ section reads as a broken
 * page, and a business that has not written its own copy yet is still a business
 * a prospect is looking at.
 */
export function useOrgContent<T>(fetcher: (orgId: string) => Promise<T>, fallback: T): T {
    const { orgId } = useCatalog();
    const [data, setData] = useState<T>(fallback);

    useEffect(() => {
        if (!orgId) return;
        let active = true;
        fetcher(orgId)
            .then((d) => {
                if (!active) return;
                if (d && (!Array.isArray(d) || d.length > 0)) setData(d);
            })
            .catch(() => {
                /* keep the fallback */
            });
        return () => {
            active = false;
        };
        // The fetcher is a module-level function per call site; re-running on its
        // identity would loop for any caller that passes an inline closure.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [orgId]);

    return data;
}
