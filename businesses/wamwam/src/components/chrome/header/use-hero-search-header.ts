import { useCallback, useEffect, useRef, useState } from "react";
import { useInteractOutside } from "@/hooks/use-interact-outside";
import { usePathname } from "@/lib/nav/navigation";
import type { ListingType } from "@/types/domain";

/**
 * Shared behaviour for the two hero-search headers (Header2 and Header3):
 * the collapsed search pill's label text, and the expand/collapse state that
 * closes on an outside click or a sustained scroll.
 *
 * Both headers render entirely different markup; only this logic was
 * duplicated line-for-line between them.
 */

export interface HeroSearchLabels {
    locationText: string;
    dateText: string;
    guestsText: string;
}

/** The collapsed pill's three labels, per route and active tab. */
export function heroSearchLabels(pathname: string, tab: ListingType): HeroSearchLabels {
    if (pathname.startsWith("/experience-search") && tab === "Experiences") {
        return { locationText: "Experiences in Bali", dateText: "Mar 22 - 27", guestsText: "2 guests" };
    }
    if (pathname.startsWith("/car-search") && tab === "Cars") {
        return { locationText: "Car rentals in Tokyo", dateText: "Mar 25 - 28", guestsText: "Add guests" };
    }
    if (pathname.startsWith("/flight-search") && tab === "Flights") {
        return { locationText: "Flights to Rome", dateText: "Mar 10 - 15", guestsText: "1 guest" };
    }
    if (pathname.startsWith("/stay-search") && tab === "Stays") {
        return { locationText: "Homes in London", dateText: "Mar 20 - 25", guestsText: "1 guest" };
    }
    return { locationText: "Anywhere", dateText: "Any week", guestsText: "Add guests" };
}

/** Collapse once the page has scrolled more than this far since the panel opened. */
const SCROLL_CLOSE_PX = 150;

export function useHeroSearchHeader(tab: ListingType) {
    const headerInnerRef = useRef<HTMLDivElement>(null);
    const [showHeroSearch, setShowHeroSearch] = useState(false);
    const lastScrollY = useRef(0);
    const rafId = useRef<number | null>(null);

    const pathname = usePathname();
    const labels = heroSearchLabels(pathname, tab);

    const closeHeroSearch = useCallback(() => setShowHeroSearch(false), []);
    useInteractOutside(headerInnerRef, closeHeroSearch);

    // Re-baseline the scroll origin whenever the panel opens or closes.
    useEffect(() => {
        lastScrollY.current = window.pageYOffset;
    }, [showHeroSearch]);

    const handleHideSearchForm = useCallback(() => {
        rafId.current = null;
        if (!document.querySelector("#nc-Header-3-anchor")) return;
        const currentScrollY = window.pageYOffset;
        if (Math.abs(lastScrollY.current - currentScrollY) > SCROLL_CLOSE_PX) {
            setShowHeroSearch(false);
            lastScrollY.current = currentScrollY;
        }
    }, []);

    // Coalesce scroll events into one frame: cancel any frame still pending
    // rather than queueing a new callback per event.
    const handleEventScroll = useCallback(() => {
        if (rafId.current !== null) window.cancelAnimationFrame(rafId.current);
        rafId.current = window.requestAnimationFrame(handleHideSearchForm);
    }, [handleHideSearchForm]);

    useEffect(() => {
        window.addEventListener("scroll", handleEventScroll, { passive: true });
        return () => {
            window.removeEventListener("scroll", handleEventScroll);
            if (rafId.current !== null) window.cancelAnimationFrame(rafId.current);
        };
    }, [handleEventScroll]);

    return { headerInnerRef, showHeroSearch, setShowHeroSearch, ...labels };
}
