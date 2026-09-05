import { useState } from "react";
import { useIsomorphicLayoutEffect } from "./use-isomorphic-layout-effect";

interface UseMediaQueryOptions {
    /** Value to report where there is no window (prerender). */
    defaultValue?: boolean;
    /** Read the media query on first render; set false to start from `defaultValue`. */
    initializeWithValue?: boolean;
}

const IS_SERVER = typeof window === "undefined";

function getMatches(query: string, defaultValue: boolean): boolean {
    if (IS_SERVER) return defaultValue;
    return window.matchMedia(query).matches;
}

/** Tracks whether `query` currently matches, via the matchMedia API. */
export function useMediaQuery(
    query: string,
    { defaultValue = false, initializeWithValue = true }: UseMediaQueryOptions = {},
): boolean {
    const [matches, setMatches] = useState<boolean>(() =>
        initializeWithValue ? getMatches(query, defaultValue) : defaultValue,
    );

    useIsomorphicLayoutEffect(() => {
        const mql = window.matchMedia(query);
        const handleChange = () => setMatches(getMatches(query, defaultValue));

        // Sync on mount and whenever the query changes.
        handleChange();
        mql.addEventListener("change", handleChange);
        return () => mql.removeEventListener("change", handleChange);
    }, [query, defaultValue]);

    return matches;
}
