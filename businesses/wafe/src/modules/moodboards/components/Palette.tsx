import { useState } from "react";
import { Palette as PaletteIcon, Sparkles } from "lucide-react";
import { useAi } from "@/lib/ai";
import { useSpace } from "@/state/space";
import { Notice } from "@/components/shared";
import { Button } from "@/components/ui/primitives";
import { paletteOf, pinsOf } from "../derive";
import { namedColour } from "../library";
import type { Board, MoodboardsState } from "../types";

/**
 * "Suggest a colour palette from this board."
 *
 * The board already knows its own colours — every pin carries a swatch — so
 * the card is never empty and never waits on a model: it shows what is there,
 * and the companion is an upgrade on top of it. The answer is grounded in the
 * pins' own titles and notes, and the sources are named underneath, because
 * every answer in Wàfè says what it looked at.
 */

const HEX = /#[0-9a-f]{6}\b/gi;

export function PaletteCard({ board, state }: { board: Board; state: MoodboardsState }) {
    const { ask, busy, available } = useAi();
    const { role } = useSpace();
    const [text, setText] = useState<string>("");
    const [hexes, setHexes] = useState<string[]>([]);
    const [note, setNote] = useState<string | null>(null);

    const own = paletteOf(state, board.id, 6);
    const pins = pinsOf(state, board.id);
    const swatches = hexes.length ? hexes.map((hex) => ({ hex, name: namedColour(hex), n: 0 })) : own;

    const run = async () => {
        setNote(null);
        try {
            const res = await ask<{ colours?: Array<{ hex?: string }> }>({
                action: "ask",
                prompt: `Suggest a colour palette of five colours for the moodboard "${board.title}". Give each colour a name and a hex code, then one sentence on where to use it. Base it only on the pins listed.`,
                extraContext: [
                    `Board: ${board.title} (${board.kind}). ${board.description}`,
                    `Pins: ${pins
                        .slice(0, 24)
                        .map((p) => `${p.title}${p.note ? ` — ${p.note}` : ""}${p.colour ? ` [${p.colour}]` : ""}`)
                        .join("; ")}`,
                ].join("\n"),
            });
            if (res.unavailable) {
                setNote(res.unavailable);
                return;
            }
            setText(res.text);
            setHexes([...new Set((res.text.match(HEX) ?? []).map((h) => h.toLowerCase()))].slice(0, 6));
        } catch {
            setNote("The companion couldn't answer just now. The colours below are the ones already on your pins.");
        }
    };

    return (
        <section className="rounded-xl bg-card p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
                <h2 className="flex items-center gap-2 font-display text-xl">
                    <PaletteIcon size={17} aria-hidden="true" /> Colour
                </h2>
                {role !== "guest" && (
                    <Button size="sm" variant="outline" loading={busy} onClick={() => void run()} disabled={!pins.length}>
                        <Sparkles size={13} aria-hidden="true" /> Suggest a palette
                    </Button>
                )}
            </div>

            {swatches.length ? (
                <ul className="flex flex-wrap gap-2">
                    {swatches.map((sw) => (
                        <li key={sw.hex} className="w-20">
                            <span className="block h-14 w-full rounded-sm border border-line" style={{ background: sw.hex }} aria-hidden="true" />
                            <span className="mt-1 block text-2xs font-semibold">{sw.name}</span>
                            <span className="block text-[10px] uppercase tracking-[0.06em] text-caption">{sw.hex}</span>
                        </li>
                    ))}
                </ul>
            ) : (
                <p className="text-sm text-muted">Pin a few pictures and the board's colours will show up here.</p>
            )}

            {text && <p className="mt-3 whitespace-pre-wrap text-sm leading-[20px] text-muted">{text}</p>}
            {text && (
                <p className="mt-2 text-2xs text-caption">
                    I used {Math.min(pins.length, 24)} pin{pins.length === 1 ? "" : "s"} from this board and nothing else.
                </p>
            )}
            {note && (
                <Notice tone="info" className="mt-3">
                    {note}
                </Notice>
            )}
            {!available && !note && <p className="mt-3 text-2xs text-caption">The companion isn't configured in this build — the swatches above come straight from your pins.</p>}
        </section>
    );
}
