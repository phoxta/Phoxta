import { useCallback, useMemo } from "react";
import {
    useLocation,
    useNavigate,
    useParams as rrUseParams,
    useSearchParams as rrUseSearchParams,
} from "react-router-dom";

/**
 * Navigation hooks with a stable, small surface. Components take a `router`
 * object rather than a bare navigate function because fourteen of them call
 * `router.prefetch()` or `router.refresh()` from effects; both are no-ops in
 * an SPA but must exist.
 */

export function usePathname(): string {
    return useLocation().pathname;
}

export interface AppRouter {
    push: (href: string) => void;
    replace: (href: string) => void;
    back: () => void;
    forward: () => void;
    /** No-op: routes are code-split by Vite and fetched on demand. */
    prefetch: (href?: string) => void;
    /** No-op: there is no server render to refresh. */
    refresh: () => void;
}

const noop = () => {};

export function useRouter(): AppRouter {
    const navigate = useNavigate();
    const push = useCallback((href: string) => navigate(href), [navigate]);
    const replace = useCallback((href: string) => navigate(href, { replace: true }), [navigate]);
    const back = useCallback(() => navigate(-1), [navigate]);
    const forward = useCallback(() => navigate(1), [navigate]);
    return useMemo(
        () => ({ push, replace, back, forward, prefetch: noop, refresh: noop }),
        [push, replace, back, forward],
    );
}

export function useSearchParams(): URLSearchParams {
    const [sp] = rrUseSearchParams();
    return sp;
}

export function useParams<T extends Record<string, string | undefined> = Record<string, string | undefined>>(): T {
    return rrUseParams() as T;
}

/** A hard navigation, used only for legacy redirect() call sites. */
export function redirect(href: string): never {
    window.location.assign(href);
    throw new Error("redirect");
}
export const permanentRedirect = redirect;

/** Sentinel error recognised by the route error boundary as a 404. */
export const NOT_FOUND = "WAMWAM_NOT_FOUND";

export function notFound(): never {
    throw new Error(NOT_FOUND);
}

export function isNotFoundError(error: unknown): boolean {
    return error instanceof Error && error.message === NOT_FOUND;
}
