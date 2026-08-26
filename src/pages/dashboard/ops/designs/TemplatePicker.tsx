import { useEffect, useMemo, useRef, useState } from "react";
import { DesignSvg } from "@/lib/designs/render";
import { TEMPLATES } from "@/lib/designs/templates";
import { emptyDoc } from "@/lib/designs/types";

/**
 * Choosing a layout.
 *
 * The eighteen layouts used to sit open on the graphics page, below the brief
 * box. They are the least-used thing there — you pick one once per post and
 * never look at them again — and they pushed the actual library of saved work
 * off the bottom of the screen. So they live behind a button.
 *
 * The tiles are the real renderer at thumbnail size, not screenshots, so a
 * template that changes shows its change here without anyone re-exporting an
 * image. Each carries the sentence describing what it is FOR, because "Proof"
 * and "Statement" do not tell you which one to reach for — and it is the same
 * sentence the agent is given when it picks a layout, so a person and the
 * model are choosing on the same information.
 */
export function TemplatePicker({ onPick, onClose }: {
  onPick: (templateId: string) => void;
  onClose: () => void;
}) {
  const [q, setQ] = useState("");
  const search = useRef<HTMLInputElement>(null);

  useEffect(() => {
    search.current?.focus();
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [onClose]);

  // Matched against the purpose as well as the name: someone looking for a
  // layout is far more likely to type "quote" or "webinar" than "V7".
  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return TEMPLATES;
    return TEMPLATES.filter((t) =>
      `${t.name} ${t.purpose}`.toLowerCase().includes(needle));
  }, [q]);

  return (
    <div className="dsn-modal" role="dialog" aria-modal="true" aria-label="Choose a layout"
         onPointerDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="dsn-modal__box dsn-picker">
        <header className="dsn-picker__head">
          <div style={{ minWidth: 0 }}>
            <h3 className="dsn-picker__t">Start from a layout</h3>
            <p className="dsn-note mb-0">Pick one and fill it in — the agent can still rewrite it later.</p>
          </div>
          <button type="button" className="dsn-x" onClick={onClose} aria-label="Close">×</button>
        </header>

        <input
          ref={search} className="hrx-input" value={q} onChange={(e) => setQ(e.target.value)}
          placeholder="Search layouts — quote, webinar, results, offer…"
          aria-label="Search layouts"
        />

        {shown.length === 0 ? (
          <p className="dsn-note dsn-picker__none">No layout matches “{q}”.</p>
        ) : (
          <div className="dsn-picker__grid">
            {shown.map((t) => (
              <button key={t.id} type="button" className="dsn-template" onClick={() => onPick(t.id)}>
                <span className="dsn-template__art"><DesignSvg doc={emptyDoc(t.id)} width={150} /></span>
                <span className="dsn-template__name">{t.name}</span>
                <span className="dsn-picker__why">{t.purpose}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
