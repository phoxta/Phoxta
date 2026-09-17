import { useMemo, useState } from "react";
import { Download, Plus, Receipt, Upload } from "lucide-react";
import { cn } from "@/lib/cn";
import { money, shortDate } from "@/lib/format";
import { useModule } from "@/state/data";
import { useSpace } from "@/state/space";
import { useToast } from "@/state/toast";
import { Confirm, MemberAvatar, Money, Notice, PageTitle, Stat } from "@/components/shared";
import { Dialog } from "@/components/ui/overlay";
import { Button, EmptyState, Field, Tag } from "@/components/ui/primitives";
import financeModule from "../module";
import { entriesInMonth, monthLabel, monthOf, monthSummary } from "../derive";
import { CategorySelect, FinanceNav, MoneyIsPrivate, MonthPicker } from "../components/pieces";
import { EntryDialog } from "../components/EntryDialog";
import { LockStrip, ReauthDialog, useMoneyGuard } from "../components/reauth";
import type { EntryKind, FinanceState, ImportResult, ImportRow, LedgerEntry } from "../types";

/**
 * Every movement of money, in one list.
 *
 * The ledger is the module's floor: budgets, bills, giving and the pipeline all
 * add up from here, and nothing in Wàfè stores a total that this list does not
 * explain. Two details earn their keep — a foreign entry shows both numbers
 * (₦450,000 · counted as £216), and a bank export can be brought in with the
 * columns mapped by hand, de-duplicated on date + amount + description so a
 * month imported twice stays a month.
 */

const CSV_SAMPLE = "Date,Description,Amount\n2026-09-04,Aldi Purley Way,-42.18\n2026-09-03,Salary,+3150.00";

export default function LedgerPage() {
    const { state, repo, mutate, loading, error } = useModule(financeModule);
    const { today, space, members } = useSpace();
    const { toast } = useToast();
    const guard = useMoneyGuard(repo);
    const [month, setMonth] = useState(() => monthOf(today));
    const [q, setQ] = useState("");
    const [cat, setCat] = useState("all");
    const [who, setWho] = useState("all");
    const [kind, setKind] = useState<"all" | EntryKind>("all");
    const [adding, setAdding] = useState(false);
    const [editing, setEditing] = useState<LedgerEntry | null>(null);
    const [removing, setRemoving] = useState<LedgerEntry | null>(null);
    const [importing, setImporting] = useState(false);
    const [tick, setTick] = useState(0);

    const summary = useMemo(() => (state?.visible ? monthSummary(state, month) : null), [state, month]);
    const rows = useMemo(() => {
        if (!state?.visible) return [] as LedgerEntry[];
        const needle = q.trim().toLowerCase();
        return entriesInMonth(state.entries, month)
            .filter((e) => (cat === "all" ? true : e.categoryId === cat))
            .filter((e) => (who === "all" ? true : who === "none" ? !e.memberId : e.memberId === who))
            .filter((e) => (kind === "all" ? true : e.kind === kind))
            .filter((e) => (needle ? `${e.payee} ${e.note} ${e.recipient}`.toLowerCase().includes(needle) : true))
            .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
    }, [state, month, q, cat, who, kind]);

    if (loading && !state) return <p className="text-md text-muted">Opening the ledger…</p>;
    if (error) return <Notice tone="danger">{error}</Notice>;
    if (!state) return null;
    if (!state.visible) return <MoneyIsPrivate mine={state.mine.wishes.length} />;

    const shown = rows.reduce((t, e) => t + (e.kind === "expense" ? e.amountHomeCents : -e.amountHomeCents), 0);
    const days = [...new Set(rows.map((e) => e.date))];

    const exportCsv = () => {
        const head = "Date,Type,Amount,Currency,Amount in " + space.currency + ",Category,Paid to,Note,Recipient";
        const body = rows.map((e) =>
            [e.date, e.kind, (e.amountCents / 100).toFixed(2), e.currency, (e.amountHomeCents / 100).toFixed(2), state.budgets.find((c) => c.id === e.categoryId)?.name ?? e.categoryId, e.payee, e.note, e.recipient]
                .map((v) => `"${String(v).replace(/"/g, '""')}"`)
                .join(","),
        );
        const blob = new Blob([[head, ...body].join("\n")], { type: "text/csv;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `wafe-ledger-${month}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        toast(`${rows.length} entries exported.`, "success");
    };

    return (
        <div>
            <PageTitle
                title="The ledger"
                sub="Every pound in and out, with what it was for. Everything else in this module is added up from these rows."
                area="live"
                actions={
                    <>
                        <Button variant="outline" onClick={() => setImporting(true)}>
                            <Upload size={16} aria-hidden="true" /> Import
                        </Button>
                        <Button variant="outline" onClick={exportCsv} disabled={!rows.length}>
                            <Download size={16} aria-hidden="true" /> Export
                        </Button>
                        <Button onClick={() => setAdding(true)}>
                            <Plus size={16} aria-hidden="true" /> Add
                        </Button>
                    </>
                }
            />

            <FinanceNav />
            <LockStrip repo={repo} onLock={() => setTick(tick + 1)} />

            <div className="mb-5 mt-5 flex flex-wrap items-center justify-between gap-3">
                <MonthPicker month={month} onChange={setMonth} today={today} />
                <span className="text-xs text-caption">
                    {rows.length} of {entriesInMonth(state.entries, month).length} entries
                </span>
            </div>

            {summary && (
                <div className="mb-6 grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-3">
                    <Stat label="Came in" value={<Money cents={summary.incomeCents} />} sub={monthLabel(month, false)} tone="ok" />
                    <Stat label="Went out" value={<Money cents={summary.spentCents} />} sub={`${entriesInMonth(state.entries, month).length} entries`} />
                    <Stat label="Difference" value={<Money cents={summary.incomeCents - summary.spentCents} />} sub={summary.incomeCents >= summary.spentCents ? "left over" : "more out than in"} tone={summary.incomeCents >= summary.spentCents ? "neutral" : "danger"} />
                </div>
            )}

            {/* -- Filters -------------------------------------------------------- */}
            <div className="mb-5 grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Field label="Search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Aldi, tithe, Shell…" />
                <label htmlFor="led-cat" className="block">
                    <span className="mb-1.5 block text-xs font-medium uppercase tracking-[0.06em] text-muted">Category</span>
                    <select id="led-cat" value={cat} onChange={(e) => setCat(e.target.value)} className="h-[46px] w-full rounded-md border border-line-strong bg-card px-3 text-md outline-none focus:border-brand">
                        <option value="all">Every category</option>
                        {state.budgets
                            .slice()
                            .sort((a, b) => a.order - b.order)
                            .map((c) => (
                                <option key={c.id} value={c.id}>
                                    {c.name}
                                </option>
                            ))}
                    </select>
                </label>
                <label htmlFor="led-who" className="block">
                    <span className="mb-1.5 block text-xs font-medium uppercase tracking-[0.06em] text-muted">Whose</span>
                    <select id="led-who" value={who} onChange={(e) => setWho(e.target.value)} className="h-[46px] w-full rounded-md border border-line-strong bg-card px-3 text-md outline-none focus:border-brand">
                        <option value="all">Anyone</option>
                        <option value="none">The household</option>
                        {members.map((m) => (
                            <option key={m.id} value={m.id}>
                                {m.name}
                            </option>
                        ))}
                    </select>
                </label>
                <label htmlFor="led-kind" className="block">
                    <span className="mb-1.5 block text-xs font-medium uppercase tracking-[0.06em] text-muted">In or out</span>
                    <select id="led-kind" value={kind} onChange={(e) => setKind(e.target.value as "all" | EntryKind)} className="h-[46px] w-full rounded-md border border-line-strong bg-card px-3 text-md outline-none focus:border-brand">
                        <option value="all">Both</option>
                        <option value="expense">Money out</option>
                        <option value="income">Money in</option>
                    </select>
                </label>
            </div>

            {rows.length === 0 ? (
                <EmptyState
                    icon={<Receipt size={20} aria-hidden="true" />}
                    title="Nothing here"
                    body={q || cat !== "all" || who !== "all" || kind !== "all" ? "No entry in this month matches those filters." : `Nothing has been recorded in ${monthLabel(month)} yet.`}
                    action={<Button onClick={() => setAdding(true)}>Add the first entry</Button>}
                />
            ) : (
                <div className="overflow-hidden rounded-xl bg-card">
                    {days.map((d) => (
                        <section key={d}>
                            <h2 className="sticky top-0 z-10 flex items-baseline justify-between gap-3 border-b border-line bg-card px-4 py-2 text-xs font-semibold uppercase tracking-[0.06em] text-caption">
                                <span>{shortDate(d)}</span>
                                <span className="tabular-nums">{money(rows.filter((e) => e.date === d && e.kind === "expense").reduce((t, e) => t + e.amountHomeCents, 0), space.currency)} out</span>
                            </h2>
                            <ul>
                                {rows
                                    .filter((e) => e.date === d)
                                    .map((e) => (
                                        <li key={e.id}>
                                            <button type="button" onClick={() => setEditing(e)} className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-page">
                                                {e.receiptUrl ? (
                                                    <img src={e.receiptUrl} alt="" width={40} height={40} loading="lazy" className="size-10 shrink-0 rounded-md object-cover" />
                                                ) : (
                                                    <span className={cn("grid size-10 shrink-0 place-items-center rounded-full text-2xs font-semibold", e.kind === "income" ? "bg-mint-soft text-mint" : "bg-page text-muted")}>
                                                        {e.kind === "income" ? "IN" : "OUT"}
                                                    </span>
                                                )}
                                                <span className="min-w-0 flex-1">
                                                    <span className="block truncate text-md font-medium">{e.payee || e.note || "Entry"}</span>
                                                    <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-caption">
                                                        <span>{state.budgets.find((c) => c.id === e.categoryId)?.name ?? "Uncategorised"}</span>
                                                        {e.note && e.payee && <span className="truncate">· {e.note}</span>}
                                                        {e.valueId && <Tag tone="live">{e.valueId}</Tag>}
                                                        {e.billId && <Tag tone="neutral">Bill</Tag>}
                                                        {e.wishId && <Tag tone="brand">Purchase</Tag>}
                                                        {e.envelopeId && <Tag tone="neutral">Envelope</Tag>}
                                                        {e.savingsGoalId && <Tag tone="ok">Into a pot</Tag>}
                                                    </span>
                                                </span>
                                                {e.memberId && <MemberAvatar memberId={e.memberId} size="xs" className="shrink-0" />}
                                                <span className="shrink-0 text-right">
                                                    <span className={cn("block text-md font-semibold tabular-nums", e.kind === "income" ? "text-mint" : "")}>
                                                        {e.kind === "income" ? "+" : "−"}
                                                        {money(e.amountHomeCents, space.currency)}
                                                    </span>
                                                    {e.currency !== space.currency && (
                                                        <span className="block text-2xs text-caption tabular-nums">
                                                            {e.currency} {(e.amountCents / 100).toLocaleString("en-GB")}
                                                        </span>
                                                    )}
                                                </span>
                                            </button>
                                        </li>
                                    ))}
                            </ul>
                        </section>
                    ))}
                    <p className="border-t border-line px-4 py-3 text-xs text-caption">
                        Showing {rows.length} entries · {money(Math.abs(shown), space.currency)} {shown >= 0 ? "net out" : "net in"}
                    </p>
                </div>
            )}

            <EntryDialog
                open={adding}
                onClose={() => setAdding(false)}
                state={state}
                onSave={async (input) => {
                    const ok = await guard.run(() => mutate((r) => r.addEntry(input)));
                    if (ok) toast("Added to the ledger.", "success");
                    return ok;
                }}
            />

            <EntryDialog
                open={Boolean(editing)}
                onClose={() => setEditing(null)}
                state={state}
                entry={editing}
                onSave={async (input) => {
                    if (!editing) return false;
                    const ok = await guard.run(() => mutate((r) => r.updateEntry(editing.id, input)));
                    if (ok) toast("Saved.", "success");
                    return ok;
                }}
                onDelete={async () => {
                    if (!editing) return;
                    setRemoving(editing);
                }}
            />

            <Confirm
                open={Boolean(removing)}
                title="Delete this entry?"
                body={removing ? `${removing.payee || removing.note || "This entry"} — ${money(removing.amountHomeCents, space.currency)}. Every total that counted it will change.` : ""}
                confirmLabel="Delete it"
                danger
                onConfirm={async () => {
                    if (!removing) return;
                    const ok = await guard.run(() => mutate((r) => r.removeEntry(removing.id)));
                    if (ok) toast("Deleted.");
                    setEditing(null);
                }}
                onClose={() => setRemoving(null)}
            />

            <ImportDialog
                open={importing}
                onClose={() => setImporting(false)}
                state={state}
                onImport={async (parsed, accountId) => {
                    const box: { res: ImportResult | null } = { res: null };
                    const ok = await guard.run(() =>
                        mutate(async (r) => {
                            box.res = await r.importEntries(parsed, accountId);
                        }),
                    );
                    return ok ? box.res : null;
                }}
            />

            <ReauthDialog open={guard.asking} busy={guard.busy} onConfirm={guard.confirm} onClose={guard.cancel} />
        </div>
    );
}

// ---------------------------------------------------------------------------
// CSV import (AC 11)
// ---------------------------------------------------------------------------

/** A tolerant CSV split: quoted fields, commas inside them, CRLF. */
function parseCsv(text: string): string[][] {
    const rows: string[][] = [];
    let row: string[] = [];
    let cell = "";
    let quoted = false;
    for (let i = 0; i < text.length; i += 1) {
        const c = text[i];
        if (quoted) {
            if (c === '"' && text[i + 1] === '"') {
                cell += '"';
                i += 1;
            } else if (c === '"') quoted = false;
            else cell += c;
            continue;
        }
        if (c === '"') quoted = true;
        else if (c === ",") {
            row.push(cell);
            cell = "";
        } else if (c === "\n" || c === "\r") {
            if (c === "\r" && text[i + 1] === "\n") i += 1;
            row.push(cell);
            if (row.some((x) => x.trim())) rows.push(row);
            row = [];
            cell = "";
        } else cell += c;
    }
    row.push(cell);
    if (row.some((x) => x.trim())) rows.push(row);
    return rows;
}

/** "04/09/2026", "2026-09-04", "4 Sep 2026" → "2026-09-04", or "". */
function toIsoDate(raw: string): string {
    const v = raw.trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(v)) return v.slice(0, 10);
    const slash = v.match(/^(\d{1,2})[/.](\d{1,2})[/.](\d{2,4})$/);
    if (slash) {
        const [, d, m, y] = slash;
        const year = y.length === 2 ? `20${y}` : y;
        return `${year}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
    }
    const parsed = new Date(v);
    if (!Number.isNaN(parsed.getTime())) return `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, "0")}-${String(parsed.getDate()).padStart(2, "0")}`;
    return "";
}

const guess = (headers: string[], words: string[]): number => headers.findIndex((h) => words.some((w) => h.toLowerCase().includes(w)));

function ImportDialog({
    open,
    onClose,
    state,
    onImport,
}: {
    open: boolean;
    onClose: () => void;
    state: FinanceState;
    onImport: (rows: ImportRow[], accountId: string) => Promise<ImportResult | null>;
}) {
    const [text, setText] = useState("");
    const [hasHeader, setHasHeader] = useState(true);
    const [dateCol, setDateCol] = useState(0);
    const [amountCol, setAmountCol] = useState(2);
    const [noteCol, setNoteCol] = useState(1);
    const [accountId, setAccountId] = useState(state.accounts[0]?.id ?? "");
    const [categoryId, setCategoryId] = useState("other");
    const [busy, setBusy] = useState(false);
    const [result, setResult] = useState<ImportResult | null>(null);

    const grid = useMemo(() => parseCsv(text), [text]);
    const headers = grid[0] ?? [];
    const body = hasHeader ? grid.slice(1) : grid;

    const readFile = async (file: File) => {
        const raw = await file.text();
        setText(raw);
        const g = parseCsv(raw);
        const h = g[0] ?? [];
        setDateCol(Math.max(0, guess(h, ["date", "when"])));
        setNoteCol(Math.max(0, guess(h, ["desc", "detail", "narrative", "payee", "reference"])));
        setAmountCol(Math.max(0, guess(h, ["amount", "value", "debit", "paid"])));
        setResult(null);
    };

    const mapped: ImportRow[] = body
        .map((r) => {
            const date = toIsoDate(r[dateCol] ?? "");
            const raw = (r[amountCol] ?? "").replace(/[^0-9.\-+]/g, "");
            const value = Number(raw);
            const note = (r[noteCol] ?? "").trim();
            if (!date || !Number.isFinite(value) || value === 0) return null;
            return { date, amountCents: Math.round(Math.abs(value) * 100), kind: (value > 0 ? "income" : "expense") as ImportRow["kind"], note, payee: note, categoryId };
        })
        .filter((r): r is ImportRow => r !== null);

    const close = () => {
        setText("");
        setResult(null);
        onClose();
    };

    return (
        <Dialog open={open} onClose={close} title="Import from the bank" wide>
            <p className="text-md leading-6 text-muted">
                Paste a statement or choose the file your bank exported. Tell us which column is which, and anything already on the ledger with the same date, amount and description is left alone rather than counted twice.
            </p>

            <div className="mt-4 flex flex-wrap items-center gap-3">
                <label className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-full border border-line-strong px-4 text-sm font-semibold hover:border-ink">
                    <Upload size={15} aria-hidden="true" />
                    Choose a CSV
                    <input
                        type="file"
                        accept=".csv,text/csv"
                        className="sr-only"
                        onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) void readFile(f);
                        }}
                    />
                </label>
                <button type="button" onClick={() => void readFile(new File([CSV_SAMPLE], "sample.csv"))} className="text-sm font-semibold text-brand underline-offset-4 hover:underline">
                    Use a sample
                </button>
            </div>

            <label htmlFor="csv-text" className="mt-4 block">
                <span className="mb-1.5 block text-xs font-medium uppercase tracking-[0.06em] text-muted">Or paste it</span>
                <textarea
                    id="csv-text"
                    value={text}
                    onChange={(e) => {
                        setText(e.target.value);
                        setResult(null);
                    }}
                    rows={4}
                    placeholder={CSV_SAMPLE}
                    className="w-full rounded-md border border-line-strong bg-card p-3 font-mono text-xs outline-none focus:border-brand"
                />
            </label>

            {grid.length > 0 && (
                <>
                    <div className="mt-4 flex flex-wrap items-center gap-3">
                        <button type="button" aria-pressed={hasHeader} onClick={() => setHasHeader(!hasHeader)} className={cn("rounded-full border px-3 py-1.5 text-xs font-medium", hasHeader ? "border-brand bg-brand-soft text-brand-ink" : "border-line-strong text-muted")}>
                            The first row is a header
                        </button>
                        <span className="text-xs text-caption">
                            {body.length} rows · {headers.length} columns
                        </span>
                    </div>

                    <div className="mt-4 grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-3">
                        {[
                            { id: "csv-date", label: "Date column", value: dateCol, set: setDateCol },
                            { id: "csv-note", label: "Description column", value: noteCol, set: setNoteCol },
                            { id: "csv-amount", label: "Amount column", value: amountCol, set: setAmountCol },
                        ].map((f) => (
                            <label key={f.id} htmlFor={f.id} className="block">
                                <span className="mb-1.5 block text-xs font-medium uppercase tracking-[0.06em] text-muted">{f.label}</span>
                                <select id={f.id} value={f.value} onChange={(e) => f.set(Number(e.target.value))} className="h-11 w-full rounded-sm border border-line-strong bg-card px-3 text-md outline-none focus:border-brand">
                                    {(headers.length ? headers : ["1", "2", "3"]).map((h, i) => (
                                        <option key={`${f.id}-${i}`} value={i}>
                                            {hasHeader ? h || `Column ${i + 1}` : `Column ${i + 1}`}
                                        </option>
                                    ))}
                                </select>
                            </label>
                        ))}
                    </div>

                    <div className="mt-4 grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-2">
                        <label htmlFor="csv-account" className="block">
                            <span className="mb-1.5 block text-xs font-medium uppercase tracking-[0.06em] text-muted">Into which account</span>
                            <select id="csv-account" value={accountId} onChange={(e) => setAccountId(e.target.value)} className="h-11 w-full rounded-sm border border-line-strong bg-card px-3 text-md outline-none focus:border-brand">
                                {state.accounts.map((a) => (
                                    <option key={a.id} value={a.id}>
                                        {a.name}
                                    </option>
                                ))}
                            </select>
                        </label>
                        <CategorySelect id="csv-category" label="Put them all under" value={categoryId} onChange={setCategoryId} state={state} />
                    </div>

                    {mapped.length > 0 && (
                        <div className="mt-4 overflow-x-auto rounded-md bg-page p-3">
                            <table className="w-full min-w-[26rem] text-left text-xs">
                                <caption className="sr-only">The first rows as they will be read</caption>
                                <thead className="text-caption">
                                    <tr>
                                        <th scope="col" className="pb-1 font-medium">
                                            Date
                                        </th>
                                        <th scope="col" className="pb-1 font-medium">
                                            Description
                                        </th>
                                        <th scope="col" className="pb-1 text-right font-medium">
                                            Amount
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {mapped.slice(0, 4).map((r, i) => (
                                        <tr key={`${r.date}-${i}`}>
                                            <td className="py-0.5">{r.date}</td>
                                            <td className="truncate py-0.5">{r.note || "—"}</td>
                                            <td className="py-0.5 text-right tabular-nums">
                                                {r.kind === "income" ? "+" : "−"}
                                                {money(r.amountCents, state.settings.currency)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {mapped.length > 4 && <p className="mt-1 text-2xs text-caption">…and {mapped.length - 4} more.</p>}
                        </div>
                    )}
                </>
            )}

            {result && (
                <div className="mt-4 rounded-md bg-mint-soft p-4 text-sm leading-6 text-mint">
                    <p className="font-semibold">
                        {result.imported} imported · {result.duplicates} already there · {result.skipped} skipped
                    </p>
                    {result.duplicateNotes.length > 0 && <p className="mt-1">We already had: {result.duplicateNotes.join(", ")}.</p>}
                </div>
            )}

            <div className="mt-5 flex flex-wrap justify-end gap-2">
                <Button type="button" variant="ghost" onClick={close}>
                    {result ? "Done" : "Cancel"}
                </Button>
                <Button
                    type="button"
                    loading={busy}
                    disabled={!mapped.length}
                    onClick={async () => {
                        setBusy(true);
                        try {
                            const r = await onImport(mapped, accountId || state.accounts[0]?.id || "");
                            if (r) setResult(r);
                        } finally {
                            setBusy(false);
                        }
                    }}
                >
                    Import {mapped.length ? `${mapped.length} rows` : ""}
                </Button>
            </div>
        </Dialog>
    );
}
