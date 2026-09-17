import { useMemo, useState } from "react";
import { Check, Plus, ShoppingBag, Sparkles, Users, Wallet } from "lucide-react";
import { cn } from "@/lib/cn";
import { money, shortDate } from "@/lib/format";
import { useModule } from "@/state/data";
import { useSpace } from "@/state/space";
import { useToast } from "@/state/toast";
import { Confirm, MemberAvatar, MemberPicker, Money, Notice, PageTitle, Section, Stat, useMember } from "@/components/shared";
import { Dialog } from "@/components/ui/overlay";
import { Button, EmptyState, Field, Tag } from "@/components/ui/primitives";
import financeModule from "../module";
import { addMonths, approvalsFor, buyTasksFor, monthLabel, monthOf, openWishTotal, requiredApprovals, wishesByStatus } from "../derive";
import { AmountField, CategorySelect, FinanceNav, MoneyIsPrivate, WishStatusTag, WishThumb } from "../components/pieces";
import { LockStrip, ReauthDialog, useMoneyGuard } from "../components/reauth";
import type { Envelope, FinanceState, NewWish, WishDecision, WishDecisionResult, WishItem } from "../types";

/**
 * The purchase pipeline: how a want becomes a decision, and a decision becomes
 * money.
 *
 * Nothing here spends itself. A wish is asked for by anyone in the family —
 * a nine-year-old asking for Mario Kart uses the same table as a fridge — and
 * it moves only when a parent decides, with their name and their words on the
 * decision. Above the family's threshold it takes BOTH parents, and the second
 * yes is what tips it: approving creates the job ("Buy the laptop") for a real
 * person, and marking that job bought is the only thing on this screen that
 * writes a ledger entry.
 *
 * The envelopes at the foot are the young-adult version of the same idea:
 * money that is genuinely theirs, spent without asking, seen by them.
 */

const DECISION_LABEL: Record<WishDecision, string> = { approve: "Yes", defer: "Not yet", decline: "No" };

export default function PurchasesPage() {
    const { state, repo, mutate, loading, error } = useModule(financeModule);
    const { members, me, today, space } = useSpace();
    const { toast } = useToast();
    const guard = useMoneyGuard(repo);
    const [deciding, setDeciding] = useState<WishItem | null>(null);
    const [buying, setBuying] = useState<WishItem | null>(null);
    const [adding, setAdding] = useState(false);
    const [removing, setRemoving] = useState<WishItem | null>(null);
    const [envelopeOpen, setEnvelopeOpen] = useState(false);
    const [removingEnvelope, setRemovingEnvelope] = useState<Envelope | null>(null);
    const [thresholdOpen, setThresholdOpen] = useState(false);
    const [tick, setTick] = useState(0);

    const lists = useMemo(() => {
        if (!state?.visible) return null;
        return {
            waiting: wishesByStatus(state, "requested"),
            moving: [...wishesByStatus(state, "approved"), ...wishesByStatus(state, "planned")],
            parked: [...wishesByStatus(state, "deferred"), ...wishesByStatus(state, "declined")],
            done: wishesByStatus(state, "bought"),
        };
    }, [state]);

    if (loading && !state) return <p className="text-md text-muted">Opening the pipeline…</p>;
    if (error) return <Notice tone="danger">{error}</Notice>;
    if (!state || !lists) return null;
    if (!state.visible) return <MoneyIsPrivate mine={state.mine.wishes.length} />;

    const jobs = buyTasksFor(state);

    const decide = async (wish: WishItem, decision: WishDecision, comment: string, plannedMonth: string | null) => {
        // A box rather than a plain `let`: the write happens inside a callback,
        // and this keeps the result's type honest on the way out.
        const box: { res: WishDecisionResult | null } = { res: null };
        const ok = await guard.run(() =>
            mutate(async (r) => {
                box.res = await r.decideWish(wish.id, decision, comment, plannedMonth);
            }),
        );
        const res = box.res;
        if (!ok || !res) return false;
        if (decision === "approve" && res.status !== "approved") {
            toast(`Your yes is in — ${wish.name} needs ${res.required - res.approvals} more parent above ${money(state.settings.approvalThresholdCents, space.currency)}.`);
        } else if (decision === "approve") {
            toast(res.buyTaskTitle ? `Approved — "${res.buyTaskTitle}" is now a job for someone.` : `${wish.name} approved.`, "success");
        } else if (decision === "defer") {
            toast(`${wish.name} put off${plannedMonth ? ` until ${monthLabel(plannedMonth)}` : ""}.`);
        } else {
            toast(`${wish.name} declined — with your reason attached, so it isn't a mystery.`);
        }
        return true;
    };

    const card = (w: WishItem) => {
        const given = approvalsFor(state, w.id);
        const need = requiredApprovals(state, w);
        const requester = members.find((m) => m.id === w.requestedBy);
        const job = state.buyTasks.find((t) => t.wishId === w.id);
        const notes = state.approvals.filter((a) => a.wishId === w.id && a.comment).sort((a, b) => b.at.localeCompare(a.at));
        return (
            <li key={w.id} className="rounded-xl bg-card p-4">
                <div className="flex items-start gap-3">
                    <WishThumb wish={w} />
                    <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                            <h3 className="text-base font-semibold">{w.name}</h3>
                            <Money cents={w.priceCents} className="text-base font-semibold" />
                        </div>
                        <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-caption">
                            <WishStatusTag status={w.status} />
                            {requester && (
                                <span className="inline-flex items-center gap-1.5">
                                    <MemberAvatar memberId={requester.id} size="xs" /> {requester.name.split(" ")[0]} asked
                                </span>
                            )}
                            <span>· {shortDate(w.createdAt)}</span>
                            {w.priority === "high" && <Tag tone="warn">Urgent</Tag>}
                            {w.plannedMonth && <Tag tone="neutral">{monthLabel(w.plannedMonth)}</Tag>}
                        </p>
                        {w.reason && <p className="mt-2 text-sm leading-6 text-muted">&ldquo;{w.reason}&rdquo;</p>}

                        {w.status === "requested" && (
                            <div className="mt-3 rounded-md bg-page p-3">
                                <p className="text-xs font-semibold uppercase tracking-[0.06em] text-caption">
                                    {need === 2 ? `Over ${money(state.settings.approvalThresholdCents, space.currency)} — both parents` : "One parent is enough"}
                                </p>
                                <p className="mt-1.5 flex flex-wrap items-center gap-2 text-sm">
                                    {members
                                        .filter((m) => m.role === "parent")
                                        .map((p) => (
                                            <span key={p.id} className={cn("inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-xs", given.includes(p.id) ? "bg-mint-soft text-mint" : "bg-card text-caption")}>
                                                <MemberAvatar memberId={p.id} size="xs" />
                                                {p.name.split(" ")[0]} {given.includes(p.id) ? "· yes" : "· waiting"}
                                            </span>
                                        ))}
                                    <span className="text-xs text-caption">
                                        {given.length} of {need}
                                    </span>
                                </p>
                            </div>
                        )}

                        {notes.length > 0 && (
                            <ul className="mt-3 grid gap-1.5">
                                {notes.slice(0, 2).map((a) => (
                                    <li key={a.id} className="flex items-start gap-2 text-xs leading-5 text-muted">
                                        <MemberAvatar memberId={a.parentMemberId} size="xs" className="mt-0.5 shrink-0" />
                                        <span>
                                            <strong className="font-semibold text-ink">{DECISION_LABEL[a.decision]}</strong> — {a.comment}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        )}

                        {job && !job.done && (
                            <p className="mt-3 flex flex-wrap items-center gap-2 rounded-md bg-brand-soft px-3 py-2 text-xs text-brand-ink">
                                <ShoppingBag size={14} aria-hidden="true" />
                                <span className="font-semibold">{job.title}</span>
                                <span>· due {shortDate(job.dueDate)} ·</span>
                                <span className="inline-flex items-center gap-1.5">
                                    <MemberAvatar memberId={job.assigneeMemberId} size="xs" /> {members.find((m) => m.id === job.assigneeMemberId)?.name.split(" ")[0]}
                                </span>
                            </p>
                        )}

                        {w.status === "bought" && w.boughtAt && (
                            <p className="mt-3 flex items-center gap-2 text-xs text-mint">
                                <Check size={14} aria-hidden="true" /> Bought {shortDate(w.boughtAt)} and written to the ledger.
                            </p>
                        )}

                        <div className="mt-3 flex flex-wrap items-center gap-2">
                            {w.status !== "bought" && (
                                <Button size="sm" variant={w.status === "requested" ? "brand" : "outline"} onClick={() => setDeciding(w)}>
                                    {w.status === "requested" ? "Decide" : "Change the decision"}
                                </Button>
                            )}
                            {(w.status === "approved" || w.status === "planned") && (
                                <Button size="sm" variant="outline" onClick={() => setBuying(w)}>
                                    Mark bought
                                </Button>
                            )}
                            {w.link && (
                                <a href={w.link} target="_blank" rel="noreferrer" className="text-xs font-semibold text-brand underline-offset-4 hover:underline">
                                    The link
                                </a>
                            )}
                            <button type="button" onClick={() => setRemoving(w)} className="text-xs text-caption underline-offset-4 hover:text-danger-ink hover:underline">
                                Remove
                            </button>
                        </div>
                    </div>
                </div>
            </li>
        );
    };

    return (
        <div>
            <PageTitle
                title="Purchases"
                sub="Everything anyone has asked for, and where it got to. A decision has a name and a reason on it; only 'bought' spends money."
                area="live"
                actions={
                    <Button onClick={() => setAdding(true)}>
                        <Plus size={16} aria-hidden="true" /> Add a request
                    </Button>
                }
            />

            <FinanceNav />
            <LockStrip repo={repo} onLock={() => setTick(tick + 1)} />

            <div className="mb-8 mt-5 grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-3">
                <Stat label="Waiting on us" value={lists.waiting.length} sub={`${money(lists.waiting.reduce((t, w) => t + w.priceCents, 0), space.currency)} asked for`} tone={lists.waiting.length ? "warn" : "neutral"} />
                <Stat label="Said yes to" value={<Money cents={openWishTotal(state)} />} sub={`${lists.moving.length} still to buy`} />
                <Stat label="Both parents above" value={<Money cents={state.settings.approvalThresholdCents} />} sub="the family's threshold" tone="live" />
            </div>

            <div className="mb-8 flex flex-wrap items-center gap-3 rounded-md bg-card px-4 py-3 text-sm text-muted">
                <Users size={16} className="shrink-0" aria-hidden="true" />
                <span className="min-w-0 flex-1">
                    Anything over <strong className="font-semibold text-ink">{money(state.settings.approvalThresholdCents, space.currency)}</strong> needs both parents. {state.settings.note}
                </span>
                <button type="button" onClick={() => setThresholdOpen(true)} className="font-semibold text-brand underline-offset-4 hover:underline">
                    Change
                </button>
            </div>

            {jobs.length > 0 && (
                <Section title="To buy">
                    <ul className="grid gap-2">
                        {jobs.map((t) => {
                            const w = state.wishes.find((x) => x.id === t.wishId);
                            return (
                                <li key={t.id} className="flex flex-wrap items-center gap-3 rounded-lg bg-card px-4 py-3">
                                    <span className="grid size-9 shrink-0 place-items-center rounded-full bg-brand-soft text-brand">
                                        <ShoppingBag size={16} aria-hidden="true" />
                                    </span>
                                    <span className="min-w-0 flex-1">
                                        <span className="block truncate text-md font-medium">{t.title}</span>
                                        <span className="block text-xs text-caption">Due {shortDate(t.dueDate)}</span>
                                    </span>
                                    <label className="flex items-center gap-2 text-xs text-caption">
                                        <span className="sr-only">Who is buying {t.title}</span>
                                        <select
                                            value={t.assigneeMemberId}
                                            onChange={(e) => void guard.run(() => mutate((r) => r.setWishAssignee(t.wishId, e.target.value)))}
                                            className="h-9 rounded-sm border border-line-strong bg-card px-2 text-sm outline-none focus:border-brand"
                                        >
                                            {members
                                                .filter((m) => m.role !== "guest")
                                                .map((m) => (
                                                    <option key={m.id} value={m.id}>
                                                        {m.name.split(" ")[0]}
                                                    </option>
                                                ))}
                                        </select>
                                    </label>
                                    {w && (
                                        <Button size="sm" onClick={() => setBuying(w)}>
                                            Bought it
                                        </Button>
                                    )}
                                </li>
                            );
                        })}
                    </ul>
                </Section>
            )}

            <Section title="Waiting on a decision">
                {lists.waiting.length === 0 ? (
                    <EmptyState icon={<Sparkles size={20} aria-hidden="true" />} title="Nothing waiting" body="Every request has an answer. The children can add one from their own screen at any time." />
                ) : (
                    <ul className="grid grid-cols-[minmax(0,1fr)] gap-3 md:grid-cols-2">{lists.waiting.map(card)}</ul>
                )}
            </Section>

            {lists.moving.length > 0 && (
                <Section title="Said yes to">
                    <ul className="grid grid-cols-[minmax(0,1fr)] gap-3 md:grid-cols-2">{lists.moving.map(card)}</ul>
                </Section>
            )}

            {lists.parked.length > 0 && (
                <Section title="Not now">
                    <ul className="grid grid-cols-[minmax(0,1fr)] gap-3 md:grid-cols-2">{lists.parked.map(card)}</ul>
                </Section>
            )}

            {lists.done.length > 0 && (
                <Section title="Bought">
                    <ul className="grid grid-cols-[minmax(0,1fr)] gap-3 md:grid-cols-2">{lists.done.map(card)}</ul>
                </Section>
            )}

            {/* -- Envelopes ---------------------------------------------------- */}
            <Section
                title="Personal envelopes"
                action={
                    <Button size="md" variant="outline" onClick={() => setEnvelopeOpen(true)}>
                        <Plus size={15} aria-hidden="true" /> Set one up
                    </Button>
                }
            >
                <p className="mb-3 text-sm text-muted">Money that is genuinely theirs: topped up on the first, spent without asking, and visible only to them and to you.</p>
                {state.envelopes.length === 0 ? (
                    <EmptyState icon={<Wallet size={20} aria-hidden="true" />} title="No envelopes yet" body="A young adult with their own money learns more than one who has to ask every time." />
                ) : (
                    <ul className="grid grid-cols-[minmax(0,1fr)] gap-3 md:grid-cols-2">
                        {state.envelopes.map((env) => (
                            <EnvelopeCard
                                key={env.id}
                                envelope={env}
                                state={state}
                                today={today}
                                onTopUp={async () => {
                                    const ok = await guard.run(() => mutate((r) => r.topUpEnvelope(env.id, monthOf(today))));
                                    if (ok) toast("Topped up for the month.", "success");
                                }}
                                onRemove={() => setRemovingEnvelope(env)}
                            />
                        ))}
                    </ul>
                )}
            </Section>

            {/* -- Dialogs ------------------------------------------------------ */}
            <DecideDialog wish={deciding} state={state} meId={me.id} onClose={() => setDeciding(null)} onDecide={decide} />

            <BoughtDialog
                wish={buying}
                state={state}
                onClose={() => setBuying(null)}
                onSave={async (input) => {
                    if (!buying) return false;
                    const ok = await guard.run(() => mutate((r) => r.markWishBought(buying.id, input)));
                    if (ok) toast(`${buying.name} is on the ledger — ${money(input.amountCents, space.currency)} — and the request is closed.`, "success");
                    return ok;
                }}
            />

            <RequestDialog
                open={adding}
                state={state}
                onClose={() => setAdding(false)}
                onSave={async (input) => {
                    const ok = await guard.run(() => mutate((r) => r.createWish(input)));
                    if (ok) toast("Added to the pipeline.", "success");
                    return ok;
                }}
            />

            <EnvelopeDialog
                open={envelopeOpen}
                state={state}
                onClose={() => setEnvelopeOpen(false)}
                onSave={async (memberId, cents) => {
                    const ok = await guard.run(() => mutate((r) => r.setEnvelope(memberId, cents)));
                    if (ok) toast(`${money(cents, space.currency)} a month set.`, "success");
                    return ok;
                }}
            />

            <ThresholdDialog
                open={thresholdOpen}
                state={state}
                onClose={() => setThresholdOpen(false)}
                onSave={async (cents, note) => {
                    const ok = await guard.run(() => mutate((r) => r.updateSettings({ approvalThresholdCents: cents, note })));
                    if (ok) toast(`Both of you now decide anything over ${money(cents, space.currency)}.`, "success");
                    return ok;
                }}
            />

            <Confirm
                open={Boolean(removing)}
                title={removing ? `Remove "${removing.name}"?` : ""}
                body="The request and its decisions go. Anything already bought stays on the ledger."
                confirmLabel="Remove it"
                danger
                onConfirm={async () => {
                    if (!removing) return;
                    const ok = await guard.run(() => mutate((r) => r.removeWish(removing.id)));
                    if (ok) toast("Removed.");
                }}
                onClose={() => setRemoving(null)}
            />

            <Confirm
                open={Boolean(removingEnvelope)}
                title="Close this envelope?"
                body="What has already been spent stays on the ledger; the monthly top-up stops."
                confirmLabel="Close it"
                danger
                onConfirm={async () => {
                    if (!removingEnvelope) return;
                    const ok = await guard.run(() => mutate((r) => r.removeEnvelope(removingEnvelope.id)));
                    if (ok) toast("Closed.");
                }}
                onClose={() => setRemovingEnvelope(null)}
            />

            <ReauthDialog open={guard.asking} busy={guard.busy} onConfirm={guard.confirm} onClose={guard.cancel} />
        </div>
    );
}

// ---------------------------------------------------------------------------
// Pieces
// ---------------------------------------------------------------------------

function EnvelopeCard({ envelope, state, today, onTopUp, onRemove }: { envelope: Envelope; state: FinanceState; today: string; onTopUp: () => void; onRemove: () => void }) {
    const member = useMember(envelope.memberId);
    const spent = state.entries.filter((e) => e.envelopeId === envelope.id && e.date.startsWith(monthOf(today)));
    const toppedThisMonth = envelope.lastToppedUp === monthOf(today);
    const p = envelope.monthlyAmountCents > 0 ? Math.round((envelope.balanceCents / envelope.monthlyAmountCents) * 100) : 0;
    return (
        <li className="rounded-xl bg-card p-4">
            <div className="flex items-center gap-3">
                <MemberAvatar memberId={envelope.memberId} size="md" />
                <div className="min-w-0 flex-1">
                    <p className="text-base font-semibold">{member?.name ?? "A member"}</p>
                    <p className="text-sm text-muted">
                        <Money cents={envelope.balanceCents} /> left of <Money cents={envelope.monthlyAmountCents} /> a month
                    </p>
                </div>
            </div>
            <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-track" role="progressbar" aria-valuenow={p} aria-valuemin={0} aria-valuemax={100} aria-label={`${member?.name ?? "Envelope"}: ${p}% left`}>
                <span className="block h-full rounded-full bg-brand" style={{ width: `${Math.min(100, Math.max(0, p))}%` }} />
            </div>
            {envelope.note && <p className="mt-2 text-xs leading-5 text-caption">{envelope.note}</p>}
            {spent.length > 0 && (
                <ul className="mt-3 grid gap-1">
                    {spent.slice(0, 3).map((e) => (
                        <li key={e.id} className="flex items-center justify-between gap-2 text-xs text-muted">
                            <span className="truncate">{e.payee || e.note}</span>
                            <Money cents={e.amountHomeCents} className="shrink-0 text-caption" />
                        </li>
                    ))}
                </ul>
            )}
            <div className="mt-3 flex flex-wrap items-center gap-2">
                <Button size="sm" variant="outline" onClick={onTopUp} disabled={toppedThisMonth}>
                    {toppedThisMonth ? `Topped up for ${monthLabel(monthOf(today), false)}` : "Top up this month"}
                </Button>
                <button type="button" onClick={onRemove} className="text-xs text-caption underline-offset-4 hover:text-danger-ink hover:underline">
                    Close
                </button>
            </div>
        </li>
    );
}

function DecideDialog({
    wish,
    state,
    meId,
    onClose,
    onDecide,
}: {
    wish: WishItem | null;
    state: FinanceState;
    meId: string;
    onClose: () => void;
    onDecide: (wish: WishItem, decision: WishDecision, comment: string, plannedMonth: string | null) => Promise<boolean>;
}) {
    const { today } = useSpace();
    const [decision, setDecision] = useState<WishDecision>("approve");
    const [comment, setComment] = useState("");
    const [plannedMonth, setPlanned] = useState("");
    const [busy, setBusy] = useState(false);
    const [seeded, setSeeded] = useState<string | null>(null);

    const key = wish?.id ?? null;
    if (key !== seeded) {
        setSeeded(key);
        setDecision("approve");
        setComment("");
        setPlanned("");
    }

    if (!wish) return null;

    const given = approvalsFor(state, wish.id);
    const need = requiredApprovals(state, wish);
    const mineIn = given.includes(meId);
    const months = [1, 2, 3, 4, 5, 6].map((n) => addMonths(monthOf(today), n));

    return (
        <Dialog open={Boolean(wish)} onClose={onClose} title={wish.name}>
            <form
                onSubmit={async (e) => {
                    e.preventDefault();
                    setBusy(true);
                    try {
                        const ok = await onDecide(wish, decision, comment, decision === "defer" ? plannedMonth || null : null);
                        if (ok) onClose();
                    } finally {
                        setBusy(false);
                    }
                }}
            >
                <p className="text-md leading-6 text-muted">
                    <Money cents={wish.priceCents} className="font-semibold text-ink" /> ·{" "}
                    {need === 2 ? (
                        <>
                            over the family&rsquo;s {money(state.settings.approvalThresholdCents, state.settings.currency)} line, so it needs both of you — {given.length} of 2 so far{mineIn ? ", including yours" : ""}.
                        </>
                    ) : (
                        <>one parent is enough for this one.</>
                    )}
                </p>

                <fieldset className="mt-4">
                    <legend className="mb-2 text-xs font-medium uppercase tracking-[0.06em] text-muted">Your answer</legend>
                    <div className="grid grid-cols-3 gap-2" role="radiogroup">
                        {(["approve", "defer", "decline"] as WishDecision[]).map((d) => (
                            <button
                                key={d}
                                type="button"
                                role="radio"
                                aria-checked={decision === d}
                                onClick={() => setDecision(d)}
                                className={cn("rounded-sm border px-3 py-2.5 text-sm font-semibold", decision === d ? "border-brand bg-brand-soft text-brand-ink" : "border-line-strong text-muted hover:border-ink")}
                            >
                                {DECISION_LABEL[d]}
                            </button>
                        ))}
                    </div>
                </fieldset>

                {decision === "defer" && (
                    <label htmlFor="wish-month" className="mt-4 block">
                        <span className="mb-1.5 block text-xs font-medium uppercase tracking-[0.06em] text-muted">Look at it again in</span>
                        <select id="wish-month" value={plannedMonth} onChange={(e) => setPlanned(e.target.value)} className="h-11 w-full rounded-sm border border-line-strong bg-card px-3 text-md outline-none focus:border-brand">
                            <option value="">No date yet</option>
                            {months.map((m) => (
                                <option key={m} value={m}>
                                    {monthLabel(m)}
                                </option>
                            ))}
                        </select>
                    </label>
                )}

                <Field
                    label="In your own words"
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder={decision === "approve" ? "Yes — it comes out of the education line." : decision === "defer" ? "After the Lagos flights." : "The one we have still works."}
                    hint="Whoever asked will read this. A reason is kinder than a status."
                    className="mt-4"
                />

                <div className="mt-5 flex justify-end gap-2">
                    <Button type="button" variant="ghost" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button type="submit" loading={busy}>
                        {decision === "approve" ? (need === 2 && given.length + (mineIn ? 0 : 1) < 2 ? "Add my yes" : "Approve it") : decision === "defer" ? "Put it off" : "Decline it"}
                    </Button>
                </div>
            </form>
        </Dialog>
    );
}

function BoughtDialog({ wish, state, onClose, onSave }: { wish: WishItem | null; state: FinanceState; onClose: () => void; onSave: (input: { amountCents: number; accountId: string; date?: string; note?: string }) => Promise<boolean> }) {
    const { today } = useSpace();
    const [amount, setAmount] = useState(0);
    const [accountId, setAccount] = useState(state.accounts[0]?.id ?? "");
    const [date, setDate] = useState(today);
    const [note, setNote] = useState("");
    const [busy, setBusy] = useState(false);
    const [seeded, setSeeded] = useState<string | null>(null);

    const key = wish?.id ?? null;
    if (key !== seeded) {
        setSeeded(key);
        setAmount(wish?.priceCents ?? 0);
        setAccount(state.accounts[0]?.id ?? "");
        setDate(today);
        setNote("");
    }

    return (
        <Dialog open={Boolean(wish)} onClose={onClose} title={wish ? `Bought: ${wish.name}` : ""}>
            {wish && (
                <form
                    onSubmit={async (e) => {
                        e.preventDefault();
                        if (!amount) return;
                        setBusy(true);
                        try {
                            const ok = await onSave({ amountCents: amount, accountId, date, note });
                            if (ok) onClose();
                        } finally {
                            setBusy(false);
                        }
                    }}
                >
                    <p className="text-sm leading-6 text-muted">
                        This writes the entry to the ledger under {state.budgets.find((c) => c.id === wish.categoryId)?.name ?? "Everything else"} and closes the request. Change the amount if the real price was not the estimate.
                    </p>
                    <div className="mt-4 grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-2">
                        <AmountField id="bought-amount" label="What it actually cost" value={amount} onChange={setAmount} required />
                        <Field label="When" type="date" value={date} max={today} onChange={(e) => setDate(e.target.value)} />
                        <label htmlFor="bought-account" className="block">
                            <span className="mb-1.5 block text-xs font-medium uppercase tracking-[0.06em] text-muted">Paid from</span>
                            <select id="bought-account" value={accountId} onChange={(e) => setAccount(e.target.value)} className="h-11 w-full rounded-sm border border-line-strong bg-card px-3 text-md outline-none focus:border-brand">
                                {state.accounts.map((a) => (
                                    <option key={a.id} value={a.id}>
                                        {a.name}
                                    </option>
                                ))}
                            </select>
                        </label>
                        <Field label="Note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Currys, click and collect" />
                    </div>
                    <div className="mt-5 flex justify-end gap-2">
                        <Button type="button" variant="ghost" onClick={onClose}>
                            Cancel
                        </Button>
                        <Button type="submit" loading={busy} disabled={!amount}>
                            Write it to the ledger
                        </Button>
                    </div>
                </form>
            )}
        </Dialog>
    );
}

function RequestDialog({ open, state, onClose, onSave }: { open: boolean; state: FinanceState; onClose: () => void; onSave: (input: NewWish) => Promise<boolean> }) {
    const [name, setName] = useState("");
    const [price, setPrice] = useState(0);
    const [categoryId, setCategory] = useState("other");
    const [requestedBy, setRequestedBy] = useState<string | null>(null);
    const [reason, setReason] = useState("");
    const [link, setLink] = useState("");
    const [busy, setBusy] = useState(false);

    return (
        <Dialog open={open} onClose={onClose} title="Add a request" wide>
            <form
                onSubmit={async (e) => {
                    e.preventDefault();
                    if (!name.trim()) return;
                    setBusy(true);
                    try {
                        const ok = await onSave({ name, priceCents: price, categoryId, reason, link, requestedBy: requestedBy ?? undefined, priority: price > state.settings.approvalThresholdCents ? "high" : "normal" });
                        if (ok) {
                            setName("");
                            setPrice(0);
                            setReason("");
                            setLink("");
                            onClose();
                        }
                    } finally {
                        setBusy(false);
                    }
                }}
            >
                <div className="grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-2">
                    <Field label="What is it" value={name} onChange={(e) => setName(e.target.value)} placeholder="A new washing machine" required />
                    <AmountField id="wish-price" label="About how much" value={price} onChange={setPrice} hint={price > state.settings.approvalThresholdCents ? "Above the line — it will need both parents." : undefined} />
                    <CategorySelect id="wish-cat" value={categoryId} onChange={setCategory} state={state} />
                    <MemberPicker label="Who is asking" value={requestedBy} onChange={setRequestedBy} allowFamily />
                </div>
                <Field label="Why" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="The drum bearing has gone." className="mt-4" />
                <Field label="A link, if there is one" value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://" className="mt-4" />
                <div className="mt-5 flex justify-end gap-2">
                    <Button type="button" variant="ghost" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button type="submit" loading={busy} disabled={!name.trim()}>
                        Add it
                    </Button>
                </div>
            </form>
        </Dialog>
    );
}

function EnvelopeDialog({ open, state, onClose, onSave }: { open: boolean; state: FinanceState; onClose: () => void; onSave: (memberId: string, cents: number) => Promise<boolean> }) {
    const { members } = useSpace();
    const candidates = members.filter((m) => m.role === "child");
    const [memberId, setMemberId] = useState<string | null>(candidates[0]?.id ?? null);
    const [amount, setAmount] = useState(2500);
    const [busy, setBusy] = useState(false);
    const existing = memberId ? state.envelopes.find((e) => e.memberId === memberId) : undefined;

    return (
        <Dialog open={open} onClose={onClose} title="A personal envelope">
            <form
                onSubmit={async (e) => {
                    e.preventDefault();
                    if (!memberId) return;
                    setBusy(true);
                    try {
                        const ok = await onSave(memberId, amount);
                        if (ok) onClose();
                    } finally {
                        setBusy(false);
                    }
                }}
            >
                <p className="text-sm leading-6 text-muted">Theirs to spend and theirs to explain. They see the balance and every line in it; they never see anything else on this screen.</p>
                <MemberPicker label="Whose" value={memberId} onChange={setMemberId} roles={["child"]} className="mt-4" />
                <AmountField id="env-amount" label="A month" value={amount} onChange={setAmount} className="mt-4" hint={existing ? `${money(existing.balanceCents, state.settings.currency)} is left in the current one.` : undefined} />
                <div className="mt-5 flex justify-end gap-2">
                    <Button type="button" variant="ghost" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button type="submit" loading={busy} disabled={!memberId}>
                        {existing ? "Change the amount" : "Set it up"}
                    </Button>
                </div>
            </form>
        </Dialog>
    );
}

function ThresholdDialog({ open, state, onClose, onSave }: { open: boolean; state: FinanceState; onClose: () => void; onSave: (cents: number, note: string) => Promise<boolean> }) {
    const [amount, setAmount] = useState(state.settings.approvalThresholdCents);
    const [note, setNote] = useState(state.settings.note);
    const [busy, setBusy] = useState(false);
    return (
        <Dialog open={open} onClose={onClose} title="When do we both decide?">
            <form
                onSubmit={async (e) => {
                    e.preventDefault();
                    setBusy(true);
                    try {
                        const ok = await onSave(amount, note);
                        if (ok) onClose();
                    } finally {
                        setBusy(false);
                    }
                }}
            >
                <AmountField id="threshold" label="Both parents above" value={amount} onChange={setAmount} hint="Anything at or below this can be decided by either of you." />
                <Field label="The house rule, in your words" value={note} onChange={(e) => setNote(e.target.value)} className="mt-4" />
                <div className="mt-5 flex justify-end gap-2">
                    <Button type="button" variant="ghost" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button type="submit" loading={busy}>
                        Save the rule
                    </Button>
                </div>
            </form>
        </Dialog>
    );
}
