import { useEffect, useState } from "react";
import { ArrowRight, Calendar, Video } from "lucide-react";
import { Link } from "react-router-dom";
import type { LiveLesson } from "@coir-six/core";
import { cn } from "@/lib/cn";
import { longDate, time } from "@coir-six/core";
import { pastLive, upcomingLive } from "@coir-six/core";
import { useData } from "@/state/data";
import { useToast } from "@/state/toast";
import { youtubeId } from "@/components/player/YouTubePlayer";
import { PageTitle } from "@/components/shell/AppShell";
import { Dialog } from "@/components/ui/overlay";
import { Avatar, Button, Card, EmptyState, Tag } from "@/components/ui/primitives";
import { CategoryIcon, CATEGORY_LABEL } from "@/components/ui/icons";

/** "Lesson": mentor-led live sessions — reserve a seat, join when it's on, watch it back after. */
export default function LiveLessonsPage() {
    const { catalogue, user, mutate } = useData();
    const { toast } = useToast();
    const upcoming = upcomingLive(catalogue);
    const past = pastLive(catalogue);
    const [watching, setWatching] = useState<LiveLesson | null>(null);

    useEffect(() => {
        const id = location.hash.slice(1);
        if (id) document.getElementById(id)?.scrollIntoView({ block: "center" });
    }, []);

    const isLive = (l: LiveLesson) => {
        const s = new Date(l.startsAt).getTime();
        const now = Date.now();
        return now >= s - 10 * 60000 && now <= s + l.durationMin * 60000;
    };

    const Row = ({ l, recorded }: { l: LiveLesson; recorded?: boolean }) => {
        const mentor = catalogue.mentors.find((m) => m.id === l.mentorId);
        const on = user.rsvps.includes(l.id);
        const live = isLive(l);
        return (
            <Card as="li" id={l.id} className={cn("flex flex-col gap-3 md:flex-row md:items-center md:gap-5", live && "ring-2 ring-brand")}>
                <div className="flex items-center gap-3 md:w-56">
                    {mentor && <Avatar name={mentor.name} hue={mentor.hue} src={mentor.photoUrl} size="md" />}
                    <div className="min-w-0">
                        <div className="truncate text-[14px] font-medium">{mentor?.name}</div>
                        <div className="text-[12px] text-muted">
                            {longDate(l.startsAt)} · {time(l.startsAt)} · {l.durationMin} min
                        </div>
                    </div>
                </div>
                <div className="min-w-0 flex-1">
                    <Tag tone={l.categoryId} icon={<CategoryIcon id={l.categoryId} />} className="mb-1.5">{CATEGORY_LABEL[l.categoryId]}</Tag>
                    <h3 className="text-[15px] font-semibold">{l.title}</h3>
                    <p className="mt-1 text-[13px] leading-5 text-muted">{l.description}</p>
                </div>
                <div className="flex shrink-0 gap-2 md:flex-col md:items-stretch">
                    {recorded ? (
                        l.recordingUrl ? (
                            <Button variant="outline" size="md" onClick={() => setWatching(l)}>
                                <Video size={14} /> Watch recording
                            </Button>
                        ) : (
                            <Button variant="outline" size="md" disabled title="The recording is added within a day of the session">
                                <Video size={14} /> Recording soon
                            </Button>
                        )
                    ) : live ? (
                        // The class happens here now, not on someone else's meeting link.
                        <Link to={`/room/${l.id}`} className="inline-flex h-9 items-center justify-center gap-2 rounded-full bg-brand px-4 text-[13px] font-semibold text-white hover:bg-brand-hover">
                            Join now <ArrowRight size={13} />
                        </Link>
                    ) : (
                        <Button variant={on ? "tonal" : "brand"} size="md" aria-pressed={on} onClick={() => void mutate((r) => r.toggleRsvp(l.id)).then(() => toast(on ? "Seat released" : "Seat reserved — we'll remind you", "success"))}>
                            {on ? "Reserved" : "Reserve a seat"}
                        </Button>
                    )}
                </div>
            </Card>
        );
    };

    const recId = watching?.recordingUrl ? youtubeId(watching.recordingUrl) : null;

    return (
        <>
            <PageTitle title="Lessons" sub="Live sessions with your mentors. Reserve a seat, then join from here when it starts." />
            <section aria-labelledby="up-h">
                <h2 id="up-h" className="mb-3 flex items-center gap-2 text-[18px] font-semibold">
                    <Calendar size={18} /> Upcoming
                </h2>
                {upcoming.length ? (
                    <ul className="flex flex-col gap-3">
                        {upcoming.map((l) => (
                            <Row key={l.id} l={l} />
                        ))}
                    </ul>
                ) : (
                    <EmptyState title="Nothing scheduled" body="New sessions are announced in your notifications." />
                )}
            </section>
            {past.length > 0 && (
                <section className="mt-8" aria-labelledby="past-h">
                    <h2 id="past-h" className="mb-3 text-[18px] font-semibold">Past sessions</h2>
                    <ul className="flex flex-col gap-3 opacity-90">
                        {past.map((l) => (
                            <Row key={l.id} l={l} recorded />
                        ))}
                    </ul>
                </section>
            )}

            <Dialog open={Boolean(watching)} onClose={() => setWatching(null)} title={watching?.title ?? "Recording"} wide>
                {recId ? (
                    <div className="aspect-video overflow-hidden rounded-md bg-black">
                        <iframe
                            className="size-full"
                            src={`https://www.youtube-nocookie.com/embed/${recId}?rel=0`}
                            title={`Recording: ${watching?.title}`}
                            allow="accelerometer; encrypted-media; picture-in-picture; fullscreen"
                            allowFullScreen
                        />
                    </div>
                ) : watching?.recordingUrl ? (
                    <a className="font-semibold text-brand underline" href={watching.recordingUrl} target="_blank" rel="noreferrer noopener">
                        Open the recording
                    </a>
                ) : null}
                {watching && <p className="mt-3 text-[13px] text-muted">{watching.description}</p>}
            </Dialog>
        </>
    );
}
