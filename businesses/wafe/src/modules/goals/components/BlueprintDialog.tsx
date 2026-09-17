import { useEffect, useState } from "react";
import { Plus, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { useSpace } from "@/state/space";
import { Dialog } from "@/components/ui/overlay";
import { Button, Field, IconButton } from "@/components/ui/primitives";
import type { Blueprint, BlueprintDraft, BlueprintLine, Pillar } from "../types";
import { PILLARS, PILLAR_LABEL } from "../types";

/**
 * Writing the blueprint always writes a NEW version — nothing here edits
 * history. That is the whole point: a family should be able to read what they
 * believed in January and see, in their own words, what changed.
 */

const label = "mb-1.5 block text-xs font-medium text-muted";
const select = "h-11 rounded-sm border border-line-strong bg-card px-3 text-md outline-none focus:border-brand";
const area = "w-full rounded-md border border-line-strong bg-card px-3 py-2.5 text-md leading-6 outline-none focus:border-brand";

type Rows = { y1: BlueprintLine[]; y3: BlueprintLine[]; y5: BlueprintLine[] };
type Horizon = keyof Rows;

const HORIZONS: Array<{ key: Horizon; label: string; hint: string }> = [
    { key: "y1", label: "One year", hint: "What is true by this time next year." },
    { key: "y3", label: "Three years", hint: "Where the house is, and who the children are becoming." },
    { key: "y5", label: "Five years", hint: "The long view. Fewer lines, bigger ones." },
];

export function BlueprintDialog({ open, onClose, current, onSave }: { open: boolean; onClose: () => void; current?: Blueprint; onSave: (draft: BlueprintDraft) => Promise<void> }) {
    const { space } = useSpace();
    const [vision, setVision] = useState("");
    const [mission, setMission] = useState("");
    const [values, setValues] = useState<string[]>([]);
    const [note, setNote] = useState("");
    const [rows, setRows] = useState<Rows>({ y1: [], y3: [], y5: [] });
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!open) return;
        setVision(current?.vision ?? "");
        setMission(current?.mission ?? space.mission);
        setValues(current?.valuesSnapshot ?? space.values);
        setNote("");
        setRows({
            y1: current?.goals1y.length ? current.goals1y : [{ pillar: "faith", text: "", why: "" }],
            y3: current?.goals3y.length ? current.goals3y : [{ pillar: "home", text: "", why: "" }],
            y5: current?.goals5y.length ? current.goals5y : [{ pillar: "live", text: "", why: "" }],
        });
        setError(null);
    }, [open, current, space.mission, space.values]);

    const setRow = (h: Horizon, i: number, patch: Partial<BlueprintLine>) => setRows({ ...rows, [h]: rows[h].map((l, n) => (n === i ? { ...l, ...patch } : l)) });

    return (
        <Dialog open={open} onClose={onClose} title={current ? `Write version ${current.version + 1}` : "Write the blueprint"} wide>
            <form
                className="flex flex-col gap-5"
                onSubmit={async (e) => {
                    e.preventDefault();
                    if (!vision.trim()) {
                        setError("The vision is the one line this whole page hangs off. It needs something.");
                        return;
                    }
                    setBusy(true);
                    setError(null);
                    try {
                        await onSave({ vision, mission, valuesSnapshot: values, note, goals1y: rows.y1, goals3y: rows.y3, goals5y: rows.y5 });
                        onClose();
                    } catch (err) {
                        setError(err instanceof Error ? err.message : "That didn't save.");
                    } finally {
                        setBusy(false);
                    }
                }}
            >
                <label className="block">
                    <span className={label}>The vision</span>
                    <textarea value={vision} onChange={(e) => setVision(e.target.value)} rows={3} className={area} placeholder="By 2031 we own a home within twenty minutes of church, and a house other people find it easy to walk into." />
                </label>

                <label className="block">
                    <span className={label}>The mission</span>
                    <textarea value={mission} onChange={(e) => setMission(e.target.value)} rows={2} className={area} />
                </label>

                <fieldset>
                    <legend className={label}>Values, as they stand today</legend>
                    <div className="flex flex-wrap gap-2">
                        {[...new Set([...space.values, ...values])].map((v) => {
                            const on = values.includes(v);
                            return (
                                <button
                                    key={v}
                                    type="button"
                                    aria-pressed={on}
                                    onClick={() => setValues(on ? values.filter((x) => x !== v) : [...values, v])}
                                    className={cn("rounded-full border px-3.5 py-1.5 text-sm font-medium", on ? "border-brand bg-brand-soft text-brand-ink" : "border-line-strong text-muted hover:text-ink")}
                                >
                                    {v}
                                </button>
                            );
                        })}
                    </div>
                    <p className="mt-1.5 text-xs text-caption">This version keeps its own snapshot, so the diff can show a value being added or dropped.</p>
                </fieldset>

                {HORIZONS.map((h) => (
                    <fieldset key={h.key}>
                        <legend className={label}>
                            {h.label} — <span className="font-normal normal-case text-caption">{h.hint}</span>
                        </legend>
                        <ul className="flex flex-col gap-3">
                            {rows[h.key].map((l, i) => (
                                <li key={i} className="rounded-md bg-page p-3">
                                    <div className="flex gap-2">
                                        <select value={l.pillar} onChange={(e) => setRow(h.key, i, { pillar: e.target.value as Pillar })} className={cn(select, "w-40 shrink-0")} aria-label="Pillar">
                                            {PILLARS.map((p) => (
                                                <option key={p} value={p}>
                                                    {PILLAR_LABEL[p]}
                                                </option>
                                            ))}
                                        </select>
                                        <input value={l.text} onChange={(e) => setRow(h.key, i, { text: e.target.value })} placeholder="What is true by then" className="h-11 min-w-0 flex-1 rounded-sm border border-line-strong bg-card px-3 text-md outline-none focus:border-brand" aria-label="What is true by then" />
                                        <IconButton label={`Remove line ${i + 1}`} size="lg" onClick={() => setRows({ ...rows, [h.key]: rows[h.key].filter((_, n) => n !== i) })}>
                                            <X size={15} />
                                        </IconButton>
                                    </div>
                                    <input value={l.why ?? ""} onChange={(e) => setRow(h.key, i, { why: e.target.value })} placeholder="Why — one sentence" className="mt-2 h-10 w-full rounded-sm border border-line bg-card px-3 text-sm outline-none focus:border-brand" aria-label="Why" />
                                </li>
                            ))}
                        </ul>
                        <Button variant="ghost" size="sm" className="mt-2" onClick={() => setRows({ ...rows, [h.key]: [...rows[h.key], { pillar: "grow", text: "", why: "" }] })}>
                            <Plus size={14} /> Another line
                        </Button>
                    </fieldset>
                ))}

                <Field label="Why this version" value={note} onChange={(e) => setNote(e.target.value)} placeholder="After the Lagos decision and Dami's GCSE year starting." hint="It shows next to the version in the history." />

                {error && <p className="text-sm text-danger-ink">{error}</p>}

                <div className="flex justify-end gap-2">
                    <Button variant="ghost" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button type="submit" loading={busy}>
                        Save as version {(current?.version ?? 0) + 1}
                    </Button>
                </div>
            </form>
        </Dialog>
    );
}
