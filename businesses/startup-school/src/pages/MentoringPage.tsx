import { useCallback, useEffect, useMemo, useState } from "react";
import {
    AlertTriangle,
    CalendarClock,
    Check,
    FileText,
    MessageSquareQuote,
    RefreshCw,
    Send,
    TrendingDown,
    X,
} from "lucide-react";
import {
    viewerTz,
    type CohortSignal,
    type Mentor,
    type MentorBooking,
    type SessionBrief,
    type SessionCapture,
} from "@startup-school/core";
import { PageTitle } from "@/components/shell/AppShell";
import { Avatar, Button, Card, EmptyState, Overline, ProgressBar, Spinner, Tag } from "@/components/ui/primitives";
import { useData } from "@/state/data";
import { useToast } from "@/state/toast";
import { cn } from "@/lib/cn";

/**
 * The mentor's desk.
 *
 * Two AI features live here and both are shaped the same way: they serve the
 * person teaching, or they produce a draft a person approves. That shape is not
 * a stylistic preference. The two trials that showed a benefit from AI tutoring
 * had a teacher in the loop; the one that let students talk to a model
 * unsupervised left them worse off on an unassisted exam. So nothing on this
 * page writes to a founder's record on its own.
 */

const tz = viewerTz();

const when = (iso: string): string =>
    new Intl.DateTimeFormat(undefined, {
        weekday: "short", day: "numeric", month: "short",
        hour: "2-digit", minute: "2-digit", timeZone: tz,
    }).format(new Date(iso));

// ---------------------------------------------------------------------------

function BriefPanel({ booking }: { booking: MentorBooking }) {
    const { repo } = useData();
    const [brief, setBrief] = useState<SessionBrief | null>(null);
    const [state, setState] = useState<"idle" | "loading" | "empty">("idle");

    const load = useCallback(
        async (force = false) => {
            setState("loading");
            const b = await repo.sessionBrief(booking.id, force);
            setBrief(b);
            setState(b ? "idle" : "empty");
        },
        [repo, booking.id],
    );

    if (state === "idle" && !brief) {
        return (
            <Button variant="outline" onClick={() => void load()}>
                <FileText size={14} /> Prepare
            </Button>
        );
    }

    if (state === "loading") {
        return (
            <p className="flex items-center gap-2 text-[14px] text-muted">
                <Spinner /> Reading their record…
            </p>
        );
    }

    if (state === "empty" || !brief) {
        return <p className="text-[14px] text-caption">There isn&rsquo;t enough on their record to prepare from yet.</p>;
    }

    return (
        <div className="mt-4 rounded-xl border border-line p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <Overline>Before you start</Overline>
                <button
                    type="button"
                    onClick={() => void load(true)}
                    className="flex items-center gap-1.5 text-[12px] text-caption hover:text-ink"
                >
                    <RefreshCw size={12} /> Rebuild
                </button>
            </div>

            <p className="text-[15px] font-semibold leading-6">{brief.headline}</p>

            {brief.context.length > 0 && (
                <ul className="mt-3 flex flex-col gap-1.5">
                    {brief.context.map((c, i) => (
                        <li key={i} className="flex items-start gap-2 text-[14px] leading-6">
                            <span className="mt-2.5 size-1 shrink-0 rounded-full bg-caption" aria-hidden="true" />
                            {c}
                        </li>
                    ))}
                </ul>
            )}

            {brief.openWith && (
                <div className="mt-4 rounded-xl bg-page p-3.5">
                    <Overline>Open with</Overline>
                    <p className="mt-1 text-[14px] leading-6">{brief.openWith}</p>
                </div>
            )}

            {brief.watchFor.length > 0 && (
                <div className="mt-3">
                    <Overline>Watch for</Overline>
                    <ul className="mt-1.5 flex flex-col gap-1.5">
                        {brief.watchFor.map((w, i) => (
                            <li key={i} className="flex items-start gap-2 text-[14px] leading-6">
                                <AlertTriangle size={14} className="mt-1.5 shrink-0 text-peach" aria-hidden="true" />
                                {w}
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {brief.carriedOver.length > 0 && (
                <div className="mt-3">
                    <Overline>Left open last time</Overline>
                    <ul className="mt-1.5 flex flex-col gap-1.5">
                        {brief.carriedOver.map((c, i) => (
                            <li key={i} className="text-[14px] leading-6 text-muted">{c}</li>
                        ))}
                    </ul>
                </div>
            )}

            <p className="mt-4 border-t border-line pt-3 text-[12px] leading-5 text-caption">
                Built from their venture record, their progress and what last time left open. They cannot see this page.
            </p>
        </div>
    );
}

// ---------------------------------------------------------------------------

function CapturePanel({ booking }: { booking: MentorBooking }) {
    const { repo, mutate } = useData();
    const { toast } = useToast();
    const [draft, setDraft] = useState<SessionCapture | null>(null);
    const [notes, setNotes] = useState("");
    const [actions, setActions] = useState<{ body: string; keep: boolean }[]>([]);
    const [state, setState] = useState<"idle" | "loading" | "empty">("idle");
    const [busy, setBusy] = useState(false);

    const load = async () => {
        setState("loading");
        const d = await repo.captureSession(booking.id);
        if (!d) {
            setState("empty");
            return;
        }
        setDraft(d);
        setNotes(d.notes);
        setActions(d.actions.map((body) => ({ body, keep: true })));
        setState("idle");
    };

    const approve = async () => {
        setBusy(true);
        try {
            await mutate((r) =>
                r.saveSessionNotes(booking.id, notes.trim(), actions.filter((a) => a.keep && a.body.trim()).map((a) => a.body.trim())),
            );
            setDraft(null);
            toast("Notes sent to the founder");
        } catch (e) {
            toast(e instanceof Error ? e.message : "Could not save that");
        } finally {
            setBusy(false);
        }
    };

    if (state === "loading") {
        return (
            <p className="flex items-center gap-2 text-[14px] text-muted">
                <Spinner /> Reading the session…
            </p>
        );
    }

    if (state === "empty") {
        return (
            <p className="text-[14px] text-caption">
                Not enough of this session was recorded to write it up. Captions need to be on during the call.
            </p>
        );
    }

    if (!draft) {
        return (
            <Button variant="outline" onClick={() => void load()}>
                <MessageSquareQuote size={14} /> Draft the write-up
            </Button>
        );
    }

    return (
        <div className="mt-4 rounded-xl border border-line p-4">
            <div className="mb-3 flex flex-wrap items-center gap-2">
                <Overline>Draft</Overline>
                <Tag tone="warn">Not sent yet</Tag>
            </div>

            <label className="block">
                <span className="mb-1.5 block text-[13px] font-semibold">Notes the founder will see</span>
                <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={5}
                    className="w-full resize-y rounded-xl border border-line bg-card px-3.5 py-3 text-[14px] leading-6 outline-none focus:border-brand"
                />
            </label>

            {actions.length > 0 && (
                <>
                    <p className="mb-2 mt-4 text-[13px] font-semibold">Action items — untick anything that was not agreed</p>
                    <ul className="flex flex-col gap-2">
                        {actions.map((a, i) => (
                            <li key={i} className="flex items-start gap-2.5">
                                <button
                                    type="button"
                                    aria-pressed={a.keep}
                                    onClick={() => setActions((l) => l.map((x, j) => (j === i ? { ...x, keep: !x.keep } : x)))}
                                    className={cn(
                                        "mt-2 grid size-[18px] shrink-0 place-items-center rounded-md border",
                                        a.keep ? "border-brand bg-brand text-white" : "border-line-strong",
                                    )}
                                >
                                    {a.keep && <Check size={11} strokeWidth={3} />}
                                    <span className="sr-only">Keep this action</span>
                                </button>
                                <input
                                    value={a.body}
                                    onChange={(e) => setActions((l) => l.map((x, j) => (j === i ? { ...x, body: e.target.value } : x)))}
                                    className={cn(
                                        "min-w-0 flex-1 rounded-lg border border-line bg-card px-3 py-2 text-[14px] outline-none focus:border-brand",
                                        !a.keep && "text-caption line-through",
                                    )}
                                />
                            </li>
                        ))}
                    </ul>
                </>
            )}

            <div className="mt-4 flex flex-wrap gap-2">
                <Button onClick={() => void approve()} disabled={busy || !notes.trim()}>
                    {busy ? <Spinner /> : <Send size={14} />} Send to the founder
                </Button>
                <Button variant="ghost" onClick={() => setDraft(null)} disabled={busy}>
                    <X size={14} /> Discard
                </Button>
            </div>

            <p className="mt-3 text-[12px] leading-5 text-caption">
                Nothing here has been saved. A summary of a conversation about someone&rsquo;s business is the wrong thing
                to publish unread — so you send it, not the model.
            </p>
        </div>
    );
}

// ---------------------------------------------------------------------------

function SessionRow({ booking, past }: { booking: MentorBooking; past: boolean }) {
    return (
        <Card as="li" className="flex flex-col">
            <div className="flex flex-wrap items-start gap-4">
                <Avatar name={booking.founderName} hue={booking.founderHue} src={booking.founderPhotoUrl} size="lg" />
                <div className="min-w-0 flex-1">
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                        <h3 className="text-[16px] font-semibold">{booking.founderName}</h3>
                        {booking.status === "cancelled" && <Tag tone="danger">Cancelled</Tag>}
                        {booking.status === "completed" && <Tag tone="ok">Done</Tag>}
                        {booking.status === "confirmed" && !past && <Tag tone="fund">Confirmed</Tag>}
                    </div>
                    {booking.founderOneLiner && (
                        <p className="mb-1 text-[14px] leading-6 text-muted">{booking.founderOneLiner}</p>
                    )}
                    <p className="flex items-center gap-1.5 text-[13px] text-caption">
                        <CalendarClock size={13} /> {when(booking.startsAt)}
                    </p>
                </div>
            </div>

            {booking.agenda && (
                <div className="mt-4 rounded-xl bg-page p-3.5">
                    <Overline>What they want to talk about</Overline>
                    <p className="mt-1 text-[14px] leading-6">{booking.agenda}</p>
                </div>
            )}

            {booking.sharedNotes && (
                <div className="mt-3 rounded-xl border border-line p-3.5">
                    <Overline>Notes you sent</Overline>
                    <p className="mt-1 text-[14px] leading-6">{booking.sharedNotes}</p>
                </div>
            )}

            <div className="mt-4">
                {past ? <CapturePanel booking={booking} /> : <BriefPanel booking={booking} />}
            </div>
        </Card>
    );
}

// ---------------------------------------------------------------------------

function Cohort({ rows }: { rows: CohortSignal[] }) {
    if (!rows.length) {
        return (
            <p className="text-[14px] text-caption">
                Not enough attempts yet to tell you anything. Two founders have to have tried the same quiz before a number here means something.
            </p>
        );
    }
    return (
        <ul className="flex flex-col gap-3">
            {rows.map((r) => (
                <li key={r.lessonId} className="rounded-xl border border-line p-3.5">
                    <div className="mb-1.5 flex flex-wrap items-baseline justify-between gap-2">
                        <span className="text-[15px] font-semibold">{r.lessonTitle}</span>
                        <span className="text-[13px] tabular-nums text-muted">
                            {r.avgScore}% over {r.attempts} attempts
                        </span>
                    </div>
                    <p className="mb-2 text-[13px] text-caption">{r.courseTitle}</p>
                    <ProgressBar value={r.avgScore} />
                </li>
            ))}
        </ul>
    );
}

// ---------------------------------------------------------------------------

export default function MentoringPage() {
    const { repo } = useData();
    const [mentor, setMentor] = useState<Mentor | null | undefined>(undefined);
    const [bookings, setBookings] = useState<MentorBooking[]>([]);
    const [cohort, setCohort] = useState<CohortSignal[]>([]);

    useEffect(() => {
        let live = true;
        (async () => {
            const m = await repo.myMentor();
            if (!live) return;
            setMentor(m);
            if (!m) return;
            const [b, c] = await Promise.all([repo.mentorBookings(), repo.cohortSignal(14)]);
            if (!live) return;
            setBookings(b);
            setCohort(c);
        })();
        return () => { live = false; };
    }, [repo]);

    const now = Date.now();
    const { upcoming, past } = useMemo(() => {
        const sorted = [...bookings].sort((a, b) => b.startsAt.localeCompare(a.startsAt));
        return {
            upcoming: sorted.filter((b) => b.status === "confirmed" && new Date(b.startsAt).getTime() >= now).reverse(),
            past: sorted.filter((b) => !(b.status === "confirmed" && new Date(b.startsAt).getTime() >= now)),
        };
    }, [bookings, now]);

    if (mentor === undefined) return <Spinner />;

    if (mentor === null) {
        return (
            <>
                <PageTitle title="Mentoring" />
                <EmptyState
                    icon={<CalendarClock size={22} />}
                    title="This page is for mentors"
                    body="Your account isn't linked to a mentor at this school, so there is nothing here. If that's wrong, the school's admin can link it."
                />
            </>
        );
    }

    return (
        <>
            <PageTitle
                title="Mentoring"
                sub={`${mentor.name} · ${mentor.sessionMin ?? 30}-minute sessions`}
            />

            {repo.kind === "demo" && (
                <Card className="mb-6">
                    <p className="text-[14px] leading-6">
                        <strong className="font-semibold">In the demo</strong> you are looking at the mentor&rsquo;s side of
                        your own two sessions, so you can see both halves. In a real school this page only exists for an
                        account linked to a mentor, and the cohort numbers below come from the whole cohort rather than one person.
                    </p>
                </Card>
            )}

            {upcoming.length > 0 && (
                <>
                    <h2 className="mb-3 text-[18px] font-semibold">Coming up</h2>
                    <ul className="mb-8 flex flex-col gap-4">
                        {upcoming.map((b) => <SessionRow key={b.id} booking={b} past={false} />)}
                    </ul>
                </>
            )}

            {past.length > 0 && (
                <>
                    <h2 className="mb-3 text-[18px] font-semibold">Done</h2>
                    <ul className="mb-8 flex flex-col gap-4">
                        {past.map((b) => <SessionRow key={b.id} booking={b} past />)}
                    </ul>
                </>
            )}

            {!bookings.length && (
                <EmptyState
                    icon={<CalendarClock size={22} />}
                    title="Nothing booked"
                    body="When a founder takes one of your slots it appears here, with a preparation page built from their record."
                />
            )}

            <div className="mt-10">
                <div className="mb-1 flex items-center gap-2">
                    <TrendingDown size={16} className="text-brand" />
                    <h2 className="text-[18px] font-semibold">Where the cohort is going wrong</h2>
                </div>
                <p className="mb-4 text-[14px] text-muted">
                    The lessons this school&rsquo;s founders score worst on, over the last fortnight. No model involved —
                    it is a count — and it never names anyone. It is what to teach live on Thursday.
                </p>
                <Cohort rows={cohort} />
            </div>
        </>
    );
}
