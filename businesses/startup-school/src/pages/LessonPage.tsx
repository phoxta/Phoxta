import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Check, ChevronLeft, ChevronRight, FileText, HelpCircle, History, Play } from "lucide-react";
import { cn } from "@/lib/cn";
import { duration } from "@startup-school/core";
import { courseBySlug, courseProgress, isDone, isEnrolled, lessonsOf } from "@startup-school/core";
import type { CategoryId, LessonBlock, VentureSection, VentureSectionId } from "@startup-school/core";
import { useData } from "@/state/data";
import { useToast } from "@/state/toast";
import { NotesPanel } from "@/components/player/NotesPanel";
import { Quiz } from "@/components/player/Quiz";
import { VideoPlayer } from "@/components/player/VideoPlayer";
import { YouTubePlayer, youtubeId, youtubeThumb } from "@/components/player/YouTubePlayer";
import { Button, EmptyState, ProgressBar, Tag } from "@/components/ui/primitives";
import { CategoryIcon, CATEGORY_LABEL } from "@/components/ui/icons";
import { LessonResource } from "@/components/player/LessonResource";

/**
 * The lesson screen: player (video, article or quiz), curriculum, notes.
 *
 * Study time is measured, not assumed: video counts only while it is actually
 * playing, an article counts while the tab is visible, and the total is
 * written when the learner leaves. Progress saves every few seconds and the
 * lesson completes itself at 90% — nobody has to remember to press a button,
 * but the button is there.
 */
/**
 * Where the source has been overtaken.
 *
 * Set apart from the body on purpose. The lesson above is what the handbook
 * says; this is what has changed since, with the evidence named. Folding the
 * newer answer into the prose would produce a course that agrees with itself
 * and cites a book that no longer says that — and would leave a founder
 * defenceless the first time an investor quotes the older version at them.
 */
function Revision({ text }: { text: string }) {
    return (
        <aside className="mt-6 max-w-[68ch] rounded-xl border border-peach-soft bg-peach-soft/40 p-5">
            <p className="mb-2 flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.02em] text-peach">
                <History size={14} aria-hidden="true" /> Overtaken since 2018
            </p>
            <p className="text-[15px] leading-7 text-ink">{text}</p>
            <p className="mt-3 text-[12px] leading-5 text-caption">
                Both positions are given because you will meet both. Financing, legal and valuation figures move —
                these were researched in September 2026.
            </p>
        </aside>
    );
}

/** Honest status for the first animated episode until a mastered media file and captions are published. */
function VideoPilotStatus() {
    return (
        <aside className="mb-5 flex items-start gap-3 rounded-xl border border-brand-soft bg-brand-soft/45 p-4">
            <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-full bg-card text-brand" aria-hidden="true"><Play size={14} fill="currentColor" /></span>
            <div>
                <p className="text-[14px] font-semibold">Animated video pilot is in production</p>
                <p className="mt-1 text-[13px] leading-5 text-muted">This lesson is available as a reading while the narrated Course 01 pilot and captions are being produced. Your progress and activities will carry over when it is published.</p>
            </div>
        </aside>
    );
}

/** A small, safe Markdown subset for imported lesson copy. Course material is
 * authored as prose with inline emphasis, so render those marks rather than
 * showing them literally. No course text is ever injected as HTML. */
function InlineMarkdown({ text }: { text: string }) {
    const tokens = text.split(/(!?\[[^\]\n]+\]\([^\s)]+\)|\*\*[^*\n]+\*\*|\*[^*\n]+\*|`[^`\n]+`)/g);

    return (
        <>
            {tokens.map((token, index) => {
                const resource = token.match(/^(!?)\[([^\]]+)\]\(([^\s)]+)\)$/);
                if (resource) return <LessonResource key={index} image={resource[1] === "!"} label={resource[2]} url={resource[3]} />;
                if (token.startsWith("**") && token.endsWith("**")) {
                    return <strong key={index} className="font-semibold text-ink">{token.slice(2, -2)}</strong>;
                }
                if (token.startsWith("*") && token.endsWith("*")) {
                    return <em key={index}>{token.slice(1, -1)}</em>;
                }
                if (token.startsWith("`") && token.endsWith("`")) {
                    return <code key={index} className="rounded bg-page px-1 py-0.5 font-medium text-ink">{token.slice(1, -1)}</code>;
                }
                return token;
            })}
        </>
    );
}

export function ReadingBody({ body }: { body: string }) {
    const paragraphs = body.trim().split(/\n{2,}/);

    return (
        <div className="max-w-[70ch]">
            {paragraphs.map((paragraph, index) => {
                const lines = paragraph.split("\n").filter(Boolean);
                const isOrderedList = lines.length > 0 && lines.every((line) => /^\d+\.\s+/.test(line));
                const isUnorderedList = lines.length > 0 && lines.every((line) => /^[-*]\s+/.test(line));
                const spacing = index === paragraphs.length - 1 ? "" : "mb-5";
                if (lines.length === 1 && /^#{1,3}\s+/.test(lines[0])) return <h3 key={index} className="mb-4 mt-7 text-xl font-semibold leading-snug">{lines[0].replace(/^#{1,3}\s+/, "")}</h3>;

                if (isOrderedList) {
                    return (
                        <ol key={index} className={cn("list-decimal space-y-2 pl-6 text-[16px] leading-8 text-ink", spacing)}>
                            {lines.map((line, lineIndex) => <li key={lineIndex}><InlineMarkdown text={line.replace(/^\d+\.\s+/, "")} /></li>)}
                        </ol>
                    );
                }
                if (isUnorderedList) {
                    return (
                        <ul key={index} className={cn("list-disc space-y-2 pl-6 text-[16px] leading-8 text-ink", spacing)}>
                            {lines.map((line, lineIndex) => <li key={lineIndex}><InlineMarkdown text={line.replace(/^[-*]\s+/, "")} /></li>)}
                        </ul>
                    );
                }
                return (
                    <p key={index} className={cn("text-[16px] leading-8 text-ink", spacing)}>
                        {lines.map((line, lineIndex) => <span key={lineIndex}>{lineIndex > 0 && <br />}<InlineMarkdown text={line} /></span>)}
                    </p>
                );
            })}
        </div>
    );
}

type VisualFramework = {
    label: string;
    question: string;
    output: string;
    steps: [string, string, string];
};

/** Each course has its own decision model. Rotating its frames through the
 * lessons makes the curriculum scannable without turning it into a wall of
 * text or relying on decorative stock imagery. */
const VISUAL_FRAMEWORKS: Record<string, VisualFramework[]> = {
    "c-opportunity": [
        { label: "Evidence ladder", question: "What would move this from a guess to evidence?", output: "A next test with a clear pass or fail signal", steps: ["Notice the struggle", "Name the cost", "Test the claim"] },
        { label: "Opportunity lens", question: "Is this pain sharp enough, reachable enough and viable enough?", output: "A pursue, reshape or pause decision", steps: ["Customer", "Pain", "Economics"] },
        { label: "Assumption loop", question: "Which uncertain claim could break the whole idea?", output: "One risk ranked ahead of every feature", steps: ["Claim", "Confidence", "Proof"] },
    ],
    "c-market": [
        { label: "Market map", question: "Who has the job, who pays and where can you reach them?", output: "A specific beachhead segment", steps: ["Job", "Segment", "Reach"] },
        { label: "Research loop", question: "What answer would change your next decision?", output: "A fieldwork plan, not a research scrapbook", steps: ["Question", "Fieldwork", "Pattern"] },
        { label: "Demand test", question: "What meaningful action will a real customer take?", output: "A threshold for evidence of demand", steps: ["Offer", "Action", "Threshold"] },
    ],
    "c-business-model": [
        { label: "Value engine", question: "How does a customer benefit become a viable business?", output: "A connected model instead of isolated ideas", steps: ["Customer", "Promise", "Delivery"] },
        { label: "Model balance", question: "Does the route to customers support the price and cost base?", output: "A model with visible economic pressure points", steps: ["Channel", "Revenue", "Cost"] },
        { label: "Canvas test", question: "Which block is still built on the weakest evidence?", output: "Three assumptions turned into experiments", steps: ["Claim", "Mechanism", "Experiment"] },
    ],
    "c-brand": [
        { label: "Brand compass", question: "What should the right customer remember and believe?", output: "A focused position with proof", steps: ["Audience", "Promise", "Proof"] },
        { label: "Message system", question: "Would this sound recognisable without the logo?", output: "A voice teams can use consistently", steps: ["Traits", "Language", "Story"] },
        { label: "Recognition loop", question: "Do the experience and the claim reinforce each other?", output: "A visual direction that supports the strategy", steps: ["Signal", "Touchpoint", "Memory"] },
    ],
    "c-mvp": [
        { label: "Learning loop", question: "What is the smallest way to deliver and observe first value?", output: "A testable MVP, not a reduced product roadmap", steps: ["User task", "Smallest delivery", "Observed result"] },
        { label: "Focus filter", question: "What must work before anything else matters?", output: "A clear must-have and not-now list", steps: ["Core outcome", "Must-have", "Not now"] },
        { label: "Prototype path", question: "How will you see a real person try the workflow?", output: "A customer test with one decision attached", steps: ["Prototype", "Observe", "Iterate"] },
    ],
    "c-marketing": [
        { label: "Go-to-market path", question: "Can the right person move from first attention to first value?", output: "One coherent audience, offer and route", steps: ["Audience", "Message", "Channel"] },
        { label: "Content engine", question: "Which useful answer earns attention before the ask?", output: "Content tied to a real customer question", steps: ["Question", "Useful proof", "Next action"] },
        { label: "Campaign signal", question: "Which metric tells you what to change next?", output: "A bounded experiment, not vanity reporting", steps: ["Hypothesis", "Measure", "Decision"] },
    ],
    "c-sales": [
        { label: "Sales conversation", question: "What customer decision are you helping make?", output: "A respectful route to a qualified next step", steps: ["Diagnose", "Confirm fit", "Advance"] },
        { label: "Pipeline view", question: "Where does a good prospect stop moving?", output: "A measurable funnel with a bottleneck", steps: ["Lead", "Conversation", "Commitment"] },
        { label: "Trust loop", question: "What proof resolves the risk behind this objection?", output: "A specific response instead of an automatic discount", steps: ["Concern", "Clarify", "Proof"] },
    ],
    "c-finance": [
        { label: "Money map", question: "What changes with one more customer, and when does cash move?", output: "A model that separates revenue, margin and cash", steps: ["Revenue", "Direct cost", "Cash timing"] },
        { label: "Price check", question: "Does the price sustain the experience you promise?", output: "A price range tested against volume and margin", steps: ["Value", "Margin", "Volume"] },
        { label: "Funding logic", question: "What evidence or milestone would this money buy?", output: "A funding choice matched to risk and runway", steps: ["Milestone", "Runway", "Terms"] },
    ],
    "c-launch": [
        { label: "Launch system", question: "What happens when an interested customer says yes?", output: "A launch that joins offer, delivery and learning", steps: ["Promise", "Customer action", "Delivery"] },
        { label: "Early-customer loop", question: "When will you hear whether first value actually happened?", output: "A feedback plan that captures behaviour and outcomes", steps: ["Onboard", "First value", "Follow through"] },
        { label: "Launch review", question: "What does the evidence say to keep, improve, stop or repeat?", output: "A focused post-launch decision", steps: ["Measure", "Interpret", "Change"] },
    ],
    "c-growth": [
        { label: "Growth system", question: "Is more acquisition increasing customer value and capacity together?", output: "A growth condition worth accelerating", steps: ["Acquire", "Retain", "Deliver"] },
        { label: "Metric tree", question: "Which measure explains whether customers receive real value?", output: "A north-star metric with useful supporting signals", steps: ["Value", "Driver", "Decision"] },
        { label: "Scale guardrail", question: "What must not break while the business gets bigger?", output: "Explicit customer, cash and team safeguards", steps: ["Systemise", "Monitor", "Protect"] },
    ],
};

function LessonVisual({ courseId, lessonIndex, lessonTitle }: { courseId: string; lessonIndex: number; lessonTitle: string }) {
    const frames = VISUAL_FRAMEWORKS[courseId] ?? VISUAL_FRAMEWORKS["c-opportunity"];
    const frame = frames[lessonIndex % frames.length];

    return (
        <section className="my-7 overflow-hidden rounded-2xl border border-brand-soft bg-[linear-gradient(135deg,rgba(255,244,238,0.96),rgba(255,255,255,0.98)_45%,rgba(237,247,244,0.9))] p-5 max-md:p-4" aria-label={`${frame.label} visual framework`}>
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-brand-ink">Visual framework</p>
                    <h2 className="mt-1 text-[19px] font-semibold text-ink">{frame.label} for {lessonTitle}</h2>
                </div>
                <span className="rounded-full border border-brand-soft bg-card px-3 py-1 text-[12px] font-semibold text-brand-ink">See the decision</span>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
                {frame.steps.map((step, stepIndex) => (
                    <div key={step} className="relative min-h-24 rounded-xl border border-white/80 bg-card/85 p-4 shadow-[0_10px_24px_-22px_rgba(42,32,20,0.72)]">
                        <span className="grid size-7 place-items-center rounded-full bg-ink text-[12px] font-semibold text-white">{stepIndex + 1}</span>
                        <p className="mt-3 text-[14px] font-semibold leading-5 text-ink">{step}</p>
                        {stepIndex < frame.steps.length - 1 && <span className="absolute -right-2 top-1/2 z-10 hidden size-4 -translate-y-1/2 rounded-full border border-brand-soft bg-card text-center text-[11px] leading-[14px] text-brand md:block" aria-hidden="true">›</span>}
                    </div>
                ))}
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
                <div className="rounded-xl border border-brand-soft/70 bg-card/70 p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted">Ask</p>
                    <p className="mt-1 text-[14px] font-medium leading-6 text-ink">{frame.question}</p>
                </div>
                <div className="rounded-xl bg-ink p-4 text-white">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-white/65">Leave with</p>
                    <p className="mt-1 text-[14px] font-medium leading-6">{frame.output}</p>
                </div>
            </div>
        </section>
    );
}

const SECTION_FOR_CATEGORY: Record<CategoryId, VentureSectionId> = {
    start: "opportunity",
    fund: "money",
    grow: "traction",
};

function ActivityCapture({ block, courseId, lessonTitle, categoryId }: { block: LessonBlock; courseId: string; lessonTitle: string; categoryId: CategoryId }) {
    const { user, mutate } = useData();
    const { toast } = useToast();
    const [answer, setAnswer] = useState("");
    const [saving, setSaving] = useState<"venture" | "task" | null>(null);
    const sectionId = SECTION_FOR_CATEGORY[categoryId];

    const requireAnswer = () => {
        if (answer.trim()) return true;
        toast("Write your answer first — this is the work that moves your venture forward.", "danger");
        return false;
    };

    const saveToVenture = async () => {
        if (!requireAnswer()) return;
        setSaving("venture");
        const existing = user.venture.sections[sectionId];
        const nextSection: VentureSection = {
            body: existing?.body ?? "",
            claims: [
                ...(existing?.claims ?? []),
                {
                    id: `lesson-${block.id}-${Date.now()}`,
                    text: `${lessonTitle}: ${answer.trim()}`,
                    confidence: "guess",
                    test: "",
                },
            ],
            updatedAt: new Date().toISOString(),
        };
        const sections: Partial<Record<VentureSectionId, VentureSection>> = { [sectionId]: nextSection };
        try {
            await mutate((repo) => repo.saveVenture({ sections }));
            toast("Saved as a venture decision", "success");
        } finally {
            setSaving(null);
        }
    };

    const createTask = async () => {
        if (!requireAnswer()) return;
        setSaving("task");
        const due = new Date();
        due.setDate(due.getDate() + 3);
        due.setHours(18, 0, 0, 0);
        try {
            await mutate((repo) => repo.addTask({ title: `${lessonTitle}: ${answer.trim()}`, courseId, dueAt: due.toISOString() }));
            toast("Added to your next actions", "success");
        } finally {
            setSaving(null);
        }
    };

    return (
        <section className="rounded-xl border border-peach-soft bg-peach-soft/45 p-5">
            <div className="mb-2 flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.05em] text-peach">
                <FileText size={13} aria-hidden="true" /> Apply it now
            </div>
            <h2 className="text-[17px] font-semibold">{block.title}</h2>
            <p className="mt-2 max-w-[68ch] whitespace-pre-wrap text-[15px] leading-7 text-ink"><InlineMarkdown text={block.content} /></p>
            <label className="sr-only" htmlFor={`activity-${block.id}`}>Your answer</label>
            <textarea
                id={`activity-${block.id}`}
                value={answer}
                onChange={(event) => setAnswer(event.target.value)}
                placeholder="Write the decision, evidence, or next experiment you will make…"
                rows={4}
                className="mt-4 w-full resize-y rounded-lg border border-line-strong bg-card px-3 py-3 text-[14px] leading-6 outline-none placeholder:text-caption focus:border-brand focus:shadow-[0_0_0_3px_var(--color-brand-soft)]"
            />
            <div className="mt-3 flex flex-wrap gap-2">
                <Button variant="brand" size="md" loading={saving === "venture"} onClick={() => void saveToVenture()}>Save to venture</Button>
                <Button variant="outline" size="md" loading={saving === "task"} onClick={() => void createTask()}>Make this a task</Button>
                <Link to={`/experiments?title=${encodeURIComponent(lessonTitle)}&hypothesis=${encodeURIComponent(answer)}`} className="inline-flex h-9 items-center rounded-full px-3 text-[13px] font-semibold text-brand hover:bg-brand-soft">Make it a field test</Link>
                <Link to={`/adviser?draft=${encodeURIComponent(answer || `Challenge my thinking on ${lessonTitle}.`)}`} className="inline-flex h-9 items-center rounded-full px-3 text-[13px] font-semibold text-brand hover:bg-brand-soft">Ask the adviser</Link>
            </div>
        </section>
    );
}

/** A lesson has one practical flow: understand it, see it, then make it real. */
function LessonBlocks({ blocks, courseId, lessonTitle, categoryId }: { blocks: LessonBlock[]; courseId: string; lessonTitle: string; categoryId: CategoryId }) {
    // The reading and visual framework already carry the objective and lesson
    // explanation. Keep this section for the applied case and work, rather
    // than showing the same sentences twice.
    const examples = blocks.filter((block) => block.type === "example");
    const activity = blocks.find((block) => block.type === "activity");
    const support = blocks.filter((block) => !["objective", "learn", "example", "activity"].includes(block.type));

    return (
        <div className="flex flex-col gap-5">
            {examples.length > 0 && (
                <section className="rounded-xl border border-line bg-page p-5" aria-label="Worked case">
                    {examples.map((block, index) => (
                        <div key={block.id} className={cn(index > 0 && "mt-5 border-t border-line pt-5")}>
                            <div className="mb-2 text-[12px] font-semibold uppercase tracking-[0.05em] text-muted">Worked case</div>
                            <h2 className="mb-2 text-[17px] font-semibold text-ink">{block.title}</h2>
                            <p className="max-w-[68ch] whitespace-pre-wrap text-[15px] leading-7 text-ink"><InlineMarkdown text={block.content} /></p>
                        </div>
                    ))}
                </section>
            )}
            {activity && <ActivityCapture block={activity} courseId={courseId} lessonTitle={lessonTitle} categoryId={categoryId} />}
            {support.length > 0 && (
                <div className="grid gap-4 md:grid-cols-2">
                    {support.map((block) => (
                        <section key={block.id} className={cn("rounded-xl border p-5", block.type === "ai_activity" ? "border-brand-soft bg-brand-soft/45" : "border-line bg-page")}>
                            <div className="mb-2 flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.05em] text-muted">
                                <FileText size={13} aria-hidden="true" /> {block.title}
                            </div>
                            <p className="whitespace-pre-wrap text-[14px] leading-6 text-ink"><InlineMarkdown text={block.content} /></p>
                            {block.actionHref && block.actionLabel && (
                                <Link to={block.actionHref} className="mt-4 inline-flex rounded-full bg-ink px-4 py-2 text-[13px] font-semibold text-white hover:bg-brand">{block.actionLabel}</Link>
                            )}
                        </section>
                    ))}
                </div>
            )}
        </div>
    );
}


export default function LessonPage() {
    const { slug, lessonId } = useParams();
    const { catalogue, user, mutate, repo } = useData();
    const { toast } = useToast();
    const navigate = useNavigate();

    const course = courseBySlug(catalogue, slug);
    const lessons = useMemo(() => (course ? lessonsOf(catalogue, course.id) : []), [catalogue, course]);
    const index = lessons.findIndex((l) => l.id === lessonId);
    const lesson = lessons[index];
    const prev = lessons[index - 1];
    const next = lessons[index + 1];
    const [tab, setTab] = useState<"curriculum" | "notes">("curriculum");
    const [videoSec, setVideoSec] = useState<number | null>(null);
    const seconds = useRef(0);
    const flushed = useRef(0);
    const enrolled = course ? isEnrolled(user, course.id) : false;

    // Enrol on first open — arriving here from a link is intent enough.
    useEffect(() => {
        if (course && !enrolled) void mutate((r) => r.enroll(course.id));
    }, [course, enrolled, mutate]);

    // Study time: a tick per second of playback (video) or visible reading
    // (article/quiz). Flushed in whole minutes when the lesson changes or
    // the page goes away — so a closed tab still gets credit.
    const flush = useCallback(() => {
        const mins = Math.floor((seconds.current - flushed.current) / 60);
        if (mins >= 1 && lesson) {
            flushed.current += mins * 60;
            void repo.logStudy(lesson.id, mins);
        }
    }, [repo, lesson]);

    useEffect(() => {
        seconds.current = 0;
        flushed.current = 0;
        let timer: number | undefined;
        if (lesson && lesson.kind !== "video") {
            timer = window.setInterval(() => {
                if (document.visibilityState === "visible") seconds.current += 1;
            }, 1000);
        }
        const onHide = () => {
            if (document.visibilityState === "hidden") flush();
        };
        document.addEventListener("visibilitychange", onHide);
        window.addEventListener("pagehide", flush);
        return () => {
            if (timer) window.clearInterval(timer);
            document.removeEventListener("visibilitychange", onHide);
            window.removeEventListener("pagehide", flush);
            flush();
            // Leftover seconds under a minute still count.
            const rem = seconds.current - flushed.current;
            if (rem >= 20 && lesson) void repo.logStudy(lesson.id, 1);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [lesson?.id]);

    const onTick = useCallback(() => {
        seconds.current += 1;
    }, []);

    const saveProgress = useCallback(
        (pos: number, dur: number) => {
            if (!lesson) return;
            setVideoSec(pos);
            const done = dur > 0 && pos / dur >= 0.9;
            void repo.saveProgress(lesson.id, pos, done);
        },
        [repo, lesson],
    );

    const onVideoEnded = useCallback(() => {
        if (!lesson) return;
        void mutate((r) => r.saveProgress(lesson.id, 0, true)).then(() => toast(next ? "Done — next lesson is ready" : "Course complete!", "success"));
    }, [lesson, next, mutate, toast]);

    const complete = async () => {
        if (!lesson) return;
        if (lesson.id.startsWith("v2-")) { navigate(`/opportunity-practice/${course!.slug}`); return; }
        await mutate((r) => r.saveProgress(lesson.id, 0, true));
        toast("Lesson complete", "success");
        if (next) navigate(`/learn/${course!.slug}/${next.id}`);
    };

    if (!course || !lesson) return <EmptyState title="Lesson not found" action={<Link to="/courses" className="font-semibold text-brand underline">Back to courses</Link>} />;

    const progress = courseProgress(catalogue, user, course.id);
    const done = isDone(user, lesson.id);
    const saved = user.progress.find((p) => p.lessonId === lesson.id);
    const notes = user.notes.filter((n) => n.lessonId === lesson.id);
    const questions = catalogue.quiz.filter((q) => q.lessonId === lesson.id);
    const blocks = catalogue.lessonBlocks.filter((block) => block.lessonId === lesson.id).sort((a, b) => a.sort - b.sort);
    const lastAttempt = user.attempts.find((a) => a.lessonId === lesson.id);
    const startAt = saved?.completedAt ? 0 : (saved?.positionSec ?? 0);
    const yt = lesson.videoUrl ? youtubeId(lesson.videoUrl) : null;
    const isCourseOnePilot = course.slug === "from-idea-to-opportunity" && lesson.id === "c-opportunity-l-1";

    return (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
            <div className="min-w-0">
                <Link to={`/courses/${course.slug}`} className="mb-3 inline-flex items-center gap-1.5 text-[13px] font-medium text-muted hover:text-ink">
                    <ArrowLeft size={14} /> {course.title}
                </Link>

                <div className="mb-5 flex flex-wrap items-start gap-3">
                    <div className="min-w-0 flex-1">
                        <Tag tone={course.categoryId} icon={<CategoryIcon id={course.categoryId} />}>{CATEGORY_LABEL[course.categoryId]}</Tag>
                        <h1 className="mt-2 text-[24px] font-semibold leading-8 text-ink">{lesson.title}</h1>
                        {lesson.kind === "video" && <p className="mt-2 max-w-2xl text-[14px] leading-6 text-muted"><InlineMarkdown text={lesson.body} /></p>}
                    </div>
                    {lesson.kind !== "quiz" && (
                        <Button variant={done ? "tonal" : "brand"} size="md" onClick={() => void complete()} disabled={done}>
                            <Check size={14} strokeWidth={2.5} /> {done ? "Completed" : lesson.id.startsWith("v2-") ? "Complete the artifact" : "Mark complete"}
                        </Button>
                    )}
                </div>

                {lesson.kind === "video" && yt ? (
                    <>
                        <YouTubePlayer key={lesson.id} videoId={yt} title={lesson.title} source={lesson.source} startAt={startAt} onProgress={saveProgress} onEnded={onVideoEnded} onPlayingSecond={onTick} />
                        {blocks.length > 0 && <div className="mt-6"><LessonBlocks blocks={blocks} courseId={course.id} lessonTitle={lesson.title} categoryId={course.categoryId} /></div>}
                    </>
                ) : lesson.kind === "video" && lesson.videoUrl ? (
                    <>
                        <VideoPlayer key={lesson.id} src={lesson.videoUrl} captions={lesson.captionsUrl} title={lesson.title} startAt={startAt} onProgress={saveProgress} onEnded={onVideoEnded} onPlayingSecond={onTick} />
                        {blocks.length > 0 && <div className="mt-6"><LessonBlocks blocks={blocks} courseId={course.id} lessonTitle={lesson.title} categoryId={course.categoryId} /></div>}
                    </>
                ) : lesson.kind === "article" ? (
                    <>
                        {isCourseOnePilot && <VideoPilotStatus />}
                        <article className="rounded-xl border border-line bg-card p-7 max-md:p-5">
                        <div className="mb-5 flex items-center gap-2 border-b border-line pb-4 text-[12px] font-medium text-caption">
                            <FileText size={14} /> Reading · {duration(lesson.durationSec)}
                        </div>
                        <ReadingBody body={lesson.body} />
                        <LessonVisual courseId={course.id} lessonIndex={index} lessonTitle={lesson.title} />
                        {lesson.revision && <Revision text={lesson.revision} />}
                        {blocks.length > 0 && <div className="mt-7"><LessonBlocks blocks={blocks} courseId={course.id} lessonTitle={lesson.title} categoryId={course.categoryId} /></div>}
                        </article>
                    </>
                ) : (
                    <div className="rounded-xl bg-page p-3 max-md:p-0">
                        <div className="mb-3 flex items-center gap-2 px-2 pt-1 text-[12px] text-caption max-md:px-4 max-md:pt-3">
                            <HelpCircle size={14} /> Module check · {questions.length} questions
                        </div>
                        <Quiz key={lesson.id} questions={questions} lastScore={lastAttempt} onSubmit={(score, total) => mutate((r) => r.submitQuiz(lesson.id, score, total))} />
                    </div>
                )}

                {lesson.kind === "quiz" && blocks.length > 0 && (
                    <div className="mt-6"><LessonBlocks blocks={blocks} courseId={course.id} lessonTitle={lesson.title} categoryId={course.categoryId} /></div>
                )}

                <nav className="mt-6 flex items-center justify-between gap-3 border-t border-line pt-4" aria-label="Lesson navigation">
                    {prev ? (
                        <Link to={`/learn/${course.slug}/${prev.id}`} className="flex min-w-0 items-center gap-2 text-[13px] font-medium text-muted hover:text-ink">
                            <ChevronLeft size={16} /> <span className="truncate">{prev.title}</span>
                        </Link>
                    ) : (
                        <span />
                    )}
                    {next ? (
                        <Link to={`/learn/${course.slug}/${next.id}`} className="flex min-w-0 items-center gap-2 text-[13px] font-semibold text-brand">
                            <span className="truncate">{next.title}</span> <ChevronRight size={16} />
                        </Link>
                    ) : (
                        <Link to={`/courses/${course.slug}`} className="text-[13px] font-semibold text-brand">
                            Back to course
                        </Link>
                    )}
                </nav>
            </div>

            <aside className="min-w-0">
                <div className="rounded-xl bg-card p-4 xl:sticky xl:top-(--cs-rail-top)">
                    <div className="mb-3">
                        <div className="text-[12px] text-muted">
                            {progress.done}/{progress.total} lessons · {progress.pct}%
                        </div>
                        <ProgressBar value={progress.pct} className="mt-1.5" />
                    </div>
                    <div className="mb-3 grid grid-cols-2 rounded-sm bg-page p-1 text-[13px] font-semibold" role="tablist">
                        {(["curriculum", "notes"] as const).map((t) => (
                            <button key={t} role="tab" type="button" aria-selected={tab === t} onClick={() => setTab(t)} className={cn("rounded-[9px] py-1.5 capitalize", tab === t ? "bg-card text-ink shadow-hover" : "text-muted")}>
                                {t} {t === "notes" && notes.length ? `(${notes.length})` : ""}
                            </button>
                        ))}
                    </div>
                    {tab === "curriculum" ? (
                        <ol className="max-h-[60vh] overflow-y-auto">
                            {lessons.map((l, i) => {
                                const d = isDone(user, l.id);
                                const cur = l.id === lesson.id;
                                const thumb = l.kind === "video" && l.videoUrl ? youtubeId(l.videoUrl) : null;
                                return (
                                    <li key={l.id}>
                                        <Link to={`/learn/${course.slug}/${l.id}`} aria-current={cur ? "page" : undefined} className={cn("flex items-center gap-3 rounded-md px-2 py-2 text-[13px]", cur ? "bg-brand-soft font-semibold text-brand-ink" : "hover:bg-page")}>
                                            {thumb ? (
                                                <span className="relative h-9 w-16 shrink-0 overflow-hidden rounded-[6px] bg-line">
                                                    <img src={youtubeThumb(thumb)} alt="" width={64} height={36} loading="lazy" className="size-full object-cover" />
                                                    {d && <span className="absolute inset-0 grid place-items-center bg-mint/70 text-white"><Check size={14} strokeWidth={3} /></span>}
                                                </span>
                                            ) : (
                                                <span className={cn("grid size-6 shrink-0 place-items-center rounded-full text-[11px]", d ? "bg-mint-soft text-mint" : cur ? "bg-brand text-white" : "bg-page text-muted")}>{d ? <Check size={12} strokeWidth={3} /> : l.kind === "video" ? <Play size={10} /> : i + 1}</span>
                                            )}
                                            <span className="min-w-0 flex-1 truncate">{l.title}</span>
                                            <span className="text-[11px] text-caption">{l.kind === "quiz" ? "quiz" : duration(l.durationSec)}</span>
                                        </Link>
                                    </li>
                                );
                            })}
                        </ol>
                    ) : (
                        <NotesPanel notes={notes} currentSec={lesson.kind === "video" ? videoSec : null} onAdd={(body, at) => mutate((r) => r.addNote(lesson.id, body, at))} onDelete={(id) => mutate((r) => r.deleteNote(id))} />
                    )}
                </div>
            </aside>
        </div>
    );
}
