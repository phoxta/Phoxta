import { useMemo, useState } from "react";
import { ArrowRight, History, Pencil } from "lucide-react";
import { cn } from "@/lib/cn";
import { longDate } from "@/lib/format";
import { useModule } from "@/state/data";
import { useSpace } from "@/state/space";
import { EmptyModule, Notice, PageTitle, Section } from "@/components/shared";
import { Button, Tag } from "@/components/ui/primitives";
import goalsModule from "../module";
import { blueprintDiff, blueprintVersions, currentBlueprint } from "../derive";
import type { BlueprintLine } from "../types";
import { GoalsNav, PillarTag } from "../components/pieces";
import { BlueprintDialog } from "../components/BlueprintDialog";

/**
 * The family vision blueprint.
 *
 * Values and mission come from the space; what lives here is the multi-year
 * picture — the vision, and what one, three and five years look like per
 * pillar, each with the "why" that stops it becoming a slogan. Versions are
 * never edited: a new one is written, and the diff shows exactly what the
 * family changed their mind about.
 */

function Lines({ lines }: { lines: BlueprintLine[] }) {
    if (!lines.length) return <p className="text-sm text-muted">Nothing written for this horizon yet.</p>;
    return (
        <ul className="flex flex-col gap-3">
            {lines.map((l, i) => (
                <li key={`${l.pillar}-${i}`} className="rounded-lg bg-page p-4">
                    <PillarTag pillar={l.pillar} />
                    <p className="mt-2 text-base font-medium leading-6">{l.text}</p>
                    {l.why && <p className="mt-1 text-sm leading-5 text-muted">{l.why}</p>}
                </li>
            ))}
        </ul>
    );
}

export default function BlueprintPage() {
    const { state, mutate, loading, error } = useModule(goalsModule);
    const { space, can, role } = useSpace();
    const [selected, setSelected] = useState<number | null>(null);
    const [open, setOpen] = useState(false);

    const versions = useMemo(() => (state ? blueprintVersions(state) : []), [state]);
    const parent = can("goals.manage");

    if (loading && !state) return <p className="text-md text-muted">Opening the blueprint…</p>;
    if (error) return <Notice tone="danger">{error}</Notice>;
    if (!state) return null;

    const live = currentBlueprint(state);
    const shown = versions.find((v) => v.version === selected) ?? live;
    const plan = role !== "child" && role !== "guest";
    const previous = shown ? versions.find((v) => v.version === shown.version - 1) : undefined;
    const diff = blueprintDiff(previous, shown);

    if (!shown) {
        return (
            <div>
                <PageTitle title="Our vision blueprint" sub="The long picture, written down, so the week's decisions have something to answer to." area="execute" />
                {role !== "child" && <GoalsNav />}
                <EmptyModule
                    title="Nothing written yet"
                    body="Start with one sentence about where this family is going, then a few lines about what one, three and five years look like."
                    action={parent ? <Button onClick={() => setOpen(true)}>Write the blueprint</Button> : undefined}
                />
                <BlueprintDialog open={open} onClose={() => setOpen(false)} onSave={async (draft) => void (await mutate((r) => r.saveBlueprint(draft)))} />
            </div>
        );
    }

    return (
        <div>
            <PageTitle
                title="Our vision blueprint"
                sub="The long picture, written down, so the week's decisions have something to answer to."
                area="execute"
                actions={
                    parent ? (
                        <Button onClick={() => setOpen(true)}>
                            <Pencil size={16} /> Write a new version
                        </Button>
                    ) : undefined
                }
            />
            {role !== "child" && <GoalsNav />}

            <section className="paper mb-8 overflow-hidden rounded-xl bg-execute-soft">
                <img src="/images/goals-blueprint.jpg" alt="" width={1200} height={340} loading="lazy" className="h-44 w-full object-cover md:h-56" />
                <div className="px-6 py-7 md:px-9 md:py-9">
                    <div className="flex flex-wrap items-center gap-2">
                        <Tag tone="execute">Version {shown.version}</Tag>
                        {shown.version === live?.version ? <Tag tone="ok">Live</Tag> : <Tag tone="neutral">History</Tag>}
                        <span className="text-xs text-caption">{longDate(shown.createdAt)}</span>
                    </div>
                    <p className="mt-4 max-w-3xl font-display text-5xl leading-9 text-execute-ink md:text-[32px] md:leading-[44px]">{shown.vision}</p>
                    <p className="mt-4 max-w-2xl text-base leading-6 text-muted">{shown.mission}</p>
                    <ul className="mt-5 flex flex-wrap gap-2">
                        {shown.valuesSnapshot.map((v) => (
                            <li key={v}>
                                <Tag tone="brand">{v}</Tag>
                            </li>
                        ))}
                    </ul>
                    {shown.note && <p className="mt-5 text-sm italic text-caption">“{shown.note}”</p>}
                </div>
            </section>

            {/* The year-by-year plan carries the family's money in it, so it is
                a parent's page. Everyone else gets the vision above and the
                child-safe summaries on the goals list. */}
            {plan ? (
                <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-3">
                    <Section title="One year" className="mb-0">
                        <Lines lines={shown.goals1y} />
                    </Section>
                    <Section title="Three years" className="mb-0">
                        <Lines lines={shown.goals3y} />
                    </Section>
                    <Section title="Five years" className="mb-0">
                        <Lines lines={shown.goals5y} />
                    </Section>
                </div>
            ) : (
                <p className="rounded-xl bg-card p-5 text-md leading-6 text-muted">
                    {role === "child"
                        ? "That is where this family is going. The year-by-year plan underneath it is Mum and Dad's to keep — what it means for you is on your goals."
                        : "The year-by-year plan underneath this is the family's own, and stays with them. What they have shared with you is on the goals list."}
                </p>
            )}

            {versions.length > 1 && (
                <Section title="What we changed our minds about" className="mt-10">
                    <div className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-[minmax(0,260px)_1fr]">
                        <ul className="flex flex-col gap-2" aria-label="Blueprint versions">
                            {versions.map((v) => (
                                <li key={v.id}>
                                    <button
                                        type="button"
                                        aria-pressed={v.version === shown.version}
                                        onClick={() => setSelected(v.version)}
                                        className={cn("flex w-full items-center gap-3 rounded-md border px-3 py-2.5 text-left transition-colors", v.version === shown.version ? "border-brand bg-brand-soft" : "border-line-strong bg-card hover:border-ink")}
                                    >
                                        <History size={14} className="shrink-0 text-muted" aria-hidden="true" />
                                        <span className="min-w-0 flex-1">
                                            <span className="block text-md font-semibold">Version {v.version}</span>
                                            <span className="block truncate text-xs text-caption">{v.note || longDate(v.createdAt)}</span>
                                        </span>
                                    </button>
                                </li>
                            ))}
                        </ul>

                        <div className="rounded-xl bg-card p-5">
                            <h3 className="text-base font-semibold">
                                {previous ? `Version ${previous.version} → version ${shown.version}` : `Version ${shown.version}`}
                            </h3>
                            {diff.length ? (
                                <ul className="mt-4 flex flex-col gap-4">
                                    {diff.map((c) => (
                                        <li key={c.field}>
                                            <div className="text-xs font-medium uppercase tracking-[0.06em] text-caption">{c.field}</div>
                                            <div className="mt-1.5 grid grid-cols-[minmax(0,1fr)] gap-2 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
                                                <p className="rounded-md bg-page px-3 py-2 text-sm leading-5 text-muted line-through decoration-line-strong">{c.from}</p>
                                                <ArrowRight size={14} className="mx-auto shrink-0 text-caption max-sm:hidden" aria-hidden="true" />
                                                <p className="rounded-md bg-brand-soft px-3 py-2 text-sm leading-5 text-brand-ink">{c.to}</p>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="mt-3 text-sm text-muted">Nothing changed between these two — the version was written to record the date, not a decision.</p>
                            )}
                        </div>
                    </div>
                </Section>
            )}

            <p className="mt-10 text-xs leading-5 text-caption">
                The values and the mission belong to {space.name} and are edited in Family → Settings. Every version of the blueprint keeps its own snapshot of them, which is why the diff can show a value being added the same season a five-year line changed.
            </p>

            <BlueprintDialog open={open} onClose={() => setOpen(false)} current={live} onSave={async (draft) => void (await mutate((r) => r.saveBlueprint(draft)))} />
        </div>
    );
}
