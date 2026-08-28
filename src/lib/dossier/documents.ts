import {
  arr, bullets, esc, has, heading, lead, list, LOGO, obj, renderSlide, STYLES, text,
  type Slide,
} from "@/lib/ideas/plan";
import { type DossierSection } from "./sections";
import { legalPack } from "./legal";

/**
 * The dossier as DOCUMENTS — the things a business is actually asked for.
 *
 * The tab renders the analysis on screen. That is not the same as HAVING a
 * business plan: a bank, a landlord, an accountant, a supplier opening a trade
 * account and every grant form want a document, and "it is a tab in my console"
 * is not an answer to any of them.
 *
 * WHY IT LOOKS LIKE THE IDEA VALIDATOR'S PLAN. Because it IS that deck. The
 * chrome — the 1280 slide, the orange number, the section label, the oversized
 * heading with its last word in orange, the Manrope type, the cover and the
 * closing — is imported from src/lib/ideas/plan.ts rather than reproduced here.
 * A second copy of a 175-line stylesheet is a second thing to keep in step, and
 * the one that drifts is always the one nobody is looking at.
 *
 * AND WHY IT GENERATES RATHER THAN FILLS A TEMPLATE: plan.ts explains that at
 * length and it applies unchanged. Every slide lays out in normal flow and grows
 * downward, so no length of generated text can be clipped. A plan that quietly
 * cuts the end off a paragraph fails in the financials of the document somebody
 * hands a bank.
 *
 * Every builder DROPS what it has not got. A dossier with four of the nine
 * sections written produces a shorter plan, never a full one with blanks in it.
 */

type Json = Record<string, unknown>;

/** Whatever sections have been written so far. */
export type SectionMap = Partial<Record<DossierSection, Json>>;

export type DocumentKind =
  | "plan" | "industry" | "competition" | "strategy" | "gtm"
  | "pricing" | "financials" | "operations" | "supply" | "risk" | "legal";

export type DocumentSpec = {
  kind: DocumentKind;
  name: string;
  /** One line saying who asks for this and why they want it. */
  purpose: string;
  /** The sections it needs. Nothing written, nothing offered. */
  needs: DossierSection[];
};

export const DOCUMENTS: DocumentSpec[] = [
  {
    kind: "plan", name: "Business plan",
    purpose: "The whole thing as one document — what a bank, a landlord or an investor asks for.",
    needs: ["strategy", "industry", "competition", "gtm", "pricing", "financials", "operations", "risk"],
  },
  {
    kind: "industry", name: "Market and industry analysis",
    purpose: "How the trade works, how much of it you can reach, and what is moving.",
    needs: ["industry"],
  },
  {
    kind: "competition", name: "Competitor analysis",
    purpose: "Who you are up against, and where the room is.",
    needs: ["competition"],
  },
  {
    kind: "strategy", name: "Strategy",
    purpose: "Where you play, how you win, and what you are refusing to do.",
    needs: ["strategy"],
  },
  {
    kind: "gtm", name: "Launch plan",
    purpose: "The first ninety days, and where the first hundred customers come from.",
    needs: ["gtm"],
  },
  {
    kind: "pricing", name: "Pricing and unit economics",
    purpose: "What you charge, and what is left after costs.",
    needs: ["pricing"],
  },
  {
    kind: "financials", name: "Financial projections",
    purpose: "Three versions of year one and the cash to reach them — the page an accountant turns to first.",
    needs: ["financials"],
  },
  {
    kind: "operations", name: "Operations manual",
    purpose: "The jobs, the standards and who does them — what you hand a first hire.",
    needs: ["operations"],
  },
  {
    kind: "supply", name: "Suppliers and sourcing plan",
    purpose: "Where stock comes from and what to agree — what you need to open a trade account.",
    needs: ["supply"],
  },
  {
    kind: "risk", name: "Risk register",
    purpose: "What could go wrong, what shows up first, and what you do about it.",
    needs: ["risk"],
  },
  {
    kind: "legal", name: "Compliance checklist",
    purpose: "What you are legally required to have, and where to get it.",
    needs: [],
  },
];

export const getDocument = (kind: DocumentKind) => DOCUMENTS.find((d) => d.kind === kind);

/** Offered only when something it needs exists. `legal` is a fixed list, so it
 *  is always available. */
export function documentReady(spec: DocumentSpec, sections: SectionMap): boolean {
  if (spec.needs.length === 0) return true;
  return spec.needs.some((k) => has(obj(sections[k])));
}

/* ── Body helpers ─────────────────────────────────────────────────────────
   Each returns "" for nothing, so a caller can concatenate without guarding
   every field. That is what lets a thin section produce a short slide rather
   than a broken one. */

const para = (t: string) => (t ? `<p>${esc(t)}</p>` : "");

const joinRow = (a: unknown, b: unknown) => [text(a), text(b)].filter(Boolean).join(" — ");

/** A term and what it means — the shape most of these sections take. */
function defs(rows: { k: string; v: string }[]): string {
  const live = rows.filter((r) => r.k || r.v);
  if (!live.length) return "";
  return `<dl class="kv">${live.map((r) => `<dt>${esc(r.k)}</dt><dd>${esc(r.v)}</dd>`).join("")}</dl>`;
}

/** Rows of a table, dropping any column that is empty the whole way down. */
function table(head: string[], rows: string[][]): string {
  const keep = head.map((_, i) => rows.some((r) => (r[i] ?? "").trim() !== ""));
  const h = head.filter((_, i) => keep[i]);
  const body = rows.map((r) => r.filter((_, i) => keep[i])).filter((r) => r.some((c) => c.trim() !== ""));
  if (!body.length) return "";
  return `<table class="tbl"><thead><tr>${h.map((c) => `<th>${esc(c)}</th>`).join("")}</tr></thead>`
    + `<tbody>${body.map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
}

/**
 * An estimate, written out in full.
 *
 * The range, the sentence it came from, and the assumptions behind it. A figure
 * in a document handed to a bank needs its reasoning MORE than one on a screen,
 * not less — so this returns "" when the reasoning is missing, and an
 * unexplained number cannot reach a document somebody will be held to.
 */
function figure(v: unknown, label?: string): string {
  const e = obj(v);
  const value = text(e.value ?? e.range ?? e.amount);
  const basis = text(e.basis);
  if (!value || !basis) return "";
  const ass = list(e.assumptions);
  return `<div class="fig">`
    + (label ? `<span class="fig__k">${esc(label)}</span>` : "")
    + `<p class="fig__n">${esc(value)}${e.unit ? ` <span class="fig__u">${esc(text(e.unit))}</span>` : ""}</p>`
    + `<p class="fig__b">${esc(basis)}</p>`
    + (ass.length ? `<ul class="fig__a">${ass.map((a) => `<li>${esc(a)}</li>`).join("")}</ul>` : "")
    + `</div>`;
}

/* ── One slide per part of a section ──────────────────────────────────────
   Each returns a Slide or null; null is dropped, so the numbering closes up
   and a half-written dossier yields a shorter document. */

type Maybe = Slide | null;

const slide = (label: string, title: string, body: string, opts?: Slide["opts"]): Maybe =>
  body.trim() ? { label, title: heading(title), body, opts } : null;

function industrySlides(s: Json): Maybe[] {
  const sizing = obj(s.sizing);
  const seas = obj(s.seasonality);
  return [
    slide("The market", "How this trade works", lead(text(s.headline)) + para(text(s.structure))),
    slide("The market", "How much of it you can reach",
      figure(sizing.total, "The whole market")
      + figure(sizing.reachable, "What you could serve")
      + figure(sizing.realistic, "What is realistic early")
      + para(text(sizing.note))),
    slide("The market", "What is moving",
      bullets(arr(s.demandDrivers).map((d) => joinRow(obj(d).driver, obj(d).why)).filter(Boolean))),
    slide("The market", "Who buys",
      table(["Segment", "Who they are", "What they want"],
        arr(s.segments).map((x) => [text(obj(x).name), text(obj(x).who), text(obj(x).wants ?? obj(x).note)]))),
    slide("The market", "The shape of the year",
      para(text(seas.note)) + bullets(list(seas.periods))),
  ];
}

function competitionSlides(s: Json): Maybe[] {
  return [
    slide("Competition", "Who you are up against", lead(text(s.headline)) + para(text(s.landscape))),
    slide("Competition", "The players",
      table(["Who", "How they position", "Strong at", "Weak at"],
        arr(s.players).map((x) => [
          text(obj(x).name), text(obj(x).positioning), text(obj(x).strength), text(obj(x).weakness),
        ]))),
    slide("Competition", "Where the room is",
      arr(s.whiteSpace).map((x) => defs([
        { k: "The gap", v: text(obj(x).gap) },
        { k: "Why it exists", v: text(obj(x).whyItExists) },
        { k: "How to take it", v: text(obj(x).howToTake) },
      ])).join("")),
    slide("Competition", "What keeps others out",
      bullets(arr(s.barriers).map((x) => joinRow(obj(x).barrier, obj(x).note)).filter(Boolean))),
  ];
}

function strategySlides(s: Json): Maybe[] {
  const p = obj(s.positioning);
  return [
    slide("Strategy", "The position",
      lead(text(s.headline))
      + defs([
        { k: "For", v: text(p.forWho) },
        { k: "Against", v: text(p.against) },
        { k: "Because", v: text(p.because) },
      ])
      + (text(p.statement) ? `<p class="hero-figure">${esc(text(p.statement))}</p>` : "")),
    slide("Strategy", "Where to play",
      table(["Choice", "Why"], arr(s.whereToPlay).map((x) => [text(obj(x).choice), text(obj(x).why)]))),
    slide("Strategy", "How to win",
      arr(s.howToWin).map((x) => defs([
        { k: "Move", v: text(obj(x).move) },
        { k: "Proof it is working", v: text(obj(x).proof) },
      ])).join("")),
    slide("Strategy", "What compounds",
      arr(s.moat).map((x) => defs([
        { k: "Advantage", v: text(obj(x).advantage) },
        { k: "How it compounds", v: text(obj(x).howItCompounds) },
        { k: "Months to build", v: text(obj(x).monthsToBuild) },
      ])).join("")),
    slide("Strategy", "What you are not doing", para(text(s.notDoing)), { dark: true }),
  ];
}

function gtmSlides(s: Json): Maybe[] {
  return [
    slide("Launch", "The first ninety days",
      lead(text(s.headline))
      + arr(s.phases).map((x) => {
        const o = obj(x);
        return defs([{ k: text(o.phase) || "Phase", v: joinRow(o.window, o.goal) }]) + bullets(list(o.actions));
      }).join("")),
    slide("Launch", "Where customers come from",
      table(["Channel", "What it is", "The first hundred"],
        arr(s.channels).map((x) => [text(obj(x).channel), text(obj(x).whatItIs), text(obj(x).firstHundred)]))),
    slide("Launch", "What to say",
      arr(s.messaging).map((x) => defs([{ k: text(obj(x).audience), v: text(obj(x).line) }])).join("")),
  ];
}

function pricingSlides(s: Json): Maybe[] {
  const u = obj(s.unitEconomics);
  return [
    slide("Pricing", "How to charge", lead(text(s.headline)) + para(text(s.architecture))),
    slide("Pricing", "The tiers",
      table(["Name", "What is in it", "Who it is for"],
        arr(s.tiers).map((x) => [text(obj(x).name), text(obj(x).includes), text(obj(x).who)]))),
    slide("Pricing", "What is left after costs",
      figure(u.averageOrder ?? u.aov, "Average order")
      + figure(u.grossMargin ?? u.margin, "Gross margin")
      + figure(u.acquisitionCost ?? u.cac, "Cost to win a customer")
      + figure(u.lifetimeValue ?? u.ltv, "What a customer is worth")),
    slide("Pricing", "The levers",
      table(["Lever", "Effect"], arr(s.levers).map((x) => [text(obj(x).lever), text(obj(x).effect)]))),
    slide("Pricing", "Mistakes to avoid", bullets(list(s.mistakes))),
  ];
}

function financialSlides(s: Json): Maybe[] {
  return [
    slide("Financials", "Year one, three ways",
      lead(text(s.headline))
      + arr(s.scenarios).map((x) => {
        const o = obj(x);
        return `<h3 class="sub">${esc(text(o.name) || "Scenario")}</h3>`
          + figure(o.revenue, "Revenue") + figure(o.profit, "Profit") + para(text(o.story));
      }).join("")),
    slide("Financials", "What it costs to run",
      table(["Cost", "Amount", "Note"],
        arr(s.costs).map((x) => {
          const o = obj(x);
          const e = obj(o.amount);
          return [text(o.item), text(e.value ?? o.amount), text(o.note ?? e.basis)];
        }))),
    slide("Financials", "What this rests on", bullets(list(s.assumptions))),
    slide("Financials", "What to watch", bullets(list(s.watchouts))),
  ];
}

function operationsSlides(s: Json): Maybe[] {
  const jobs = (rows: unknown, when: string) =>
    table([when, "How long", "How"],
      arr(rows).map((x) => [text(obj(x).task), text(obj(x).minutes), text(obj(x).how)]));
  return [
    slide("Operations", "The daily round", lead(text(s.headline)) + jobs(s.daily, "Every day")),
    slide("Operations", "Weekly and monthly", jobs(s.weekly, "Every week") + jobs(s.monthly, "Every month")),
    slide("Operations", "The standards",
      table(["Standard", "Target", "Why it matters"],
        arr(s.standards).map((x) => [text(obj(x).standard), text(obj(x).target), text(obj(x).why)]))),
    slide("Operations", "Who does what",
      table(["Role", "Does", "When to hire"],
        arr(s.roles).map((x) => [text(obj(x).role), text(obj(x).does), text(obj(x).whenToHire)]))),
    slide("Operations", "The tools",
      table(["Job", "Tool", "Note"],
        arr(s.tools).map((x) => [text(obj(x).job), text(obj(x).tool), text(obj(x).note)]))),
  ];
}

function supplySlides(s: Json): Maybe[] {
  return [
    slide("Supply", "How stock reaches you", lead(text(s.headline)) + para(text(s.model))),
    slide("Supply", "Types of supplier",
      table(["Type", "Good for", "Watch for", "Lead time"],
        arr(s.supplierTypes).map((x) => [
          text(obj(x).type), text(obj(x).goodFor), text(obj(x).watchFor), text(obj(x).leadTime),
        ]))),
    slide("Supply", "How to choose one",
      table(["What to check", "How to check it"],
        arr(s.selection).map((x) => [text(obj(x).criterion), text(obj(x).howToCheck)]))),
    slide("Supply", "What to agree",
      table(["Term", "Open with", "Walk away at"],
        arr(s.terms).map((x) => [text(obj(x).term), text(obj(x).openWith), text(obj(x).walkAwayAt)]))),
    slide("Supply", "How much to hold",
      arr(s.stockPolicy).map((x) => defs([{ k: text(obj(x).rule), v: text(obj(x).why) }])).join("")),
  ];
}

function riskSlides(s: Json): Maybe[] {
  const c = obj(s.concentration);
  return [
    slide("Risk", "What could go wrong",
      lead(text(s.headline))
      + table(["Risk", "First sign", "What to do", "If it happens"],
        arr(s.risks).map((x) => [
          text(obj(x).risk), text(obj(x).earlySignal), text(obj(x).mitigation), text(obj(x).ifItHappens),
        ]))),
    slide("Risk", "Where you are exposed",
      defs([
        { k: "Depends on", v: text(c.dependency) },
        { k: "Exposure", v: text(c.exposure) },
        { k: "Reduce it by", v: text(c.reduceBy) },
      ])),
    slide("Risk", "How often to review", para(text(s.reviewCadence))),
  ];
}

const BUILDERS: Record<DossierSection, (s: Json) => Maybe[]> = {
  industry: industrySlides,
  competition: competitionSlides,
  strategy: strategySlides,
  gtm: gtmSlides,
  pricing: pricingSlides,
  financials: financialSlides,
  operations: operationsSlides,
  supply: supplySlides,
  risk: riskSlides,
};

/** The compliance checklist, which no model writes. See legal.ts for why.
 *  Keyed on the blueprint slug first and the vertical only as a fallback, the
 *  same way legalPack itself resolves a trade. */
function legalSlides(slug?: string | null, vertical?: string | null): Maybe[] {
  const pack = legalPack(slug, vertical);
  return pack.groups.map((g) =>
    slide("Compliance", g.name,
      para(g.note ?? "")
      + `<ul class="list">${g.items.map((i) =>
        `<li><strong>${esc(i.title)}</strong> — ${esc(i.what)}`
        + (i.where ? ` <em>${esc(i.where)}</em>` : "")
        + (i.url ? ` <a href="${esc(i.url)}">Official guidance</a>` : "")
        + `</li>`).join("")}</ul>`));
}

/* ── Assembly ─────────────────────────────────────────────────────────── */

export type DocumentContext = {
  /** The business's own name, or the blueprint's when it has not got one yet. */
  brand: string;
  /** "Fashion Store" — what trade this is. */
  trade: string;
  /** True when this is the owner's own version rather than the shared one. */
  mine: boolean;
  /** Where they said they trade, once they have said. */
  where?: string;
  /** The blueprint's slug and vertical, for picking the right compliance list. */
  blueprintSlug?: string | null;
  vertical?: string | null;
};

export type DocumentMeta = { title: string; slideCount: number; fileName: string };

const slug = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "document";

/**
 * The order a reader expects, which is not the order it was generated in: what
 * the business is, then the market, the competition, the plan, the money, and
 * how it runs. A bank manager opens at the strategy and the financials.
 */
const PLAN_ORDER: DossierSection[] = [
  "strategy", "industry", "competition", "gtm", "pricing", "financials", "operations", "supply", "risk",
];

/**
 * Build one document.
 *
 * Returns null when there is nothing to build it from — the caller then offers
 * no button, rather than handing somebody an empty deck with a cover on it.
 */
export function buildDocument(
  kind: DocumentKind,
  sections: SectionMap,
  ctx: DocumentContext,
): { html: string; meta: DocumentMeta } | null {
  const spec = getDocument(kind);
  if (!spec) return null;

  let slides: Maybe[] = [];
  if (kind === "legal") {
    slides = legalSlides(ctx.blueprintSlug, ctx.vertical);
  } else if (kind === "plan") {
    for (const k of PLAN_ORDER) {
      const s = obj(sections[k]);
      if (has(s)) slides = slides.concat(BUILDERS[k](s));
    }
  } else {
    const s = obj(sections[kind as DossierSection]);
    if (!has(s)) return null;
    slides = BUILDERS[kind as DossierSection](s);
  }

  const live = slides.filter((s): s is Slide => s !== null);
  if (!live.length) return null;

  const year = new Date().getFullYear();
  const title = kind === "plan" ? "Business Plan" : spec.name;
  const numbered = live.map((s, i) => renderSlide(s, i + 1)).join("\n");

  const cover = `<section class="slide slide--cover">
  <div class="cover__panel"></div>
  <div class="cover__left">
    <span class="cover__year">${year}</span>
    <span class="cover__conf">Confidential</span>
    <p class="cover__tag">${ctx.mine ? "Written for<br>this business." : "The trade,<br>in general."}</p>
    <h1 class="cover__brand">${esc(ctx.brand)}</h1>
  </div>
  <div class="cover__right">
    <span class="slide__mark slide__mark--w">${esc(title)}</span>
    <h2>${esc(title)}<br>${year}</h2>
    <p>${esc(spec.purpose)}</p>
    <span class="ho">${ctx.where ? `Prepared for ${esc(ctx.where)} with Phoxta` : "Prepared with Phoxta"}</span>
  </div>
  ${LOGO}
</section>`;

  const closing = `<section class="slide slide--close">
  <div class="cover__panel"></div>
  <span class="slide__mark slide__mark--w">${esc(title)}</span>
  <p class="cover__tag">${esc(ctx.trade)}</p>
  <h2 class="close__title">${esc(ctx.brand)}</h2>
  <div class="close__right">
    <h3>${esc(title)} ${year}</h3>
    <p>${ctx.mine
      ? "Written against the answers this business gave. Check every figure against your own quotes and your first sales."
      : "The general picture for this trade. Answer the questions in the console to have it written for your own market."}</p>
    <span class="ho">Prepared with Phoxta</span>
  </div>
  ${LOGO}
</section>`;

  const html = `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(ctx.brand)} — ${esc(title)} ${year}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<style>${STYLES}${EXTRA}</style>
</head><body>
${cover}
${numbered}
${closing}
</body></html>`;

  return {
    html,
    meta: { title, slideCount: live.length + 2, fileName: `${slug(ctx.brand)}-${slug(title)}-${year}.html` },
  };
}

/**
 * The few shapes the idea plan did not need.
 *
 * Appended to its stylesheet rather than replacing any of it: definition lists,
 * tables and the written-out figure are how a dossier section reads on paper,
 * and none of them appear in an idea validation. Everything else — the palette,
 * the type, the slide furniture — is inherited unchanged.
 */
const EXTRA = `
.kv { display: grid; grid-template-columns: minmax(140px, 220px) 1fr; gap: 10px 24px; margin: 0 0 28px; }
.kv dt { font-weight: 700; color: var(--orange); }
.kv dd { margin: 0; }
.tbl { width: 100%; border-collapse: collapse; margin: 0 0 28px; font-size: 17px; }
.tbl th, .tbl td { text-align: left; padding: 10px 14px 10px 0; border-bottom: 1px solid rgba(17,17,17,.14); vertical-align: top; }
.tbl th { font-size: 13px; letter-spacing: .08em; text-transform: uppercase; color: var(--orange); }
.slide--dark .tbl th, .slide--dark .tbl td { border-bottom-color: rgba(255,255,255,.18); }
.fig { margin: 0 0 26px; padding: 18px 22px; border: 1px solid rgba(17,17,17,.16); border-radius: 10px; }
.slide--dark .fig { border-color: rgba(255,255,255,.22); }
.fig__k { display: block; font-size: 12px; letter-spacing: .1em; text-transform: uppercase; color: var(--orange); margin-bottom: 8px; }
.fig__n { font-size: 34px; font-weight: 700; line-height: 1.1; margin: 0 0 8px; }
.fig__u { font-size: 16px; font-weight: 500; opacity: .7; }
.fig__b { margin: 0; font-size: 16px; opacity: .85; }
.fig__a { margin: 10px 0 0; padding-left: 18px; font-size: 15px; opacity: .8; }
.fig__a li { margin: 0 0 4px; }
.sub { font-size: 22px; font-weight: 700; margin: 26px 0 12px; }
.list { margin: 0; padding-left: 18px; }
.list li { margin: 0 0 10px; }
.list a { color: var(--orange); }
@media print { .kv, .tbl, .fig { break-inside: avoid; } }
`;
