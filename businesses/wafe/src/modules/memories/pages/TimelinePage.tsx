import { useMemo, useState } from "react";
import { Save } from "lucide-react";
import { useModule, useModuleState } from "@/state/data";
import { useSpace } from "@/state/space";
import { Notice, PageTitle } from "@/components/shared";
import { Button, Tag } from "@/components/ui/primitives";
import memoriesModule from "../module";
import { HREF, crossEvents, dayMonth, mergedTimeline, onThisDay, timelineByYear, unsavedCount } from "../derive";
import { TIMELINE_EMOJI, TIMELINE_LABEL, type BibleSlice, type CurriculaSlice, type GoalsSlice, type TimelineType, type TravelSlice } from "../types";
import { BackLink, Blank, PhotoTile, TimelineRow } from "../components/pieces";

/**
 * The family timeline: year, then month, then the things that happened.
 *
 * It merges. An album is this module's own; a celebration belongs to Goals, an
 * answered prayer to Bible, a badge to Curricula and a trip to Travel — and
 * each of those is read from that module's already-filtered state, never from
 * its repo, so a child's timeline is short in exactly the way a child's data
 * is short. Every row links to the record it stands for.
 *
 * Merged rows are shown the moment they exist and kept only when a parent asks
 * — which is what stops the timeline quietly becoming a second copy of four
 * other modules.
 */

const TYPES: TimelineType[] = ["album", "celebration", "answered_prayer", "badge", "milestone", "trip", "first"];

export default function TimelinePage() {
    const { state, mutate, loading, error } = useModule(memoriesModule);
    const { role, today, can } = useSpace();
    const travel = useModuleState<TravelSlice>("travel");
    const bible = useModuleState<BibleSlice>("bible");
    const goals = useModuleState<GoalsSlice>("goals");
    const curricula = useModuleState<CurriculaSlice>("curricula");

    const [filter, setFilter] = useState<TimelineType | "all">("all");
    const [note, setNote] = useState<string | null>(null);

    const extra = useMemo(() => (state ? crossEvents({ travel, bible, goals, curricula }, role) : []), [state, travel, bible, goals, curricula, role]);

    const all = useMemo(() => (state ? mergedTimeline(state, extra) : []), [state, extra]);
    const shown = useMemo(() => (filter === "all" ? all : all.filter((e) => e.type === filter)), [all, filter]);
    const years = useMemo(() => timelineByYear(shown), [shown]);
    const otd = useMemo(() => (state ? onThisDay(state, today) : []), [state, today]);

    if (loading && !state) return <p className="text-md text-muted">Reading the story…</p>;
    if (error) return <Notice tone="danger">{error}</Notice>;
    if (!state) return null;

    const manage = can("memories.manage");
    const unsaved = unsavedCount(state, extra);
    const photoBy = new Map(state.photos.map((p) => [p.id, p]));

    return (
        <div>
            <BackLink to={HREF}>Memories</BackLink>

            <PageTitle
                title="Our timeline"
                sub={all.length ? `${all.length} moments, ${years[years.length - 1]?.year ?? ""}–${years[0]?.year ?? ""}.` : "Everything the family has marked, in the order it happened."}
                area="create"
                actions={
                    manage && unsaved > 0 ? (
                        <Button
                            size="md"
                            variant="outline"
                            onClick={() =>
                                void mutate(async (r) => {
                                    const n = await r.importTimeline(extra);
                                    setNote(`${n} ${n === 1 ? "moment" : "moments"} kept on the family timeline.`);
                                })
                            }
                        >
                            <Save size={15} aria-hidden="true" /> Keep {unsaved} merged
                        </Button>
                    ) : undefined
                }
            />

            {note && (
                <Notice tone="ok" className="mb-6">
                    {note}
                </Notice>
            )}

            {/* On this day */}
            {otd.length > 0 && (
                <div className="mb-8 rounded-xl bg-create-soft p-4">
                    <p className="font-display text-[19px] text-create-ink">On this day · {dayMonth(today)}</p>
                    {otd.map((d) => (
                        <div key={d.year} className="mt-3">
                            <p className="text-sm font-semibold text-create-ink">
                                {d.year} — {d.yearsAgo} {d.yearsAgo === 1 ? "year" : "years"} ago
                                {d.events[0] ? `: ${d.events[0].title}` : ""}
                            </p>
                            {d.photos.length > 0 && (
                                <ul className="mt-2 grid grid-cols-4 gap-2 md:grid-cols-8">
                                    {d.photos.slice(0, 8).map((p) => (
                                        <li key={p.id}>
                                            <PhotoTile photo={p} small />
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Filters */}
            <div className="mb-7 flex flex-wrap gap-2" role="group" aria-label="Filter the timeline">
                <button type="button" aria-pressed={filter === "all"} onClick={() => setFilter("all")} className={`rounded-full border px-3.5 py-1.5 text-sm font-semibold ${filter === "all" ? "border-brand bg-brand-soft text-brand-ink" : "border-line-strong text-muted hover:text-ink"}`}>
                    Everything
                </button>
                {TYPES.map((t) => {
                    const n = all.filter((e) => e.type === t).length;
                    if (!n) return null;
                    return (
                        <button key={t} type="button" aria-pressed={filter === t} onClick={() => setFilter(t)} className={`rounded-full border px-3.5 py-1.5 text-sm font-semibold ${filter === t ? "border-brand bg-brand-soft text-brand-ink" : "border-line-strong text-muted hover:text-ink"}`}>
                            <span aria-hidden="true">{TIMELINE_EMOJI[t]}</span> {TIMELINE_LABEL[t]} <span className="tabular-nums text-caption">{n}</span>
                        </button>
                    );
                })}
            </div>

            {unsaved > 0 && manage && (
                <Notice tone="info" className="mb-6">
                    {unsaved} {unsaved === 1 ? "moment comes" : "moments come"} from other parts of the app — a celebration, an answered prayer, a badge, a trip. They are shown here as they happen; keep them and they become part of the family&apos;s own record.
                </Notice>
            )}

            {years.length ? (
                <div className="space-y-10">
                    {years.map((y) => (
                        <section key={y.year}>
                            <div className="mb-4 flex items-baseline gap-3">
                                <h2 className="font-display text-7xl leading-9">{y.year}</h2>
                                <Tag tone="neutral">
                                    {y.count} {y.count === 1 ? "moment" : "moments"}
                                </Tag>
                            </div>
                            {y.months.map((m) => (
                                <div key={m.key} className="mb-6">
                                    <h3 className="mb-3 text-sm font-semibold uppercase tracking-[0.06em] text-caption">{m.label}</h3>
                                    <ul>
                                        {m.events.map((e, i) => (
                                            <TimelineRow key={e.id} event={e} photo={e.photoId ? photoBy.get(e.photoId) : undefined} last={i === m.events.length - 1} />
                                        ))}
                                    </ul>
                                </div>
                            ))}
                        </section>
                    ))}
                </div>
            ) : (
                <Blank title="Nothing on the timeline yet" body="Albums, celebrations, answered prayers, badges, milestones and trips all land here as they happen." />
            )}
        </div>
    );
}
