import { useEffect, useState } from "react";
import { useCatalog } from "@/util/catalog";

// Fetches per-tenant content once the storefront has resolved its org. Returns the
// fallback until live data arrives (and keeps it if the tenant has none).
export function useOrgContent<T>(fetcher: (orgId: string) => Promise<T>, fallback: T): T {
  const { orgId } = useCatalog();
  const [data, setData] = useState<T>(fallback);
  useEffect(() => {
    if (!orgId) return;
    let active = true;
    fetcher(orgId)
      .then((d) => {
        if (!active) return;
        if (d && (!Array.isArray(d) || (d as unknown[]).length > 0)) setData(d);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [orgId]);
  return data;
}
