import type { RepoContext, Visibility } from "@/data/core";
import { supabase } from "@/lib/supabase";
import { HARD_STOP, capState, visibleTo } from "./derive";
import { PLANS } from "./types";
import type {
    AiUsage,
    ChatData,
    ChatMessage,
    CreativeProject,
    ImageData,
    ImageStatus,
    NewImage,
    NewSong,
    NewStory,
    PlanTier,
    Proposal,
    SceneImageKind,
    SongData,
    SongKind,
    SongRecording,
    SongSection,
    Source,
    StoryAudience,
    StoryData,
    StoryScene,
    StudioItem,
    StudioItemBase,
    StudioKind,
    StudioRepo,
    StudioState,
} from "./types";

/**
 * The same studio, live, under row-level security.
 *
 * The shape on screen is one gallery; the shape in the database is the one the
 * spec asked for — songs, images, storyboards and their scenes, conversations
 * and their messages, creative projects, and a usage row per month. This file
 * is the only place the two meet: snake_case ↔ camelCase, four tables folded
 * into one `items` array, and nothing here reads another module's tables.
 *
 * The privacy rules are duplicated on purpose. `sql/studio.sql` is the real
 * gate — a child's select on wf_ai_conversations returns their own rows and a
 * parent's returns the children's — and `visibleTo()` runs again here so the
 * live slice and the demo slice cannot drift apart.
 */

type Row = Record<string, unknown>;

const s = (v: unknown, d = ""): string => (typeof v === "string" ? v : d);
const n = (v: unknown, d = 0): number => (typeof v === "number" ? v : Number(v ?? d) || d);
const iso = (v: unknown): string => (v ? new Date(v as string).toISOString() : new Date().toISOString());
const nul = (v: unknown): string | null => (typeof v === "string" && v ? v : null);
const strs = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);
const vis = (v: unknown): Visibility => (v === "private" || v === "shared" || v === "child" ? v : "family");
const rows = (v: unknown): Row[] => (Array.isArray(v) ? (v as Row[]) : []);
const obj = (v: unknown): Row => (v && typeof v === "object" && !Array.isArray(v) ? (v as Row) : {});

function fail(where: string, error: { message: string } | null | undefined): void {
    if (error) throw new Error(`${where}: ${error.message}`);
}

// ---------------------------------------------------------------------------
// Mapping
// ---------------------------------------------------------------------------

const mapBase = (r: Row): StudioItemBase => ({
    id: s(r.id),
    spaceId: s(r.space_id),
    title: s(r.title, "Untitled"),
    memberId: s(r.owner_member_id),
    createdAt: iso(r.created_at),
    visibility: vis(r.visibility),
    sharedWith: strs(r.shared_with),
    childSafe: r.child_safe !== false,
    projectId: nul(r.project_id),
    costCents: n(r.cost_cents),
});

const mapSections = (v: unknown): SongSection[] =>
    rows(v)
        .map((r) => ({ section: s(r.section, "Verse"), chords: s(r.chords), lyrics: s(r.lyrics) }))
        .filter((x) => x.lyrics.length > 0);

const mapRecording = (v: unknown): SongRecording | null => {
    const r = obj(v);
    const url = s(r.url);
    if (!url) return null;
    return { url, seconds: n(r.seconds), byMemberId: s(r.byMemberId), recordedAt: iso(r.recordedAt), mime: s(r.mime, "audio/webm") };
};

const mapSong = (r: Row): StudioItem => ({
    ...mapBase(r),
    kind: "song",
    data: {
        songKind: s(r.song_kind, "family") as SongKind,
        key: s(r.music_key, "G"),
        tempo: n(r.tempo, 96),
        structure: mapSections(r.structure),
        theme: s(r.theme),
        names: strs(r.names),
        prompt: s(r.prompt),
        source: r.source === "ai" ? "ai" : "template",
        model: nul(r.model),
        recording: mapRecording(r.recording),
    } satisfies SongData,
});

const mapScene = (r: Row): StoryScene => ({
    n: n(r.scene_order, 1),
    caption: s(r.caption),
    visual: s(r.visual),
    narration: s(r.narration),
    imageUrl: nul(r.image_url),
    imageKind: (r.image_kind === "ai" || r.image_kind === "family" ? r.image_kind : "none") as SceneImageKind,
});

const mapStory = (r: Row, scenes: StoryScene[]): StudioItem => ({
    ...mapBase(r),
    kind: "story",
    data: {
        audience: s(r.audience, "family") as StoryAudience,
        scenes: [...scenes].sort((a, b) => a.n - b.n),
        prompt: s(r.prompt),
        source: r.source === "ai" ? "ai" : "template",
        model: nul(r.model),
        reelId: nul(r.reel_id),
        sentToReelAt: nul(r.sent_to_reel_at) ? iso(r.sent_to_reel_at) : null,
    } satisfies StoryData,
});

const mapImage = (r: Row): StudioItem => ({
    ...mapBase(r),
    kind: "image",
    data: {
        prompt: s(r.prompt),
        url: nul(r.url),
        status: (r.status === "generated" ? "generated" : "unavailable_typographic") as ImageStatus,
        model: nul(r.model),
        note: s(r.note),
        palette: n(r.palette),
    } satisfies ImageData,
});

const mapSource = (v: unknown): Source => {
    const r = obj(v);
    return { moduleId: s(r.moduleId), label: s(r.label), detail: s(r.detail), href: s(r.href, "/"), sensitivity: s(r.sensitivity, "general") as Source["sensitivity"] };
};

const mapProposal = (v: unknown): Proposal | null => {
    const r = obj(v);
    const id = s(r.id);
    if (!id) return null;
    return {
        id,
        kind: s(r.kind, "task") as Proposal["kind"],
        title: s(r.title),
        detail: s(r.detail),
        memberId: nul(r.memberId),
        dueDate: nul(r.dueDate),
        href: s(r.href, "/"),
        status: (r.status === "accepted" || r.status === "dismissed" ? r.status : "pending") as Proposal["status"],
        decidedAt: nul(r.decidedAt),
    };
};

const mapMessage = (r: Row): ChatMessage => ({
    id: s(r.id),
    from: r.sender === "me" ? "me" : "wafe",
    text: s(r.body),
    at: iso(r.created_at),
    sources: rows(r.sources).map(mapSource),
    proposal: mapProposal(r.proposal),
    blocked: r.blocked === "safety" || r.blocked === "cap" || r.blocked === "scope" ? r.blocked : null,
});

const mapConversation = (r: Row, messages: ChatMessage[]): StudioItem => ({
    ...mapBase(r),
    childSafe: false,
    kind: "chat",
    data: {
        moduleContext: s(r.module_context, "home"),
        messages: [...messages].sort((a, b) => (a.at < b.at ? -1 : 1)),
        visibleToParents: r.visible_to_parents === true,
    } satisfies ChatData,
});

const mapProject = (r: Row): CreativeProject => ({
    id: s(r.id),
    spaceId: s(r.space_id),
    memberId: s(r.owner_member_id),
    name: s(r.name, "Untitled"),
    childSafe: r.child_safe !== false,
});

// ---------------------------------------------------------------------------
// The repo
// ---------------------------------------------------------------------------

export class SupabaseStudioRepo implements StudioRepo {
    /** Which table an item id lives in, learned on load. */
    private kinds = new Map<string, StudioKind>();

    constructor(private ctx: RepoContext) {}

    private get space(): string {
        return this.ctx.space.id;
    }

    private stamp(): { organization_id: string | null; space_id: string } {
        return { organization_id: this.ctx.orgId, space_id: this.space };
    }

    private deny(): never {
        throw new Error("Not allowed");
    }

    private canCreate(kind: StudioKind): void {
        if (this.ctx.role === "guest") this.deny();
        if (kind === "chat" && !this.ctx.can("ai.ask")) this.deny();
    }

    private kindOf(itemId: string): StudioKind {
        const k = this.kinds.get(itemId);
        if (!k) throw new Error("That is no longer in the studio");
        return k;
    }

    private baseInsert(title: string, visibility: Visibility | undefined, projectId: string | null, costCents: number): Row {
        return {
            ...this.stamp(),
            title: title.trim() || "Untitled",
            owner_member_id: this.ctx.me.id,
            visibility: visibility ?? (this.ctx.role === "child" ? "child" : "family"),
            shared_with: [],
            child_safe: true,
            project_id: projectId,
            cost_cents: Math.max(0, Math.round(costCents)),
        };
    }

    // -- load ----------------------------------------------------------------

    async load(): Promise<StudioState> {
        const [songs, stories, scenes, images, convos, messages, projects, usage] = await Promise.all([
            supabase.from("wf_songs").select("*").eq("space_id", this.space),
            supabase.from("wf_storyboards").select("*").eq("space_id", this.space),
            supabase.from("wf_storyboard_scenes").select("*").eq("space_id", this.space),
            supabase.from("wf_studio_images").select("*").eq("space_id", this.space),
            supabase.from("wf_ai_conversations").select("*").eq("space_id", this.space),
            supabase.from("wf_ai_messages").select("*").eq("space_id", this.space),
            supabase.from("wf_creative_projects").select("*").eq("space_id", this.space),
            supabase.from("wf_ai_usage").select("*").eq("space_id", this.space).eq("month", this.ctx.today.slice(0, 7)).maybeSingle(),
        ]);
        fail("songs", songs.error);
        fail("storyboards", stories.error);
        fail("scenes", scenes.error);
        fail("images", images.error);
        fail("conversations", convos.error);
        fail("messages", messages.error);
        fail("creative projects", projects.error);
        if (usage.error && usage.error.code !== "PGRST116") fail("ai usage", usage.error);

        const scenesByStory = new Map<string, StoryScene[]>();
        for (const r of rows(scenes.data)) {
            const key = s(r.storyboard_id);
            const list = scenesByStory.get(key) ?? [];
            list.push(mapScene(r));
            scenesByStory.set(key, list);
        }
        const messagesByConvo = new Map<string, ChatMessage[]>();
        for (const r of rows(messages.data)) {
            const key = s(r.conversation_id);
            const list = messagesByConvo.get(key) ?? [];
            list.push(mapMessage(r));
            messagesByConvo.set(key, list);
        }

        const items: StudioItem[] = [
            ...rows(songs.data).map(mapSong),
            ...rows(stories.data).map((r) => mapStory(r, scenesByStory.get(s(r.id)) ?? [])),
            ...rows(images.data).map(mapImage),
            ...rows(convos.data).map((r) => mapConversation(r, messagesByConvo.get(s(r.id)) ?? [])),
        ].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

        this.kinds = new Map(items.map((i) => [i.id, i.kind]));

        const u = obj(usage.data);
        const plan = (s(u.plan, "household") as PlanTier) in PLANS ? (s(u.plan, "household") as PlanTier) : "household";
        const meter: AiUsage = {
            month: s(u.month, this.ctx.today.slice(0, 7)),
            tokens: n(u.tokens),
            costCents: n(u.cost_cents),
            capCents: n(u.cap_cents, PLANS[plan].aiCapCents),
            warnedAt: nul(u.warned_at),
        };

        return visibleTo({ items, projects: rows(projects.data).map(mapProject), usage: meter, plan }, this.ctx);
    }

    // -- gallery -------------------------------------------------------------

    async saveSong(input: NewSong): Promise<StudioItem> {
        this.canCreate("song");
        const d = input.data;
        const { data, error } = await supabase
            .from("wf_songs")
            .insert({
                ...this.baseInsert(input.title, input.visibility, input.projectId ?? null, input.costCents ?? 0),
                song_kind: d.songKind,
                music_key: d.key,
                tempo: d.tempo,
                theme: d.theme,
                names: d.names,
                prompt: d.prompt,
                source: d.source,
                model: d.model,
                structure: d.structure,
                recording: null,
            })
            .select("*")
            .single();
        fail("save song", error);
        const item = mapSong(obj(data));
        this.kinds.set(item.id, "song");
        return item;
    }

    async saveStory(input: NewStory): Promise<StudioItem> {
        this.canCreate("story");
        const d = input.data;
        const { data, error } = await supabase
            .from("wf_storyboards")
            .insert({
                ...this.baseInsert(input.title, input.visibility, input.projectId ?? null, input.costCents ?? 0),
                audience: d.audience,
                prompt: d.prompt,
                source: d.source,
                model: d.model,
                reel_id: null,
                sent_to_reel_at: null,
            })
            .select("*")
            .single();
        fail("save storyboard", error);
        const row = obj(data);
        const storyboardId = s(row.id);
        if (d.scenes.length) {
            const { error: sceneError } = await supabase.from("wf_storyboard_scenes").insert(
                d.scenes.map((scene) => ({
                    ...this.stamp(),
                    storyboard_id: storyboardId,
                    scene_order: scene.n,
                    caption: scene.caption,
                    visual: scene.visual,
                    narration: scene.narration,
                    image_url: scene.imageUrl,
                    image_kind: scene.imageKind,
                })),
            );
            fail("save scenes", sceneError);
        }
        const item = mapStory(row, d.scenes);
        this.kinds.set(item.id, "story");
        return item;
    }

    async saveImage(input: NewImage): Promise<StudioItem> {
        this.canCreate("image");
        const d = input.data;
        const { data, error } = await supabase
            .from("wf_studio_images")
            .insert({
                ...this.baseInsert(input.title, input.visibility, input.projectId ?? null, input.costCents ?? 0),
                prompt: d.prompt,
                url: d.url,
                status: d.status,
                model: d.model,
                note: d.note,
                palette: d.palette,
            })
            .select("*")
            .single();
        fail("save picture", error);
        const item = mapImage(obj(data));
        this.kinds.set(item.id, "image");
        return item;
    }

    private tableFor(kind: StudioKind): string {
        return kind === "song" ? "wf_songs" : kind === "story" ? "wf_storyboards" : kind === "image" ? "wf_studio_images" : "wf_ai_conversations";
    }

    async rename(itemId: string, title: string): Promise<void> {
        const trimmed = title.trim();
        if (!trimmed) return;
        const { error } = await supabase.from(this.tableFor(this.kindOf(itemId))).update({ title: trimmed }).eq("id", itemId);
        fail("rename", error);
    }

    async remove(itemId: string): Promise<void> {
        const { error } = await supabase.from(this.tableFor(this.kindOf(itemId))).delete().eq("id", itemId);
        fail("delete", error);
        this.kinds.delete(itemId);
    }

    async share(itemId: string, visibility: Visibility, sharedWith: string[]): Promise<void> {
        const patch: Row = { visibility, shared_with: visibility === "shared" ? [...new Set(sharedWith)] : [] };
        if (visibility === "child") patch.child_safe = true;
        const { error } = await supabase.from(this.tableFor(this.kindOf(itemId))).update(patch).eq("id", itemId);
        fail("share", error);
    }

    // -- songs & stories -----------------------------------------------------

    async attachRecording(itemId: string, recording: SongRecording | null): Promise<void> {
        const { error } = await supabase.from("wf_songs").update({ recording }).eq("id", itemId);
        fail("save the recording", error);
    }

    async setSceneImage(itemId: string, sceneN: number, url: string | null, kind: SceneImageKind): Promise<void> {
        const { error } = await supabase
            .from("wf_storyboard_scenes")
            .update({ image_url: url, image_kind: url ? kind : "none" })
            .eq("storyboard_id", itemId)
            .eq("scene_order", sceneN);
        fail("set the picture", error);
    }

    async sendToReel(itemId: string): Promise<string> {
        const { data, error } = await supabase.from("wf_storyboards").select("reel_id").eq("id", itemId).single();
        fail("read the storyboard", error);
        const existing = nul(obj(data).reel_id);
        const reelId = existing ?? crypto.randomUUID();
        const { error: upError } = await supabase.from("wf_storyboards").update({ reel_id: reelId, sent_to_reel_at: new Date().toISOString() }).eq("id", itemId);
        fail("send to the reel", upError);
        return reelId;
    }

    // -- the companion -------------------------------------------------------

    async startConversation(input: { title: string; moduleContext: string }): Promise<StudioItem> {
        this.canCreate("chat");
        const { data, error } = await supabase
            .from("wf_ai_conversations")
            .insert({
                ...this.stamp(),
                title: input.title.trim().slice(0, 120) || "New conversation",
                owner_member_id: this.ctx.me.id,
                module_context: input.moduleContext,
                visibility: "private",
                shared_with: [],
                child_safe: false,
                cost_cents: 0,
                visible_to_parents: this.ctx.role === "child",
            })
            .select("*")
            .single();
        fail("start the conversation", error);
        const item = mapConversation(obj(data), []);
        this.kinds.set(item.id, "chat");
        return item;
    }

    async appendMessages(conversationId: string, messages: ChatMessage[]): Promise<void> {
        if (!messages.length) return;
        const { error } = await supabase.from("wf_ai_messages").insert(
            messages.map((m) => ({
                ...this.stamp(),
                conversation_id: conversationId,
                sender: m.from,
                body: m.text,
                sources: m.sources,
                proposal: m.proposal,
                blocked: m.blocked,
                created_at: m.at,
            })),
        );
        fail("save the answer", error);
    }

    /**
     * A proposal only ever moves through here, and only ever to a decision the
     * member made. Nothing else in this file writes another module's table —
     * accepting a suggestion hands the member to the screen that does the job.
     */
    async decideProposal(conversationId: string, proposalId: string, status: "accepted" | "dismissed"): Promise<void> {
        const { data, error } = await supabase.from("wf_ai_messages").select("id, proposal").eq("conversation_id", conversationId);
        fail("find the suggestion", error);
        const row = rows(data).find((r) => s(obj(r.proposal).id) === proposalId);
        if (!row) throw new Error("That suggestion is no longer here");
        const proposal = { ...obj(row.proposal), status, decidedAt: new Date().toISOString() };
        const { error: upError } = await supabase.from("wf_ai_messages").update({ proposal }).eq("id", s(row.id));
        fail("save the decision", upError);
    }

    async removeConversation(conversationId: string): Promise<void> {
        const { error } = await supabase.from("wf_ai_conversations").delete().eq("id", conversationId);
        fail("delete the conversation", error);
        this.kinds.delete(conversationId);
    }

    // -- metering ------------------------------------------------------------

    /**
     * The client meter mirrors the gateway's: the edge function is the real
     * cap (it refuses before the model is called), and this row is what the
     * family sees. Over the cap, this throws with the same plain wording the
     * function returns.
     */
    async meter(costCents: number, tokens: number): Promise<void> {
        const month = this.ctx.today.slice(0, 7);
        const { data, error } = await supabase.from("wf_ai_usage").select("*").eq("space_id", this.space).eq("month", month).maybeSingle();
        if (error && error.code !== "PGRST116") fail("read the allowance", error);
        const current = obj(data);
        const plan = (s(current.plan, "household") as PlanTier) in PLANS ? (s(current.plan, "household") as PlanTier) : "household";
        const usage: AiUsage = {
            month,
            tokens: n(current.tokens),
            costCents: n(current.cost_cents),
            capCents: n(current.cap_cents, PLANS[plan].aiCapCents),
            warnedAt: nul(current.warned_at),
        };
        if (capState(usage).blocked) throw new Error(HARD_STOP);
        const next: AiUsage = { ...usage, tokens: usage.tokens + Math.max(0, Math.round(tokens)), costCents: usage.costCents + Math.max(0, Math.round(costCents)) };
        const warnedAt = next.warnedAt ?? (capState(next).warn ? new Date().toISOString() : null);
        const { error: upError } = await supabase.from("wf_ai_usage").upsert(
            {
                ...this.stamp(),
                month,
                tokens: next.tokens,
                cost_cents: next.costCents,
                cap_cents: next.capCents,
                warned_at: warnedAt,
                plan,
            },
            { onConflict: "space_id,month" },
        );
        fail("record the usage", upError);
    }

    async setPlan(plan: PlanTier): Promise<void> {
        if (this.ctx.role !== "parent") this.deny();
        const { error } = await supabase.from("wf_ai_usage").upsert(
            { ...this.stamp(), month: this.ctx.today.slice(0, 7), plan, cap_cents: PLANS[plan].aiCapCents, warned_at: null },
            { onConflict: "space_id,month" },
        );
        fail("change the plan", error);
    }

    // -- projects ------------------------------------------------------------

    async addProject(name: string, childSafe: boolean): Promise<CreativeProject> {
        if (this.ctx.role === "guest") this.deny();
        const { data, error } = await supabase
            .from("wf_creative_projects")
            .insert({ ...this.stamp(), owner_member_id: this.ctx.me.id, name: name.trim() || "Untitled", child_safe: this.ctx.role === "child" ? true : childSafe })
            .select("*")
            .single();
        fail("add the project", error);
        return mapProject(obj(data));
    }

    async removeProject(id: string): Promise<void> {
        const { error } = await supabase.from("wf_creative_projects").delete().eq("id", id);
        fail("remove the project", error);
    }
}
