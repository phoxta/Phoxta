import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import { useAi } from "@/lib/ai";
import { Dialog } from "@/components/ui/overlay";
import { Button, Field, Spinner } from "@/components/ui/primitives";
import { Notice } from "@/components/shared";
import { areaCls, Labelled, selectCls } from "./dialogs";
import type { CharacterTrack, NewTrack } from "../types";

/**
 * The month's character track.
 *
 * A track is one virtue, tied to one of the family's own values, and a list of
 * daily micro-challenges — one line each, small enough that a five-year-old
 * and a fifteen-year-old can both do today's. The companion will draft the
 * month from a chosen value; every line stays editable, and nothing is saved
 * until a parent presses the button.
 */

function linesFrom(text: string): string[] {
    return text
        .split("\n")
        .map((l) => l.replace(/^\s*(?:[-*•]|(?:day\s*)?\d+[.)]?)\s*/i, "").trim())
        .filter((l) => l.length > 4 && l.length < 120 && !l.endsWith(":"))
        .slice(0, 31);
}

export function TrackDialog({ open, onClose, month, values, track, onSave }: { open: boolean; onClose: () => void; month: string; values: string[]; track?: CharacterTrack; onSave: (input: NewTrack) => Promise<void> }) {
    const { ask, busy: aiBusy } = useAi();
    const [virtue, setVirtue] = useState(track?.virtue ?? "");
    const [valueLabel, setValue] = useState(track?.valueLabel ?? values[0] ?? "");
    const [intro, setIntro] = useState(track?.intro ?? "");
    const [sprouts, setSprouts] = useState(String(track?.sprouts ?? 10));
    const [text, setText] = useState((track?.challenges ?? []).join("\n"));
    const [err, setErr] = useState<string | null>(null);
    const [aiErr, setAiErr] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        if (!open) return;
        setVirtue(track?.virtue ?? "");
        setValue(track?.valueLabel ?? values[0] ?? "");
        setIntro(track?.intro ?? "");
        setSprouts(String(track?.sprouts ?? 10));
        setText((track?.challenges ?? []).join("\n"));
        setErr(null);
        setAiErr(null);
    }, [open, track, values]);

    const challenges = text.split("\n").map((l) => l.trim()).filter(Boolean);

    const generate = async () => {
        setAiErr(null);
        try {
            const r = await ask({
                action: "ask",
                prompt: `Write a month of daily character challenges for our children, on the virtue "${virtue || valueLabel}", which serves our family value "${valueLabel}". Thirty lines, one challenge per line, no numbering and no preamble. Each line is one small concrete action a child of five, nine or fifteen could all do today, in British English, in our family's plain voice.`,
            });
            if (r.unavailable) return setAiErr(r.unavailable);
            const lines = linesFrom(r.text);
            if (!lines.length) return setAiErr("That didn't come back as a list. Try again, or write the month yourself.");
            setText(lines.join("\n"));
            if (!virtue.trim()) setVirtue(valueLabel);
        } catch (e) {
            setAiErr(e instanceof Error ? e.message : "The companion couldn't answer.");
        }
    };

    return (
        <Dialog open={open} onClose={onClose} title={track ? "Edit this month's track" : "Set the month's character track"} wide>
            <form
                onSubmit={async (e) => {
                    e.preventDefault();
                    if (!virtue.trim()) return setErr("Which virtue is this month about?");
                    if (!challenges.length) return setErr("A track needs at least one daily challenge.");
                    setBusy(true);
                    setErr(null);
                    try {
                        await onSave({ month, virtue, valueLabel, intro, challenges, sprouts: Number(sprouts) || 0 });
                        onClose();
                    } catch (e2) {
                        setErr(e2 instanceof Error ? e2.message : "That didn't save.");
                    } finally {
                        setBusy(false);
                    }
                }}
                className="flex flex-col gap-4"
            >
                <div className="grid grid-cols-[minmax(0,1fr)] gap-4 md:grid-cols-2">
                    <Field label="Virtue" value={virtue} onChange={(e) => setVirtue(e.target.value)} placeholder="Diligence" />
                    <Labelled label="Family value it serves">
                        <select value={valueLabel} onChange={(e) => setValue(e.target.value)} className={selectCls}>
                            {values.map((v) => (
                                <option key={v} value={v}>
                                    {v}
                                </option>
                            ))}
                        </select>
                    </Labelled>
                </div>
                <Labelled label="Why this month">
                    <textarea value={intro} onChange={(e) => setIntro(e.target.value)} rows={2} className={areaCls} placeholder="One small thing a day — finished, not started." />
                </Labelled>
                <Field label="Sprouts per challenge" type="number" min={0} max={100} value={sprouts} onChange={(e) => setSprouts(e.target.value)} />

                <div className="flex items-center justify-between gap-3">
                    <span className="text-xs font-medium uppercase tracking-[0.06em] text-muted">Daily challenges · {challenges.length}</span>
                    <Button type="button" variant="outline" size="md" onClick={generate} disabled={aiBusy}>
                        {aiBusy ? <Spinner /> : <Sparkles size={15} aria-hidden="true" />} Draft the month
                    </Button>
                </div>
                {aiErr && <Notice tone="warn">{aiErr}</Notice>}
                <textarea value={text} onChange={(e) => setText(e.target.value)} rows={12} className={areaCls} aria-label="Daily challenges, one per line" placeholder={"Make your bed before breakfast.\nFinish your maths before you open a screen."} />

                {err && <p className="text-sm text-danger-ink">{err}</p>}
                <div className="flex justify-end gap-2">
                    <Button variant="ghost" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button type="submit" loading={busy}>
                        {track ? "Save the track" : "Start the track"}
                    </Button>
                </div>
            </form>
        </Dialog>
    );
}
