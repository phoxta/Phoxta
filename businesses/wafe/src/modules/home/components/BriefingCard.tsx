import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pause, RefreshCw, Volume2 } from "lucide-react";
import { cn } from "@/lib/cn";
import { relative } from "@/lib/format";
import { useAi } from "@/lib/ai";
import { Lite } from "@/components/companion/CompanionDrawer";
import { Button } from "@/components/ui/primitives";
import { briefingGrounding, briefingLabel, briefingSources, templateBriefing, type BriefingInput } from "../derive";
import type { Briefing, NewBriefing } from "../types";
import { SourceChip } from "./bits";

/**
 * The daily briefing — now the sentence at the heart of The Day card.
 *
 * It is generated once per member per DAY (not per part of the day) and cached
 * in Home's own state, so arriving at 11:59 and again at 12:01 does not spend
 * the family's allowance twice. When the companion is unavailable the same
 * data is written by `templateBriefing`, which obeys the count rule: the
 * briefing may never name a number the page does not show, and its lead names
 * the same three things The Day card selected, in the same order.
 *
 * What used to sit around it — a card header, a provenance tag, seven source
 * chips and a "written just now" — is now one collapsed `<details>`.
 * Provenance is a promise Wàfè keeps; seven chips across the page is a debug
 * view.
 */
export function Briefing({
    input,
    cached,
    onSave,
    speakLabel = "Read aloud",
    controls = "full",
    className,
}: {
    input: BriefingInput;
    cached?: Briefing;
    onSave: (b: NewBriefing) => Promise<void>;
    speakLabel?: string;
    /**
     * A child gets the words and the voice and nothing else: "Regenerate" and
     * a provenance drawer are a grown-up's controls, and on a nine-year-old's
     * screen they are furniture.
     */
    controls?: "full" | "speak";
    className?: string;
}) {
    const { ask } = useAi();
    const [busy, setBusy] = useState(false);
    const [note, setNote] = useState<string | null>(null);
    const [speaking, setSpeaking] = useState(false);
    const tried = useRef("");
    const key = `${input.today}:${input.firstName}`;

    /** What the card shows until (and unless) a saved briefing exists. */
    const draft = useMemo(() => templateBriefing(input), [input]);
    const shown = cached ? cached.text : draft;
    const sources = cached ? cached.sources : briefingSources(input);

    const generate = useCallback(async () => {
        setBusy(true);
        setNote(null);
        let text = "";
        let kind: NewBriefing["kind"] = "template";
        try {
            const r = await ask({ action: "briefing", payload: { when: input.when, date: input.today }, extraContext: briefingGrounding(input) });
            if (r.unavailable) setNote(r.unavailable);
            else if (r.text.trim()) {
                text = r.text.trim();
                kind = "ai";
            }
        } catch (e) {
            setNote(e instanceof Error ? e.message : "The companion couldn't answer just now.");
        }
        if (!text) text = templateBriefing(input);
        try {
            await onSave({ date: input.today, when: input.when, text, sources: briefingSources(input), kind });
        } finally {
            setBusy(false);
        }
    }, [ask, input, onSave]);

    // Once per member per day: the ref keeps a re-render from asking again.
    useEffect(() => {
        if (cached || tried.current === key) return;
        tried.current = key;
        void generate();
    }, [cached, key, generate]);

    // Never leave a voice talking to an empty room.
    useEffect(() => () => window.speechSynthesis?.cancel(), []);

    const toggleSpeech = () => {
        const synth = window.speechSynthesis;
        if (!synth || !shown.trim()) return;
        if (speaking) {
            synth.cancel();
            setSpeaking(false);
            return;
        }
        const u = new SpeechSynthesisUtterance(shown);
        u.lang = "en-GB";
        u.rate = 0.98;
        u.onend = () => setSpeaking(false);
        u.onerror = () => setSpeaking(false);
        synth.cancel();
        synth.speak(u);
        setSpeaking(true);
    };

    const paras = shown.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
    const lead = paras[0] ?? "";
    const rest = paras.slice(1);

    return (
        <div className={cn("flex flex-col gap-2", className)} aria-busy={!cached && busy}>
            {/* The first open of the day is always a morning, whatever the
                clock says: a parent opening Wafe for the first time at three in
                the afternoon was being handed "Your evening briefing" for a day
                nobody had told them about yet. */}
            <p className="text-2xs font-semibold uppercase tracking-[0.1em] text-caption">{briefingLabel(cached?.when ?? input.when, !cached)}</p>
            <p className="font-display text-2xl leading-[28px] md:text-3xl md:leading-[30px]">{lead}</p>
            {rest.length > 0 && (
                <div className="space-y-1 text-base leading-[26px] text-muted">
                    <Lite text={rest.join("\n\n")} />
                </div>
            )}

            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-2">
                {/* Read aloud is how a parent takes the briefing at 06:30 with
                    their hands full, so it leads on the phone and Regenerate
                    demotes itself to a text link. */}
                <Button variant="outline" size="sm" onClick={toggleSpeech} aria-pressed={speaking}>
                    {speaking ? <Pause size={14} aria-hidden="true" /> : <Volume2 size={14} aria-hidden="true" />}
                    {speaking ? "Stop" : speakLabel}
                </Button>
                {controls === "full" && (
                    <button type="button" onClick={() => void generate()} disabled={busy} className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted underline-offset-4 hover:text-ink hover:underline disabled:opacity-50">
                        <RefreshCw size={13} className={cn(busy && "animate-spin")} aria-hidden="true" /> Regenerate
                    </button>
                )}
                {controls === "full" && (
                <details className="w-full text-xs text-caption md:w-auto">
                    <summary className="cursor-pointer font-semibold">What this was written from</summary>
                    <ul className="mt-2 flex flex-wrap gap-1.5" aria-label="What this was written from">
                        {sources.map((src) => (
                            <li key={src}>
                                <SourceChip>{src}</SourceChip>
                            </li>
                        ))}
                    </ul>
                    <p className="mt-2 leading-5">
                        {cached?.kind === "ai"
                            ? `Written by the companion ${relative(cached.generatedAt)}.`
                            : `Written from your own data${note ? ` — ${note.toLowerCase()}` : ""}: the same diary, the same jobs, the same week focus.`}
                    </p>
                </details>
                )}
            </div>
        </div>
    );
}
