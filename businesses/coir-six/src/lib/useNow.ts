import { useEffect, useState } from "react";

/**
 * A clock that ticks only as often as the thing it drives needs.
 *
 * Anything that decides "is a class on right now?" has to re-evaluate on its
 * own: a class opening while the tab is already sitting there should make the
 * banner and the nav badge appear, not wait for a navigation.
 */
export function useNow(everyMs: number): Date {
    const [now, setNow] = useState(() => new Date());
    useEffect(() => {
        const t = setInterval(() => setNow(new Date()), everyMs);
        return () => clearInterval(t);
    }, [everyMs]);
    return now;
}
