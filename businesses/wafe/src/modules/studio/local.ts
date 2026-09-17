import type { RepoContext, Visibility } from "@/data/core";
import { seedContext } from "@/data/coreSeed";
import { uid } from "@/lib/format";
import { HARD_STOP, capState, visibleTo } from "./derive";
import { seed } from "./seed";
import { PLANS } from "./types";
import type {
    ChatMessage,
    CreativeProject,
    NewImage,
    NewSong,
    NewStory,
    PlanTier,
    SceneImageKind,
    SongRecording,
    StudioItem,
    StudioItemBase,
    StudioKind,
    StudioRepo,
    StudioState,
} from "./types";

/**
 * The studio in the browser — every write real, and every rule the same one
 * the database enforces.
 *
 * Three of those rules matter more than the rest, because they are the
 * promises the brief makes about the companion:
 *
 *  1. Nothing is written by an answer. `appendMessages` stores what was said
 *     and `decideProposal` is a separate call the member has to make — there
 *     is no path in this file from "the companion suggested it" to "it exists".
 *  2. A conversation belongs to the person who had it. A child's is flagged
 *     `visibleToParents` when it is created, and `visibleTo()` in derive.ts is
 *     what lets a parent read it; nobody else, ever, including the other
 *     child.
 *  3. The meter is a gate, not a gauge. `meter()` refuses once the month's
 *     allowance is spent, and the screens read the same `capState()` so the
 *     80% warning and the hard stop say the same thing in both places.
 */

const KEY = "wafe:demo:studio:v2";
const now = (): string => new Date().toISOString();

function isState(v: unknown): v is StudioState {
    if (!v || typeof v !== "object") return false;
    const s = v as Partial<StudioState>;
    return Array.isArray(s.items) && Array.isArray(s.projects) && typeof s.usage === "object" && s.usage !== null;
}

export class LocalStudioRepo implements StudioRepo {
    private cache: StudioState | null = null;

    constructor(private ctx: RepoContext) {}

    // -- storage -------------------------------------------------------------

    private all(): StudioState {
        if (this.cache) return this.cache;
        try {
            const raw = localStorage.getItem(KEY);
            const parsed: unknown = raw ? JSON.parse(raw) : null;
            if (isState(parsed)) {
                this.cache = parsed;
                return parsed;
            }
        } catch {
            /* a stale or foreign blob must never break the demo */
        }
        const fresh = seed(seedContext(this.ctx.space, this.ctx.members, this.ctx.today));
        this.save(fresh);
        return fresh;
    }

    private save(s: StudioState): void {
        this.cache = s;
        try {
            localStorage.setItem(KEY, JSON.stringify(s));
        } catch {
            // Private mode, or a recording that overflowed the quota: the
            // session keeps working, it just will not survive a reload.
        }
    }

    private write(mutate: (s: StudioState) => void): void {
        const next = structuredClone(this.all());
        mutate(next);
        this.save(next);
    }

    private deny(): never {
        throw new Error("Not allowed");
    }

    /** Guests read what was shared with them and make nothing. */
    private canCreate(kind: StudioKind): void {
        if (this.ctx.role === "guest") this.deny();
        if (kind === "chat" && !this.ctx.can("ai.ask")) this.deny();
    }

    /** The owner edits their own; a parent may tidy anything in the space. */
    private ownOrParent(item: StudioItem): void {
        if (item.memberId !== this.ctx.me.id && this.ctx.role !== "parent") this.deny();
    }

    private find(s: StudioState, id: string): StudioItem {
        const item = s.items.find((i) => i.id === id);
        if (!item) throw new Error("That is no longer in the studio");
        return item;
    }

    private defaultVisibility(): Visibility {
        return this.ctx.role === "child" ? "child" : "family";
    }

    private base(title: string, visibility: Visibility | undefined, projectId: string | null, costCents: number): StudioItemBase {
        return {
            id: uid("studio"),
            spaceId: this.ctx.space.id,
            title: title.trim() || "Untitled",
            memberId: this.ctx.me.id,
            createdAt: now(),
            visibility: visibility ?? this.defaultVisibility(),
            sharedWith: [],
            childSafe: true,
            projectId,
            costCents: Math.max(0, Math.round(costCents)),
        };
    }

    private add(item: StudioItem): StudioItem {
        this.write((s) => {
            s.items.unshift(item);
        });
        return item;
    }

    // -- load ----------------------------------------------------------------

    async load(): Promise<StudioState> {
        return visibleTo(this.all(), this.ctx);
    }

    // -- gallery -------------------------------------------------------------

    async saveSong(input: NewSong): Promise<StudioItem> {
        this.canCreate("song");
        return this.add({
            ...this.base(input.title, input.visibility, input.projectId ?? null, input.costCents ?? 0),
            kind: "song",
            data: { ...input.data, recording: null },
        });
    }

    async saveStory(input: NewStory): Promise<StudioItem> {
        this.canCreate("story");
        return this.add({
            ...this.base(input.title, input.visibility, input.projectId ?? null, input.costCents ?? 0),
            kind: "story",
            data: { ...input.data, reelId: null, sentToReelAt: null },
        });
    }

    async saveImage(input: NewImage): Promise<StudioItem> {
        this.canCreate("image");
        return this.add({
            ...this.base(input.title, input.visibility, input.projectId ?? null, input.costCents ?? 0),
            kind: "image",
            data: { ...input.data },
        });
    }

    async rename(itemId: string, title: string): Promise<void> {
        this.write((s) => {
            const item = this.find(s, itemId);
            this.ownOrParent(item);
            item.title = title.trim() || item.title;
        });
    }

    async remove(itemId: string): Promise<void> {
        this.write((s) => {
            const item = this.find(s, itemId);
            this.ownOrParent(item);
            s.items = s.items.filter((i) => i.id !== itemId);
        });
    }

    async share(itemId: string, visibility: Visibility, sharedWith: string[]): Promise<void> {
        this.write((s) => {
            const item = this.find(s, itemId);
            this.ownOrParent(item);
            item.visibility = visibility;
            item.sharedWith = visibility === "shared" ? [...new Set(sharedWith)] : [];
            if (visibility === "child") item.childSafe = true;
        });
    }

    // -- songs & stories -----------------------------------------------------

    async attachRecording(itemId: string, recording: SongRecording | null): Promise<void> {
        this.write((s) => {
            const item = this.find(s, itemId);
            this.ownOrParent(item);
            if (item.kind !== "song") throw new Error("Only a song takes a recording");
            item.data.recording = recording;
        });
    }

    async setSceneImage(itemId: string, sceneN: number, url: string | null, kind: SceneImageKind): Promise<void> {
        this.write((s) => {
            const item = this.find(s, itemId);
            this.ownOrParent(item);
            if (item.kind !== "story") throw new Error("Only a storyboard has scenes");
            const scene = item.data.scenes.find((x) => x.n === sceneN);
            if (!scene) throw new Error("That scene is no longer here");
            scene.imageUrl = url;
            scene.imageKind = url ? kind : "none";
        });
    }

    /**
     * Hand the storyboard to Memories to play. The studio does not own a
     * second player: it mints the reel id, stamps the storyboard, and the
     * Memories reel player is where it is watched and shared from.
     */
    async sendToReel(itemId: string): Promise<string> {
        const reelId = uid("reel");
        this.write((s) => {
            const item = this.find(s, itemId);
            this.ownOrParent(item);
            if (item.kind !== "story") throw new Error("Only a storyboard becomes a reel");
            item.data.reelId = item.data.reelId ?? reelId;
            item.data.sentToReelAt = now();
        });
        const after = this.all().items.find((i) => i.id === itemId);
        return after && after.kind === "story" && after.data.reelId ? after.data.reelId : reelId;
    }

    // -- the companion -------------------------------------------------------

    async startConversation(input: { title: string; moduleContext: string }): Promise<StudioItem> {
        this.canCreate("chat");
        return this.add({
            ...this.base(input.title, "private", null, 0),
            childSafe: false,
            kind: "chat",
            data: {
                moduleContext: input.moduleContext,
                messages: [],
                // The promise the brief makes out loud: a child's companion is
                // supervised, and the flag is set when the conversation starts
                // rather than when someone asks to see it.
                visibleToParents: this.ctx.role === "child",
            },
        } as StudioItem);
    }

    async appendMessages(conversationId: string, messages: ChatMessage[]): Promise<void> {
        this.write((s) => {
            const item = this.find(s, conversationId);
            if (item.kind !== "chat") throw new Error("That is not a conversation");
            if (item.memberId !== this.ctx.me.id) this.deny();
            item.data.messages.push(...messages);
        });
    }

    async decideProposal(conversationId: string, proposalId: string, status: "accepted" | "dismissed"): Promise<void> {
        this.write((s) => {
            const item = this.find(s, conversationId);
            if (item.kind !== "chat") throw new Error("That is not a conversation");
            // A parent may decide on a child's proposal; nobody else may.
            this.ownOrParent(item);
            const message = item.data.messages.find((m) => m.proposal?.id === proposalId);
            if (!message?.proposal) throw new Error("That suggestion is no longer here");
            message.proposal.status = status;
            message.proposal.decidedAt = now();
        });
    }

    async removeConversation(conversationId: string): Promise<void> {
        this.write((s) => {
            const item = this.find(s, conversationId);
            if (item.kind !== "chat") throw new Error("That is not a conversation");
            this.ownOrParent(item);
            s.items = s.items.filter((i) => i.id !== conversationId);
        });
    }

    // -- metering ------------------------------------------------------------

    async meter(costCents: number, tokens: number): Promise<void> {
        const month = this.ctx.today.slice(0, 7);
        let blocked = false;
        this.write((s) => {
            if (s.usage.month !== month) s.usage = { month, tokens: 0, costCents: 0, capCents: s.usage.capCents, warnedAt: null };
            if (capState(s.usage).blocked) {
                blocked = true;
                return;
            }
            s.usage.tokens += Math.max(0, Math.round(tokens));
            s.usage.costCents += Math.max(0, Math.round(costCents));
            if (capState(s.usage).warn && !s.usage.warnedAt) s.usage.warnedAt = now();
        });
        if (blocked) throw new Error(HARD_STOP);
    }

    async setPlan(plan: PlanTier): Promise<void> {
        if (this.ctx.role !== "parent") this.deny();
        this.write((s) => {
            s.plan = plan;
            s.usage.capCents = PLANS[plan].aiCapCents;
            s.usage.warnedAt = null;
        });
    }

    // -- projects ------------------------------------------------------------

    async addProject(name: string, childSafe: boolean): Promise<CreativeProject> {
        if (this.ctx.role === "guest") this.deny();
        const project: CreativeProject = {
            id: uid("cproj"),
            spaceId: this.ctx.space.id,
            memberId: this.ctx.me.id,
            name: name.trim() || "Untitled",
            childSafe: this.ctx.role === "child" ? true : childSafe,
        };
        this.write((s) => {
            s.projects.push(project);
        });
        return project;
    }

    async removeProject(id: string): Promise<void> {
        this.write((s) => {
            const project = s.projects.find((p) => p.id === id);
            if (!project) return;
            if (project.memberId !== this.ctx.me.id && this.ctx.role !== "parent") this.deny();
            s.projects = s.projects.filter((p) => p.id !== id);
            for (const item of s.items) if (item.projectId === id) item.projectId = null;
        });
    }
}
