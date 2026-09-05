import { useEffect, useRef } from "react";

interface AppearEffectOptions {
    threshold?: number;
    rootMargin?: string;
    once?: boolean;
    effectClasses?: string[];
}

/**
 * Adds `effectClasses` to the referenced element when it scrolls into view
 * (and removes them again when it leaves, unless `once`).
 */
export function useAppearEffect<T extends HTMLElement>({
    threshold = 0.2,
    rootMargin = "0px",
    once = true,
    effectClasses = ["opacity-100"],
}: AppearEffectOptions = {}) {
    const ref = useRef<T | null>(null);

    // The default array is a new reference on every render; keying the effect
    // on its joined string keeps one observer alive instead of churning it.
    const classKey = effectClasses.join(" ");

    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const classes = classKey.split(" ").filter(Boolean);

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    el.classList.add(...classes);
                    if (once) observer.unobserve(el);
                } else if (!once) {
                    el.classList.remove(...classes);
                }
            },
            { threshold, rootMargin },
        );

        observer.observe(el);
        return () => observer.disconnect();
    }, [threshold, rootMargin, once, classKey]);

    return ref;
}
