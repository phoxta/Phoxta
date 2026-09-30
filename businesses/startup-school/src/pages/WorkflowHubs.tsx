import { Link } from "react-router-dom";
import type { ReactNode } from "react";
import { ArrowRight, BookOpen, CalendarClock, CheckSquare, Compass, FlaskConical, Inbox, Lightbulb, Settings, TrendingUp, Users } from "lucide-react";
import { continueWatching, nextLesson, openTasks, recommended, upcomingLive } from "@startup-school/core";
import { useData } from "@/state/data";
import { useAccess } from "@/state/access";
import { CourseCard } from "@/components/cards";
import { PageTitle } from "@/components/shell/AppShell";
import { Card, EmptyState, Overline } from "@/components/ui/primitives";

type HubLinkProps = {
    to: string;
    icon: ReactNode;
    title: string;
    body: string;
    meta?: string;
};

function HubLink({ to, icon, title, body, meta }: HubLinkProps) {
    return (
        <Link to={to} className="group flex items-start gap-4 rounded-xl bg-card p-5 transition-shadow hover:shadow-hover">
            <span className="grid size-11 shrink-0 place-items-center rounded-full bg-brand-soft text-brand">{icon}</span>
            <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2 text-[16px] font-semibold">
                    {title} <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" />
                </span>
                <span className="mt-1 block text-[13px] leading-5 text-muted">{body}</span>
                {meta && <span className="mt-2 block text-[12px] font-medium text-brand-ink">{meta}</span>}
            </span>
        </Link>
    );
}

/** The learning home is a return point, not another catalogue page. */
export function LearnHubPage() {
    const { catalogue, user } = useData();
    const { can } = useAccess();
    const courses = continueWatching(catalogue, user);
    const suggested = courses.length ? courses : recommended(catalogue, user, 3);
    const course = suggested[0];
    const lesson = course ? nextLesson(catalogue, user, course.id) : null;
    const live = upcomingLive(catalogue)[0];

    return (
        <>
            <PageTitle title="Learn" sub="Pick up the decision you were making, explore a course, or join a live class." />
            {course && lesson ? (
                <Card className="mb-6 border border-brand/20 bg-brand-soft/35">
                    <div className="text-[12px] font-semibold uppercase tracking-[0.06em] text-brand-ink">Continue your journey</div>
                    <h2 className="mt-2 text-[20px] font-semibold">{lesson.title}</h2>
                    <p className="mt-1 text-[14px] text-muted">{course.title}</p>
                    <Link to={`/learn/${course.slug}/${lesson.id}`} className="mt-4 inline-flex h-10 items-center gap-2 rounded-full bg-ink px-4 text-[13px] font-semibold text-white hover:bg-brand">
                        Resume lesson <ArrowRight size={14} />
                    </Link>
                </Card>
            ) : (
                <EmptyState title="Your learning path starts here" body="Choose a course and we will keep your next lesson ready." action={<Link to="/courses" className="font-semibold text-brand underline">Browse courses</Link>} />
            )}
            <div className="grid gap-4 md:grid-cols-2">
                <HubLink to="/courses" icon={<Compass size={20} />} title="Course library" body="Explore all ten outcome-led courses and save the ones you need next." />
                {can("cohort") ? (
                    <HubLink to="/lessons" icon={<CalendarClock size={20} />} title="Live classes" body="Reserve a seat, join mentor-led sessions, and return to recordings and recaps." meta={live ? `Next: ${live.title}` : "See the current schedule"} />
                ) : <HubLink to="/pricing" icon={<CalendarClock size={20} />} title="Live classes" body="Live teaching, mentorship and the cohort community are available with Cohort access." meta="Explore Cohort access" />}
            </div>
            {suggested.length > 1 && (
                <section className="mt-8" aria-labelledby="continue-h">
                    <h2 id="continue-h" className="mb-3 text-[18px] font-semibold">Keep going</h2>
                    <div className="flex gap-4 overflow-x-auto pb-1">
                        {suggested.slice(1, 4).map((item) => <CourseCard key={item.id} course={item} />)}
                    </div>
                </section>
            )}
        </>
    );
}

/** Venture, tasks and advice are different views of the same founder work. */
export function BuildHubPage() {
    const { catalogue, user } = useData();
    const { can } = useAccess();
    const taskCount = openTasks(user);
    const claims = Object.values(user.venture.sections).flatMap((section) => section?.claims ?? []);
    const unresolved = claims.filter((claim) => claim.confidence !== "proven").length;
    const activeCourse = continueWatching(catalogue, user)[0];
    const activeExperiments = user.experiments.filter((experiment) => experiment.status === "planned" || experiment.status === "running").length;
    const reviewedExperiments = user.experiments.filter((experiment) => experiment.decision.trim()).length;

    return (
        <>
            <PageTitle title="Build" sub="Turn lessons into evidence, decisions, and the next piece of work for your venture." />
            <Card className="mb-6 border border-brand/20 bg-brand-soft/35">
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <div className="text-[12px] font-semibold uppercase tracking-[0.06em] text-brand-ink">{user.venture.path === "phoxta_turnkey" ? "Your Phoxta launch" : user.venture.path === "hybrid" ? "Your Phoxta adaptation" : "Your venture"}</div>
                        <h2 className="mt-2 text-[20px] font-semibold">{user.venture.name || "Give your venture a working name"}</h2>
                        <p className="mt-1 max-w-xl text-[14px] text-muted">{user.venture.oneLiner || "Start with the customer problem you are working to prove."}</p>
                    </div>
                    <Link to="/venture" className="inline-flex h-10 items-center rounded-full bg-ink px-4 text-[13px] font-semibold text-white hover:bg-brand">Open venture</Link>
                </div>
                <div className="mt-5 grid grid-cols-2 gap-3 sm:max-w-md">
                    <div className="rounded-lg bg-card px-3 py-2 text-[13px]"><strong className="block text-[18px]">{claims.length}</strong>saved decisions</div>
                    <div className="rounded-lg bg-card px-3 py-2 text-[13px]"><strong className="block text-[18px]">{activeExperiments || unresolved}</strong>{activeExperiments ? "field tests in motion" : "claims to test"}</div>
                </div>
            </Card>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <HubLink to="/experiments" icon={<FlaskConical size={20} />} title="Proof loop" body="Design the smallest credible field test, keep the evidence, and record the decision it changes." meta={activeExperiments ? `${activeExperiments} test${activeExperiments === 1 ? "" : "s"} in motion · ${reviewedExperiments} decision${reviewedExperiments === 1 ? "" : "s"} made` : "Start with the riskiest assumption"} />
                <HubLink to="/tasks" icon={<CheckSquare size={20} />} title="Next actions" body="Keep the work between lessons visible and finish it with a real due date." meta={taskCount ? `${taskCount} open task${taskCount === 1 ? "" : "s"}` : "Nothing open right now"} />
                <HubLink to="/adviser" icon={<Lightbulb size={20} />} title="Ask the adviser" body="Challenge an assumption using your venture record and the course frameworks." />
                <HubLink to={activeCourse ? `/courses/${activeCourse.slug}` : "/courses"} icon={<BookOpen size={20} />} title="Apply a lesson" body="Return to the course that is currently shaping your next decision." />
                {can("launch") && <HubLink to="/launch" icon={<Compass size={20} />} title="Launch network" body="Prepare for investor-network access and choose a provisioned Phoxta business with the launch team." />}
            </div>
            <Card className="mt-5 border border-line bg-card">
                <div className="flex flex-wrap items-start gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-full bg-brand-soft text-brand"><Lightbulb size={18} /></span><div className="min-w-0 flex-1"><Overline>AI-native business lane</Overline><h2 className="mt-1 text-[17px] font-semibold">{user.venture.path === "build" ? "Use AI to improve a real workflow before you call it a product" : "A turnkey system is a faster start, not proof of local demand"}</h2><p className="mt-1 text-[13px] leading-5 text-muted">Document the workflow, accountable human, data boundary, fallback, quality threshold, and unit economics in your AI system canvas. Then prove the customer and operation in the field.</p></div><Link to="/venture" className="inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-[13px] font-semibold text-brand hover:bg-brand-soft">Open AI system <ArrowRight size={14} /></Link></div>
            </Card>
        </>
    );
}

/** Community, mentors, bookings and direct messages answer the support need. */
export function ConnectHubPage() {
    const { catalogue, user } = useData();
    const nextSession = user.bookings
        .filter((booking) => booking.status === "confirmed" && new Date(booking.startsAt).getTime() >= Date.now())
        .sort((a, b) => a.startsAt.localeCompare(b.startsAt))[0];
    const unread = user.conversations.reduce((total, conversation) => total + conversation.unread, 0);
    const groups = catalogue.groups.filter((group) => user.groupIds.includes(group.id)).length;

    return (
        <>
            <PageTitle title="Connect" sub="Find a peer, a mentor, or the next conversation that moves your work forward." />
            <div className="grid gap-4 md:grid-cols-2">
                <HubLink to="/groups" icon={<Users size={20} />} title="Community" body="Share work, ask focused questions, and learn with founders on a similar path." meta={groups ? `${groups} joined group${groups === 1 ? "" : "s"}` : "Find your study group"} />
                <HubLink to="/mentors" icon={<Compass size={20} />} title="Mentors" body="Follow specialists, explore their courses, and book a focused 1:1 when you need it." />
                <HubLink to="/sessions" icon={<CalendarClock size={20} />} title="Your 1:1s" body="Prepare an agenda, keep shared actions, and make each mentor session build on the last." meta={nextSession ? `Next session: ${new Date(nextSession.startsAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}` : "No session booked"} />
                <HubLink to="/inbox" icon={<Inbox size={20} />} title="Inbox" body="Continue a mentor or peer conversation without leaving the context of your work." meta={unread ? `${unread} unread message${unread === 1 ? "" : "s"}` : "You're caught up"} />
            </div>
        </>
    );
}

/** Mobile's fifth tab and desktop's low-frequency utilities. */
export function MorePage() {
    const { user } = useData();
    return (
        <>
            <PageTitle title="More" sub="Your progress, account, and the things you do not need in every founder session." />
            <Link to="/programme" className="mb-4 inline-flex min-h-11 items-center rounded-full bg-brand-soft px-5 text-sm font-semibold text-brand-ink">My programme, assignments & support →</Link>
            <div className="grid gap-4 md:grid-cols-2">
                <HubLink to="/progress" icon={<TrendingUp size={20} />} title="Progress & certificates" body="See your momentum, weekly goal, course completion, and earned certificates." meta={`${user.certificates.length} certificate${user.certificates.length === 1 ? "" : "s"}`} />
                <HubLink to="/settings" icon={<Settings size={20} />} title="Settings" body="Update your profile, interests, weekly goal, and account preferences." />
            </div>
        </>
    );
}
