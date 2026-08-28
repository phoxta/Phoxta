import type { Idea } from "@/lib/db/ideas";

/**
 * The business plan, as a slide deck.
 *
 * WHY THIS GENERATES RATHER THAN FILLS IN A TEMPLATE
 *
 * docs/reference/business-plan-template.html is the deck this is modelled on —
 * imported from the earlier Next.js Phoxta. It is twenty slides of absolutely
 * positioned boxes, each one placed by hand around the exact length of the copy
 * it shipped with, inside a `.slide` that clips its overflow. Substituting a
 * real business's words into it would look finished and quietly cut the end off
 * any paragraph longer than Nexova's — the failure would land in the financials
 * of a plan someone shows an investor.
 *
 * So the design is carried over and the layout is not: the same palette, the
 * same Manrope type, the same 1280-wide slide with its orange number, section
 * label and oversized heading — but each slide lays out in normal flow and grows
 * downward rather than clipping, so no length of generated text can lose text.
 *
 * Slides are dropped when their step has not been generated, so a half-run idea
 * produces a shorter plan rather than a full one with blanks in it.
 */

type Json = Record<string, unknown>;

export const obj = (v: unknown): Json => (v && typeof v === "object" && !Array.isArray(v) ? (v as Json) : {});
export const arr = (v: unknown): Json[] => (Array.isArray(v) ? (v as Json[]) : []);
export const list = (v: unknown): string[] => (Array.isArray(v) ? v.map(text).filter(Boolean) : []);
export const text = (v: unknown): string => (typeof v === "string" ? v : v == null ? "" : String(v));
export const has = (o: Json) => Object.keys(o).length > 0;

/** Everything interpolated below is model output, so it is escaped, always. */
export function esc(v: unknown): string {
  return text(v)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

/**
 * "£2.4m", "£680,000", "1,850" → a number, for sizing a bar.
 *
 * Returns null rather than 0 when it cannot read the figure: a bar of height
 * zero claims the business earned nothing, which is a different statement from
 * "this was not a number".
 */
export function money(v: unknown): number | null {
  const raw = text(v).trim().toLowerCase();
  if (!raw) return null;
  const m = raw.match(/-?[\d,.]+/);
  if (!m) return null;
  const n = parseFloat(m[0].replace(/,/g, ""));
  if (!Number.isFinite(n)) return null;
  const scale = /bn|billion/.test(raw) ? 1e9 : /\dm\b|m\b|million/.test(raw) ? 1e6 : /\dk\b|k\b/.test(raw) ? 1e3 : 1;
  return n * (raw.startsWith("-") && n > 0 ? -scale : scale);
}

/* ── Slide chrome ─────────────────────────────────────────────────────────
   The template's furniture: the "Business Plan" mark, the big orange slide
   number, the section label, and the mark bottom-left. */

export const LOGO = `<svg class="mark" viewBox="0 0 32 32" fill="none" aria-hidden="true"><path d="M4 16 C4 16 8 8 16 8 C24 8 28 16 28 16" stroke="#f04e00" stroke-width="3" fill="none"/><path d="M4 16 C4 16 8 24 16 24 C24 24 28 16 28 16" stroke="#f04e00" stroke-width="3" fill="none"/><circle cx="16" cy="16" r="3" fill="#f04e00"/></svg>`;

export type SlideOpts = { dark?: boolean; wide?: boolean };

/** One numbered content slide. `n` is assigned at the end, once the deck is
 *  known, so dropping a slide does not leave a hole in the numbering. */
export type Slide = { label: string; title: string; body: string; opts?: SlideOpts };

export function renderSlide(s: Slide, n: number): string {
  const cls = ["slide", s.opts?.dark ? "slide--dark" : "", s.opts?.wide ? "slide--wide" : ""].filter(Boolean).join(" ");
  return `<section class="${cls}">
  <header class="slide__head">
    <span class="slide__num">${String(n).padStart(2, "0")}</span>
    <span class="slide__mark">Business <strong>Plan</strong></span>
  </header>
  <p class="slide__label">${esc(s.label)}</p>
  <h2 class="slide__title">${s.title}</h2>
  <div class="slide__body">${s.body}</div>
  ${LOGO}
</section>`;
}

/** A heading with its last word in orange, as every heading in the template is. */
export function heading(t: string): string {
  const words = t.trim().split(/\s+/);
  if (words.length < 2) return `<span class="o">${esc(t)}</span>`;
  const last = words.pop() as string;
  return `${esc(words.join(" "))} <span class="o">${esc(last)}</span>`;
}

/* ── Body pieces ──────────────────────────────────────────────────────── */

export const lead = (t: string) => (t ? `<p class="lead">${esc(t)}</p>` : "");
const note = (t: string) => (t ? `<p class="note">${esc(t)}</p>` : "");

/**
 * A tag that is orange for good news and black for bad.
 *
 * Painting "Threatens" and "Supports" the same accent would put the deck's
 * loudest colour on both halves of a judgement, which is the one place a reader
 * scans for the difference. Two tones, from the template's own two colours.
 */
const tagTone = (t: string): string => {
  const l = t.toLowerCase();
  return /threat|weak|high|critical/.test(l) ? " tag--dark" : "";
};

const cards = (items: { k?: string; h: string; p?: string; tag?: string }[], cols = 3) =>
  items.length === 0 ? "" : `<div class="grid grid--${cols}">${items.map((i) => `<article class="card">
    ${i.tag ? `<span class="tag${tagTone(i.tag)}">${esc(i.tag)}</span>` : ""}
    ${i.k ? `<span class="card__k">${esc(i.k)}</span>` : ""}
    <h3>${esc(i.h)}</h3>
    ${i.p ? `<p>${esc(i.p)}</p>` : ""}
  </article>`).join("")}</div>`;

const stats = (items: { k: string; v: string }[]) =>
  items.length === 0 ? "" : `<div class="stats">${items.map((i) => `<div class="stat">
    <span class="stat__k">${esc(i.k)}</span><span class="stat__v">${esc(i.v)}</span>
  </div>`).join("")}</div>`;

export const bullets = (items: string[]) =>
  items.length === 0 ? "" : `<ul class="bullets">${items.map((b) => `<li>${esc(b)}</li>`).join("")}</ul>`;

const table = (head: string[], rows: string[][]) =>
  rows.length === 0 ? "" : `<table class="tbl">
  <thead><tr>${head.map((h) => `<th>${esc(h)}</th>`).join("")}</tr></thead>
  <tbody>${rows.map((r) => `<tr>${r.map((c, i) => `<td${i === 0 ? ' class="tbl__k"' : ""}>${esc(c)}</td>`).join("")}</tr>`).join("")}</tbody>
</table>`;

/** Revenue bars. Only drawn when every period parsed — a chart with a guessed
 *  bar in it is worse than a table on its own. */
function revenueChart(rows: Json[]): string {
  const vals = rows.map((r) => money(r.revenue));
  if (vals.length < 2 || vals.some((v) => v === null)) return "";
  const max = Math.max(...(vals as number[]));
  if (max <= 0) return "";
  return `<div class="chart">${rows.map((r, i) => {
    const h = Math.max(4, Math.round(((vals[i] as number) / max) * 100));
    return `<div class="chart__col">
      <span class="chart__v">${esc(r.revenue)}</span>
      <span class="chart__bar" style="height:${h}%"></span>
      <span class="chart__x">${esc(r.period)}</span>
    </div>`;
  }).join("")}</div>`;
}

/** The five report scores as bars. */
const SCORES: [string, string][] = [
  ["marketScore", "Market"],
  ["productScore", "Product"],
  ["competitivePosition", "Competitive position"],
  ["customerDemand", "Customer demand"],
  ["financialViability", "Financial viability"],
];

function scoreBars(report: Json): string {
  const rows = SCORES.filter(([k]) => typeof report[k] === "number");
  if (rows.length === 0) return "";
  return `<div class="scores">${rows.map(([k, label]) => {
    const v = report[k] as number;
    return `<div class="score">
      <span class="score__k">${esc(label)}</span>
      <span class="score__track"><span class="score__fill" style="width:${Math.max(0, Math.min(10, v)) * 10}%"></span></span>
      <span class="score__n">${v}</span>
    </div>`;
  }).join("")}</div>`;
}

/* ── The deck ─────────────────────────────────────────────────────────── */

export type PlanMeta = { title: string; slideCount: number };

/**
 * Build the deck.
 *
 * Returns a complete standalone HTML document — no build step, no assets, and
 * nothing loaded from Phoxta, so the file a founder saves still opens in five
 * years. The one external request is the Manrope stylesheet, which falls back to
 * the system sans if it is blocked.
 */
export function buildPlanHtml(idea: Idea): { html: string; meta: PlanMeta } {
  const profile = obj(idea.ai_profile);
  const problem = obj(profile.problem);
  const market = obj(profile.market);
  const value = obj(profile.value);
  const customer = obj(profile.customer);
  const model = obj(profile.model);
  const strategy = obj(profile.strategy);
  const report = obj(idea.report);

  const brand = idea.title.trim() || "This business";
  const year = new Date(idea.created_at || Date.now()).getFullYear();
  const slides: Slide[] = [];

  // ── Executive summary ───────────────────────────────────────────────
  const funding = obj(strategy.fundingNeed);
  const projection = arr(obj(strategy.financials).projection);
  const lastPeriod = projection[projection.length - 1];
  if (text(strategy.executiveSummary) || text(idea.idea_seed)) {
    slides.push({
      label: "Executive summary",
      title: heading("Executive summary"),
      body: lead(text(strategy.executiveSummary) || text(idea.idea_seed)) + stats([
        ...(text(funding.amount) ? [{ k: "Funding sought", v: text(funding.amount) }] : []),
        ...(lastPeriod ? [{ k: `Revenue, ${text(lastPeriod.period)}`, v: text(lastPeriod.revenue) }] : []),
        ...(typeof report.overallScore === "number" ? [{ k: "Validation score", v: `${report.overallScore} / 10` }] : []),
        ...(text(report.verdict) ? [{ k: "Verdict", v: text(report.verdict) }] : []),
      ]),
    });
  }

  // ── Problem ─────────────────────────────────────────────────────────
  if (has(problem)) {
    slides.push({
      label: "The problem",
      title: heading("The problem"),
      body: lead(text(problem.statement)) + cards(
        arr(problem.painPoints).map((p) => ({ tag: text(p.severity), h: text(p.pain), p: text(p.evidence) })),
      ) + note(text(problem.whyNow) ? `Why now — ${text(problem.whyNow)}` : ""),
    });

    const audience = obj(problem.audience);
    const segments = arr(market.segments);
    if (has(audience) || segments.length > 0) {
      slides.push({
        label: "Target customers",
        title: heading("Who it is for"),
        body: lead(text(audience.who))
          + note([text(audience.demographics), text(audience.behaviours)].filter(Boolean).join(" · "))
          + cards(segments.map((s) => ({ k: text(s.name), h: text(s.size), p: `Pays ${text(s.willingnessToPay)}` }))),
      });
    }
  }

  // ── Solution ────────────────────────────────────────────────────────
  if (has(value)) {
    slides.push({
      label: "Our solution",
      title: heading("The offer"),
      body: lead(text(value.statement)) + cards(
        arr(value.advantages).map((a) => ({ h: text(a.advantage), p: text(a.why) })),
      ),
    });

    if (arr(value.differentiators).length > 0) {
      slides.push({
        label: "Competitive advantage",
        title: heading("Hard to copy"),
        body: cards(arr(value.differentiators).map((x) => ({ h: text(x.differentiator), p: text(x.moat) })), 2)
          + cards(arr(value.positioningAgainst).map((p) => ({ k: `Against ${text(p.competitor)}`, h: text(p.ourAngle) })), 2),
      });
    }
  }

  // ── Market ──────────────────────────────────────────────────────────
  if (has(market)) {
    const tam = obj(market.tam), sam = obj(market.sam), som = obj(market.som);
    slides.push({
      label: "Market analysis",
      title: heading("The market"),
      body: `<div class="funnel">
        <div class="funnel__row"><span>TAM</span><strong>${esc(tam.value)}</strong><em>${esc(tam.basis)}</em></div>
        <div class="funnel__row"><span>SAM</span><strong>${esc(sam.value)}</strong><em>${esc(sam.basis)}</em></div>
        <div class="funnel__row"><span>SOM</span><strong>${esc(som.value)}</strong><em>${esc(som.basis)}</em></div>
      </div>`
        + stats(text(market.cagr) ? [{ k: "Annual growth", v: text(market.cagr) }] : [])
        + cards(arr(market.trends).map((t) => ({ tag: text(t.impact), h: text(t.trend), p: text(t.note) }))),
    });

    if (arr(market.competitors).length > 0) {
      slides.push({
        label: "Competition",
        title: heading("Who is already there"),
        body: table(["Competitor", "Positioning", "Where they fall short"],
          arr(market.competitors).map((c) => [text(c.name), text(c.positioning), text(c.weakness)])),
        opts: { wide: true },
      });
    }
  }

  // ── Evidence ────────────────────────────────────────────────────────
  if (has(customer)) {
    const wtp = obj(customer.willingnessToPay);
    slides.push({
      label: "Customer evidence",
      title: heading("Evidence of demand"),
      body: cards(arr(customer.demandSignals).map((s) => ({ tag: text(s.strength), h: text(s.signal), p: text(s.source) })))
        + stats(text(wtp.range) ? [{ k: "Willingness to pay", v: text(wtp.range) }] : [])
        + note(text(wtp.evidence)),
    });
  }

  // ── Revenue model ───────────────────────────────────────────────────
  if (has(model)) {
    slides.push({
      label: "Revenue model",
      title: heading("How it earns"),
      body: lead(text(model.revenueModel)) + cards(
        arr(model.tiers).map((t) => ({ k: text(t.name), h: text(t.price), p: text(t.includes) })),
      ),
    });

    const ue = obj(model.unitEconomics), be = obj(model.breakEven);
    slides.push({
      label: "Unit economics",
      title: heading("The economics"),
      body: stats([
        ...(text(ue.cac) ? [{ k: "CAC", v: text(ue.cac) }] : []),
        ...(text(ue.ltv) ? [{ k: "LTV", v: text(ue.ltv) }] : []),
        ...(text(ue.ltvCacRatio) ? [{ k: "LTV : CAC", v: text(ue.ltvCacRatio) }] : []),
        ...(text(ue.grossMargin) ? [{ k: "Gross margin", v: text(ue.grossMargin) }] : []),
      ])
        + (text(be.customers) || text(be.timeline)
          ? `<p class="lead">Break-even at ${esc(be.customers)}${text(be.timeline) ? `, ${esc(be.timeline)}` : ""}.</p>${note(text(be.assumptions))}`
          : "")
        + table(["Monthly cost", "Amount"], arr(model.costs).map((c) => [text(c.item), text(c.monthly)])),
    });
  }

  // ── Plan ────────────────────────────────────────────────────────────
  const sections = arr(strategy.sections);
  if (sections.length > 0) {
    // Six sections at once is a wall; two slides of three reads as a plan.
    for (let i = 0; i < sections.length; i += 3) {
      const chunk = sections.slice(i, i + 3);
      slides.push({
        label: "The plan",
        title: heading(i === 0 ? "How it works" : "How it runs"),
        body: cards(chunk.map((s) => ({ h: text(s.heading), p: text(s.body) })), chunk.length === 3 ? 3 : 2),
      });
    }
  }

  // ── Financials ──────────────────────────────────────────────────────
  if (projection.length > 0) {
    slides.push({
      label: "Financial projections",
      title: heading("The numbers"),
      body: revenueChart(projection)
        + table(["Period", "Revenue", "Costs", "Net"],
          projection.map((p) => [text(p.period), text(p.revenue), text(p.costs), text(p.net)])),
      opts: { wide: true },
    });
  }

  const assumptions = list(obj(strategy.financials).assumptions);
  if (assumptions.length > 0) {
    slides.push({
      label: "Assumptions",
      title: heading("What this assumes"),
      body: note("Every figure on the previous slide rests on these. They are the first things to test.")
        + bullets(assumptions),
    });
  }

  // ── Milestones ──────────────────────────────────────────────────────
  if (arr(strategy.milestones).length > 0) {
    slides.push({
      label: "Growth milestones",
      title: heading("The path"),
      body: `<ol class="timeline">${arr(strategy.milestones).map((m) => `<li>
        <span class="timeline__when">${esc(m.when)}</span>
        <span class="timeline__what">${esc(m.target)}</span>
      </li>`).join("")}</ol>`,
    });
  }

  // ── Risk ────────────────────────────────────────────────────────────
  const risks = arr(customer.risks);
  const threats = list(obj(report.swot).threats);
  if (risks.length > 0 || threats.length > 0) {
    slides.push({
      label: "Risk & mitigation",
      title: heading("What could go wrong"),
      body: cards(risks.map((r) => ({ h: text(r.risk), p: `Cheapest test — ${text(r.test)}` })), 2)
        + (threats.length > 0 ? `<h3 class="sub">Threats</h3>${bullets(threats)}` : ""),
    });
  }

  // ── Verdict ─────────────────────────────────────────────────────────
  if (has(report)) {
    slides.push({
      label: "Independent assessment",
      title: heading("The verdict"),
      body: stats([
        ...(typeof report.overallScore === "number" ? [{ k: "Overall", v: `${report.overallScore} / 10` }] : []),
        ...(text(report.verdict) ? [{ k: "Verdict", v: text(report.verdict) }] : []),
        ...(text(report.riskLevel) ? [{ k: "Risk", v: text(report.riskLevel) }] : []),
      ]) + scoreBars(report) + lead(text(report.summary)),
      opts: { wide: true },
    });

    if (list(report.recommendations).length > 0) {
      slides.push({
        label: "Next steps",
        title: heading("What happens next"),
        body: bullets(list(report.recommendations)),
      });
    }
  }

  // ── The ask ─────────────────────────────────────────────────────────
  if (text(funding.amount)) {
    slides.push({
      label: "Investment opportunity",
      title: heading("The ask"),
      body: `<p class="hero-figure">${esc(funding.amount)}</p>` + lead(text(funding.use)),
      opts: { dark: true },
    });
  }

  const numbered = slides.map((s, i) => renderSlide(s, i + 1)).join("\n");

  const cover = `<section class="slide slide--cover">
  <div class="cover__panel"></div>
  <div class="cover__left">
    <span class="cover__year">${year}</span>
    <span class="cover__conf">Confidential</span>
    <p class="cover__tag">Validated.<br>Planned. Ready.</p>
    <h1 class="cover__brand">${esc(brand)}</h1>
  </div>
  <div class="cover__right">
    <span class="slide__mark slide__mark--w">Business <strong>Plan</strong></span>
    <h2>Business&nbsp;–<br>Plan ${year}</h2>
    <p>${esc(idea.idea_seed)}</p>
    <span class="ho">Prepared with Phoxta</span>
  </div>
  ${LOGO}
</section>`;

  const closing = `<section class="slide slide--close">
  <div class="cover__panel"></div>
  <span class="slide__mark slide__mark--w">Business <strong>Plan</strong></span>
  <p class="cover__tag">Validated.<br>Planned. Ready.</p>
  <h2 class="close__title">Thank you</h2>
  <div class="close__right">
    <h3>${esc(brand)}<br>Business Plan ${year}</h3>
    <p>${esc(text(strategy.executiveSummary).split(/(?<=\.)\s/)[0] || idea.idea_seed)}</p>
    <span class="ho">Prepared with Phoxta</span>
  </div>
  ${LOGO}
</section>`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(brand)} – Business Plan ${year}</title>
<link href="https://fonts.googleapis.com/css2?family=Manrope:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
<style>${STYLES}</style>
</head>
<body>
<div class="deck">
${cover}
${numbered}
${closing}
</div>
</body>
</html>`;

  return { html, meta: { title: `${brand} – Business Plan ${year}`, slideCount: slides.length + 2 } };
}

/**
 * The deck's stylesheet.
 *
 * Palette, type and furniture are the imported template's. The layout is not:
 * slides are `min-height: 720px` rather than a fixed height, so a long paragraph
 * makes a taller slide instead of a clipped one. That is the whole reason this
 * file exists — see the note at the top.
 */
export const STYLES = `
*, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }

:root {
  --bg: #e8e4dc;
  --black: #111111;
  --orange: #f04e00;
  --white: #f5f1ea;
  --font: 'Manrope', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

body { font-family: var(--font); background: #2a2a2a; padding: 24px 0; }
.deck { display: flex; flex-direction: column; align-items: center; gap: 24px; }

.slide {
  width: 1280px;
  min-height: 720px;
  padding: 64px 72px 88px;
  position: relative;
  background: var(--bg);
  color: var(--black);
  display: flex;
  flex-direction: column;
}

.slide--dark { background: var(--black); color: var(--white); }
.slide--dark .slide__label, .slide--dark .note, .slide--dark .card p { color: rgba(245, 241, 234, 0.66); }
.slide--dark .card { background: rgba(245, 241, 234, 0.06); border-color: rgba(245, 241, 234, 0.14); }

.mark { position: absolute; bottom: 30px; left: 72px; width: 32px; height: 32px; }

.slide__head { display: flex; align-items: flex-start; justify-content: space-between; }
.slide__num { font-size: 52px; font-weight: 800; color: var(--orange); line-height: 1; }
.slide__mark { font-size: 15px; font-weight: 400; }
.slide__mark strong { font-weight: 700; }
.slide__mark--w { color: #fff; }

.slide__label { font-size: 13px; margin-top: 18px; letter-spacing: .02em; }
.slide__title { font-size: 66px; font-weight: 700; line-height: 1.02; margin: 6px 0 34px; }
.slide--wide .slide__title { font-size: 54px; margin-bottom: 26px; }
.o { color: var(--orange); }

.slide__body { display: flex; flex-direction: column; gap: 24px; }

.lead { font-size: 21px; line-height: 1.5; max-width: 62ch; }
.note { font-size: 13.5px; line-height: 1.7; max-width: 78ch; color: rgba(17, 17, 17, 0.66); }
.sub { font-size: 15px; font-weight: 700; letter-spacing: .04em; text-transform: uppercase; }

/* ── Cards ── */
.grid { display: grid; gap: 16px; }
.grid--2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
.grid--3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }

.card {
  background: rgba(255, 255, 255, 0.5);
  border: 1px solid rgba(17, 17, 17, 0.1);
  padding: 20px;
}
.card__k { display: block; font-size: 12px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; color: var(--orange); margin-bottom: 8px; }
.card h3 { font-size: 19px; font-weight: 700; line-height: 1.25; }
.card p { font-size: 13.5px; line-height: 1.65; margin-top: 8px; color: rgba(17, 17, 17, 0.7); }

.tag {
  display: inline-block; font-size: 11px; font-weight: 700; letter-spacing: .08em;
  text-transform: uppercase; padding: 3px 9px; margin-bottom: 10px;
  background: var(--orange); color: #fff;
}
.tag--dark { background: var(--black); }
.slide--dark .tag--dark { background: rgba(245, 241, 234, .16); }

/* ── Stats ── */
.stats { display: flex; flex-wrap: wrap; gap: 44px; }
.stat__k { display: block; font-size: 12px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; opacity: .6; margin-bottom: 6px; }
.stat__v { display: block; font-size: 46px; font-weight: 800; line-height: 1; letter-spacing: -.02em; }

.hero-figure { font-size: 118px; font-weight: 800; line-height: 1; letter-spacing: -.03em; color: var(--orange); }

/* ── Funnel ── */
.funnel { display: flex; flex-direction: column; gap: 10px; }
.funnel__row { padding: 16px 22px; color: #fff; display: flex; align-items: baseline; gap: 16px; flex-wrap: wrap; }
.funnel__row:nth-child(1) { width: 100%; background: var(--black); }
.funnel__row:nth-child(2) { width: 76%; background: #3b3b3b; }
.funnel__row:nth-child(3) { width: 54%; background: var(--orange); }
.funnel__row span { font-size: 12px; font-weight: 700; letter-spacing: .1em; opacity: .7; }
.funnel__row strong { font-size: 28px; font-weight: 800; }
.funnel__row em { font-size: 12.5px; font-style: normal; opacity: .75; }

/* ── Table ── */
.tbl { width: 100%; border-collapse: collapse; font-size: 14px; }
.tbl th {
  text-align: left; font-size: 11px; font-weight: 700; letter-spacing: .08em;
  text-transform: uppercase; padding: 0 14px 10px 0; border-bottom: 2px solid var(--black);
}
.tbl td { padding: 13px 14px 13px 0; border-bottom: 1px solid rgba(17, 17, 17, 0.14); line-height: 1.5; vertical-align: top; }
.tbl__k { font-weight: 700; }

/* ── Chart ── */
.chart { display: flex; align-items: flex-end; gap: 22px; height: 240px; }
.chart__col { flex: 1 1 0; display: flex; flex-direction: column; justify-content: flex-end; align-items: center; height: 100%; gap: 8px; }
.chart__bar { display: block; width: 100%; max-width: 160px; background: var(--orange); }
.chart__col:last-child .chart__bar { background: var(--black); }
.chart__v { font-size: 14px; font-weight: 700; }
.chart__x { font-size: 12px; opacity: .7; }

/* ── Scores ── */
.scores { display: flex; flex-direction: column; gap: 10px; max-width: 720px; }
.score { display: flex; align-items: center; gap: 16px; }
.score__k { flex: 0 0 200px; font-size: 13px; }
.score__track { flex: 1 1 auto; height: 10px; background: rgba(17, 17, 17, 0.14); }
.score__fill { display: block; height: 100%; background: var(--orange); }
.score__n { flex: 0 0 28px; text-align: right; font-size: 13px; font-weight: 700; }

/* ── Lists ── */
.bullets { list-style: none; display: flex; flex-direction: column; gap: 12px; max-width: 88ch; }
.bullets li { font-size: 15px; line-height: 1.6; padding-left: 26px; position: relative; }
.bullets li::before { content: ""; position: absolute; left: 0; top: 9px; width: 12px; height: 3px; background: var(--orange); }

.timeline { list-style: none; display: flex; flex-direction: column; }
.timeline li { display: flex; gap: 28px; padding: 16px 0; border-top: 1px solid rgba(17, 17, 17, 0.16); }
.timeline li:last-child { border-bottom: 1px solid rgba(17, 17, 17, 0.16); }
.timeline__when { flex: 0 0 180px; font-size: 13px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; color: var(--orange); padding-top: 3px; }
.timeline__what { font-size: 19px; line-height: 1.4; }

/* ── Cover & closing ── */
.slide--cover, .slide--close { background: var(--black); color: #fff; padding: 0; flex-direction: row; }
.cover__panel { position: absolute; left: 0; top: 0; bottom: 0; width: 60%; background: var(--orange); }
.cover__left { position: relative; width: 60%; padding: 48px 40px; display: flex; flex-direction: column; }
.cover__year { font-size: 90px; font-weight: 800; line-height: 1; }
.cover__conf { font-size: 13px; opacity: .85; }
.cover__tag { position: relative; font-size: 15px; line-height: 1.6; margin-top: 44px; }
.cover__brand { font-size: 108px; font-weight: 800; line-height: 1; letter-spacing: -4px; color: var(--white); margin-top: auto; word-break: break-word; }

.cover__right { position: relative; width: 40%; padding: 48px 44px; display: flex; flex-direction: column; justify-content: flex-end; gap: 14px; }
.cover__right h2 { font-size: 22px; font-weight: 500; line-height: 1.4; }
.cover__right p { font-size: 13.5px; color: rgba(255, 255, 255, .65); line-height: 1.7; }
.ho { color: var(--orange); font-size: 13px; font-weight: 700; }

.slide--close { align-items: center; }
.slide--close .slide__mark { position: absolute; top: 24px; right: 44px; }
.slide--close .cover__tag { position: absolute; top: 48px; left: 40px; }
.close__title { position: relative; width: 60%; padding-left: 40px; font-size: 104px; font-weight: 800; letter-spacing: -3px; color: var(--white); }
.close__right { width: 40%; padding: 0 44px; display: flex; flex-direction: column; gap: 12px; }
.close__right h3 { font-size: 22px; font-weight: 600; line-height: 1.35; }
.close__right p { font-size: 13.5px; color: rgba(255, 255, 255, .65); line-height: 1.7; }

/* One slide per page when printed, and no dark ink where it is not wanted. */
@page { size: 1280px 760px; margin: 0; }
@media print {
  body { background: #fff; padding: 0; }
  .deck { gap: 0; }
  .slide { break-after: page; page-break-after: always; }
  .slide:last-child { break-after: auto; page-break-after: auto; }
}

@media (max-width: 1340px) {
  .slide { width: 100%; min-height: 0; padding: 40px 32px 72px; }
  .slide__title { font-size: 44px; }
  .grid--3 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .mark { left: 32px; }
}

@media (max-width: 720px) {
  .grid--2, .grid--3 { grid-template-columns: minmax(0, 1fr); }
  .slide__title { font-size: 34px; }
  .stat__v { font-size: 34px; }
  .hero-figure { font-size: 64px; }
  .slide--cover, .slide--close { flex-direction: column; }
  .cover__panel { width: 100%; height: 60%; }
  .cover__left, .cover__right, .close__title, .close__right { width: 100%; }
  .cover__brand { font-size: 56px; letter-spacing: -2px; }
  .close__title { font-size: 56px; }
  .score__k { flex-basis: 120px; }
  .timeline li { flex-direction: column; gap: 6px; }
}
`;
