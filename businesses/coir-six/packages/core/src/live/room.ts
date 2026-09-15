import type { Hue } from "../format";
import type { LiveLesson, Mentor } from "../types";

/**
 * A live classroom, behind one interface.
 *
 * The same contract as `Repo`, for the same reason: the classroom screen is
 * written once and runs against whatever is actually available.
 *
 *   `LivekitRoom`   real audio/video over the school's SFU
 *   `PresenceRoom`  no peer media — real people, chat, hands and reactions over
 *                   Supabase Realtime, with the mentor's stream on the stage
 *   `DemoRoom`      scripted classmates, so "Explore as Jason" shows the room
 *
 * Nothing above this file imports a WebRTC SDK, and nothing in this folder
 * touches the DOM — `attach()` is handed an element by whichever app is
 * rendering (a `<video>` on the web, a `<VideoView>` on a phone).
 */

export type LiveRole = "host" | "speaker" | "learner";

export type RoomStatus =
    | "idle"
    | "connecting"
    | "connected"
    | "reconnecting"
    /** The host ended the class, or we left on purpose. */
    | "ended"
    | "failed";

/** What a tile can show. `audio` never renders — it is attached to play sound. */
export type TrackSource = "camera" | "screen" | "audio";

export interface LiveParticipant {
    /** Stable across a reconnect: the learner's user id (or a demo id). */
    identity: string;
    name: string;
    hue: Hue;
    photoUrl?: string;
    role: LiveRole;
    isLocal: boolean;
    /** Publishing audio and not muted. */
    mic: boolean;
    camera: boolean;
    screen: boolean;
    speaking: boolean;
    handUp: boolean;
    /** On stage — allowed to turn a camera on at all. See `LiveRoom.setStage`. */
    canPublish: boolean;
    joinedAt: string;
    connection: "good" | "poor" | "lost";
}

export interface LiveChatMessage {
    id: string;
    identity: string;
    name: string;
    hue: Hue;
    photoUrl?: string;
    body: string;
    createdAt: string;
    mine: boolean;
}

/** A thrown emoji. Transient — `RoomSnapshot.reactions` drops it after a few seconds. */
export interface LiveReaction {
    id: string;
    identity: string;
    name: string;
    emoji: string;
    /** `Date.now()` when it landed, so the UI can fade it out. */
    at: number;
}

/**
 * A question the mentor has put on screen.
 *
 * `answer` is stripped for everyone but the host until the question closes —
 * the correct index must not travel to a learner's browser while they are still
 * answering, or the quiz is decorative.
 */
export interface LiveQuestion {
    id: string;
    prompt: string;
    options: string[];
    /** Host only while open; broadcast to everyone once closed. */
    answer?: number;
    closed: boolean;
    askedAt: string;
}

/** What a class came to, written after the fact from the transcript and chat. */
export interface LiveRecap {
    summary: string;
    keyPoints: string[];
    questions: string[];
    actions: string[];
}

/** One line of speech, from whoever was talking. */
export interface LiveCaption {
    id: string;
    identity: string;
    name: string;
    text: string;
    /** Deepgram sends partials before it commits; only final lines are kept. */
    final: boolean;
    at: number;
}

export interface RoomSnapshot {
    status: RoomStatus;
    /** Set when `status` is `"failed"`; a sentence to show the learner. */
    error: string | null;
    /** Host first, then speakers, then everyone else by name. Includes you. */
    participants: LiveParticipant[];
    chat: LiveChatMessage[];
    reactions: LiveReaction[];
    me: LiveParticipant | null;
    /** Your own pin. Local only — nobody else sees it. */
    pinned: string | null;
    /** The host's spotlight. Everyone sees it. */
    spotlit: string | null;
    recording: boolean;
    startedAt: string | null;
    /**
     * The stage when there is no peer video to show (`PresenceRoom`): the
     * mentor's own stream, as a URL to embed.
     */
    embedUrl: string | null;
    /**
     * Whether this room can actually carry your camera and microphone. False in
     * `PresenceRoom`, where the class is on the mentor's own stream and Coir Six
     * supplies only the room around it — the UI hides the media controls rather
     * than offering buttons that do nothing.
     */
    media: boolean;
    /** The question on screen, if the mentor has put one up. */
    question: LiveQuestion | null;
    /** Tally by option index. The host sees it live; learners see it once closed. */
    answers: number[];
    /** What you picked, so the UI can lock your choice. */
    myAnswer: number | null;
    /** The last few lines of speech. Rolling — this is a caption bar, not a log. */
    captions: LiveCaption[];
    /** Whether YOU are transcribing your own microphone. */
    captionsOn: boolean;
    /** Whether YOUR camera is going out blurred. */
    blurOn: boolean;
}

export const EMPTY_SNAPSHOT: RoomSnapshot = {
    status: "idle",
    error: null,
    participants: [],
    chat: [],
    reactions: [],
    me: null,
    pinned: null,
    spotlit: null,
    recording: false,
    startedAt: null,
    embedUrl: null,
    media: false,
    question: null,
    answers: [],
    myAnswer: null,
    captions: [],
    captionsOn: false,
    blurOn: false,
};

export interface JoinOptions {
    /** Start with the camera on. Ignored when you are not on stage. */
    camera?: boolean;
    mic?: boolean;
    audioInput?: string;
    videoInput?: string;
}

/** Thrown when a learner calls a host-only method. The UI hides those anyway. */
export class LiveDenied extends Error {
    constructor(what: string) {
        super(`Only the host can ${what}.`);
        this.name = "LiveDenied";
    }
}

/**
 * The host actions a WebRTC client is not allowed to perform on its own.
 *
 * Muting someone else, changing their permissions, removing them and closing
 * the room are all server-API calls — the media server will not take them from
 * a browser, and it should not: the API secret is what authorises them. So they
 * go back through the edge function, which re-checks that the caller really is
 * this class's host before it acts.
 */
export interface LiveHostOps {
    /** `trackSid` names the publication to silence; the media server needs it. */
    mute(identity: string, trackSid?: string): Promise<void>;
    setStage(identity: string, onStage: boolean): Promise<void>;
    remove(identity: string): Promise<void>;
    end(): Promise<void>;
}

/** Everything a room needs to know before it can be built. */
export interface LiveContext {
    lesson: LiveLesson;
    mentor: Mentor | null;
    me: { id: string; name: string; hue: Hue; photoUrl?: string };
    /** Resolved by the token endpoint for a real room; the demo decides locally. */
    isHost: boolean;
    media?: LocalMedia;
    hostOps?: LiveHostOps;
    /**
     * Speech-to-text for the local microphone, supplied by the app because it
     * needs a browser WebSocket and a short-lived key. Absent = no captions.
     */
    captions?: CaptionSource;
    filter?: VideoFilter;
    /** Persist what was said, so a class leaves a transcript behind. */
    onTranscript?: (line: { id: string; text: string; at: string }) => void;
}

/**
 * Wraps the camera track in an effect (background blur) and hands back a
 * replacement to publish. Injected, like `media` and `captions`, because the
 * effect needs a canvas and core has no DOM.
 */
export interface VideoFilter {
    apply(track: unknown): Promise<{ track: unknown; stop(): void }>;
}

/** Streams the local microphone to a transcriber and calls back with lines. */
export interface CaptionSource {
    start(onLine: (text: string, final: boolean) => void): Promise<void>;
    stop(): void;
}

export interface MediaDeviceOption {
    deviceId: string;
    label: string;
    kind: "audioinput" | "videoinput";
}

/**
 * The learner's own camera and microphone, which only the app that is rendering
 * can reach. The web supplies a `getUserMedia` implementation, a phone supplies
 * its own; core never calls a browser API itself.
 *
 * It exists for two jobs: the pre-join lobby, which needs a preview before any
 * room is connected, and the rooms that carry no peer media of their own.
 */
export interface LocalMedia {
    enable(source: "camera" | "screen", deviceId?: string): Promise<void>;
    disable(source: "camera" | "screen"): void;
    attach(source: "camera" | "screen", el: unknown): () => void;
    devices(): Promise<MediaDeviceOption[]>;
    /** Current microphone loudness, 0–1, for the lobby meter. */
    level(): number;
    stopAll(): void;
}

export interface LiveRoom {
    readonly kind: "livekit" | "presence" | "demo";

    connect(opts?: JoinOptions): Promise<void>;
    disconnect(): Promise<void>;
    /** Returns an unsubscribe. `snapshot()` is stable between calls to this. */
    subscribe(fn: () => void): () => void;
    snapshot(): RoomSnapshot;

    /**
     * Bind a participant's track to a rendering element. Returns a teardown.
     * The web's path: it hands the room a `<video>`/`<audio>` to fill.
     */
    attach(identity: string, source: TrackSource, el: unknown): () => void;
    /**
     * The underlying track object, for renderers that take the track rather
     * than an element — React Native has no `<video>`, so its tile passes this
     * straight to `<VideoTrack>`. `unknown` because core must not name a
     * WebRTC type.
     */
    trackOf(identity: string, source: TrackSource): unknown | null;
    /**
     * Whether there is really a track to render.
     *
     * `camera: true` only says the person turned their camera on; the track can
     * still be seconds away (subscription lag), or absent entirely in a room
     * that carries no media. A tile asks this so it shows the avatar instead of
     * an empty black rectangle.
     */
    hasTrack(identity: string, source: TrackSource): boolean;

    setMic(on: boolean): Promise<void>;
    setCamera(on: boolean): Promise<void>;
    setScreenShare(on: boolean): Promise<void>;
    switchDevice(kind: "audioinput" | "videoinput", deviceId: string): Promise<void>;

    sendChat(body: string): Promise<void>;
    raiseHand(up: boolean): Promise<void>;
    react(emoji: string): Promise<void>;
    /** Local only, and synchronous — pinning is a view preference, not a message. */
    pin(identity: string | null): void;

    // ── Host only. Each throws `LiveDenied` when you are not the host. ────────
    muteParticipant(identity: string): Promise<void>;
    /** Grant or revoke the right to publish video — "come up to the front". */
    setStage(identity: string, onStage: boolean): Promise<void>;
    /** Put someone on everyone's stage. `null` clears it. */
    spotlight(identity: string | null): Promise<void>;
    removeParticipant(identity: string): Promise<void>;
    setRecording(on: boolean): Promise<void>;
    endClass(): Promise<void>;
    /** Put a question on everyone's screen. */
    ask(prompt: string, options: string[], answer: number): Promise<void>;
    /** Reveal the answer and stop taking responses. */
    closeQuestion(): Promise<void>;

    // ── anyone ───────────────────────────────────────────────────────────────
    /** Answer the question on screen. One shot; ignored once you have answered. */
    answer(optionIndex: number): Promise<void>;
    /**
     * Transcribe YOUR OWN microphone and broadcast the lines to the room.
     *
     * Deliberately per-speaker rather than a server-side bot listening to the
     * mix: the browser already holds the microphone, so this needs no extra
     * process in the room, and each line arrives already attributed to whoever
     * said it instead of needing diarisation.
     */
    setCaptions(on: boolean): Promise<void>;
    /** Blur what is behind you. No-op where no filter was supplied. */
    setBlur(on: boolean): Promise<void>;
}

// ---------------------------------------------------------------------------

/** How many people may have a camera on at once. Past this a class is a crowd. */
export const STAGE_LIMIT = 9;

/** The strip of emoji in the room header. */
export const REACTIONS = ["👏", "🎉", "😂", "❤️", "🤔", "👍"] as const;

const ROLE_RANK: Record<LiveRole, number> = { host: 0, speaker: 1, learner: 2 };

/**
 * You first, then the host, then speakers, then everyone else by name.
 *
 * You go first because a truncated roster that has dropped you is disorienting —
 * "am I even in this class?" — and because it is the row whose microphone and
 * camera you most need to see.
 */
export function sortParticipants(list: LiveParticipant[]): LiveParticipant[] {
    return [...list].sort(
        (a, b) =>
            Number(b.isLocal) - Number(a.isLocal) ||
            ROLE_RANK[a.role] - ROLE_RANK[b.role] ||
            a.name.localeCompare(b.name),
    );
}

/**
 * Who belongs on the big tile. Your own pin wins over the host's spotlight —
 * if you deliberately pinned someone, nothing should yank the view away.
 */
export function stageOf(snap: RoomSnapshot): LiveParticipant | null {
    const find = (id: string | null) => (id ? snap.participants.find((p) => p.identity === id) ?? null : null);
    return (
        find(snap.pinned) ??
        find(snap.spotlit) ??
        snap.participants.find((p) => p.screen) ??
        snap.participants.find((p) => p.speaking && !p.isLocal) ??
        snap.participants.find((p) => p.role === "host") ??
        snap.participants[0] ??
        null
    );
}

/** The filmstrip: everyone who isn't already on the big tile. */
export function filmstripOf(snap: RoomSnapshot): LiveParticipant[] {
    const stage = stageOf(snap);
    return snap.participants.filter((p) => p.identity !== stage?.identity);
}

/** Chat grouped into runs by the same author, the way the design stacks bubbles. */
export function groupChat(chat: LiveChatMessage[]): LiveChatMessage[][] {
    const out: LiveChatMessage[][] = [];
    for (const m of chat) {
        const last = out[out.length - 1];
        if (last && last[0].identity === m.identity) last.push(m);
        else out.push([m]);
    }
    return out;
}

/** "24 peoples" in the design; correct English, and correct at 1. */
export const peopleLabel = (n: number): string => `${n} ${n === 1 ? "person" : "people"}`;
