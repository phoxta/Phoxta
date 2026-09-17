import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Bell, MapPin, Users } from "lucide-react";
import { cn } from "@/lib/cn";
import { isoDate, longDate, shortDate } from "@/lib/format";
import { useModule, useModuleState } from "@/state/data";
import { useSpace } from "@/state/space";
import { useToast } from "@/state/toast";
import { Confirm, EmptyModule, MemberAvatar, PageTitle, Section } from "@/components/shared";
import { Card, Skeleton, Tag } from "@/components/ui/primitives";
import mod from "../module";
import { HREF, addDaysIso, conflicts, entryOf, expandEvent, whenLabel } from "../derive";
import { useCalendarWindow } from "../hooks";
import { AddToCalendarButton, EditControls, EventDialog, RepeatTag, RsvpControl, RsvpSummaryList } from "../components/pieces";
import { EVENT_KIND, REMINDER_CHOICES, type PeopleSlice } from "../types";

/**
 * One event: when, where, who, and the two things anybody can do with it —
 * answer, and put it in their own calendar. A parent (or whoever added it)
 * also gets Edit and Delete; everybody else is told plainly that they don't.
 */

export default function EventPage() {
    const { id = "" } = useParams();
    const sp = useSpace();
    const navigate = useNavigate();
    const { toast } = useToast();
    const { state, mutate, loading, error } = useModule(mod);
    // People's own slice, read structurally: the calendar imports no People code.
    const people = useModuleState<PeopleSlice>("people");
    const [editing, setEditing] = useState(false);
    const [deleting, setDeleting] = useState(false);

    const event = state?.events.find((e) => e.id === id) ?? null;
    const today = sp.today;
    const horizon = addDaysIso(today, 120);
    const { entries } = useCalendarWindow(today, addDaysIso(today, 30));

    const occurrences = useMemo(() => (event ? expandEvent(event, today, horizon).slice(0, 6) : []), [event, today, horizon]);
    const clashes = useMemo(() => {
        if (!event) return [];
        return conflicts(entries, sp.members).filter((c) => c.a.eventId === event.id || c.b.eventId === event.id);
    }, [entries, event, sp.members]);

    if (loading || !state) return <Skeleton className="h-64" />;
    if (error) return <EmptyModule title="The calendar couldn't load" body={error} />;
    if (!event) {
        return (
            <EmptyModule
                title="That event isn't here"
                body="It may have been deleted, or it may be one the family hasn't shared with you."
                action={
                    <Link to={HREF} className="text-sm font-semibold text-brand underline underline-offset-4">
                        Back to the calendar
                    </Link>
                }
            />
        );
    }

    const community = event.communityId ? people?.communities?.find((c) => c.id === event.communityId) : undefined;
    const next = occurrences[0];
    const shown = next ? entryOf(next, sp.members) : entryOf({ id: `${event.id}@once`, event, startAt: event.startAt, endAt: event.endAt }, sp.members);
    const reminder = REMINDER_CHOICES.find((r) => r.minutes === event.reminderMinutes);

    return (
        <div>
            <Link to={HREF} className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-ink">
                <ArrowLeft size={14} aria-hidden="true" /> The calendar
            </Link>

            {event.coverUrl && (
                <img src={event.coverUrl} alt="" width={1200} height={420} loading="lazy" className="mb-5 h-40 w-full rounded-xl object-cover md:h-56" />
            )}

            <PageTitle
                title={event.title}
                sub={`${longDate(shown.startAt)} · ${whenLabel(shown)}`}
                area="execute"
                actions={
                    <>
                        <AddToCalendarButton entry={shown} />
                        <EditControls event={event} onEdit={() => setEditing(true)} onDelete={() => setDeleting(true)} />
                    </>
                }
            />

            <div className="mb-5 flex flex-wrap items-center gap-2">
                <Tag tone="execute">
                    {EVENT_KIND[event.kind].emoji} {EVENT_KIND[event.kind].label}
                </Tag>
                {event.rrule && <RepeatTag freq={event.rrule.freq} />}
                {event.allDay && <Tag tone="neutral">All day</Tag>}
                {event.visibility === "private" && <Tag tone="warn">Private to you</Tag>}
                {event.visibility === "shared" && <Tag tone="warn">Shared with a few</Tag>}
                {event.visibility === "family" && !event.childSafe && <Tag tone="warn">Not on the children's calendar</Tag>}
            </div>

            {clashes.length > 0 && (
                <div className="mb-5 rounded-lg bg-peach-soft px-4 py-3 text-sm leading-5 text-peach" role="status">
                    This overlaps {clashes.map((c) => (c.a.eventId === event.id ? c.b.title : c.a.title)).join(", ")}. Somebody is double-booked.
                </div>
            )}

            <div className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-[1.4fr_1fr]">
                <div className="space-y-4">
                    <Card>
                        <ul className="space-y-2.5 text-md">
                            <li className="flex items-start gap-2.5">
                                <Bell size={15} className="mt-0.5 shrink-0 text-caption" aria-hidden="true" />
                                <span>{reminder?.minutes ? reminder.label : "No reminder set"}</span>
                            </li>
                            {event.location && (
                                <li className="flex items-start gap-2.5">
                                    <MapPin size={15} className="mt-0.5 shrink-0 text-caption" aria-hidden="true" />
                                    <span>{event.location}</span>
                                </li>
                            )}
                            <li className="flex items-start gap-2.5">
                                <Users size={15} className="mt-0.5 shrink-0 text-caption" aria-hidden="true" />
                                <span>
                                    {event.attendees.length ? (
                                        <span className="inline-flex flex-wrap items-center gap-1.5">
                                            {event.attendees.map((a) => (
                                                <MemberAvatar key={a.memberId} memberId={a.memberId} size="xs" showName />
                                            ))}
                                        </span>
                                    ) : (
                                        "The whole family"
                                    )}
                                </span>
                            </li>
                        </ul>
                        {event.notes && <p className="mt-4 whitespace-pre-wrap border-t border-line pt-4 text-md leading-6 text-muted">{event.notes}</p>}
                        {community && (
                            <p className="mt-3 text-sm">
                                Part of{" "}
                                <Link to={`/family/people/communities/${community.id}`} className="font-semibold text-brand underline underline-offset-4">
                                    {community.name}
                                </Link>
                                .
                            </p>
                        )}
                        {event.tripId && (
                            <p className="mt-2 text-sm">
                                Part of a trip —{" "}
                                <Link to="/live/travel" className="font-semibold text-brand underline underline-offset-4">
                                    see the itinerary
                                </Link>
                                .
                            </p>
                        )}
                    </Card>

                    {occurrences.length > 1 && (
                        <Section title="Next times">
                            <ul className="rounded-xl bg-card p-1.5">
                                {occurrences.map((o) => (
                                    <li key={o.id} className={cn("flex items-center justify-between px-3 py-2 text-md", o.id === next?.id && "font-semibold")}>
                                        <span>{shortDate(o.startAt)}</span>
                                        <span className="text-sm text-muted">{whenLabel({ startAt: o.startAt, endAt: o.endAt, allDay: event.allDay })}</span>
                                    </li>
                                ))}
                            </ul>
                        </Section>
                    )}
                </div>

                <div className="space-y-4">
                    <Card>
                        <h2 className="mb-3 text-lg font-semibold">Who is coming</h2>
                        <RsvpSummaryList event={event} state={state} />
                        <div className="mt-4 border-t border-line pt-4">
                            <RsvpControl event={event} state={state} mutate={mutate} />
                        </div>
                    </Card>

                    {sp.role === "parent" && event.attendees.some((a) => sp.members.find((m) => m.id === a.memberId)?.role === "child") && (
                        <Card>
                            <h2 className="mb-2 text-lg font-semibold">Answer for a child</h2>
                            <div className="space-y-3">
                                {event.attendees
                                    .filter((a) => sp.members.find((m) => m.id === a.memberId)?.role === "child")
                                    .map((a) => (
                                        <div key={a.memberId}>
                                            <div className="mb-1.5 text-sm font-medium">
                                                <MemberAvatar memberId={a.memberId} size="xs" showName />
                                            </div>
                                            <RsvpControl event={event} state={state} mutate={mutate} memberId={a.memberId} compact />
                                        </div>
                                    ))}
                            </div>
                        </Card>
                    )}
                </div>
            </div>

            <EventDialog open={editing} onClose={() => setEditing(false)} event={event} defaultDate={isoDate(event.startAt)} mutate={mutate} />

            <Confirm
                open={deleting}
                title="Delete this event?"
                body="It goes from everyone's calendar, and from any feed that carries it."
                confirmLabel="Delete it"
                danger
                onClose={() => setDeleting(false)}
                onConfirm={async () => {
                    await mutate((r) => r.removeEvent(event.id));
                    toast("Deleted");
                    navigate(HREF);
                }}
            />
        </div>
    );
}
