import { Suspense, lazy, type ComponentType } from "react";
import { BrowserRouter, Navigate, Outlet, Route, Routes, useLocation } from "react-router-dom";
import type { Area } from "@/data/core";
import { MODULES } from "@/modules";
import { AuthProvider, useAuth } from "@/state/auth";
import { DataProvider, useData } from "@/state/data";
import { SpaceProvider, useSpace } from "@/state/space";
import { TenantProvider } from "@/state/tenant";
import { ToastProvider } from "@/state/toast";
import { AppShell } from "@/components/shell/AppShell";
import { Skeleton } from "@/components/ui/primitives";
import { Sprig } from "@/components/brand";
import { ForgotPage, LoginPage, OnboardingPage, SignupPage } from "@/pages/AuthPages";

const AreaPage = lazy(() => import("@/pages/AreaPage"));
const SearchPage = lazy(() => import("@/pages/SearchPage"));
const NotFoundPage = lazy(() => import("@/pages/NotFoundPage"));

const AREAS: Area[] = ["grow", "execute", "live", "create", "family"];

// Lazy components are created once per route at module scope — never inside a
// render — or React would remount the page on every state change.
const ROUTES = MODULES.map((m) => ({
    mod: m,
    routes: m.routes.map((r) => ({ path: r.path, C: lazy(r.lazy) as ComponentType })),
}));

function Splash() {
    return (
        <div className="grid min-h-dvh place-items-center bg-page" role="status" aria-label="Loading">
            <span className="grid size-12 place-items-center rounded-full bg-brand">
                <Sprig className="w-6 animate-[cs-spin-slow_6s_linear_infinite] text-white" />
            </span>
        </div>
    );
}

function PageFallback() {
    return (
        <div className="flex flex-col gap-4" aria-busy="true">
            <Skeleton className="h-9 w-64" />
            <Skeleton className="h-36" />
            <Skeleton className="h-64" />
        </div>
    );
}

/** Signed out → the auth screens. Signed in with no family yet → onboarding. */
function Gate() {
    const { ready, session, demo } = useAuth();
    const sp = useSpace();
    const { pathname } = useLocation();
    if (!ready) return <Splash />;
    if (!session && !demo) return <Navigate to="/login" replace state={{ from: pathname }} />;
    if (sp.noSpace) return pathname === "/onboarding" ? <Outlet /> : <Navigate to="/onboarding" replace />;
    if (!sp.ready) return <Splash />;
    return <Outlet />;
}

function Loaded() {
    const { loading } = useData();
    if (loading) return <Splash />;
    return <Outlet />;
}

function Public() {
    const { ready, session, demo } = useAuth();
    if (!ready) return <Splash />;
    if (session || demo) return <Navigate to="/" replace />;
    return <Outlet />;
}

export default function App() {
    return (
        <ToastProvider>
            <TenantProvider>
                <AuthProvider>
                    <SpaceProvider>
                        <DataProvider>
                            <BrowserRouter>
                                <Routes>
                                    <Route element={<Public />}>
                                        <Route path="/login" element={<LoginPage />} />
                                        <Route path="/signup" element={<SignupPage />} />
                                        <Route path="/forgot" element={<ForgotPage />} />
                                    </Route>
                                    <Route element={<Gate />}>
                                        <Route path="/onboarding" element={<OnboardingPage />} />
                                        <Route element={<Loaded />}>
                                            <Route element={<AppShell />}>
                                                <Route
                                                    element={
                                                        <Suspense fallback={<PageFallback />}>
                                                            <Outlet />
                                                        </Suspense>
                                                    }
                                                >
                                                    {ROUTES.map(({ mod, routes }) =>
                                                        mod.path === "/" ? (
                                                            routes.map((r) => <Route key={`${mod.id}:${r.path}`} index={r.path === ""} path={r.path === "" ? undefined : r.path} element={<r.C />} />)
                                                        ) : (
                                                            <Route key={mod.id} path={mod.path.replace(/^\//, "")}>
                                                                {routes.map((r) => (
                                                                    <Route key={`${mod.id}:${r.path}`} index={r.path === ""} path={r.path === "" ? undefined : r.path} element={<r.C />} />
                                                                ))}
                                                            </Route>
                                                        ),
                                                    )}
                                                    {AREAS.map((a) => (
                                                        <Route key={a} path={a} element={<AreaPage area={a} />} />
                                                    ))}
                                                    <Route path="search" element={<SearchPage />} />
                                                    <Route path="*" element={<NotFoundPage />} />
                                                </Route>
                                            </Route>
                                        </Route>
                                    </Route>
                                </Routes>
                            </BrowserRouter>
                        </DataProvider>
                    </SpaceProvider>
                </AuthProvider>
            </TenantProvider>
        </ToastProvider>
    );
}
