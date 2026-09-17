import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Play, Sparkles } from "lucide-react";
import { cn } from "@/lib/cn";
import { useAi } from "@/lib/ai";
import { relative } from "@/lib/format";
import { useModule } from "@/state/data";
import { useSpace } from "@/state/space";
import { EmptyModule, MemberAvatar, Notice, PageTitle, Section } from "@/components/shared";
import { Button, Card, Field, Tag } from "@/components/ui/primitives";
import studioModule from "../module";
import { BASE, COST, capState, itemsOfKind, newestFirst } from "../derive";
import { audienceNote, clampStory, templateStory, type StoryBrief } from "../generate";
import { PresentDeck, SceneArt } from "../components/studio";
import type { StoryAudience, StoryData, StudioItem } from "../types";

/**
 * Storyboards.
 *
 * Six scenes with a shape — the ordinary world, the wish, the trouble, the
 * try, the turn, home again — because a child asked for "a story about a
 * volcano" needs a structure more than it needs adjectives. Each scene keeps
 * the visual description even when there is no picture, so a family photograph
 * can be dropped into the slot later and the storyboard still reads.
 *
 * Present mode is here for the room you are standing in. Sending it to
 * Memories is what makes it a REEL — the studio does not own a second player.
 */

const AUDIENCES: StoryAudience[] = ["little", "junior", "teen", "family"];
const AUDIENCE_LABEL: Record<StoryAudience, string> = { little: "For a little one", junior: "For a 7–10", teen: "For a teenager", family: "For everybody" };

const CHILD_IDEAS = [
    "an ant that carries something too big",
    "a boy who climbs inside a volcano",
    "a dog who learns to swim",
    "the day the lights went out",
    "a girl who finds a door in a tree",
    "going to Grandma's for Christmas",
];

export default function StoriesPage() {
    const { state, mutate, loading, error } = useModule(studioModule);
    const { me, role } = useSpace();
    const { ask, available } = useAi();

    const [prompt, setPrompt] = useState("");
    const [audience, setAudience] = useState<StoryAudience>("family");
    const [title, setTitle] = useState("");
    const [draft, setDraft] = useState<StoryData | null>(null);
    const [cost, setCost] = useState(0);
    const [busy, setBusy] = useState(false);
    const [saving, setSaving] = useState(false);
    const [blocked, setBlocked] = useState<string | null>(null);
    const [problem, setProblem] = useState<string | null>(null);
    const [presenting, setPresenting] = useState<Extract<StudioItem, { kind: "story" }> | null>(null);

    const child = role === "child";
    const guest = role === "guest";
    const picker = child && (me.ageBand === "little" || me.ageBand === "junior");

    const stories = useMemo(() => (state ? itemsOfKind(state, "story").sort(newestFirst) : []), [state]);
    const cap = state ? capState(state.usage) : null;

    if (loading && !state) return <p className="text-md text-muted">Opening the storyboards…</p>;
    if (error) return <Notice tone="danger">{error}</Notice>;
    if (!state) return null;

    const brief = (): StoryBrief => ({ prompt: prompt.trim(), audience: child ? (me.ageBand === "little" ? "little" : "junior") : audience, scenes: 6, hero: child ? me.name.split(" ")[0] : "" });

    const generate = async (): Promise<void> => {
        if (!prompt.trim()) return;
        setBusy(true);
        setBlocked(null);
        setProblem(null);
        const b = brief();
        let data = templateStory(b);
        let spent = 0;
        if (cap?.blocked) {
            setBlocked(cap.message);
        } else if (available) {
            try {
                const r = await ask<unknown>({
                    action: "storyboard",
                    prompt: b.prompt,
                    payload: { audience: b.audience, scenes: 6, hero: b.hero },
                });
                if (r.unavailable) setBlocked(r.unavailable);
                else {
                    data = clampStory(r.data, b);
                    spent = COST.storyboard;
                }
            } catch (e) {
                setProblem(e instanceof Error ? e.message : "The companion could not write that. The six-scene shape below is yours to fill in.");
            }
        }
        setDraft(data);
        setCost(spent);
        setTitle((t) => t || b.prompt.charAt(0).toUpperCase() + b.prompt.slice(1, 60));
        if (spent) {
            try {
                await mutate((r) => r.meter(spent, 1600));
            } catch (e) {
                setBlocked(e instanceof Error ? e.message : null);
            }
        }
        setBusy(false);
    };

    const save = async (): Promise<void> => {
        if (!draft) return;
        setSaving(true);
        try {
            await mutate((r) => r.saveStory({ title: title.trim() || "Our story", data: draft, costCents: cost }));
            setDraft(null);
            setCost(0);
            setTitle("");
            setPrompt("");
        } catch (e) {
            setProblem(e instanceof Error ? e.message : "That story could not be saved.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div>
            <PageTitle
                title={child ? "Make a story" : "Storyboards"}
                sub={
                    child
                        ? "Say what it is about and I will make six scenes. Then press Present and it goes big on the screen."
                        : "Six scenes with a caption, a picture and something to read aloud. Put family photographs in the slots, present it in the room, or send it to Memories to play as a reel."
                }
                area="create"
                actions={
                    <Link to={BASE} className="text-sm font-semibold text-brand underline-offset-4 hover:underline">
                        Back to the companion
                    </Link>
                }
            />

            {!guest && (
                <Card className="mb-8">
                    <h2 className="font-display text-2xl leading-7">{child ? "What is your story about?" : "A new storyboard"}</h2>
                    <form
                        className="mt-4 space-y-4"
                        onSubmit={(e) => {
                            e.preventDefault();
                            void generate();
                        }}
                    >
                        {picker ? (
                            <div>
                                <span className="mb-1.5 block text-xs font-medium text-muted">Pick one</span>
                                <div className="grid grid-cols-[minmax(0,1fr)] gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Pick a story">
                                    {CHILD_IDEAS.map((idea) => (
                                        <button
                                            key={idea}
                                            type="button"
                                            role="radio"
                                            aria-checked={prompt === idea}
                                            onClick={() => setPrompt(idea)}
                                            className={cn("rounded-xl border px-4 py-3.5 text-left text-base font-semibold transition-colors", prompt === idea ? "border-brand bg-brand-soft text-brand-ink" : "border-line-strong hover:border-ink")}
                                        >
                                            {idea}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <>
                                <Field label="What happens" value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="Ayo finds an ant carrying a crumb bigger than itself, and helps it home." hint="One sentence. The shape — wish, trouble, try, turn — is added for you." />
                                <div>
                                    <span className="mb-1.5 block text-xs font-medium text-muted">Who is it for</span>
                                    <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Who is the story for">
                                        {AUDIENCES.map((a) => (
                                            <button
                                                key={a}
                                                type="button"
                                                role="radio"
                                                aria-checked={audience === a}
                                                onClick={() => setAudience(a)}
                                                className={cn("rounded-full border px-4 py-2 text-sm font-semibold transition-colors", audience === a ? "border-brand bg-brand-soft text-brand-ink" : "border-line-strong text-muted hover:text-ink")}
                                            >
                                                {AUDIENCE_LABEL[a]}
                                            </button>
                                        ))}
                                    </div>
                                    <p className="mt-1.5 text-xs text-caption">{audienceNote(audience)}</p>
                                </div>
                            </>
                        )}

                        <div className="flex flex-wrap items-center gap-3">
                            <Button type="submit" loading={busy} disabled={!prompt.trim() || Boolean(cap?.blocked)}>
                                <Sparkles size={16} aria-hidden="true" /> {child ? "Make it" : "Make the storyboard"}
                            </Button>
                            {!available && <span className="text-xs text-caption">No backend on this build — you still get the six scenes, with the beats written in.</span>}
                        </div>
                    </form>

                    {blocked && (
                        <Notice tone="warn" className="mt-4">
                            {blocked} The six-scene shape below is still yours.
                        </Notice>
                    )}
                    {problem && (
                        <Notice tone="danger" className="mt-4">
                            {problem}
                        </Notice>
                    )}

                    {draft && (
                        <div className="mt-6">
                            <div className="mb-4 flex flex-wrap items-end gap-3">
                                <Field label="Call it" value={title} onChange={(e) => setTitle(e.target.value)} className="min-w-[240px] flex-1" />
                                <Button onClick={() => void save()} loading={saving}>
                                    Save to the gallery
                                </Button>
                                <Button variant="ghost" onClick={() => setDraft(null)}>
                                    Throw it away
                                </Button>
                            </div>
                            <Tag tone={draft.source === "ai" ? "create" : "neutral"} className="mb-3">
                                {draft.source === "ai" ? "Written by the companion" : "Wàfè's own shape"}
                            </Tag>
                            <ul className="grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                {draft.scenes.map((scene) => (
                                    <li key={scene.n} className="rounded-xl bg-page p-3">
                                        <SceneArt scene={scene} />
                                        <p className="mt-2.5 text-2xs font-semibold uppercase tracking-[0.08em] text-caption">
                                            {scene.n}. {scene.caption}
                                        </p>
                                        <p className="mt-1 text-md leading-6">{scene.narration}</p>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </Card>
            )}

            <Section title={guest ? "Stories the family shared with you" : "The family's stories"} action={<span className="text-xs text-caption">{stories.length} storyboards</span>}>
                {stories.length ? (
                    <ul className="grid grid-cols-[minmax(0,1fr)] gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {stories.map((s) => {
                            const pictures = s.data.scenes.filter((x) => x.imageUrl).length;
                            return (
                                <li key={s.id}>
                                    <Card className="flex h-full flex-col p-0">
                                        <SceneArt scene={s.data.scenes[0]} className="rounded-b-none" />
                                        <div className="flex flex-1 flex-col p-4">
                                            <h3 className="text-[17px] font-semibold leading-6">{s.title}</h3>
                                            <p className="mt-0.5 text-sm text-muted">
                                                {s.data.scenes.length} scenes · {pictures} with a picture
                                                {s.data.sentToReelAt ? " · sent to Memories" : ""}
                                            </p>
                                            <p className="clamp-2 mt-2 text-sm leading-5 text-muted">{s.data.scenes[0]?.narration}</p>
                                            <div className="mt-auto flex flex-wrap items-center gap-2 pt-4">
                                                <Button size="md" variant="brand" onClick={() => setPresenting(s)}>
                                                    <Play size={15} aria-hidden="true" /> Present
                                                </Button>
                                                <Link to={`${BASE}/gallery/${s.id}`} className="inline-flex h-9 items-center rounded-full border border-line-strong bg-card px-4 text-sm font-semibold">
                                                    Open
                                                </Link>
                                                <span className="ml-auto flex items-center gap-2 text-xs text-caption">
                                                    <MemberAvatar memberId={s.memberId} size="xs" /> {relative(s.createdAt)}
                                                </span>
                                            </div>
                                        </div>
                                    </Card>
                                </li>
                            );
                        })}
                    </ul>
                ) : (
                    <EmptyModule
                        title={guest ? "No stories have been shared with you" : "No storyboards yet"}
                        body={guest ? "When the family shares one you can watch it here." : "Ask for one about something that actually happened this week — those are the ones that get read twice."}
                    />
                )}
            </Section>

            {presenting && <PresentDeck story={presenting.data} title={presenting.title} onClose={() => setPresenting(null)} />}
        </div>
    );
}
