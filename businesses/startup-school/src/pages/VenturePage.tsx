import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Check, ChevronRight, CircleAlert, CircleCheck, FlaskConical, Pencil, Plus, Trash2 } from "lucide-react";
import {
    STAGE_LABEL,
    STAGE_ORDER,
    VENTURE_SECTIONS,
    type SectionSpec,
    type VentureClaim,
    type VentureConfidence,
    type VentureSection,
    type VentureSectionId,
    type VentureStage,
    type VenturePath,
} from "@startup-school/core";
import { PageTitle } from "@/components/shell/AppShell";
import { Button, Card, Field, Overline, ProgressBar, Spinner, Tag } from "@/components/ui/primitives";
import { useData } from "@/state/data";
import { useToast } from "@/state/toast";
import { cn } from "@/lib/cn";

const GROUPS: { title: string; ids: VentureSectionId[] }[] = [
    { title: "Start with the problem", ids: ["founder", "opportunity"] },
    { title: "Shape the business", ids: ["model", "ai", "legal", "plan", "money"] },
    { title: "Prove and ask", ids: ["traction", "asks"] },
];

const PATH_LABEL: Record<VenturePath, string> = {
    build: "Building from scratch",
    phoxta_turnkey: "Launching a Phoxta AI business",
    hybrid: "Adapting a Phoxta AI business",
};

const CONFIDENCE: Record<VentureConfidence, { label: string; description: string; tone: "warn" | "fund" | "ok" }> = {
    guess: { label: "Assumption", description: "You believe it, but have not checked it yet.", tone: "warn" },
    evidence: { label: "Evidence", description: "Something real points this way.", tone: "fund" },
    proven: { label: "Proven", description: "It has happened repeatedly.", tone: "ok" },
};

const uid = (): string => `venture-${Math.random().toString(36).slice(2, 10)}`;

const sectionWritten = (section?: VentureSection): boolean => Boolean(section?.body.trim() || section?.claims.length);

function nextSection(sections: Partial<Record<VentureSectionId, VentureSection>>): SectionSpec {
    return VENTURE_SECTIONS.find((section) => !sectionWritten(sections[section.id])) ?? VENTURE_SECTIONS[0];
}

function IdentityCard() {
    const { user, mutate } = useData();
    const { toast } = useToast();
    const venture = user.venture;
    const [editing, setEditing] = useState(false);
    const [name, setName] = useState(venture.name);
    const [oneLiner, setOneLiner] = useState(venture.oneLiner);
    const [country, setCountry] = useState(venture.country);
    const [stage, setStage] = useState<VentureStage>(venture.stage);
    const [path, setPath] = useState<VenturePath>(venture.path);
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        setName(venture.name);
        setOneLiner(venture.oneLiner);
        setCountry(venture.country);
        setStage(venture.stage);
        setPath(venture.path);
    }, [venture]);

    const save = async () => {
        setBusy(true);
        try {
            await mutate((repository) => repository.saveVenture({ name: name.trim(), oneLiner: oneLiner.trim(), country: country.trim(), stage, path }));
            setEditing(false);
            toast("Venture details saved", "success");
        } catch (error) {
            toast(error instanceof Error ? error.message : "Could not save your venture", "danger");
        } finally {
            setBusy(false);
        }
    };

    if (editing) {
        return (
            <Card className="border border-line">
                <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Venture name" value={name} onChange={(event) => setName(event.target.value)} placeholder="A working name is enough" />
                    <Field label="Country or primary market" value={country} onChange={(event) => setCountry(event.target.value)} placeholder="Nigeria, Kenya, UK..." />
                </div>
                <label className="mt-3 block">
                    <span className="mb-1.5 block text-[12px] font-medium uppercase tracking-[0.06em] text-muted">What are you building?</span>
                    <textarea value={oneLiner} onChange={(event) => setOneLiner(event.target.value)} rows={3} placeholder="For a specific customer, we help them achieve a specific outcome." className="w-full resize-y rounded-lg border border-line-strong bg-page px-3.5 py-3 text-[14px] leading-6 outline-none placeholder:text-caption focus:border-brand focus:shadow-[0_0_0_3px_var(--color-brand-soft)]" />
                </label>
                <label className="mt-3 block">
                    <span className="mb-1.5 block text-[12px] font-medium uppercase tracking-[0.06em] text-muted">Current stage</span>
                    <select value={stage} onChange={(event) => setStage(event.target.value as VentureStage)} className="w-full rounded-lg border border-line-strong bg-page px-3.5 py-3 text-[14px] outline-none focus:border-brand focus:shadow-[0_0_0_3px_var(--color-brand-soft)]">
                        {STAGE_ORDER.map((item) => <option key={item} value={item}>{STAGE_LABEL[item]}</option>)}
                    </select>
                </label>
                <label className="mt-3 block">
                    <span className="mb-1.5 block text-[12px] font-medium uppercase tracking-[0.06em] text-muted">How are you getting started?</span>
                    <select value={path} onChange={(event) => setPath(event.target.value as VenturePath)} className="w-full rounded-lg border border-line-strong bg-page px-3.5 py-3 text-[14px] outline-none focus:border-brand focus:shadow-[0_0_0_3px_var(--color-brand-soft)]">
                        {(Object.keys(PATH_LABEL) as VenturePath[]).map((value) => <option key={value} value={value}>{PATH_LABEL[value]}</option>)}
                    </select>
                    <span className="mt-1.5 block text-[12px] leading-5 text-muted">A Phoxta turnkey business gives you a proven starting system; you still prove the customer, local offer, and operating economics.</span>
                </label>
                <div className="mt-4 flex flex-wrap gap-2">
                    <Button onClick={() => void save()} disabled={busy}>{busy ? <Spinner /> : <Check size={15} />} Save details</Button>
                    <Button variant="ghost" onClick={() => setEditing(false)} disabled={busy}>Cancel</Button>
                </div>
            </Card>
        );
    }

    return (
        <Card className="border border-line">
            <div className="flex flex-wrap items-start gap-4">
                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-[20px] font-semibold leading-7">{venture.name || "Name your venture"}</h2>
                        <Tag tone="fund">{STAGE_LABEL[venture.stage]}</Tag>
                        <Tag tone="neutral">{PATH_LABEL[venture.path]}</Tag>
                        {venture.country ? <Tag tone="neutral">{venture.country}</Tag> : <Tag tone="warn">Market missing</Tag>}
                    </div>
                    <p className="mt-2 max-w-3xl text-[14px] leading-6 text-muted">{venture.oneLiner || "Add a one-line description so the adviser, your mentors, and your own decisions all start from the same context."}</p>
                </div>
                <div className="flex flex-wrap gap-2"><Link to="/experiments" className="inline-flex h-10 items-center rounded-full border border-line-strong bg-card px-3.5 text-[13px] font-semibold hover:bg-page">Proof loop</Link><Button variant="outline" size="md" onClick={() => setEditing(true)}><Pencil size={14} /> Edit details</Button></div>
            </div>
        </Card>
    );
}

function CanvasNav({
    selectedId,
    sections,
    onSelect,
}: {
    selectedId: VentureSectionId;
    sections: Partial<Record<VentureSectionId, VentureSection>>;
    onSelect: (id: VentureSectionId) => void;
}) {
    return (
        <nav aria-label="Venture canvas sections" className="rounded-xl border border-line bg-card p-3">
            {GROUPS.map((group) => (
                <div key={group.title} className="mb-4 last:mb-0">
                    <Overline className="mb-1 px-2">{group.title}</Overline>
                    <div className="flex flex-col gap-1">
                        {group.ids.map((id) => {
                            const spec = VENTURE_SECTIONS.find((item) => item.id === id)!;
                            const section = sections[id];
                            const active = id === selectedId;
                            const openAssumptions = (section?.claims ?? []).filter((claim) => claim.confidence !== "proven" && !claim.test.trim()).length;
                            return (
                                <button key={id} type="button" onClick={() => onSelect(id)} className={cn("flex min-w-0 items-center gap-2 rounded-lg px-2.5 py-2.5 text-left transition-colors", active ? "bg-brand-soft text-brand-ink" : "text-ink hover:bg-page")}>
                                    {sectionWritten(section) ? <CircleCheck size={15} className="shrink-0 text-mint" aria-hidden="true" /> : <span className="size-[15px] shrink-0 rounded-full border border-line-strong" aria-hidden="true" />}
                                    <span className="min-w-0 flex-1 truncate text-[13px] font-semibold">{spec.title}</span>
                                    {openAssumptions > 0 && <span className="text-[11px] text-peach">{openAssumptions}</span>}
                                    {active && <ChevronRight size={14} className="shrink-0" aria-hidden="true" />}
                                </button>
                            );
                        })}
                    </div>
                </div>
            ))}
        </nav>
    );
}

function ClaimEditor({ claim, sectionId, onChange, onRemove }: { claim: VentureClaim; sectionId: VentureSectionId; onChange: (claim: VentureClaim) => void; onRemove: () => void }) {
    const confidence = CONFIDENCE[claim.confidence];
    return (
        <li className="rounded-lg border border-line bg-page p-3">
            <div className="flex items-start gap-2">
                <textarea value={claim.text} onChange={(event) => onChange({ ...claim, text: event.target.value })} rows={2} placeholder="A belief you need to prove, such as: Customers will pay for reliable pickup." className="min-w-0 flex-1 resize-y rounded-md border border-line-strong bg-card px-3 py-2 text-[14px] leading-6 outline-none placeholder:text-caption focus:border-brand" />
                <button type="button" onClick={onRemove} className="rounded-md p-2 text-caption hover:bg-danger-soft hover:text-danger-ink" aria-label="Remove assumption"><Trash2 size={15} /></button>
            </div>
            <div className="mt-2.5 grid gap-2 sm:grid-cols-[170px_minmax(0,1fr)]">
                <label>
                    <span className="sr-only">Confidence</span>
                    <select value={claim.confidence} onChange={(event) => onChange({ ...claim, confidence: event.target.value as VentureConfidence })} className="w-full rounded-md border border-line-strong bg-card px-2.5 py-2 text-[13px] outline-none focus:border-brand">
                        {(Object.keys(CONFIDENCE) as VentureConfidence[]).map((value) => <option key={value} value={value}>{CONFIDENCE[value].label}</option>)}
                    </select>
                </label>
                <p className="self-center text-[12px] leading-5 text-muted">{confidence.description}</p>
            </div>
            {claim.confidence !== "proven" && (
                <div className="mt-2.5 flex flex-wrap items-center gap-2"><label className="flex min-w-0 flex-1 items-center gap-2"><FlaskConical size={14} className="shrink-0 text-caption" aria-hidden="true" /><span className="sr-only">Test that would settle this belief</span><input value={claim.test} onChange={(event) => onChange({ ...claim, test: event.target.value })} placeholder="What will you do this week to test it?" className="min-w-0 flex-1 rounded-md border border-line-strong bg-card px-3 py-2 text-[13px] outline-none placeholder:text-caption focus:border-brand" /></label><Link to={`/experiments?claim=${encodeURIComponent(claim.id)}&section=${encodeURIComponent(sectionId)}&hypothesis=${encodeURIComponent(claim.text)}`} className="shrink-0 text-[12px] font-semibold text-brand underline underline-offset-4">Run test</Link></div>
            )}
        </li>
    );
}

function SectionEditor({ spec, section }: { spec: SectionSpec; section?: VentureSection }) {
    const { mutate } = useData();
    const { toast } = useToast();
    const [body, setBody] = useState(section?.body ?? "");
    const [claims, setClaims] = useState<VentureClaim[]>(section?.claims ?? []);
    const [busy, setBusy] = useState(false);
    const openAssumptions = claims.filter((claim) => claim.confidence !== "proven" && !claim.test.trim()).length;

    const save = async () => {
        setBusy(true);
        try {
            await mutate((repository) => repository.saveVenture({
                sections: {
                    [spec.id]: {
                        body: body.trim(),
                        claims: claims.filter((claim) => claim.text.trim()),
                        updatedAt: new Date().toISOString(),
                    },
                },
            }));
            toast(`${spec.title} saved`, "success");
        } catch (error) {
            toast(error instanceof Error ? error.message : "Could not save that section", "danger");
        } finally {
            setBusy(false);
        }
    };

    return (
        <section aria-labelledby={`section-${spec.id}`} className="rounded-xl border border-line bg-card p-5 max-md:p-4">
            <div className="flex flex-wrap items-start gap-3">
                <div className="min-w-0 flex-1">
                    <Overline>Venture canvas</Overline>
                    <h2 id={`section-${spec.id}`} className="mt-1 text-[21px] font-semibold leading-7">{spec.title}</h2>
                    <p className="mt-1 text-[14px] leading-6 text-muted">{spec.blurb}</p>
                </div>
                {openAssumptions > 0 && <Tag tone="warn">{openAssumptions} test{openAssumptions === 1 ? "" : "s"} missing</Tag>}
            </div>

            <label className="mt-5 block" htmlFor={`venture-body-${spec.id}`}>
                <span className="mb-1.5 block text-[13px] font-semibold">Write what you know</span>
                <span className="mb-2 block text-[13px] leading-5 text-muted">{spec.prompt}</span>
                <textarea id={`venture-body-${spec.id}`} value={body} onChange={(event) => setBody(event.target.value)} rows={6} placeholder="Write in plain language. You can improve it later." className="w-full resize-y rounded-lg border border-line-strong bg-page px-3.5 py-3 text-[14px] leading-6 outline-none placeholder:text-caption focus:border-brand focus:shadow-[0_0_0_3px_var(--color-brand-soft)]" />
            </label>

            <div className="mt-5 flex flex-wrap items-center gap-2">
                <div className="min-w-0 flex-1">
                    <h3 className="text-[15px] font-semibold">Assumptions and evidence</h3>
                    <p className="mt-0.5 text-[12px] leading-5 text-muted">{spec.claimHint}</p>
                </div>
                <Button variant="outline" size="md" onClick={() => setClaims((current) => [...current, { id: uid(), text: "", confidence: "guess", test: "" }])}><Plus size={14} /> Add one</Button>
            </div>
            {claims.length ? (
                <ul className="mt-3 flex flex-col gap-2">
                    {claims.map((claim, index) => <ClaimEditor key={claim.id} claim={claim} sectionId={spec.id} onChange={(next) => setClaims((current) => current.map((item, itemIndex) => itemIndex === index ? next : item))} onRemove={() => setClaims((current) => current.filter((_, itemIndex) => itemIndex !== index))} />)}
                </ul>
            ) : (
                <p className="mt-3 rounded-lg bg-page px-3.5 py-3 text-[13px] leading-5 text-muted">No assumptions recorded yet. Add only the beliefs that would change your next decision if they were wrong.</p>
            )}

            <div className="mt-5 flex flex-wrap items-center gap-2">
                <Button onClick={() => void save()} disabled={busy}>{busy ? <Spinner /> : <Check size={15} />} Save section</Button>
                <Link to={`/adviser?draft=${encodeURIComponent(`Help me decide what to test next for ${spec.title.toLowerCase()}.`)}`} className="inline-flex h-11 items-center gap-1.5 rounded-full px-4 text-[13px] font-semibold text-brand hover:bg-brand-soft">
                    Ask adviser <ArrowRight size={14} />
                </Link>
            </div>
        </section>
    );
}

/** The venture canvas is a single, navigable source of truth for every AI and mentor surface. */
export default function VenturePage() {
    const { user } = useData();
    const venture = user.venture;
    const defaultSection = useMemo(() => nextSection(venture.sections), [venture.sections]);
    const [selectedId, setSelectedId] = useState<VentureSectionId>(defaultSection.id);
    const selected = VENTURE_SECTIONS.find((section) => section.id === selectedId) ?? defaultSection;

    const summary = useMemo(() => {
        const sections = Object.values(venture.sections);
        const claims = sections.flatMap((section) => section?.claims ?? []);
        return {
            written: sections.filter((section) => sectionWritten(section)).length,
            openTests: claims.filter((claim) => claim.confidence !== "proven" && !claim.test.trim()).length,
            evidence: claims.filter((claim) => claim.confidence === "evidence" || claim.confidence === "proven").length,
        };
    }, [venture.sections]);

    return (
        <div className="mx-auto max-w-6xl">
            <PageTitle title="Venture canvas" sub="Capture the decisions, evidence, and tests that move your business forward." />
            <IdentityCard />

            <section className="mt-5 grid gap-3 sm:grid-cols-3" aria-label="Venture summary">
                <Card className="border border-line py-3.5">
                    <Overline>Canvas progress</Overline>
                    <p className="mt-1 text-[22px] font-semibold tabular-nums">{summary.written}<span className="text-[14px] font-normal text-caption"> / {VENTURE_SECTIONS.length}</span></p>
                    <ProgressBar value={(summary.written / VENTURE_SECTIONS.length) * 100} className="mt-2" />
                </Card>
                <Card className="border border-line py-3.5">
                    <Overline>Next focus</Overline>
                    <p className="mt-1 text-[16px] font-semibold leading-6">{defaultSection.title}</p>
                    <button type="button" onClick={() => setSelectedId(defaultSection.id)} className="mt-1 text-[12px] font-semibold text-brand underline underline-offset-4">Open this section</button>
                </Card>
                <Card className={cn("border py-3.5", summary.openTests ? "border-peach-soft bg-peach-soft/35" : "border-line")}>
                    <Overline>Evidence to collect</Overline>
                    <p className="mt-1 text-[22px] font-semibold tabular-nums">{summary.openTests}</p>
                    <p className="mt-0.5 text-[12px] leading-5 text-muted">{summary.openTests ? "Assumptions still need a test." : `${summary.evidence} evidence point${summary.evidence === 1 ? "" : "s"} recorded.`}</p>
                </Card>
            </section>

            <div className="mt-6 grid gap-5 lg:grid-cols-[230px_minmax(0,1fr)]">
                <CanvasNav selectedId={selected.id} sections={venture.sections} onSelect={setSelectedId} />
                <SectionEditor key={selected.id} spec={selected} section={venture.sections[selected.id]} />
            </div>

            {summary.openTests > 0 && (
                <div className="mt-5 flex items-start gap-3 rounded-xl border border-peach-soft bg-peach-soft/45 p-4">
                    <CircleAlert size={18} className="mt-0.5 shrink-0 text-peach" aria-hidden="true" />
                    <p className="text-[14px] leading-6 text-ink">Your open assumptions are visible in the canvas. Give each one a smallest next test before you treat it as a fact.</p>
                </div>
            )}
        </div>
    );
}
