import type { TravelState } from "./types";

/**
 * AC 8 — the packing list works on a plane.
 *
 * The one screen in this module that is used with no signal is the packing
 * list: you are standing over a suitcase in a hallway, or in a departure
 * lounge, and the answer to "did I pack the adapters" has to be there. So:
 *
 *   READ   the last loaded slice is mirrored into localStorage, and the live
 *          repo falls back to that mirror when the network fails. The demo
 *          reads its own store, which is local anyway.
 *   WRITE  a tick made offline is applied immediately AND appended to a queue.
 *          When the browser comes back, `flush` replays the queue in order and
 *          drops what it managed to save. Nothing is lost and nothing is
 *          silently wrong: the screen says how many changes are still waiting.
 *
 * The queue is intentionally tiny and typed to one operation. A packing tick is
 * idempotent and last-write-wins, so replaying it needs no conflict rules; any
 * richer write is simply refused while offline, with a plain message.
 */

const QUEUE_KEY = "wafe:travel:queue:v1";
const CACHE_PREFIX = "wafe:travel:cache";

export interface QueuedTick {
    itemId: string;
    checked: boolean;
    at: string;
}

const read = <T,>(key: string, fallback: T): T => {
    try {
        const raw = localStorage.getItem(key);
        return raw ? (JSON.parse(raw) as T) : fallback;
    } catch {
        return fallback;
    }
};

const write = (key: string, value: unknown): void => {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch {
        /* private mode, or a full quota: the app still works, it just forgets */
    }
};

export const isOffline = (): boolean => typeof navigator !== "undefined" && navigator.onLine === false;

export function queued(): QueuedTick[] {
    const list = read<QueuedTick[]>(QUEUE_KEY, []);
    return Array.isArray(list) ? list.filter((q) => q && typeof q.itemId === "string") : [];
}

export const queueSize = (): number => queued().length;

/** Record a tick that could not reach the server. Later ticks replace earlier ones. */
export function enqueue(tick: QueuedTick): void {
    const list = queued().filter((q) => q.itemId !== tick.itemId);
    list.push(tick);
    write(QUEUE_KEY, list.slice(-500));
}

export function dequeue(itemIds: string[]): void {
    const drop = new Set(itemIds);
    write(
        QUEUE_KEY,
        queued().filter((q) => !drop.has(q.itemId)),
    );
}

export const clearQueue = (): void => write(QUEUE_KEY, []);

/**
 * Replay everything waiting, oldest first, and drop what saved. A failure
 * leaves the rest of the queue alone — the next reconnection tries again.
 */
export async function flush(save: (tick: QueuedTick) => Promise<void>): Promise<number> {
    const list = queued().sort((a, b) => a.at.localeCompare(b.at));
    const done: string[] = [];
    for (const tick of list) {
        try {
            await save(tick);
            done.push(tick.itemId);
        } catch {
            break;
        }
    }
    if (done.length) dequeue(done);
    return done.length;
}

/** Apply the pending ticks to a freshly loaded slice, so the screen never flickers backwards. */
export function applyQueue(state: TravelState): TravelState {
    const list = queued();
    if (!list.length) return state;
    const map = new Map(list.map((q) => [q.itemId, q.checked]));
    return { ...state, packItems: state.packItems.map((p) => (map.has(p.id) ? { ...p, checked: map.get(p.id)! } : p)) };
}

// ---------------------------------------------------------------------------
// The read mirror
// ---------------------------------------------------------------------------

const cacheKey = (spaceId: string, memberId: string): string => `${CACHE_PREFIX}:${spaceId}:${memberId}`;

export function cacheState(spaceId: string, memberId: string, state: TravelState): void {
    write(cacheKey(spaceId, memberId), { at: new Date().toISOString(), state });
}

export function cachedState(spaceId: string, memberId: string): TravelState | null {
    const hit = read<{ at: string; state: TravelState } | null>(cacheKey(spaceId, memberId), null);
    return hit?.state && Array.isArray(hit.state.trips) ? hit.state : null;
}

/** Tell the screen when the browser comes back, so it can retry and say so. */
export function onReconnect(fn: () => void): () => void {
    if (typeof window === "undefined") return () => {};
    window.addEventListener("online", fn);
    return () => window.removeEventListener("online", fn);
}
