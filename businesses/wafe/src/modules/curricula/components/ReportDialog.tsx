import { useMemo, useState } from "react";
import { Printer } from "lucide-react";
import type { Member, Space } from "@/data/core";
import { longDate } from "@/lib/format";
import { Dialog } from "@/components/ui/overlay";
import { Button } from "@/components/ui/primitives";
import { Notice } from "@/components/shared";
import { ScorePill } from "./pieces";
import { termReport } from "../derive";
import type { Badge, CurriculaState } from "../types";

/**
 * The term report — and the one place this module prints.
 *
 * "Export to PDF" is the browser's own print-to-PDF, driven from a hidden
 * iframe: no dependency, no server round trip, and the family gets the file
 * their school or local authority actually asks for. The printed sheet carries
 * exactly what the screen shows — subjects, averages, the letter, the parent's
 * comment on each subject, badges earned and milestones — on the family's own
 * letterhead.
 */

const esc = (s: string): string => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] ?? c);

export function ReportDialog({ open, onClose, state, child, space, terms, defaultTerm }: { open: boolean; onClose: () => void; state: CurriculaState; child: Member; space: Space; terms: string[]; defaultTerm: string }) {
    const [term, setTerm] = useState(defaultTerm);
    const [printed, setPrinted] = useState<string | null>(null);
    const report = useMemo(() => termReport(state, child.id, term), [state, child.id, term]);
    const badgeOf = (id: string): Badge | undefined => state.badges.find((b) => b.id === id);

    const printIt = () => {
        const rows = report.rows
            .map(
                (r) => `<tr>
                    <td class="s">${esc(r.subject.name)}<span class="n">${esc(r.subject.note || r.subject.term)}</span></td>
                    <td class="c">${r.average.graded ? `${r.average.avg}%` : "—"}</td>
                    <td class="c">${esc(r.letter)}</td>
                    <td class="c">${r.average.graded} of ${r.average.total}</td>
                    <td>${esc(r.comment || "—")}</td>
                </tr>`,
            )
            .join("");
        const badges = report.badges
            .map((a) => {
                const b = badgeOf(a.badgeId);
                return b ? `<li><strong>${esc(b.icon)} ${esc(b.name)}</strong> ${esc(a.level)}${a.note ? ` — ${esc(a.note)}` : ""}</li>` : "";
            })
            .join("");
        const milestones = report.milestones.map((m) => `<li><strong>${esc(m.title)}</strong> — ${m.progressPct}%${m.achievedAt ? ` (reached ${esc(m.achievedAt)})` : ""}</li>`).join("");

        const html = `<!doctype html><html lang="en-GB"><head><meta charset="utf-8"><title>${esc(child.name)} — ${esc(term || "term report")}</title>
<style>
  @page { margin: 18mm; }
  body { font: 12pt/1.5 Georgia, "Iowan Old Style", serif; color: #1f2320; }
  header { border-bottom: 2px solid #3e4a3a; padding-bottom: 10px; margin-bottom: 18px; }
  h1 { font-size: 22pt; margin: 0 0 2px; }
  .sub { font-size: 10pt; color: #5f675b; }
  h2 { font-size: 13pt; margin: 22px 0 8px; }
  table { width: 100%; border-collapse: collapse; font-size: 10.5pt; }
  th { text-align: left; font-size: 9pt; text-transform: uppercase; letter-spacing: .06em; color: #5f675b; border-bottom: 1px solid #d3cab9; padding: 6px 8px; }
  td { border-bottom: 1px solid #e6dfd2; padding: 8px; vertical-align: top; }
  td.c { text-align: center; white-space: nowrap; }
  td.s { font-weight: 700; white-space: nowrap; }
  .n { display: block; font-weight: 400; font-size: 9pt; color: #7e8574; }
  .overall { margin-top: 16px; padding: 10px 14px; background: #e6eae1; font-size: 12pt; }
  ul { margin: 0; padding-left: 18px; font-size: 10.5pt; }
  li { margin-bottom: 4px; }
  footer { margin-top: 28px; font-size: 9pt; color: #7e8574; border-top: 1px solid #e6dfd2; padding-top: 8px; }
</style></head><body>
<header>
  <h1>${esc(child.name)}</h1>
  <div class="sub">${esc(term || "Term report")} · ${esc(space.name)} · ${esc(longDate(new Date()))}</div>
</header>
<h2>Subjects</h2>
<table><thead><tr><th>Subject</th><th class="c">Average</th><th class="c">Grade</th><th class="c">Marked</th><th>Comment</th></tr></thead>
<tbody>${rows || `<tr><td colspan="5">No subjects recorded for this term.</td></tr>`}</tbody></table>
<div class="overall"><strong>Overall: ${report.overall.graded ? `${report.overall.avg}% · ${esc(report.letter)}` : "not marked yet"}</strong> — across ${report.overall.graded} marked piece${report.overall.graded === 1 ? "" : "s"} of work.</div>
${badges ? `<h2>Badges earned</h2><ul>${badges}</ul>` : ""}
${milestones ? `<h2>Milestones</h2><ul>${milestones}</ul>` : ""}
<footer>Prepared in Wàfè for ${esc(space.name)}. ${esc(space.mission.split(".")[0])}.</footer>
</body></html>`;

        const frame = document.createElement("iframe");
        frame.setAttribute("title", "Term report");
        frame.style.position = "fixed";
        frame.style.right = "0";
        frame.style.bottom = "0";
        frame.style.width = "0";
        frame.style.height = "0";
        frame.style.border = "0";
        document.body.appendChild(frame);
        const doc = frame.contentDocument;
        if (!doc || !frame.contentWindow) {
            document.body.removeChild(frame);
            setPrinted("This browser wouldn't open the print sheet.");
            return;
        }
        doc.open();
        doc.write(html);
        doc.close();
        const win = frame.contentWindow;
        const go = () => {
            win.focus();
            win.print();
            window.setTimeout(() => frame.remove(), 1000);
        };
        if (doc.readyState === "complete") go();
        else frame.onload = go;
        setPrinted("Your browser's print dialog is open — choose “Save as PDF”.");
    };

    return (
        <Dialog open={open} onClose={onClose} title={`${child.name.split(" ")[0]}'s term report`} wide>
            <div className="flex flex-col gap-4">
                <div className="flex flex-wrap items-center gap-2">
                    {terms.map((t) => (
                        <button key={t} type="button" aria-pressed={t === term} onClick={() => setTerm(t)} className={t === term ? "h-9 rounded-full bg-ink px-4 text-sm font-semibold text-white" : "h-9 rounded-full bg-page px-4 text-sm font-semibold text-muted"}>
                            {t || "All terms"}
                        </button>
                    ))}
                    <Button type="button" variant="outline" size="md" onClick={printIt} className="ml-auto">
                        <Printer size={15} aria-hidden="true" /> Export to PDF
                    </Button>
                </div>

                {printed && <Notice tone="info">{printed}</Notice>}

                <div className="overflow-x-auto rounded-lg border border-line">
                    <table className="w-full min-w-[520px] text-left text-sm">
                        <thead>
                            <tr className="border-b border-line bg-page">
                                <th scope="col" className="px-3 py-2 font-semibold">
                                    Subject
                                </th>
                                <th scope="col" className="px-3 py-2 font-semibold">
                                    Average
                                </th>
                                <th scope="col" className="px-3 py-2 font-semibold">
                                    Marked
                                </th>
                                <th scope="col" className="px-3 py-2 font-semibold">
                                    Comment
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {report.rows.map((r) => (
                                <tr key={r.subject.id} className="border-b border-line last:border-0 align-top">
                                    <td className="px-3 py-2.5 font-semibold">{r.subject.name}</td>
                                    <td className="px-3 py-2.5">{r.average.graded ? <ScorePill score={r.average.avg} letter={r.letter} /> : <span className="text-caption">—</span>}</td>
                                    <td className="px-3 py-2.5 tabular-nums text-muted">
                                        {r.average.graded} of {r.average.total}
                                    </td>
                                    <td className="px-3 py-2.5 text-muted">{r.comment || "—"}</td>
                                </tr>
                            ))}
                            {report.rows.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="px-3 py-6 text-center text-muted">
                                        No subjects recorded for this term yet.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="rounded-lg bg-brand-soft px-4 py-3 text-md text-brand-ink">
                    <strong>Overall: {report.overall.graded ? `${report.overall.avg}% · ${report.letter}` : "not marked yet"}</strong> — across {report.overall.graded} marked piece{report.overall.graded === 1 ? "" : "s"} of work.
                </div>

                {report.badges.length > 0 && (
                    <div>
                        <h3 className="mb-2 text-md font-semibold">Badges earned</h3>
                        <ul className="flex flex-wrap gap-2">
                            {report.badges.map((a) => {
                                const b = badgeOf(a.badgeId);
                                if (!b) return null;
                                return (
                                    <li key={a.id} className="inline-flex items-center gap-2 rounded-full bg-live-soft px-3 py-1.5 text-sm font-medium text-live-ink">
                                        <span aria-hidden="true">{b.icon}</span> {b.name} · {a.level}
                                    </li>
                                );
                            })}
                        </ul>
                    </div>
                )}

                <div className="flex justify-end">
                    <Button variant="ghost" onClick={onClose}>
                        Close
                    </Button>
                </div>
            </div>
        </Dialog>
    );
}
