import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import PageMeta from "@/seo/PageMeta";
import { toastError } from "@/lib/ops/feedback";
import { getIdea, type Idea } from "@/lib/db/ideas";
import { buildPlanHtml } from "@/lib/ideas/plan";

/**
 * The business plan, full screen.
 *
 * Deliberately outside the dashboard shell. The deck is a 1280-wide document
 * meant to be read, printed and sent on — squeezing it into a content column
 * beside a sidebar would shrink every slide to make room for navigation nobody
 * needs while reading a plan. Studio's editor and preview take the same view.
 *
 * The deck renders inside an iframe rather than into this page. It carries its
 * own reset, its own font and its own `@page` rules, and it has to stay a
 * standalone file — the same string is what Download saves, so what a founder
 * sends an investor is exactly what they read here, not an approximation of it.
 */

const ln = { fill: "none", stroke: "currentColor", strokeWidth: 1.6, strokeLinecap: "round", strokeLinejoin: "round" } as const;
const I_BACK = <svg width="15" height="15" viewBox="0 0 24 24" {...ln} aria-hidden="true"><path d="M15 6l-6 6 6 6" /></svg>;
const I_PRINT = <svg width="15" height="15" viewBox="0 0 24 24" {...ln} aria-hidden="true"><path d="M6 9V3h12v6M6 18H4v-6h16v6h-2M8 14h8v7H8z" /></svg>;
const I_DOWN = <svg width="15" height="15" viewBox="0 0 24 24" {...ln} aria-hidden="true"><path d="M12 4v11m0 0 4-4m-4 4-4-4M5 20h14" /></svg>;

/** A filename that survives a downloads folder: no spaces, no punctuation a
 *  filesystem argues about, and the business's name still readable in it. */
function fileNameFor(title: string): string {
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);
  return `${slug || "business"}-plan.html`;
}

export default function IdeaPlanPage() {
  const { id = "" } = useParams();
  const [idea, setIdea] = useState<Idea | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const frame = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    let live = true;
    void (async () => {
      const { data, error: err } = await getIdea(id);
      if (!live) return;
      setIdea(data);
      setError(err ?? (data ? null : "That idea was not found."));
      setLoading(false);
    })();
    return () => { live = false; };
  }, [id]);

  const plan = useMemo(() => (idea ? buildPlanHtml(idea) : null), [idea]);

  function download() {
    if (!plan) return;
    const url = URL.createObjectURL(new Blob([plan.html], { type: "text/html;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = fileNameFor(plan.meta.title);
    document.body.appendChild(a);
    a.click();
    a.remove();
    // Revoked on the next tick rather than immediately: Safari has not started
    // reading the blob by the time click() returns.
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }

  function print() {
    const win = frame.current?.contentWindow;
    if (!win) {
      toastError("The plan is still loading.");
      return;
    }
    win.focus();
    win.print();
  }

  const planned = idea ? Object.keys((idea.ai_profile ?? {}).strategy ?? {}).length > 0 : false;

  return (
    <div className="idv-plan">
      <PageMeta title={idea ? `Phoxta - ${idea.title} plan` : "Phoxta - Business plan"} />

      <header className="idv-plan__bar">
        <Link to={`/dashboard/ideas/${id}`} className="at-btn common-black bg-transparent rounded-0 p-0">
          <span><span className="text-1">{I_BACK} BACK TO THE IDEA</span><span className="text-2">{I_BACK} BACK TO THE IDEA</span></span>
        </Link>

        <span className="fz-font-md neutral-500 text-truncate d-none d-md-block">
          {plan ? plan.meta.title : ""}
        </span>

        <div className="d-flex align-items-center gap-3">
          <button type="button" className="at-btn common-black bg-transparent rounded-0 p-0"
                  disabled={!plan} onClick={print}>
            <span><span className="text-1">{I_PRINT} PRINT / PDF</span><span className="text-2">{I_PRINT} PRINT / PDF</span></span>
          </button>
          <div className="at-btn-group">
            <button type="button" className="at-btn z-index-1" disabled={!plan} onClick={download}>
              <span><span className="text-1">{I_DOWN} DOWNLOAD</span><span className="text-2">{I_DOWN} DOWNLOAD</span></span>
            </button>
          </div>
        </div>
      </header>

      <div className="idv-plan__stage">
        {loading ? (
          <p className="fz-font-md neutral-500 p-5">Loading…</p>
        ) : !idea ? (
          <p className="fz-font-lg neutral-700 p-5">{error ?? "That idea was not found."}</p>
        ) : !planned ? (
          <div className="p-5">
            <h1 className="fz-font-2xl fw-600 neutral-900 mb-15">There is no plan yet</h1>
            <p className="fz-font-md neutral-500 mb-30">
              The business plan is written from the validation that comes before it. Run the
              steps on the idea and the deck builds itself from what they produce.
            </p>
            <div className="at-btn-group">
              <Link to={`/dashboard/ideas/${id}`} className="at-btn z-index-1">
                <span><span className="text-1">BACK TO THE IDEA</span><span className="text-2">BACK TO THE IDEA</span></span>
              </Link>
            </div>
          </div>
        ) : (
          <iframe
            ref={frame}
            title={plan?.meta.title ?? "Business plan"}
            srcDoc={plan?.html ?? ""}
            className="idv-plan__frame"
          />
        )}
      </div>
    </div>
  );
}
