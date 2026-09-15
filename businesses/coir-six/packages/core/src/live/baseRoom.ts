import {
    EMPTY_SNAPSHOT,
    LiveDenied,
    type LiveChatMessage,
    type LiveParticipant,
    type LiveReaction,
    type RoomSnapshot,
    type RoomStatus,
    sortParticipants,
} from "./room";

/** Chat older than this falls off the top; a class is not an archive. */
const CHAT_CAP = 300;
/** How long a thrown emoji stays on screen. */
const REACTION_MS = 6000;

let seq = 0;
export const liveId = (prefix: string): string => `${prefix}-${Date.now().toString(36)}-${(seq++).toString(36)}`;

/**
 * The bookkeeping every room implementation needs: a listener set, an immutable
 * snapshot the UI can subscribe to with `useSyncExternalStore`, and the
 * participant/chat/reaction state itself.
 *
 * The snapshot is rebuilt only in `commit()`, so its identity is stable between
 * changes — without that, `useSyncExternalStore` re-renders forever.
 */
export abstract class BaseRoom {
    abstract readonly kind: "livekit" | "presence" | "demo";

    protected people = new Map<string, LiveParticipant>();
    protected chat: LiveChatMessage[] = [];
    protected reactions: LiveReaction[] = [];
    protected status: RoomStatus = "idle";
    protected error: string | null = null;
    protected pinned: string | null = null;
    protected spotlit: string | null = null;
    protected recording = false;
    protected startedAt: string | null = null;
    protected embedUrl: string | null = null;
    /** Overridden to false by rooms that carry no peer media. */
    protected media = true;
    /** The local participant's identity. */
    protected meId = "";

    private listeners = new Set<() => void>();
    private snap: RoomSnapshot = EMPTY_SNAPSHOT;
    private dirty = true;
    private reactionTimer: ReturnType<typeof setTimeout> | null = null;

    subscribe(fn: () => void): () => void {
        this.listeners.add(fn);
        return () => {
            this.listeners.delete(fn);
        };
    }

    snapshot(): RoomSnapshot {
        if (this.dirty) {
            const participants = sortParticipants([...this.people.values()]);
            this.snap = {
                status: this.status,
                error: this.error,
                participants,
                chat: this.chat,
                reactions: this.reactions,
                me: participants.find((p) => p.identity === this.meId) ?? null,
                pinned: this.pinned,
                spotlit: this.spotlit,
                recording: this.recording,
                startedAt: this.startedAt,
                embedUrl: this.embedUrl,
                media: this.media,
            };
            this.dirty = false;
        }
        return this.snap;
    }

    /** Mark the snapshot stale and tell React. Cheap to call repeatedly. */
    protected commit(): void {
        this.dirty = true;
        for (const fn of this.listeners) fn();
    }

    pin(identity: string | null): void {
        this.pinned = this.pinned === identity ? null : identity;
        this.commit();
    }

    // ── state helpers for subclasses ──────────────────────────────────────────

    protected setStatus(status: RoomStatus, error: string | null = null): void {
        this.status = status;
        this.error = error;
        if (status === "connected" && !this.startedAt) this.startedAt = new Date().toISOString();
        this.commit();
    }

    protected upsert(p: LiveParticipant): void {
        this.people.set(p.identity, p);
        this.commit();
    }

    protected patch(identity: string, patch: Partial<LiveParticipant>): void {
        const cur = this.people.get(identity);
        if (!cur) return;
        this.people.set(identity, { ...cur, ...patch });
        this.commit();
    }

    protected remove(identity: string): void {
        if (!this.people.delete(identity)) return;
        if (this.pinned === identity) this.pinned = null;
        if (this.spotlit === identity) this.spotlit = null;
        this.commit();
    }

    protected pushChat(m: LiveChatMessage): void {
        // Our own messages come back over the wire on some transports; the id is
        // generated once by the sender, so this drops the echo.
        if (this.chat.some((x) => x.id === m.id)) return;
        this.chat = [...this.chat, m].slice(-CHAT_CAP);
        this.commit();
    }

    protected pushReaction(r: LiveReaction): void {
        this.reactions = [...this.reactions, r];
        this.commit();
        this.sweepReactions();
    }

    private sweepReactions(): void {
        if (this.reactionTimer) return;
        this.reactionTimer = setTimeout(() => {
            this.reactionTimer = null;
            const cutoff = Date.now() - REACTION_MS;
            const kept = this.reactions.filter((r) => r.at > cutoff);
            if (kept.length !== this.reactions.length) {
                this.reactions = kept;
                this.commit();
            }
            if (kept.length) this.sweepReactions();
        }, REACTION_MS / 2);
    }

    protected get isHost(): boolean {
        return this.people.get(this.meId)?.role === "host";
    }

    /** Guard for the host-only half of `LiveRoom`. */
    protected requireHost(what: string): void {
        if (!this.isHost) throw new LiveDenied(what);
    }

    protected teardown(): void {
        if (this.reactionTimer) clearTimeout(this.reactionTimer);
        this.reactionTimer = null;
        this.listeners.clear();
        this.people.clear();
        this.commit();
    }
}
