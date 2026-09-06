import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Check, MessageSquare, UserPlus } from "lucide-react";
import { useData } from "@/state/data";
import { useToast } from "@/state/toast";
import { CourseCard } from "@/components/cards";
import { PageTitle } from "@/components/shell/AppShell";
import { Avatar, Button, Card, EmptyState, Tag } from "@/components/ui/primitives";
import { CategoryIcon, CATEGORY_LABEL } from "@/components/ui/icons";

export function MentorsPage() {
    const { catalogue, user, mutate } = useData();
    const { toast } = useToast();
    return (
        <>
            <PageTitle title="Mentors" sub="The people behind the courses. Follow to hear when they teach live." />
            <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {catalogue.mentors.map((m) => {
                    const on = user.follows.includes(m.id);
                    const courses = catalogue.courses.filter((c) => c.mentorId === m.id).length;
                    return (
                        <Card as="li" key={m.id} className="flex flex-col gap-3">
                            <div className="flex items-center gap-3">
                                <Link to={`/mentors/${m.id}`} aria-label={m.name}>
                                    <Avatar name={m.name} hue={m.hue} src={m.photoUrl} size="lg" plus />
                                </Link>
                                <div className="min-w-0">
                                    <Link to={`/mentors/${m.id}`} className="block truncate text-[15px] font-semibold">{m.name}</Link>
                                    <div className="text-[12px] text-muted">{m.role}</div>
                                </div>
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                                {m.expertise.map((e) => (
                                    <Tag key={e} tone={e} icon={<CategoryIcon id={e} />}>{CATEGORY_LABEL[e]}</Tag>
                                ))}
                            </div>
                            <p className="line-clamp-3 text-[13px] leading-5 text-muted">{m.bio}</p>
                            <div className="mt-auto flex items-center gap-2 pt-1 text-[12px] text-caption">
                                {(m.followers + (on ? 1 : 0)).toLocaleString()} followers · {courses} course{courses === 1 ? "" : "s"}
                                <Button variant={on ? "tonal" : "outline"} size="md" className="ml-auto !rounded-full" aria-pressed={on} onClick={() => void mutate((r) => r.toggleFollow(m.id)).then(() => toast(on ? `Unfollowed ${m.name}` : `Following ${m.name}`))}>
                                    {on ? <Check size={12} strokeWidth={2.5} /> : <UserPlus size={12} />} {on ? "Following" : "Follow"}
                                </Button>
                            </div>
                        </Card>
                    );
                })}
            </ul>
        </>
    );
}

export function MentorDetailPage() {
    const { id } = useParams();
    const { catalogue, user, mutate } = useData();
    const { toast } = useToast();
    const m = catalogue.mentors.find((x) => x.id === id);
    if (!m) return <EmptyState title="Mentor not found" action={<Link to="/mentors" className="font-semibold text-brand underline">All mentors</Link>} />;
    const on = user.follows.includes(m.id);
    const courses = catalogue.courses.filter((c) => c.mentorId === m.id);
    const live = catalogue.liveLessons.filter((l) => l.mentorId === m.id && new Date(l.startsAt).getTime() > Date.now());
    return (
        <>
            <Link to="/mentors" className="mb-3 inline-flex items-center gap-1.5 text-[13px] font-medium text-muted hover:text-ink">
                <ArrowLeft size={14} /> Mentors
            </Link>
            <Card className="mb-6 flex flex-wrap items-center gap-5">
                <Avatar name={m.name} hue={m.hue} src={m.photoUrl} size="xl" className="!size-20 !text-[26px]" />
                <div className="min-w-0 flex-1">
                    <h1 className="text-[24px] font-semibold leading-8">{m.name}</h1>
                    <p className="text-[14px] text-muted">{m.role}</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                        {m.expertise.map((e) => (
                            <Tag key={e} tone={e} icon={<CategoryIcon id={e} />}>{CATEGORY_LABEL[e]}</Tag>
                        ))}
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button variant={on ? "tonal" : "outline"} aria-pressed={on} onClick={() => void mutate((r) => r.toggleFollow(m.id)).then(() => toast(on ? `Unfollowed ${m.name}` : `Following ${m.name}`))}>
                        {on ? <Check size={14} strokeWidth={2.5} /> : <UserPlus size={14} />} {on ? "Following" : "Follow"}
                    </Button>
                    <Link to={`/inbox/new/mentor/${m.id}`} className="inline-flex h-11 items-center gap-2 rounded-full bg-brand px-5 text-[14px] font-semibold text-white hover:bg-brand-hover">
                        <MessageSquare size={14} /> Message
                    </Link>
                </div>
                <p className="w-full text-[14px] leading-6 text-muted">{m.bio}</p>
                <p className="text-[12px] text-caption">{(m.followers + (on ? 1 : 0)).toLocaleString()} followers</p>
            </Card>
            <h2 className="mb-3 text-[18px] font-semibold">Courses by {m.name.split(" ")[0]}</h2>
            <div className="mb-8 grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-4">
                {courses.map((c) => (
                    <CourseCard key={c.id} course={c} className="!w-auto" />
                ))}
            </div>
            {live.length > 0 && (
                <>
                    <h2 className="mb-3 text-[18px] font-semibold">Teaching live</h2>
                    <ul className="flex flex-col gap-2">
                        {live.map((l) => (
                            <li key={l.id}>
                                <Link to={`/lessons#${l.id}`} className="flex items-center gap-3 rounded-xl bg-card px-4 py-3 hover:shadow-hover">
                                    <span className="text-[14px] font-medium">{l.title}</span>
                                    <span className="ml-auto text-[12px] text-caption">{new Date(l.startsAt).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}</span>
                                </Link>
                            </li>
                        ))}
                    </ul>
                </>
            )}
        </>
    );
}
