/** Is the element fully inside the current viewport? */
export function isInViewport(element: HTMLElement): boolean {
    const rect = element.getBoundingClientRect();
    return (
        rect.top >= 0 &&
        rect.left >= 0 &&
        rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
        rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    );
}

export interface ObserveInViewOptions {
    target: HTMLElement | null;
    callback: () => void;
    options?: IntersectionObserverInit;
    /** Stop observing after the first intersection. */
    freezeOnceVisible?: boolean;
}

/**
 * Fire `callback` when `target` intersects the viewport. Returns a disposer.
 * Silently no-ops where IntersectionObserver is unavailable.
 */
export function observeInView({
    target,
    callback,
    options = { root: null, rootMargin: "0%", threshold: 0 },
    freezeOnceVisible = false,
}: ObserveInViewOptions): () => void {
    if (!target || typeof window === "undefined" || typeof window.IntersectionObserver === "undefined") {
        return () => {};
    }
    const observer = new IntersectionObserver((entries, obs) => {
        for (const entry of entries) {
            if (!entry.isIntersecting) continue;
            callback();
            if (freezeOnceVisible) obs.unobserve(entry.target);
        }
    }, options);
    observer.observe(target);
    return () => observer.disconnect();
}
