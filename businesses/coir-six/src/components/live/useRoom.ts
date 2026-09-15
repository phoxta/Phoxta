import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { EMPTY_SNAPSHOT, type JoinOptions, type LiveRoom, type LiveLesson, type RoomSnapshot } from "@coir-six/core";
import { browserMedia } from "@/lib/media";
import { startBlur } from "@/lib/blur";
import { relayCaptions } from "@/lib/captions";
import { useData } from "@/state/data";

/**
 * The room, as React state.
 *
 * `LiveRoom` is an event emitter with an immutable snapshot, so this is a
 * `useSyncExternalStore` away from being a hook — no polling, no mirrored
 * state, and a 24-tile grid re-renders once per change rather than once per
 * event.
 */
export function useRoomSnapshot(room: LiveRoom | null): RoomSnapshot {
    const subscribe = useCallback((fn: () => void) => room?.subscribe(fn) ?? (() => {}), [room]);
    const get = useCallback(() => room?.snapshot() ?? EMPTY_SNAPSHOT, [room]);
    return useSyncExternalStore(subscribe, get, get);
}

export type Phase = "lobby" | "joining" | "in" | "left";

export interface LiveSession {
    room: LiveRoom | null;
    snap: RoomSnapshot;
    phase: Phase;
    error: string | null;
    media: ReturnType<typeof browserMedia>;
    join(opts: JoinOptions): Promise<void>;
    leave(): Promise<void>;
    /** Demo only: look at the same class the way the mentor running it does. */
    setAsHost(on: boolean): void;
    asHost: boolean;
}

/**
 * Open a classroom and keep it open for the life of the screen.
 *
 * Leaving is the part that matters: a learner who closes the tab must still
 * have their attendance closed out, so `leave()` runs on unmount and on
 * `pagehide` — which fires on mobile Safari where `beforeunload` does not.
 */
export function useLiveRoom(lesson: LiveLesson | null): LiveSession {
    const { repo, catalogue } = useData();
    const media = useMemo(() => browserMedia(), []);
    const [room, setRoom] = useState<LiveRoom | null>(null);
    const [phase, setPhase] = useState<Phase>("lobby");
    const [error, setError] = useState<string | null>(null);
    const [asHost, setAsHost] = useState(false);
    const snap = useRoomSnapshot(room);

    const joinedAt = useRef<number | null>(null);
    const current = useRef<LiveRoom | null>(null);
    const lessonId = lesson?.id ?? null;

    const leave = useCallback(async () => {
        const r = current.current;
        // Nothing was ever joined — there is no class to leave, and saying
        // otherwise would bounce someone out of the lobby they are still in.
        if (!r) return;
        current.current = null;
        setPhase("left");
        media.stopAll();
        await r.disconnect().catch(() => {});
        if (lessonId && joinedAt.current) {
            const seconds = (Date.now() - joinedAt.current) / 1000;
            joinedAt.current = null;
            await repo.leaveLive(lessonId, seconds).catch(() => {});
        }
    }, [lessonId, media, repo]);

    const join = useCallback(
        async (opts: JoinOptions) => {
            if (!lesson || current.current) return;
            setPhase("joining");
            setError(null);
            try {
                const mentor = catalogue.mentors.find((m) => m.id === lesson.mentorId) ?? null;
                const r = await repo.openLiveRoom({
                    lesson,
                    mentor,
                    media,
                    asHost,
                    // Both are the browser's half of a seam core cannot cross:
                    // one needs a WebSocket and a short-lived key, the other a
                    // canvas. The room only ever sees the interface.
                    captions: relayCaptions(() => repo.liveCaptionUrl(lesson.id)),
                    filter: { apply: (t) => startBlur(t as MediaStreamTrack) },
                });
                current.current = r;
                setRoom(r);
                await r.connect(opts);
                joinedAt.current = Date.now();
                setPhase("in");
            } catch (e) {
                current.current = null;
                setRoom(null);
                setPhase("lobby");
                setError(e instanceof Error ? e.message : "We couldn't get you into the class.");
            }
        },
        [asHost, catalogue.mentors, lesson, media, repo],
    );

    // The host ended it, or we were removed: the room closes itself.
    useEffect(() => {
        if (phase === "in" && snap.status === "ended") void leave();
    }, [leave, phase, snap.status]);

    useEffect(() => {
        const bye = () => void leave();
        window.addEventListener("pagehide", bye);
        return () => {
            window.removeEventListener("pagehide", bye);
            void leave();
        };
    }, [leave]);

    return { room, snap, phase, error, media, join, leave, asHost, setAsHost };
}

/** Elapsed class time, ticking once a second — the header clock. */
export function useElapsed(since: string | null): string {
    const [, tick] = useState(0);
    useEffect(() => {
        if (!since) return;
        const t = setInterval(() => tick((n) => n + 1), 1000);
        return () => clearInterval(t);
    }, [since]);
    if (!since) return "";
    const total = Math.max(0, Math.floor((Date.now() - new Date(since).getTime()) / 1000));
    const mm = String(Math.floor(total / 60)).padStart(2, "0");
    const ss = String(total % 60).padStart(2, "0");
    return total >= 3600 ? `${Math.floor(total / 3600)}:${mm}:${ss}` : `${mm}:${ss}`;
}
