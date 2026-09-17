import { useState } from "react";
import { Link } from "react-router-dom";
import { Check, Clock, Gift, Heart, Sparkles, Wallet } from "lucide-react";
import { cn } from "@/lib/cn";
import { money, shortDate } from "@/lib/format";
import { useModule } from "@/state/data";
import { useSpace } from "@/state/space";
import { useToast } from "@/state/toast";
import { Confirm, Money, Notice, PageTitle, Section } from "@/components/shared";
import { Button, EmptyState, Field, Tag } from "@/components/ui/primitives";
import financeModule from "../module";
import { BASE, monthLabel, monthOf } from "../derive";
import { AmountField, FinanceNav, WishStatusTag } from "../components/pieces";
import { LockStrip, ReauthDialog, useMoneyGuard } from "../components/reauth";
import { WISH_STATUS_LABEL, type WishItem } from "../types";

/**
 * The one door into the family's money that a child has.
 *
 * A wish is not a shopping list: it is a child saying what they would like and
 * WHY, and a parent answering in words rather than in a status. So the answer
 * is what this screen is built around — the decision comment sits under the
 * item, in the parent's own voice, whether the answer was yes, not yet or no.
 *
 * Little and Junior get taps rather than typing (the brief's rule: no free
 * text under seven); a young adult gets the full form and, if a parent has set
 * one up, their envelope — money that is theirs, spent without asking, with
 * every line of it shown back to them.
 *
 * A parent lands here too: their own requests, and the way through to the
 * pipeline where everybody else's are decided.
 */

const THINGS: Array<{ label: string; emoji: string; cents: number; category: string }> = [
    { label: "A book", emoji: "📚", cents: 800, category: "education" },
    { label: "A toy", emoji: "🧸", cents: 1500, category: "fun" },
    { label: "Art things", emoji: "🖍️", cents: 1000, category: "other" },
    { label: "A game", emoji: "🎮", cents: 3000, category: "fun" },
    { label: "A treat", emoji: "🍪", cents: 400, category: "fun" },
    { label: "Something for my room", emoji: "🛏️", cents: 2000, category: "home" },
];

const REASONS = ["I've wanted it for ages.", "Mine is broken.", "It's for school.", "To share with everyone.", "I saved up for something like it."];

export default function WishPage() {
    const { state, repo, mutate, loading, error } = useModule(financeModule);
    const { me, role, today, space } = useSpace();
    const { toast } = useToast();
    const guard = useMoneyGuard(repo);
    const [withdrawing, setWithdrawing] = useState<WishItem | null>(null);

    if (loading && !state) return <p className="text-md text-muted">Just a moment…</p>;
    if (error) return <Notice tone="danger">{error}</Notice>;
    if (!state) return null;

    const parent = role === "parent";
    const guest = role === "guest";
    const mine = parent ? state.wishes.filter((w) => w.requestedBy === me.id) : state.mine.wishes;
    const envelope = state.mine.envelope;
    const little = me.ageBand === "little" || me.ageBand === "junior";

    if (guest) {
        return (
            <div>
                <PageTitle title="Not this part" sub="The family's money is theirs. Everything you have been invited to is on your own front page." area="live" />
                <EmptyState icon={<Heart size={20} aria-hidden="true" />} title="Nothing for you here" body="Trips, albums, the prayer wall and the events you were tagged in are all on your dashboard." action={<Link to="/" className="text-sm font-semibold text-brand underline underline-offset-4">Back to your page</Link>} />
            </div>
        );
    }

    const ask = async (input: { name: string; priceCents: number; reason: string; categoryId: string }) => {
        if (!input.name.trim()) return false;
        const ok = await guard.run(() => mutate((r) => r.createWish(input)));
        if (ok) toast(parent ? "Added to the pipeline." : "Sent. Mum and Dad will answer here.", "success");
        return ok;
    };

    return (
        <div>
            <PageTitle
                title={parent ? "My requests" : "Ask for something"}
                sub={
                    parent
                        ? "The things you have asked for yourself. Everyone else's are on the Purchases screen."
                        : "Tell Mum and Dad what you would like and why. They answer right here — and you will see what they said, not just a yes or a no."
                }
                area="live"
            />

            {parent && (
                <>
                    <FinanceNav />
                    <LockStrip repo={repo} onLock={() => undefined} />
                </>
            )}

            {/* -- The form ----------------------------------------------------- */}
            <Section title={little ? "What would you like?" : "A new request"}>{little ? <TapForm onAsk={ask} /> : <TypeForm onAsk={ask} threshold={state.settings.approvalThresholdCents} currency={space.currency} parent={parent} />}</Section>

            {/* -- Their own envelope ------------------------------------------- */}
            {envelope && (
                <Section title="My money">
                    <div className="rounded-xl bg-card p-5">
                        <div className="flex flex-wrap items-center gap-4">
                            <span className="grid size-12 shrink-0 place-items-center rounded-full bg-brand-soft text-brand">
                                <Wallet size={22} aria-hidden="true" />
                            </span>
                            <div className="min-w-0 flex-1">
                                <p className="font-display text-4xl leading-8">
                                    <Money cents={envelope.balanceCents} /> left
                                </p>
                                <p className="text-sm text-muted">
                                    <Money cents={envelope.monthlyAmountCents} /> a month
                                    {envelope.lastToppedUp === monthOf(today) ? ` · topped up for ${monthLabel(monthOf(today), false)}` : " · next top-up on the first"}
                                </p>
                            </div>
                        </div>
                        <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-track" role="progressbar" aria-valuenow={Math.round((envelope.balanceCents / Math.max(1, envelope.monthlyAmountCents)) * 100)} aria-valuemin={0} aria-valuemax={100} aria-label="How much is left in your envelope">
                            <span className="block h-full rounded-full bg-brand" style={{ width: `${Math.min(100, Math.round((envelope.balanceCents / Math.max(1, envelope.monthlyAmountCents)) * 100))}%` }} />
                        </div>
                        {envelope.note && <p className="mt-3 text-sm leading-6 text-muted">{envelope.note}</p>}

                        <SpendForm
                            max={envelope.balanceCents}
                            currency={space.currency}
                            onSpend={async (amountCents, note) => {
                                const ok = await guard.run(() => mutate((r) => r.spendFromEnvelope(envelope.id, { amountCents, note })));
                                if (ok) toast("Written down. It comes off your balance.", "success");
                                return ok;
                            }}
                        />

                        {state.mine.envelopeEntries.length > 0 && (
                            <ul className="mt-4 grid gap-1.5 border-t border-line pt-4">
                                {state.mine.envelopeEntries.slice(0, 6).map((e) => (
                                    <li key={e.id} className="flex items-center justify-between gap-3 text-sm">
                                        <span className="min-w-0 truncate">{e.payee || e.note || "Something"}</span>
                                        <span className="shrink-0 text-caption">{shortDate(e.date)}</span>
                                        <Money cents={e.amountHomeCents} className="shrink-0 font-semibold" />
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </Section>
            )}

            {/* -- What I asked for --------------------------------------------- */}
            <Section title={parent ? "What I've asked for" : "What I've asked for"}>
                {mine.length === 0 ? (
                    <EmptyState icon={<Sparkles size={20} aria-hidden="true" />} title="Nothing asked for yet" body={parent ? "Anything you add above lands in the pipeline with everyone else's." : "When you ask for something it will sit here until Mum or Dad answers."} />
                ) : (
                    <ul className="grid grid-cols-[minmax(0,1fr)] gap-3 md:grid-cols-2">
                        {mine.map((w) => (
                            <li key={w.id} className={cn("rounded-xl p-4", w.status === "approved" || w.status === "planned" || w.status === "bought" ? "bg-mint-soft" : w.status === "declined" ? "bg-page" : "bg-card")}>
                                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                                    <h3 className="text-base font-semibold">{w.name}</h3>
                                    <Money cents={w.priceCents} className="text-base font-semibold" />
                                </div>
                                <p className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-caption">
                                    <WishStatusTag status={w.status} />
                                    <span>asked {shortDate(w.createdAt)}</span>
                                    {w.plannedMonth && <Tag tone="neutral">{monthLabel(w.plannedMonth)}</Tag>}
                                </p>
                                {w.reason && <p className="mt-2 text-sm leading-6 text-muted">&ldquo;{w.reason}&rdquo;</p>}
                                {w.decisionComment ? (
                                    <p className="mt-3 flex items-start gap-2 rounded-md bg-white/70 px-3 py-2 text-sm leading-6">
                                        <Heart size={14} className="mt-1 shrink-0 text-brand" aria-hidden="true" />
                                        <span>
                                            <strong className="font-semibold">{parent ? "The answer:" : "They said:"}</strong> {w.decisionComment}
                                        </span>
                                    </p>
                                ) : (
                                    <p className="mt-3 flex items-center gap-2 text-sm text-muted">
                                        {w.status === "requested" ? (
                                            <>
                                                <Clock size={14} aria-hidden="true" /> {WISH_STATUS_LABEL[w.status]}
                                            </>
                                        ) : (
                                            <>
                                                <Check size={14} aria-hidden="true" /> {WISH_STATUS_LABEL[w.status]}
                                            </>
                                        )}
                                    </p>
                                )}
                                {w.status === "requested" && (
                                    <button type="button" onClick={() => setWithdrawing(w)} className="mt-3 text-xs text-caption underline-offset-4 hover:text-danger-ink hover:underline">
                                        Never mind, take it back
                                    </button>
                                )}
                            </li>
                        ))}
                    </ul>
                )}
            </Section>

            {parent && (
                <p className="mt-8 text-sm text-muted">
                    Everyone else&rsquo;s requests, the approvals and the envelopes live on{" "}
                    <Link to={`${BASE}/purchases`} className="font-semibold text-brand underline underline-offset-4">
                        Purchases
                    </Link>
                    .
                </p>
            )}

            {!parent && (
                <div className="mt-8 flex items-start gap-2 rounded-md bg-page px-4 py-3 text-xs leading-5 text-caption">
                    <Gift size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
                    <span>This is the only money screen you can open. The family budget, the bills and what everyone else asked for stay with your parents — that is not about you, it is just whose job it is.</span>
                </div>
            )}

            <Confirm
                open={Boolean(withdrawing)}
                title={withdrawing ? `Take back "${withdrawing.name}"?` : ""}
                body="It disappears from the list. You can always ask again."
                confirmLabel="Take it back"
                danger
                onConfirm={async () => {
                    if (!withdrawing) return;
                    const ok = await guard.run(() => mutate((r) => r.removeWish(withdrawing.id)));
                    if (ok) toast("Taken back.");
                }}
                onClose={() => setWithdrawing(null)}
            />

            {parent && <ReauthDialog open={guard.asking} busy={guard.busy} onConfirm={guard.confirm} onClose={guard.cancel} />}
        </div>
    );
}

// ---------------------------------------------------------------------------
// The two forms
// ---------------------------------------------------------------------------

/** Little and Junior: taps, never typing. */
function TapForm({ onAsk }: { onAsk: (input: { name: string; priceCents: number; reason: string; categoryId: string }) => Promise<boolean> }) {
    const [thing, setThing] = useState<(typeof THINGS)[number] | null>(null);
    const [reason, setReason] = useState("");
    const [busy, setBusy] = useState(false);

    return (
        <div className="rounded-xl bg-card p-5">
            <fieldset>
                <legend className="mb-3 text-md font-semibold">Pick the sort of thing</legend>
                <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {THINGS.map((t) => (
                        <li key={t.label}>
                            <button
                                type="button"
                                aria-pressed={thing?.label === t.label}
                                onClick={() => setThing(t)}
                                className={cn("flex w-full flex-col items-center gap-1.5 rounded-lg border px-3 py-4 text-md font-semibold", thing?.label === t.label ? "border-brand bg-brand-soft text-brand-ink" : "border-line-strong hover:border-ink")}
                            >
                                <span aria-hidden="true" className="text-5xl leading-none">
                                    {t.emoji}
                                </span>
                                {t.label}
                            </button>
                        </li>
                    ))}
                </ul>
            </fieldset>

            {thing && (
                <fieldset className="mt-5">
                    <legend className="mb-3 text-md font-semibold">Why?</legend>
                    <ul className="flex flex-wrap gap-2">
                        {REASONS.map((r) => (
                            <li key={r}>
                                <button
                                    type="button"
                                    aria-pressed={reason === r}
                                    onClick={() => setReason(r)}
                                    className={cn("rounded-full border px-3.5 py-2 text-sm", reason === r ? "border-brand bg-brand-soft text-brand-ink" : "border-line-strong text-muted hover:border-ink")}
                                >
                                    {r}
                                </button>
                            </li>
                        ))}
                    </ul>
                </fieldset>
            )}

            <Button
                className="mt-5"
                block
                loading={busy}
                disabled={!thing}
                onClick={async () => {
                    if (!thing) return;
                    setBusy(true);
                    try {
                        const ok = await onAsk({ name: thing.label, priceCents: thing.cents, reason, categoryId: thing.category });
                        if (ok) {
                            setThing(null);
                            setReason("");
                        }
                    } finally {
                        setBusy(false);
                    }
                }}
            >
                Ask Mum and Dad
            </Button>
        </div>
    );
}

/** Teen, young adult and parents: a real, short form. */
function TypeForm({ onAsk, threshold, currency, parent }: { onAsk: (input: { name: string; priceCents: number; reason: string; categoryId: string }) => Promise<boolean>; threshold: number; currency: string; parent: boolean }) {
    const [name, setName] = useState("");
    const [price, setPrice] = useState(0);
    const [reason, setReason] = useState("");
    const [busy, setBusy] = useState(false);

    return (
        <form
            className="rounded-xl bg-card p-5"
            onSubmit={async (e) => {
                e.preventDefault();
                if (!name.trim()) return;
                setBusy(true);
                try {
                    const ok = await onAsk({ name, priceCents: price, reason, categoryId: "other" });
                    if (ok) {
                        setName("");
                        setPrice(0);
                        setReason("");
                    }
                } finally {
                    setBusy(false);
                }
            }}
        >
            <div className="grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-2">
                <Field label="What is it" value={name} onChange={(e) => setName(e.target.value)} placeholder="A laptop for my coursework" required />
                <AmountField id="wish-amount" label="Roughly how much" value={price} onChange={setPrice} hint={price > threshold ? `Over ${money(threshold, currency)} — both parents will need to say yes.` : undefined} />
            </div>
            <Field label="Why it matters" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Coursework is all online now and the family iPad won't open the simulations." className="mt-4" hint="The reason is what gets read first." />
            <Button type="submit" className="mt-4" loading={busy} disabled={!name.trim()}>
                {parent ? "Add it to the pipeline" : "Send it"}
            </Button>
        </form>
    );
}

function SpendForm({ max, currency, onSpend }: { max: number; currency: string; onSpend: (cents: number, note: string) => Promise<boolean> }) {
    const [amount, setAmount] = useState(0);
    const [note, setNote] = useState("");
    const [busy, setBusy] = useState(false);
    const tooMuch = amount > max;

    return (
        <form
            className="mt-4 border-t border-line pt-4"
            onSubmit={async (e) => {
                e.preventDefault();
                if (!amount || tooMuch) return;
                setBusy(true);
                try {
                    const ok = await onSpend(amount, note);
                    if (ok) {
                        setAmount(0);
                        setNote("");
                    }
                } finally {
                    setBusy(false);
                }
            }}
        >
            <p className="mb-3 text-sm font-semibold">Spent some of it?</p>
            <div className="grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-2">
                <Field label="On what" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Bubble tea with Amara" required />
                <AmountField id="env-spend" label="How much" value={amount} onChange={setAmount} hint={tooMuch ? `That is more than the ${money(max, currency)} you have left.` : undefined} />
            </div>
            <Button type="submit" variant="outline" className="mt-4" loading={busy} disabled={!amount || tooMuch || !note.trim()}>
                Write it down
            </Button>
        </form>
    );
}
