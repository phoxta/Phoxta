import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { shortDate } from "@/lib/format";
import { useModule, useModuleState } from "@/state/data";
import { Notice, PageTitle } from "@/components/shared";
import { Button } from "@/components/ui/primitives";
import memoriesModule from "../module";
import { HREF, frameMs, reelHref, reelSlides } from "../derive";
import type { SharedView, StudioSlice } from "../types";
import { Blank } from "../components/pieces";
import { ReelPlayer, type Slide } from "../components/ReelPlayer";

/**
 * Watching a reel.
 *
 * Two ways to arrive. From inside the family, the reel comes out of the loaded
 * slice, which has already been filtered — if it is not yours to see, it is not
 * in it. From outside, `?t=<token>` asks the repo to open the link: the token
 * is the permission, it expires, it can be revoked, and what comes back is one
 * reel with its frames and their pictures and nothing else at all.
 *
 * Either way, nothing is generated and nothing is downloaded: the pictures are
 * the family's own, and the reel is the order they are shown in.
 */
export default function ReelPlayerPage() {
    const { id = "" } = useParams();
    const [params] = useSearchParams();
    const token = params.get("t");
    const { state, repo, loading, error } = useModule(memoriesModule);
    const studio = useModuleState<StudioSlice>("studio");
    const navigate = useNavigate();

    const [shared, setShared] = useState<SharedView | null>(null);
    const [checked, setChecked] = useState(false);

    const reel = state?.reels.find((r) => r.id === id);

    useEffect(() => {
        if (!token || !repo || reel) {
            if (!token) setChecked(true);
            return;
        }
        let live = true;
        void repo.openShared(token).then((v) => {
            if (!live) return;
            setShared(v && v.objectType === "reel" ? v : null);
            setChecked(true);
        });
        return () => {
            live = false;
        };
    }, [token, repo, reel]);

    const slides = useMemo<Slide[]>(() => {
        if (state && reel) {
            return reelSlides(state, reel.id).map(({ frame, photo }) => ({
                id: frame.id,
                url: photo.url,
                alt: photo.caption || `A picture from ${shortDate(photo.takenAt)}`,
                caption: frame.caption || photo.caption,
                ms: frameMs(reel, frame),
            }));
        }
        if (shared?.reel) {
            const by = new Map(shared.photos.map((p) => [p.id, p]));
            return shared.frames
                .map((f) => {
                    const p = by.get(f.photoId);
                    if (!p) return null;
                    return { id: f.id, url: p.url, alt: p.caption || "A family picture", caption: f.caption || p.caption, ms: Math.max(800, f.durationMs ?? shared.reel?.slideMs ?? 4000) };
                })
                .filter((s): s is Slide => Boolean(s));
        }
        return [];
    }, [state, reel, shared]);

    const playing = reel ?? shared?.reel ?? null;

    /** A family recording of the track, when the studio has one. */
    const audioUrl = useMemo(() => {
        if (!playing?.trackItemId) return null;
        const item = studio?.items.find((i) => i.id === playing.trackItemId) as unknown as { data?: { recording?: { url?: string } } } | undefined;
        return item?.data?.recording?.url ?? null;
    }, [playing, studio]);

    const exit = (): void => {
        if (token) navigate(HREF);
        else navigate(playing ? reelHref(playing.id) : HREF);
    };

    if (loading && !state) return <p className="text-md text-muted">Opening the reel…</p>;
    if (error) return <Notice tone="danger">{error}</Notice>;

    if (!playing) {
        if (token && !checked) return <p className="text-md text-muted">Checking the link…</p>;
        return (
            <div>
                <PageTitle title="This reel isn't playing" area="create" />
                <Blank
                    title={token ? "That link has expired" : "That reel isn't here"}
                    body={token ? "A share link stops working after its day, and the family can stop one at any moment. Ask them for a new one." : "It may have been removed, or it may never have been shared with you."}
                    action={<Button onClick={() => navigate(HREF)}>Back to Memories</Button>}
                />
            </div>
        );
    }

    return (
        <ReelPlayer
            slides={slides}
            title={playing.title}
            subtitle={playing.subtitle}
            mood={playing.mood}
            transition={playing.transition}
            trackTitle={playing.trackTitle}
            trackNote={playing.trackNote}
            audioUrl={audioUrl}
            onExit={exit}
        />
    );
}
