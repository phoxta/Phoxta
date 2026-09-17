import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Copy, Film, Play, Trash2 } from "lucide-react";
import type { Visibility } from "@/data/core";
import { useAi } from "@/lib/ai";
import { relative } from "@/lib/format";
import { useModule } from "@/state/data";
import { useSpace } from "@/state/space";
import { useToast } from "@/state/toast";
import { Confirm, EmptyModule, Notice, PageTitle, Section, VisibilityPicker } from "@/components/shared";
import { Button, Card, Field, Tag } from "@/components/ui/primitives";
import { Dialog } from "@/components/ui/overlay";
import studioModule from "../module";
import { BASE, COST, capState, itemById, itemsOfKind, planOf } from "../derive";
import { IMAGE_UNAVAILABLE } from "../generate";
import { LeadSheet, PresentDeck, Recorder, SceneArt, SingAlong, TypographicCard } from "../components/studio";
import { SourceChips, Turn } from "../components/companion";
import { SONG_KIND_LABEL, type SceneImageKind } from "../types";

/**
 * One thing in the studio, open.
 *
 * A song is a lead sheet you can sing from, record over and share. A
 * storyboard is six scenes you can fill with the family's own photographs,
 * present in the room, or hand to Memories to play as a reel — the studio does
 * not own a second player. A picture is a picture, or the honest card with the
 * prompt kept. A conversation is the transcript with its sources and any
 * proposal still waiting on a yes, which is also how a parent reads what a
 * child asked.
 */

export default function ItemPage() {
    const { id = "" } = useParams();
    const navigate = useNavigate();
    const { state, repo, mutate, reload, loading, error } = useModule(studioModule);
    const { me, role, members } = useSpace();
    const { toast } = useToast();
    const { ask, available } = useAi();

    const [renaming, setRenaming] = useState<string | null>(null);
    const [sharing, setSharing] = useState(false);
    const [visibility, setVisibility] = useState<Visibility>("family");
    const [sharedWith, setSharedWith] = useState<string[]>([]);
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [singing, setSinging] = useState(false);
    const [presenting, setPresenting] = useState(false);
    const [sceneEditing, setSceneEditing] = useState<number | null>(null);
    const [sceneUrl, setSceneUrl] = useState("");
    const [busy, setBusy] = useState(false);
    const [notice, setNotice] = useState<string | null>(null);

    const item = useMemo(() => (state ? itemById(state, id) : undefined), [state, id]);
    const pictures = useMemo(() => (state ? itemsOfKind(state, "image").filter((i) => i.data.url) : []), [state]);

    if (loading && !state) return <p className="text-md text-muted">Opening it…</p>;
    if (error) return <Notice tone="danger">{error}</Notice>;
    if (!state) return null;

    if (!item) {
        return (
            <div>
                <PageTitle title="Not here" sub="This may have been taken down, or it may belong to someone whose things you cannot see." area="create" />
                <EmptyModule
                    title="Nothing at that address"
                    body="The gallery has everything the family has made that you are allowed to open."
                    action={
                        <Link to={`${BASE}/gallery`} className="inline-flex h-11 items-center rounded-full bg-brand px-5 text-md font-semibold text-white">
                            Back to the gallery
                        </Link>
                    }
                />
            </div>
        );
    }

    const editable = item.memberId === me.id || role === "parent";
    const owner = members.find((m) => m.id === item.memberId);
    const plan = planOf(state);
    const cap = capState(state.usage);

    const openShare = () => {
        setVisibility(item.visibility);
        setSharedWith(item.sharedWith);
        setSharing(true);
    };

    const copyLink = async (url: string) => {
        try {
            await navigator.clipboard.writeText(url);
            toast("Address copied — paste it onto a moodboard.", "success");
        } catch {
            toast("This browser would not let Wàfè copy it.", "danger");
        }
    };

    const setScene = async (n: number, url: string | null, kind: SceneImageKind) => {
        setBusy(true);
        try {
            await mutate((r) => r.setSceneImage(item.id, n, url, kind));
            setSceneEditing(null);
            setSceneUrl("");
        } finally {
            setBusy(false);
        }
    };

    const generateScene = async (n: number, visual: string) => {
        if (item.kind !== "story") return;
        setBusy(true);
        setNotice(null);
        try {
            if (!plan.images) {
                setNotice(`${IMAGE_UNAVAILABLE} The ${plan.name} plan has no image model, so use a family photograph for this scene instead.`);
            } else if (cap.blocked) {
                setNotice(cap.message);
            } else if (!available) {
                setNotice(`${IMAGE_UNAVAILABLE} (This build has no backend configured.)`);
            } else {
                const r = await ask<{ url?: string }>({ action: "image", prompt: visual, payload: { prompt: visual, childSafe: true } });
                if (r.unavailable || !r.data?.url) setNotice(r.unavailable ?? IMAGE_UNAVAILABLE);
                else {
                    await mutate(async (repoRef) => {
                        await repoRef.setSceneImage(item.id, n, r.data!.url!, "ai");
                        await repoRef.meter(COST.image, 0);
                    });
                    setSceneEditing(null);
                }
            }
        } catch (e) {
            setNotice(e instanceof Error ? e.message : "That picture could not be made.");
        } finally {
            setBusy(false);
        }
    };

    const sendToReel = async () => {
        setBusy(true);
        try {
            await repo.sendToReel(item.id);
            await reload();
            toast("Sent to Memories — it plays in the reel player there.", "success");
        } catch (e) {
            toast(e instanceof Error ? e.message : "It could not be sent.", "danger");
        } finally {
            setBusy(false);
        }
    };

    const remove = async () => {
        if (item.kind === "chat") await mutate((r) => r.removeConversation(item.id));
        else await mutate((r) => r.remove(item.id));
        navigate(item.kind === "chat" ? BASE : `${BASE}/gallery`);
    };

    const KIND_LABEL = { song: "Song", story: "Storyboard", image: "Picture", chat: "Conversation" } as const;

    return (
        <div>
            <Link to={item.kind === "chat" ? BASE : `${BASE}/gallery`} className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-brand underline-offset-4 hover:underline">
                <ArrowLeft size={15} aria-hidden="true" /> {item.kind === "chat" ? "Back to the companion" : "Back to the gallery"}
            </Link>

            <PageTitle
                title={item.title}
                sub={`${KIND_LABEL[item.kind]} · by ${owner?.name ?? "someone"} · ${relative(item.createdAt)}`}
                area="create"
                actions={
                    editable ? (
                        <>
                            <Button variant="outline" size="md" onClick={() => setRenaming(item.title)}>
                                Rename
                            </Button>
                            {item.kind !== "chat" && (
                                <Button variant="outline" size="md" onClick={openShare}>
                                    Who can see it
                                </Button>
                            )}
                            <Button variant="danger" size="md" onClick={() => setConfirmDelete(true)}>
                                <Trash2 size={15} aria-hidden="true" /> Delete
                            </Button>
                        </>
                    ) : undefined
                }
            />

            {notice && (
                <Notice tone="info" className="mb-6">
                    {notice}
                </Notice>
            )}

            {/* ---- Song ---- */}
            {item.kind === "song" && (
                <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
                    <LeadSheet song={item.data} title={item.title} />
                    <div className="space-y-6">
                        <Card>
                            <h2 className="font-display text-xl leading-6">Sing it</h2>
                            <p className="mt-1 text-sm leading-5 text-muted">Big type, one line at a time, moving at {item.data.tempo} beats a minute. Space to pause, arrows to step.</p>
                            <Button className="mt-3" onClick={() => setSinging(true)}>
                                <Play size={16} aria-hidden="true" /> Sing along
                            </Button>
                        </Card>
                        <Card>
                            <h2 className="font-display text-xl leading-6">Record us singing it</h2>
                            <p className="mt-1 mb-3 text-sm leading-5 text-muted">
                                Wàfè writes the words and the chords, not the audio — there is no licensed music model behind it. The take you record here is the family&apos;s own, and Memories can use it as the track under a reel.
                            </p>
                            <Recorder
                                recording={item.data.recording}
                                disabled={!editable}
                                onSave={(rec) => mutate((r) => r.attachRecording(item.id, rec))}
                                onClear={() => mutate((r) => r.attachRecording(item.id, null))}
                            />
                        </Card>
                        <Card>
                            <h2 className="font-display text-xl leading-6">About this song</h2>
                            <dl className="mt-2 space-y-1.5 text-sm">
                                <div className="flex justify-between gap-3">
                                    <dt className="text-muted">Kind</dt>
                                    <dd className="font-semibold">{SONG_KIND_LABEL[item.data.songKind]}</dd>
                                </div>
                                <div className="flex justify-between gap-3">
                                    <dt className="text-muted">Written by</dt>
                                    <dd className="font-semibold">{item.data.source === "ai" ? "The companion" : "Wàfè's own words"}</dd>
                                </div>
                                <div className="flex justify-between gap-3">
                                    <dt className="text-muted">Sections</dt>
                                    <dd className="font-semibold">{item.data.structure.map((s) => s.section).join(" · ")}</dd>
                                </div>
                            </dl>
                            {item.data.prompt && <p className="mt-3 text-xs leading-5 text-caption">Asked for: &ldquo;{item.data.prompt}&rdquo;</p>}
                        </Card>
                    </div>
                </div>
            )}

            {/* ---- Storyboard ---- */}
            {item.kind === "story" && (
                <div>
                    <div className="mb-6 flex flex-wrap items-center gap-2">
                        <Button onClick={() => setPresenting(true)}>
                            <Play size={16} aria-hidden="true" /> Present it
                        </Button>
                        {editable && (
                            <Button variant="outline" onClick={() => void sendToReel()} loading={busy}>
                                <Film size={16} aria-hidden="true" /> {item.data.sentToReelAt ? "Send to Memories again" : "Send to Memories as a reel"}
                            </Button>
                        )}
                        {item.data.sentToReelAt && (
                            <Link to="/create/memories" className="inline-flex h-11 items-center rounded-full border border-line-strong bg-card px-5 text-md font-semibold">
                                Watch it in the reel player
                            </Link>
                        )}
                    </div>
                    {item.data.sentToReelAt && (
                        <Notice tone="ok" className="mb-6">
                            Sent to Memories {relative(item.data.sentToReelAt)}. Reels play and are shared from there — the studio deliberately has no second player of its own.
                        </Notice>
                    )}
                    <ul className="grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {item.data.scenes.map((scene) => (
                            <li key={scene.n} className="flex flex-col rounded-xl bg-card p-3">
                                <SceneArt scene={scene} />
                                <p className="mt-3 text-2xs font-semibold uppercase tracking-[0.08em] text-caption">
                                    {scene.n}. {scene.caption}
                                </p>
                                <p className="mt-1 text-base leading-6">{scene.narration}</p>
                                <p className="mt-2 text-xs leading-5 text-caption">{scene.visual}</p>
                                {editable && (
                                    <div className="mt-3 flex flex-wrap gap-2 pt-1">
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => {
                                                setSceneEditing(scene.n);
                                                setSceneUrl(scene.imageUrl ?? "");
                                                setNotice(null);
                                            }}
                                        >
                                            {scene.imageUrl ? "Change the picture" : "Add a picture"}
                                        </Button>
                                        {scene.imageUrl && (
                                            <Button size="sm" variant="ghost" onClick={() => void setScene(scene.n, null, "none")}>
                                                Clear
                                            </Button>
                                        )}
                                    </div>
                                )}
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {/* ---- Picture ---- */}
            {item.kind === "image" && (
                <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
                    {item.data.url ? (
                        <img src={item.data.url} alt={item.data.prompt} width={960} height={720} loading="lazy" className="w-full rounded-xl object-cover" />
                    ) : (
                        <TypographicCard prompt={item.data.prompt} palette={item.data.palette} title={item.title} />
                    )}
                    <div className="space-y-4">
                        <Tag tone={item.data.status === "generated" ? "create" : "neutral"}>{item.data.status === "generated" ? "Generated" : "Typographic card"}</Tag>
                        {item.data.status !== "generated" && <Notice tone="info">{item.data.note || IMAGE_UNAVAILABLE}</Notice>}
                        <Card>
                            <h2 className="font-display text-xl leading-6">The prompt, kept</h2>
                            <p className="mt-1.5 text-md leading-6">{item.data.prompt}</p>
                        </Card>
                        {item.data.url && (
                            <Button variant="outline" onClick={() => void copyLink(item.data.url!)}>
                                <Copy size={15} aria-hidden="true" /> Copy the address for a moodboard
                            </Button>
                        )}
                    </div>
                </div>
            )}

            {/* ---- Conversation ---- */}
            {item.kind === "chat" && (
                <div className="max-w-3xl">
                    {item.memberId !== me.id && (
                        <Notice tone="info" className="mb-5">
                            This is {owner?.name.split(" ")[0] ?? "a child"}&apos;s conversation. Children&apos;s conversations are open to their parents by default, and they are told so before they type.
                        </Notice>
                    )}
                    <div className="space-y-4">
                        {item.data.messages.map((m) => (
                            <Turn key={m.id} message={m} onDecide={editable ? (proposalId, status) => mutate((r) => r.decideProposal(item.id, proposalId, status)) : undefined} />
                        ))}
                    </div>
                    {!item.data.messages.length && <EmptyModule title="Nothing was said" body="This conversation was started and then left." />}
                    <Section title="What it read" className="mt-8">
                        <Card>
                            <SourceChips sources={item.data.messages.flatMap((m) => m.sources)} />
                            {!item.data.messages.some((m) => m.sources.length) && <p className="text-sm text-muted">Nothing — this one never reached the family&apos;s data.</p>}
                        </Card>
                    </Section>
                </div>
            )}

            {/* ---- overlays ---- */}
            {singing && item.kind === "song" && <SingAlong song={item.data} title={item.title} onClose={() => setSinging(false)} />}
            {presenting && item.kind === "story" && <PresentDeck story={item.data} title={item.title} onClose={() => setPresenting(false)} />}

            <Dialog open={renaming !== null} onClose={() => setRenaming(null)} title="Rename">
                <form
                    onSubmit={async (e) => {
                        e.preventDefault();
                        const next = renaming ?? "";
                        setRenaming(null);
                        await mutate((r) => r.rename(item.id, next));
                    }}
                >
                    <Field label="Call it" value={renaming ?? ""} onChange={(e) => setRenaming(e.target.value)} />
                    <div className="mt-4 flex justify-end gap-2">
                        <Button variant="ghost" onClick={() => setRenaming(null)}>
                            Cancel
                        </Button>
                        <Button type="submit">Save</Button>
                    </div>
                </form>
            </Dialog>

            <Dialog open={sharing} onClose={() => setSharing(false)} title="Who can see it" wide>
                <VisibilityPicker value={visibility} onChange={setVisibility} sharedWith={sharedWith} onSharedWith={setSharedWith} />
                <div className="mt-5 flex justify-end gap-2">
                    <Button variant="ghost" onClick={() => setSharing(false)}>
                        Cancel
                    </Button>
                    <Button
                        onClick={async () => {
                            setSharing(false);
                            await mutate((r) => r.share(item.id, visibility, sharedWith));
                        }}
                    >
                        Save
                    </Button>
                </div>
            </Dialog>

            <Dialog open={sceneEditing !== null} onClose={() => setSceneEditing(null)} title="A picture for this scene" wide>
                <p className="text-sm leading-5 text-muted">Use one of the family&apos;s own pictures, paste the address of a photograph, or ask the companion to draw it.</p>
                {pictures.length > 0 && (
                    <ul className="mt-4 grid grid-cols-3 gap-2">
                        {pictures.map((p) => (
                            <li key={p.id}>
                                <button type="button" onClick={() => sceneEditing !== null && void setScene(sceneEditing, p.data.url, "family")} className="block w-full overflow-hidden rounded-md">
                                    <img src={p.data.url ?? ""} alt={p.title} width={200} height={150} loading="lazy" className="aspect-[4/3] w-full object-cover" />
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
                <Field label="Or paste an address" value={sceneUrl} onChange={(e) => setSceneUrl(e.target.value)} placeholder="/images/studio-garden.jpg" className="mt-4" />
                <div className="mt-4 flex flex-wrap justify-end gap-2">
                    <Button variant="ghost" onClick={() => setSceneEditing(null)}>
                        Cancel
                    </Button>
                    <Button
                        variant="outline"
                        loading={busy}
                        onClick={() => {
                            const scene = item.kind === "story" ? item.data.scenes.find((x) => x.n === sceneEditing) : undefined;
                            if (scene) void generateScene(scene.n, scene.visual);
                        }}
                    >
                        Ask the companion to draw it
                    </Button>
                    <Button disabled={!sceneUrl.trim()} loading={busy} onClick={() => sceneEditing !== null && void setScene(sceneEditing, sceneUrl.trim(), "family")}>
                        Use this picture
                    </Button>
                </div>
            </Dialog>

            <Confirm
                open={confirmDelete}
                title={`Delete "${item.title}"?`}
                body="It goes for everyone in the family, and it does not come back."
                confirmLabel="Delete it"
                danger
                onConfirm={remove}
                onClose={() => setConfirmDelete(false)}
            />
        </div>
    );
}
