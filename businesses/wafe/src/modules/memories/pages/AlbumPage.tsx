import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ChevronLeft, ChevronRight, Film, Pencil, Share2, Sparkles, Trash2, Upload } from "lucide-react";
import { useAi } from "@/lib/ai";
import { shortDate } from "@/lib/format";
import { useModule } from "@/state/data";
import { useSpace } from "@/state/space";
import { Confirm, MemberChips, Notice, PageTitle, Section } from "@/components/shared";
import { Button, Tag } from "@/components/ui/primitives";
import memoriesModule from "../module";
import { HREF, albumCount, albumDates, albumPhotos, albumRows, grantsFor, reelHref } from "../derive";
import { MEDIA_PLANS, type SharedView } from "../types";
import { BackLink, Blank, PhotoTile } from "../components/pieces";
import { AlbumDialog, PhotoDialog, ShareDialog, UploadDialog } from "../components/dialogs";

/**
 * One album.
 *
 * The pictures in the order the family put them in, with the captions, the
 * people and the places they wrote — and, for whoever may add to it, the three
 * things that make an album a living thing rather than a folder: add
 * pictures, reorder them, and turn the whole thing into a reel.
 *
 * `?t=<token>` opens the album through a share link, which is how somebody who
 * is not in the family sees it at all. That path never reads the filtered
 * slice: it asks the repo to open the token, and gets back exactly this album.
 */
export default function AlbumPage() {
    const { id = "" } = useParams();
    const [params] = useSearchParams();
    const token = params.get("t");
    const { state, repo, mutate, reload, loading, error } = useModule(memoriesModule);
    const { me, can, today, members } = useSpace();
    const { ask, busy: aiBusy, available: aiAvailable } = useAi();
    const navigate = useNavigate();

    const [editOpen, setEditOpen] = useState(false);
    const [uploadOpen, setUploadOpen] = useState(false);
    const [shareOpen, setShareOpen] = useState(false);
    const [openId, setOpenId] = useState<string | null>(null);
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [arrange, setArrange] = useState(false);
    const [shared, setShared] = useState<SharedView | null>(null);
    const [tokenChecked, setTokenChecked] = useState(false);
    const [suggested, setSuggested] = useState<string | null>(null);
    const [aiNote, setAiNote] = useState<string | null>(null);

    const album = state?.albums.find((a) => a.id === id);

    // The token path, for a link opened by someone the slice does not reach.
    useEffect(() => {
        if (!token || !repo || album) {
            if (!token) setTokenChecked(true);
            return;
        }
        let live = true;
        void repo.openShared(token).then((v) => {
            if (!live) return;
            setShared(v && v.objectType === "album" ? v : null);
            setTokenChecked(true);
        });
        return () => {
            live = false;
        };
    }, [token, repo, album]);

    const photos = useMemo(() => (state && album ? albumPhotos(state, album.id) : []), [state, album]);

    if (loading && !state) return <p className="text-md text-muted">Opening the album…</p>;
    if (error) return <Notice tone="danger">{error}</Notice>;
    if (!state) return null;

    // -- opened by a link ----------------------------------------------------

    if (!album && token) {
        if (!tokenChecked) return <p className="text-md text-muted">Checking the link…</p>;
        if (!shared || !shared.album) {
            return (
                <div>
                    <Blank title="That link has expired" body="Share links stop working after their day, and the family can stop one at any moment. Ask them for a new one." />
                </div>
            );
        }
        const sortedShared = [...shared.photos].sort((a, b) => a.takenAt.localeCompare(b.takenAt));
        return (
            <div>
                <PageTitle title={shared.album.title} sub={`${shared.sharedBy} shared this with you. The link works until ${shortDate(shared.expiresAt)}.`} area="create" />
                {shared.album.description && <p className="-mt-3 mb-6 max-w-2xl text-md leading-6 text-muted">{shared.album.description}</p>}
                <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                    {sortedShared.map((p) => (
                        <li key={p.id}>
                            <PhotoTile photo={p} onOpen={() => setOpenId(p.id)} />
                        </li>
                    ))}
                </ul>
                <PhotoDialog open={Boolean(openId)} onClose={() => setOpenId(null)} photo={sortedShared.find((p) => p.id === openId) ?? null} canEdit={false} onSave={async () => undefined} onFavourite={async () => undefined} />
            </div>
        );
    }

    if (!album) {
        return (
            <div>
                <BackLink to={HREF}>All albums</BackLink>
                <Blank title="That album isn't here" body="It may have been removed, or it may never have been shared with you." />
            </div>
        );
    }

    const manage = can("memories.manage");
    const contribute = manage || album.contributorIds.includes(me.id);
    const rows = albumRows(state, album.id);
    const open = photos.find((p) => p.id === openId) ?? null;
    const granted = grantsFor(state, "album", album.id);
    const contributors = members.filter((m) => album.contributorIds.includes(m.id));

    const suggestCaptions = async (): Promise<void> => {
        setAiNote(null);
        try {
            const r = await ask({
                action: "ask",
                prompt: `Suggest one short caption, in the family's own voice, for the next picture in the album "${album.title}". Use only what you know about this album and the family.`,
                extraContext: `Album: "${album.title}" — ${album.description}. ${albumCount(state, album.id)} pictures between ${album.dateFrom} and ${album.dateTo}. Existing captions: ${photos.slice(0, 8).map((p) => p.caption).filter(Boolean).join("; ")}`,
            });
            if (r.unavailable) setAiNote(r.unavailable);
            else setSuggested(r.text.trim());
        } catch {
            setAiNote("The companion couldn't answer just now.");
        }
    };

    return (
        <div>
            <BackLink to={HREF}>All albums</BackLink>

            <PageTitle
                title={album.title}
                sub={`${albumCount(state, album.id)} pictures · ${albumDates(album)}`}
                area="create"
                actions={
                    <>
                        {contribute && (
                            <Button variant="outline" size="md" onClick={() => setUploadOpen(true)}>
                                <Upload size={15} aria-hidden="true" /> Add
                            </Button>
                        )}
                        {manage && (
                            <>
                                <Button variant="outline" size="md" onClick={() => setShareOpen(true)}>
                                    <Share2 size={15} aria-hidden="true" /> Share
                                </Button>
                                <Button
                                    size="md"
                                    onClick={() =>
                                        void mutate(async (r) => {
                                            const reelId = await r.reelFromAlbum(album.id);
                                            navigate(reelHref(reelId));
                                        })
                                    }
                                >
                                    <Film size={15} aria-hidden="true" /> Make a reel
                                </Button>
                            </>
                        )}
                    </>
                }
            />

            {album.description && <p className="-mt-3 mb-5 max-w-2xl text-md leading-6 text-muted">{album.description}</p>}

            <div className="mb-6 flex flex-wrap items-center gap-3">
                {album.auto && <Tag tone="create">Made when the trip came home</Tag>}
                {album.visibility === "shared" && <Tag tone="warn">Only the people you chose</Tag>}
                {album.visibility === "family" && !album.childSafe && <Tag tone="warn">Not shown to the children</Tag>}
                {granted.length > 0 && (
                    <span className="inline-flex items-center gap-2 text-xs text-caption">
                        Shared with <MemberChips memberIds={granted} />
                    </span>
                )}
                {contributors.length > 0 && (
                    <span className="inline-flex items-center gap-2 text-xs text-caption">
                        Anyone can add: <MemberChips memberIds={contributors.map((m) => m.id)} />
                    </span>
                )}
                {manage && (
                    <>
                        <Button size="sm" variant="ghost" onClick={() => setEditOpen(true)}>
                            <Pencil size={13} aria-hidden="true" /> Edit
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setArrange((a) => !a)} aria-pressed={arrange}>
                            {arrange ? "Done arranging" : "Arrange"}
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(true)}>
                            <Trash2 size={13} aria-hidden="true" /> Delete
                        </Button>
                    </>
                )}
            </div>

            {photos.length ? (
                <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                    {photos.map((p, i) => (
                        <li key={p.id} className="relative">
                            <PhotoTile photo={p} onOpen={() => setOpenId(p.id)} />
                            {arrange && (
                                <div className="absolute inset-x-1 bottom-1 flex items-center justify-between gap-1">
                                    <button type="button" aria-label="Move earlier" disabled={i === 0} onClick={() => void mutate((r) => r.moveInAlbum(album.id, p.id, -1))} className="grid size-7 place-items-center rounded-full bg-black/60 text-white disabled:opacity-30">
                                        <ChevronLeft size={14} aria-hidden="true" />
                                    </button>
                                    <button type="button" aria-label="Take out of this album" onClick={() => void mutate((r) => r.removeFromAlbum(album.id, p.id))} className="grid size-7 place-items-center rounded-full bg-black/60 text-white">
                                        <Trash2 size={13} aria-hidden="true" />
                                    </button>
                                    <button type="button" aria-label="Move later" disabled={i === rows.length - 1} onClick={() => void mutate((r) => r.moveInAlbum(album.id, p.id, 1))} className="grid size-7 place-items-center rounded-full bg-black/60 text-white disabled:opacity-30">
                                        <ChevronRight size={14} aria-hidden="true" />
                                    </button>
                                </div>
                            )}
                        </li>
                    ))}
                </ul>
            ) : (
                <Blank
                    title="Nothing in it yet"
                    body="Add the pictures — captions, people and places can come later, and the reel comes out of the album."
                    action={contribute ? <Button onClick={() => setUploadOpen(true)}>Add pictures</Button> : undefined}
                />
            )}

            {manage && photos.length > 0 && (
                <Section className="mt-10" title="The companion">
                    <div className="rounded-lg bg-card p-4">
                        <p className="text-sm leading-5 text-muted">Stuck for a caption? It reads this album and nothing else, and it proposes — you decide.</p>
                        <Button className="mt-3" size="md" variant="outline" loading={aiBusy} disabled={!aiAvailable} onClick={() => void suggestCaptions()}>
                            <Sparkles size={15} aria-hidden="true" /> Suggest a caption
                        </Button>
                        {!aiAvailable && <p className="mt-2 text-xs text-caption">The companion needs the backend configured for this build.</p>}
                        {aiNote && <Notice tone="info" className="mt-3">{aiNote}</Notice>}
                        {suggested && (
                            <div className="mt-3 rounded-sm bg-page p-3">
                                <p className="text-md leading-6">{suggested}</p>
                                <p className="mt-2 text-xs text-caption">Open a picture and paste it in if you like it.</p>
                            </div>
                        )}
                    </div>
                </Section>
            )}

            {manage && (
                <p className="mt-8 text-xs text-caption">
                    On {MEDIA_PLANS[state.plan].name}, a reel from this album takes its first {Math.min(albumCount(state, album.id), MEDIA_PLANS[state.plan].maxFrames)} pictures.
                </p>
            )}

            <UploadDialog open={uploadOpen} onClose={() => setUploadOpen(false)} today={today} albums={state.albums} defaultAlbumId={album.id} onAdd={(list, albumId) => mutate((r) => r.addPhotos(list, albumId))} />
            <AlbumDialog open={editOpen} onClose={() => setEditOpen(false)} initial={album} today={today} onSave={(d) => mutate((r) => r.updateAlbum(album.id, d))} />
            <ShareDialog
                open={shareOpen}
                onClose={() => setShareOpen(false)}
                state={state}
                objectType="album"
                objectId={album.id}
                name={album.title}
                today={today}
                onGrant={(ids) => mutate((r) => r.grant("album", album.id, ids))}
                onCreateLink={async (days) => {
                    const link = await repo.createLink("album", album.id, days);
                    await reload();
                    return link;
                }}
                onRevokeLink={(linkId) => mutate((r) => r.revokeLink(linkId))}
            />
            <PhotoDialog
                open={Boolean(open)}
                onClose={() => setOpenId(null)}
                photo={open}
                albumTitle={album.title}
                canEdit={Boolean(open && (manage || open.addedBy === me.id))}
                onSave={(patch) => mutate((r) => r.updatePhoto(open?.id ?? "", patch))}
                onFavourite={() => mutate((r) => r.toggleFavourite(open?.id ?? ""))}
                onRemove={manage ? () => void mutate((r) => r.removeFromAlbum(album.id, open?.id ?? "")).then(() => setOpenId(null)) : undefined}
            />
            <Confirm
                open={confirmDelete}
                onClose={() => setConfirmDelete(false)}
                title={`Delete "${album.title}"?`}
                body="The album goes; the pictures stay in the library. Anyone you shared it with loses it, and its links stop working."
                confirmLabel="Delete the album"
                danger
                onConfirm={async () => {
                    await mutate((r) => r.removeAlbum(album.id));
                    navigate(HREF);
                }}
            />
        </div>
    );
}
