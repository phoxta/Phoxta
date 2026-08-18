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
 * The same module-level store powers `prefetchCachedData` (warm the cache without
 * mounting a component) so the dashboard can pre-load tabs on idle. A shared
 * in-flight map dedupes concurrent fetches (warm + mount hitting the same key),
 * and a per-key subscriber set propagates a background revalidate to every mounted
 * consumer of that key.
 *
 * Usage:
 *   const { data, loading, error, reload } = useCachedData("businesses", async () => {
 *     const { data, error } = await listMyOrganizations();
 *     if (error) throw new Error(error);
 *     return data;
 *   });
 * Call `reload()` after a mutation to force-refresh the cache + UI.
 */

type Opts = {
  /** Skip background revalidation while the cached entry is younger than `ttl` ms. */
  ttl?: number;
};

const store = new Map<string, unknown>();
const stamps = new Map<string, number>();
const inflight = new Map<string, Promise<unknown>>();
const generation = new Map<string, number>();
const subscribers = new Map<string, Set<() => void>>();

function notify(key: string): void {
  subscribers.get(key)?.forEach((cb) => cb());
}

function subscribe(key: string, cb: () => void): () => void {
  let set = subscribers.get(key);
  if (!set) {
    set = new Set();
    subscribers.set(key, set);
  }
  set.add(cb);
  return () => {
    set!.delete(cb);
    if (set!.size === 0) subscribers.delete(key);
  };
}

function isFresh(key: string, ttl?: number): boolean {
  if (!ttl || !store.has(key)) return false;
  return Date.now() - (stamps.get(key) ?? 0) < ttl;
}

/**
 * Fetch + cache one key, deduping concurrent callers. Resolves to the value.
 * - `ttl`: when set and the entry is still fresh, returns the cached value without
 *   hitting the network.
 * - `force`: bypass both freshness AND in-flight reuse (used by `reload()` after a
 *   mutation, where the prior in-flight result may pre-date the write).
 */
function revalidate<T>(key: string, fetcher: () => Promise<T>, ttl?: number, force = false): Promise<T> {
  if (!force) {
    if (isFresh(key, ttl)) return Promise.resolve(store.get(key) as T);
    const existing = inflight.get(key);
    if (existing) return existing as Promise<T>;
  }
  const myGen = (generation.get(key) ?? 0) + 1;
  generation.set(key, myGen);
  const p = (async () => {
    try {
      const result = await fetcher();
      // Only publish if a newer fetch hasn't superseded this one. Without this
      // guard a slow pre-mutation request could resolve AFTER a forced reload()
      // and overwrite the fresh post-mutation data with stale data — the caller
      // still gets its own result, but the shared cache stays correct.
      if (generation.get(key) === myGen) {
        store.set(key, result);
        stamps.set(key, Date.now());
        notify(key);
      }
      return result;
    } finally {
      // Only clear if no newer fetch (e.g. a forced reload) has superseded this one.
      if (generation.get(key) === myGen) inflight.delete(key);
    }
  })();
  inflight.set(key, p);
  return p;
}

/** Warm the cache for `key` without a component (e.g. preloading). Errors swallowed.
 *  Returns the in-flight promise so callers can throttle a batch of prefetches. */
export function prefetchCachedData<T>(key: string, fetcher: () => Promise<T>, opts: Opts = {}): Promise<void> {
  return revalidate(key, fetcher, opts.ttl).then(
    () => {},
    () => {},
  );
}

/** Drop a cached entry (or everything) — e.g. on sign-out.
 *
 *  Bumps the generation for each cleared key so any in-flight fetch started
 *  under the previous identity can no longer publish its result, and notifies
 *  subscribers so mounted components drop the data they already rendered.
 *  Without both, a sign-out → sign-in could briefly show the previous user's
 *  data: clearing the store alone leaves it in each component's local state. */
function invalidate(key: string): void {
  store.delete(key);
  stamps.delete(key);
  inflight.delete(key);
  // Bump rather than delete: revalidate() compares against this to decide
  // whether it may still write, so it must keep moving forward.
  generation.set(key, (generation.get(key) ?? 0) + 1);
  notify(key);
}

export function clearCachedData(key?: string): void {
  if (key) {
    invalidate(key);
  } else {
    for (const k of [...store.keys(), ...inflight.keys()]) invalidate(k);
  }
}

export function useCachedData<T>(key: string, fetcher: () => Promise<T>, opts: Opts = {}) {
  const { ttl } = opts;
  const [data, setLocalData] = useState<T | undefined>(() => store.get(key) as T | undefined);
  const [loading, setLoading] = useState<boolean>(() => !store.has(key));
  const [error, setError] = useState<string | null>(null);

  // Keep the latest fetcher without making it a dependency (callers usually pass
  // a fresh closure each render).
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const reload = useCallback(async (): Promise<T | undefined> => {
    setError(null);
    try {
      // force=true: ignore ttl + in-flight so a post-mutation refresh always re-fetches.
      const result = await revalidate<T>(key, () => fetcherRef.current(), undefined, true);
      return result;
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      return undefined;
    } finally {
      setLoading(false);
    }
  }, [key]);

  // Write-through setter for optimistic updates: mutates the cache AND notifies all
  // consumers, so an in-place edit (e.g. an optimistic row change) stays coherent
  // with the cached value a later revisit will read.
  const setData = useCallback(
    (value: T | undefined | ((prev: T | undefined) => T | undefined)) => {
      const prev = store.get(key) as T | undefined;
      const next = typeof value === "function" ? (value as (p: T | undefined) => T | undefined)(prev) : value;
      store.set(key, next);
      stamps.set(key, Date.now());
      notify(key);
    },
    [key],
  );

  useEffect(() => {
    // Propagate background revalidations (incl. ones triggered by other consumers
    // or by prefetch) to this component.
    const unsub = subscribe(key, () => {
      setLocalData(store.get(key) as T | undefined);
      // A clear (e.g. sign-out) notifies with the entry gone — fall back to the
      // loading state rather than rendering the now-dropped data.
      setLoading(!store.has(key));
    });

    // Re-sync to the cache for this key (handles key changes), then revalidate.
    setLocalData(store.get(key) as T | undefined);
    setLoading(!store.has(key));
    setError(null);
    revalidate<T>(key, () => fetcherRef.current(), ttl)
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false));

    return unsub;
  }, [key, ttl]);

  return { data, loading, error, reload, setData };
}
