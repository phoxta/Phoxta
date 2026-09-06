import { useRef } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight, Code2, MoreVertical, PenTool, Plus, Tag as TagIcon } from "lucide-react";
import { greeting } from "@/lib/format";
import { categoryWatched, continueWatching, goalPct, recommended, streak, tenDayBuckets, upcomingLive } from "@/lib/derive";
import { useData } from "@/state/data";
import { CourseCard, LiveRow, MentorRow, StatCard } from "@/components/cards";
import { WithRail } from "@/components/shell/AppShell";
import { BarChart, Ring } from "@/components/ui/charts";
import { Avatar, Badge, IconButton, SectionHead, SeeAll, Sparkle } from "@/components/ui/primitives";

/**
 * The learner home — the case study's screen. Three questions answered on
 * load: where was I (Continue Watching), how am I doing (the ring, the chart,
 * the watched counts), what is next (Your Lesson). Nothing here needs a click
 * to be understood.
 */
export default function DashboardPage() {
    const { catalogue, user } = useData();
    const rail = useRef<HTMLDivElement>(null);
    const watching = continueWatching(catalogue, user);
    const shelf = watching.length ? watching : recommended(catalogue, user, 3);
    const watched = categoryWatched(catalogue, user);
    const live = upcomingLive(catalogue).slice(0, 3);
    const pct = goalPct(user);
    const days = streak(user);
    const buckets = tenDayBuckets(user);
    const first = user.profile.name.split(" ")[0];
    const mentors = [...catalogue.mentors].sort((a, b) => Number(user.follows.includes(b.id)) - Number(user.follows.includes(a.id)) || b.followers - a.followers).slice(0, 3);
    const scroll = (dir: -1 | 1) => rail.current?.scrollBy({ left: dir * 276, behavior: "smooth" });

    return (
        <WithRail
            rail={
                <section className="flex h-full flex-col rounded-xl bg-card p-4 pb-[18px] max-md:bg-transparent max-md:p-0" aria-labelledby="stat-h">
                    <div className="mb-5 flex items-center justify-between">
                        <h2 id="stat-h" className="text-[20px] font-semibold max-md:text-[18px]">
                            Statistic
                        </h2>
                        <Link to="/progress" className="text-muted" aria-label="Open progress">
                            <MoreVertical size={18} />
                        </Link>
                    </div>
                    <div className="max-md:flex max-md:items-center max-md:gap-4 max-md:rounded-xl max-md:bg-card max-md:px-4 max-md:py-[18px]">
                        <Ring pct={pct} className="mx-auto max-md:mx-0 max-md:shrink-0" label={`${pct}% of your weekly goal`}>
                            <Avatar name={user.profile.name} hue={user.profile.hue} src={user.profile.photoUrl} size="xl" className="max-md:!size-[82px] max-md:!text-[28px]" />
                            <Badge className="absolute right-0.5 top-0.5">{pct}%</Badge>
                        </Ring>
                        <div className="mt-4 text-center max-md:mt-0 max-md:text-left">
                            <h3 className="text-[18px] font-semibold max-md:text-[17px]">
                                <span className="max-md:hidden">
                                    {greeting()} {first} 🔥
                                </span>
                                <span className="md:hidden">{pct}% of your target done</span>
                            </h3>
                            <p className="mt-1 text-[12px] text-muted">{days > 0 ? `${days}-day streak — continue your learning to hit your target.` : "Continue your learning to achieve your target!"}</p>
                        </div>
                    </div>
                    <BarChart className="mt-5 max-md:mt-3.5 max-md:bg-card" data={buckets.map((b) => ({ label: b.label.split(" – ")[0], value: b.minutes, hi: b.current || b.minutes === Math.max(...buckets.map((x) => x.minutes)) }))} />
                    <div className="mb-3.5 mt-6 flex items-center justify-between">
                        <h2 className="text-[20px] font-semibold max-md:text-[18px]">Your mentor</h2>
                        <Link to="/mentors" className="grid size-7 place-items-center rounded-full border border-line-strong bg-card" aria-label="All mentors">
                            <Plus size={12} strokeWidth={2} />
                        </Link>
                    </div>
                    <div className="rounded-lg bg-page px-4 pb-5 pt-1.5 max-md:bg-card max-md:pb-4">
                        {mentors.map((m) => (
                            <MentorRow key={m.id} mentor={m} />
                        ))}
                        <Link to="/mentors" className="mt-2 block rounded-sm bg-subtle py-3 text-center text-[14px] font-medium text-brand-ink hover:bg-[#e1def5]">
                            See All
                        </Link>
                    </div>
                </section>
            }
        >
            <section className="relative isolate h-[220px] overflow-hidden rounded-xl bg-brand p-6 text-white max-md:h-auto max-md:px-5 max-md:pb-5 max-md:pt-[22px]" aria-labelledby="hero-h">
                <span className="absolute -right-10 -top-[90px] -z-10 size-[340px] rounded-full bg-brand-glow opacity-70 blur-[90px]" aria-hidden="true" />
                <Sparkle className="pointer-events-none absolute -top-[46px] right-10 w-[220px] opacity-80 max-md:-right-[52px] max-md:-top-14 max-md:w-[130px] max-md:opacity-50" />
                <Sparkle className="pointer-events-none absolute right-[290px] top-[112px] w-[70px] opacity-45 max-md:hidden" />
                <Sparkle className="pointer-events-none absolute right-[30px] top-[60px] w-[50px] opacity-35 max-md:bottom-[22px] max-md:right-[26px] max-md:top-auto max-md:w-11" />
                <div className="text-[12px] font-semibold tracking-[0.14em]">ONLINE COURSE</div>
                <h1 id="hero-h" className="mb-[26px] mt-[22px] max-w-[460px] text-[30px] font-semibold leading-[38px] max-md:mb-5 max-md:mt-3.5 max-md:max-w-full max-md:text-[24px] max-md:leading-[31px]">
                    Sharpen Your Skills with Professional Online Courses
                </h1>
                <Link to="/courses" className="inline-flex items-center gap-2.5 rounded-full bg-ink py-2 pl-[22px] pr-2 text-[14px] font-semibold text-white">
                    Join Now
                    <span className="grid size-[26px] place-items-center rounded-full bg-white text-ink">
                        <ChevronRight size={12} strokeWidth={2.4} />
                    </span>
                </Link>
            </section>

            <div className="my-[26px] grid grid-cols-3 gap-6 max-md:rail max-md:my-5 max-md:grid-cols-none">
                <StatCard tone="ux" icon={<PenTool size={20} strokeWidth={1.8} />} top={`${watched.ux.done}/${watched.ux.total} watched`} title="UI/UX Design" to="/courses?cat=ux" />
                <StatCard tone="br" icon={<TagIcon size={20} strokeWidth={1.8} />} top={`${watched.br.done}/${watched.br.total} watched`} title="Branding" to="/courses?cat=br" />
                <StatCard tone="fe" icon={<Code2 size={20} strokeWidth={1.8} />} top={`${watched.fe.done}/${watched.fe.total} watched`} title="Front End" to="/courses?cat=fe" />
            </div>

            <SectionHead
                title={watching.length ? "Continue Watching" : "Start something"}
                action={
                    <div className="flex gap-2 max-md:hidden">
                        <IconButton label="Scroll back" size="md" onClick={() => scroll(-1)}>
                            <ChevronLeft size={14} strokeWidth={2} />
                        </IconButton>
                        <IconButton label="Scroll forward" size="md" tone="brand" onClick={() => scroll(1)}>
                            <ChevronRight size={14} strokeWidth={2} />
                        </IconButton>
                    </div>
                }
            />
            <div ref={rail} className="no-scrollbar flex min-h-[304px] gap-[22px] overflow-x-auto scroll-smooth rounded-xl bg-card p-4 max-md:rail max-md:min-h-0 max-md:bg-transparent max-md:p-0">
                {shelf.map((c) => (
                    <CourseCard key={c.id} course={c} surface={false} />
                ))}
                {shelf.length === 0 && (
                    <div className="m-auto text-center text-muted">
                        Nothing yet.{" "}
                        <Link to="/courses" className="font-semibold text-brand underline">
                            Browse courses
                        </Link>
                    </div>
                )}
            </div>

            <section className="mt-[26px] max-md:mt-7" aria-labelledby="lesson-h">
                <SectionHead title={<span id="lesson-h">Your Lesson</span>} action={<SeeAll to="/lessons" />} className="mb-2.5" />
                <div className="overflow-hidden rounded-t-xl bg-card max-md:rounded-[18px]">
                    <div className="grid h-[34px] grid-cols-[56px_180px_180px_1fr_44px] items-center border-b border-line px-4 text-[11px] font-medium tracking-[0.06em] text-caption max-md:hidden">
                        <span />
                        <span>MENTOR</span>
                        <span>TYPE</span>
                        <span>DESC</span>
                        <span className="justify-self-end">ACTION</span>
                    </div>
                    {live.length ? (
                        live.map((l) => <LiveRow key={l.id} live={l} />)
                    ) : (
                        <p className="px-4 py-6 text-[14px] text-muted">No live lessons scheduled.</p>
                    )}
                </div>
                <Link to="/lessons" className="mt-3 block rounded-sm bg-subtle py-3 text-center text-[14px] font-medium text-brand-ink md:hidden">
                    See all lessons
                </Link>
            </section>
        </WithRail>
    );
}
