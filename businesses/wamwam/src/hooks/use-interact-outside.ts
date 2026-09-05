import { useEffect, type RefObject } from "react";

type HandledEvent = MouseEvent | TouchEvent | KeyboardEvent;
type Handler = (event: HandledEvent) => void;

const EVENT_TYPES: Array<keyof DocumentEventMap> = ["mousedown", "touchstart", "keydown"];

/**
 * Calls `handler` on a pointer-down outside every given ref, or on Escape
 * anywhere. Listeners are re-bound when `refs` or `handler` change identity,
 * so callers should memoise both.
 */
export function useInteractOutside(
    refs: RefObject<HTMLElement | null> | RefObject<HTMLElement | null>[],
    handler: Handler,
): void {
    useEffect(() => {
        const listener = (event: Event) => {
            const e = event as HandledEvent;

            if (e instanceof KeyboardEvent) {
                if (e.key === "Escape") handler(e);
                return;
            }

            const refList = Array.isArray(refs) ? refs : [refs];
            const target = e.target as Node;
            const isInside = refList.some((ref) => ref.current?.contains(target));

            if (!isInside) handler(e);
        };

        for (const type of EVENT_TYPES) document.addEventListener(type, listener);
        return () => {
            for (const type of EVENT_TYPES) document.removeEventListener(type, listener);
        };
    }, [refs, handler]);
}
