import { useEffect, useRef, useState } from "react";
import { Card } from "@/components/dash/Ui";
import { toastError } from "@/lib/ops/feedback";
import { createDesign, generateDesign, type Design } from "@/lib/db/designs";
import { getTemplate } from "@/lib/designs/templates";
import { emptyDoc, type DesignDoc, type TextSlot } from "@/lib/designs/types";
import { TemplatePicker } from "./TemplatePicker";

/**
 * The two ways to start a graphic.
 *
 * Both are buttons that open a dialog, and both used to be neither: the brief
 * box sat permanently across the top of the page and the eighteen layouts sat
 * open below it, between you and the library of work you had already made —
 * which is what the page is actually for. You describe a post once and pick a
 * layout once; the saved work is what you come back to.
 *
 * Lifted out of DesignsPage so it can be rendered on its own: that file also
 * pulls in the background remover, which drags a WebAssembly runtime behind it
 * and cannot be bundled for a test.
 */

// Copied rather than imported: DesignsPage imports this file, so reaching back
// into it for two icons would close a cycle. Same paths, same stroke.
const ln = { fill: "none", stroke: "currentColor", strokeWidth: 1.7, strokeLinecap: "round", strokeLinejoin: "round" } as const;
const I_SPARK = <svg width="16" height="16" viewBox="0 0 24 24" {...ln} aria-hidden="true"><path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M18 6l-2.5 2.5M8.5 15.5 6 18" /></svg>;
const I_PLUS = <svg width="16" height="16" viewBox="0 0 24 24" {...ln} aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>;

export function NewDesign({ orgId, onMade }: { orgId: string; onMade: (d: Design) => void }) {
  const [brief, setBrief] = useState("");
  const [busy, setBusy] = useState(false);
  /** The layout picker. Behind a button because eighteen layouts open on the
   *  page pushed the library of saved work off the bottom of the screen. */
  const [picking, setPicking] = useState(false);
  /** The brief box, for the same reason. */
  const [briefing, setBriefing] = useState(false);

  async function fromTemplate(templateId: string) {
    const t = getTemplate(templateId);
    const { data, error } = await createDesign(orgId, {
      title: t ? `${t.name} post` : "New post",
      templateId,
      doc: emptyDoc(templateId),
    });
    if (error || !data) return toastError(error ?? "Could not create that post.");
    onMade(data);
  }

  async function fromBrief() {
    const text = brief.trim();
    if (!text) return toastError("Say what the post should be about.");
    setBusy(true);
    const { data, error } = await generateDesign(orgId, text);
    if (error || !data) { setBusy(false); return toastError(error ?? "The agent could not write that."); }

    const doc: DesignDoc = {
      templateId: data.templateId,
      content: data.content as Partial<Record<TextSlot, string>>,
      images: data.images as DesignDoc["images"],
      palette: data.palette as DesignDoc["palette"],
    };
    const { data: row, error: err2 } = await createDesign(orgId, {
      title: data.title, templateId: data.templateId, doc, brief: text,
    });
    setBusy(false);
    if (err2 || !row) return toastError(err2 ?? "Could not save that post.");
    setBrief("");
    setBriefing(false);
    onMade(row);
  }

  return (
    <>
      <div className="dsn-start">
        <button type="button" className="dsn-btn dsn-btn--solid" onClick={() => setBriefing(true)} disabled={busy}>
          {I_SPARK}{busy ? "Writing…" : "Create New"}
        </button>
        <button type="button" className="dsn-btn" onClick={() => setPicking(true)} disabled={busy}>
          {I_PLUS}Templates
        </button>
      </div>

      {briefing && (
        <BriefDialog
          busy={busy}
          value={brief}
          onChange={setBrief}
          onClose={() => setBriefing(false)}
          onGo={() => void fromBrief()}
        />
      )}

      {picking && (
        <TemplatePicker
          onPick={(id) => { setPicking(false); void fromTemplate(id); }}
          onClose={() => setPicking(false)}
        />
      )}
    </>
  );
}

/** Describe the post and let the agent write it. A dialog rather than a box on
 *  the page, so the library of saved work is the first thing on screen. */
function BriefDialog({ busy, value, onChange, onClose, onGo }: {
  busy: boolean;
  value: string;
  onChange: (v: string) => void;
  onClose: () => void;
  onGo: () => void;
}) {
  const field = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    field.current?.focus();
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape" && !busy) onClose(); };
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [onClose, busy]);

  return (
    <div className="dsn-modal" role="dialog" aria-modal="true" aria-label="Describe the post"
         onPointerDown={(e) => { if (e.target === e.currentTarget && !busy) onClose(); }}>
      <div className="dsn-modal__box dsn-brief-dlg">
        <h3 className="dsn-picker__t">Create a post</h3>
        <p className="dsn-note">
          Say what it should be about and the agent picks a layout, writes the words and finds the
          pictures. You can change any of it afterwards.
        </p>
        <textarea
          ref={field}
          className="hrx-input dsn-input dsn-brief-dlg__in"
          rows={3}
          placeholder="e.g. “we cut delivery times to 15 minutes, aimed at busy parents”"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          // Enter sends; a brief is one sentence, and reaching for the mouse to
          // submit a one-line form is the kind of friction that stops people
          // using it. Shift+Enter still breaks the line.
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onGo(); } }}
          disabled={busy}
        />
        <div className="dsn-brief-dlg__acts">
          <button type="button" className="dsn-btn" onClick={onClose} disabled={busy}>Cancel</button>
          <button type="button" className="dsn-btn dsn-btn--solid" onClick={onGo} disabled={busy}>
            {I_SPARK}{busy ? "Writing…" : "Write it for me"}
          </button>
        </div>
        <p className="dsn-note mb-0">
          Prefer to start from a layout and fill it in yourself? Close this and press Templates.
        </p>
      </div>
    </div>
  );
}
