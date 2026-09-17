import { useMemo, useState } from "react";
import { Gift, HandHeart, Plus } from "lucide-react";
import { cn } from "@/lib/cn";
import { money, shortDate } from "@/lib/format";
import { useModule } from "@/state/data";
import { useSpace } from "@/state/space";
import { useToast } from "@/state/toast";
import { Money, Notice, PageTitle, Section, Stat } from "@/components/shared";
import { Button, EmptyState, Tag } from "@/components/ui/primitives";
import financeModule from "../module";
import { entriesInMonth, givingByRecipient, givingCategoryIds, givingTotal, givingYear, monthLabel, monthOf, monthsBack, sumHome } from "../derive";
import { FinanceNav, MoneyIsPrivate } from "../components/pieces";
import { EntryDialog } from "../components/EntryDialog";
import { LockStrip, ReauthDialog, useMoneyGuard } from "../components/reauth";

/**
 * What the family gives, and to whom.
 *
 * The number that matters is a percentage of what came IN, not a total, because
 * a tenth of a lean month is the same act as a tenth of a good one. Everything
 * on this screen is the sum of ledger entries in categories marked as giving —
 * there is no second store of generosity to fall out of step with the accounts.
 *
 * The tithe line is the family's own rule made checkable: a tenth off the top,
 * measured against what actually arrived this month.
 */

export default function GivingPage() {
    const { state, repo, mutate, loading, error } = useModule(financeModule);
    const { today, space } = useSpace();
    const { toast } = useToast();
    const guard = useMoneyGuard(repo);
    const [adding, setAdding] = useState(false);
    const [tick, setTick] = useState(0);

    const rows = useMemo(() => {
        if (!state?.visible) return [];
        const ids = new Set(givingCategoryIds(state));
        return state.entries.filter((e) => e.kind === "expense" && ids.has(e.categoryId)).sort((a, b) => b.date.localeCompare(a.date));
    }, [state]);

    if (loading && !state) return <p className="text-md text-muted">Opening the giving record…</p>;
    if (error) return <Notice tone="danger">{error}</Notice>;
    if (!state) return null;
    if (!state.visible) return <MoneyIsPrivate mine={state.mine.wishes.length} />;

    const year = givingYear(state, today);
    const month = monthOf(today);
    const from = `${year.year}-01-01`;
    const recipients = givingByRecipient(state, from, today);
    const thisMonth = givingTotal(state, `${month}-01`, today);
    const incomeThisMonth = sumHome(entriesInMonth(state.entries, month).filter((e) => e.kind === "income"));
    const titheDue = Math.round((incomeThisMonth * state.settings.tithePct) / 100);
    const titheGiven = sumHome(entriesInMonth(state.entries, month).filter((e) => e.kind === "expense" && e.categoryId === "tithes"));
    const byMonth = monthsBack(month, 6).map((m) => ({ month: m, cents: givingTotal(state, `${m}-01`, `${m}-31`) }));
    const peak = Math.max(1, ...byMonth.map((b) => b.cents));

    return (
        <div>
            <PageTitle
                title="Giving"
                sub="The tithe, the gifts and the hands they went to. Added up from the ledger, so it is what happened rather than what was intended."
                area="live"
                actions={
                    <Button onClick={() => setAdding(true)}>
                        <Plus size={16} aria-hidden="true" /> Record a gift
                    </Button>
                }
            />

            <FinanceNav />
            <LockStrip repo={repo} onLock={() => setTick(tick + 1)} />

            <div className="mb-8 mt-5 flex flex-wrap items-center gap-4 rounded-xl bg-live-soft p-6 text-live-ink">
                <span className="grid size-12 shrink-0 place-items-center rounded-full bg-live text-white">
                    <HandHeart size={22} aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                    <p className="font-display text-5xl leading-8">
                        {money(year.givingCents, space.currency)} given in {year.year}
                    </p>
                    <p className="mt-1 text-md leading-6">
                        That is <strong className="font-semibold">{year.pct}%</strong> of the {money(year.incomeCents, space.currency)} that came in. Generous with what we have — one of the five things this family says it is
                        for.
                    </p>
                </div>
            </div>

            <div className="mb-8 grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Stat label={`This year`} value={<Money cents={year.givingCents} />} sub={`${year.pct}% of income`} tone="live" />
                <Stat label={monthLabel(month, false)} value={<Money cents={thisMonth} />} sub={`${incomeThisMonth ? Math.round((thisMonth / incomeThisMonth) * 1000) / 10 : 0}% of this month's income`} />
                <Stat label="Tithe due" value={<Money cents={titheDue} />} sub={`${state.settings.tithePct}% of ${money(incomeThisMonth, space.currency)}`} />
                <Stat
                    label="Tithe given"
                    value={<Money cents={titheGiven} />}
                    sub={titheGiven >= titheDue ? "the whole tenth, and then some" : `${money(titheDue - titheGiven, space.currency)} still to go`}
                    tone={titheGiven >= titheDue ? "ok" : "warn"}
                />
            </div>

            <Section title="Six months of giving">
                <figure className="rounded-xl bg-card px-4 pb-3 pt-5">
                    <ul className="flex h-28 items-end justify-around gap-3">
                        {byMonth.map((b) => (
                            <li key={b.month} className="flex h-full flex-1 flex-col justify-end">
                                <span className="mb-1 text-center text-2xs tabular-nums text-caption">{b.cents ? money(b.cents, space.currency) : ""}</span>
                                <span className="block w-full rounded-t-[4px] bg-live" style={{ height: `${Math.max(2, Math.round((b.cents / peak) * 100))}%` }} role="img" aria-label={`${monthLabel(b.month)}: ${money(b.cents, space.currency)}`} />
                            </li>
                        ))}
                    </ul>
                    <figcaption className="mt-2 flex justify-around gap-3 text-2xs text-muted">
                        {byMonth.map((b) => (
                            <span key={b.month} className="flex-1 text-center">
                                {monthLabel(b.month, false).slice(0, 3)}
                            </span>
                        ))}
                    </figcaption>
                </figure>
            </Section>

            <Section title="Who it went to">
                {recipients.length === 0 ? (
                    <EmptyState icon={<Gift size={20} aria-hidden="true" />} title="Nothing recorded yet" body="Name the recipient on a gift and it gathers here — a record you can look back on at the end of the year." />
                ) : (
                    <ul className="grid gap-2">
                        {recipients.map((r) => (
                            <li key={r.recipient} className="rounded-lg bg-card p-4">
                                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                                    <span className="text-md font-semibold">{r.recipient}</span>
                                    <Money cents={r.cents} className="text-md font-semibold" />
                                </div>
                                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-track" role="progressbar" aria-valuenow={Math.round((r.cents / (recipients[0]?.cents || 1)) * 100)} aria-valuemin={0} aria-valuemax={100} aria-label={`${r.recipient}: ${money(r.cents, space.currency)}`}>
                                    <span className="block h-full rounded-full bg-live" style={{ width: `${Math.round((r.cents / (recipients[0]?.cents || 1)) * 100)}%` }} />
                                </div>
                                <p className="mt-2 text-xs text-caption">
                                    {r.count} {r.count === 1 ? "gift" : "gifts"} · last {shortDate(r.lastAt)} · {year.givingCents ? Math.round((r.cents / year.givingCents) * 100) : 0}% of the year&rsquo;s giving
                                </p>
                            </li>
                        ))}
                    </ul>
                )}
            </Section>

            <Section title="Every gift">
                {rows.length === 0 ? (
                    <EmptyState title="Nothing here yet" body="Anything spent in a category marked as giving shows up in this list." action={<Button onClick={() => setAdding(true)}>Record the first</Button>} />
                ) : (
                    <ul className="overflow-hidden rounded-xl bg-card">
                        {rows.slice(0, 40).map((e) => (
                            <li key={e.id} className="flex items-center gap-3 border-b border-line px-4 py-3 last:border-0">
                                <span className={cn("grid size-9 shrink-0 place-items-center rounded-full", e.categoryId === "tithes" ? "bg-live-soft text-live-ink" : "bg-ochre-soft text-ochre")}>
                                    <Gift size={16} aria-hidden="true" />
                                </span>
                                <span className="min-w-0 flex-1">
                                    <span className="block truncate text-md font-medium">{e.recipient || e.payee || "A gift"}</span>
                                    <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-caption">
                                        <span>{shortDate(e.date)}</span>
                                        <span>· {state.budgets.find((c) => c.id === e.categoryId)?.name}</span>
                                        {e.note && <span className="truncate">· {e.note}</span>}
                                        {e.valueId && <Tag tone="live">{e.valueId}</Tag>}
                                    </span>
                                </span>
                                <Money cents={e.amountHomeCents} className="shrink-0 text-md font-semibold" />
                            </li>
                        ))}
                        {rows.length > 40 && <li className="px-4 py-3 text-xs text-caption">…and {rows.length - 40} more in the ledger.</li>}
                    </ul>
                )}
            </Section>

            <EntryDialog
                open={adding}
                onClose={() => setAdding(false)}
                state={state}
                defaultCategoryId="giving"
                onSave={async (input) => {
                    const ok = await guard.run(() => mutate((r) => r.addEntry({ ...input, valueId: input.valueId ?? "Generosity" })));
                    if (ok) toast("Recorded.", "success");
                    return ok;
                }}
            />

            <ReauthDialog open={guard.asking} busy={guard.busy} onConfirm={guard.confirm} onClose={guard.cancel} />
        </div>
    );
}
