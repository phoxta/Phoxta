import { useState } from "react";
import { useDialog } from "@/lib/ops/useDialog";
import type { DossierContext } from "@/lib/db/dossier";

/**
 * The six questions.
 *
 * Six, and not one more. Every extra question costs completion, and a dossier
 * written from four answers is worth incomparably more than a perfect brief
 * nobody finishes. Each one earns its place by changing what the model can
 * actually say: where they trade changes the competitors and the delivery
 * costs; the slice of market changes the pricing; the budget changes which
 * launch channels are even available; what they already have changes the first
 * ninety days more than anything else on the list.
 *
 * Nothing here is required. A blank answer is a real answer — it means "you
 * decide" — and blocking the button until all six are filled would turn a
 * two-minute job into an abandoned form.
 *
 * The location is prefilled from the business's own Settings when it is there.
 * Asking someone for an address they have already given the same console reads
 * as a form rather than as software that knows them.
 */

const BUDGETS = [
  "Under £1,000",
  "£1,000 – £5,000",
  "£5,000 – £15,000",
  "£15,000 – £50,000",
  "More than £50,000",
];

const TIMELINES = [
  "Already trading",
  "Within a month",
  "One to three months",
  "Three to six months",
  "Later than that",
];

export default function ContextDialog({
  initial,
  prefillLocation,
  busy,
  onCancel,
  onSubmit,
}: {
  initial: DossierContext;
  /** From the business's own profile — the address or region already on record. */
  prefillLocation: string;
  busy: boolean;
  onCancel: () => void;
  onSubmit: (context: DossierContext) => void;
}) {
  const [c, setC] = useState<DossierContext>({
    ...initial,
    location: initial.location || prefillLocation,
  });
  const ref = useDialog<HTMLDivElement>(() => { if (!busy) onCancel(); });

  const set = (k: keyof DossierContext) => (v: string) => setC((p) => ({ ...p, [k]: v }));
  const answered = Object.values(c).filter((v) => v.trim()).length;

  return (
    <div className="bdx-scrim" role="presentation" onMouseDown={() => { if (!busy) onCancel(); }}>
      <div
        className="bdx-dlg"
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby="bdx-dlg-title"
        tabIndex={-1}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <h2 id="bdx-dlg-title">Make this one yours</h2>
        <p className="bdx-dlg__lede">
          Six questions, none of them required. Answer what you know and we will rewrite every section
          — the market, the competitors, the pricing, the launch plan, the numbers — around your
          answers instead of the general picture. The shared version stays where it is; you can switch
          back to it at any time.
        </p>

        <label className="bdx-dlg__q">
          <span>Where will you be trading?</span>
          <small>The town or city, and how far you are willing to serve or deliver.</small>
          <input
            className="form-control"
            value={c.location}
            onChange={(e) => set("location")(e.target.value)}
            placeholder="e.g. Leeds, delivering across West Yorkshire"
          />
        </label>

        <label className="bdx-dlg__q">
          <span>Which slice of this market are you going for?</span>
          <small>The narrower the better. "Everyone" is the one answer that makes this harder.</small>
          <textarea
            className="form-control"
            rows={2}
            value={c.market}
            onChange={(e) => set("market")(e.target.value)}
            placeholder="e.g. secondhand designer womenswear, sized 16 and up"
          />
        </label>

        <label className="bdx-dlg__q">
          <span>Who is your customer?</span>
          <small>Describe one real person you expect to buy from you, not a demographic.</small>
          <textarea
            className="form-control"
            rows={2}
            value={c.customer}
            onChange={(e) => set("customer")(e.target.value)}
            placeholder="e.g. women in their thirties who shop resale on Instagram and hate returns"
          />
        </label>

        <label className="bdx-dlg__q">
          <span>What can you put in to get going?</span>
          <small>Beyond what you paid for the business. It decides which launch options are real.</small>
          <select className="form-select" value={c.budget} onChange={(e) => set("budget")(e.target.value)}>
            <option value="">Rather not say</option>
            {BUDGETS.map((b) => <option key={b} value={b}>{b}</option>)}
          </select>
        </label>

        <label className="bdx-dlg__q">
          <span>When do you want to be open?</span>
          <select className="form-select" value={c.timeline} onChange={(e) => set("timeline")(e.target.value)}>
            <option value="">Not decided</option>
            {TIMELINES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </label>

        <label className="bdx-dlg__q">
          <span>What have you already got?</span>
          <small>Stock, a supplier, premises, a van, a following, a trade you already know. This changes the first ninety days more than anything else here.</small>
          <textarea
            className="form-control"
            rows={2}
            value={c.assets}
            onChange={(e) => set("assets")(e.target.value)}
            placeholder="e.g. 200 pieces already sourced, and 4,000 followers on Instagram"
          />
        </label>

        <div className="bdx-dlg__foot">
          <span className="bdx-dlg__lede mb-0 me-auto">{answered} of 6 answered</span>
          <button type="button" className="hrx-pill" onClick={onCancel} disabled={busy}>
            Cancel
          </button>
          <button type="button" className="hrx-pill dark" onClick={() => onSubmit(c)} disabled={busy || answered === 0}>
            {busy ? "Starting…" : "Write my version"}
          </button>
        </div>
      </div>
    </div>
  );
}
