import type { Hue } from "../format";
import { DEMO_FRIENDS } from "../seed";
import { BaseRoom, liveId } from "./baseRoom";
import {
    type JoinOptions,
    type LiveContext,
    type LiveParticipant,
    type LiveRoom,
    STAGE_LIMIT,
    type TrackSource,
} from "./room";

/**
 * The classroom, acted out.
 *
 * "Explore as Jason" has to show the room working — a prospect judging this
 * blueprint should be able to sit in a class, not read about one. So the demo
 * fills the room with the same faces the rest of the demo uses, has them arrive
 * over the first few seconds, talk in the chat, put hands up and unmute, while
 * the local tile shows the visitor's own camera if they allow it.
 *
 * Every schedule here is a `setTimeout` that is cleared on `disconnect`, the
 * same simulation `LocalRepo.sendMessage` already uses for mentor replies.
 */

/** Classmates beyond Jason's three friends, so a class looks like a class. */
const CLASSMATES: { name: string; hue: Hue }[] = [
    { name: "Priya Nandakumar", hue: "rose" },
    { name: "Sofia Ramos", hue: "peach" },
    { name: "Tunde Adeyemi", hue: "mint" },
    { name: "Chintya Claudia", hue: "sky" },
    { name: "Darren Johnson", hue: "plum" },
    { name: "Aldo Bareto", hue: "lilac" },
    { name: "Bastian Baja", hue: "peach" },
    { name: "Mei-Lin Chou", hue: "rose" },
    { name: "Owen Fletcher", hue: "mint" },
    { name: "Hana Yildiz", hue: "sky" },
];

/** What the room says to itself while the class settles in. */
const SCRIPT: { after: number; from: number; body: string }[] = [
    { after: 1800, from: 0, body: "Hey everyone 👋" },
    { after: 3200, from: 1, body: "Morning! Audio is coming through fine here." },
    { after: 5200, from: 0, body: "Long time no see — hope you're all well" },
    { after: 8000, from: 2, body: "Nice to meet you all 🙌" },
    { after: 12000, from: 3, body: "Is the deck going to be shared afterwards?" },
    { after: 16000, from: 4, body: "Yes, it goes out with the recording" },
    { after: 23000, from: 1, body: "Could you go back one slide?" },
    { after: 31000, from: 5, body: "That grid example finally made it click for me" },
    { after: 44000, from: 2, body: "Same 😅" },
];

export class DemoRoom extends BaseRoom implements LiveRoom {
    readonly kind = "demo" as const;

    private ctx: LiveContext;
    private timers: ReturnType<typeof setTimeout>[] = [];
    private cast: LiveParticipant[] = [];
    private camOn = false;
    private screenOn = false;

    constructor(ctx: LiveContext) {
        super();
        this.ctx = ctx;
        this.meId = ctx.me.id;
    }

    // ── lifecycle ────────────────────────────────────────────────────────────

    async connect(opts: JoinOptions = {}): Promise<void> {
        this.setStatus("connecting");
        const { mentor, me, lesson } = this.ctx;

        const host: LiveParticipant = {
            identity: mentor ? `mentor:${mentor.id}` : "mentor:host",
            name: mentor?.name ?? "Your mentor",
            hue: mentor?.hue ?? "lilac",
            photoUrl: mentor?.photoUrl,
            // Exploring as the mentor makes *you* the host; there is only ever
            // one, so the real mentor steps down to a speaker.
            role: this.ctx.isHost ? "speaker" : "host",
            isLocal: false,
            mic: true,
            // Nobody but the visitor has a real camera here, and a tile that
            // claims video it cannot show is just a grey rectangle.
            camera: false,
            screen: false,
            speaking: false,
            handUp: false,
            canPublish: true,
            joinedAt: new Date().toISOString(),
            connection: "good",
        };

        const local: LiveParticipant = {
            identity: me.id,
            name: me.name,
            hue: me.hue,
            photoUrl: me.photoUrl,
            role: this.ctx.isHost ? "host" : "learner",
            isLocal: true,
            mic: false,
            camera: false,
            screen: false,
            speaking: false,
            handUp: false,
            canPublish: this.ctx.isHost,
            joinedAt: new Date().toISOString(),
            connection: "good",
        };

        // Jason's friends first — a class you recognise — then the rest.
        const others = [
            ...DEMO_FRIENDS.map((f) => ({ name: f.name, hue: f.hue, photoUrl: f.photoUrl })),
            ...CLASSMATES.map((c) => ({ name: c.name, hue: c.hue, photoUrl: undefined })),
        ];
        this.cast = others.map((o, i) => ({
            identity: `demo:${i}`,
            name: o.name,
            hue: o.hue,
            photoUrl: o.photoUrl,
            role: "learner" as const,
            isLocal: false,
            mic: false,
            camera: false,
            screen: false,
            speaking: false,
            handUp: false,
            canPublish: false,
            joinedAt: new Date().toISOString(),
            connection: i === 6 ? "poor" : "good",
        }));

        this.embedUrl = lesson.recordingUrl ?? null;
        this.upsert(host);
        this.upsert(local);
        this.setStatus("connected");

        if (opts.mic) await this.setMic(true);
        if (opts.camera) await this.setCamera(true);

        // The room fills up over the first few seconds rather than all at once.
        this.cast.forEach((p, i) => this.at(220 + i * 420, () => this.upsert(p)));
        this.at(900, () => this.patch(host.identity, { speaking: true }));

        for (const line of SCRIPT) {
            this.at(line.after, () => {
                const who = line.from === 4 ? host : this.cast[line.from];
                if (!who) return;
                this.pushChat({
                    id: liveId("c"),
                    identity: who.identity,
                    name: who.name,
                    hue: who.hue,
                    photoUrl: who.photoUrl,
                    body: line.body,
                    createdAt: new Date().toISOString(),
                    mine: false,
                });
            });
        }

        // Someone puts a hand up, then gets brought onto the stage — the loop the
        // host controls exist for.
        this.at(19000, () => this.patch(this.cast[1]?.identity ?? "", { handUp: true }));
        this.at(26000, () => this.patch(this.cast[1]?.identity ?? "", { handUp: false, canPublish: true, role: "speaker", mic: true }));
        this.at(34000, () => this.patch(this.cast[4]?.identity ?? "", { handUp: true }));

        // The mentor puts a question up part-way through, the way a real class
        // checks whether anyone is still with them.
        this.at(13000, () => {
            this.openQuestion({
                id: liveId("q"),
                prompt: "Which of these ships a static site fastest?",
                options: ["Upload over FTP", "A git push to a host that builds it", "Email the zip to yourself"],
                answer: 1,
                closed: false,
                askedAt: new Date().toISOString(),
            });
            this.classAnswers();
        });

        // The mentor's mouth keeps moving; the loudest tile is what the stage follows.
        this.loopSpeaking(host.identity);
    }

    async disconnect(): Promise<void> {
        for (const t of this.timers) clearTimeout(t);
        this.timers = [];
        this.ctx.media?.stopAll();
        this.setStatus("ended");
        this.teardown();
    }

    private at(ms: number, fn: () => void): void {
        this.timers.push(setTimeout(fn, ms));
    }

    /** Alternate the host between speaking and pausing, so the ring pulses. */
    private loopSpeaking(identity: string): void {
        const tick = () => {
            const on = this.people.get(identity)?.speaking ?? false;
            this.patch(identity, { speaking: !on });
            this.timers.push(setTimeout(tick, on ? 900 + Math.random() * 1200 : 2600 + Math.random() * 2600));
        };
        this.timers.push(setTimeout(tick, 2000));
    }

    // ── the local learner ────────────────────────────────────────────────────

    /** Only the visitor's own camera is real here; everyone else is an avatar. */
    hasTrack(identity: string, source: TrackSource): boolean {
        if (identity !== this.meId || source === "audio") return false;
        return source === "screen" ? this.screenOn : this.camOn;
    }

    /** Nothing to hand a native renderer: the demo's media is DOM-only. */
    trackOf(): unknown | null {
        return null;
    }

    attach(identity: string, source: TrackSource, el: unknown): () => void {
        if (source === "audio" || !this.hasTrack(identity, source)) return () => {};
        return this.ctx.media?.attach(source, el) ?? (() => {});
    }

    async setMic(on: boolean): Promise<void> {
        this.patch(this.meId, { mic: on });
    }

    async setCamera(on: boolean): Promise<void> {
        const me = this.people.get(this.meId);
        if (on && me && !me.canPublish) return; // not on stage
        if (on) {
            try {
                await this.ctx.media?.enable("camera");
            } catch {
                return; // permission refused — leave the avatar up
            }
        } else {
            this.ctx.media?.disable("camera");
        }
        this.camOn = on;
        this.patch(this.meId, { camera: on });
    }

    async setScreenShare(on: boolean): Promise<void> {
        if (on) {
            try {
                await this.ctx.media?.enable("screen");
            } catch {
                return;
            }
        } else {
            this.ctx.media?.disable("screen");
        }
        this.screenOn = on;
        this.patch(this.meId, { screen: on });
    }

    async switchDevice(kind: "audioinput" | "videoinput", deviceId: string): Promise<void> {
        if (kind === "videoinput" && this.camOn) await this.ctx.media?.enable("camera", deviceId);
    }

    async sendChat(body: string): Promise<void> {
        const { me } = this.ctx;
        this.pushChat({
            id: liveId("c"),
            identity: me.id,
            name: me.name,
            hue: me.hue,
            photoUrl: me.photoUrl,
            body,
            createdAt: new Date().toISOString(),
            mine: true,
        });
        // Someone always answers, the way the demo inbox always answers.
        const who = this.cast[Math.floor(Math.random() * 3)];
        if (who) {
            this.at(1400 + Math.random() * 1600, () =>
                this.pushChat({
                    id: liveId("c"),
                    identity: who.identity,
                    name: who.name,
                    hue: who.hue,
                    photoUrl: who.photoUrl,
                    body: reply(body),
                    createdAt: new Date().toISOString(),
                    mine: false,
                }),
            );
        }
    }

    async raiseHand(up: boolean): Promise<void> {
        this.patch(this.meId, { handUp: up });
        if (!up) return;
        // The mentor notices, and brings you up to the front.
        this.at(3600, () => {
            if (!this.people.get(this.meId)?.handUp) return;
            this.patch(this.meId, { handUp: false, canPublish: true, role: "speaker" });
            const host = [...this.people.values()].find((p) => p.role === "host");
            if (host) {
                this.pushChat({
                    id: liveId("c"),
                    identity: host.identity,
                    name: host.name,
                    hue: host.hue,
                    photoUrl: host.photoUrl,
                    body: `Go ahead ${this.ctx.me.name.split(" ")[0]} — you're on stage, turn your camera on.`,
                    createdAt: new Date().toISOString(),
                    mine: false,
                });
            }
        });
    }

    async react(emoji: string): Promise<void> {
        this.pushReaction({ id: liveId("r"), identity: this.meId, name: this.ctx.me.name, emoji, at: Date.now() });
        // A couple of people join in.
        for (let i = 0; i < 2; i++) {
            const who = this.cast[Math.floor(Math.random() * this.cast.length)];
            if (who) this.at(400 + Math.random() * 1400, () => this.pushReaction({ id: liveId("r"), identity: who.identity, name: who.name, emoji, at: Date.now() }));
        }
    }

    // ── host side ────────────────────────────────────────────────────────────

    async muteParticipant(identity: string): Promise<void> {
        this.requireHost("mute someone");
        this.patch(identity, { mic: false, speaking: false });
    }

    async setStage(identity: string, onStage: boolean): Promise<void> {
        this.requireHost("change who is on stage");
        const onNow = [...this.people.values()].filter((p) => p.canPublish).length;
        if (onStage && onNow >= STAGE_LIMIT) return;
        this.patch(identity, {
            canPublish: onStage,
            role: onStage ? "speaker" : "learner",
            handUp: false,
            camera: onStage ? this.people.get(identity)?.camera ?? false : false,
        });
    }

    async spotlight(identity: string | null): Promise<void> {
        this.requireHost("spotlight someone");
        this.spotlit = identity;
        this.commit();
    }

    async removeParticipant(identity: string): Promise<void> {
        this.requireHost("remove someone");
        this.remove(identity);
    }

    async setRecording(on: boolean): Promise<void> {
        this.requireHost("record the class");
        this.recording = on;
        this.commit();
    }

    async endClass(): Promise<void> {
        this.requireHost("end the class");
        await this.disconnect();
    }

    // ── quiz ─────────────────────────────────────────────────────────────────

    async ask(prompt: string, options: string[], answer: number): Promise<void> {
        this.requireHost("ask a question");
        this.openQuestion({ id: liveId("q"), prompt, options, answer, closed: false, askedAt: new Date().toISOString() });
        this.classAnswers();
    }

    async closeQuestion(): Promise<void> {
        this.requireHost("close the question");
        this.shutQuestion();
    }

    async answer(optionIndex: number): Promise<void> {
        if (!this.question || this.question.closed || this.myAnswer !== null) return;
        this.recordAnswer(this.meId, optionIndex);
        // The room answers around you, so the bars actually move.
        this.classAnswers();
    }

    /** Classmates trickling in their answers, mostly right, some not. */
    private classAnswers(): void {
        const q = this.question;
        if (!q) return;
        const correct = q.answer ?? 0;
        this.cast.slice(0, 9).forEach((p, i) => {
            this.at(900 + i * 700 + Math.random() * 600, () => {
                if (!this.question || this.question.closed) return;
                const pick = Math.random() < 0.7 ? correct : Math.floor(Math.random() * q.options.length);
                this.recordAnswer(p.identity, pick);
            });
        });
    }

    /** No microphone to transcribe in a scripted room. */
    async setCaptions(): Promise<void> {}

    /** No published track to filter in a scripted room. */
    async setBlur(): Promise<void> {}
}

/** The canned-reply trick from `LocalRepo.mentorReply`, kept short. */
function reply(incoming: string): string {
    const t = incoming.toLowerCase();
    if (t.includes("?")) return "Good question — I think that's covered right after this section.";
    if (t.includes("hi") || t.includes("hello") || t.includes("hey")) return "Hey! 👋";
    if (t.includes("thank")) return "Anytime 🙂";
    return "Agreed 👍";
}
