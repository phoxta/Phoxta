import { useCallback, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { scrollToId } from "@/shared/effects/scrollToId";

/**
 * Portfolio navigation.
 *
 * The header and footer menu points at sections of the home page. Those
 * sections only exist there, so on a case study every item used to be a link to
 * nothing: the click was cancelled and the scroll helper returned silently —
 * including on the logo, which left a visitor with no way back (found by the
 * 3 Sep 2026 nav audit). The links are now route-aware: an in-page scroll when
 * the home page is already open, a real navigation to `/#section` when it is
 * not, with the target scrolled into view on arrival (see useHashScroll).
 */

/** Sticky-header clearance for anchor landings. */
export const NAV_OFFSET = 88;

const PORTFOLIO_HOSTS = new Set(["femi.phoxta.com", "femi.localhost"]);

/**
 * Where "home" lives. The portfolio is the whole site on its own host and a
 * section of the marketing site everywhere else (previews, the prerender pass),
 * so a hard-coded "/" would send the preview build to the Phoxta homepage.
 */
export const PORTFOLIO_HOME = (() => {
    try {
        return PORTFOLIO_HOSTS.has(window.location.hostname) ? "/" : "/portfolio";
    } catch {
        return "/";
    }
})();

/** True when the portfolio home page — the one that owns the sections — is open. */
export function useIsPortfolioHome(): boolean {
    const { pathname } = useLocation();
    const p = pathname.replace(/\/+$/, "") || "/";
    return p === "/" || p === "/portfolio";
}

/** A project URL that is correct on both the portfolio host and the /portfolio path. */
export function workPath(slug: string): string {
    return PORTFOLIO_HOME === "/" ? `/work/${slug}` : `${PORTFOLIO_HOME}/work/${slug}`;
}

/** Props for a menu item pointing at a home-page section, from any route. */
export function useSectionLink(id: string, offset = NAV_OFFSET) {
    const isHome = useIsPortfolioHome();
    const onClick = useCallback(
        (e: React.MouseEvent) => {
            // A modified click is a request for a new tab or a copied address.
            if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
            // Off the home page, let the router navigate — useHashScroll finishes the job.
            if (!isHome) return;
            e.preventDefault();
            scrollToId(id, offset);
        },
        [id, offset, isHome],
    );
    return { to: isHome ? `#${id}` : `${PORTFOLIO_HOME}#${id}`, onClick };
}

/**
 * Scrolls to `location.hash` after a route change. ScrollSmoother is recreated
 * on navigation and the target may mount a frame late, so the jump is retried
 * over the first second rather than attempted once.
 */
export function useHashScroll(): void {
    const { hash, pathname } = useLocation();
    useEffect(() => {
        if (!hash) return;
        const id = decodeURIComponent(hash.slice(1));
        let timer = 0;
        let cancelled = false;
        const deadline = Date.now() + 3000;

        // Landing the jump takes more than one call. On a client-side navigation the
        // page mounts, ScrollSmoother is rebuilt and its ScrollTrigger refresh resets
        // the position — often after the first scroll has already run. So the target
        // is re-asserted until it holds, and abandoned the moment the reader scrolls.
        const stop = () => {
            cancelled = true;
            window.clearTimeout(timer);
            window.removeEventListener("wheel", stop);
            window.removeEventListener("touchstart", stop);
            window.removeEventListener("keydown", stop);
        };
        const tick = () => {
            if (cancelled) return;
            const el = document.getElementById(id);
            if (el && Math.abs(el.getBoundingClientRect().top - NAV_OFFSET) > 4) scrollToId(id, NAV_OFFSET);
            if (Date.now() < deadline) timer = window.setTimeout(tick, 150);
            else stop();
        };
        window.addEventListener("wheel", stop, { passive: true });
        window.addEventListener("touchstart", stop, { passive: true });
        window.addEventListener("keydown", stop);
        timer = window.setTimeout(tick, 60);
        return stop;
    }, [hash, pathname]);
}

/**
 * The section currently in view, for `aria-current` and the menu's active state.
 * Off the home page every route is a project, so "work" stays marked — the menu
 * should still say which part of the site you are in.
 */
export function useActiveSection(ids: readonly string[]): string | null {
    const isHome = useIsPortfolioHome();
    const [active, setActive] = useState<string | null>(null);

    useEffect(() => {
        if (!isHome) {
            setActive(null);
            return;
        }
        const sections = ids
            .map((id) => document.getElementById(id))
            .filter((el): el is HTMLElement => !!el);
        if (!sections.length) return;

        // A band just under the header: the section crossing it is the one being read.
        const observer = new IntersectionObserver(
            (entries) => {
                const visible = entries
                    .filter((e) => e.isIntersecting)
                    .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
                if (visible) setActive(visible.target.id);
            },
            { rootMargin: `-${NAV_OFFSET + 20}px 0px -55% 0px`, threshold: [0, 0.25, 0.5] },
        );
        sections.forEach((el) => observer.observe(el));
        return () => observer.disconnect();
    }, [ids, isHome]);

    return isHome ? active : "work";
}
