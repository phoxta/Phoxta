import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/cn";
import { useModule } from "@/state/data";
import { useSpace } from "@/state/space";
import { EmptyModule, Notice, PageTitle, Section } from "@/components/shared";
import studioModule from "../module";
import { BASE, gallery, madeThisMonth } from "../derive";
import { GalleryCard, UsageMeter } from "../components/studio";
import type { PlanTier, StudioKind } from "../types";

/**
 * Everything the family has made, newest first.
 *
 * One shelf on purpose: a family does not think in entity types, they think
 * "the song we wrote for Grandma". The filter is there for when they do.
 * Conversations are not here — those live with the person who had them, and a
 * gallery is a place you show people.
 */

const FILTERS: Array<{ key: "all" | StudioKind; label: string }> = [
    { key: "all", label: "Everything" },
    { key: "song", label: "Songs" },
    { key: "story", label: "Storyboards" },
    { key: "image", label: "Pictures" },
];

export default function GalleryPage() {
    const { state, mutate, loading, error } = useModule(studioModule);
    const { role, today } = useSpace();
    const [filter, setFilter] = useState<"all" | StudioKind>("all");

    const items = useMemo(() => (state ? gallery(state) : []), [state]);
    const thisMonth = useMemo(() => (state ? madeThisMonth(state, today) : []), [state, today]);

    if (loading && !state) return <p className="text-md text-muted">Opening the gallery…</p>;
    if (error) return <Notice tone="danger">{error}</Notice>;
    if (!state) return null;

    const shown = filter === "all" ? items : items.filter((i) => i.kind === filter);

    return (
        <div>
            <PageTitle
                title="The gallery"
                sub={`Everything the studio has made${thisMonth.length ? ` — ${thisMonth.length} of it this month` : ""}. Open a thing to sing it, present it, share it or take it down.`}
                area="create"
                actions={
                    <Link to={BASE} className="text-sm font-semibold text-brand underline-offset-4 hover:underline">
                        Back to the companion
                    </Link>
                }
            />

            <div className="mb-6 flex flex-wrap gap-2" role="group" aria-label="Filter the gallery">
                {FILTERS.map((f) => {
                    const count = f.key === "all" ? items.length : items.filter((i) => i.kind === f.key).length;
                    return (
                        <button
                            key={f.key}
                            type="button"
                            aria-pressed={filter === f.key}
                            onClick={() => setFilter(f.key)}
                            className={cn("rounded-full border px-4 py-2 text-sm font-semibold transition-colors", filter === f.key ? "border-brand bg-brand-soft text-brand-ink" : "border-line-strong text-muted hover:text-ink")}
                        >
                            {f.label} <span className="tabular-nums opacity-70">{count}</span>
                        </button>
                    );
                })}
            </div>

            {shown.length ? (
                <ul className="mb-10 grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {shown.map((item) => (
                        <GalleryCard key={item.id} item={item} />
                    ))}
                </ul>
            ) : (
                <EmptyModule
                    title={filter === "all" ? "Nothing in the gallery yet" : "Nothing of that kind yet"}
                    body="Songs, storyboards and pictures land here the moment they are saved."
                    action={
                        <Link to={`${BASE}/songs`} className="inline-flex h-11 items-center rounded-full bg-brand px-5 text-md font-semibold text-white">
                            Write the first song
                        </Link>
                    }
                />
            )}

            {role !== "guest" && (
                <Section title="The allowance">
                    <UsageMeter state={state} onPlan={role === "parent" ? (plan: PlanTier) => mutate((r) => r.setPlan(plan)) : undefined} />
                </Section>
            )}
        </div>
    );
}
