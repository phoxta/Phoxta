import {
    EMPTY_SNAPSHOT,
    LiveDenied,
    type LiveCaption,
    type LiveChatMessage,
    type LiveParticipant,
    type LiveQuestion,
    type LiveReaction,
    type RoomSnapshot,
    type RoomStatus,
    sortParticipants,
} from "./room";

/** Chat older than this falls off the top; a class is not an archive. */
const CHAT_CAP = 300;
/** How long a thrown emoji stays on screen. */
const REACTION_MS = 6000;
/** How many caption lines stay on screen. A caption bar, not a transcript. */
const CAPTION_LINES = 3;

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
    protected question: LiveQuestion | null = null;
    protected answers: number[] = [];
    protected myAnswer: number | null = null;
    /** identity -> option, so a second answer from the same person replaces the first. */
    protected answerBy = new Map<string, number>();
    protected captions: LiveCaption[] = [];
    protected captionsOn = false;
    protected blurOn = false;

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
                question: this.question,
                answers: this.answers,
                myAnswer: this.myAnswer,
                captions: this.captions,
                captionsOn: this.captionsOn,
                blurOn: this.blurOn,
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

    // ── quiz ─────────────────────────────────────────────────────────────────

    /** Put a question up (or replace the one that was there). */
    protected openQuestion(q: LiveQuestion): void {
        this.question = q;
        this.answers = new Array(q.options.length).fill(0);
        this.answerBy.clear();
        this.myAnswer = null;
        this.commit();
    }

    protected recordAnswer(identity: string, option: number): void {
        const q = this.question;
        if (!q || q.closed || option < 0 || option >= q.options.length) return;
        // One vote each: undo the previous one rather than double-count.
        const prev = this.answerBy.get(identity);
        if (prev === option) return;
        const next = [...this.answers];
        if (prev !== undefined) next[prev] = Math.max(0, next[prev] - 1);
        next[option] += 1;
        this.answerBy.set(identity, option);
        this.answers = next;
        if (identity === this.meId) this.myAnswer = option;
        this.commit();
    }

    protected shutQuestion(answer?: number): void {
        if (!this.question) return;
        this.question = { ...this.question, closed: true, answer: answer ?? this.question.answer };
        this.commit();
    }

    // ── captions ─────────────────────────────────────────────────────────────

    protected pushCaption(c: LiveCaption): void {
        // A partial replaces the speaker's own in-flight line; a final one keeps it.
        const rest = this.captions.filter((x) => !(x.identity === c.identity && !x.final));
        this.captions = [...rest, c].slice(-CAPTION_LINES);
        this.commit();
    }

    protected get isHost(): boolean {
        return this.people.get(this.meId)?.role === "host";
    }

    /** Guard for the host-only half of `LiveRoom`. */
    protected requireHost(what: string): void {
        if (!this.isHost) throw new LiveDenied(what);
    }

    protected teardown(): void {
        this.question = null;
        this.answerBy.clear();
        this.captions = [];
        if (this.reactionTimer) clearTimeout(this.reactionTimer);
        this.reactionTimer = null;
        this.listeners.clear();
        this.people.clear();
        this.commit();
    }
}
