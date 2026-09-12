import { Link } from "react-router-dom";
import { Award, Flame, Target, Timer, TrendingUp } from "lucide-react";
import { cn } from "@/lib/cn";
import { duration, longDate } from "@coir-six/core";
import { categoryWatched, courseProgress, dailyMinutes, goalPct, lessonsCompleted, minutesThisWeek, streak, studiedToday, totalMinutes } from "@coir-six/core";
import { useData } from "@/state/data";
import { PageTitle } from "@/components/shell/AppShell";
import { ActivityStrip, BarChart, Ring } from "@/components/ui/charts";
import { Avatar, Badge, Card, ProgressBar } from "@/components/ui/primitives";
import { CATEGORY_LABEL } from "@/components/ui/icons";

/** Progress in full: goal, streak, time, every course, every certificate. */
export default function ProgressPage() {
    const { catalogue, user } = useData();
    const pct = goalPct(user);
    const days = streak(user);
    const week = minutesThisWeek(user);
    const week14 = dailyMinutes(user, 14);
    const last7 = dailyMinutes(user, 7).map((d, i, a) => ({ ...d, today: i === a.length - 1 }));
    const watched = categoryWatched(catalogue, user);
    const enrolled = user.enrollments.map((e) => ({ e, c: catalogue.courses.find((c) => c.id === e.courseId)! })).filter((x) => x.c);

    const tile = (icon: React.ReactNode, value: string, label: string, tone: string) => (
        <Card className="flex items-center gap-3.5">
            <span className={cn("grid size-11 place-items-center rounded-full", tone)}>{icon}</span>
            <div>
                <div className="text-[20px] font-semibold leading-6">{value}</div>
                <div className="text-[12px] text-muted">{label}</div>
            </div>
        </Card>
    );

    return (
        <>
            <PageTitle title="Progress" sub="Effort made visible. This is the momentum the dashboard hints at." />
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
                <div className="flex flex-col gap-6">
                    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                        {tile(<Flame size={20} />, `${days}`, days === 1 ? "day streak" : "day streak", "bg-peach-soft text-peach")}
                        {tile(<Timer size={20} />, duration(week * 60), "this week", "bg-brand-soft text-brand")}
                        {tile(<TrendingUp size={20} />, `${lessonsCompleted(user)}`, "lessons done", "bg-mint-soft text-mint")}
                        {tile(<Award size={20} />, `${user.certificates.length}`, "certificates", "bg-fe-soft text-fe")}
                    </div>

                    <Card as="section" aria-labelledby="act-h">
                        <div className="mb-4 flex items-baseline justify-between">
                            <h2 id="act-h" className="text-[18px] font-semibold">Last two weeks</h2>
                            <span className="text-[12px] text-muted">{duration(totalMinutes(user) * 60)} all time</span>
                        </div>
                        <BarChart data={week14.map((d) => ({ label: d.label, value: d.minutes, hi: d.minutes >= 30 }))} className="!bg-page" />
                        <p className="mt-3 text-[13px] text-muted">{studiedToday(user) ? "You've studied today — the streak is safe." : days > 0 ? "Nothing yet today. Ten minutes keeps the streak." : "Start a lesson to begin a streak."}</p>
                    </Card>

                    <Card as="section" aria-labelledby="cat-h">
                        <h2 id="cat-h" className="mb-4 text-[18px] font-semibold">By category</h2>
                        <ul className="flex flex-col gap-4">
                            {(["fe", "ux", "br"] as const).map((k) => {
                                const w = watched[k];
                                const p = w.total ? Math.round((w.done / w.total) * 100) : 0;
                                return (
                                    <li key={k}>
                                        <div className="mb-1.5 flex items-baseline justify-between text-[14px]">
                                            <span className="font-medium">{CATEGORY_LABEL[k]}</span>
                                            <span className="text-muted">{w.done}/{w.total} watched</span>
                                        </div>
                                        <ProgressBar value={p} label={`${CATEGORY_LABEL[k]} ${p}%`} />
                                    </li>
                                );
                            })}
                        </ul>
                    </Card>

                    <Card as="section" aria-labelledby="crs-h">
                        <h2 id="crs-h" className="mb-3 text-[18px] font-semibold">Your courses</h2>
                        {enrolled.length === 0 ? (
                            <p className="text-[14px] text-muted">Nothing enrolled yet. <Link to="/courses" className="font-semibold text-brand underline">Browse courses</Link></p>
                        ) : (
                            <ul>
                                {enrolled.map(({ e, c }) => {
                                    const p = courseProgress(catalogue, user, c.id);
                                    const cert = user.certificates.find((x) => x.courseId === c.id);
                                    return (
                                        <li key={c.id} className="border-b border-line py-3 last:border-b-0">
                                            <div className="mb-1.5 flex items-center gap-3">
                                                <Link to={`/courses/${c.slug}`} className="min-w-0 flex-1 truncate text-[14px] font-medium">{c.title}</Link>
                                                {e.completedAt ? <Badge tone="brand">Complete</Badge> : <span className="text-[12px] text-muted">{p.pct}%</span>}
                                            </div>
                                            <ProgressBar value={p.pct} label={`${c.title} ${p.pct}%`} />
                                            <div className="mt-1.5 text-[12px] text-caption">
                                                Enrolled {longDate(e.enrolledAt)}
                                                {cert && <> · <Link to={`/certificates/${cert.id}`} className="font-semibold text-brand">Certificate</Link></>}
                                            </div>
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </Card>
                </div>

                <div className="flex flex-col gap-4">
                    <Card className="flex flex-col items-center text-center">
                        <Ring pct={pct} label={`${pct}% of your weekly goal`}>
                            <Avatar name={user.profile.name} hue={user.profile.hue} src={user.profile.photoUrl} size="xl" />
                            <Badge className="absolute right-0.5 top-0.5">{pct}%</Badge>
                        </Ring>
                        <h2 className="mt-4 text-[18px] font-semibold">Weekly goal</h2>
                        <p className="mt-1 text-[13px] text-muted">
                            {duration(week * 60)} of {duration(user.profile.weeklyGoalMin * 60)}
                        </p>
                        <Link to="/settings#goal" className="mt-3 inline-flex items-center gap-1.5 text-[13px] font-semibold text-brand underline underline-offset-4">
                            <Target size={13} /> Change goal
                        </Link>
                    </Card>
                    <Card>
                        <h2 className="mb-3 text-[15px] font-semibold">This week</h2>
                        <ActivityStrip days={last7} />
                    </Card>
                    <Card>
                        <h2 className="mb-2 text-[15px] font-semibold">Certificates</h2>
                        {user.certificates.length === 0 ? (
                            <p className="text-[13px] text-muted">Finish every lesson in a course to earn one.</p>
                        ) : (
                            <ul className="flex flex-col gap-2">
                                {user.certificates.map((ct) => (
                                    <li key={ct.id}>
                                        <Link to={`/certificates/${ct.id}`} className="flex items-center gap-2 rounded-md bg-page px-3 py-2 text-[13px] font-medium hover:bg-subtle">
                                            <Award size={14} className="text-brand" /> <span className="truncate">{catalogue.courses.find((c) => c.id === ct.courseId)?.title}</span>
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </Card>
                </div>
            </div>
        </>
    );
}
