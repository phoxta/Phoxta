// Warm the lazy route chunks for the dashboard so tab navigation is instant
// (no route-level Suspense spinner on first click).
//
// IMPORTANT: each import() specifier must match the one used by lazy() in
// src/App.tsx exactly, so the bundler resolves them to the SAME chunk and these
// calls populate the very cache lazy() reads from.

type Loader = () => Promise<unknown>;

/** Top-level dashboard nav targets, keyed by route path (mirrors DashboardLayout NAV). */
export const DASHBOARD_PRELOADERS: Record<string, Loader> = {
  "/dashboard": () => import("@/pages/dashboard/DashboardHomePage"),
  "/dashboard/assistant": () => import("@/pages/dashboard/AssistantPage"),
  "/dashboard/studio": () => import("@/pages/dashboard/StudioPage"),
  "/dashboard/marketplace": () => import("@/pages/dashboard/MarketplacePage"),
  "/dashboard/businesses": () => import("@/pages/dashboard/BusinessesPage"),
  "/dashboard/billing": () => import("@/pages/dashboard/BillingPage"),
  "/dashboard/network": () => import("@/pages/dashboard/NetworkPage"),
  "/dashboard/settings": () => import("@/pages/dashboard/SettingsPage"),
};

/** Preload one route's chunk (e.g. on link hover). Errors are swallowed. */
export function preloadRoute(path: string): void {
  DASHBOARD_PRELOADERS[path]?.().catch(() => {});
}

/** Preload every top-level dashboard chunk. Call once the dashboard mounts. */
export function preloadAllDashboard(): void {
  for (const load of Object.values(DASHBOARD_PRELOADERS)) load().catch(() => {});
}
