import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CalendarClock, CalendarPlus, Check, Plus, X } from "lucide-react";
import { bookingToIcs, icsFilename, viewerTz, type Booking, type BookingAction, type Mentor } from "@startup-school/core";
import { PageTitle } from "@/components/shell/AppShell";
import { Avatar, Button, Card, EmptyState, Spinner, Tag } from "@/components/ui/primitives";
import { useData } from "@/state/data";
import { useTenant } from "@/state/tenant";
import { useToast } from "@/state/toast";
import { cn } from "@/lib/cn";

/**
 * The founder's 1:1 sessions.
 *
 * A course enrolment is a thing you work through; a session is a relationship
 * with a history. What makes it the second rather than a list of calendar
 * entries is the part below the fold — the agenda that was set beforehand, the
 * shared notes afterwards, and the action items that survive into the next one.
 */

const tz = viewerTz();

const when = (iso: string): string =>
    new Intl.DateTimeFormat(undefined, {
        weekday: "short", day: "numeric", month: "short",
        hour: "2-digit", minute: "2-digit", timeZone: tz,
    }).format(new Date(iso));

function Actions({ booking }: { booking: Booking }) {
    const { repo } = useData();
    const [items, setItems] = useState<BookingAction[] | null>(null);
    const [adding, setAdding] = useState("");

    const load = async () => setItems(await repo.bookingActions(booking.id));
    useEffect(() => {
        void load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [booking.id, repo]);

    if (items === null) return <Spinner />;

    const add = async () => {
        const body = adding.trim();
        if (!body) return;
        setAdding("");
        await repo.addBookingAction(booking.id, body);
        await load();
    };

    return (
        <div className="mt-4 border-t border-line pt-4">
            <h4 className="mb-2 text-[13px] font-semibold">Action items</h4>
            {!items.length && <p className="mb-2 text-[13px] text-caption">Nothing carried out of this one yet.</p>}
            <ul className="mb-3 flex flex-col gap-1.5">
                {items.map((a) => (
                    <li key={a.id}>
                        <button
                            type="button"
                            onClick={() => void repo.toggleBookingAction(a.id).then(load)}
                            className="flex w-full items-start gap-2.5 text-left text-[14px]"
                        >
                            <span
                                className={cn(
                                    "mt-0.5 grid size-[18px] shrink-0 place-items-center rounded-md border",
                                    a.doneAt ? "border-brand bg-brand text-white" : "border-line-strong",
                                )}
                                aria-hidden="true"
                            >
                                {a.doneAt && <Check size={11} strokeWidth={3} />}
                            </span>
                            <span className={cn(a.doneAt && "text-caption line-through")}>{a.body}</span>
                        </button>
                    </li>
                ))}
            </ul>
            <div className="flex gap-2">
                <input
                    value={adding}
                    onChange={(e) => setAdding(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") void add(); }}
                    placeholder="Add something to carry forward…"
                    className="min-w-0 flex-1 rounded-lg border border-line bg-card px-3 py-2 text-[14px] outline-none focus:border-brand"
                />
                <Button variant="outline" onClick={() => void add()} disabled={!adding.trim()}>
                    <Plus size={14} /> Add
                </Button>
            </div>
        </div>
    );
}

/**
 * Saving a session to the founder's own calendar.
 *
 * This is the whole reminder system, and deliberately so: their calendar
 * already runs on the device that wakes them up, already syncs to their phone,
 * and needs no email provider, no push service and no OAuth consent screen from
 * us. A blob URL rather than a data: URI because Safari refuses to download
 * data: links, and the object URL is revoked on the next tick.
 */
function downloadIcs(booking: Booking, mentor: Mentor | undefined, schoolName: string): void {
    const ics = bookingToIcs({
        booking,
        mentor: mentor ?? null,
        schoolName,
        url: `${window.location.origin}/sessions`,
    });
    const url = URL.createObjectURL(new Blob([ics], { type: "text/calendar;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = icsFilename(booking, mentor ?? null);
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 0);
}

function SessionCard({ booking, mentor, past }: { booking: Booking; mentor?: Mentor; past: boolean }) {
    const { mutate } = useData();
    const { name: schoolName } = useTenant();
    const { toast } = useToast();
    const [busy, setBusy] = useState(false);

    const cancel = async () => {
        setBusy(true);
        try {
            await mutate((r) => r.cancelBooking(booking.id, ""));
            toast("Session cancelled");
        } catch (e) {
            toast(e instanceof Error ? e.message : "Could not cancel");
        } finally {
            setBusy(false);
        }
    };

    return (
        <Card as="li" className="flex flex-col">
            <div className="flex flex-wrap items-start gap-4">
                <Avatar name={mentor?.name ?? "Mentor"} hue={mentor?.hue ?? "lilac"} src={mentor?.photoUrl} size="lg" />
                <div className="min-w-0 flex-1">
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                        <h3 className="text-[16px] font-semibold">{mentor?.name ?? "Mentor"}</h3>
                        {booking.status === "cancelled" && <Tag tone="danger">Cancelled</Tag>}
                        {booking.status === "completed" && <Tag tone="ok">Done</Tag>}
                        {booking.status === "confirmed" && !past && <Tag tone="fund">Confirmed</Tag>}
                    </div>
                    <p className="flex items-center gap-1.5 text-[14px] text-muted">
                        <CalendarClock size={14} /> {when(booking.startsAt)}
                        {mentor?.timezone && mentor.timezone !== tz && (
                            <span className="text-caption">
                                · {new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit", timeZone: mentor.timezone }).format(new Date(booking.startsAt))} for them
                            </span>
                        )}
                    </p>
                </div>
                {booking.status === "confirmed" && !past && (
                    <div className="flex flex-wrap gap-2">
                        <Button variant="outline" onClick={() => downloadIcs(booking, mentor, schoolName)}>
                            <CalendarPlus size={14} /> Add to calendar
                        </Button>
                        <Button variant="ghost" onClick={() => void cancel()} disabled={busy}>
                            {busy ? <Spinner /> : <X size={14} />} Cancel
                        </Button>
                    </div>
                )}
            </div>

            {booking.agenda && (
                <div className="mt-4 rounded-xl bg-page p-3.5">
                    <h4 className="mb-1 text-[12px] font-semibold uppercase tracking-wide text-caption">Agenda</h4>
                    <p className="text-[14px] leading-6">{booking.agenda}</p>
                </div>
            )}

            {booking.sharedNotes && (
                <div className="mt-3 rounded-xl border border-line p-3.5">
                    <h4 className="mb-1 text-[12px] font-semibold uppercase tracking-wide text-caption">Notes from the session</h4>
                    <p className="text-[14px] leading-6">{booking.sharedNotes}</p>
                </div>
            )}

            {booking.status !== "cancelled" && <Actions booking={booking} />}
        </Card>
    );
}

export default function SessionsPage() {
    const { catalogue, user } = useData();
    const now = Date.now();

    const byMentor = (id: string) => catalogue.mentors.find((m) => m.id === id);
    const sorted = [...user.bookings].sort((a, b) => b.startsAt.localeCompare(a.startsAt));
    const upcoming = sorted
        .filter((b) => b.status === "confirmed" && new Date(b.startsAt).getTime() >= now)
        .reverse();
    const past = sorted.filter((b) => !(b.status === "confirmed" && new Date(b.startsAt).getTime() >= now));

    const bookable = catalogue.mentors.filter((m) => m.bookable);

    return (
        <>
            <PageTitle
                title="Sessions"
                sub="Your 1:1s. The agenda you set beforehand and the actions you leave with are what make a run of these an engagement rather than four unrelated calls."
            />

            {!user.bookings.length ? (
                <EmptyState
                    icon={<CalendarClock size={22} />}
                    title="No sessions yet"
                    body="Pick a mentor and take a slot. Bring one specific thing you are stuck on."
                    action={
                        <Link to="/mentors" className="font-semibold text-brand underline">
                            Browse mentors
                        </Link>
                    }
                />
            ) : (
                <>
                    {upcoming.length > 0 && (
                        <>
                            <h2 className="mb-3 text-[18px] font-semibold">Upcoming</h2>
                            <ul className="mb-8 flex flex-col gap-4">
                                {upcoming.map((b) => (
                                    <SessionCard key={b.id} booking={b} mentor={byMentor(b.mentorId)} past={false} />
                                ))}
                            </ul>
                        </>
                    )}
                    {past.length > 0 && (
                        <>
                            <h2 className="mb-3 text-[18px] font-semibold">Past</h2>
                            <ul className="flex flex-col gap-4">
                                {past.map((b) => (
                                    <SessionCard key={b.id} booking={b} mentor={byMentor(b.mentorId)} past />
                                ))}
                            </ul>
                        </>
                    )}
                </>
            )}

            {bookable.length > 0 && (
                <>
                    <h2 className="mb-3 mt-10 text-[18px] font-semibold">Mentors taking 1:1s</h2>
                    <ul className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-4">
                        {bookable.map((m) => (
                            <Card as="li" key={m.id}>
                                <Link to={`/mentors/${m.id}`} className="flex items-center gap-3">
                                    <Avatar name={m.name} hue={m.hue} src={m.photoUrl} size="md" />
                                    <span className="min-w-0">
                                        <span className="block truncate text-[15px] font-semibold">{m.name}</span>
                                        <span className="block truncate text-[13px] text-muted">
                                            {m.sessionMin ?? 30} min · {m.role.split("·")[0].trim()}
                                        </span>
                                    </span>
                                </Link>
                            </Card>
                        ))}
                    </ul>
                </>
            )}
        </>
    );
}
