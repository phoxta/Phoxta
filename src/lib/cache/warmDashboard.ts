// Preloads the whole dashboard right after sign-in so the FIRST click on any nav
// page is instant — both the page's DATA (into the useCachedData cache) and its JS
// CHUNK. It starts immediately (not deferred to requestIdleCallback, which is what
// made the first click still spin), but runs through a small concurrency pool so
// authenticating never fires a parallel stampede on the (multi-tenant) backend.

import { prefetchCachedData } from "@/lib/hooks/useCachedData";
import { ALL_PRELOADERS } from "@/pages/dashboard/preload";
import {
  profileQuery,
  organizationsQuery,
  notificationsQuery,
  aiUsageMonthQuery,
  invitationsQuery,
  marketplaceBlueprintsQuery,
  billingQuery,
  networkQuery,
} from "@/lib/cache/dashboardQueries";

type Task = () => Promise<unknown>;

/**
 * Run tasks with a concurrency cap, starting on the next microtask (so it doesn't
 * wait for the browser to go idle). As each task settles the next is pulled in, so
 * at most `concurrency` requests are ever in flight — a steady stream, not a burst.
 */
function runPool(tasks: Task[], concurrency = 5): void {
  let i = 0;
  const next = (): void => {
    if (i >= tasks.length) return;
    const task = tasks[i++];
    Promise.resolve()
      .then(task)
      .catch(() => {})
      .finally(next);
  };
  for (let n = 0; n < Math.min(concurrency, tasks.length); n++) next();
}

// Guard per user id: re-warm when the signed-in identity changes (its cache was
// cleared), skip on ordinary re-renders.
let warmedFor: string | null | undefined;

/**
 * Preload every top-level dashboard page (data + chunk) for `userId`. Org-scoped
 * ops/agent TAB data still warms when a business console opens (it needs an org id,
 * and warming every business's tabs at login would be the stampede we're avoiding) —
 * but their CHUNKS are warmed here, so opening one never shows a code-load spinner.
 */
export function warmDashboard(userId: string | null): void {
  if (typeof window === "undefined" || warmedFor === userId) return;
  warmedFor = userId;

  // DATA for the eight sidebar pages (ordered: the page you land on + the shell first).
  const data: Task[] = [
    () => prefetchCachedData(profileQuery.key, profileQuery.fetch),
    () => prefetchCachedData(organizationsQuery.key, organizationsQuery.fetch),
    () => prefetchCachedData(notificationsQuery.key, notificationsQuery.fetch),
    () => prefetchCachedData(aiUsageMonthQuery.key, aiUsageMonthQuery.fetch),
    () => prefetchCachedData(invitationsQuery.key, invitationsQuery.fetch),
    () => prefetchCachedData(marketplaceBlueprintsQuery.key, marketplaceBlueprintsQuery.fetch),
    () => prefetchCachedData(billingQuery.key, billingQuery.fetch),
  ];
  if (userId) {
    const q = networkQuery(userId);
    data.push(() => prefetchCachedData(q.key, q.fetch));
  }

  // CHUNKS for every dashboard route (so a first click never hits a Suspense spinner).
  const chunks: Task[] = ALL_PRELOADERS.map((load) => () => load());

  // Data first (so the landing page's content is ready and the next clicks are warm),
  // then the chunks — all throttled together.
  runPool([...data, ...chunks], 5);
}
