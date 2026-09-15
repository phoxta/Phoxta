import type { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";
import type { Hue } from "../format";
import { BaseRoom, liveId } from "./baseRoom";
import {
    type JoinOptions,
    type LiveContext,
    type LiveParticipant,
    type LiveRoom,
    STAGE_LIMIT,
} from "./room";

/**
 * A classroom with no SFU behind it.
 *
 * Not every school that buys this blueprint will run a media server, and the
 * mentor may well be streaming from somewhere else entirely. This room is the
 * honest version of that: Coir Six supplies everything *around* the stream —
 * who is here, the chat, hands, reactions, the host's controls and the
 * attendance record — over Supabase Realtime, which every tenant already has,
 * and the stage shows the mentor's own stream.
 *
 * `media: false` in the snapshot, so the UI hides the camera and microphone
 * buttons instead of offering controls that would do nothing.
 *
 * Presence carries the roster; broadcast carries the events. Chat is also
 * written to `cs_live_chat` so it survives a refresh and can be read after the
 * class — but a failed insert only costs durability, never the live message.
 */

type PresenceMeta = {
    name: string;
    hue: Hue;
    photoUrl?: string;
    role: "host" | "speaker" | "learner";
    handUp: boolean;
    canPublish: boolean;
    joinedAt: string;
};

type Wire =
    | { t: "chat"; id: string; from: string; name: string; hue: Hue; photoUrl?: string; body: string; at: string }
    | { t: "reaction"; id: string; from: string; name: string; emoji: string }
    | { t: "stage"; target: string; on: boolean }
    | { t: "spotlight"; target: string | null }
    | { t: "kick"; target: string }
    | { t: "recording"; on: boolean }
    | { t: "end" }
    | { t: "quiz"; id: string; prompt: string; options: string[]; at: string }
    | { t: "answer"; from: string; option: number }
    | { t: "quizclose"; answer: number }
    | { t: "caption"; id: string; from: string; name: string; text: string; final: boolean };

export class PresenceRoom extends BaseRoom implements LiveRoom {
    readonly kind = "presence" as const;

    private ctx: LiveContext;
    private client: SupabaseClient;
    private org: string;
    private channel: RealtimeChannel | null = null;
    private mine: PresenceMeta;

    constructor(client: SupabaseClient, org: string, ctx: LiveContext) {
        super();
        this.client = client;
        this.org = org;
        this.ctx = ctx;
        this.meId = ctx.me.id;
        this.media = false;
        this.embedUrl = ctx.lesson.joinUrl || null;
        this.mine = {
            name: ctx.me.name,
            hue: ctx.me.hue,
            photoUrl: ctx.me.photoUrl,
            role: ctx.isHost ? "host" : "learner",
            handUp: false,
            canPublish: false,
            joinedAt: new Date().toISOString(),
        };
    }

    async connect(_opts: JoinOptions = {}): Promise<void> {
        this.setStatus("connecting");
        await this.loadHistory();

        const ch = this.client.channel(`cs-live-${this.org}-${this.ctx.lesson.id}`, {
            config: { presence: { key: this.meId }, broadcast: { self: false } },
        });
        this.channel = ch;

        ch.on("presence", { event: "sync" }, () => this.syncRoster());
        ch.on("broadcast", { event: "room" }, ({ payload }) => this.onWire(payload as Wire));

        await new Promise<void>((resolve) => {
            ch.subscribe((status) => {
                if (status === "SUBSCRIBED") {
                    void ch.track(this.mine).then(() => {
                        this.setStatus("connected");
                        resolve();
                    });
                } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
                    this.setStatus("failed", "We couldn't reach the classroom. Check your connection and try again.");
                    resolve();
                } else if (status === "CLOSED" && this.status === "connected") {
                    this.setStatus("reconnecting");
                }
            });
        });
    }

    async disconnect(): Promise<void> {
        const ch = this.channel;
        this.channel = null;
        if (ch) {
            await ch.untrack().catch(() => {});
            await this.client.removeChannel(ch);
        }
        this.setStatus("ended");
        this.teardown();
    }

    /** Presence is the whole roster on every sync, so rebuild rather than patch. */
    private syncRoster(): void {
        const state = this.channel?.presenceState<PresenceMeta>() ?? {};
        const seen = new Set<string>();
        for (const [identity, metas] of Object.entries(state)) {
            const m = metas[0];
            if (!m) continue;
            seen.add(identity);
            const prev = this.people.get(identity);
            const next: LiveParticipant = {
                identity,
                name: m.name,
                hue: m.hue,
                photoUrl: m.photoUrl,
                role: m.role,
                isLocal: identity === this.meId,
                mic: false,
                camera: false,
                screen: false,
                speaking: false,
                handUp: m.handUp,
                canPublish: m.canPublish,
                joinedAt: m.joinedAt,
                connection: "good",
            };
            if (!prev || JSON.stringify(prev) !== JSON.stringify(next)) this.people.set(identity, next);
        }
        for (const identity of [...this.people.keys()]) if (!seen.has(identity)) this.people.delete(identity);
        this.commit();
    }

    private async retrack(patch: Partial<PresenceMeta>): Promise<void> {
        this.mine = { ...this.mine, ...patch };
        await this.channel?.track(this.mine);
    }

    private async send(msg: Wire): Promise<void> {
        await this.channel?.send({ type: "broadcast", event: "room", payload: msg });
    }

    private onWire(msg: Wire): void {
        switch (msg.t) {
            case "chat":
                this.pushChat({
                    id: msg.id,
                    identity: msg.from,
                    name: msg.name,
                    hue: msg.hue,
                    photoUrl: msg.photoUrl,
                    body: msg.body,
                    createdAt: msg.at,
                    mine: msg.from === this.meId,
                });
                break;
            case "reaction":
                this.pushReaction({ id: msg.id, identity: msg.from, name: msg.name, emoji: msg.emoji, at: Date.now() });
                break;
            case "stage":
                if (msg.target === this.meId) void this.retrack({ canPublish: msg.on, role: msg.on ? "speaker" : "learner", handUp: false });
                break;
            case "spotlight":
                this.spotlit = msg.target;
                this.commit();
                break;
            case "kick":
                if (msg.target === this.meId) void this.disconnect();
                break;
            case "recording":
                this.recording = msg.on;
                this.commit();
                break;
            case "end":
                void this.disconnect();
                break;
            case "quiz":
                this.openQuestion({ id: msg.id, prompt: msg.prompt, options: msg.options, closed: false, askedAt: msg.at });
                break;
            case "answer":
                this.recordAnswer(msg.from, msg.option);
                break;
            case "quizclose":
                this.shutQuestion(msg.answer);
                break;
            case "caption":
                this.pushCaption({ id: msg.id, identity: msg.from, name: msg.name, text: msg.text, final: msg.final, at: Date.now() });
                break;
        }
    }

    /** Chat from earlier in the class, so arriving late doesn't mean arriving blind. */
    private async loadHistory(): Promise<void> {
        const { data, error } = await this.client
            .from("cs_live_chat")
            .select("id, user_id, author_name, author_hue, author_photo_url, body, created_at")
            .eq("organization_id", this.org)
            .eq("live_lesson_id", this.ctx.lesson.id)
            .order("created_at", { ascending: true })
            .limit(200);
        if (error || !data) return; // durability is a bonus here, never a blocker
        for (const r of data as Record<string, unknown>[]) {
            this.pushChat({
                id: String(r.id),
                identity: String(r.user_id ?? ""),
                name: String(r.author_name ?? "Someone"),
                hue: (r.author_hue as Hue) ?? "lilac",
                photoUrl: (r.author_photo_url as string) || undefined,
                body: String(r.body ?? ""),
                createdAt: String(r.created_at ?? new Date().toISOString()),
                mine: String(r.user_id ?? "") === this.meId,
            });
        }
    }

    // ── media: not in this room ──────────────────────────────────────────────

    hasTrack(): boolean {
        return false;
    }
    /** No media at all here, so nothing to blur. */
    async setBlur(): Promise<void> {}
    trackOf(): unknown | null {
        return null;
    }
    attach(): () => void {
        return () => {};
    }
    async setMic(): Promise<void> {}
    async setCamera(): Promise<void> {}
    async setScreenShare(): Promise<void> {}
    async switchDevice(): Promise<void> {}

    // ── everything that isn't media works exactly as in a real room ──────────

    async sendChat(body: string): Promise<void> {
        const { me } = this.ctx;
        const msg: Wire = {
            t: "chat",
            id: liveId("c"),
            from: me.id,
            name: me.name,
            hue: me.hue,
            photoUrl: me.photoUrl,
            body,
            at: new Date().toISOString(),
        };
        this.onWire(msg); // show it immediately; broadcast has `self: false`
        await this.send(msg);
        await this.client
            .from("cs_live_chat")
            .insert({
                id: msg.id,
                organization_id: this.org,
                live_lesson_id: this.ctx.lesson.id,
                user_id: me.id,
                author_name: me.name,
                author_hue: me.hue,
                author_photo_url: me.photoUrl ?? null,
                body,
            })
            .then(({ error }) => {
                if (error) console.warn("[coir-six] live chat not persisted:", error.message);
            });
    }

    async raiseHand(up: boolean): Promise<void> {
        await this.retrack({ handUp: up });
    }

    async react(emoji: string): Promise<void> {
        const msg: Wire = { t: "reaction", id: liveId("r"), from: this.meId, name: this.ctx.me.name, emoji };
        this.onWire(msg);
        await this.send(msg);
    }

    async muteParticipant(): Promise<void> {
        this.requireHost("mute someone");
        // No media to mute — a host lowers the hand instead.
    }

    async setStage(identity: string, onStage: boolean): Promise<void> {
        this.requireHost("change who is on stage");
        if (onStage && [...this.people.values()].filter((p) => p.canPublish).length >= STAGE_LIMIT) return;
        await this.send({ t: "stage", target: identity, on: onStage });
    }

    async spotlight(identity: string | null): Promise<void> {
        this.requireHost("spotlight someone");
        this.spotlit = identity;
        this.commit();
        await this.send({ t: "spotlight", target: identity });
    }

    async removeParticipant(identity: string): Promise<void> {
        this.requireHost("remove someone");
        await this.send({ t: "kick", target: identity });
    }

    async setRecording(on: boolean): Promise<void> {
        this.requireHost("record the class");
        this.recording = on;
        this.commit();
        await this.send({ t: "recording", on });
    }

    async endClass(): Promise<void> {
        this.requireHost("end the class");
        await this.send({ t: "end" });
        await this.disconnect();
    }

    async ask(prompt: string, options: string[], answer: number): Promise<void> {
        this.requireHost("ask a question");
        const msg: Wire = { t: "quiz", id: liveId("q"), prompt, options, at: new Date().toISOString() };
        this.onWire(msg);
        this.question = this.question ? { ...this.question, answer } : this.question;
        this.commit();
        await this.send(msg);
    }

    async closeQuestion(): Promise<void> {
        this.requireHost("close the question");
        const answer = this.question?.answer ?? -1;
        this.shutQuestion(answer);
        await this.send({ t: "quizclose", answer });
    }

    async answer(optionIndex: number): Promise<void> {
        if (!this.question || this.question.closed || this.myAnswer !== null) return;
        const msg: Wire = { t: "answer", from: this.meId, option: optionIndex };
        this.onWire(msg);
        await this.send(msg);
    }

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
            const msg: Wire = { t: "caption", id: liveId("cap"), from: this.meId, name: this.ctx.me.name, text, final };
            this.onWire(msg);
            void this.send(msg);
            if (final) this.ctx.onTranscript?.({ id: msg.id, text, at: new Date().toISOString() });
        });
        this.captionsOn = true;
        this.commit();
    }

}
