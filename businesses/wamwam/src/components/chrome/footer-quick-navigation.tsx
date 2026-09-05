import { Bars3Icon, HeartIcon, HomeIcon, UserCircleIcon } from "@heroicons/react/24/outline";
import clsx from "clsx";
import { useCallback, useEffect, useRef, type RefObject } from "react";
import { useIntersection } from "react-use";
import AppLink from "@/lib/nav/link";
import { usePathname } from "@/lib/nav/navigation";
import { useAside } from "@/components/chrome/aside";

const FOOTER_QUICK_NAV = [
    { name: 'Home', link: '/', icon: HomeIcon },
    { name: 'Wishlists', link: '/account-savelists', icon: HeartIcon },
    { name: 'Account', link: '/authors/john-doe', icon: UserCircleIcon },
    { name: 'Menu', icon: Bars3Icon },
];

const SCROLL_THRESHOLD = 80;

/**
 * The mobile bottom bar. It hides on scroll-down and reappears on scroll-up.
 *
 * The show/hide is done by toggling a class directly rather than through
 * React state, and that is deliberate: the toggle feeds back into the
 * IntersectionObserver ratio this component reads, and the loop only settles
 * because it resolves synchronously inside the animation frame. Under state it
 * would resolve after a commit and the thresholds would fire at different
 * scroll offsets.
 */
export default function FooterQuickNavigation() {
    const containerRef = useRef<HTMLDivElement>(null);
    const rafId = useRef<number | null>(null);
    const lastScrollY = useRef(0);
    const pathname = usePathname();
    const { open: openAside } = useAside();
    const intersection = useIntersection(containerRef as RefObject<HTMLDivElement>, {
        root: null,
        rootMargin: "0px",
        threshold: 1,
    });
    const isInViewport = intersection !== null && intersection.intersectionRatio >= 1;

    useEffect(() => {
        lastScrollY.current = window.pageYOffset;
    }, [isInViewport]);

    const showHideNavMenu = useCallback(() => {
        rafId.current = null;
        if (!containerRef.current) return;

        const searchPageShowMapBtn = document.getElementById("search-page-show-map-btn");
        const currentScrollPos = window.pageYOffset;

        if (currentScrollPos > lastScrollY.current) {
            if (isInViewport && currentScrollPos - lastScrollY.current < SCROLL_THRESHOLD) return;
            containerRef.current.classList.add("translate-y-[calc(100%+1.5rem)]");
            searchPageShowMapBtn?.classList.add("translate-y-15");
        } else {
            if (!isInViewport && lastScrollY.current - currentScrollPos < SCROLL_THRESHOLD) return;
            containerRef.current.classList.remove("translate-y-[calc(100%+1.5rem)]");
            searchPageShowMapBtn?.classList.remove("translate-y-15");
        }
        lastScrollY.current = currentScrollPos;
    }, [isInViewport]);

    // Coalesce scroll events into one frame; cancel any frame still pending.
    const handleEventScroll = useCallback(() => {
        if (rafId.current !== null) window.cancelAnimationFrame(rafId.current);
        rafId.current = window.requestAnimationFrame(showHideNavMenu);
    }, [showHideNavMenu]);

    useEffect(() => {
        window.addEventListener("scroll", handleEventScroll, { passive: true });
        return () => {
            window.removeEventListener("scroll", handleEventScroll);
            if (rafId.current !== null) window.cancelAnimationFrame(rafId.current);
        };
    }, [handleEventScroll]);

    return (
        <div
            ref={containerRef}
            className="fixed inset-x-0 bottom-0 z-30 flex items-center gap-6 bg-white/90 px-2.5 py-4 shadow ring-1 shadow-slate-200/80 ring-slate-900/5 backdrop-blur-sm transition-transform lg:hidden dark:bg-neutral-950/90"
        >
            <div className="mx-auto flex w-full max-w-lg justify-around text-center">
                {FOOTER_QUICK_NAV.map((item) => {
                    const isActive = pathname === item.link;
                    return item.link ? (
                        <AppLink
                            key={item.name}
                            href={item.link}
                            tabIndex={0}
                            role="menuitem"
                            aria-label={`Navigate to ${item.name}`}
                            className={clsx(
                                '-mx-2 flex flex-col items-center justify-between px-2 text-muted-foreground',
                                isActive && 'text-primary'
                            )}
                        >
                            <item.icon className="size-6" />
                            <p className="text-xs/6">{item.name}</p>
                        </AppLink>
                    ) : (
                        <div
                            key={item.name}
                            role="menuitem"
                            tabIndex={0}
                            aria-label={`Open menu`}
                            className={clsx(
                                '-mx-2 flex cursor-pointer flex-col items-center justify-between px-2 text-muted-foreground',
                                isActive && 'text-primary'
                            )}
                            onClick={() => {
                                if (item.name === "Menu") openAside("sidebar-navigation");
                            }}
                            onKeyDown={(e) => {
                                if ((e.key === "Enter" || e.key === " ") && item.name === "Menu") {
                                    e.preventDefault();
                                    openAside("sidebar-navigation");
                                }
                            }}
                        >
                            <item.icon className="size-6" />
                            <p className="text-xs/6">{item.name}</p>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
