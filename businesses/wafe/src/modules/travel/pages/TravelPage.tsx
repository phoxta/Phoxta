import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Luggage, MapPinned, Plane, Plus } from "lucide-react";
import { cn } from "@/lib/cn";
import { useAi } from "@/lib/ai";
import { shortDate } from "@/lib/format";
import { useModule } from "@/state/data";
import { useSpace } from "@/state/space";
import { EmptyModule, MemberAvatar, Money, Notice, PageTitle, Section } from "@/components/shared";
import { Button, Card, EmptyState, ProgressBar, Tag } from "@/components/ui/primitives";
import travelModule from "../module";
import {
    checklistProgress,
    expiringDocs,
    itineraryHref,
    listFor,
    packedCount,
    packingHref,
    passportRisks,
    readiness,
    sortedTrips,
    tripDates,
    tripHref,
    tripSpend,
    tripWhen,
} from "../derive";
import { TRIP_KIND, type NewTrip } from "../types";
import { AiPanel, TripCard } from "../components/pieces";
import { TripDialog } from "../components/dialogs";

/**
 * The travel shelf.
 *
 * A parent sees the next trip large — how ready it is, what is left, what it
 * has cost — then everything coming up, the wishes, and where the family has
 * been. A child sees where we are going and their own bag. A guest sees only
 * the trips they were granted, read-only, with the reason said out loud.
 */
export default function TravelPage() {
    const { state, mutate, loading, error } = useModule(travelModule);
    const { me, role, can, today } = useSpace();
    const { ask, busy: aiBusy, error: aiError, available: aiAvailable } = useAi();

    const [addOpen, setAddOpen] = useState(false);
    const [advice, setAdvice] = useState("");
    const [aiBlocked, setAiBlocked] = useState<string | null>(null);

    const manage = can("travel.manage");
    const child = role === "child";
    const guest = role === "guest";

    const groups = useMemo(() => (state ? sortedTrips(state, today) : { current: null, upcoming: [], dreaming: [], past: [] }), [state, today]);
    const next = groups.current ?? groups.upcoming[0] ?? null;

    const risks = useMemo(() => (state ? state.trips.flatMap((t) => passportRisks(state, t, today)) : []), [state, today]);
    const docs = useMemo(() => (state ? expiringDocs(state, today, 90) : []), [state, today]);

    if (loading && !state) return <p className="text-md text-muted">Getting the trips out…</p>;
    if (error) return <Notice tone="danger">{error}</Notice>;
    if (!state) return null;

    const askBeforeWeGo = async (): Promise<void> => {
        if (!next) return;
        setAiBlocked(null);
        try {
            const r = await ask({
                action: "ask",
                prompt: `Remind me what we still need to do before ${next.title}. Be specific about what is not done yet, put the most urgent first, and say when each thing is due.`,
                extraContext: `Trip: ${next.title}, ${next.destination}, ${tripDates(next)} (${tripWhen(next, today)}).`,
            });
            if (r.unavailable) setAiBlocked(r.unavailable);
            else setAdvice(r.text);
        } catch {
            /* useAi already surfaced it */
        }
    };

    const create = async (input: NewTrip): Promise<void> => {
        await mutate((r) => r.createTrip(input));
    };

    // ---- Guest ------------------------------------------------------------
    if (guest) {
        const shared = [...(groups.current ? [groups.current] : []), ...groups.upcoming, ...groups.past];
        return (
            <div>
                <PageTitle title="Trips you're part of" sub="Only what the family has shared with you: the plan, and the bag you're bringing. Everything else stays with them." area="live" />
                {shared.length ? (
                    <ul className="grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {shared.map((t) => (
                            <TripCard key={t.id} state={state} trip={t} today={today} />
                        ))}
                    </ul>
                ) : (
                    <EmptyState icon={<Plane size={20} aria-hidden="true" />} title="Nothing has been shared with you yet" body="When the family adds you to a trip, its itinerary and your own packing list appear here." />
                )}
            </div>
        );
    }

    // ---- Child ------------------------------------------------------------
    if (child) {
        const mine = [...(groups.current ? [groups.current] : []), ...groups.upcoming];
        const list = next ? listFor(state, next.id, me.id) : undefined;
        const packed = list ? packedCount(state, list.id) : null;
        return (
            <div>
                <PageTitle title="Where we're going" sub="The plan for each trip, and your own bag to pack." area="live" />
                {next && (
                    <Card className="mb-8 overflow-hidden p-0">
                        <div className="relative aspect-[16/7] bg-live-soft">
                            {next.coverUrl && <img src={next.coverUrl} alt="" width={960} height={420} loading="lazy" className="size-full object-cover" />}
                        </div>
                        <div className="p-5">
                            <h2 className="font-display text-4xl leading-8">{next.title}</h2>
                            <p className="mt-1 text-base text-muted">
                                {next.destination} · {tripWhen(next, today)}
                            </p>
                            {packed && list?.generatedAt ? (
                                <div className="mt-4">
                                    <ProgressBar value={packed.pct} label="Your packing" />
                                    <p className="mt-1.5 text-sm text-muted">
                                        You&apos;ve packed {packed.done} of {packed.total} things.
                                    </p>
                                </div>
                            ) : (
                                <p className="mt-3 text-md text-muted">Your packing list will appear here nearer the time.</p>
                            )}
                            <div className="mt-4 flex flex-wrap gap-2">
                                <Link to={itineraryHref(next.id)} className="inline-flex h-11 items-center gap-2 rounded-full bg-ink px-5 text-md font-semibold text-white">
                                    <MapPinned size={16} aria-hidden="true" /> What we&apos;re doing
                                </Link>
                                {list?.generatedAt && (
                                    <Link to={packingHref(next.id)} className="inline-flex h-11 items-center gap-2 rounded-full border border-line-strong bg-card px-5 text-md font-semibold">
                                        <Luggage size={16} aria-hidden="true" /> My packing list
                                    </Link>
                                )}
                            </div>
                        </div>
                    </Card>
                )}
                {mine.length > 1 && (
                    <Section title="Also coming up">
                        <ul className="grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            {mine.slice(1).map((t) => (
                                <TripCard key={t.id} state={state} trip={t} today={today} child />
                            ))}
                        </ul>
                    </Section>
                )}
                {groups.past.length > 0 && (
                    <Section title="Where we've been">
                        <ul className="grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            {groups.past.map((t) => (
                                <TripCard key={t.id} state={state} trip={t} today={today} child />
                            ))}
                        </ul>
                    </Section>
                )}
                {!mine.length && !groups.past.length && <EmptyModule title="No trips yet" body="When the family plans one, you'll find it here." />}
            </div>
        );
    }

    // ---- Parent -----------------------------------------------------------
    const empty = state.trips.length === 0;
    const ready = next ? readiness(state, next, today) : null;
    const run = next ? checklistProgress(state, next, today) : null;

    return (
        <div>
            <PageTitle
                title="Travel & holidays"
                sub="Where we're going, what is booked, who is packed, and the run-up counted down from a fortnight out."
                area="live"
                actions={
                    manage ? (
                        <Button onClick={() => setAddOpen(true)}>
                            <Plus size={16} /> New trip
                        </Button>
                    ) : undefined
                }
            />

            {(risks.length > 0 || docs.length > 0) && (
                <div className="mb-8 space-y-2.5">
                    {risks.map((r) => (
                        <Notice key={`${r.tripId}-${r.memberId}`} tone={r.expiredBeforeTravel ? "danger" : "warn"}>
                            <MemberAvatar memberId={r.memberId} size="xs" showName className="mr-1 align-middle" />
                            {r.expiredBeforeTravel
                                ? `— passport expires ${shortDate(r.expiry)}, before we fly. Renew it now.`
                                : `— passport expires ${shortDate(r.expiry)}: ${r.monthsClear} month${r.monthsClear === 1 ? "" : "s"} clear of the return date, and six are wanted.`}{" "}
                            <Link to={tripHref(r.tripId)} className="font-semibold underline underline-offset-4">
                                Open the trip
                            </Link>
                        </Notice>
                    ))}
                    {docs.map(({ doc, daysLeft }) => (
                        <Notice key={doc.id} tone={daysLeft <= 30 ? "danger" : "warn"}>
                            {doc.label || "A travel document"} {daysLeft < 0 ? "has expired" : `expires in ${daysLeft} days`} ({shortDate(doc.expiresAt!)}).
                        </Notice>
                    ))}
                </div>
            )}

            {empty ? (
                <EmptyModule
                    title="No trips on the shelf"
                    body="Start with the one everybody keeps talking about. Dates can wait — a name and a place is enough to begin."
                    action={
                        manage ? (
                            <Button onClick={() => setAddOpen(true)}>
                                <Plus size={16} /> Add the first trip
                            </Button>
                        ) : undefined
                    }
                />
            ) : (
                <>
                    {next && (
                        <Card className="mb-8 overflow-hidden p-0">
                            <div className="grid grid-cols-[minmax(0,1fr)] md:grid-cols-[1.15fr_1fr]">
                                <div className="relative aspect-[16/9] bg-live-soft md:aspect-auto md:min-h-[260px]">
                                    {next.coverUrl ? (
                                        <img src={next.coverUrl} alt="" width={960} height={640} loading="lazy" className="absolute inset-0 size-full object-cover" />
                                    ) : (
                                        <span className="grid size-full place-items-center text-[48px]" aria-hidden="true">
                                            {TRIP_KIND[next.kind].emoji}
                                        </span>
                                    )}
                                </div>
                                <div className="p-5 md:p-6">
                                    <Tag tone="live">{groups.current ? "We're away" : "Next up"}</Tag>
                                    <h2 className="mt-2.5 font-display text-5xl leading-8">{next.title}</h2>
                                    <p className="mt-1 text-md text-muted">
                                        {next.destination} · {tripDates(next)} · <span className="font-semibold text-live-ink">{tripWhen(next, today)}</span>
                                    </p>
                                    {ready && (
                                        <div className="mt-4">
                                            <div className="flex items-baseline justify-between text-sm">
                                                <span className="font-medium">Ready to go</span>
                                                <span className="tabular-nums text-caption">{ready.pct}%</span>
                                            </div>
                                            <ProgressBar value={ready.pct} className="mt-1.5" label="Readiness" />
                                        </div>
                                    )}
                                    <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                                        {run && run.total > 0 && (
                                            <div>
                                                <dt className="text-caption">The run-up</dt>
                                                <dd className="font-semibold">
                                                    {run.done}/{run.total} done
                                                    {run.overdue.length ? <span className="text-danger-ink"> · {run.overdue.length} overdue</span> : null}
                                                </dd>
                                            </div>
                                        )}
                                        {next.budgetCents !== null && (
                                            <div>
                                                <dt className="text-caption">Budget</dt>
                                                <dd className="font-semibold">
                                                    <Money cents={tripSpend(state, next.id)} /> of <Money cents={next.budgetCents} />
                                                </dd>
                                            </div>
                                        )}
                                    </dl>
                                    <div className="mt-5 flex flex-wrap gap-2">
                                        <Link to={tripHref(next.id)} className="inline-flex h-10 items-center rounded-full bg-ink px-4 text-sm font-semibold text-white">
                                            Open the trip
                                        </Link>
                                        <Link to={itineraryHref(next.id)} className="inline-flex h-10 items-center gap-1.5 rounded-full border border-line-strong bg-card px-4 text-sm font-semibold">
                                            <MapPinned size={15} aria-hidden="true" /> Itinerary
                                        </Link>
                                        <Link to={packingHref(next.id)} className="inline-flex h-10 items-center gap-1.5 rounded-full border border-line-strong bg-card px-4 text-sm font-semibold">
                                            <Luggage size={15} aria-hidden="true" /> Packing
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        </Card>
                    )}

                    {next && aiAvailable && (
                        <div className="mb-8">
                            <AiPanel
                                title="Before we go"
                                hint={`Ask the companion what is still outstanding for ${next.title}. It reads the run-up, the bookings and the papers — nothing else.`}
                                busy={aiBusy}
                                error={aiError}
                                unavailable={aiBlocked}
                                text={advice}
                                actions={
                                    <Button variant="outline" size="sm" onClick={() => void askBeforeWeGo()} loading={aiBusy}>
                                        {advice ? "Ask again" : "Remind me"}
                                    </Button>
                                }
                            />
                        </div>
                    )}

                    {groups.upcoming.length > (groups.current ? 0 : 1) && (
                        <Section title="Coming up">
                            <ul className="grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                {groups.upcoming.slice(groups.current ? 0 : 1).map((t) => (
                                    <TripCard key={t.id} state={state} trip={t} today={today} />
                                ))}
                            </ul>
                        </Section>
                    )}

                    {groups.dreaming.length > 0 && (
                        <Section title="Someday">
                            <ul className="grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                {groups.dreaming.map((t) => (
                                    <TripCard key={t.id} state={state} trip={t} today={today} />
                                ))}
                            </ul>
                        </Section>
                    )}

                    {groups.past.length > 0 && (
                        <Section title="Where we've been">
                            <ul className={cn("grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-2 lg:grid-cols-3")}>
                                {groups.past.map((t) => (
                                    <TripCard key={t.id} state={state} trip={t} today={today} />
                                ))}
                            </ul>
                        </Section>
                    )}
                </>
            )}

            <TripDialog open={addOpen} onClose={() => setAddOpen(false)} onSave={create} />
        </div>
    );
}
