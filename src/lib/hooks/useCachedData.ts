import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Tiny stale-while-revalidate cache for dashboard data.
 *
 * Dashboard tabs are separate routes, so react-router unmounts/remounts each
 * page on navigation — which re-runs its fetch and flashes a loading state every
 * visit. This hook keeps the last result in a module-level cache keyed by `key`,
 * so revisiting a tab renders the cached data INSTANTLY (loading=false) while it
 * quietly revalidates in the background. First-ever visit still shows loading.
 *
 * Usage:
 *   const { data, loading, error, reload } = useCachedData("businesses", async () => {
 *     const { data, error } = await listMyOrganizations();
 *     if (error) throw new Error(error);
 *     return data;
 *   });
 * Call `reload()` after a mutation to refresh the cache + UI.
 */
const store = new Map<string, unknown>();

/** Drop a cached entry (or everything) — e.g. on sign-out. */
export function clearCachedData(key?: string): void {
  if (key) store.delete(key);
  else store.clear();
}

export function useCachedData<T>(key: string, fetcher: () => Promise<T>) {
  const [data, setData] = useState<T | undefined>(() => store.get(key) as T | undefined);
  const [loading, setLoading] = useState<boolean>(() => !store.has(key));
  const [error, setError] = useState<string | null>(null);

  // Keep the latest fetcher without making it a dependency (callers usually pass
  // a fresh closure each render).
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const reload = useCallback(async (): Promise<T | undefined> => {
    try {
      const result = await fetcherRef.current();
      store.set(key, result);
      setData(result);
      setError(null);
      return result;
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      return undefined;
    } finally {
      setLoading(false);
    }
  }, [key]);

  useEffect(() => {
    // Re-sync to the cache for this key (handles key changes), then revalidate.
    setData(store.get(key) as T | undefined);
    setLoading(!store.has(key));
    setError(null);
    void reload();
  }, [key, reload]);

  return { data, loading, error, reload, setData };
}
