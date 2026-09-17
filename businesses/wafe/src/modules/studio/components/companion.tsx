import { useState, type FormEvent, type KeyboardEvent } from "react";
import { Link } from "react-router-dom";
import { ArrowUp, Check, EyeOff, Lock, ShieldAlert, Sparkles, X } from "lucide-react";
import type { Role } from "@/data/core";
import { cn } from "@/lib/cn";
import { relative } from "@/lib/format";
import { useSpace } from "@/state/space";
import { Sprig } from "@/components/brand";
import { Lite } from "@/components/companion/CompanionDrawer";
import { Button, Tag } from "@/components/ui/primitives";
import { simulate, type ContextPack, type PromptChip } from "../context";
import { RESTRICTED } from "../derive";
import { SENSITIVITY_LABEL, type ChatMessage, type Proposal, type Source } from "../types";

/**
 * The companion's own furniture: the source chips under every answer, the
 * proposal card that is the only way anything gets written, the thread, the
 * composer (a keyboard for some members, a picker for others) and the panel
 * that shows exactly what the companion was allowed to read.
 */

// ---------------------------------------------------------------------------
// Sources
// ---------------------------------------------------------------------------

/** AC1: every answer says what it read, and each chip goes to the thing. */
export function SourceChips({ sources, className }: { sources: Source[]; className?: string }) {
    const [open, setOpen] = useState(false);
    if (!sources.length) return null;
    return (
        <div className={cn("mt-3", className)}>
            <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-2xs font-semibold uppercase tracking-[0.06em] text-caption">I used</span>
                {sources.map((s, i) => (
                    <Link
                        key={`${s.moduleId}-${i}`}
                        to={s.href}
                        title={s.detail}
                        className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-line-strong bg-card px-2.5 py-1 text-xs font-medium text-muted transition-colors hover:border-brand hover:text-brand"
                    >
                        <span className="truncate">{s.label}</span>
                        {RESTRICTED.includes(s.sensitivity) && <Lock size={11} aria-hidden="true" />}
                    </Link>
                ))}
                <button type="button" onClick={() => setOpen((v) => !v)} className="text-xs font-semibold text-brand underline-offset-4 hover:underline">
                    {open ? "Hide the lines" : "Show the lines"}
                </button>
            </div>
            {open && (
                <ul className="mt-2 space-y-1.5 rounded-md bg-page p-3">
                    {sources.map((s, i) => (
                        <li key={`${s.moduleId}-detail-${i}`} className="text-xs leading-5 text-muted">
                            <span className="font-semibold text-ink">{s.label}</span>
                            {RESTRICTED.includes(s.sensitivity) && <span className="ml-1.5 text-caption">({SENSITIVITY_LABEL[s.sensitivity]})</span>} — {s.detail}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

// ---------------------------------------------------------------------------
// Proposals
// ---------------------------------------------------------------------------

const PROPOSAL_LABEL: Record<Proposal["kind"], string> = { task: "A task", plan: "A plan", event: "A calendar event", budget: "A budget change" };

/** AC3: the card is the only path from a suggestion to a real thing. */
export function ProposalCard({ proposal, onDecide, className }: { proposal: Proposal; onDecide?: (status: "accepted" | "dismissed") => Promise<void> | void; className?: string }) {
    const [busy, setBusy] = useState<"accepted" | "dismissed" | null>(null);
    const decide = async (status: "accepted" | "dismissed") => {
        if (!onDecide) return;
        setBusy(status);
        try {
            await onDecide(status);
        } finally {
            setBusy(null);
        }
    };
    return (
        <div className={cn("mt-3 rounded-lg border border-create/25 bg-create-soft p-4", className)}>
            <div className="flex flex-wrap items-center gap-2">
                <Tag tone="create">{PROPOSAL_LABEL[proposal.kind]}</Tag>
                <span className="text-2xs font-semibold uppercase tracking-[0.06em] text-create-ink">Suggestion · not written yet</span>
            </div>
            <p className="mt-2 text-base font-semibold leading-6 text-create-ink">{proposal.title}</p>
            <p className="mt-1 text-sm leading-5 text-muted">{proposal.detail}</p>
            {proposal.dueDate && <p className="mt-1 text-xs text-caption">Suggested for {proposal.dueDate}</p>}
            {proposal.status === "pending" ? (
                <div className="mt-3 flex flex-wrap gap-2">
                    <Button size="md" variant="brand" loading={busy === "accepted"} disabled={!onDecide || busy !== null} onClick={() => void decide("accepted")}>
                        <Check size={15} aria-hidden="true" /> Yes, do that
                    </Button>
                    <Button size="md" variant="outline" loading={busy === "dismissed"} disabled={!onDecide || busy !== null} onClick={() => void decide("dismissed")}>
                        <X size={15} aria-hidden="true" /> No thanks
                    </Button>
                </div>
            ) : proposal.status === "accepted" ? (
                <p className="mt-3 text-sm font-semibold text-create-ink">
                    Confirmed.{" "}
                    <Link to={proposal.href} className="underline underline-offset-4">
                        Finish it here
                    </Link>{" "}
                    — Wàfè still hasn&apos;t written anything on your behalf.
                </p>
            ) : (
                <p className="mt-3 text-sm text-muted">Dismissed. Nothing was written.</p>
            )}
        </div>
    );
}

// ---------------------------------------------------------------------------
// The thread
// ---------------------------------------------------------------------------

const BLOCKED_LABEL: Record<"safety" | "cap" | "scope", { label: string; tone: "warn" | "danger" | "neutral" }> = {
    safety: { label: "Talk to a parent", tone: "warn" },
    cap: { label: "Allowance spent", tone: "danger" },
    scope: { label: "Outside what I can see", tone: "neutral" },
};

export function Turn({ message, onDecide, big }: { message: ChatMessage; onDecide?: (proposalId: string, status: "accepted" | "dismissed") => Promise<void> | void; big?: boolean }) {
    if (message.from === "me") {
        return (
            <div className="flex justify-end">
                <p className={cn("max-w-[85%] rounded-2xl rounded-br-sm bg-brand px-4 py-2.5 text-white", big ? "text-lg leading-7" : "text-md leading-6")}>{message.text}</p>
            </div>
        );
    }
    const blocked = message.blocked ? BLOCKED_LABEL[message.blocked] : null;
    return (
        <div className="flex gap-2.5">
            <span className="mt-1 grid size-7 shrink-0 place-items-center rounded-full bg-brand text-white" aria-hidden="true">
                <Sprig className="w-3.5" />
            </span>
            <div className="min-w-0 max-w-[92%] flex-1">
                <div className={cn("rounded-2xl rounded-bl-sm bg-card px-4 py-3", message.blocked === "safety" && "bg-peach-soft")}>
                    {blocked && (
                        <div className="mb-2 flex items-center gap-1.5">
                            <ShieldAlert size={13} className="text-peach" aria-hidden="true" />
                            <span className="text-2xs font-semibold uppercase tracking-[0.06em] text-muted">{blocked.label}</span>
                        </div>
                    )}
                    <Lite text={message.text} className={big ? "text-lg leading-7" : undefined} />
                    <SourceChips sources={message.sources} />
                </div>
                {message.proposal && <ProposalCard proposal={message.proposal} onDecide={onDecide ? (status) => onDecide(message.proposal!.id, status) : undefined} />}
                <p className="mt-1 px-1 text-2xs text-caption">{relative(message.at)}</p>
            </div>
        </div>
    );
}

export function Thinking() {
    return (
        <div className="flex gap-2.5" role="status" aria-label="Wàfè is thinking">
            <span className="mt-1 grid size-7 shrink-0 place-items-center rounded-full bg-brand text-white" aria-hidden="true">
                <Sprig className="w-3.5" />
            </span>
            <div className="flex items-center gap-1 rounded-2xl rounded-bl-sm bg-card px-4 py-3">
                <span className="size-1.5 animate-bounce rounded-full bg-brand [animation-delay:-0.3s]" />
                <span className="size-1.5 animate-bounce rounded-full bg-brand [animation-delay:-0.15s]" />
                <span className="size-1.5 animate-bounce rounded-full bg-brand" />
            </div>
        </div>
    );
}

// ---------------------------------------------------------------------------
// The composer — a keyboard for some, a picker for others
// ---------------------------------------------------------------------------

/** AC4/AC5: Little and Junior pick; Teen and above type, and are classified. */
export function Composer({ chips, canFreeType, busy, onAsk, placeholder }: { chips: PromptChip[]; canFreeType: boolean; busy: boolean; onAsk: (q: string) => void; placeholder?: string }) {
    const [draft, setDraft] = useState("");
    const submit = (e: FormEvent) => {
        e.preventDefault();
        const text = draft.trim();
        if (!text) return;
        setDraft("");
        onAsk(text);
    };
    const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            e.currentTarget.form?.requestSubmit();
        }
    };

    if (!canFreeType) {
        return (
            <div>
                <p className="mb-3 text-sm text-muted">Tap something to ask. There is no typing here — the pictures and words are chosen for you.</p>
                <ul className="grid grid-cols-[minmax(0,1fr)] gap-2.5 sm:grid-cols-2">
                    {chips.map((c) => (
                        <li key={c.label}>
                            <button
                                type="button"
                                disabled={busy}
                                onClick={() => onAsk(c.prompt)}
                                className="flex w-full items-center gap-3 rounded-xl bg-card px-4 py-4 text-left text-lg font-semibold leading-6 transition-shadow hover:shadow-hover disabled:opacity-50"
                            >
                                {c.label}
                            </button>
                        </li>
                    ))}
                </ul>
            </div>
        );
    }

    return (
        <form onSubmit={submit}>
            <div className="no-scrollbar -mx-1 mb-2.5 flex gap-2 overflow-x-auto px-1 pb-1">
                {chips.map((c) => (
                    <button
                        key={c.label}
                        type="button"
                        disabled={busy}
                        onClick={() => onAsk(c.prompt)}
                        className="shrink-0 rounded-full border border-line-strong bg-card px-3 py-1.5 text-xs font-medium transition-colors hover:border-brand hover:text-brand disabled:opacity-50"
                    >
                        {c.label}
                    </button>
                ))}
            </div>
            <div className="flex items-end gap-2 rounded-lg border border-line-strong bg-card px-3 py-2 focus-within:border-brand focus-within:shadow-[0_0_0_3px_var(--color-brand-soft)]">
                <label htmlFor="studio-ask" className="sr-only">
                    Ask Wàfè
                </label>
                <textarea
                    id="studio-ask"
                    rows={1}
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={onKey}
                    placeholder={placeholder ?? "Ask about the week, the plan, a lesson…"}
                    className="max-h-40 min-h-[28px] flex-1 resize-none bg-transparent py-1 text-md leading-6 outline-none placeholder:text-caption"
                />
                <button type="submit" disabled={busy || !draft.trim()} aria-label="Ask" className="grid size-9 shrink-0 place-items-center rounded-full bg-brand text-white transition-colors hover:bg-brand-hover disabled:opacity-40">
                    <ArrowUp size={16} strokeWidth={2.2} aria-hidden="true" />
                </button>
            </div>
        </form>
    );
}

// ---------------------------------------------------------------------------
// What Wàfè can see — the context-builder test, on screen
// ---------------------------------------------------------------------------

const ROLE_TEST: Array<{ role: Role; label: string }> = [
    { role: "parent", label: "A parent" },
    { role: "child", label: "A child" },
    { role: "guest", label: "A guest" },
];

/**
 * AC6, made clickable: the same gate the pack builder runs, applied to the
 * sections this browser holds, with what would be stripped for a child or a
 * guest named out loud. It is a privacy control, so it shows the rule working
 * rather than asserting that it does.
 */
export function ContextPanel({ pack }: { pack: ContextPack }) {
    const { me } = useSpace();
    const [as, setAs] = useState<Role>(me.role);
    const result = simulate(pack, as, as === me.role ? me.grants : {});
    return (
        <div className="rounded-xl bg-card p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="font-display text-2xl leading-7">What Wàfè can see</h2>
                <span className="text-xs text-caption">{pack.size.toLocaleString("en-GB")} characters sent</span>
            </div>
            <p className="mt-1.5 text-sm leading-5 text-muted">
                The companion knows only this. Each line is one part of the app, summarised for {me.name.split(" ")[0]} — money, health, documents and private notes are cut out of a child&apos;s or a guest&apos;s pack before
                the question is even asked.
            </p>

            <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Show the pack as">
                {ROLE_TEST.map((r) => (
                    <button
                        key={r.role}
                        type="button"
                        aria-pressed={as === r.role}
                        onClick={() => setAs(r.role)}
                        className={cn("rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors", as === r.role ? "border-brand bg-brand-soft text-brand-ink" : "border-line-strong text-muted hover:text-ink")}
                    >
                        {r.label} would see
                    </button>
                ))}
            </div>

            <ul className="mt-4 space-y-1.5">
                {result.kept.map((s) => (
                    <li key={`kept-${s.moduleId}`} className="flex items-start gap-2 text-sm leading-5">
                        <Check size={14} className="mt-0.5 shrink-0 text-mint" aria-hidden="true" />
                        <span className="min-w-0">
                            <span className="font-semibold">{s.label}</span>
                            <span className="text-caption"> · {SENSITIVITY_LABEL[s.sensitivity]}</span>
                            <span className="clamp-2 block text-muted">{s.text.slice(0, 180)}</span>
                        </span>
                    </li>
                ))}
                {!result.kept.length && <li className="text-sm text-muted">Nothing at all — this member&apos;s pack is empty.</li>}
            </ul>

            {result.stripped.length > 0 && (
                <div className="mt-4 rounded-lg bg-page p-3.5">
                    <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.06em] text-muted">
                        <EyeOff size={13} aria-hidden="true" /> Removed before the question
                    </p>
                    <ul className="space-y-1">
                        {result.stripped.map((s) => (
                            <li key={`cut-${s.moduleId}`} className="text-sm leading-5 text-muted">
                                <span className="font-semibold text-ink">{s.label}</span> — {s.reason}
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
}

/** A small "the companion is here" strip for the top of a studio page. */
export function CompanionBadge({ children }: { children: React.ReactNode }) {
    return (
        <p className="inline-flex items-center gap-2 rounded-full bg-create-soft px-3 py-1.5 text-xs font-semibold text-create-ink">
            <Sparkles size={13} aria-hidden="true" />
            {children}
        </p>
    );
}
