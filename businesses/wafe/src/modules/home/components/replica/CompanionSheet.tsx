import { Send } from "lucide-react";
import { cn } from "@/lib/cn";
import { initials } from "@/lib/format";
import { useSpace } from "@/state/space";
import { Sprig } from "@/components/brand";
import { Lite, useCompanionThread, type Chip, type CompanionThreadApi } from "@/components/companion/CompanionDrawer";
import { Notice } from "@/components/shared";

/**
 * The chat sheet on Home: the companion, inline.
 *
 * It is the same conversation as the "Ask Wàfè" drawer — one thread per
 * member, the same send, the same grounding, the same bubbles (Wàfè on white,
 * me on olive) — laid out as the reference's right-hand panel: a title, the
 * thread, a row of picture tiles where the drawer has chips, and a round
 * composer. The sheet is fixed beside the page, so it has no close; clearing
 * the thread is the drawer's job, and the two share it.
 *
 * A tile is either a chip (it asks the companion) or a local action (it reads
 * the verse aloud, it opens the check-in). Either way it is one tap. Nothing
 * here degrades the page: no backend, no allowance and a failed call all
 * render as a Notice under the thread.
 */

export interface SheetTile {
    key: string;
    label: string;
    image: string;
    chip?: Chip;
    onSelect?: (t: CompanionThreadApi) => void;
}

const HUE_CLASS: Record<string, string> = {
    lilac: "bg-lilac-soft text-lilac",
    sky: "bg-sky-soft text-sky",
    peach: "bg-peach-soft text-peach",
    rose: "bg-rose-soft text-rose",
    mint: "bg-mint-soft text-mint",
    plum: "bg-plum-soft text-plum",
};

export function CompanionSheet({ title = "Ask Wàfè", tiles }: { title?: string; tiles: SheetTile[] }) {
    const { me } = useSpace();
    const t = useCompanionThread(true);
    const { thread, draft, setDraft, busy, available, unavailable, error, dismissError, send, submit, onKey, inputRef, endRef, role, first } = t;
    const placeholder = role === "child" ? "Ask me anything…" : "Ask about the week, the budget, a lesson…";

    return (
        <section className="hr-sheet bg-card" aria-label={title}>
            <div className="hr-sheet__head">
                <h2 className="hr-sheet__title">{title}</h2>
            </div>

            <div className="hr-thread" role="log" aria-live="polite" aria-label="Conversation with Wàfè">
                {thread.length === 0 && !busy && <p className="hr-thread__empty">{role === "child" ? "Tap a picture below, or ask me anything." : "Ask a question, or start with one of the suggestions below."}</p>}
                {thread.map((m) =>
                    m.from === "me" ? (
                        <div key={m.id} className="hr-msg hr-msg--me">
                            <div className="hr-bubble rounded-xl bg-brand text-white">{m.text}</div>
                            <span className={cn("hr-avatar", HUE_CLASS[me.hue] ?? "bg-brand-soft text-brand")} aria-hidden="true">
                                {me.avatarUrl ? <img src={me.avatarUrl} alt="" loading="lazy" width={49} height={49} /> : initials(me.name)}
                            </span>
                        </div>
                    ) : (
                        <div key={m.id} className="hr-msg hr-msg--wafe">
                            <span className="hr-avatar hr-avatar--wafe bg-page text-brand" aria-hidden="true">
                                <Sprig strokeWidth={2} />
                            </span>
                            <div className="hr-bubble bg-card rounded-xl">
                                <Lite text={m.text} className="hr-lite" />
                            </div>
                        </div>
                    ),
                )}
                {busy && (
                    <div className="hr-msg hr-msg--wafe" role="status" aria-label="Wàfè is thinking">
                        <span className="hr-avatar hr-avatar--wafe bg-page text-brand" aria-hidden="true">
                            <Sprig strokeWidth={2} />
                        </span>
                        <div className="hr-bubble bg-card rounded-xl">
                            <span className="hr-thinking" aria-hidden="true">
                                <span className="animate-bounce [animation-delay:-0.3s]" />
                                <span className="animate-bounce [animation-delay:-0.15s]" />
                                <span className="animate-bounce" />
                            </span>
                        </div>
                    </div>
                )}
                <div ref={endRef} />
            </div>

            <div className="hr-sheet__notices">
                {!available && <Notice tone="info">The companion needs the backend to be configured for this build. Everything else still works.</Notice>}
                {/* With no backend at all, the per-call notice would only repeat the one above. */}
                {unavailable && available && <Notice tone="info">{unavailable}</Notice>}
                {error && !busy && (
                    <Notice tone="danger">
                        {error}{" "}
                        <button type="button" onClick={dismissError} className="font-semibold underline underline-offset-4">
                            Dismiss
                        </button>
                    </Notice>
                )}
            </div>

            <ul className="hr-tiles" aria-label="Suggestions">
                {tiles.map((tile) => (
                    <li key={tile.key}>
                        <button
                            type="button"
                            className="hr-tile"
                            disabled={busy && Boolean(tile.chip)}
                            onClick={() => {
                                if (tile.chip) void send(tile.chip);
                                else tile.onSelect?.(t);
                            }}
                        >
                            {/* Just the picture, with the app's cover hover; no card behind it. */}
                            <span className="hr-tile__img wf-zoom rounded-lg" aria-hidden="true">
                                <img src={tile.image} alt="" width={103} height={76} loading="lazy" />
                            </span>
                            <span className="hr-tile__label">{tile.label}</span>
                        </button>
                    </li>
                ))}
            </ul>

            <form onSubmit={submit} className="hr-composer rounded-full bg-page">
                <label htmlFor="home-companion-input" className="sr-only">
                    Ask Wàfè
                </label>
                <textarea id="home-companion-input" ref={inputRef} rows={1} value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={onKey} placeholder={placeholder} aria-describedby="home-companion-hint" />
                <span id="home-companion-hint" className="sr-only">
                    Enter to send, Shift+Enter for a new line. Wàfè only sees what {first} can see.
                </span>
                <button type="submit" disabled={busy || !draft.trim()} className="hr-send bg-card rounded-full wf-lift" aria-label="Send">
                    <Send strokeWidth={2} aria-hidden="true" />
                </button>
            </form>
        </section>
    );
}
