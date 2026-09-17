import { useEffect } from "react";
import { Printer, X } from "lucide-react";
import { money, longDate } from "@/lib/format";
import { useSpace } from "@/state/space";
import { Button, IconButton } from "@/components/ui/primitives";
import { boardStats, pinsOf, sectionsOf } from "../derive";
import { CACHE_LABEL, KIND_LABEL } from "../types";
import type { Board, MoodboardsState } from "../types";

/**
 * Export the board as a PDF (AC 5).
 *
 * There is no PDF library in this app and there isn't going to be one: the
 * browser already has an excellent one behind Print → Save as PDF, and it
 * renders the same fonts and the same pictures the family has been looking
 * at. So the "export" is a real, complete sheet — EVERY pin, its note, its
 * price, its tags, who added it and where it came from — laid out for A4, and
 * a print stylesheet that hides the rest of the app while it prints.
 *
 * Nothing is hidden from the sheet that is on the board: a board with fifty
 * pins prints fifty pins.
 */

const PRINT_CSS = `
@media print {
  body { visibility: hidden !important; background: #fff !important; }
  #wf-print-sheet, #wf-print-sheet * { visibility: visible !important; }
  #wf-print-sheet {
    position: absolute !important; inset: 0 auto auto 0;
    width: 100%; padding: 0; margin: 0; background: #fff !important;
    overflow: visible !important; max-height: none !important;
  }
  #wf-print-sheet .wf-no-print { display: none !important; }
  #wf-print-sheet .wf-pin { break-inside: avoid; page-break-inside: avoid; }
  @page { size: A4; margin: 14mm; }
}
`;

export function PrintSheet({ board, state, onClose }: { board: Board; state: MoodboardsState; onClose: () => void }) {
    const { space, members } = useSpace();
    const pins = pinsOf(state, board.id);
    const sections = sectionsOf(state, board.id);
    const stats = boardStats(state, board.id);
    const nameOf = (id: string) => members.find((m) => m.id === id)?.name ?? "Someone";

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [onClose]);

    const groups: Array<{ title: string; pins: typeof pins }> = [
        { title: "", pins: pins.filter((p) => !p.sectionId) },
        ...sections.map((s) => ({ title: s.title, pins: pins.filter((p) => p.sectionId === s.id) })),
    ].filter((g) => g.pins.length);

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-page" role="dialog" aria-modal="true" aria-label={`${board.title} — export`}>
            <style>{PRINT_CSS}</style>
            <div id="wf-print-sheet" className="mx-auto max-w-3xl px-5 py-6">
                <div className="wf-no-print mb-5 flex flex-wrap items-center justify-between gap-3">
                    <p className="text-sm text-muted">
                        Every pin on this board, with its note. Print it, or choose <strong>Save as PDF</strong> in the print dialog.
                    </p>
                    <div className="flex items-center gap-2">
                        <Button variant="brand" onClick={() => window.print()}>
                            <Printer size={15} aria-hidden="true" /> Print / Save as PDF
                        </Button>
                        <IconButton label="Close" size="md" onClick={onClose}>
                            <X size={16} />
                        </IconButton>
                    </div>
                </div>

                <header className="mb-6 border-b border-line pb-4">
                    <p className="text-2xs font-semibold uppercase tracking-[0.1em] text-caption">
                        {space.name} · {KIND_LABEL[board.kind]} board
                    </p>
                    <h1 className="mt-1 font-display text-7xl leading-9">{board.title}</h1>
                    {board.description && <p className="mt-1.5 max-w-2xl text-md leading-6 text-muted">{board.description}</p>}
                    <p className="mt-2 text-xs text-caption">
                        {stats.pins} pin{stats.pins === 1 ? "" : "s"}
                        {stats.priced ? ` · ${stats.priced} priced, ${money(stats.totalCents, space.currency)} in total` : ""} · kept by {nameOf(board.ownerMemberId)} · printed {longDate(new Date())}
                    </p>
                </header>

                {groups.map((g, gi) => (
                    <section key={g.title || `ungrouped-${gi}`} className="mb-6">
                        {g.title && <h2 className="mb-3 font-display text-[19px]">{g.title}</h2>}
                        <ul className="flex flex-col gap-4">
                            {g.pins.map((p, i) => (
                                <li key={p.id} className="wf-pin flex gap-4 border-b border-line pb-4">
                                    <img src={p.imageUrl} alt={p.title || "Pinned"} width={160} height={200} loading="lazy" className="h-[120px] w-[96px] shrink-0 rounded-sm object-cover" />
                                    <div className="min-w-0 flex-1">
                                        <p className="text-md font-semibold leading-5">
                                            {i + 1}. {p.title || "Untitled"}
                                            {p.priceCents !== null ? ` — ${money(p.priceCents, space.currency)}` : ""}
                                        </p>
                                        {p.note && <p className="mt-1 text-sm leading-[19px] text-muted">{p.note}</p>}
                                        {p.tags.length > 0 && <p className="mt-1 text-2xs uppercase tracking-[0.05em] text-caption">{p.tags.join(" · ")}</p>}
                                        <p className="mt-1 text-2xs text-caption">
                                            {nameOf(p.addedBy)} · {CACHE_LABEL[p.cachedFrom]}
                                            {p.sourceUrl ? ` · ${p.sourceUrl}` : ""}
                                        </p>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </section>
                ))}

                {!pins.length && <p className="text-md text-muted">This board has no pins yet, so there is nothing to print.</p>}
            </div>
        </div>
    );
}
