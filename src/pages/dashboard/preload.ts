// Warm the lazy route chunks for the dashboard so tab navigation is instant
// (no route-level Suspense spinner on first click). Covers the whole dashboard:
// the top-level nav, the operating-console tabs, the AI-agent sub-tabs, and the
// detail/studio screens.
//
// IMPORTANT: each import() specifier must match the one used by lazy() in
// src/App.tsx exactly, so the bundler resolves them to the SAME chunk and these
// calls populate the very cache lazy() reads from.

type Loader = () => Promise<unknown>;

/** Top-level dashboard nav targets, keyed by route path (mirrors DashboardLayout NAV). */
export const DASHBOARD_PRELOADERS: Record<string, Loader> = {
  "/dashboard": () => import("@/pages/dashboard/DashboardHomePage"),
  "/dashboard/studio": () => import("@/pages/dashboard/StudioPage"),
  "/dashboard/marketplace": () => import("@/pages/dashboard/MarketplacePage"),
  "/dashboard/businesses": () => import("@/pages/dashboard/BusinessesPage"),
  "/dashboard/billing": () => import("@/pages/dashboard/BillingPage"),
  "/dashboard/settings": () => import("@/pages/dashboard/SettingsPage"),
};

/** Operating-console tabs, keyed by route segment (mirrors OperatingLayout tabs). */
export const OPS_PRELOADERS: Record<string, Loader> = {
  "": () => import("@/pages/dashboard/ops/OverviewPage"),
  overview: () => import("@/pages/dashboard/ops/OverviewPage"),
  // Engage lands on its Inbox area, so warm both the shell and the landing.
  engage: () => Promise.all([
    import("@/pages/dashboard/ops/engage/EngageLayout"),
    import("@/pages/dashboard/ops/agent/InboxPage"),
  ]),
  operator: () => import("@/pages/dashboard/ops/agent/OperatorPage"),
  crm: () => import("@/pages/dashboard/ops/CrmPage"),
  commerce: () => import("@/pages/dashboard/ops/CommercePage"),
  invoicing: () => import("@/pages/dashboard/ops/InvoicingPage"),
  bookings: () => import("@/pages/dashboard/ops/BookingsPage"),
  reservations: () => import("@/pages/dashboard/ops/ReservationsPage"),
  "help-center": () => import("@/pages/dashboard/ops/HelpCenterPage"),
  designs: () => import("@/pages/dashboard/ops/DesignsPage"),
  dossier: () => import("@/pages/dashboard/ops/DossierPage"),
  settings: () => import("@/pages/dashboard/ops/SettingsPage"),
  // Not tabs anymore, but still routed (redirects/links) — keep chunks warm.
  google: () => import("@/pages/dashboard/ops/google/GoogleWorkspacePage"),
  // Phoxta-only tabs. Warming them for every tenant would download chunks
  // nobody on that console can open, so they are keyed like any other tab and
  // only fetched when the tab is actually there to hover.
  ideas: () => import("@/pages/dashboard/IdeasPage"),
  platform: () => import("@/pages/dashboard/ops/PlatformPage"),
  inbox: () => import("@/pages/dashboard/ops/agent/InboxPage"),
};

/** AI-agent sub-tabs, keyed by route segment (mirrors AgentLayout SUBTABS). */
export const AGENT_PRELOADERS: Record<string, Loader> = {
  "": () => import("@/pages/dashboard/ops/agent/AgentOverviewPage"),
  operator: () => import("@/pages/dashboard/ops/agent/OperatorPage"),
  configure: () => import("@/pages/dashboard/ops/agent/ConfigurePage"),
  // Route still exists (deep links), just no longer a sub-tab.
  knowledge: () => import("@/pages/dashboard/ops/agent/KnowledgePage"),
};

/** Detail / studio screens — warmed in the background (not hover-keyed). */
const EXTRA_PRELOADERS: Loader[] = [
  () => import("@/pages/dashboard/MarketplaceDetailPage"),
  () => import("@/pages/dashboard/BusinessDetailPage"),
  () => import("@/pages/dashboard/StudioEditorPage"),
  () => import("@/pages/dashboard/StudioPreviewPage"),
  () => import("@/pages/dashboard/StudioSiteEditorPage"),
];

/** Every dashboard chunk loader (top-level + ops + agent + detail/studio), deduped. */
export const ALL_PRELOADERS: Loader[] = Array.from(
  new Set<Loader>([
    ...Object.values(DASHBOARD_PRELOADERS),
    ...Object.values(OPS_PRELOADERS),
    ...Object.values(AGENT_PRELOADERS),
    ...EXTRA_PRELOADERS,
  ]),
);

/** Preload one top-level route's chunk (e.g. on nav-link hover). Errors swallowed. */
export function preloadRoute(path: string): void {
  DASHBOARD_PRELOADERS[path]?.().catch(() => {});
}

/** Preload one operating-console tab's chunk (e.g. on tab hover). */
export function preloadOpsTab(seg: string): void {
  OPS_PRELOADERS[seg]?.().catch(() => {});
}

/** Preload one agent sub-tab's chunk (e.g. on tab hover). */
export function preloadAgentTab(seg: string): void {
  AGENT_PRELOADERS[seg]?.().catch(() => {});
}

const idle = (cb: () => void, timeout = 2000): void => {
  const ric = (window as unknown as { requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number }).requestIdleCallback;
  if (ric) ric(cb, { timeout });
  else window.setTimeout(cb, 150);
};

/** Fire a list of loaders a few at a time across idle slices (avoids a burst of
 *  dozens of parallel requests competing with the active page). */
function pump(loaders: Loader[], batch = 3): void {
  let i = 0;
  const step = () => {
    for (let n = 0; n < batch && i < loaders.length; n++, i++) loaders[i]().catch(() => {});
    if (i < loaders.length) idle(step);
  };
  idle(step);
}

/** Preload EVERY dashboard chunk. Call once when the dashboard mounts. */
let warmedAll = false;
export function preloadAllDashboard(): void {
  if (warmedAll || typeof window === "undefined") return;
  warmedAll = true;
  pump([
    ...Object.values(DASHBOARD_PRELOADERS),
    ...Object.values(OPS_PRELOADERS),
    ...Object.values(AGENT_PRELOADERS),
    ...EXTRA_PRELOADERS,
  ]);
}

/** Warm just the operating-console + agent tab chunks. Call when a console mounts,
 *  so deep-linking straight into a business's console still makes its tabs instant. */
let warmedOps = false;
export function preloadOpsConsole(): void {
  if (warmedOps || typeof window === "undefined") return;
  warmedOps = true;
  pump([...Object.values(OPS_PRELOADERS), ...Object.values(AGENT_PRELOADERS)]);
}
