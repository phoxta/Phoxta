import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { CalendarClock, Film, Images, Plus, Sparkles, Upload } from "lucide-react";
import { shortDate } from "@/lib/format";
import { useModule, useModuleState } from "@/state/data";
import { useSpace } from "@/state/space";
import { MoreLink, Notice, PageTitle, Section, Stat } from "@/components/shared";
import { Button, Tag } from "@/components/ui/primitives";
import memoriesModule from "../module";
import {
    albumHref,
    albumsOf,
    dayMonth,
    onThisDay,
    playHref,
    recentPhotos,
    reelHref,
    reelsOf,
    stats,
    timelineHref,
} from "../derive";
import { MEDIA_PLANS, type PlanTier, type StudioSlice, type TravelSlice } from "../types";
import { AlbumCard, Blank, PhotoTile, QuotaBar, ReelCard } from "../components/pieces";
import { AlbumDialog, PhotoDialog, UploadDialog } from "../components/dialogs";

/**
 * The front door of the family's library.
 *
 * A parent sees the whole thing: what happened on this day in earlier years,
 * the reels, the albums, the trips that have come home and made their own
 * album, the last few pictures nobody has filed yet, and how full the library
 * is. A child sees the same story in warmer words and without the sharing
 * desk. A guest sees exactly the albums and reels they were given — the page
 * does not hide the rest, it never receives it.
 */
export default function MemoriesPage() {
    const { state, mutate, loading, error } = useModule(memoriesModule);
    const { me, role, can, today } = useSpace();
    const travel = useModuleState<TravelSlice>("travel");
    const studio = useModuleState<StudioSlice>("studio");

    const [uploadOpen, setUploadOpen] = useState(false);
    const [albumOpen, setAlbumOpen] = useState(false);
    const [openPhotoId, setOpenPhotoId] = useState<string | null>(null);
    const [note, setNote] = useState<string | null>(null);
    const ensured = useRef(false);

    const manage = can("memories.manage");
    const isParent = role === "parent";

    /**
     * AC 9 — a trip that has come home gets its album, without anybody asking.
     * Travel's slice is read (never its repo), the write is idempotent on the
     * trip's id, and it runs once per session.
     */
    useEffect(() => {
        if (!state || !travel?.trips?.length || ensured.current || role !== "parent") return;
        ensured.current = true;
        void mutate(async (r) => {
            const made = await r.ensureTripAlbums(travel.trips);
            if (made.length) setNote(`${made.length === 1 ? "An album was" : `${made.length} albums were`} made for the trips that came home.`);
        }).catch(() => undefined);
    }, [state, travel, role, mutate]);

    const otd = useMemo(() => (state ? onThisDay(state, today) : []), [state, today]);
    const s = useMemo(() => (state ? stats(state, today) : null), [state, today]);
    const unfiled = useMemo(() => {
        if (!state) return [];
        const filed = new Set(state.albumPhotos.map((ap) => ap.photoId));
        return recentPhotos(state, 400).filter((p) => !filed.has(p.id)).slice(0, 12);
    }, [state]);

    const storyboards = useMemo(() => (studio?.items ?? []).filter((i) => i.kind === "story" && (i.data.scenes ?? []).some((sc) => sc.imageUrl)), [studio]);
    const tripsHome = useMemo(() => (travel?.trips ?? []).filter((t) => t.status === "done"), [travel]);

    if (loading && !state) return <p className="text-md text-muted">Opening the library…</p>;
    if (error) return <Notice tone="danger">{error}</Notice>;
    if (!state || !s) return null;

    const albums = albumsOf(state);
    const reels = reelsOf(state);
    const openPhoto = state.photos.find((p) => p.id === openPhotoId) ?? null;

    // -- guest ---------------------------------------------------------------

    if (role === "guest") {
        const empty = !albums.length && !reels.length;
        return (
            <div>
                <PageTitle title="Shared with you" sub={`What the family has opened up for you, ${me.name.split(" ")[0]}.`} area="create" />
                {empty ? (
                    <Blank icon={<Images size={20} aria-hidden="true" />} title="Nothing has been shared yet" body="When the family shares an album or a reel with you, it appears here — and nothing else does." />
                ) : (
                    <>
                        {reels.length > 0 && (
                            <Section title="Reels to watch">
                                <ul className="grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                    {reels.map((r) => (
                                        <ReelCard key={r.id} state={state} reel={r} to={playHref(r.id)} />
                                    ))}
                                </ul>
                            </Section>
                        )}
                        {albums.length > 0 && (
                            <Section title="Albums">
                                <ul className="grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                    {albums.map((a) => (
                                        <AlbumCard key={a.id} state={state} album={a} to={albumHref(a.id)} />
                                    ))}
                                </ul>
                            </Section>
                        )}
                    </>
                )}
            </div>
        );
    }

    // -- child + parent ------------------------------------------------------

    const child = role === "child";

    return (
        <div>
            <PageTitle
                title={child ? "Our pictures" : "Memories"}
                sub={child ? "Albums, the family timeline, and reels to watch." : `${s.photos} pictures, ${s.albums} albums, and a timeline back to ${s.firstYear ?? today.slice(0, 4)}.`}
                area="create"
                actions={
                    manage ? (
                        <>
                            <Button variant="outline" size="md" onClick={() => setUploadOpen(true)}>
                                <Upload size={15} aria-hidden="true" /> Add pictures
                            </Button>
                            <Button size="md" onClick={() => setAlbumOpen(true)}>
                                <Plus size={15} aria-hidden="true" /> New album
                            </Button>
                        </>
                    ) : undefined
                }
            />

            {note && (
                <Notice tone="ok" className="mb-6">
                    {note}
                </Notice>
            )}

            {/* On this day */}
            {otd.length > 0 && (
                <Section
                    title={`On this day · ${dayMonth(today)}`}
                    action={<MoreLink to={timelineHref}>The whole timeline</MoreLink>}
                >
                    <div className="rounded-xl bg-create-soft p-4">
                        {otd.slice(0, 2).map((d) => (
                            <div key={d.year} className="mb-4 last:mb-0">
                                <div className="mb-2 flex flex-wrap items-baseline gap-2">
                                    <span className="font-display text-[19px] text-create-ink">{d.year}</span>
                                    <span className="text-xs text-create-ink/75">
                                        {d.yearsAgo} {d.yearsAgo === 1 ? "year" : "years"} ago
                                    </span>
                                    {d.events[0] && <span className="text-sm font-medium text-create-ink">— {d.events[0].title}</span>}
                                </div>
                                <ul className="grid grid-cols-4 gap-2 md:grid-cols-8">
                                    {d.photos.slice(0, 8).map((p) => (
                                        <li key={p.id}>
                                            <PhotoTile photo={p} small onOpen={() => setOpenPhotoId(p.id)} />
                                        </li>
                                    ))}
                                </ul>
                                {d.events.length > 0 && (
                                    <p className="mt-2 text-sm leading-5 text-create-ink/85">
                                        {d.events[0].body}{" "}
                                        <Link to={d.events[0].href} className="font-semibold underline underline-offset-4">
                                            Open it
                                        </Link>
                                    </p>
                                )}
                            </div>
                        ))}
                    </div>
                </Section>
            )}

            {/* Reels */}
            <Section
                title={child ? "Reels to watch" : "Memory reels"}
                action={reels.length > 3 ? <MoreLink to={timelineHref}>The timeline</MoreLink> : undefined}
            >
                {reels.length ? (
                    <ul className="grid-cols-[minmax(0,1fr)] rail md:grid md:grid-cols-3 md:gap-4 md:overflow-visible md:p-0 md:[margin:0]">
                        {reels.map((r) => (
                            <ReelCard key={r.id} state={state} reel={r} to={r.status === "ready" ? playHref(r.id) : reelHref(r.id)} />
                        ))}
                    </ul>
                ) : (
                    <Blank icon={<Film size={20} aria-hidden="true" />} title="No reels yet" body="A reel is an album, played — pictures, captions and a slow drift, shared by a link." />
                )}
                {manage && (
                    <p className="mt-3 text-sm text-caption">
                        Reels are a playlist, not a video file: nothing is encoded and nothing is downloaded. On {MEDIA_PLANS[state.plan].name} a reel runs to {MEDIA_PLANS[state.plan].maxFrames} frames.
                    </p>
                )}
            </Section>

            {/* Albums */}
            <Section title="Albums" action={<MoreLink to={timelineHref}>Timeline</MoreLink>}>
                {albums.length ? (
                    <ul className="grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {albums.map((a) => (
                            <AlbumCard key={a.id} state={state} album={a} to={albumHref(a.id)} />
                        ))}
                    </ul>
                ) : (
                    <Blank
                        icon={<Images size={20} aria-hidden="true" />}
                        title="No albums yet"
                        body="An album is a stretch of time — a trip, a birthday, a season — with the pictures in the order they happened."
                        action={manage ? <Button onClick={() => setAlbumOpen(true)}>Make the first one</Button> : undefined}
                    />
                )}
            </Section>

            {/* Trips that came home */}
            {isParent && tripsHome.length > 0 && (
                <Section title="Trips that came home">
                    <ul className="space-y-2">
                        {tripsHome.map((t) => {
                            const album = state.albums.find((a) => a.tripId === t.id);
                            return (
                                <li key={t.id} className="flex flex-wrap items-center gap-3 rounded-lg bg-card px-4 py-3">
                                    <span className="min-w-0 flex-1">
                                        <span className="block text-md font-semibold">{t.title}</span>
                                        <span className="block text-xs text-caption">
                                            {t.destination}
                                            {t.endDate ? ` · home ${shortDate(t.endDate)}` : ""}
                                        </span>
                                    </span>
                                    {album ? (
                                        <>
                                            <Tag tone="ok">Album made</Tag>
                                            <Link to={albumHref(album.id)} className="text-sm font-semibold text-brand underline-offset-4 hover:underline">
                                                Open
                                            </Link>
                                        </>
                                    ) : (
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() =>
                                                void mutate(async (r) => {
                                                    await r.ensureTripAlbums([t]);
                                                    setNote(`An album was made for ${t.title}.`);
                                                })
                                            }
                                        >
                                            Make the album
                                        </Button>
                                    )}
                                </li>
                            );
                        })}
                    </ul>
                    <p className="mt-2 text-xs text-caption">Albums are made on their own the day a trip is marked finished; this is only here so you can see it happen.</p>
                </Section>
            )}

            {/* Storyboards from the studio */}
            {manage && storyboards.length > 0 && (
                <Section title="Storyboards to play">
                    <ul className="space-y-2">
                        {storyboards.map((story) => {
                            const made = state.reels.find((r) => r.storyboardId === story.id);
                            return (
                                <li key={story.id} className="flex flex-wrap items-center gap-3 rounded-lg bg-card px-4 py-3">
                                    <Sparkles size={16} className="text-create" aria-hidden="true" />
                                    <span className="min-w-0 flex-1">
                                        <span className="block text-md font-semibold">{story.title}</span>
                                        <span className="block text-xs text-caption">{(story.data.scenes ?? []).length} scenes, from the studio</span>
                                    </span>
                                    {made ? (
                                        <Link to={playHref(made.id)} className="text-sm font-semibold text-brand underline-offset-4 hover:underline">
                                            Play it
                                        </Link>
                                    ) : (
                                        <Button size="sm" variant="outline" onClick={() => void mutate((r) => r.reelFromStoryboard(story))}>
                                            Play as a reel
                                        </Button>
                                    )}
                                </li>
                            );
                        })}
                    </ul>
                </Section>
            )}

            {/* The last few, unfiled */}
            {unfiled.length > 0 && (
                <Section title="Lately">
                    <ul className="grid grid-cols-4 gap-2 md:grid-cols-6 lg:grid-cols-8">
                        {unfiled.map((p) => (
                            <li key={p.id}>
                                <PhotoTile photo={p} small onOpen={() => setOpenPhotoId(p.id)} />
                            </li>
                        ))}
                    </ul>
                </Section>
            )}

            {/* Numbers + the plan */}
            <Section title="The library">
                <div className="grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <Stat label="Pictures" value={s.photos} sub={`${s.videos} clips · ${s.favourites} favourites`} />
                    <Stat label="Albums" value={s.albums} sub={`${s.reels} reels`} />
                    <Stat label="This year" value={`${s.monthsThisYear}/12`} sub="months with a picture" tone="create" />
                    <Stat label="Since" value={s.firstYear ?? "—"} sub={`to ${s.lastYear ?? "—"}`} />
                </div>
                {isParent && (
                    <div className="mt-4 grid grid-cols-[minmax(0,1fr)] gap-4 md:grid-cols-2">
                        <QuotaBar state={state} />
                        <div className="rounded-lg bg-card p-4">
                            <p className="text-xs font-medium uppercase tracking-[0.06em] text-muted">The plan</p>
                            <div className="mt-3 flex flex-wrap gap-2" role="radiogroup" aria-label="Plan">
                                {(Object.keys(MEDIA_PLANS) as PlanTier[]).map((tier) => (
                                    <button
                                        key={tier}
                                        type="button"
                                        role="radio"
                                        aria-checked={state.plan === tier}
                                        onClick={() => void mutate((r) => r.setPlan(tier))}
                                        className={`rounded-full border px-3.5 py-1.5 text-sm font-semibold ${state.plan === tier ? "border-brand bg-brand-soft text-brand-ink" : "border-line-strong text-muted hover:text-ink"}`}
                                    >
                                        {MEDIA_PLANS[tier].name}
                                    </button>
                                ))}
                            </div>
                            <p className="mt-3 text-sm leading-5 text-muted">{MEDIA_PLANS[state.plan].note}</p>
                            <p className="mt-1.5 text-xs text-caption">{MEDIA_PLANS[state.plan].price} · {MEDIA_PLANS[state.plan].maxReels} reels · {MEDIA_PLANS[state.plan].maxLinks} live links</p>
                        </div>
                    </div>
                )}
            </Section>

            <div className="rounded-xl bg-card p-4">
                <Link to={timelineHref} className="flex items-center gap-3">
                    <span className="grid size-11 shrink-0 place-items-center rounded-full bg-create text-white">
                        <CalendarClock size={19} aria-hidden="true" />
                    </span>
                    <span className="min-w-0 flex-1">
                        <span className="block text-base font-semibold">The family timeline</span>
                        <span className="block text-sm text-muted">Every album, celebration, answered prayer, badge, milestone and trip, in the order it happened.</span>
                    </span>
                </Link>
            </div>

            <UploadDialog open={uploadOpen} onClose={() => setUploadOpen(false)} today={today} albums={albums} onAdd={(photos, albumId) => mutate((r) => r.addPhotos(photos, albumId))} />
            <AlbumDialog open={albumOpen} onClose={() => setAlbumOpen(false)} today={today} onSave={(d) => mutate((r) => r.addAlbum(d))} />
            <PhotoDialog
                open={Boolean(openPhoto)}
                onClose={() => setOpenPhotoId(null)}
                photo={openPhoto}
                canEdit={Boolean(openPhoto && (manage || openPhoto.addedBy === me.id))}
                onSave={(patch) => mutate((r) => r.updatePhoto(openPhoto?.id ?? "", patch))}
                onFavourite={() => mutate((r) => r.toggleFavourite(openPhoto?.id ?? ""))}
            />
        </div>
    );
}
