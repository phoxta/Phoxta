import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CheckCircle2, ClipboardCheck, FlaskConical, Pencil, Plus, Trash2 } from "lucide-react";
import {
    VENTURE_SECTIONS,
    type EvidenceType,
    type Experiment,
    type ExperimentStatus,
    type NewExperiment,
    type VentureSectionId,
} from "@startup-school/core";
import { PageTitle } from "@/components/shell/AppShell";
import { Button, Card, EmptyState, Overline, Spinner, Tag } from "@/components/ui/primitives";
import { useData } from "@/state/data";
import { useToast } from "@/state/toast";
import { cn } from "@/lib/cn";

type Draft = {
    claimId: string;
    sectionId: VentureSectionId | "";
    title: string;
    hypothesis: string;
    method: string;
    threshold: string;
    status: ExperimentStatus;
    evidenceType: EvidenceType | "";
    evidence: string;
    sourceUrl: string;
    result: string;
    decision: string;
    nextStep: string;
    dueDate: string;
};

const STATUS: Record<ExperimentStatus, { label: string; tone: "neutral" | "fund" | "ok" | "warn" }> = {
    planned: { label: "Planned", tone: "neutral" },
    running: { label: "In the field", tone: "fund" },
    validated: { label: "Validated", tone: "ok" },
    invalidated: { label: "Changed course", tone: "warn" },
    inconclusive: { label: "Inconclusive", tone: "neutral" },
};

const EVIDENCE: { value: EvidenceType; label: string }[] = [
    { value: "conversation", label: "Customer conversation" },
    { value: "payment", label: "Payment or commitment" },
    { value: "metric", label: "Observed metric" },
    { value: "prototype", label: "Prototype use" },
    { value: "observation", label: "Direct observation" },
    { value: "research", label: "Research source" },
];

const inputClass = "mt-1.5 w-full rounded-lg border border-line-strong bg-page px-3 py-2.5 text-[14px] leading-6 outline-none placeholder:text-caption focus:border-brand focus:shadow-[0_0_0_3px_var(--color-brand-soft)]";
const dateValue = (iso: string | null): string => iso ? new Date(iso).toISOString().slice(0, 10) : "";

function emptyDraft(overrides: Partial<Draft> = {}): Draft {
    return {
        claimId: "", sectionId: "", title: "", hypothesis: "", method: "", threshold: "", status: "planned",
        evidenceType: "", evidence: "", sourceUrl: "", result: "", decision: "", nextStep: "", dueDate: "", ...overrides,
    };
}

function draftFrom(experiment: Experiment): Draft {
    return emptyDraft({
        claimId: experiment.claimId ?? "", sectionId: experiment.sectionId ?? "", title: experiment.title,
        hypothesis: experiment.hypothesis, method: experiment.method, threshold: experiment.threshold, status: experiment.status,
        evidenceType: experiment.evidenceType ?? "", evidence: experiment.evidence, sourceUrl: experiment.sourceUrl,
        result: experiment.result, decision: experiment.decision, nextStep: experiment.nextStep, dueDate: dateValue(experiment.dueAt),
    });
}

function ExperimentCard({ experiment, onEdit, onDelete }: { experiment: Experiment; onEdit: () => void; onDelete: () => void }) {
    const state = STATUS[experiment.status];
    return (
        <article className="rounded-xl border border-line bg-card p-5 max-md:p-4">
            <div className="flex flex-wrap items-start gap-3">
                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2"><Tag tone={state.tone}>{state.label}</Tag>{experiment.dueAt && <span className="text-[12px] text-caption">Review by {new Date(experiment.dueAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</span>}</div>
                    <h2 className="mt-2 text-[17px] font-semibold leading-6">{experiment.title}</h2>
                    <p className="mt-1 text-[13px] leading-5 text-muted">{experiment.hypothesis}</p>
                </div>
                <div className="flex shrink-0 gap-1">
                    <Button variant="ghost" size="sm" onClick={onEdit}><Pencil size={14} /> Edit</Button>
                    <Button variant="ghost" size="sm" onClick={onDelete} aria-label={`Delete ${experiment.title}`}><Trash2 size={14} /></Button>
                </div>
            </div>
            <dl className="mt-4 grid gap-3 border-t border-line pt-4 text-[13px] leading-5 sm:grid-cols-2">
                <div><dt className="font-semibold text-ink">Test</dt><dd className="mt-0.5 text-muted">{experiment.method}</dd></div>
                <div><dt className="font-semibold text-ink">Success means</dt><dd className="mt-0.5 text-muted">{experiment.threshold}</dd></div>
                {(experiment.evidence || experiment.result) && <div className="sm:col-span-2"><dt className="font-semibold text-ink">What happened</dt><dd className="mt-0.5 text-muted">{experiment.result || experiment.evidence}</dd></div>}
                {experiment.decision && <div className="rounded-lg bg-brand-soft/45 px-3 py-2 sm:col-span-2"><dt className="font-semibold text-brand-ink">Decision</dt><dd className="mt-0.5 text-ink">{experiment.decision}</dd></div>}
            </dl>
        </article>
    );
}

function ProofForm({ editing, draft, onChange, onCancel, onSave, busy }: { editing: Experiment | null; draft: Draft; onChange: (patch: Partial<Draft>) => void; onCancel: () => void; onSave: () => void; busy: boolean }) {
    const { user } = useData();
    const claims = useMemo(() => VENTURE_SECTIONS.flatMap((section) => (user.venture.sections[section.id]?.claims ?? []).filter((claim) => claim.text.trim()).map((claim) => ({ ...claim, sectionId: section.id, sectionTitle: section.title }))), [user.venture.sections]);
    return (
        <Card className="border border-brand/20 bg-brand-soft/25">
            <div className="flex flex-wrap items-start gap-3"><div className="min-w-0 flex-1"><Overline>{editing ? "Review the evidence" : "Plan one field test"}</Overline><h2 className="mt-1 text-[20px] font-semibold leading-7">{editing ? "Update the decision trail" : "What needs proof next?"}</h2><p className="mt-1 text-[14px] leading-6 text-muted">A useful test can prove you wrong. Keep it small enough to run this week.</p></div>{editing && <Button variant="ghost" size="sm" onClick={onCancel}>Cancel edit</Button>}</div>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
                <label className="md:col-span-2"><span className="text-[13px] font-semibold">Experiment title</span><input value={draft.title} onChange={(event) => onChange({ title: event.target.value })} className={inputClass} placeholder="e.g. Ask for a paid pilot before building" /></label>
                <label><span className="text-[13px] font-semibold">Venture claim</span><select value={draft.claimId} onChange={(event) => { const claim = claims.find((item) => item.id === event.target.value); onChange({ claimId: event.target.value, sectionId: claim?.sectionId ?? draft.sectionId, hypothesis: draft.hypothesis || claim?.text || "" }); }} className={inputClass}><option value="">Not attached to a saved claim</option>{claims.map((claim) => <option key={claim.id} value={claim.id}>{claim.sectionTitle}: {claim.text}</option>)}</select></label>
                <label><span className="text-[13px] font-semibold">Review date</span><input type="date" value={draft.dueDate} onChange={(event) => onChange({ dueDate: event.target.value })} className={inputClass} /></label>
                <label className="md:col-span-2"><span className="text-[13px] font-semibold">Hypothesis</span><textarea value={draft.hypothesis} onChange={(event) => onChange({ hypothesis: event.target.value })} rows={2} className={inputClass} placeholder="We believe this will be true..." /></label>
                <label><span className="text-[13px] font-semibold">Smallest credible test</span><textarea value={draft.method} onChange={(event) => onChange({ method: event.target.value })} rows={3} className={inputClass} placeholder="What will you do, with whom, by when?" /></label>
                <label><span className="text-[13px] font-semibold">Success threshold</span><textarea value={draft.threshold} onChange={(event) => onChange({ threshold: event.target.value })} rows={3} className={inputClass} placeholder="What result would change your decision?" /></label>
            </div>
            <div className="mt-6 border-t border-brand/15 pt-5"><div className="flex flex-wrap items-end gap-3"><div className="min-w-0 flex-1"><h3 className="text-[15px] font-semibold">Capture evidence and decide</h3><p className="mt-0.5 text-[12px] leading-5 text-muted">Keep facts separate from the conclusion you drew.</p></div><label className="w-full sm:w-44"><span className="text-[12px] font-semibold">Status</span><select value={draft.status} onChange={(event) => onChange({ status: event.target.value as ExperimentStatus })} className={inputClass}>{Object.entries(STATUS).map(([value, item]) => <option key={value} value={value}>{item.label}</option>)}</select></label></div>
                <div className="mt-4 grid gap-4 md:grid-cols-2"><label><span className="text-[13px] font-semibold">Evidence type</span><select value={draft.evidenceType} onChange={(event) => onChange({ evidenceType: event.target.value as EvidenceType | "" })} className={inputClass}><option value="">Choose when you have evidence</option>{EVIDENCE.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label><label><span className="text-[13px] font-semibold">Source link or location</span><input value={draft.sourceUrl} onChange={(event) => onChange({ sourceUrl: event.target.value })} className={inputClass} placeholder="Call note, dashboard, document…" /></label><label className="md:col-span-2"><span className="text-[13px] font-semibold">Raw evidence</span><textarea value={draft.evidence} onChange={(event) => onChange({ evidence: event.target.value })} rows={3} className={inputClass} placeholder="Quotes, counts, observations, or the relevant number—not a summary from AI." /></label><label><span className="text-[13px] font-semibold">Result</span><textarea value={draft.result} onChange={(event) => onChange({ result: event.target.value })} rows={3} className={inputClass} placeholder="What happened against the threshold?" /></label><label><span className="text-[13px] font-semibold">Founder decision</span><textarea value={draft.decision} onChange={(event) => onChange({ decision: event.target.value })} rows={3} className={inputClass} placeholder="Continue, change, or stop—and why?" /></label><label className="md:col-span-2"><span className="text-[13px] font-semibold">Next step</span><input value={draft.nextStep} onChange={(event) => onChange({ nextStep: event.target.value })} className={inputClass} placeholder="The next piece of work this evidence creates" /></label></div>
            </div>
            <div className="mt-5 flex flex-wrap gap-2"><Button onClick={onSave} disabled={busy}>{busy ? <Spinner /> : <CheckCircle2 size={15} />}{editing ? "Save evidence" : "Create experiment"}</Button>{!editing && <Button variant="ghost" onClick={onCancel}>Clear</Button>}</div>
        </Card>
    );
}

/** The proof loop is deliberately inside Build, not another navigation pillar. */
export default function ExperimentsPage() {
    const { user, mutate } = useData();
    const { toast } = useToast();
    const [params] = useSearchParams();
    const [editing, setEditing] = useState<Experiment | null>(null);
    const [draft, setDraft] = useState<Draft>(() => emptyDraft());
    const [busy, setBusy] = useState(false);
    const sorted = useMemo(() => [...user.experiments].sort((a, b) => Number(["running", "planned"].includes(b.status)) - Number(["running", "planned"].includes(a.status)) || (a.dueAt ?? "9999").localeCompare(b.dueAt ?? "9999")), [user.experiments]);
    const active = sorted.filter((item) => item.status === "planned" || item.status === "running");
    const reviewed = sorted.filter((item) => !["planned", "running"].includes(item.status));

    useEffect(() => {
        const claimId = params.get("claim") ?? "";
        const sectionId = params.get("section") as VentureSectionId | null;
        const title = params.get("title") ?? "";
        const hypothesis = params.get("hypothesis") ?? "";
        if (claimId || sectionId || title || hypothesis) setDraft(emptyDraft({ claimId, sectionId: sectionId ?? "", title, hypothesis }));
    }, [params]);

    const reset = () => { setEditing(null); setDraft(emptyDraft()); };
    const save = async () => {
        if (![draft.title, draft.hypothesis, draft.method, draft.threshold].every((value) => value.trim())) {
            toast("Name the test, hypothesis, method, and success threshold first.", "danger"); return;
        }
        const dueAt = draft.dueDate ? new Date(`${draft.dueDate}T18:00:00`).toISOString() : null;
        const input: NewExperiment = {
            claimId: draft.claimId || null, sectionId: draft.sectionId || null, title: draft.title, hypothesis: draft.hypothesis,
            method: draft.method, threshold: draft.threshold, status: draft.status, evidenceType: draft.evidenceType || null,
            evidence: draft.evidence, sourceUrl: draft.sourceUrl, result: draft.result, decision: draft.decision, nextStep: draft.nextStep, dueAt,
        };
        setBusy(true);
        try {
            if (editing) await mutate((repository) => repository.updateExperiment(editing.id, input));
            else await mutate((repository) => repository.addExperiment(input));
            toast(editing ? "Experiment evidence saved" : "Experiment added to your proof loop", "success");
            reset();
        } catch (error) { toast(error instanceof Error ? error.message : "Could not save the experiment", "danger"); }
        finally { setBusy(false); }
    };
    const remove = async (experiment: Experiment) => {
        if (!window.confirm(`Delete “${experiment.title}”? This removes its evidence trail.`)) return;
        try { await mutate((repository) => repository.deleteExperiment(experiment.id)); if (editing?.id === experiment.id) reset(); toast("Experiment deleted"); }
        catch (error) { toast(error instanceof Error ? error.message : "Could not delete the experiment", "danger"); }
    };

    return <div className="mx-auto max-w-5xl"><PageTitle title="Proof loop" sub="Turn the riskiest assumption into a field test, record what happened, then make the next decision." />
        <section className="mb-6 grid gap-3 sm:grid-cols-3" aria-label="Proof loop summary"><Card className="border border-line py-3.5"><Overline>In the field</Overline><p className="mt-1 text-[24px] font-semibold">{active.length}</p><p className="text-[12px] text-muted">tests needing evidence</p></Card><Card className="border border-line py-3.5"><Overline>Decisions made</Overline><p className="mt-1 text-[24px] font-semibold">{reviewed.filter((item) => item.decision.trim()).length}</p><p className="text-[12px] text-muted">proof-backed choices</p></Card><Card className="border border-line py-3.5"><Overline>Current stage</Overline><p className="mt-1 text-[16px] font-semibold leading-7">{user.venture.name || "Your venture"}</p><Link to="/venture" className="text-[12px] font-semibold text-brand underline underline-offset-4">Open venture context</Link></Card></section>
        <ProofForm editing={editing} draft={draft} onChange={(patch) => setDraft((current) => ({ ...current, ...patch }))} onCancel={reset} onSave={() => void save()} busy={busy} />
        <section className="mt-7" aria-labelledby="active-experiments"><div className="mb-3 flex items-center gap-2"><FlaskConical size={18} className="text-brand" /><h2 id="active-experiments" className="text-[19px] font-semibold">Active tests</h2></div>{active.length ? <div className="grid gap-4 lg:grid-cols-2">{active.map((item) => <ExperimentCard key={item.id} experiment={item} onEdit={() => { setEditing(item); setDraft(draftFrom(item)); window.scrollTo({ top: 0, behavior: "smooth" }); }} onDelete={() => void remove(item)} />)}</div> : <EmptyState icon={<ClipboardCheck size={22} />} title="No field test in motion" body="Pick the one uncertainty most likely to change your next business decision." className="border border-dashed border-line bg-card" />}</section>
        {reviewed.length > 0 && <section className="mt-7" aria-labelledby="reviewed-experiments"><h2 id="reviewed-experiments" className="mb-3 text-[19px] font-semibold">Evidence reviewed</h2><div className="grid gap-4 lg:grid-cols-2">{reviewed.map((item) => <ExperimentCard key={item.id} experiment={item} onEdit={() => { setEditing(item); setDraft(draftFrom(item)); window.scrollTo({ top: 0, behavior: "smooth" }); }} onDelete={() => void remove(item)} />)}</div></section>}
        <aside className={cn("mt-7 flex items-start gap-3 rounded-xl border border-brand-soft bg-brand-soft/40 p-4", !user.venture.name && "border-peach-soft bg-peach-soft/45")}><span className="grid size-8 shrink-0 place-items-center rounded-full bg-card text-brand"><Plus size={16} /></span><p className="text-[13px] leading-6 text-ink">{user.venture.path === "phoxta_turnkey" ? "A Phoxta turnkey business gives you a starting system. Your proof loop still validates the local customer, offer, operator workflow, and unit economics before you scale." : "A completed experiment is not a victory lap. It is a decision record: what you believed, what you did, the evidence, and what changed next."}</p></aside>
    </div>;
}
