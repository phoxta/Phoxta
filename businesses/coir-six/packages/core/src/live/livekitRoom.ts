import type { Participant, RemoteParticipant, Room } from "livekit-client";
import type { Hue } from "../format";
import { BaseRoom, liveId } from "./baseRoom";
import {
    type JoinOptions,
    type LiveContext,
    type LiveParticipant,
    type LiveRole,
    type LiveRoom,
    STAGE_LIMIT,
    type TrackSource,
} from "./room";

/**
 * The real classroom, over the school's own media server.
 *
 * `livekit-client` is loaded with a dynamic `import()` and nothing else in the
 * app references it, so it lands in its own chunk and a learner who never opens
 * a class never downloads a WebRTC SDK — the same trick `YouTubePlayer` uses for
 * the YouTube iframe API.
 *
 * What rides where:
 *   tracks              the media server
 *   chat, reactions     data channel (reliable), mirrored to `cs_live_chat`
 *   raised hand, role   participant attributes, so a late arrival sees them
 *   spotlight, recorder the host re-announces on every join
 *   mute, stage, kick   `ctx.hostOps` → the edge function → the server API
 */

type Wire =
    | { t: "chat"; id: string; body: string; at: string }
    | { t: "reaction"; id: string; emoji: string }
    | { t: "room"; spotlit: string | null; recording: boolean }
    // `answer` is omitted while the question is open — see LiveQuestion.
    | { t: "quiz"; id: string; prompt: string; options: string[]; at: string }
    | { t: "answer"; option: number }
    | { t: "quizclose"; answer: number }
    | { t: "caption"; id: string; text: string; final: boolean };

type Meta = { name?: string; hue?: Hue; photoUrl?: string; role?: LiveRole };

/** The module, fetched once. Mirrors `loadApi()` in the YouTube player. */
let sdk: Promise<typeof import("livekit-client")> | null = null;
const loadSdk = (): Promise<typeof import("livekit-client")> => (sdk ??= import("livekit-client"));

const enc = new TextEncoder();
const dec = new TextDecoder();

export class LivekitRoom extends BaseRoom implements LiveRoom {
    readonly kind = "livekit" as const;

    private ctx: LiveContext;
    private url: string;
    private token: string;
    private room: Room | null = null;
    private lk: typeof import("livekit-client") | null = null;
    /** Chat persistence, injected so this file never imports Supabase. */
    private persist: ((m: { id: string; body: string; at: string }) => void) | undefined;
    /** The filtered camera currently standing in for the raw one. */
    private filtered: { track: unknown; stop(): void } | null = null;

    constructor(ctx: LiveContext, url: string, token: string, persist?: (m: { id: string; body: string; at: string }) => void) {
        super();
        this.ctx = ctx;
        this.url = url;
        this.token = token;
        this.persist = persist;
        this.meId = ctx.me.id;
        this.embedUrl = null;
    }

    async connect(opts: JoinOptions = {}): Promise<void> {
        this.setStatus("connecting");
        try {
            const lk = (this.lk = await loadSdk());
            const room = new lk.Room({
                // Only send what each viewer's tile is actually big enough to use.
                // Without these a 24-person class sends full resolution to every
                // thumbnail, which is most of the bandwidth for none of the value.
                adaptiveStream: true,
                dynacast: true,
                videoCaptureDefaults: {
                    resolution: lk.VideoPresets.h720.resolution,
                    deviceId: opts.videoInput,
                },
                audioCaptureDefaults: { deviceId: opts.audioInput, echoCancellation: true, noiseSuppression: true },
                publishDefaults: { simulcast: true, videoSimulcastLayers: [lk.VideoPresets.h180, lk.VideoPresets.h360] },
            });
            this.room = room;
            this.wire(room, lk);

            await room.connect(this.url, this.token);
            this.syncAll();
            this.setStatus("connected");

            if (opts.mic) await this.setMic(true);
            if (opts.camera) await this.setCamera(true);
            await room.localParticipant.setAttributes({ handUp: "0" });
        } catch (err) {
            const why = message(err);
            this.setStatus("failed", why);
            // Rethrow. The screen awaits connect() before it swaps the lobby for
            // the room, so swallowing this would drop the learner into an empty
            // classroom with no explanation; thrown, they stay in the lobby with
            // the reason and a button to try again.
            throw new Error(why);
        }
    }

    async disconnect(): Promise<void> {
        this.ctx.captions?.stop();
        this.filtered?.stop();
        this.filtered = null;
        await this.room?.disconnect().catch(() => {});
        this.room = null;
        this.setStatus("ended");
        this.teardown();
    }

    // ── events ───────────────────────────────────────────────────────────────

    private wire(room: Room, lk: typeof import("livekit-client")): void {
        const E = lk.RoomEvent;
        const resync = () => this.syncAll();

        room.on(E.ParticipantConnected, (p: RemoteParticipant) => {
            this.syncOne(p);
            // A late arrival has no way to know what the host already set, so the
            // host tells them. Only the host answers, so this stays one message.
            if (this.isHost) void this.publish({ t: "room", spotlit: this.spotlit, recording: this.recording });
        });
        room.on(E.ParticipantDisconnected, (p: RemoteParticipant) => this.remove(p.identity));
        room.on(E.TrackSubscribed, resync);
        room.on(E.TrackUnsubscribed, resync);
        room.on(E.TrackPublished, resync);
        room.on(E.TrackUnpublished, resync);
        room.on(E.TrackMuted, resync);
        room.on(E.TrackUnmuted, resync);
        room.on(E.LocalTrackPublished, resync);
        room.on(E.LocalTrackUnpublished, resync);
        room.on(E.ParticipantAttributesChanged, resync);
        room.on(E.ParticipantMetadataChanged, resync);
        room.on(E.ParticipantPermissionsChanged, resync);

        room.on(E.ActiveSpeakersChanged, (speakers: Participant[]) => {
            const loud = new Set(speakers.map((s) => s.identity));
            for (const [id, p] of this.people) {
                const now = loud.has(id);
                if (p.speaking !== now) this.people.set(id, { ...p, speaking: now });
            }
            this.commit();
        });

        room.on(E.ConnectionQualityChanged, (quality, p: Participant) => {
            this.patch(p.identity, {
                connection: quality === lk.ConnectionQuality.Poor || quality === lk.ConnectionQuality.Lost ? "poor" : "good",
            });
        });

        room.on(E.DataReceived, (payload: Uint8Array, from?: RemoteParticipant) => {
            if (!from) return;
            try {
                this.onWire(JSON.parse(dec.decode(payload)) as Wire, from);
            } catch {
                /* a malformed packet is not worth breaking the class over */
            }
        });

        room.on(E.Reconnecting, () => this.setStatus("reconnecting"));
        room.on(E.Reconnected, () => {
            this.setStatus("connected");
            this.syncAll();
        });
        room.on(E.Disconnected, () => {
            if (this.status !== "ended") this.setStatus("ended");
        });
    }

    private onWire(msg: Wire, from: Participant): void {
        const meta = readMeta(from);
        switch (msg.t) {
            case "chat":
                this.pushChat({
                    id: msg.id,
                    identity: from.identity,
                    name: meta.name ?? from.name ?? "Someone",
                    hue: meta.hue ?? "lilac",
                    photoUrl: meta.photoUrl,
                    body: msg.body,
                    createdAt: msg.at,
                    mine: from.identity === this.meId,
                });
                break;
            case "reaction":
                this.pushReaction({ id: msg.id, identity: from.identity, name: meta.name ?? "Someone", emoji: msg.emoji, at: Date.now() });
                break;
            case "room":
                // Room-level state is the host's to set; ignore it from anyone else.
                if (meta.role !== "host") return;
                this.spotlit = msg.spotlit;
                this.recording = msg.recording;
                this.commit();
                break;
            case "quiz":
                if (meta.role !== "host") return;
                this.openQuestion({ id: msg.id, prompt: msg.prompt, options: msg.options, closed: false, askedAt: msg.at });
                break;
            case "answer":
                // Everyone tallies locally off the same packets, so the bars
                // agree without a server counting them.
                this.recordAnswer(from.identity, msg.option);
                break;
            case "quizclose":
                if (meta.role !== "host") return;
                this.shutQuestion(msg.answer);
                break;
            case "caption":
                this.pushCaption({
                    id: msg.id,
                    identity: from.identity,
                    name: meta.name ?? from.name ?? "Someone",
                    text: msg.text,
                    final: msg.final,
                    at: Date.now(),
                });
                break;
        }
    }

    // ── mapping LiveKit's model onto ours ────────────────────────────────────

    private syncAll(): void {
        const room = this.room;
        if (!room) return;
        const all: Participant[] = [room.localParticipant, ...room.remoteParticipants.values()];
        const seen = new Set(all.map((p) => p.identity));
        for (const p of all) this.syncOne(p, false);
        for (const id of [...this.people.keys()]) if (!seen.has(id)) this.people.delete(id);
        this.commit();
    }

    private syncOne(p: Participant, emit = true): void {
        const lk = this.lk;
        if (!lk) return;
        const meta = readMeta(p);
        const prev = this.people.get(p.identity);
        const next: LiveParticipant = {
            identity: p.identity,
            name: meta.name ?? p.name ?? "Someone",
            hue: meta.hue ?? "lilac",
            photoUrl: meta.photoUrl,
            role: meta.role ?? "learner",
            isLocal: p.identity === this.meId,
            mic: p.isMicrophoneEnabled,
            camera: p.isCameraEnabled,
            screen: p.isScreenShareEnabled,
            speaking: prev?.speaking ?? false,
            handUp: p.attributes?.handUp === "1",
            canPublish: p.permissions?.canPublish ?? false,
            joinedAt: (p.joinedAt ?? new Date()).toISOString(),
            connection: prev?.connection ?? "good",
        };
        this.people.set(p.identity, next);
        if (emit) this.commit();
    }

    /** The published track, if it has actually been subscribed yet. */
    private track(identity: string, source: TrackSource) {
        const lk = this.lk;
        const room = this.room;
        if (!lk || !room) return undefined;
        const p =
            identity === room.localParticipant.identity
                ? room.localParticipant
                : room.remoteParticipants.get(identity);
        const src =
            source === "camera" ? lk.Track.Source.Camera : source === "screen" ? lk.Track.Source.ScreenShare : lk.Track.Source.Microphone;
        return p?.getTrackPublication(src)?.track;
    }

    hasTrack(identity: string, source: TrackSource): boolean {
        return Boolean(this.track(identity, source));
    }

    /**
     * A LiveKit `TrackReference` — `{ participant, publication, source }` — not a
     * bare Track: that is the shape `@livekit/react-native`'s `<VideoTrack>`
     * takes, and it is what lets the native renderer drive adaptive streaming
     * for the tile's actual size.
     */
    trackOf(identity: string, source: TrackSource): unknown | null {
        const lk = this.lk;
        const room = this.room;
        if (!lk || !room) return null;
        const participant =
            identity === room.localParticipant.identity ? room.localParticipant : room.remoteParticipants.get(identity);
        if (!participant) return null;
        const src =
            source === "camera" ? lk.Track.Source.Camera : source === "screen" ? lk.Track.Source.ScreenShare : lk.Track.Source.Microphone;
        const publication = participant.getTrackPublication(src);
        if (!publication?.track) return null;
        return { participant, publication, source: src };
    }

    attach(identity: string, source: TrackSource, el: unknown): () => void {
        const track = this.track(identity, source);
        if (!track) return () => {};
        track.attach(el as HTMLMediaElement);
        return () => {
            try {
                track.detach(el as HTMLMediaElement);
            } catch {
                /* the element is already gone */
            }
        };
    }

    // ── local controls ───────────────────────────────────────────────────────

    async setMic(on: boolean): Promise<void> {
        await this.room?.localParticipant.setMicrophoneEnabled(on);
        this.syncAll();
    }

    async setCamera(on: boolean): Promise<void> {
        if (on && !(this.room?.localParticipant.permissions?.canPublish ?? false)) return;
        await this.room?.localParticipant.setCameraEnabled(on);
        this.syncAll();
    }

    async setScreenShare(on: boolean): Promise<void> {
        if (on && !(this.room?.localParticipant.permissions?.canPublish ?? false)) return;
        await this.room?.localParticipant.setScreenShareEnabled(on, { audio: true });
        this.syncAll();
    }

    async switchDevice(kind: "audioinput" | "videoinput", deviceId: string): Promise<void> {
        await this.room?.switchActiveDevice(kind, deviceId);
    }

    private async publish(msg: Wire): Promise<void> {
        await this.room?.localParticipant.publishData(enc.encode(JSON.stringify(msg)), { reliable: true });
    }

    async sendChat(body: string): Promise<void> {
        const msg: Wire & { t: "chat" } = { t: "chat", id: liveId("c"), body, at: new Date().toISOString() };
        const local = this.room?.localParticipant;
        if (local) this.onWire(msg, local); // data packets don't echo to the sender
        await this.publish(msg);
        this.persist?.({ id: msg.id, body, at: msg.at });
    }

    async raiseHand(up: boolean): Promise<void> {
        await this.room?.localParticipant.setAttributes({ handUp: up ? "1" : "0" });
        this.patch(this.meId, { handUp: up });
    }

    async react(emoji: string): Promise<void> {
        const msg: Wire & { t: "reaction" } = { t: "reaction", id: liveId("r"), emoji };
        const local = this.room?.localParticipant;
        if (local) this.onWire(msg, local);
        await this.publish(msg);
    }

    // ── host controls — server-side, via the edge function ───────────────────

    async muteParticipant(identity: string): Promise<void> {
        this.requireHost("mute someone");
        const lk = this.lk;
        // Silencing a track is a server call, and the server addresses tracks by
        // sid — the browser is the only side that knows which one is the mic.
        const sid = lk ? this.room?.remoteParticipants.get(identity)?.getTrackPublication(lk.Track.Source.Microphone)?.trackSid : undefined;
        await this.ctx.hostOps?.mute(identity, sid);
    }

    async setStage(identity: string, onStage: boolean): Promise<void> {
        this.requireHost("change who is on stage");
        if (onStage && [...this.people.values()].filter((p) => p.canPublish).length >= STAGE_LIMIT) return;
        await this.ctx.hostOps?.setStage(identity, onStage);
    }

    async spotlight(identity: string | null): Promise<void> {
        this.requireHost("spotlight someone");
        this.spotlit = identity;
        this.commit();
        await this.publish({ t: "room", spotlit: identity, recording: this.recording });
    }

    async removeParticipant(identity: string): Promise<void> {
        this.requireHost("remove someone");
        await this.ctx.hostOps?.remove(identity);
    }

    async setRecording(on: boolean): Promise<void> {
        this.requireHost("record the class");
        this.recording = on;
        this.commit();
        await this.publish({ t: "room", spotlit: this.spotlit, recording: on });
    }

    async endClass(): Promise<void> {
        this.requireHost("end the class");
        await this.ctx.hostOps?.end();
        await this.disconnect();
    }

    // ── quiz ─────────────────────────────────────────────────────────────────

    async ask(prompt: string, options: string[], answer: number): Promise<void> {
        this.requireHost("ask a question");
        const msg: Wire & { t: "quiz" } = { t: "quiz", id: liveId("q"), prompt, options, at: new Date().toISOString() };
        const local = this.room?.localParticipant;
        if (local) this.onWire(msg, local);
        // The host keeps the correct answer to itself until the question closes.
        this.question = this.question ? { ...this.question, answer } : this.question;
        this.commit();
        await this.publish(msg);
    }

    async closeQuestion(): Promise<void> {
        this.requireHost("close the question");
        const answer = this.question?.answer ?? -1;
        this.shutQuestion(answer);
        await this.publish({ t: "quizclose", answer });
    }

    async answer(optionIndex: number): Promise<void> {
        if (!this.question || this.question.closed || this.myAnswer !== null) return;
        this.recordAnswer(this.meId, optionIndex);
        await this.publish({ t: "answer", option: optionIndex });
    }

    // ── captions ─────────────────────────────────────────────────────────────

    async setCaptions(on: boolean): Promise<void> {
        const src = this.ctx.captions;
        if (!src) return;
        if (!on) {
            src.stop();
            this.captionsOn = false;
            this.commit();
            return;
        }
        await src.start((text, final) => {
            const msg: Wire & { t: "caption" } = { t: "caption", id: liveId("cap"), text, final };
            const local = this.room?.localParticipant;
            if (local) this.onWire(msg, local);
            void this.publish(msg);
            // Only settled lines go into the transcript; partials churn.
            if (final) this.ctx.onTranscript?.({ id: msg.id, text, at: new Date().toISOString() });
        });
        this.captionsOn = true;
        this.commit();
    }

    // ── background blur ──────────────────────────────────────────────────────

    /**
     * Swap the published camera for a filtered copy of it.
     *
     * The room is told nothing: the replacement is published on the same
     * `Camera` source, so every tile, the stage rules and the recorder go on
     * treating it as the camera — which it is, with a blurred background.
     */
    async setBlur(on: boolean): Promise<void> {
        const lk = this.lk;
        const room = this.room;
        const filter = this.ctx.filter;
        if (!lk || !room || !filter) return;
        const lp = room.localParticipant;

        if (!on) {
            this.filtered?.stop();
            this.filtered = null;
            this.blurOn = false;
            // Re-publishing the plain camera is what puts the raw feed back.
            await lp.setCameraEnabled(false);
            await lp.setCameraEnabled(true);
            this.syncAll();
            return;
        }

        const pub = lp.getTrackPublication(lk.Track.Source.Camera);
        const cam = pub?.track?.mediaStreamTrack;
        if (!cam) return; // camera is off; nothing to filter
        try {
            const made = await filter.apply(cam);
            this.filtered = made;
            if (pub?.track) await lp.unpublishTrack(pub.track);
            await lp.publishTrack(made.track as MediaStreamTrack, { source: lk.Track.Source.Camera });
            this.blurOn = true;
            this.syncAll();
        } catch (err) {
            console.warn("[coir-six] blur unavailable:", (err as Error)?.message);
            this.filtered?.stop();
            this.filtered = null;
            this.blurOn = false;
            this.commit();
        }
    }
}

/** Name, tint and photo ride in the token's metadata claim. */
function readMeta(p: Participant): Meta {
    if (!p.metadata) return {};
    try {
        return JSON.parse(p.metadata) as Meta;
    } catch {
        return {};
    }
}

function message(err: unknown): string {
    const raw = err instanceof Error ? err.message : String(err);
    if (/permission|NotAllowed/i.test(raw)) return "Your browser blocked the camera or microphone. Allow them and try again.";
    if (/token|unauthor/i.test(raw)) return "Your invitation to this class has expired. Go back and join again.";
    return "We couldn't connect you to the class. Check your connection and try again.";
}
