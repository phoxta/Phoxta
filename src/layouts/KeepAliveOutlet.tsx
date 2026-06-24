import { Activity, Suspense, useEffect, useLayoutEffect, useRef, type ReactElement, type RefObject } from "react";
import { useLocation, useOutlet } from "react-router-dom";

// Content-area fallback for a page whose lazy chunk isn't ready yet. It lives INSIDE
// the shell, so a not-yet-loaded page never takes down the sidebar/header (the only
// other Suspense boundary is at the app root, which would replace the whole shell).
// With sign-in warming the chunk is usually already resolved, so this rarely shows.
const ContentFallback = () => (
  <div className="d-flex align-items-center justify-content-center" style={{ minHeight: "40vh" }}>
    <div className="spinner-border text-dark" role="status" aria-label="Loading">
      <span className="visually-hidden">Loading…</span>
    </div>
  </div>
);

/**
 * Keep-alive replacement for react-router's <Outlet/>, backed by React 19.2's
 * native <Activity> component.
 *
 * The param-free top-level dashboard pages listed in `keepPaths` are kept MOUNTED
 * after their first visit — hidden via <Activity mode="hidden">, which preserves
 * their React state (open panels, form drafts, filters) AND tears down their
 * effects while off-screen (so they stop polling/subscribing in the background).
 * Revisiting one is instant: no remount, no re-fetch flash.
 *
 * Dynamic / nested routes (businesses/:id, ops/*, agent/*, studio) are NOT kept
 * alive — they render live through the normal outlet and rely on the per-key data
 * cache (useCachedData) to avoid the fresh-load flash. Restricting keep-alive to
 * param-free routes also keeps the captured route match stable.
 *
 * Pages enter the keep-alive tree on FIRST visit (not pre-mounted at login), so we
 * never fan out a burst of fetch effects the moment the dashboard loads.
 */
export default function KeepAliveOutlet({
  keepPaths,
  scrollContainerRef,
}: {
  keepPaths: string[];
  scrollContainerRef: RefObject<HTMLElement | null>;
}) {
  const outlet = useOutlet();
  const { pathname } = useLocation();

  const isKept = keepPaths.includes(pathname);
  const activeKey = isKept ? pathname : null;

  // Cache of mounted kept-alive route elements, keyed by path. We (re)capture the
  // active kept element during render so a freshly-visited page is in the tree on
  // its first frame; the map only ever grows to the size of `keepPaths`.
  const cache = useRef(new Map<string, ReactElement>());
  if (activeKey && outlet) cache.current.set(activeKey, outlet);

  // Persist the scroll position of the (shared) scroll container per kept page, so
  // returning to a page restores where the user was. The container is owned by the
  // layout; non-kept routes reset to the top.
  const scrollPositions = useRef(new Map<string, number>());
  const activeKeyRef = useRef(activeKey);
  activeKeyRef.current = activeKey;

  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const onScroll = () => {
      const key = activeKeyRef.current;
      if (key) scrollPositions.current.set(key, el.scrollTop);
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [scrollContainerRef]);

  useLayoutEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    el.scrollTop = activeKey ? scrollPositions.current.get(activeKey) ?? 0 : 0;
    // Re-run on every navigation.
  }, [pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      {/* Live render for non-kept (dynamic/nested) routes. */}
      {!isKept && <Suspense fallback={<ContentFallback />}>{outlet}</Suspense>}
      {/* Kept pages stay mounted; only the active one is visible. Each has its own
          Suspense so a cold chunk shows the fallback in the content slot only — the
          shell stays put, and an already-loaded hidden page isn't disturbed. */}
      {Array.from(cache.current.entries()).map(([key, element]) => (
        <Activity key={key} mode={key === activeKey ? "visible" : "hidden"}>
          <Suspense fallback={<ContentFallback />}>{element}</Suspense>
        </Activity>
      ))}
    </>
  );
}
