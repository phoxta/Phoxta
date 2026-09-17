import { useMemo, useState } from "react";
import { BellRing, Check, CircleAlert, Plus, Receipt, Zap } from "lucide-react";
import { cn } from "@/lib/cn";
import { money, shortDate } from "@/lib/format";
import { useModule } from "@/state/data";
import { useSpace } from "@/state/space";
import { useToast } from "@/state/toast";
import { Confirm, Money, Notice, PageTitle, Section, Stat } from "@/components/shared";
import { Dialog } from "@/components/ui/overlay";
import { Button, EmptyState, Field, Tag } from "@/components/ui/primitives";
import financeModule from "../module";
import { billPaidFor, billsMonthlyTotal, daysBetween, monthLabel, monthOf, monthsBack, nextDue } from "../derive";
import { AmountField, CategorySelect, FinanceNav, MoneyIsPrivate } from "../components/pieces";
import { LockStrip, ReauthDialog, useMoneyGuard } from "../components/reauth";
import { REMINDERS_BEFORE_PARK, type Bill, type BillFreq, type FinanceState, type NewBill } from "../types";

/**
 * The things that go out whether anyone looks or not.
 *
 * A bill is a promise with a date on it, so this screen is built around the
 * date rather than the amount: what is out, what is due, what has gone. Marking
 * one paid writes the ledger entry — the bill row itself never holds money.
 *
 * Rule 12 lives here, visibly. An unpaid bill is reminded three times and then
 * it PARKS: no fourth reminder, a card in Needs attention instead, because at
 * that point the family does not need nagging, it needs a decision. The council
 * tax in the demo is already parked, so the rule can be seen rather than
 * described.
 */

const FREQ_LABEL: Record<BillFreq, string> = { monthly: "Every month", quarterly: "Every quarter", yearly: "Once a year" };

const ordinal = (n: number): string => `${n}${n % 10 === 1 && n !== 11 ? "st" : n % 10 === 2 && n !== 12 ? "nd" : n % 10 === 3 && n !== 13 ? "rd" : "th"}`;

export default function BillsPage() {
    const { state, repo, mutate, loading, error } = useModule(financeModule);
    const { today, space } = useSpace();
    const { toast } = useToast();
    const guard = useMoneyGuard(repo);
    const [adding, setAdding] = useState(false);
    const [editing, setEditing] = useState<Bill | null>(null);
    const [removing, setRemoving] = useState<Bill | null>(null);
    const [tick, setTick] = useState(0);

    const groups = useMemo(() => {
        if (!state?.visible) return { late: [] as Bill[], due: [] as Bill[], paid: [] as Bill[], off: [] as Bill[] };
        const active = state.bills.filter((b) => b.active);
        return {
            late: active.filter((b) => !b.paid && b.dueDate < today).sort((a, b) => a.dueDate.localeCompare(b.dueDate)),
            due: active.filter((b) => !b.paid && b.dueDate >= today).sort((a, b) => a.dueDate.localeCompare(b.dueDate)),
            paid: active.filter((b) => b.paid).sort((a, b) => a.dueDay - b.dueDay),
            off: state.bills.filter((b) => !b.active),
        };
    }, [state, today]);

    if (loading && !state) return <p className="text-md text-muted">Opening the bills…</p>;
    if (error) return <Notice tone="danger">{error}</Notice>;
    if (!state) return null;
    if (!state.visible) return <MoneyIsPrivate mine={state.mine.wishes.length} />;

    const month = monthOf(today);
    const parked = groups.late.filter((b) => b.parked);
    /** The six months the paid-grid shows, oldest first. */
    const recent = monthsBack(month, 6);

    const pay = async (b: Bill) => {
        const due = nextDue(b, state.billPayments, today);
        const ok = await guard.run(() => mutate((r) => r.payBill(b.id, due.month)));
        if (ok) toast(`${b.name} marked paid — ${money(b.amountCents, space.currency)} on the ledger.`, "success");
    };

    const unpay = async (b: Bill) => {
        const paidMonth = state.billPayments.filter((p) => p.billId === b.id).sort((x, y) => y.month.localeCompare(x.month))[0]?.month;
        if (!paidMonth) return;
        const ok = await guard.run(() => mutate((r) => r.unpayBill(b.id, paidMonth)));
        if (ok) toast(`${b.name} is unpaid again for ${monthLabel(paidMonth, false)}, and the entry has gone.`);
    };

    const remind = async (b: Bill) => {
        const ok = await guard.run(() => mutate((r) => r.remindBill(b.id)));
        if (!ok) return;
        const sent = b.remindersSent + 1;
        toast(sent >= REMINDERS_BEFORE_PARK ? `Third reminder sent — ${b.name} now parks in Needs attention instead of nagging again.` : `Reminder ${sent} of ${REMINDERS_BEFORE_PARK} sent for ${b.name}.`);
    };

    const card = (b: Bill) => {
        const due = nextDue(b, state.billPayments, today);
        const late = !b.paid && b.dueDate < today;
        const days = daysBetween(today, b.dueDate);
        return (
            <li key={b.id} className={cn("rounded-xl p-4", b.parked ? "bg-danger-soft" : late ? "bg-peach-soft" : "bg-card")}>
                <div className="flex items-start gap-3">
                    <span className={cn("grid size-10 shrink-0 place-items-center rounded-full", b.paid ? "bg-mint-soft text-mint" : late ? "bg-white/70 text-danger-ink" : "bg-live-soft text-live-ink")}>
                        {b.paid ? <Check size={18} aria-hidden="true" /> : b.autopay ? <Zap size={17} aria-hidden="true" /> : <Receipt size={17} aria-hidden="true" />}
                    </span>
                    <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                            <h3 className="text-base font-semibold">{b.name}</h3>
                            <Money cents={b.amountCents} className="text-base font-semibold" />
                        </div>
                        <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-caption">
                            <span>
                                {ordinal(b.dueDay)} of the month · {FREQ_LABEL[b.freq]}
                            </span>
                            {b.autopay && <Tag tone="neutral">Automatic</Tag>}
                            {b.paid ? (
                                <Tag tone="ok">Paid for {monthLabel(due.month, false)}</Tag>
                            ) : late ? (
                                <Tag tone={b.parked ? "danger" : "warn"}>{b.parked ? "Parked" : `${-days} days late`}</Tag>
                            ) : (
                                <Tag tone="neutral">{days === 0 ? "Due today" : `In ${days} days`}</Tag>
                            )}
                        </p>
                        {b.note && <p className="mt-1.5 text-sm leading-5 text-muted">{b.note}</p>}
                        {b.parked && (
                            <p className="mt-2 flex items-start gap-2 text-sm leading-5 text-danger-ink">
                                <CircleAlert size={15} className="mt-0.5 shrink-0" aria-hidden="true" />
                                Three reminders have gone out. It stops asking now and waits for a decision.
                            </p>
                        )}
                        {!b.paid && !b.parked && b.remindersSent > 0 && (
                            <p className="mt-1.5 text-xs text-caption">
                                {b.remindersSent} of {REMINDERS_BEFORE_PARK} reminders sent.
                            </p>
                        )}
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                            {b.paid ? (
                                <Button size="sm" variant="ghost" onClick={() => void unpay(b)}>
                                    Undo
                                </Button>
                            ) : (
                                <Button size="sm" onClick={() => void pay(b)}>
                                    Mark paid
                                </Button>
                            )}
                            {!b.paid && !b.parked && (
                                <Button size="sm" variant="outline" onClick={() => void remind(b)}>
                                    <BellRing size={13} aria-hidden="true" /> Remind us
                                </Button>
                            )}
                            <Button size="sm" variant="ghost" onClick={() => setEditing(b)}>
                                Edit
                            </Button>
                            <button type="button" onClick={() => setRemoving(b)} className="text-xs text-caption underline-offset-4 hover:text-danger-ink hover:underline">
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
                title="Bills"
                sub="The fixed things, and where each one stands this month. Marking a bill paid is what writes it to the ledger — the bill itself never holds money."
                area="live"
                actions={
                    <Button onClick={() => setAdding(true)}>
                        <Plus size={16} aria-hidden="true" /> New bill
                    </Button>
                }
            />

            <FinanceNav />
            <LockStrip repo={repo} onLock={() => setTick(tick + 1)} />

            <div className="mb-8 mt-5 grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-3">
                <Stat label="Every month" value={<Money cents={billsMonthlyTotal(state.bills)} />} sub={`${state.bills.filter((b) => b.active).length} bills`} />
                <Stat label="Still to go" value={<Money cents={groups.late.concat(groups.due).reduce((t, b) => t + b.amountCents, 0)} />} sub={`in ${monthLabel(month, false)}`} tone={groups.late.length ? "warn" : "neutral"} />
                <Stat label="Paid" value={<Money cents={groups.paid.reduce((t, b) => t + b.amountCents, 0)} />} sub={`${groups.paid.length} of ${state.bills.filter((b) => b.active).length} done`} tone="ok" />
            </div>

            {parked.length > 0 && (
                <Notice tone="danger" className="mb-6">
                    {parked.map((b) => b.name).join(" and ")} {parked.length === 1 ? "has" : "have"} been reminded three times and parked. Rule 12: after three, the household gets a card in Needs attention instead of a fourth reminder.
                </Notice>
            )}

            {groups.late.length > 0 && (
                <Section title="Late">
                    <ul className="grid grid-cols-[minmax(0,1fr)] gap-3 md:grid-cols-2">{groups.late.map(card)}</ul>
                </Section>
            )}

            <Section title="Still to come">
                {groups.due.length === 0 ? (
                    <EmptyState icon={<Check size={20} aria-hidden="true" />} title="Nothing left this month" body="Every bill on the list has been paid or is not due yet." />
                ) : (
                    <ul className="grid grid-cols-[minmax(0,1fr)] gap-3 md:grid-cols-2">{groups.due.map(card)}</ul>
                )}
            </Section>

            {groups.paid.length > 0 && (
                <Section title="Gone out">
                    <ul className="grid grid-cols-[minmax(0,1fr)] gap-3 md:grid-cols-2">{groups.paid.map(card)}</ul>
                </Section>
            )}

            {groups.off.length > 0 && (
                <Section title="Switched off">
                    <ul className="grid grid-cols-[minmax(0,1fr)] gap-3 md:grid-cols-2">{groups.off.map(card)}</ul>
                </Section>
            )}

            <Section title="This year, bill by bill">
                <div className="relative overflow-x-auto rounded-xl bg-card p-2">
                    <table className="w-full min-w-[34rem] border-collapse text-left text-sm">
                        <caption className="sr-only">Which months each bill has been paid for</caption>
                        <thead>
                            <tr className="text-2xs uppercase tracking-[0.06em] text-caption">
                                <th scope="col" className="px-2 py-2 font-medium">
                                    Bill
                                </th>
                                {recent.map((m) => (
                                    <th key={m} scope="col" className="px-2 py-2 text-center font-medium">
                                        {monthLabel(m, false).slice(0, 3)}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {state.bills
                                .filter((b) => b.active)
                                .map((b) => (
                                    <tr key={b.id} className="border-t border-line">
                                        <th scope="row" className="px-2 py-2 text-left font-medium">
                                            {b.name}
                                        </th>
                                        {recent.map((m) => {
                                            const done = Boolean(billPaidFor(state.billPayments, b.id, m));
                                            return (
                                                <td key={m} className="px-2 py-2 text-center">
                                                    <span className={cn("inline-grid size-6 place-items-center rounded-full", done ? "bg-mint-soft text-mint" : "bg-page text-caption")} title={`${b.name}, ${monthLabel(m)}: ${done ? "paid" : "not recorded"}`}>
                                                        {done ? <Check size={13} aria-hidden="true" /> : <span aria-hidden="true">·</span>}
                                                        <span className="sr-only">{done ? "paid" : "not recorded"}</span>
                                                    </span>
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                        </tbody>
                    </table>
                </div>
            </Section>

            <BillDialog
                open={adding || Boolean(editing)}
                bill={editing}
                state={state}
                onClose={() => {
                    setAdding(false);
                    setEditing(null);
                }}
                onSave={async (input, active) => {
                    const ok = editing ? await guard.run(() => mutate((r) => r.updateBill(editing.id, { ...input, active }))) : await guard.run(() => mutate((r) => r.addBill(input)));
                    if (ok) toast(editing ? "Saved." : `${input.name} added.`, "success");
                    return ok;
                }}
            />

            <Confirm
                open={Boolean(removing)}
                title={removing ? `Remove ${removing.name}?` : ""}
                body="The payments already recorded stay on the ledger; only the reminder goes."
                confirmLabel="Remove the bill"
                danger
                onConfirm={async () => {
                    if (!removing) return;
                    const ok = await guard.run(() => mutate((r) => r.removeBill(removing.id)));
                    if (ok) toast("Removed.");
                }}
                onClose={() => setRemoving(null)}
            />

            <ReauthDialog open={guard.asking} busy={guard.busy} onConfirm={guard.confirm} onClose={guard.cancel} />
        </div>
    );
}

function BillDialog({ open, bill, state, onClose, onSave }: { open: boolean; bill: Bill | null; state: FinanceState; onClose: () => void; onSave: (input: NewBill, active: boolean) => Promise<boolean> }) {
    const [name, setName] = useState("");
    const [amount, setAmount] = useState(0);
    const [categoryId, setCategory] = useState("home");
    const [accountId, setAccount] = useState(state.accounts[0]?.id ?? "");
    const [dueDay, setDueDay] = useState(1);
    const [freq, setFreq] = useState<BillFreq>("monthly");
    const [autopay, setAutopay] = useState(false);
    const [active, setActive] = useState(true);
    const [note, setNote] = useState("");
    const [busy, setBusy] = useState(false);
    const [seeded, setSeeded] = useState<string | null>(null);

    // Load the bill being edited exactly once per opening, without an effect.
    const key = open ? (bill?.id ?? "new") : null;
    if (key !== seeded) {
        setSeeded(key);
        setName(bill?.name ?? "");
        setAmount(bill?.amountCents ?? 0);
        setCategory(bill?.categoryId ?? "home");
        setAccount(bill?.accountId ?? state.accounts[0]?.id ?? "");
        setDueDay(bill?.dueDay ?? 1);
        setFreq(bill?.freq ?? "monthly");
        setAutopay(bill?.autopay ?? false);
        setActive(bill?.active ?? true);
        setNote(bill?.note ?? "");
    }

    return (
        <Dialog open={open} onClose={onClose} title={bill ? `Edit ${bill.name}` : "A new bill"} wide>
            <form
                onSubmit={async (e) => {
                    e.preventDefault();
                    if (!name.trim()) return;
                    setBusy(true);
                    try {
                        const ok = await onSave({ name, amountCents: amount, categoryId, accountId, dueDay, freq, autopay, note }, active);
                        if (ok) onClose();
                    } finally {
                        setBusy(false);
                    }
                }}
            >
                <div className="grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-2">
                    <Field label="What is it" value={name} onChange={(e) => setName(e.target.value)} placeholder="Water" required />
                    <AmountField id="bill-amount" label="How much" value={amount} onChange={setAmount} required />
                    <CategorySelect id="bill-cat" value={categoryId} onChange={setCategory} state={state} />
                    <label htmlFor="bill-account" className="block">
                        <span className="mb-1.5 block text-xs font-medium uppercase tracking-[0.06em] text-muted">Paid from</span>
                        <select id="bill-account" value={accountId} onChange={(e) => setAccount(e.target.value)} className="h-11 w-full rounded-sm border border-line-strong bg-card px-3 text-md outline-none focus:border-brand">
                            {state.accounts.map((a) => (
                                <option key={a.id} value={a.id}>
                                    {a.name}
                                </option>
                            ))}
                        </select>
                    </label>
                    <Field label="Day of the month" type="number" min={1} max={28} value={dueDay} onChange={(e) => setDueDay(Number(e.target.value) || 1)} hint="1 to 28, so every month has one." />
                    <label htmlFor="bill-freq" className="block">
                        <span className="mb-1.5 block text-xs font-medium uppercase tracking-[0.06em] text-muted">How often</span>
                        <select id="bill-freq" value={freq} onChange={(e) => setFreq(e.target.value as BillFreq)} className="h-11 w-full rounded-sm border border-line-strong bg-card px-3 text-md outline-none focus:border-brand">
                            {(Object.keys(FREQ_LABEL) as BillFreq[]).map((f) => (
                                <option key={f} value={f}>
                                    {FREQ_LABEL[f]}
                                </option>
                            ))}
                        </select>
                    </label>
                </div>

                <Field label="Anything worth remembering" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Tariff changes in October." className="mt-4" />

                <div className="mt-4 flex flex-wrap gap-2">
                    <button type="button" aria-pressed={autopay} onClick={() => setAutopay(!autopay)} className={cn("rounded-full border px-3 py-1.5 text-xs font-medium", autopay ? "border-brand bg-brand-soft text-brand-ink" : "border-line-strong text-muted")}>
                        It goes out on its own
                    </button>
                    {bill && (
                        <button type="button" aria-pressed={!active} onClick={() => setActive(!active)} className={cn("rounded-full border px-3 py-1.5 text-xs font-medium", !active ? "border-brand bg-brand-soft text-brand-ink" : "border-line-strong text-muted")}>
                            Switched off
                        </button>
                    )}
                </div>

                {bill && <p className="mt-3 text-xs text-caption">Last recorded payment: {state.billPayments.filter((p) => p.billId === bill.id).sort((a, b) => b.month.localeCompare(a.month))[0]?.paidAt.slice(0, 10) ? shortDate(state.billPayments.filter((p) => p.billId === bill.id).sort((a, b) => b.month.localeCompare(a.month))[0].paidAt) : "none yet"}.</p>}

                <div className="mt-5 flex justify-end gap-2">
                    <Button type="button" variant="ghost" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button type="submit" loading={busy} disabled={!name.trim()}>
                        {bill ? "Save the bill" : "Add the bill"}
                    </Button>
                </div>
            </form>
        </Dialog>
    );
}
