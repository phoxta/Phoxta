import { useMemo } from "react";
import { Card } from "@/components/dash/Ui";
import { toastError } from "@/lib/ops/feedback";
import {
  DOCUMENTS, buildDocument, documentReady,
  type DocumentContext, type DocumentKind, type SectionMap,
} from "@/lib/dossier/documents";

/**
 * The documents, and the two things you can do with one.
 *
 * WHY THIS IS NOT JUST A DOWNLOAD BUTTON. A business plan is a thing you are
 * asked to SEND — to a bank, a landlord, an accountant, a supplier opening a
 * trade account. So each row offers Open (read it, print it, save it as a PDF
 * from the browser's own print dialog) and Download (the file itself). Print to
 * PDF is deliberately not reimplemented: every browser already does it properly,
 * page breaks and all, and the deck's stylesheet has the print rules for it.
 *
 * A document whose sections have not been written is NOT SHOWN. An empty deck
 * with a cover on it looks like a broken feature; an absent row looks like a
 * thing that is not ready, which is the truth.
 */

const I_DOC = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
       strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5" />
  </svg>
);

const I_DOWN = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
       strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 4v11m0 0 4-4m-4 4-4-4M5 20h14" />
  </svg>
);

export function DocumentsPanel({
  sections, brand, trade, mine, where, blueprintSlug, vertical,
}: {
  sections: SectionMap;
  brand: string;
  trade: string;
  mine: boolean;
  where?: string;
  blueprintSlug?: string | null;
  vertical?: string | null;
}) {
  const ctx: DocumentContext = useMemo(
    () => ({ brand, trade, mine, where: where || undefined, blueprintSlug, vertical }),
    [brand, trade, mine, where, blueprintSlug, vertical],
  );

  const ready = useMemo(
    () => DOCUMENTS.filter((d) => documentReady(d, sections)),
    [sections],
  );

  if (ready.length === 0) return null;

  /** Built on demand rather than up front: eleven decks is a lot of string work
   *  to do on every render for documents nobody has asked for yet. */
  function make(kind: DocumentKind) {
    const built = buildDocument(kind, sections, ctx);
    if (!built) toastError("There is not enough written yet to build that one.");
    return built;
  }

  function open(kind: DocumentKind) {
    const built = make(kind);
    if (!built) return;
    const url = URL.createObjectURL(new Blob([built.html], { type: "text/html;charset=utf-8" }));
    const w = window.open(url, "_blank", "noopener,noreferrer");
    if (!w) toastError("Your browser blocked the new tab — allow pop-ups for this site, or use Download.");
    // Revoked on a timer rather than immediately: the new tab has to finish
    // fetching the blob first, and revoking on the same tick gives a blank page.
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }

  function download(kind: DocumentKind) {
    const built = make(kind);
    if (!built) return;
    const url = URL.createObjectURL(new Blob([built.html], { type: "text/html;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = built.meta.fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <Card title="Documents">
      <p className="dsn-note" style={{ marginTop: 0 }}>
        Built from what is written above{mine ? ", against your own answers" : " for this trade in general"}.
        Open one to read or print it — your browser&rsquo;s print dialog saves it as a PDF.
      </p>
      <div className="bdx-docs">
        {ready.map((d) => (
          <article key={d.kind} className="bdx-doc">
            <div style={{ minWidth: 0 }}>
              <h4 className="bdx-doc__name">{d.name}</h4>
              <p className="bdx-doc__why">{d.purpose}</p>
            </div>
            <div className="bdx-doc__acts">
              <button type="button" className="hrx-seeall" onClick={() => open(d.kind)}>
                {I_DOC}Open
              </button>
              <button type="button" className="hrx-seeall" onClick={() => download(d.kind)}>
                {I_DOWN}Download
              </button>
            </div>
          </article>
        ))}
      </div>
    </Card>
  );
}
