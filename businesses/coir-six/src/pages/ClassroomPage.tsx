import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Copy, MessageSquare, Users } from "lucide-react";
import { filmstripOf, peopleLabel, stageOf } from "@coir-six/core";
import { cn } from "@/lib/cn";
import { useData } from "@/state/data";
import { useToast } from "@/state/toast";
import { youtubeId } from "@/components/player/YouTubePlayer";
import { Controls, Reactions } from "@/components/live/Controls";
import { AskQuestion, QuizCard } from "@/components/live/Quiz";
import { canBlur } from "@/lib/blur";
import { canCaption } from "@/lib/captions";
import { Lobby } from "@/components/live/Lobby";
import { ChatRail, ParticipantsRail } from "@/components/live/Rails";
import { RoomHeader } from "@/components/live/RoomHeader";
import { RoomAudio, Tile } from "@/components/live/Tile";
import { useLiveRoom } from "@/components/live/useRoom";
import { useRecorder } from "@/components/live/useRecorder";
import { Dialog } from "@/components/ui/overlay";
import { Avatar, Button, Spinner } from "@/components/ui/primitives";

/**
 * The classroom.
 *
 * Deliberately outside `AppShell`: a class is the whole screen, so this route
 * sits beside `/onboarding` in the router and brings its own chrome. The
 * layout is the case study's — a stage with a filmstrip under it, and a rail
 * on the right holding the participants above the chat.
 *
 * Under `md` the rail becomes two sheets, because a phone has room for the
 * stage or the list, not both.
 */
export default function ClassroomPage() {
    const { id = "" } = useParams();
    const nav = useNavigate();
    const { catalogue, repo } = useData();
    const { toast } = useToast();

    const lesson = useMemo(() => catalogue.liveLessons.find((l) => l.id === id) ?? null, [catalogue.liveLessons, id]);
    const mentor = useMemo(
        () => (lesson ? catalogue.mentors.find((m) => m.id === lesson.mentorId) ?? null : null),
        [catalogue.mentors, lesson],
    );

    const session = useLiveRoom(lesson);
    const { room, snap, phase, error, media, join, leave, asHost, setAsHost } = session;
    const canHost = snap.me?.role === "host";
    const recorder = useRecorder(lesson, room, canHost);

    const [adding, setAdding] = useState(false);
    const [asking, setAsking] = useState(false);
    const [sheet, setSheet] = useState<"people" | "chat" | null>(null);

    // Leaving for any reason returns you to where the class was listed.
    useEffect(() => {
        if (phase === "left") nav("/lessons", { replace: true });
    }, [nav, phase]);

    if (!lesson) {
        return (
            <main className="grid min-h-dvh place-items-center bg-page px-5 text-center">
                <div>
                    <h1 className="text-[22px] font-semibold">That class isn't here</h1>
                    <p className="mt-2 text-[14px] text-muted">It may have finished, or the link is out of date.</p>
                    <Link to="/lessons" className="mt-5 inline-flex h-11 items-center rounded-full bg-ink px-5 text-[14px] font-semibold text-white">
                        Back to lessons
                    </Link>
                </div>
            </main>
        );
    }

    if (phase === "lobby" || phase === "joining" || !room) {
        return (
            <main className="grid min-h-dvh place-items-center bg-page px-5 py-8 md:px-8">
                <Lobby
                    lesson={lesson}
                    mentor={mentor}
                    media={media}
                    joining={phase === "joining"}
                    error={error}
                    onJoin={(o) => void join(o)}
                    demo={repo.kind === "demo"}
                    asHost={asHost}
                    onAsHost={setAsHost}
                />
            </main>
        );
    }

    const stage = stageOf(snap);
    const strip = filmstripOf(snap);
    const embed = snap.embedUrl ? youtubeId(snap.embedUrl) : null;

    const rail = (
        <>
            {snap.question && (
                <div className="mb-4 max-lg:hidden">
                    <QuizCard snap={snap} room={room} canHost={canHost} />
                </div>
            )}
            <ParticipantsRail snap={snap} room={room} canHost={canHost} onAdd={() => setAdding(true)} />
            <span className="my-4 block h-px bg-line" aria-hidden="true" />
            <ChatRail snap={snap} room={room} />
        </>
    );

    return (
        // On a wide screen the class is exactly one viewport and the rails
        // scroll inside it, so the controls are always reachable. A phone
        // stacks and scrolls normally.
        <main className="flex min-h-dvh flex-col bg-page px-4 py-4 md:px-6 lg:h-dvh lg:overflow-hidden">
            {snap.status === "reconnecting" && (
                <p role="status" className="mb-3 flex items-center justify-center gap-2 rounded-lg bg-peach-soft px-4 py-2 text-[13px] text-peach">
                    <Spinner className="size-3.5" /> Reconnecting…
                </p>
            )}

            <RoomHeader
                lesson={lesson}
                snap={snap}
                canHost={canHost}
                recording={snap.recording}
                recorderBusy={recorder.busy}
                onToggleRecord={() => void (snap.recording ? recorder.stop() : recorder.start())}
                onAdd={() => setAdding(true)}
            />

            <div className="mt-4 grid min-h-0 flex-1 gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
                {/* Stage + filmstrip */}
                <div className="flex min-h-0 min-w-0 flex-col gap-3">
                    {/* Cap the stage by height so the filmstrip and the controls
                        stay on screen: the tile is 16:9, so bounding its width
                        at 16/9 of the height we can spare does it without
                        fighting the aspect ratio. */}
                    <div className="relative mx-auto w-full max-w-[min(100%,calc(54vh*16/9))]">
                        {snap.media && stage ? (
                            <Tile p={stage} room={room} big pinned={snap.pinned === stage.identity} canHost={canHost} onMute={() => void room.muteParticipant(stage.identity)} />
                        ) : (
                            <ExternalStage embed={embed} url={snap.embedUrl} title={lesson.title} />
                        )}
                        <Reactions snap={snap} />
                        {/* Captions sit over the foot of the stage, the way they do
                            on television — readable without covering a face. */}
                        {snap.captions.length > 0 && (
                            <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 p-3" aria-live="polite">
                                <p className="mx-auto max-w-[46rem] rounded-lg bg-ink/85 px-3 py-2 text-center text-[14px] leading-6 text-white">
                                    {snap.captions.map((c) => (
                                        <span key={c.id} className={cn(!c.final && "opacity-70")}>
                                            {c.text}{" "}
                                        </span>
                                    ))}
                                </p>
                            </div>
                        )}
                    </div>

                    {/* One row that scrolls, as in the design — a grid that wraps
                        pushes the controls off the bottom as the class fills up. */}
                    {snap.media && strip.length > 0 && (
                        <ul className="-mx-1 flex snap-x gap-3 overflow-x-auto px-1 pb-1">
                            {strip.map((p) => (
                                <li key={p.identity} className="w-[168px] shrink-0 snap-start sm:w-[200px]">
                                    <Tile p={p} room={room} pinned={snap.pinned === p.identity} canHost={canHost} onMute={() => void room.muteParticipant(p.identity)} />
                                </li>
                            ))}
                        </ul>
                    )}

                    {snap.question && (
                        <div className="lg:hidden">
                            <QuizCard snap={snap} room={room} canHost={canHost} />
                        </div>
                    )}

                    <div className="mt-auto pt-2">
                        <Controls
                            snap={snap}
                            room={room}
                            canHost={canHost}
                            onAsk={() => setAsking(true)}
                            blurAvailable={canBlur()}
                            captionsAvailable={canCaption()}
                            onLeave={() => void leave()}
                            onEnd={() => void room.endClass()}
                        />
                    </div>
                </div>

                {/* The rail: a column on desktop, two sheets on a phone. */}
                <aside className="hidden min-h-0 flex-col rounded-2xl bg-card p-4 lg:flex">{rail}</aside>
            </div>

            <div className="mt-3 flex gap-2 lg:hidden">
                <Button variant="outline" size="md" block onClick={() => setSheet("people")}>
                    <Users size={14} /> {peopleLabel(snap.participants.length)}
                </Button>
                <Button variant="outline" size="md" block onClick={() => setSheet("chat")}>
                    <MessageSquare size={14} /> Chat
                    {snap.chat.length > 0 && <span className="text-muted">({snap.chat.length})</span>}
                </Button>
            </div>

            <Dialog open={sheet === "people"} onClose={() => setSheet(null)} title="Participants">
                <ParticipantsRail snap={snap} room={room} canHost={canHost} onAdd={() => setAdding(true)} />
            </Dialog>
            <Dialog open={sheet === "chat"} onClose={() => setSheet(null)} title="Chats">
                <div className="flex h-[60vh] flex-col">
                    <ChatRail snap={snap} room={room} />
                </div>
            </Dialog>

            <Dialog open={asking} onClose={() => setAsking(false)} title="Ask the class">
                <AskQuestion room={room} onDone={() => setAsking(false)} />
            </Dialog>

            <AddPeople open={adding} onClose={() => setAdding(false)} title={lesson.title} onCopied={() => toast("Invite link copied", "success")} />

            <RoomAudio room={room} people={snap.participants} />

            {/* Joins and leaves, for anyone not watching the grid. */}
            <p className="sr-only" role="status" aria-live="polite">
                {peopleLabel(snap.participants.length)} in this class.
            </p>
        </main>
    );
}

/**
 * The stage when the school runs no media server: the mentor's own stream.
 * A YouTube link embeds; anything else gets an honest link out.
 */
function ExternalStage({ embed, url, title }: { embed: string | null; url: string | null; title: string }) {
    if (embed) {
        return (
            <div className="aspect-video overflow-hidden rounded-xl bg-black">
                <iframe
                    className="size-full"
                    src={`https://www.youtube-nocookie.com/embed/${embed}?rel=0&autoplay=1`}
                    title={title}
                    allow="accelerometer; autoplay; encrypted-media; picture-in-picture; fullscreen"
                    allowFullScreen
                />
            </div>
        );
    }
    return (
        <div className="grid aspect-video place-items-center rounded-xl bg-subtle px-6 text-center">
            <div>
                <h2 className="text-[17px] font-semibold">The class is on the mentor's stream</h2>
                <p className="mx-auto mt-2 max-w-sm text-[13px] leading-5 text-muted">
                    Everything else is here — the chat, the people, your hand. Open the stream in a second window and keep this
                    open beside it.
                </p>
                {url && (
                    <a
                        href={url}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="mt-4 inline-flex h-11 items-center rounded-full bg-brand px-5 text-[14px] font-semibold text-white"
                    >
                        Open the stream
                    </a>
                )}
            </div>
        </div>
    );
}

/** Invite: the link, and the classmates you already study with. */
function AddPeople({ open, onClose, title, onCopied }: { open: boolean; onClose: () => void; title: string; onCopied: () => void }) {
    const { user } = useData();
    const link = typeof location === "undefined" ? "" : location.href;

    return (
        <Dialog open={open} onClose={onClose} title="Add people">
            <p className="text-[13px] leading-5 text-muted">Anyone enrolled at this school can open this link and join {title}.</p>

            <div className="mt-4 flex items-center gap-2">
                <input readOnly value={link} aria-label="Invite link" className="h-11 min-w-0 flex-1 rounded-sm bg-page px-3 text-[13px] text-muted outline-none" />
                <Button
                    variant="brand"
                    size="lg"
                    onClick={() => {
                        void navigator.clipboard?.writeText(link).then(onCopied);
                    }}
                >
                    <Copy size={15} /> Copy
                </Button>
            </div>

            {user.friends.length > 0 && (
                <>
                    <h3 className="mt-6 text-[14px] font-semibold">People you study with</h3>
                    <ul className="mt-2 flex flex-col">
                        {user.friends.map((f) => (
                            <li key={f.id} className="flex items-center gap-3 py-2">
                                <Avatar name={f.name} hue={f.hue} src={f.photoUrl} size="md" />
                                <span className="min-w-0 flex-1">
                                    <span className="block truncate text-[14px] font-medium">{f.name}</span>
                                    <span className="block text-[12px] text-muted">{f.label}</span>
                                </span>
                                <Link
                                    to={`/inbox/new/friend/${f.id}`}
                                    className={cn("inline-flex h-8 items-center rounded-full border border-line-strong px-3 text-[12px] font-semibold hover:border-ink")}
                                >
                                    Send the link
                                </Link>
                            </li>
                        ))}
                    </ul>
                </>
            )}
        </Dialog>
    );
}
