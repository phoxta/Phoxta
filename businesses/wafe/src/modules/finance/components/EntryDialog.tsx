import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import { useAi } from "@/lib/ai";
import { useSpace } from "@/state/space";
import { Dialog } from "@/components/ui/overlay";
import { MemberPicker } from "@/components/shared";
import { Button, Field, Spinner } from "@/components/ui/primitives";
import { money } from "@/lib/format";
import { AmountField, CategorySelect } from "./pieces";
import type { FinanceState, LedgerEntry, NewEntry } from "../types";

/**
 * One entry, in or out.
 *
 * Two things here are not decoration. The VALUE tag is the module's link back
 * to the family's own words — money spent on Generosity or on Joy is money
 * spent on purpose, and the giving screen and the companion both read it. And
 * the CURRENCY row is what makes the Lagos trip honest: type ₦450,000 at the
 * rate on the day and the ledger keeps both numbers, so every total in the
 * product stays in pounds without anyone converting anything by hand.
 */

export function EntryDialog({
    open,
    onClose,
    state,
    entry,
    onSave,
    onDelete,
    defaultCategoryId,
}: {
    open: boolean;
    onClose: () => void;
    state: FinanceState;
    entry?: LedgerEntry | null;
    onSave: (input: NewEntry) => Promise<boolean>;
    onDelete?: () => Promise<void>;
    /** What a screen that is about one kind of money opens on (Giving does). */
    defaultCategoryId?: string;
}) {
    const { space, today } = useSpace();
    const [kind, setKind] = useState<"income" | "expense">("expense");
    const [date, setDate] = useState(today);
    const [amountCents, setAmount] = useState(0);
    const [currency, setCurrency] = useState(space.currency);
    const [fxRate, setFx] = useState(1);
    const [categoryId, setCategory] = useState("groceries");
    const [accountId, setAccount] = useState(state.accounts[0]?.id ?? "");
    const [payee, setPayee] = useState("");
    const [note, setNote] = useState("");
    const [recipient, setRecipient] = useState("");
    const [valueId, setValue] = useState<string>("");
    const [memberId, setMember] = useState<string | null>(null);
    const [receiptUrl, setReceipt] = useState("");
    const [busy, setBusy] = useState(false);
    const [err, setErr] = useState<string | null>(null);
    const { ask, busy: aiBusy, available: aiAvailable } = useAi();
    const [suggestion, setSuggestion] = useState<{ text: string; categoryId: string | null } | null>(null);

    useEffect(() => {
        if (!open) return;
        setErr(null);
        setKind(entry?.kind ?? "expense");
        setDate(entry?.date ?? today);
        setAmount(entry?.amountCents ?? 0);
        setCurrency(entry?.currency ?? space.currency);
        setFx(entry?.fxRate ?? 1);
        setCategory(entry?.categoryId ?? defaultCategoryId ?? (entry?.kind === "income" ? "income" : "groceries"));
        setAccount(entry?.accountId ?? state.accounts[0]?.id ?? "");
        setPayee(entry?.payee ?? "");
        setNote(entry?.note ?? "");
        setRecipient(entry?.recipient ?? "");
        setValue(entry?.valueId ?? "");
        setMember(entry?.memberId ?? null);
        setReceipt(entry?.receiptUrl ?? "");
        setSuggestion(null);
    }, [open, entry, today, space.currency, state.accounts, defaultCategoryId]);

    /**
     * The companion classifies a receipt the only honest way it can: from the
     * receipt it was given and what the parent has typed against it. It answers
     * with one of OUR category ids, we match that back to a real category, and
     * a parent presses the button. It never sets the field itself — a proposal,
     * like everything else the companion does with money.
     */
    const classify = async () => {
        setSuggestion(null);
        const list = state.budgets
            .filter((c) => c.active && c.kind === kind)
            .map((c) => `${c.id} (${c.name})`)
            .join(", ");
        try {
            const r = await ask({
                action: "ask",
                prompt: `Which of the household's budget categories does this receipt belong in? Reply with two short lines: "Category: <id>" using an id from this list only — ${list} — then "Why: <one sentence>".`,
                extraContext: `Receipt on file: ${receiptUrl || "none attached"}. Paid to "${payee || "not said"}", note "${note || "none"}", ${money(amountCents, currency)} on ${date}.`,
            });
            if (r.unavailable) {
                setSuggestion({ text: r.unavailable, categoryId: null });
                return;
            }
            const text = r.text.trim();
            const byId = state.budgets.find((c) => new RegExp(`\b${c.id}\b`, "i").test(text));
            const byName = state.budgets.find((c) => text.toLowerCase().includes(c.name.toLowerCase()));
            setSuggestion({ text, categoryId: (byId ?? byName)?.id ?? null });
        } catch {
            setSuggestion({ text: "The companion couldn't read that just now.", categoryId: null });
        }
    };

    const foreign = currency !== space.currency;
    const homeCents = Math.round(amountCents * (foreign ? fxRate : 1));
    const cat = state.budgets.find((c) => c.id === categoryId);

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!amountCents) {
            setErr("How much was it?");
            return;
        }
        setBusy(true);
        try {
            const ok = await onSave({
                date,
                kind,
                amountCents,
                currency,
                fxRate: foreign ? fxRate : 1,
                categoryId,
                accountId,
                payee,
                note,
                recipient,
                valueId: valueId || null,
                memberId,
                receiptUrl: receiptUrl.trim() || null,
            });
            if (ok) onClose();
        } finally {
            setBusy(false);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} title={entry ? "Edit this entry" : "Add an entry"} wide>
            <form onSubmit={submit}>
                <div className="mb-4 inline-flex rounded-full border border-line-strong p-1" role="radiogroup" aria-label="In or out">
                    {(["expense", "income"] as const).map((k) => (
                        <button
                            key={k}
                            type="button"
                            role="radio"
                            aria-checked={kind === k}
                            onClick={() => {
                                setKind(k);
                                setCategory(k === "income" ? "income" : (defaultCategoryId ?? "groceries"));
                            }}
                            className={`rounded-full px-4 py-1.5 text-sm font-semibold ${kind === k ? "bg-ink text-white" : "text-muted"}`}
                        >
                            {k === "expense" ? "Money out" : "Money in"}
                        </button>
                    ))}
                </div>

                <div className="grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-2">
                    <AmountField id="fin-amount" label={`Amount (${currency})`} value={amountCents} onChange={setAmount} required />
                    <Field label="Date" type="date" value={date} max={today} onChange={(e) => setDate(e.target.value)} />
                    <CategorySelect id="fin-cat" value={categoryId} onChange={setCategory} state={state} kind={kind} />
                    <label htmlFor="fin-account" className="block">
                        <span className="mb-1.5 block text-xs font-medium uppercase tracking-[0.06em] text-muted">Account</span>
                        <select id="fin-account" value={accountId} onChange={(e) => setAccount(e.target.value)} className="h-11 w-full rounded-sm border border-line-strong bg-card px-3 text-md outline-none focus:border-brand">
                            {state.accounts.map((a) => (
                                <option key={a.id} value={a.id}>
                                    {a.name} · {a.currency}
                                </option>
                            ))}
                        </select>
                    </label>
                    <Field label={kind === "income" ? "From" : "Paid to"} value={payee} onChange={(e) => setPayee(e.target.value)} placeholder={kind === "income" ? "Northgate Fintech" : "Aldi, Purley Way"} />
                    <Field label="Note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="What it was for" />
                </div>

                <fieldset className="mt-4 rounded-md border border-line p-4">
                    <legend className="px-1 text-xs font-medium uppercase tracking-[0.06em] text-muted">Currency</legend>
                    <div className="grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-2">
                        <label htmlFor="fin-currency" className="block">
                            <span className="mb-1.5 block text-xs font-medium text-muted">Paid in</span>
                            <select
                                id="fin-currency"
                                value={currency}
                                onChange={(e) => {
                                    setCurrency(e.target.value);
                                    setFx(state.settings.fxRates[e.target.value] ?? 1);
                                }}
                                className="h-11 w-full rounded-sm border border-line-strong bg-card px-3 text-md outline-none focus:border-brand"
                            >
                                {Object.keys(state.settings.fxRates).map((c) => (
                                    <option key={c} value={c}>
                                        {c}
                                    </option>
                                ))}
                            </select>
                        </label>
                        {foreign && (
                            <Field
                                label={`Rate on the day (1 ${currency} = ? ${space.currency})`}
                                inputMode="decimal"
                                value={String(fxRate)}
                                onChange={(e) => setFx(Number(e.target.value.replace(/[^0-9.]/g, "")) || 0)}
                                hint={`Counts as ${money(homeCents, space.currency)} in every total.`}
                            />
                        )}
                    </div>
                    {!foreign && <p className="mt-2 text-xs text-caption">Anything paid abroad is stored twice — what left the account, and what it is worth in {space.currency}.</p>}
                </fieldset>

                <div className="mt-4 grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-2">
                    <label htmlFor="fin-value" className="block">
                        <span className="mb-1.5 block text-xs font-medium uppercase tracking-[0.06em] text-muted">A value this served</span>
                        <select id="fin-value" value={valueId} onChange={(e) => setValue(e.target.value)} className="h-11 w-full rounded-sm border border-line-strong bg-card px-3 text-md outline-none focus:border-brand">
                            <option value="">None in particular</option>
                            {space.values.map((v) => (
                                <option key={v} value={v}>
                                    {v}
                                </option>
                            ))}
                        </select>
                    </label>
                    <MemberPicker label="Whose spend (optional)" value={memberId} onChange={setMember} allowFamily />
                    {cat?.isGiving && <Field label="Who received it" value={recipient} onChange={(e) => setRecipient(e.target.value)} placeholder="Grace Chapel" hint="Named recipients are what make the giving record readable." />}
                    <Field label="Receipt (image URL)" value={receiptUrl} onChange={(e) => setReceipt(e.target.value)} placeholder="/images/finance-receipt.jpg" />
                </div>

                {receiptUrl && (
                    <div className="mt-3 flex flex-wrap items-center gap-3">
                        <img src={receiptUrl} alt="The receipt for this entry" width={160} height={120} loading="lazy" className="h-24 w-32 rounded-md object-cover" />
                        <Button type="button" size="md" variant="outline" onClick={() => void classify()} disabled={aiBusy || !aiAvailable}>
                            {aiBusy ? <Spinner /> : <Sparkles size={15} aria-hidden="true" />} Suggest a category
                        </Button>
                    </div>
                )}
                {suggestion && (
                    <div className="mt-3 rounded-md bg-page p-3 text-sm leading-6">
                        <p className="whitespace-pre-wrap">{suggestion.text}</p>
                        {suggestion.categoryId && suggestion.categoryId !== categoryId && (
                            <Button type="button" size="sm" className="mt-2" onClick={() => setCategory(suggestion.categoryId as string)}>
                                Use {state.budgets.find((c) => c.id === suggestion.categoryId)?.name}
                            </Button>
                        )}
                        <p className="mt-2 text-2xs text-caption">A suggestion only — nothing is saved until you press {entry ? "Save" : "Add"}.</p>
                    </div>
                )}
                {err && <p className="mt-3 text-sm text-danger-ink">{err}</p>}

                <div className="mt-5 flex flex-wrap justify-end gap-2">
                    {onDelete && (
                        <Button
                            type="button"
                            variant="danger"
                            onClick={async () => {
                                await onDelete();
                                onClose();
                            }}
                        >
                            Delete
                        </Button>
                    )}
                    <Button type="button" variant="ghost" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button type="submit" loading={busy}>
                        {entry ? "Save" : "Add"} {amountCents ? money(homeCents, space.currency) : ""}
                    </Button>
                </div>
            </form>
        </Dialog>
    );
}
