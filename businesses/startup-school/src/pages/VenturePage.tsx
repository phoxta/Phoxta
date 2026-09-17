import { useMemo, useState } from "react";
import { Check, ChevronDown, FlaskConical, Pencil, Plus, Sparkles, Trash2, X } from "lucide-react";
import {
    STAGE_LABEL,
    STAGE_ORDER,
    VENTURE_SECTIONS,
    type SectionSpec,
    type VentureClaim,
    type VentureConfidence,
    type VentureSection,
    type VentureStage,
} from "@startup-school/core";
import { PageTitle } from "@/components/shell/AppShell";
import { Button, Card, Field, Overline, ProgressBar, Spinner, Tag } from "@/components/ui/primitives";
import { useData } from "@/state/data";
import { useToast } from "@/state/toast";
import { cn } from "@/lib/cn";

/**
 * The venture record.
 *
 * One object, eight sections, read by every AI surface in the school. That is
 * the argument for the page existing at all: a model is useful here because it
 * knows about THIS business, and without a record each feature starts from
 * nothing and produces advice that would fit anybody.
 *
 * The part that earns its keep is the claims list. A statement without a
 * confidence reads as a fact; a guess without a test is just an admission.
 * Together they are the most useful thing a mentor can read before a session —
 * they say exactly where to push.
 */

const CONF: Record<VentureConfidence, { label: string; tone: "warn" | "fund" | "ok"; blurb: string }> = {
    guess: { label: "Guess", tone: "warn", blurb: "Believed, not checked." },
    evidence: { label: "Evidence", tone: "fund", blurb: "Something real points this way." },
    proven: { label: "Proven", tone: "ok", blurb: "It has actually happened." },
};

const CONF_ORDER: VentureConfidence[] = ["guess", "evidence", "proven"];

const uid = (): string => `vc-${Math.random().toString(36).slice(2, 9)}`;

// ---------------------------------------------------------------------------

function ClaimRow({
    claim,
    onChange,
    onRemove,
}: {
    claim: VentureClaim;
    onChange: (next: VentureClaim) => void;
    onRemove: () => void;
}) {
    const conf = CONF[claim.confidence];
    return (
        <li className="rounded-xl border border-line p-3">
            <div className="flex items-start gap-2">
                <textarea
                    value={claim.text}
                    onChange={(e) => onChange({ ...claim, text: e.target.value })}
                    rows={2}
                    placeholder="What you believe to be true…"
                    className="min-w-0 flex-1 resize-y rounded-lg border border-line bg-card px-3 py-2 text-[14px] leading-6 outline-none focus:border-brand"
                />
                <button
                    type="button"
                    onClick={onRemove}
                    aria-label="Remove this claim"
                    className="mt-1 rounded-lg p-1.5 text-caption hover:bg-page hover:text-danger-ink"
                >
                    <Trash2 size={15} />
                </button>
            </div>

            <div className="mt-2.5 flex flex-wrap items-center gap-2">
                <div role="group" aria-label="How sure are you?" className="flex rounded-lg border border-line p-0.5">
                    {CONF_ORDER.map((c) => (
                        <button
                            key={c}
                            type="button"
                            aria-pressed={claim.confidence === c}
                            onClick={() => onChange({ ...claim, confidence: c })}
                            title={CONF[c].blurb}
                            className={cn(
                                "rounded-md px-2.5 py-1 text-[12px] font-semibold",
                                claim.confidence === c ? "bg-brand text-white" : "text-muted hover:text-ink",
                            )}
                        >
                            {CONF[c].label}
                        </button>
                    ))}
                </div>
                <span className="text-[12px] text-caption">{conf.blurb}</span>
            </div>

            {claim.confidence !== "proven" && (
                <label className="mt-2.5 flex items-start gap-2">
                    <FlaskConical size={14} className="mt-2.5 shrink-0 text-caption" />
                    <span className="sr-only">What would settle it</span>
                    <input
                        value={claim.test}
                        onChange={(e) => onChange({ ...claim, test: e.target.value })}
                        placeholder="What would settle it?"
                        className="min-w-0 flex-1 rounded-lg border border-line bg-card px-3 py-2 text-[13px] outline-none focus:border-brand"
                    />
                </label>
            )}
        </li>
    );
}

function SectionCard({ spec, section }: { spec: SectionSpec; section?: VentureSection }) {
    const { mutate } = useData();
    const { toast } = useToast();
    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState(false);
    const [body, setBody] = useState(section?.body ?? "");
    const [claims, setClaims] = useState<VentureClaim[]>(section?.claims ?? []);
    const [busy, setBusy] = useState(false);

    const filled = Boolean(section?.body?.trim() || section?.claims?.length);
    const guesses = (section?.claims ?? []).filter((c) => c.confidence === "guess").length;

    const start = () => {
        setBody(section?.body ?? "");
        setClaims(section?.claims ?? []);
        setEditing(true);
        setOpen(true);
    };

    const save = async () => {
        setBusy(true);
        try {
            await mutate((r) =>
                r.saveVenture({
                    sections: {
                        [spec.id]: {
                            body: body.trim(),
                            // An empty claim is a half-typed thought, not data.
                            claims: claims.filter((c) => c.text.trim()),
                            updatedAt: new Date().toISOString(),
                        },
                    },
                }),
            );
            setEditing(false);
            toast(`${spec.title} saved`);
        } catch (e) {
            toast(e instanceof Error ? e.message : "Could not save that");
        } finally {
            setBusy(false);
        }
    };

    return (
        <Card as="li" className="flex flex-col">
            <div className="flex flex-wrap items-start gap-3">
                <button
                    type="button"
                    onClick={() => setOpen((v) => !v)}
                    aria-expanded={open}
                    className="flex min-w-0 flex-1 items-start gap-2.5 text-left"
                >
                    <ChevronDown size={16} className={cn("mt-1 shrink-0 text-caption transition-transform", open && "rotate-180")} />
                    <span className="min-w-0">
                        <span className="flex flex-wrap items-center gap-2">
                            <span className="text-[16px] font-semibold">{spec.title}</span>
                            {!filled && <Tag tone="neutral">Empty</Tag>}
                            {guesses > 0 && (
                                <Tag tone="warn">
                                    {guesses} {guesses === 1 ? "guess" : "guesses"}
                                </Tag>
                            )}
                        </span>
                        <span className="mt-0.5 block text-[13px] leading-5 text-muted">{spec.blurb}</span>
                    </span>
                </button>
                {!editing && (
                    <Button variant="outline" onClick={start}>
                        <Pencil size={14} /> {filled ? "Edit" : "Write it"}
                    </Button>
                )}
            </div>

            {open && !editing && (
                <div className="mt-4 border-t border-line pt-4">
                    {section?.body ? (
                        <p className="whitespace-pre-wrap text-[14px] leading-6">{section.body}</p>
                    ) : (
                        <p className="text-[14px] text-caption">Nothing written here yet. {spec.prompt}</p>
                    )}

                    {!!section?.claims?.length && (
                        <ul className="mt-4 flex flex-col gap-2">
                            {section.claims.map((c) => (
                                <li key={c.id} className="rounded-xl bg-page p-3">
                                    <div className="flex flex-wrap items-start gap-2">
                                        <Tag tone={CONF[c.confidence].tone}>{CONF[c.confidence].label}</Tag>
                                        <p className="min-w-0 flex-1 text-[14px] leading-6">{c.text}</p>
                                    </div>
                                    {c.confidence !== "proven" && c.test && (
                                        <p className="mt-1.5 flex items-start gap-1.5 text-[13px] text-muted">
                                            <FlaskConical size={13} className="mt-1 shrink-0" /> {c.test}
                                        </p>
                                    )}
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            )}

            {editing && (
                <div className="mt-4 border-t border-line pt-4">
                    <label className="mb-1.5 block text-[13px] font-semibold" htmlFor={`body-${spec.id}`}>
                        {spec.prompt}
                    </label>
                    <textarea
                        id={`body-${spec.id}`}
                        value={body}
                        onChange={(e) => setBody(e.target.value)}
                        rows={5}
                        className="w-full resize-y rounded-xl border border-line bg-card px-3.5 py-3 text-[14px] leading-6 outline-none focus:border-brand"
                    />

                    <div className="mb-2 mt-4 flex flex-wrap items-center gap-2">
                        <Overline>Claims</Overline>
                        <span className="text-[12px] text-caption">{spec.claimHint}</span>
                    </div>
                    <ul className="flex flex-col gap-2">
                        {claims.map((c, i) => (
                            <ClaimRow
                                key={c.id}
                                claim={c}
                                onChange={(next) => setClaims((list) => list.map((x, j) => (j === i ? next : x)))}
                                onRemove={() => setClaims((list) => list.filter((_, j) => j !== i))}
                            />
                        ))}
                    </ul>
                    <Button
                        variant="ghost"
                        className="mt-2"
                        onClick={() => setClaims((l) => [...l, { id: uid(), text: "", confidence: "guess", test: "" }])}
                    >
                        <Plus size={14} /> Add a claim
                    </Button>

                    <div className="mt-4 flex flex-wrap gap-2">
                        <Button onClick={() => void save()} disabled={busy}>
                            {busy ? <Spinner /> : <Check size={14} />} Save
                        </Button>
                        <Button variant="ghost" onClick={() => setEditing(false)} disabled={busy}>
                            <X size={14} /> Cancel
                        </Button>
                    </div>
                </div>
            )}
        </Card>
    );
}

// ---------------------------------------------------------------------------

function Header() {
    const { user, mutate } = useData();
    const { toast } = useToast();
    const v = user.venture;
    const [editing, setEditing] = useState(false);
    const [name, setName] = useState(v.name);
    const [oneLiner, setOneLiner] = useState(v.oneLiner);
    const [country, setCountry] = useState(v.country);
    const [stage, setStage] = useState<VentureStage>(v.stage);
    const [busy, setBusy] = useState(false);

    const start = () => {
        setName(v.name); setOneLiner(v.oneLiner); setCountry(v.country); setStage(v.stage);
        setEditing(true);
    };

    const save = async () => {
        setBusy(true);
        try {
            await mutate((r) => r.saveVenture({ name: name.trim(), oneLiner: oneLiner.trim(), country: country.trim(), stage }));
            setEditing(false);
            toast("Saved");
        } catch (e) {
            toast(e instanceof Error ? e.message : "Could not save that");
        } finally {
            setBusy(false);
        }
    };

    if (editing) {
        return (
            <Card className="mb-6">
                <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="What is it called?" value={name} onChange={(e) => setName(e.target.value)} placeholder="Working name is fine" />
                    <Field
                        label="Where will it be registered?"
                        value={country}
                        onChange={(e) => setCountry(e.target.value)}
                        placeholder="Nigeria, UK, Kenya…"
                        hint="This changes the legal form, the funding sources and the payment rails. It is asked once."
                    />
                </div>
                <label className="mt-3 block">
                    <span className="mb-1.5 block text-[13px] font-semibold">In one sentence</span>
                    <input
                        value={oneLiner}
                        onChange={(e) => setOneLiner(e.target.value)}
                        placeholder="What it does, for whom. If it takes two sentences the model is not settled."
                        className="w-full rounded-xl border border-line bg-card px-3.5 py-3 text-[14px] outline-none focus:border-brand"
                    />
                </label>
                <label className="mt-3 block">
                    <span className="mb-1.5 block text-[13px] font-semibold">Where are you?</span>
                    <select
                        value={stage}
                        onChange={(e) => setStage(e.target.value as VentureStage)}
                        className="w-full rounded-xl border border-line bg-card px-3.5 py-3 text-[14px] outline-none focus:border-brand"
                    >
                        {STAGE_ORDER.map((sg) => (
                            <option key={sg} value={sg}>{STAGE_LABEL[sg]}</option>
                        ))}
                    </select>
                </label>
                <div className="mt-4 flex flex-wrap gap-2">
                    <Button onClick={() => void save()} disabled={busy}>
                        {busy ? <Spinner /> : <Check size={14} />} Save
                    </Button>
                    <Button variant="ghost" onClick={() => setEditing(false)} disabled={busy}>
                        <X size={14} /> Cancel
                    </Button>
                </div>
            </Card>
        );
    }

    return (
        <Card className="mb-6">
            <div className="flex flex-wrap items-start gap-4">
                <div className="min-w-0 flex-1">
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                        <h2 className="text-[20px] font-semibold">{v.name || "Your venture"}</h2>
                        <Tag tone="fund">{STAGE_LABEL[v.stage]}</Tag>
                        {v.country ? <Tag tone="neutral">{v.country}</Tag> : <Tag tone="warn">No country set</Tag>}
                    </div>
                    <p className="text-[15px] leading-6 text-muted">
                        {v.oneLiner || "No one-sentence version yet. It is the hardest paragraph you will write and the most useful."}
                    </p>
                </div>
                <Button variant="outline" onClick={start}>
                    <Pencil size={14} /> Edit
                </Button>
            </div>
        </Card>
    );
}

// ---------------------------------------------------------------------------

export default function VenturePage() {
    const { user } = useData();
    const v = user.venture;

    const { done, guesses, untested } = useMemo(() => {
        const secs = Object.values(v.sections);
        const claims = secs.flatMap((s) => s?.claims ?? []);
        return {
            done: secs.filter((s) => s?.body?.trim()).length,
            guesses: claims.filter((c) => c.confidence === "guess").length,
            untested: claims.filter((c) => c.confidence !== "proven" && !c.test.trim()).length,
        };
    }, [v.sections]);

    return (
        <>
            <PageTitle
                title="Your venture"
                sub="One record, read by everything else here — your mentors before a session, the adviser when you ask it something, and you when you have forgotten what you believed three months ago."
            />

            <Header />

            <div className="mb-6 grid gap-4 sm:grid-cols-3">
                <Card>
                    <Overline>Sections written</Overline>
                    <p className="mb-2 mt-1 text-[24px] font-semibold tabular-nums">
                        {done}<span className="text-[15px] text-caption"> / {VENTURE_SECTIONS.length}</span>
                    </p>
                    <ProgressBar value={Math.round((done / VENTURE_SECTIONS.length) * 100)} />
                </Card>
                <Card>
                    <Overline>Open guesses</Overline>
                    <p className="mt-1 text-[24px] font-semibold tabular-nums">{guesses}</p>
                    <p className="text-[13px] leading-5 text-muted">
                        Things you believe and have not checked. Not a problem — an unmarked one is.
                    </p>
                </Card>
                <Card>
                    <Overline>Without a test</Overline>
                    <p className="mt-1 text-[24px] font-semibold tabular-nums">{untested}</p>
                    <p className="text-[13px] leading-5 text-muted">
                        {untested ? "A guess with no way to settle it will still be a guess next quarter." : "Every open claim has something that would settle it."}
                    </p>
                </Card>
            </div>

            <div className="mb-3 flex items-center gap-2">
                <Sparkles size={15} className="text-brand" />
                <p className="text-[13px] text-muted">
                    Sections a mentor reads first: <strong className="font-semibold text-ink">What you need</strong>, then your open guesses.
                </p>
            </div>

            <ul className="flex flex-col gap-4">
                {VENTURE_SECTIONS.map((spec) => (
                    <SectionCard key={spec.id} spec={spec} section={v.sections[spec.id]} />
                ))}
            </ul>
        </>
    );
}
