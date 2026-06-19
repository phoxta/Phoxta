import { useEffect, useState } from "react";
import { useFleet } from "@/util/fleet";

// Fetches per-tenant content once the storefront has resolved its org (by host).
// Returns the fallback (bundled demo content) until live data arrives, and keeps
// the fallback if the tenant has none — so pages always render.
export function useOrgContent<T>(fetcher: (orgId: string) => Promise<T>, fallback: T): T {
  const { orgId } = useFleet();
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
