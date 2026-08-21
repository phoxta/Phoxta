import { useMemo, useState } from "react";
import type { Contact, ContactStage } from "@/lib/db/ops/crm";

/**
 * The CRM stat strip and pipeline board, built to the supplied design.
 *
 * The layout is the comp's. The numbers are not: the comp is a template mock
 * ("Prepayments $12,076", "Tasks in progress 76", owners named Scarlett Floyd)
 * and a console that shows a business a confident figure which is not theirs is
 * worse than one showing a plain zero. Everything here is derived from the
 * org's own crm_contacts rows.
 *
 * Where the design implies a field this CRM does not store — an assigned owner,
 * attachment and comment counts — the slot is dropped rather than filled with
 * something plausible. A fabricated "4 comments" is a lie a user cannot check.
 */

export type CrmSort = "recent" | "value" | "score";

/** The pipeline columns are the stages contacts are actually filed under. */
export const STAGE_LABEL: Record<ContactStage, string> = {
  lead: "Lead",
  prospect: "Prospect",
  customer: "Customer",
  churned: "Churned",
};

/** Above this the lead score is treated as a flag worth showing. */
const HOT_SCORE = 70;

const money = (cents: number, currency: string) => {
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency, maximumFractionDigits: 0 }).format(cents / 100);
  } catch {
    return `${Math.round(cents / 100)}`;
  }
};

const shortDate = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString(undefined, { day: "numeric", month: "short" });
};

/** Stable colour per string, so the same tag or person keeps the same swatch. */
function hueOf(text: string): number {
  let h = 0;
  for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) % 360;
  return h;
}

const initials = (name: string) =>
  name.trim().split(/\s+/).slice(0, 2).map((w) => w[0] ?? "").join("").toUpperCase() || "?";

// ─────────────────────────────────────────────────────────────────────────────
// Stat strip
// ─────────────────────────────────────────────────────────────────────────────

const SERIES_COLOURS = ["#4338CA", "#7C7BF5", "#7FE3D6", "#F59E0B"];

type DayPoint = { label: string; iso: string; bySource: Record<string, number> };

function Delta({ now, before, suffix = "%" }: { now: number; before: number; suffix?: string }) {
  if (before === 0) return null; // a jump from nothing is not a percentage
  const pct = Math.round(((now - before) / before) * 100);
  const tone = pct > 0 ? "" : pct < 0 ? " is-down" : " is-flat";
  return <span className={`crm-delta${tone}`}>{pct > 0 ? "+" : ""}{pct}{suffix}</span>;
}

export function CrmStats({ rows, currency }: { rows: Contact[]; currency: string }) {
  const stats = useMemo(() => {
    const now = new Date();
    const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

    // ── New customers: seven days, split by the source each contact came from.
    const days: DayPoint[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      days.push({ label: d.toLocaleDateString(undefined, { weekday: "short" }), iso: d.toLocaleDateString("sv-SE"), bySource: {} });
    }
    const byIso = new Map(days.map((d) => [d.iso, d]));
    const sourceTotals = new Map<string, number>();
    for (const c of rows) {
      const key = new Date(c.created_at).toLocaleDateString("sv-SE");
      const bucket = byIso.get(key);
      const src = (c.source || "").trim() || "Direct";
      if (bucket) bucket.bySource[src] = (bucket.bySource[src] ?? 0) + 1;
      sourceTotals.set(src, (sourceTotals.get(src) ?? 0) + 1);
    }
    // Only the sources that actually appear, biggest first — no fixed legend of
    // channels this business may never have used.
    const sources = [...sourceTotals.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4).map(([s]) => s);

    // ── Activity: contacts added, by four-hour band over the last 14 days.
    const bands = [0, 4, 8, 12, 16, 20];
    const dayCount = 14;
    const heat: number[][] = bands.map(() => Array(dayCount).fill(0));
    const firstDay = startOfDay(new Date(now.getTime() - (dayCount - 1) * 86400000));
    for (const c of rows) {
      const d = new Date(c.created_at);
      const col = Math.floor((startOfDay(d) - firstDay) / 86400000);
      if (col < 0 || col >= dayCount) continue;
      heat[Math.floor(d.getHours() / 4)][col] += 1;
    }
    const heatPeak = Math.max(1, ...heat.flat());

    // ── The two figures. Named for what they are: this CRM has no tasks and no
    // prepayments, and labelling a pipeline count "Tasks in progress" would be
    // a caption that lies about its own number.
    const openStages: ContactStage[] = ["lead", "prospect"];
    const inPipeline = rows.filter((c) => openStages.includes(c.stage));
    const pipelineValue = inPipeline.reduce((sum, c) => sum + (c.value_cents ?? 0), 0);

    const cutoff = now.getTime() - 30 * 86400000;
    const prevCutoff = now.getTime() - 60 * 86400000;
    const inLast30 = rows.filter((c) => new Date(c.created_at).getTime() >= cutoff).length;
    const inPrev30 = rows.filter((c) => {
      const t = new Date(c.created_at).getTime();
      return t >= prevCutoff && t < cutoff;
    }).length;

    return { days, sources, heat, heatPeak, bands, dayCount, inPipeline, pipelineValue, inLast30, inPrev30 };
  }, [rows]);

  const { days, sources, heat, heatPeak, bands, dayCount } = stats;
  const peak = Math.max(1, ...days.map((d) => Object.values(d.bySource).reduce((a, b) => a + b, 0)));

  // Stacked areas, drawn as polygons: each band sits on the one below it.
  const W = 300;
  const H = 110;
  const x = (i: number) => (days.length === 1 ? W / 2 : (i / (days.length - 1)) * W);
  const y = (v: number) => H - (v / peak) * H;
  const running = days.map(() => 0);
  const bandsPaths = sources.map((src) => {
    const top = days.map((d, i) => {
      running[i] += d.bySource[src] ?? 0;
      return running[i];
    });
    const bottom = top.map((t, i) => t - (days[i].bySource[src] ?? 0));
    const up = top.map((v, i) => `${x(i)},${y(v)}`).join(" ");
    const down = [...bottom].map((v, i) => `${x(i)},${y(v)}`).reverse().join(" ");
    return `${up} ${down}`;
  });

  return (
    <div className="crm-stats">
      <section className="crm-panel">
        <h3 className="crm-panel__h">New customers</h3>
        {rows.length === 0 ? (
          <p className="fz-font-sm neutral-500 mb-0">No contacts yet — added ones appear here by the day and source they arrived from.</p>
        ) : (
          <>
            <svg className="crm-chart" viewBox={`0 0 ${W} ${H + 18}`} preserveAspectRatio="none" role="img"
                 aria-label={`New contacts per day for the last 7 days. ${peak} at the busiest.`}>
              {[0, 0.5, 1].map((f) => (
                <line key={f} className="crm-chart__grid" x1="0" x2={W} y1={H * f} y2={H * f} />
              ))}
              {bandsPaths.map((pts, i) => (
                <polygon key={sources[i]} points={pts} fill={SERIES_COLOURS[i % SERIES_COLOURS.length]} fillOpacity={0.85} />
              ))}
            </svg>
            <div className="d-flex justify-content-between crm-axis" style={{ fontSize: 10.5 }}>
              {days.map((d) => <span key={d.iso}>{d.label}</span>)}
            </div>
            <div className="crm-legend">
              {sources.map((s, i) => (
                <span key={s}><i style={{ background: SERIES_COLOURS[i % SERIES_COLOURS.length] }} />{s}</span>
              ))}
            </div>
          </>
        )}
      </section>

      <section className="crm-panel">
        <h3 className="crm-panel__h">Activity</h3>
        <div className="crm-heat">
          {bands.map((band, r) => (
            <div key={band} className="crm-heat__row" style={{ gridTemplateColumns: `34px repeat(${dayCount}, minmax(0, 1fr))` }}>
              <span className="crm-heat__lab">{String(band).padStart(2, "0")}:00</span>
              {heat[r].map((v, c) => (
                <span
                  key={c}
                  className="crm-heat__cell"
                  title={v > 0 ? `${v} added` : "Nothing"}
                  style={v > 0 ? { background: SERIES_COLOURS[0], opacity: 0.25 + (v / heatPeak) * 0.75 } : undefined}
                />
              ))}
            </div>
          ))}
        </div>
        <div className="crm-heat__foot">
          <span>{dayCount} days ago</span>
          <span>Today</span>
        </div>
      </section>

      <div className="crm-minis">
        <section className="crm-tile">
          <span className="crm-tile__label">In pipeline</span>
          <span className="crm-tile__row">
            <b className="crm-tile__n">{stats.inPipeline.length}</b>
            <Delta now={stats.inLast30} before={stats.inPrev30} />
          </span>
        </section>
        <section className="crm-tile">
          <span className="crm-tile__label">Pipeline value</span>
          <span className="crm-tile__row">
            <b className="crm-tile__n">{money(stats.pipelineValue, currency)}</b>
          </span>
        </section>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Pipeline board
// ─────────────────────────────────────────────────────────────────────────────

const CAL = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" aria-hidden="true">
    <rect x="3" y="5" width="18" height="16" rx="3" /><path d="M8 3v4M16 3v4M3 11h18" />
  </svg>
);
const COIN = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" aria-hidden="true">
    <circle cx="12" cy="12" r="9" /><path d="M12 7v10M9.5 9.5h5M9.5 14h5" />
  </svg>
);
const SPARK = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z" />
  </svg>
);

function Card({
  c, currency, dragging, onOpen, onDelete, onDragStart, onDragEnd,
}: {
  c: Contact;
  currency: string;
  dragging: boolean;
  onOpen: () => void;
  onDelete: () => void;
  onDragStart: () => void;
  onDragEnd: () => void;
}) {
  const tag = (c.tags ?? [])[0] ?? "";
  const hot = (c.lead_score ?? 0) >= HOT_SCORE;
  const desc = (c.ai_summary || c.notes || "").trim();
  const title = c.company.trim() || c.name.trim() || "Contact";
  // The comp puts an account manager here. There is no owner field, so the slot
  // shows who the contact IS — real, and the same shape.
  const person = c.name.trim();
  const sub = c.email.trim() || c.phone.trim();

  return (
    <div
      className={`crm-card${hot ? " is-hot" : ""}${dragging ? " dragging" : ""}`}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", c.id);
        e.dataTransfer.effectAllowed = "move";
        onDragStart();
      }}
      onDragEnd={onDragEnd}
    >
      <div className="crm-card__top">
        {tag ? (
          <span className="crm-tag" style={{ background: `hsl(${hueOf(tag)} 82% 92%)`, color: `hsl(${hueOf(tag)} 60% 28%)` }}>
            {tag}
          </span>
        ) : hot ? (
          <span className="crm-tag" style={{ background: "#DED8FD", color: "#3B2E8F" }}>Priority</span>
        ) : (
          <span />
        )}
        <button
          type="button"
          className="crm-card__menu"
          aria-label={`Remove ${title}`}
          title="Delete this contact"
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
        >
          ⋯
        </button>
      </div>

      {/* The card body opens the contact; the drag handle is the whole card, so
          this stays a button rather than a click handler on a div. */}
      <button type="button" className="btn btn-link p-0 border-0 text-start w-100 text-decoration-none" onClick={onOpen}>
        <h4 className="crm-card__name">{title}</h4>
        {desc && <p className="crm-card__desc">{desc}</p>}
      </button>

      {person && (
        <div className="crm-card__who">
          <span className="crm-avatar" style={{ background: `hsl(${hueOf(person)} 55% 45%)` }} aria-hidden="true">
            {initials(person)}
          </span>
          <div>
            <b>{person}</b>
            {sub && <span>{sub}</span>}
          </div>
        </div>
      )}

      <div className="crm-card__foot">
        <span>{CAL} {shortDate(c.updated_at || c.created_at)}</span>
        {(c.value_cents ?? 0) > 0 && <span>{COIN} {money(c.value_cents, currency)}</span>}
        {c.lead_score != null && <span>{SPARK} {c.lead_score}</span>}
      </div>
    </div>
  );
}

export function StageBoard({
  stages, rows, sort, hotOnly, currency, onOpen, onStage, onDelete,
}: {
  stages: ContactStage[];
  rows: Contact[];
  sort: CrmSort;
  hotOnly: boolean;
  currency: string;
  onOpen: (c: Contact) => void;
  onStage: (c: Contact, stage: ContactStage) => void;
  onDelete: (c: Contact) => void;
}) {
  const [dragId, setDragId] = useState<string | null>(null);
  const [overCol, setOverCol] = useState<ContactStage | null>(null);

  const ordered = useMemo(() => {
    const list = hotOnly ? rows.filter((c) => (c.lead_score ?? 0) >= HOT_SCORE) : rows;
    const by = [...list];
    if (sort === "value") by.sort((a, b) => (b.value_cents ?? 0) - (a.value_cents ?? 0));
    else if (sort === "score") by.sort((a, b) => (b.lead_score ?? -1) - (a.lead_score ?? -1));
    else by.sort((a, b) => new Date(b.updated_at || b.created_at).getTime() - new Date(a.updated_at || a.created_at).getTime());
    return by;
  }, [rows, sort, hotOnly]);

  function drop(stage: ContactStage) {
    const c = ordered.find((r) => r.id === dragId);
    setDragId(null);
    setOverCol(null);
    if (c && c.stage !== stage) onStage(c, stage);
  }

  return (
    <div className="crm-board">
      {stages.map((stage) => {
        const cards = ordered.filter((c) => c.stage === stage);
        return (
          <section
            key={stage}
            className={`crm-col${overCol === stage && dragId ? " dropping" : ""}`}
            aria-label={STAGE_LABEL[stage]}
            onDragOver={(e) => { if (dragId) { e.preventDefault(); e.dataTransfer.dropEffect = "move"; setOverCol(stage); } }}
            onDragLeave={() => setOverCol((s) => (s === stage ? null : s))}
            onDrop={(e) => { e.preventDefault(); drop(stage); }}
          >
            <header className="crm-col__h">
              <b>{STAGE_LABEL[stage]}</b>
              <span className="crm-col__n">{cards.length}</span>
            </header>

            <div className="crm-cards">
              {cards.length === 0 ? (
                <div className="crm-empty">Nothing here</div>
              ) : (
                cards.map((c) => (
                  <Card
                    key={c.id}
                    c={c}
                    currency={currency}
                    dragging={dragId === c.id}
                    onOpen={() => onOpen(c)}
                    onDelete={() => onDelete(c)}
                    onDragStart={() => setDragId(c.id)}
                    onDragEnd={() => { setDragId(null); setOverCol(null); }}
                  />
                ))
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}
